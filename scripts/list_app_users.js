
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Manually parse .env to avoid dotenv dependency issues
const envPath = path.resolve(process.cwd(), '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const envConfig = {};

envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
        envConfig[key.trim()] = value.trim();
    }
});

const supabaseUrl = envConfig['VITE_SUPABASE_URL'];
const supabaseKey = envConfig['VITE_SUPABASE_ANON_KEY'];

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing environment variables in .env');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function listUsers() {
    console.log('Fetching app_users...');
    const { data, error } = await supabase.from('app_users').select('*');

    if (error) {
        console.error('Error fetching users:', error.message);
    } else {
        console.log('\n--- Current App Users In Database ---');
        if (data.length === 0) {
            console.log("⚠️  No users found! You need to create an admin user in Supabase Table Editor.");
        } else {
            console.table(data);
            console.log("\n👇 ACTION REQUIRED:");
            console.log("Copy the 'email' you use to login to Supabase (or any email you want to use for login)");
            console.log("and update the 'email' column for the user above.");
        }
        console.log('-------------------------------------\n');
    }
}

listUsers();
