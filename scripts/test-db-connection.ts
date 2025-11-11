import { config } from 'dotenv';
import { query, closePool } from '../lib/db';

// Load environment variables
config({ path: '.env.local' });

async function testConnection() {
  console.log('Testing database connection...');

  try {
    // Test basic query
    const result = await query('SELECT NOW() as current_time');
    console.log('✅ Connection successful!');
    console.log('Current database time:', result.rows[0].current_time);

    // Test table existence
    const tables = await query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);

    console.log(`\n✅ Found ${tables.rows.length} tables:`);
    tables.rows.forEach(row => console.log(`  - ${row.table_name}`));

  } catch (error) {
    console.error('❌ Connection failed:', error);
    process.exit(1);
  } finally {
    await closePool();
  }
}

testConnection();
