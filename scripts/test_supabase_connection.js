// Quick Supabase connection test
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Missing Supabase configuration. Run with Node --env-file=.env; never hard-code credentials.');
}

async function testConnection() {
    console.log('=== Supabase Connection Test ===\n');
    console.log('Supabase configuration: present');
    console.log('');

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Test 1: Basic API reachability
    console.log('1. Testing API reachability...');
    try {
        const { data, error } = await supabase.from('profiles').select('id').limit(1);
        if (error) {
            console.log(`   ❌ Query error: ${error.message} (code: ${error.code})`);
            if (error.code === '42P01') {
                console.log('   ℹ️  Table "profiles" does not exist, but the API IS reachable.');
                console.log('   ✅ Supabase connection is WORKING!');
            }
        } else {
            console.log(`   ✅ Query successful! Returned ${data.length} row(s)`);
            console.log('   ✅ Supabase connection is WORKING!');
        }
    } catch (err) {
        console.log(`   ❌ Network error: ${err.message}`);
        console.log('   ❌ Supabase connection FAILED!');
    }

    // Test 2: Auth service
    console.log('\n2. Testing Auth service...');
    try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
            console.log(`   ❌ Auth error: ${error.message}`);
        } else {
            console.log(`   ✅ Auth service is reachable (session: ${data.session ? 'active' : 'none'})`);
        }
    } catch (err) {
        console.log(`   ❌ Auth network error: ${err.message}`);
    }

    // Test 3: List some tables by querying a known table
    console.log('\n3. Testing database tables...');
    const tables = ['profiles', 'reports', 'offences', 'rewards'];
    for (const table of tables) {
        try {
            const { data, error, count } = await supabase.from(table).select('*', { count: 'exact', head: true });
            if (error) {
                console.log(`   ❌ ${table}: ${error.message}`);
            } else {
                console.log(`   ✅ ${table}: accessible (${count} rows)`);
            }
        } catch (err) {
            console.log(`   ❌ ${table}: ${err.message}`);
        }
    }

    // Test 4: Storage buckets
    console.log('\n4. Testing Storage service...');
    try {
        const { data, error } = await supabase.storage.listBuckets();
        if (error) {
            console.log(`   ❌ Storage error: ${error.message}`);
        } else {
            console.log(`   ✅ Storage is reachable (${data.length} bucket(s))`);
            data.forEach(b => console.log(`      - ${b.name} (public: ${b.public})`));
        }
    } catch (err) {
        console.log(`   ❌ Storage network error: ${err.message}`);
    }

    console.log('\n=== Test Complete ===');
}

testConnection();

