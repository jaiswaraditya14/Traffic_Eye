/**
 * Create officer EYE-071 for Chembur (pincode 400071)
 * 
 * Uses Supabase Auth signUp with officer metadata.
 * The on_auth_user_created trigger will auto-create the profile row.
 */
require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.EXPO_PUBLIC_SUPABASE_URL,
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
);

async function createOfficer() {
    console.log('Creating new officer EYE-071 (Chembur)...');
    
    // Step 1: Sign up via Supabase Auth
    // The handle_new_user() trigger will auto-create the profile row
    const { data, error } = await supabase.auth.signUp({
        email: 'officer.chembur.eye071@gmail.com',
        password: 'VESIT_71',
        options: {
            data: {
                full_name: 'Officer Chembur',
                role: 'officer',
                badge_id: 'EYE-071',
                department: 'Traffic Police',
                jurisdiction: 'Chembur',
            },
        },
    });

    if (error) {
        console.error('Auth signup failed:', error.message);
        
        // If user already exists, try to find and update them
        if (error.message.includes('already') || error.message.includes('duplicate')) {
            console.log('User may already exist. Attempting to find and update profile...');
            const { data: existing } = await supabase
                .from('profiles')
                .select('id, badge_id, jurisdiction')
                .eq('badge_id', 'EYE-071')
                .single();
            
            if (existing) {
                console.log('Found existing officer:', existing);
                console.log('Profile already set up correctly!');
            } else {
                console.log('No profile with EYE-071 found. Manual intervention may be needed.');
            }
        }
        return;
    }

    console.log('Auth user created:', data.user?.id);
    
    // Step 2: Wait for the trigger to create the profile
    console.log('Waiting for profile trigger...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Step 3: Verify the profile was created with correct data
    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('badge_id', 'EYE-071')
        .single();

    if (profileError || !profile) {
        console.log('Profile not auto-created by trigger. Creating manually...');
        
        const { error: insertError } = await supabase
            .from('profiles')
            .upsert({
                id: data.user.id,
                email: 'officer.chembur.eye071@gmail.com',
                full_name: 'Officer Chembur',
                role: 'officer',
                badge_id: 'EYE-071',
                department: 'Traffic Police',
                jurisdiction: 'Chembur',
            });

        if (insertError) {
            console.error('Manual profile creation failed:', insertError);
            return;
        }
        console.log('Profile created manually!');
    } else {
        console.log('Profile auto-created by trigger:', profile);
        
        // Ensure jurisdiction is set (trigger might not fill it)
        if (!profile.jurisdiction) {
            await supabase
                .from('profiles')
                .update({ jurisdiction: 'Chembur' })
                .eq('id', profile.id);
            console.log('Jurisdiction updated to Chembur');
        }
    }

    console.log('');
    console.log('═══════════════════════════════════════');
    console.log('  OFFICER CREATED SUCCESSFULLY!');
    console.log('  Badge ID:     EYE-071');
    console.log('  Password:     VESIT_71');
    console.log('  Area:         Chembur (400071)');
    console.log('  Jurisdiction: Chembur');
    console.log('═══════════════════════════════════════');
}

createOfficer();
