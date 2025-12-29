
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Manual .env parsing
const envPath = path.resolve(process.cwd(), '.env');
const envContent = fs.readFileSync(envPath, 'utf-8');
const envConfig = {};

envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
        envConfig[key.trim()] = value.trim();
    }
});

const supabaseUrl = envConfig['VITE_SUPABASE_URL'] || 'https://mmtpiyvebanekcjekgnd.supabase.co';
const supabaseKey = envConfig['VITE_SUPABASE_ANON_KEY'] || 'sb_publishable_FQQom_E1UPRjHIw46EtIQA_vdH61NIr';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    console.log("Checking DB...");
    const { data: users, error } = await supabase.from('app_users').select('id, username, email, role');

    if (error) {
        console.error("Error:", error.message);
        return;
    }

    console.log("--- Users in DB ---");
    console.log(JSON.stringify(users, null, 2));

    const targetEmail = "felipe.phocoimpressao@gmail.com";
    const match = users.find(u => u.email === targetEmail);

    if (match) {
        console.log(`\n✅ MATCH FOUND for ${targetEmail}! Login should work.`);
    } else {
        console.log(`\n❌ NO MATCH for ${targetEmail}.`);
        console.log("Action: You must update one of the users above to have this email.");
    }
}

check();
