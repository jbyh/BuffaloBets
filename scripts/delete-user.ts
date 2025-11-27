import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function deleteUser(email: string) {
  console.log(`\nSearching for user with email: ${email}`);

  const { data: profile, error: findError } = await supabase
    .from('profiles')
    .select('id, email, display_name')
    .eq('email', email)
    .maybeSingle();

  if (findError) {
    console.error('Error finding user:', findError.message);
    return;
  }

  if (!profile) {
    console.log('User not found.');
    return;
  }

  console.log(`\nFound user:`);
  console.log(`  ID: ${profile.id}`);
  console.log(`  Email: ${profile.email}`);
  console.log(`  Name: ${profile.display_name}`);

  console.log('\nNote: Deletion requires admin access to auth.users table.');
  console.log('Please use the Supabase dashboard to delete this user:');
  console.log(`  1. Go to https://supabase.com/dashboard/project/owgmlkiadmrlzdocswye`);
  console.log(`  2. Navigate to Authentication > Users`);
  console.log(`  3. Find user: ${profile.email}`);
  console.log(`  4. Click the three dots and select "Delete User"`);
  console.log(`\nOr run this SQL query in the SQL Editor:`);
  console.log(`  DELETE FROM auth.users WHERE email = '${email}';`);
  console.log(`\nThis will cascade delete all related data (profile, submissions, scores, etc.)`);
}

async function deleteAllTestUsers() {
  console.log('\nSearching for test users...');

  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id, email, display_name')
    .or('email.like.%test%,email.like.%live%,display_name.like.%test%,display_name.like.%Live%');

  if (error) {
    console.error('Error finding users:', error.message);
    return;
  }

  if (!profiles || profiles.length === 0) {
    console.log('No test users found.');
    return;
  }

  console.log(`\nFound ${profiles.length} test users:`);
  profiles.forEach(p => {
    console.log(`  - ${p.display_name} (${p.email})`);
  });

  console.log('\nTo delete these users, use the Supabase dashboard or run:');
  console.log(`DELETE FROM auth.users WHERE email IN ('${profiles.map(p => p.email).join("', '")}');`);
}

async function main() {
  const args = process.argv.slice(2);
  const identifier = args[0];

  if (!identifier) {
    console.log('Usage: npx tsx scripts/delete-user.ts <email|"test-users">');
    console.log('\nExamples:');
    console.log('  npx tsx scripts/delete-user.ts user@example.com');
    console.log('  npx tsx scripts/delete-user.ts test-users');
    return;
  }

  if (identifier === 'test-users') {
    await deleteAllTestUsers();
  } else {
    await deleteUser(identifier);
  }
}

main();
