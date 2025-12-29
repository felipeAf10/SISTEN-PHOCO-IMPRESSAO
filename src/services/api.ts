import { supabase } from '../lib/supabase';
import { Product, Customer, Quote, FixedAsset, FixedCost, ScheduleEvent, AppView, User } from '../../types';

export const api = {
    products: {
        list: async () => {
            const { data, error } = await supabase.from('products').select('*');
            if (error) throw error;
            return data as Product[];
        },
        create: async (product: Product) => {
            const { error } = await supabase.from('products').insert(product);
            if (error) throw error;
        },
        update: async (product: Product) => {
            const { error } = await supabase.from('products').update(product).eq('id', product.id);
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
            const { data, error } = await supabase.from('quotes').select('*');
            if (error) throw error;
            return data as Quote[];
        },
        create: async (quote: Quote) => {
            const { error } = await supabase.from('quotes').insert(quote);
            if (error) throw error;
        },
        update: async (quote: Quote) => {
            const { error } = await supabase.from('quotes').update(quote).eq('id', quote.id);
            if (error) throw error;
        },
        delete: async (id: string) => {
            const { error } = await supabase.from('quotes').delete().eq('id', id);
            if (error) throw error;
        }
    },
    financial: {
        getConfig: async () => {
            const { data, error } = await supabase.from('financial_config').select('*').single();
            if (error) return null;
            return data;
        },
        updateConfig: async (config: any) => {
            const { error } = await supabase.from('financial_config').upsert({ id: 'default', ...config });
            if (error) throw error;
        },
        listAssets: async () => {
            const { data, error } = await supabase.from('fixed_assets').select('*');
            if (error) throw error;
            return data as FixedAsset[];
        },
        saveAsset: async (asset: FixedAsset) => {
            const { error } = await supabase.from('fixed_assets').upsert(asset);
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
            return data as ScheduleEvent[];
        },
        create: async (event: ScheduleEvent) => {
            const { error } = await supabase.from('schedule_events').insert(event);
            if (error) throw error;
        },
        update: async (event: ScheduleEvent) => {
            const { error } = await supabase.from('schedule_events').update(event).eq('id', event.id);
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
