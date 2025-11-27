import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

console.log('🔍 Testing Supabase Connection...\n');
console.log(`Database URL: ${supabaseUrl}`);
console.log(`Anon Key: ${supabaseAnonKey.substring(0, 20)}...\n`);

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testConnection() {
  const tests = {
    'Database Connection': false,
    'Profiles Table': false,
    'Submissions Table': false,
    'Results Table': false,
    'Scores Table': false,
    'Buffalo Balances Table': false,
    'Buffalo Calls Table': false,
    'Buffalo Requests Table': false,
    'Feed Events Table': false,
    'Notifications Table': false,
    'Realtime Connection': false,
  };

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('count', { count: 'exact', head: true });

    if (!error) {
      tests['Database Connection'] = true;
      tests['Profiles Table'] = true;
    }
  } catch (err) {
    console.error('Connection error:', err);
  }

  const tables = [
    'submissions',
    'results',
    'scores',
    'buffalo_balances',
    'buffalo_calls',
    'buffalo_requests',
    'feed_events',
    'notifications',
  ];

  for (const table of tables) {
    try {
      const { error } = await supabase
        .from(table)
        .select('count', { count: 'exact', head: true });

      if (!error) {
        const key = `${table.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')} Table` as keyof typeof tests;
        tests[key] = true;
      }
    } catch (err) {
      // Silent fail
    }
  }

  try {
    const channel = supabase
      .channel('test-channel')
      .on('broadcast', { event: 'test' }, () => {})
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          tests['Realtime Connection'] = true;
          supabase.removeChannel(channel);
          printResults(tests);
        }
      });

    setTimeout(() => {
      supabase.removeChannel(channel);
      printResults(tests);
    }, 3000);
  } catch (err) {
    printResults(tests);
  }
}

function printResults(tests: Record<string, boolean>) {
  console.log('\n📊 Connection Test Results:\n');

  let allPassed = true;
  for (const [name, passed] of Object.entries(tests)) {
    const icon = passed ? '✅' : '❌';
    console.log(`${icon} ${name}`);
    if (!passed) allPassed = false;
  }

  if (allPassed) {
    console.log('\n🎉 All tests passed! Database is fully connected.\n');
  } else {
    console.log('\n⚠️  Some tests failed. Check your Supabase configuration.\n');
  }

  console.log('📝 Next Steps:');
  console.log('  1. Check database content: npx tsx scripts/check-db.ts all');
  console.log('  2. Access Supabase dashboard: https://supabase.com/dashboard');
  console.log('  3. View your project: https://supabase.com/dashboard/project/owgmlkiadmrlzdocswye');
  console.log('  4. Test the app: Sign up a user and make some predictions!\n');

  process.exit(allPassed ? 0 : 1);
}

testConnection();
