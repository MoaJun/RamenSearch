/**
 * Simple Supabase Schema Test
 * Basic connectivity and schema verification
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://pkbamgvybpisgznwpkie.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBrYmFtZ3Z5YnBpc2d6bndwa2llIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzQxNTMzNzYsImV4cCI6MjA0OTcyOTM3Nn0.7QoP0xXJ6r-N9Uy9wXw7P6Xy9QhKLKQqY6L0VfYJ5v4';

console.log('🔍 Simple Supabase Connection Test');
console.log('='.repeat(40));

const supabase = createClient(supabaseUrl, supabaseKey);

async function basicTest() {
    console.log('\n1. Testing basic connection...');
    
    try {
        // Test 1: Simple query to public schema
        const { data, error } = await supabase
            .from('favorites')
            .select('*')
            .limit(0);
        
        console.log('Favorites query result:');
        console.log('  Data:', data);
        console.log('  Error:', error);
        
    } catch (err) {
        console.log('  Exception:', err.message);
    }
    
    try {
        // Test 2: Try visit_history
        const { data, error } = await supabase
            .from('visit_history')
            .select('*')
            .limit(0);
        
        console.log('\nVisit History query result:');
        console.log('  Data:', data);
        console.log('  Error:', error);
        
    } catch (err) {
        console.log('  Exception:', err.message);
    }
    
    try {
        // Test 3: Try a simple insert to see what happens
        console.log('\n2. Testing insert capabilities...');
        
        const testRecord = {
            user_id: 'test-user',
            place_id: 'test-place',
            name: 'Test Shop',
            address: 'Test Address',
            rating: 4.0,
            saved_at: new Date().toISOString(),
            visit_count: 0
        };
        
        const { data, error } = await supabase
            .from('favorites')
            .insert(testRecord)
            .select();
        
        console.log('Insert test result:');
        console.log('  Data:', data);
        console.log('  Error:', error);
        
        // If insert succeeded, clean up
        if (data && data.length > 0) {
            const { error: deleteError } = await supabase
                .from('favorites')
                .delete()
                .eq('id', data[0].id);
            console.log('  Cleanup error:', deleteError);
        }
        
    } catch (err) {
        console.log('  Exception:', err.message);
    }
}

async function checkAuth() {
    console.log('\n3. Checking authentication status...');
    
    try {
        const { data: { user }, error } = await supabase.auth.getUser();
        console.log('Auth user:', user);
        console.log('Auth error:', error);
        
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        console.log('Session:', session);
        console.log('Session error:', sessionError);
        
    } catch (err) {
        console.log('Auth exception:', err.message);
    }
}

async function testWithServiceRole() {
    console.log('\n4. Note about service role...');
    console.log('The anon key may have limited permissions due to RLS policies.');
    console.log('For full schema inspection, a service_role key might be needed.');
    console.log('However, we can still test what the anon key can access.');
}

// Run tests
basicTest()
    .then(() => checkAuth())
    .then(() => testWithServiceRole())
    .then(() => {
        console.log('\n✅ Test completed');
    })
    .catch(error => {
        console.error('❌ Test failed:', error);
    });