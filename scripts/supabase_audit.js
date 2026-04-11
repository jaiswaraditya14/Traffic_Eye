const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://dstincwwyddrimcfgzfs.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRzdGluY3d3eWRkcmltY2ZnemZzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzAxMDg0MDUsImV4cCI6MjA4NTY4NDQwNX0.ulc_7KAzccIFsRyS5RxEY9MA1xR6ISRA4QI16ZIW8ps';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function safeQuery(tableName, selectStr, options = {}) {
    try {
        let query = supabase.from(tableName).select(selectStr, options);
        if (options.limit) query = query.limit(options.limit);
        const { data, error, count } = await query;
        if (error) return { data: null, error: error.message, count };
        return { data, error: null, count };
    } catch (e) {
        return { data: null, error: e.message, count: null };
    }
}

async function run() {
    const results = {};

    // === 1. PROJECT INFO ===
    console.log('=== 1. PROJECT INFO ===');
    console.log('Project ref: dstincwwyddrimcfgzfs');
    console.log('URL: https://dstincwwyddrimcfgzfs.supabase.co');

    // Test connection
    const { data: testData, error: testErr } = await safeQuery('profiles', 'id', { count: 'exact', head: true });
    console.log('Connection:', testErr ? `FAILED (${testErr})` : 'OK');

    // === 2. SCHEMA ANALYSIS ===
    console.log('\n=== 2. SCHEMA — Discovering tables ===');

    // We'll query each known table for structure
    const knownTables = ['profiles', 'reports', 'offences', 'rewards', 'notifications', 'report_verifications', 'video_reports', 'officer_actions'];
    
    for (const table of knownTables) {
        const { data, error, count } = await safeQuery(table, '*', { count: 'exact', head: true });
        if (!error) {
            console.log(`  ✅ ${table}: exists (${count ?? '?'} rows)`);
        } else {
            console.log(`  ❌ ${table}: ${error}`);
        }
    }

    // Get sample data to understand column structure
    console.log('\n--- Column details per table ---');
    for (const table of knownTables) {
        const { data, error } = await safeQuery(table, '*', { limit: 1 });
        if (data && data.length > 0) {
            const cols = Object.keys(data[0]);
            console.log(`\n[${table}] columns (${cols.length}):`);
            for (const col of cols) {
                const val = data[0][col];
                const type = val === null ? 'null' : typeof val;
                console.log(`  - ${col}: ${type} (sample: ${JSON.stringify(val)?.substring(0, 80)})`);
            }
        } else if (data && data.length === 0) {
            console.log(`\n[${table}] — empty table, fetching structure via select...`);
            // Try to discover columns from an empty table by just selecting
            const { data: d2, error: e2 } = await safeQuery(table, '*', { limit: 0 });
            console.log(`  columns unknown (table is empty, no sample rows)`);
        } else {
            console.log(`\n[${table}] — error: ${error}`);
        }
    }

    // === 3. Auth check ===
    console.log('\n=== 3. AUTH SERVICE ===');
    const { data: authData, error: authErr } = await supabase.auth.getSession();
    console.log('Auth service:', authErr ? `Error: ${authErr.message}` : 'Reachable');

    // === 4. Storage check ===
    console.log('\n=== 4. STORAGE ===');
    const { data: buckets, error: bucketErr } = await supabase.storage.listBuckets();
    if (bucketErr) {
        console.log('Storage:', bucketErr.message);
    } else {
        console.log(`Storage: ${buckets.length} bucket(s)`);
        for (const b of buckets) {
            console.log(`  - ${b.name} (public: ${b.public}, created: ${b.created_at})`);
        }
    }

    // === 5. Try to get RLS info from accessible endpoints ===
    console.log('\n=== 5. RLS TESTING (anon access) ===');
    for (const table of knownTables) {
        // Test SELECT without auth  
        const { data, error, count } = await safeQuery(table, '*', { count: 'exact', head: true });
        if (error) {
            console.log(`  ${table}: SELECT blocked or error (${error})`);
        } else {
            console.log(`  ${table}: SELECT allowed (anon), count=${count}`);
        }
    }

    // === 6. Check table policies via insert/update attempts (read-only, will fail harmlessly) ===
    console.log('\n=== 6. WRITE POLICY TEST (anon, expects rejection) ===');
    for (const table of knownTables) {
        const { error: insertErr } = await supabase.from(table).insert({ __test: true });
        if (insertErr) {
            console.log(`  ${table}: INSERT blocked ✅ (${insertErr.message.substring(0, 80)})`);
        } else {
            console.log(`  ${table}: INSERT ALLOWED ❌ (anon can write!)`);
        }
    }

    console.log('\n=== AUDIT COMPLETE ===');
}

run().catch(e => console.error('Fatal:', e));
