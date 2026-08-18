const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Missing Supabase configuration. Run with Node --env-file=.env; never hard-code credentials.');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function deepAudit() {
    // Fetch the OpenAPI spec to get the real schema
    const url = `${SUPABASE_URL}/rest/v1/?apikey=${SUPABASE_ANON_KEY}`;
    const resp = await fetch(url);
    const openapi = await resp.json();
    
    const definitions = openapi.definitions || {};
    console.log('=== POSTGREST EXPOSED TABLES/VIEWS ===\n');
    
    const tableNames = Object.keys(definitions);
    console.log(`Total exposed entities: ${tableNames.length}`);
    console.log(`Entities: ${tableNames.join(', ')}\n`);
    
    for (const tableName of tableNames) {
        const def = definitions[tableName];
        const props = def.properties || {};
        const required = def.required || [];
        
        console.log(`\n─── ${tableName} ───`);
        console.log(`Columns (${Object.keys(props).length}):`);
        
        for (const [colName, colDef] of Object.entries(props)) {
            const type = colDef.type || colDef.format || 'unknown';
            const format = colDef.format ? ` (${colDef.format})` : '';
            const isRequired = required.includes(colName) ? ' NOT NULL' : ' nullable';
            const defaultVal = colDef.default !== undefined ? ` DEFAULT ${colDef.default}` : '';
            const desc = colDef.description ? ` -- ${colDef.description}` : '';
            const maxLen = colDef.maxLength ? ` maxLen=${colDef.maxLength}` : '';
            const enumVals = colDef.enum ? ` ENUM(${colDef.enum.join(', ')})` : '';
            
            console.log(`  ${colName}: ${type}${format}${isRequired}${defaultVal}${maxLen}${enumVals}${desc}`);
        }

        // Try to get row count
        const { count } = await supabase.from(tableName).select('*', { count: 'exact', head: true });
        console.log(`  Row count: ${count ?? 'unknown (RLS?)'}`);
    }
    
    // Check paths for RPC functions
    const paths = openapi.paths || {};
    const rpcPaths = Object.keys(paths).filter(p => p.startsWith('/rpc/'));
    console.log('\n\n=== EXPOSED RPC FUNCTIONS ===');
    for (const rpc of rpcPaths) {
        console.log(`  ${rpc}`);
        const methods = paths[rpc];
        if (methods.post && methods.post.parameters) {
            const bodyParam = methods.post.parameters.find(p => p.in === 'body');
            if (bodyParam && bodyParam.schema && bodyParam.schema.properties) {
                for (const [pName, pDef] of Object.entries(bodyParam.schema.properties)) {
                    console.log(`    param: ${pName} (${pDef.type || pDef.format || '?'})`);
                }
            }
        }
    }
    
    console.log('\n=== DEEP AUDIT COMPLETE ===');
}

deepAudit().catch(e => console.error('Fatal:', e));

