import { supabase } from '../lib/supabase';
import { Product, Customer, Quote, FixedAsset, FixedCost, ScheduleEvent, AppView, User } from '../../types';

export const api = {
    products: {
        list: async () => {
            const { data, error } = await supabase.from('products').select(`
                id,
                name,
                category,
                unitType:unit_type,
                costPrice:cost_price,
                productionTimeMinutes:production_time_minutes,
                wastePercent:waste_percent,
                salePrice:sale_price,
                stock,
                availableRollWidths:available_roll_widths
            `);
            if (error) throw error;
            return data as Product[];
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
            return data as User[];
        },
        create: async (user: User) => {
            const { error } = await supabase.from('app_users').insert(user);
            if (error) throw error;
        },
        update: async (user: User) => {
            const { error } = await supabase.from('app_users').update(user).eq('id', user.id);
            if (error) throw error;
        },
        getByEmail: async (email: string) => {
            const { data, error } = await supabase.from('app_users').select('*').eq('email', email).single();
            if (error) return null;
            return data as User;
        },
        delete: async (id: string) => {
            const { error } = await supabase.from('app_users').delete().eq('id', id);
            if (error) throw error;
        }
    }
};
