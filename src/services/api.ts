import { supabase } from '../lib/supabase';
import { Product, Customer, Quote, FixedAsset, FixedCost, ScheduleEvent, AppView, User, TimeRecord, InventoryTransaction, Supplier } from '../types';

export interface ProductCategory {
    id: string;
    name: string;
}


export const api = {
    products: {

        list: async () => {
            const { data, error } = await supabase.from('products').select('*');
            if (error) throw error;
            console.log("API RAW PRODUCTS EXCERPT:", data ? data.slice(0, 3) : "No data");

            const parsePrice = (val: string | number) => {
                if (typeof val === 'number') return val;
                if (typeof val === 'string') {
                    // Try parsing "90.09"
                    const dotParsed = parseFloat(val);
                    if (!isNaN(dotParsed) && val.includes('.')) return dotParsed;

                    // Try parsing "90,09" -> replace comma with dot
                    const commaParsed = parseFloat(val.replace(',', '.'));
                    return isNaN(commaParsed) ? 0 : commaParsed;
                }
                return 0;
            };

            return data.map((p: any) => ({
                id: p.id,
                name: p.name || 'Unnamed Product',
                category: p.category,
                unitType: p.unit_type,
                costPrice: parsePrice(p.cost_price),
                productionTimeMinutes: Number(p.production_time_minutes),
                wastePercent: Number(p.waste_percent),
                salePrice: parsePrice(p.sale_price),
                stock: Number(p.stock),
                availableRollWidths: p.available_roll_widths,
                isComposite: p.is_composite,
                composition: p.composition
            })) as Product[];
        },
        create: async (product: Omit<Product, 'id'>) => {
            // 1. Create Product
            const { data, error } = await supabase
                .from('products')
                .insert({
                    name: product.name,
                    category: product.category,
                    unit_type: product.unitType,
                    sale_price: product.salePrice,
                    cost_price: product.costPrice,
                    production_time_minutes: product.productionTimeMinutes,
                    waste_percent: product.wastePercent,
                    stock: product.stock,
                    available_roll_widths: product.availableRollWidths,
                    is_composite: product.isComposite,
                    supplier_id: product.supplierId,
                    min_stock_level: product.minStock
                })
                .select()
                .single();

            if (error) throw error;
            const newProduct = data;

            // 2. If composite, add components
            if (product.isComposite && product.composition && product.composition.length > 0) {
                const componentsToInsert = product.composition.map(c => ({
                    parent_product_id: newProduct.id,
                    component_id: c.productId,
                    quantity: c.quantity
                }));
                const { error: compError } = await supabase.from('product_components').insert(componentsToInsert);
                if (compError) console.error("Error adding components", compError);
            }

            return newProduct;
        },

        update: async (id: string, product: Partial<Product>) => {
            // Update basic fields
            const { error } = await supabase
                .from('products')
                .update({
                    name: product.name,
                    category: product.category,
                    unit_type: product.unitType,
                    sale_price: product.salePrice,
                    cost_price: product.costPrice,
                    production_time_minutes: product.productionTimeMinutes,
                    waste_percent: product.wastePercent,
                    stock: product.stock,
                    available_roll_widths: product.availableRollWidths,
                    is_composite: product.isComposite, // Update flag
                    supplier_id: product.supplierId,
                    min_stock_level: product.minStock
                })
                .eq('id', id);

            if (error) throw error;

            // Update composition if provided (Full replacement approach for simplicity)
            if (product.composition !== undefined) { // Check undefined to allow partial updates of other fields without clearing composition
                // Delete old
                await supabase.from('product_components').delete().eq('parent_product_id', id);

                // Insert new
                if (product.composition.length > 0) {
                    const componentsToInsert = product.composition.map(c => ({
                        parent_product_id: id,
                        component_id: c.productId,
                        quantity: c.quantity
                    }));
                    await supabase.from('product_components').insert(componentsToInsert);
                }
            }
        },
        updateStock: async (id: string, quantityToRemove: number, type: 'manual_adjustment' | 'sale' | 'purchase' | 'production_deduction' = 'manual_adjustment', referenceId?: string, notes?: string) => {
            // First get current stock
            const { data: product, error: fetchError } = await supabase.from('products').select('stock').eq('id', id).single();
            if (fetchError) throw fetchError;

            const newStock = (product?.stock || 0) - quantityToRemove;

            const { error } = await supabase.from('products').update({ stock: newStock }).eq('id', id);
            if (error) throw error;

            // Log Transaction (Inverted logic: quantityToRemove is negative change if we are removing)
            // But usually updateStock(10) means Remove 10. So change is -10.
            // If we use this method for adding, we pass negative quantityToRemove?
            // Let's standardise: quantityToRemove is what we subtract.
            const change = -quantityToRemove;

            try {
                await supabase.from('inventory_transactions').insert({
                    product_id: id,
                    quantity_change: change,
                    type: type,
                    reference_id: referenceId,
                    notes: notes || `Stock update: ${change}`
                });
            } catch (err) {
                console.error("Failed to log inventory transaction", err);
                // Don't fail the whole operation if logging fails, but warn.
            }
        },
        delete: async (id: string) => {
            const { error } = await supabase.from('products').delete().eq('id', id);
            if (error) throw error;
        }
    },

    customers: {
        list: async () => {
            const { data, error } = await supabase.from('customers').select('*');
            if (error) throw error;
            return data as Customer[];
        },
        create: async (customer: Customer) => {
            const { error } = await supabase.from('customers').insert(customer);
            if (error) throw error;
        },
        update: async (customer: Customer) => {
            const { error } = await supabase.from('customers').update(customer).eq('id', customer.id);
            if (error) throw error;
        },
        delete: async (id: string) => {
            const { error } = await supabase.from('customers').delete().eq('id', id);
            if (error) throw error;
        }
    },
    quotes: {
        list: async () => {
            const { data, error } = await supabase.from('quotes').select(`
                id,
                date,
                customerId:customer_id,
                items,
                totalAmount:total_amount,
                downPayment:down_payment,
                designFee:design_fee,
                installFee:install_fee,
                status,
                deadlineDays:deadline_days,

                notes,
                discount,
                paymentMethod:payment_method,
                downPaymentMethod:down_payment_method,
                userId:user_id,
                commissionPaid:commission_paid,
                commissionDate:commission_date,
                commissionPercent:commission_percent,
                previewUrl:preview_url
            `);
            if (error) throw error;
            return data as Quote[];
        },
        create: async (quote: Quote) => {
            // Fetch current commission config to snapshot
            const { data: config } = await supabase.from('financial_config').select('commission_percent').single();
            const currentCommission = config?.commission_percent || 0;

            const dbQuote = {
                id: quote.id,
                date: quote.date,
                customer_id: quote.customerId,
                items: quote.items,
                total_amount: quote.totalAmount,
                down_payment: quote.downPayment,
                design_fee: quote.designFee,
                install_fee: quote.installFee,
                status: quote.status,
                deadline_days: quote.deadlineDays,

                notes: quote.notes,
                discount: quote.discount,
                payment_method: quote.paymentMethod,
                down_payment_method: quote.downPaymentMethod,
                user_id: quote.userId,
                commission_paid: quote.commissionPaid,
                commission_date: quote.commissionDate,
                commission_percent: currentCommission, // Snapshot
                preview_url: quote.previewUrl
            };
            const { error } = await supabase.from('quotes').insert(dbQuote);
            if (error) throw error;
        },
        update: async (quote: Quote) => {
            // Trigger Stock Deduction if moving to production
            if (quote.status === 'production' && !quote.stockDeducted) {
                await api.inventory.deductFromQuote(quote);
                quote.stockDeducted = true;
            }

            const dbQuote = {
                id: quote.id,
                date: quote.date,
                customer_id: quote.customerId,
                items: quote.items,
                total_amount: quote.totalAmount,
                down_payment: quote.downPayment,
                design_fee: quote.designFee,
                install_fee: quote.installFee,
                status: quote.status,
                deadline_days: quote.deadlineDays,

                notes: quote.notes,
                discount: quote.discount,
                payment_method: quote.paymentMethod,
                down_payment_method: quote.downPaymentMethod,
                user_id: quote.userId,
                commission_paid: quote.commissionPaid,
                commission_date: quote.commissionDate,
                stock_deducted: quote.stockDeducted,
                preview_url: quote.previewUrl
            };
            const { error } = await supabase.from('quotes').update(dbQuote).eq('id', quote.id);
            if (error) throw error;
        },
        async updateStatus(id: string, status: string) {
            const { error } = await supabase.from('quotes').update({ status }).eq('id', id);
            if (error) throw error;
        },
        registerFollowup: async (id: string) => {
            const now = new Date().toISOString();
            const { error } = await supabase.from('quotes')
                .update({ last_followup_at: now })
                .eq('id', id);
            if (error) throw error;
        },
        delete: async (id: string) => {
            const { error } = await supabase.from('quotes').delete().eq('id', id);
            if (error) throw error;
        }
    },
    financial: {
        getConfig: async () => {
            const { data, error } = await supabase.from('financial_config').select(`
                id,
                productiveHoursPerMonth:productive_hours_per_month,
                taxPercent:tax_percent,
                commissionPercent:commission_percent,
                targetProfitMargin:target_profit_margin
            `).single();
            if (error) return null;
            return data;
        },
        updateConfig: async (config: any) => {
            const dbConfig = {
                id: 'default',
                productive_hours_per_month: config.productiveHoursPerMonth,
                tax_percent: config.taxPercent,
                commission_percent: config.commissionPercent,
                target_profit_margin: config.targetProfitMargin
            };
            const { error } = await supabase.from('financial_config').upsert(dbConfig);
            if (error) throw error;
        },
        listAssets: async () => {
            const { data, error } = await supabase.from('fixed_assets').select(`
                id,
                name,
                value,
                usefulLifeYears:useful_life_years,
                monthlyDepreciation:monthly_depreciation
            `);
            if (error) throw error;
            return data as FixedAsset[];
        },
        saveAsset: async (asset: FixedAsset) => {
            const dbAsset = {
                id: asset.id,
                name: asset.name,
                value: asset.value,
                useful_life_years: asset.usefulLifeYears,
                monthly_depreciation: asset.monthlyDepreciation
            };
            const { error } = await supabase.from('fixed_assets').upsert(dbAsset);
            if (error) throw error;
        },
        deleteAsset: async (id: string) => {
            const { error } = await supabase.from('fixed_assets').delete().eq('id', id);
            if (error) throw error;
        },
        listCosts: async () => {
            const { data, error } = await supabase.from('fixed_costs').select('*');
            if (error) throw error;
            return data as FixedCost[];
        },
        saveCost: async (cost: FixedCost) => {
            const { error } = await supabase.from('fixed_costs').upsert(cost);
            if (error) throw error;
        },
        deleteCost: async (id: string) => {
            const { error } = await supabase.from('fixed_costs').delete().eq('id', id);
            if (error) throw error;
        }
    },
    scheduling: {
        list: async () => {
            const { data, error } = await supabase.from('schedule_events').select('*');
            if (error) throw error;
            return (data || []).map(item => ({
                id: item.id,
                type: item.type,
                title: item.title,
                date: item.date,
                durationMinutes: item.duration_minutes,
                description: item.description,
                responsible: item.responsible,
                customerId: item.customer_id,
                status: item.status
            } as ScheduleEvent));
        },
        create: async (event: ScheduleEvent) => {
            const { error } = await supabase.from('schedule_events').insert({
                id: event.id,
                type: event.type,
                title: event.title,
                date: event.date,
                duration_minutes: event.durationMinutes,
                description: event.description,
                responsible: event.responsible,
                customer_id: event.customerId,
                status: event.status
            });
            if (error) throw error;
        },
        update: async (event: ScheduleEvent) => {
            const { error } = await supabase.from('schedule_events').update({
                type: event.type,
                title: event.title,
                date: event.date,
                duration_minutes: event.durationMinutes,
                description: event.description,
                responsible: event.responsible,
                customer_id: event.customerId,
                status: event.status
            }).eq('id', event.id);
            if (error) throw error;
        },
        delete: async (id: string) => {
            const { error } = await supabase.from('schedule_events').delete().eq('id', id);
            if (error) throw error;
        }
    },
    users: {
        list: async () => {
            const { data, error } = await supabase.from('app_users').select('*');
            if (error) throw error;
            return data.map((u: any) => ({
                ...u,
                workloadHours: u.workload_hours,
                workloadConfig: u.workload_config
            })) as User[];
        },
        create: async (user: User) => {
            const dbUser = {
                id: user.id,
                name: user.name,
                username: user.username,
                password: user.password,
                email: user.email,
                role: user.role,
                workload_hours: user.workloadHours,
                workload_config: user.workloadConfig,
                active: user.active,
                avatar: user.avatar
            };
            const { error } = await supabase.from('app_users').insert(dbUser);
            if (error) throw error;
        },
        update: async (userId: string, updates: Partial<User>) => {
            const dbUpdates: any = {};
            if (updates.name !== undefined) dbUpdates.name = updates.name;
            if (updates.email !== undefined) dbUpdates.email = updates.email;
            if (updates.username !== undefined) dbUpdates.username = updates.username;
            if (updates.password !== undefined) dbUpdates.password = updates.password;
            if (updates.role !== undefined) dbUpdates.role = updates.role;
            if (updates.workloadHours !== undefined) dbUpdates.workload_hours = updates.workloadHours;
            if (updates.workloadConfig !== undefined) dbUpdates.workload_config = updates.workloadConfig;
            if (updates.active !== undefined) dbUpdates.active = updates.active;
            if (updates.avatar !== undefined) dbUpdates.avatar = updates.avatar;

            const { error } = await supabase.from('app_users').update(dbUpdates).eq('id', userId);
            if (error) throw error;
        },
        getByEmail: async (email: string) => {
            const { data, error } = await supabase.from('app_users').select('*').eq('email', email).single();
            if (error) return null;
            return {
                ...data,
                workloadHours: data.workload_hours,
                workloadConfig: data.workload_config
            } as User;
        },
        delete: async (id: string) => {
            const { error } = await supabase.from('app_users').delete().eq('id', id);
            if (error) throw error;
        }
    },
    timeRecords: {
        getToday: async (userId: string) => {
            const today = new Date().toISOString().split('T')[0];
            const { data, error } = await supabase.from('time_records')
                .select('*')
                .eq('user_id', userId)
                .eq('date', today)
                .single();
            if (error && error.code !== 'PGRST116') throw error; // PGRST116 is "not found"
            return data ? {
                id: data.id,
                userId: data.user_id,
                date: data.date,
                clockIn: data.clock_in,
                lunchStart: data.lunch_start,
                lunchEnd: data.lunch_end,
                breakStart: data.break_start,
                breakEnd: data.break_end,
                clockOut: data.clock_out,
                totalMinutes: data.total_minutes,
                balanceMinutes: data.balance_minutes
            } as TimeRecord : null;
        },
        createToday: async (userId: string) => {
            const today = new Date().toISOString().split('T')[0];
            const { data, error } = await supabase.from('time_records').insert({
                user_id: userId,
                date: today
            }).select().single();
            if (error) throw error;
            return {
                id: data.id,
                userId: data.user_id,
                date: data.date
            } as TimeRecord;
        },
        update: async (record: TimeRecord) => {
            const dbRecord = {
                clock_in: record.clockIn,
                lunch_start: record.lunchStart,
                lunch_end: record.lunchEnd,
                break_start: record.breakStart,
                break_end: record.breakEnd,
                clock_out: record.clockOut,
                total_minutes: record.totalMinutes,
                balance_minutes: record.balanceMinutes
            };
            const { error } = await supabase.from('time_records').update(dbRecord).eq('id', record.id);
            if (error) throw error;
        },
        getHistory: async (userId: string) => {
            const { data, error } = await supabase.from('time_records')
                .select('*')
                .eq('user_id', userId)
                .order('date', { ascending: false })
                .limit(30);
            if (error) throw error;
            return data.map(d => ({
                id: d.id,
                userId: d.user_id,
                date: d.date,
                clockIn: d.clock_in,
                lunchStart: d.lunch_start,
                lunchEnd: d.lunch_end,
                breakStart: d.break_start,
                breakEnd: d.break_end,
                clockOut: d.clock_out,
                totalMinutes: d.total_minutes,
                balanceMinutes: d.balance_minutes
            })) as TimeRecord[];
        },
        // Admin: Get records for all users (filtered by date range)
        getAll: async (startDate: string, endDate: string) => {
            const { data, error } = await supabase.from('time_records')
                .select(`
                    *,
                    app_users (name, email, role, workload_hours, workload_config)
                 `)
                .gte('date', startDate)
                .lte('date', endDate)
                .order('date', { ascending: false });

            if (error) throw error;

            return data.map((d: any) => ({
                id: d.id,
                userId: d.user_id,
                // Flatten user info for easier display
                userName: d.app_users?.name || 'Unknown',
                userRole: d.app_users?.role,
                userWorkload: d.app_users?.workload_hours,
                userConfig: d.app_users?.workload_config,

                date: d.date,
                clockIn: d.clock_in,
                lunchStart: d.lunch_start,
                lunchEnd: d.lunch_end,
                breakStart: d.break_start,
                breakEnd: d.break_end,
                clockOut: d.clock_out,
                totalMinutes: d.total_minutes,
                balanceMinutes: d.balance_minutes
            }));
        },
        // Admin: Update any record
        updateAdmin: async (record: any) => {
            const { error } = await supabase.from('time_records').update({
                clock_in: record.clockIn,
                lunch_start: record.lunchStart,
                lunch_end: record.lunchEnd,
                break_start: record.breakStart,
                break_end: record.breakEnd,
                clock_out: record.clockOut,
                total_minutes: record.totalMinutes,
                balance_minutes: record.balanceMinutes
            }).eq('id', record.id);
            if (error) throw error;
        }
    },
    permissions: {
        getAll: async () => {
            const { data, error } = await supabase.from('permission_settings').select('*');
            if (error) throw error;
            return data;
        },
        update: async (role: string, permissions: any) => {
            const { error } = await supabase.from('permission_settings').upsert({
                role,
                permissions,
                updated_at: new Date().toISOString()
            });
            if (error) throw error;
        }
    },
    inventory: {
        registerTransaction: async (transaction: Omit<InventoryTransaction, 'id' | 'createdAt'> & { productId: string }) => {
            // 1. Update Product Stock (DB)
            const { data: product, error: fetchError } = await supabase.from('products').select('stock').eq('id', transaction.productId).single();
            if (fetchError) throw fetchError;

            // Determine stock change
            let qty = transaction.quantityChange;
            // Ensure sign is correct based on type if not already
            if (['out', 'production_deduction', 'sale'].includes(transaction.type) && qty > 0) {
                qty = -qty;
            }
            if (['in', 'purchase', 'return'].includes(transaction.type) && qty < 0) {
                qty = -qty; // Should be positive
            }

            // If manual adjustment, the quantityChange passed is usually the DELTA. 
            // If the UI passes the TARGET stock, we need to calculate delta, but let's assume UI passes delta.

            const newStock = (product?.stock || 0) + qty;
            const { error } = await supabase.from('products').update({ stock: newStock }).eq('id', transaction.productId);
            if (error) throw error;

            // 2. Insert Transaction (DB)
            const { error: logError } = await supabase.from('inventory_transactions').insert({
                product_id: transaction.productId,
                quantity_change: qty,
                type: transaction.type,
                reference_id: transaction.referenceId,
                notes: transaction.notes,
                user_id: (await supabase.auth.getUser()).data.user?.id
            });
            if (logError) throw logError;
        },
        getHistory: async (productId: string) => {
            const { data, error } = await supabase
                .from('inventory_transactions')
                .select(`
                    *,
                    app_users (name)
                `)
                .eq('product_id', productId)
                .order('created_at', { ascending: false });

            if (error) throw error;

            return data.map((t: any) => ({
                id: t.id,
                productId: t.product_id,
                quantityChange: t.quantity_change,
                type: t.type,
                referenceId: t.reference_id,
                notes: t.notes,
                createdAt: t.created_at,
                userName: t.app_users?.name || 'Sistema'
            })) as InventoryTransaction[];
        },
        deductFromQuote: async (quote: Quote) => {
            if (quote.stockDeducted) return;

            console.log("Deducting stock for quote:", quote.id);

            for (const item of quote.items) {
                if (!item.productId) continue;

                // Fetch product to know unit type AND composition
                const { data: product } = await supabase.from('products').select('unit_type, name, is_composite, composition').eq('id', item.productId).single();
                if (!product) continue;

                // RECURSIVE DEDUCTION LOGIC
                if (product.is_composite && product.composition && product.composition.length > 0) {
                    // Deduct each component
                    for (const comp of product.composition) {
                        const totalComponentQty = item.quantity * comp.quantity;

                        // Calculate new stock and Log
                        // We duplicate logic here for atomic DB operations
                        const { data: compProd } = await supabase.from('products').select('stock').eq('id', comp.productId).single();
                        if (compProd) {
                            const newStock = (compProd.stock || 0) - totalComponentQty;
                            await supabase.from('products').update({ stock: newStock }).eq('id', comp.productId);

                            await supabase.from('inventory_transactions').insert({
                                product_id: comp.productId,
                                quantity_change: -totalComponentQty,
                                type: 'production_deduction',
                                reference_id: quote.id,
                                notes: `Produção Kit #${quote.id.slice(0, 8)} - ${product.name} (Comp)`
                            });
                        }
                    }
                } else {
                    // STANDARD DEDUCTION
                    let quantityToDeduct = item.quantity;

                    // Heuristic: If user sells m2, calculate area
                    if (['m2', 'm²', 'metro quadrado'].includes(product.unit_type?.toLowerCase())) {
                        const widthM = (item.width || 0) / 100;
                        const heightM = (item.height || 0) / 100;
                        const area = widthM * heightM * item.quantity;
                        if (area > 0) quantityToDeduct = area;
                    }

                    const { data: prod } = await supabase.from('products').select('stock').eq('id', item.productId).single();
                    if (prod) {
                        const newStock = (prod.stock || 0) - quantityToDeduct;
                        await supabase.from('products').update({ stock: newStock }).eq('id', item.productId);

                        await supabase.from('inventory_transactions').insert({
                            product_id: item.productId,
                            quantity_change: -quantityToDeduct,
                            type: 'production_deduction',
                            reference_id: quote.id,
                            notes: `Produção Pedido #${quote.id.slice(0, 8)} - ${product.name}`
                        });
                    }
                }
            }

            // Mark as deducted
            await supabase.from('quotes').update({ stock_deducted: true }).eq('id', quote.id);
        }
    },
    storage: {
        uploadProof: async (path: string, file: File) => {
            return await supabase.storage.from('production-proofs').upload(path, file);
        },
        getPublicUrl: (path: string) => {
            const { data } = supabase.storage.from('production-proofs').getPublicUrl(path);
            return data.publicUrl;
        }
    },
    commissions: {
        getBalance: async (userId: string) => {
            // Calculate commission for all 'delivered' or 'finished' quotes that haven't been paid
            const { data: quotes, error } = await supabase.from('quotes')
                .select('status, total_amount, commission_paid, user_id, design_fee, install_fee, discount, commission_percent')
                .eq('user_id', userId)
                .in('status', ['delivered'])
                .eq('commission_paid', false);

            if (error) throw error;

            // Fetch global config as fallback
            const { data: config } = await supabase.from('financial_config').select('commission_percent').single();
            const globalPercent = config?.commission_percent || 0;

            let totalCommission = 0;
            quotes?.forEach((q: any) => {
                // Use Snapshot if available, else Global
                const percent = q.commission_percent !== undefined && q.commission_percent !== null
                    ? Number(q.commission_percent)
                    : globalPercent;

                const val = q.total_amount || 0;
                totalCommission += val * (percent / 100);
            });

            return { totalCommission, pendingCount: quotes?.length || 0 };
        },
        listBalances: async () => {
            // Admin view: List all users with their pending commission
            // This is a bit complex in SQL, doing logic in JS for simplicity on small scale
            const { data: quotes, error } = await supabase.from('quotes')
                .select(`
                    user_id, total_amount, status, commission_paid,
                    app_users!inner(name, id)
                `)
                .in('status', ['delivered'])
                .eq('commission_paid', false);

            if (error) throw error;

            const { data: config } = await supabase.from('financial_config').select('commission_percent').single();
            const percent = config?.commission_percent || 0;

            const balances: Record<string, { name: string, amount: number, count: number, userId: string }> = {};

            quotes?.forEach((q: any) => {
                const uid = q.user_id;
                if (!uid) return;

                if (!balances[uid]) {
                    balances[uid] = { name: q.app_users.name, amount: 0, count: 0, userId: uid };
                }

                balances[uid].amount += (q.total_amount || 0) * (percent / 100);
                balances[uid].count++;
            });

            return Object.values(balances);
        },
        pay: async (userId: string) => {
            const today = new Date().toISOString();
            const { error } = await supabase.from('quotes')
                .update({ commission_paid: true, commission_date: today })
                .eq('user_id', userId)
                .in('status', ['delivered'])
                .eq('commission_paid', false);

            if (error) throw error;
        }
    },
    categories: {
        list: async () => {
            const { data, error } = await supabase.from('product_categories').select('*').order('name');
            if (error) {
                console.warn("Error fetching categories (table might not exist yet):", error);
                return [] as ProductCategory[];
            }
            return data as ProductCategory[];
        },
        create: async (name: string) => {
            const { error } = await supabase.from('product_categories').insert({ name });
            if (error) throw error;
        },
        delete: async (id: string) => {
            const { error } = await supabase.from('product_categories').delete().eq('id', id);
            if (error) throw error;
        }
    },
    suppliers: {
        list: async () => {
            const { data, error } = await supabase.from('suppliers').select('*').order('name');
            if (error) throw error;
            return data.map((s: any) => ({
                id: s.id,
                name: s.name,
                contactName: s.contact_name,
                phone: s.phone,
                email: s.email,
                category: s.category,
                active: s.active
            })) as Supplier[];
        },
        create: async (supplier: Partial<Supplier>) => {
            const { data, error } = await supabase.from('suppliers').insert({
                name: supplier.name,
                contact_name: supplier.contactName,
                phone: supplier.phone,
                email: supplier.email,
                category: supplier.category,
                active: supplier.active ?? true
            }).select().single();
            if (error) throw error;
            return data;
        },
        update: async (id: string, updates: Partial<Supplier>) => {
            const { error } = await supabase.from('suppliers').update({
                name: updates.name,
                contact_name: updates.contactName,
                phone: updates.phone,
                email: updates.email,
                category: updates.category,
                active: updates.active
            }).eq('id', id);
            if (error) throw error;
        },
        delete: async (id: string) => {
            const { error } = await supabase.from('suppliers').delete().eq('id', id);
            if (error) throw error;
        }
    }
};

