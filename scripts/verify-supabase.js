
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Manual .env parsing
const envPath = path.resolve(process.cwd(), '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const envConfig = envContent.split('\n').reduce((acc, line) => {
    const [key, value] = line.split('=');
    if (key && value) {
        acc[key.trim()] = value.trim();
    }
    return acc;
}, {});

const supabaseUrl = envConfig['VITE_SUPABASE_URL'];
const supabaseKey = envConfig['VITE_SUPABASE_ANON_KEY'];

console.log('Testing connection to:', supabaseUrl);
console.log('Using Key (first 10 chars):', supabaseKey ? supabaseKey.substring(0, 10) + '...' : 'MISSING');

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing URL or Key');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
    try {
        // Try to fetch something innocuous. If the key is invalid, this will fail.
        // We assume a 'products' table might exist or we just check auth.
        // Checking 'health' or just a dummy request.
        // Since we don't know tables, we can try accessing auth.getUser() or similar, 
        // but easier to try to select from a non-existent table and see if we get a Auth error (401) vs a 404.
        // Or just let Supabase JS client initialize.

        // Actually, valid Supabase Anon key is a JWT. 
        // We can check if it parses as JWT.
        const parts = supabaseKey.split('.');
        if (parts.length !== 3) {
            console.error('ERROR: Key does not look like a valid JWT (Supabase Anon Key).');
            // We'll still try the request to be sure.
        }

        const { data, error } = await supabase.from('test_connection_table').select('*').limit(1);

        if (error) {
            console.log('Connection attempted. Response:', error.message);
            if (error.code === 'PGRST301' || error.message.includes('JWT')) {
                console.error('CRITICAL: JWT/Auth Error. Key is likely invalid.');
                process.exit(1);
            }
            // 404 or "relation does not exist" means connection SUCCEEDED (authenticated) but table missing.
            if (error.code === '42P01') {
                console.log('SUCCESS: Connected to Supabase (Database accessible, table missing implies auth worked).');
                process.exit(0);
            }
        }
        console.log('SUCCESS: Connected and fetched data.');
    } catch (err) {
        console.error('Unexpected error:', err);
        process.exit(1);
    }
}

testConnection();
