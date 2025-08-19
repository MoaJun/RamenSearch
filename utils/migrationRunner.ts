/**
 * Migration Runner
 * Simple runner to test and execute data migration
 */

import { supabaseSimpleMigration } from '../services/supabaseSimpleMigration';

export async function runMigrationTest() {
  console.log('=== RamenSearch Data Migration Test ===');
  
  try {
    // Test Supabase connection
    console.log('1. Testing Supabase connection...');
    const connectionOk = await supabaseSimpleMigration.testConnection();
    
    if (!connectionOk) {
      console.error('❌ Supabase connection failed');
      return;
    }
    console.log('✅ Supabase connection successful');

    // Check if migration is needed
    console.log('2. Checking if migration is needed...');
    const migrationNeeded = await supabaseSimpleMigration.isMigrationNeeded();
    
    if (!migrationNeeded) {
      console.log('ℹ️ Migration not needed (no local data or already migrated)');
      return;
    }
    console.log('✅ Migration needed');

    // Execute migration
    console.log('3. Executing migration...');
    const result = await supabaseSimpleMigration.migrateToSupabase();
    
    if (result.success) {
      console.log('✅ Migration completed successfully!');
      console.log(`   - Favorites migrated: ${result.favoritesMigrated}`);
      console.log(`   - Visits migrated: ${result.visitsMigrated}`);
    } else {
      console.error('❌ Migration failed:');
      result.errors.forEach(error => console.error(`   - ${error}`));
    }

    return result;

  } catch (error) {
    console.error('❌ Migration test failed:', error);
    throw error;
  }
}

// Export for console testing
(window as any).runMigrationTest = runMigrationTest;