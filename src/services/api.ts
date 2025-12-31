import { supabase } from '../lib/supabase';
import { Product, Customer, Quote, FixedAsset, FixedCost, ScheduleEvent, AppView, User, TimeRecord } from '../../types';

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
                availableRollWidths: p.available_roll_widths
            })) as Product[];
        },
        create: async (product: Product) => {
            const dbProduct = {
                id: product.id,
                name: product.name,
                category: product.category,
                unit_type: product.unitType,
                cost_price: product.costPrice,
                production_time_minutes: product.productionTimeMinutes,
                waste_percent: product.wastePercent,
                sale_price: product.salePrice,
                stock: product.stock,
                available_roll_widths: product.availableRollWidths
            };
            const { error } = await supabase.from('products').insert(dbProduct);
            if (error) throw error;
        },
        update: async (product: Product) => {
            const dbProduct = {
                id: product.id,
                name: product.name,
                category: product.category,
                unit_type: product.unitType,
                cost_price: product.costPrice,
                production_time_minutes: product.productionTimeMinutes,
                waste_percent: product.wastePercent,
                sale_price: product.salePrice,
                stock: product.stock,
                available_roll_widths: product.availableRollWidths
            };
            const { error } = await supabase.from('products').update(dbProduct).eq('id', product.id);
            if (error) throw error;
        },
        updateStock: async (id: string, quantityToRemove: number) => {
            // First get current stock
            const { data: product, error: fetchError } = await supabase.from('products').select('stock').eq('id', id).single();
            if (fetchError) throw fetchError;

            const newStock = (product?.stock || 0) - quantityToRemove;

            const { error } = await supabase.from('products').update({ stock: newStock }).eq('id', id);
            if (error) throw error;
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
                notes
            `);
            if (error) throw error;
            return data as Quote[];
        },
        create: async (quote: Quote) => {
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
                notes: quote.notes
            };
            const { error } = await supabase.from('quotes').insert(dbQuote);
            if (error) throw error;
        },
        update: async (quote: Quote) => {
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
                notes: quote.notes
            };
            const { error } = await supabase.from('quotes').update(dbQuote).eq('id', quote.id);
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
    storage: {
        uploadProof: async (path: string, file: File) => {
            return await supabase.storage.from('production-proofs').upload(path, file);
        },
        getPublicUrl: (path: string) => {
            const { data } = supabase.storage.from('production-proofs').getPublicUrl(path);
            return data.publicUrl;
        }
    }
};
