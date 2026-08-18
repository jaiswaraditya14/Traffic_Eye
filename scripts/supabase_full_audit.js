const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Missing Supabase configuration. Run with Node --env-file=.env; never hard-code credentials.');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function audit() {
    // All tables from SQL files
    const tables = [
        'profiles', 'point_transactions', 'point_rules',
        'image_reports', 'officer_reviews', 'notifications',
        'verification_reports', 'verification_images'
    ];
    
    console.log('=== FULL SCHEMA AUDIT (via SELECT) ===\n');
    
    for (const table of tables) {
        console.log(`\n══════════════ ${table.toUpperCase()} ══════════════`);
        
        // Get count
        const { count, error: cErr } = await supabase
            .from(table)
            .select('*', { count: 'exact', head: true });
        
        if (cErr) {
            console.log(`  ❌ Error: ${cErr.message}`);
            continue;
        }
        console.log(`  Rows: ${count}`);
        
        // Get a sample row
        const { data, error: dErr } = await supabase
            .from(table)
            .select('*')
            .limit(3);
        
        if (dErr) {
            console.log(`  ❌ Data Error: ${dErr.message}`);
            continue;
        }
        
        if (data && data.length > 0) {
            const cols = Object.keys(data[0]);
            console.log(`  Columns (${cols.length}):`);
            for (const col of cols) {
                // Analyze all sample values for this column
                const vals = data.map(r => r[col]);
                const types = [...new Set(vals.map(v => v === null ? 'null' : typeof v))];
                const nullCount = vals.filter(v => v === null).length;
                const sampleVal = vals.find(v => v !== null) ?? null;
                let sampleStr = JSON.stringify(sampleVal);
                if (sampleStr && sampleStr.length > 60) sampleStr = sampleStr.substring(0, 60) + '...';
                
                console.log(`    ${col}: ${types.join('|')} ${nullCount > 0 ? '(has nulls)' : ''} sample=${sampleStr}`);
            }
        } else {
            console.log('  (empty table — no column info from data)');
        }
        
        // Test update/delete behavior (read-only, expects failure)
        const { error: uErr } = await supabase
            .from(table)
            .update({ id: '00000000-0000-0000-0000-000000000000' })
            .eq('id', '00000000-0000-0000-0000-000000000000');
        
        const updateResult = uErr ? `BLOCKED: ${uErr.message.substring(0, 60)}` : 'ALLOWED ⚠️';
        console.log(`  Anon UPDATE: ${updateResult}`);
        
        const { error: delErr } = await supabase
            .from(table)
            .delete()
            .eq('id', '00000000-0000-0000-0000-000000000000');
        
        const deleteResult = delErr ? `BLOCKED: ${delErr.message.substring(0, 60)}` : 'ALLOWED ⚠️';
        console.log(`  Anon DELETE: ${deleteResult}`);
    }
    
    // Test RPC functions
    console.log('\n\n══════════════ RPC FUNCTIONS ══════════════');
    const rpcs = ['submit_officer_review', 'award_points', 'is_officer', 'handle_new_user', 'set_updated_at', 'update_updated_at'];
    for (const fn of rpcs) {
        try {
            const { data, error } = await supabase.rpc(fn);
            if (error) {
                console.log(`  ${fn}: ${error.message.substring(0, 80)}`);
            } else {
                console.log(`  ${fn}: returned ${JSON.stringify(data)}`);
            }
        } catch(e) {
            console.log(`  ${fn}: exception (${e.message.substring(0, 60)})`);
        }
    }
    
    // Storage deep check
    console.log('\n\n══════════════ STORAGE ══════════════');
    const { data: buckets } = await supabase.storage.listBuckets();
    console.log(`Buckets: ${buckets?.length || 0}`);
    if (buckets) {
        for (const b of buckets) {
            console.log(`  ${b.name}: public=${b.public}, file_size_limit=${b.file_size_limit}, allowed_mime_types=${JSON.stringify(b.allowed_mime_types)}`);
            
            // Try listing files
            const { data: files, error: fErr } = await supabase.storage.from(b.name).list('', { limit: 5 });
            if (fErr) {
                console.log(`    Files: ERROR - ${fErr.message}`);
            } else {
                console.log(`    Files: ${files?.length || 0} items at root`);
            }
        }
    }
    
    // Also try known bucket names from migration SQL
    for (const bName of ['verification-images', 'report-images', 'report_images']) {
        const { data: files, error: bErr } = await supabase.storage.from(bName).list('', { limit: 5 });
        if (!bErr && files) {
            console.log(`  Bucket '${bName}' exists with ${files.length} root items`);
        } else if (bErr) {
            console.log(`  Bucket '${bName}': ${bErr.message}`);
        }
    }
    
    console.log('\n=== AUDIT COMPLETE ===');
}

audit().catch(e => console.error('Fatal:', e));

