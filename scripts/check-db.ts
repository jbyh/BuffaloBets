import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkTable(tableName: string) {
  console.log(`\n=== ${tableName.toUpperCase()} ===\n`);

  const { data, error, count } = await supabase
    .from(tableName)
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    console.error(`Error fetching ${tableName}:`, error.message);
    return;
  }

  console.log(`Total records: ${count}`);

  if (data && data.length > 0) {
    console.log('\nRecords:');
    console.log(JSON.stringify(data, null, 2));
  } else {
    console.log('No records found.');
  }
}

async function main() {
  const args = process.argv.slice(2);
  const table = args[0];

  if (!table) {
    console.log('Usage: npx tsx scripts/check-db.ts <table_name>');
    console.log('\nAvailable tables:');
    console.log('  - profiles');
    console.log('  - submissions');
    console.log('  - results');
    console.log('  - scores');
    console.log('  - buffalo_balances');
    console.log('  - buffalo_calls');
    console.log('  - buffalo_requests');
    console.log('  - feed_events');
    console.log('  - notifications');
    console.log('\nOr use "all" to check all tables');
    return;
  }

  if (table === 'all') {
    await checkTable('profiles');
    await checkTable('submissions');
    await checkTable('results');
    await checkTable('scores');
    await checkTable('buffalo_balances');
    await checkTable('buffalo_calls');
    await checkTable('buffalo_requests');
    await checkTable('feed_events');
    await checkTable('notifications');
  } else {
    await checkTable(table);
  }
}

main();
