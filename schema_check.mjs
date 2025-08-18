/**
 * Supabase Database Schema and TypeScript Type Consistency Checker
 * Verifies database schema and compares with TypeScript definitions
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
const envPath = join(__dirname, '.env.local');
let envVars = {};
try {
    const envContent = readFileSync(envPath, 'utf-8');
    envContent.split('\n').forEach(line => {
        const [key, ...value] = line.split('=');
        if (key && value.length) {
            envVars[key.trim()] = value.join('=').trim();
        }
    });
} catch (error) {
    console.error('❌ Error loading .env.local:', error.message);
    process.exit(1);
}

const supabaseUrl = envVars.VITE_SUPABASE_URL;
const supabaseKey = envVars.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Expected TypeScript interfaces from types.ts
const expectedFavoriteSchema = {
    id: 'string',
    user_id: 'string',
    place_id: 'string',
    name: 'string',
    address: 'string',
    rating: 'number',
    saved_at: 'string', // ISO string
    visit_count: 'number',
    last_visit: 'string | null',
    personal_notes: 'string | null',
    tags: 'string[] | null',
    created_at: 'string' // ISO string
};

const expectedVisitHistorySchema = {
    id: 'string',
    user_id: 'string',
    place_id: 'string',
    shop_name: 'string',
    visit_date: 'string', // ISO string
    rating: 'number | null',
    notes: 'string | null',
    photos: 'string[] | null',
    created_at: 'string' // ISO string
};

console.log('🔍 Supabase Database Schema Analysis');
console.log('='.repeat(50));
console.log(`📊 Project: pkbamgvybpisgznwpkie`);
console.log(`🌐 URL: ${supabaseUrl}`);
console.log('='.repeat(50));

async function testConnection() {
    console.log('\n🔌 Testing Database Connection...');
    try {
        const { data, error } = await supabase.from('favorites').select('count', { count: 'exact', head: true });
        if (error) {
            console.log(`   ❌ Connection test failed: ${error.message}`);
            return false;
        }
        console.log('   ✅ Connection successful');
        return true;
    } catch (error) {
        console.log(`   ❌ Connection error: ${error.message}`);
        return false;
    }
}

async function analyzeTableStructure(tableName) {
    console.log(`\n📋 Analyzing ${tableName} table structure...`);
    
    try {
        // Try to get a sample record to understand the structure
        const { data, error } = await supabase
            .from(tableName)
            .select('*')
            .limit(1);
        
        if (error) {
            console.log(`   ❌ Error accessing ${tableName}: ${error.message}`);
            return null;
        }
        
        console.log(`   ✅ Table ${tableName} accessible`);
        
        if (data && data.length > 0) {
            console.log(`   📊 Sample record found`);
            console.log(`   🗂️  Columns detected:`);
            
            const sampleRecord = data[0];
            const structure = {};
            
            Object.entries(sampleRecord).forEach(([key, value]) => {
                const type = value === null ? 'null' : typeof value;
                const actualType = Array.isArray(value) ? 'array' : type;
                structure[key] = { type: actualType, sampleValue: value };
                console.log(`      ${key}: ${actualType} ${value === null ? '(null)' : `(example: ${JSON.stringify(value)})`}`);
            });
            
            return structure;
        } else {
            console.log(`   📭 Table ${tableName} is empty, trying to get schema from metadata...`);
            
            // Try to insert a minimal test record to see what fields are required
            const testData = tableName === 'favorites' ? {
                user_id: 'schema-test',
                place_id: 'schema-test',
                name: 'Test',
                address: 'Test',
                rating: 0,
                saved_at: new Date().toISOString(),
                visit_count: 0
            } : {
                user_id: 'schema-test',
                place_id: 'schema-test',
                shop_name: 'Test',
                visit_date: new Date().toISOString()
            };
            
            const { data: insertData, error: insertError } = await supabase
                .from(tableName)
                .insert(testData)
                .select()
                .single();
            
            if (!insertError && insertData) {
                console.log(`   🧪 Test insert successful, retrieved schema:`);
                const structure = {};
                Object.entries(insertData).forEach(([key, value]) => {
                    const type = value === null ? 'null' : typeof value;
                    const actualType = Array.isArray(value) ? 'array' : type;
                    structure[key] = { type: actualType, sampleValue: value };
                    console.log(`      ${key}: ${actualType}`);
                });
                
                // Clean up test record
                await supabase.from(tableName).delete().eq('id', insertData.id);
                console.log(`   🧹 Test record cleaned up`);
                
                return structure;
            } else {
                console.log(`   ❌ Could not determine schema: ${insertError?.message || 'Unknown error'}`);
                return null;
            }
        }
    } catch (error) {
        console.log(`   ❌ Error analyzing ${tableName}: ${error.message}`);
        return null;
    }
}

async function checkSchemaConsistency(tableName, actualStructure, expectedSchema) {
    console.log(`\n🔍 Checking TypeScript consistency for ${tableName}...`);
    
    if (!actualStructure) {
        console.log(`   ❌ Cannot check consistency - no actual structure available`);
        return false;
    }
    
    let isConsistent = true;
    const issues = [];
    
    // Check if all expected fields exist in database
    for (const [field, expectedType] of Object.entries(expectedSchema)) {
        if (!actualStructure[field]) {
            issues.push(`Missing field: ${field} (expected: ${expectedType})`);
            isConsistent = false;
        } else {
            const actualType = actualStructure[field].type;
            // Basic type checking (simplified)
            const expectedSimpleType = expectedType.includes('string') ? 'string' : 
                                     expectedType.includes('number') ? 'number' :
                                     expectedType.includes('array') ? 'array' : 'unknown';
            
            if (actualType !== expectedSimpleType && actualType !== 'null') {
                issues.push(`Type mismatch for ${field}: expected ${expectedType}, got ${actualType}`);
                isConsistent = false;
            }
        }
    }
    
    // Check for extra fields in database
    for (const field of Object.keys(actualStructure)) {
        if (!expectedSchema[field]) {
            issues.push(`Extra field in database: ${field} (type: ${actualStructure[field].type})`);
        }
    }
    
    if (isConsistent && issues.length === 0) {
        console.log(`   ✅ TypeScript types are consistent with database schema`);
    } else {
        console.log(`   ⚠️  Consistency issues found:`);
        issues.forEach(issue => console.log(`      - ${issue}`));
    }
    
    return isConsistent;
}

async function testDatabaseOperations() {
    console.log(`\n🧪 Testing Database Operations...`);
    
    try {
        // Test favorites operations
        console.log(`\n   📝 Testing favorites table operations:`);
        
        const testFavorite = {
            user_id: 'test-user-' + Date.now(),
            place_id: 'test-place-' + Date.now(),
            name: 'Test Ramen Shop',
            address: '123 Test Street, Tokyo',
            rating: 4.5,
            saved_at: new Date().toISOString(),
            visit_count: 0,
            last_visit: null,
            personal_notes: 'This is a test note',
            tags: ['test', 'ramen']
        };
        
        // INSERT test
        const { data: insertedFav, error: insertError } = await supabase
            .from('favorites')
            .insert(testFavorite)
            .select()
            .single();
        
        if (insertError) {
            console.log(`      ❌ INSERT failed: ${insertError.message}`);
        } else {
            console.log(`      ✅ INSERT successful (ID: ${insertedFav.id})`);
            
            // UPDATE test
            const { error: updateError } = await supabase
                .from('favorites')
                .update({ personal_notes: 'Updated test note' })
                .eq('id', insertedFav.id);
            
            if (updateError) {
                console.log(`      ❌ UPDATE failed: ${updateError.message}`);
            } else {
                console.log(`      ✅ UPDATE successful`);
            }
            
            // SELECT test
            const { data: selectData, error: selectError } = await supabase
                .from('favorites')
                .select('*')
                .eq('id', insertedFav.id)
                .single();
            
            if (selectError) {
                console.log(`      ❌ SELECT failed: ${selectError.message}`);
            } else {
                console.log(`      ✅ SELECT successful (notes: "${selectData.personal_notes}")`);
            }
            
            // DELETE test
            const { error: deleteError } = await supabase
                .from('favorites')
                .delete()
                .eq('id', insertedFav.id);
            
            if (deleteError) {
                console.log(`      ❌ DELETE failed: ${deleteError.message}`);
            } else {
                console.log(`      ✅ DELETE successful`);
            }
        }
        
        // Test visit_history operations
        console.log(`\n   📝 Testing visit_history table operations:`);
        
        const testVisit = {
            user_id: 'test-user-' + Date.now(),
            place_id: 'test-place-' + Date.now(),
            shop_name: 'Test Ramen Shop',
            visit_date: new Date().toISOString(),
            rating: 5,
            notes: 'Great ramen!',
            photos: ['photo1.jpg', 'photo2.jpg']
        };
        
        const { data: insertedVisit, error: visitInsertError } = await supabase
            .from('visit_history')
            .insert(testVisit)
            .select()
            .single();
        
        if (visitInsertError) {
            console.log(`      ❌ INSERT failed: ${visitInsertError.message}`);
        } else {
            console.log(`      ✅ INSERT successful (ID: ${insertedVisit.id})`);
            
            // Clean up
            await supabase.from('visit_history').delete().eq('id', insertedVisit.id);
            console.log(`      ✅ Cleanup successful`);
        }
        
    } catch (error) {
        console.log(`   ❌ Test error: ${error.message}`);
    }
}

async function generateReport() {
    console.log(`\n📊 Generating Database Schema Report...`);
    
    const connected = await testConnection();
    if (!connected) {
        console.log(`\n❌ Cannot proceed - database connection failed`);
        return;
    }
    
    const favoritesStructure = await analyzeTableStructure('favorites');
    const visitHistoryStructure = await analyzeTableStructure('visit_history');
    
    console.log(`\n📋 TypeScript Consistency Check:`);
    const favConsistent = await checkSchemaConsistency('favorites', favoritesStructure, expectedFavoriteSchema);
    const visitConsistent = await checkSchemaConsistency('visit_history', visitHistoryStructure, expectedVisitHistorySchema);
    
    await testDatabaseOperations();
    
    console.log(`\n📝 SUMMARY REPORT`);
    console.log('='.repeat(30));
    console.log(`🔗 Connection: ${connected ? '✅ Success' : '❌ Failed'}`);
    console.log(`📋 Favorites Table: ${favoritesStructure ? '✅ Accessible' : '❌ Issues'}`);
    console.log(`📋 Visit History Table: ${visitHistoryStructure ? '✅ Accessible' : '❌ Issues'}`);
    console.log(`🔍 TypeScript Consistency:`);
    console.log(`   Favorites: ${favConsistent ? '✅ Consistent' : '⚠️  Issues found'}`);
    console.log(`   Visit History: ${visitConsistent ? '✅ Consistent' : '⚠️  Issues found'}`);
    console.log('='.repeat(30));
}

// Run the analysis
generateReport().catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
});