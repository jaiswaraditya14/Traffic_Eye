require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.EXPO_PUBLIC_SUPABASE_URL, process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY);

async function run() {
    console.log('Running DB update...');
    const { data: profile_before } = await supabase.from('profiles').select('*').eq('badge_id', 'EYE-001').single();
    if (profile_before) {
        console.log('Found EYE-001, updating...');
        const { error } = await supabase.from('profiles').update({ badge_id: 'EYE-055', jurisdiction: 'Vakola' }).eq('badge_id', 'EYE-001');
        if (error) console.error('Error updating:', error);
        else console.log('Successfully updated to EYE-055 and jurisdiction Vakola!');
    } else {
        console.log('EYE-001 not found. Might already be updated.');
    }
}

run();
