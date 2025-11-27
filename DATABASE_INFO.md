# Database Information

## Supabase Database

**Database URL**: https://owgmlkiadmrlzdocswye.supabase.co
**Dashboard**: https://supabase.com/dashboard/project/owgmlkiadmrlzdocswye

## Current Status

✅ Database is currently EMPTY - no test accounts exist
✅ All migrations have been applied
✅ Tables are properly configured with RLS policies

## Database Tables

### Core Tables
1. **profiles** - User profiles (linked to auth.users)
2. **submissions** - User predictions for each year
3. **results** - Actual Spotify results entered by admin
4. **scores** - Calculated scores after results are in
5. **buffalo_balances** - Buffalo counts between users
6. **buffalo_calls** - Active buffalo calls with timers
7. **buffalo_requests** - Requests to get buffalos on someone
8. **feed_events** - Activity feed events
9. **notifications** - User notifications

### How to Access Database

**Option 1: Supabase Dashboard (Recommended)**
1. Go to https://supabase.com/dashboard
2. Find your project: `owgmlkiadmrlzdocswye`
3. Navigate to "Table Editor" to view/edit data
4. Navigate to "SQL Editor" to run queries

**Option 2: Using npx scripts**
```bash
# View all profiles
npx tsx scripts/check-db.ts profiles

# View all buffalo calls
npx tsx scripts/check-db.ts buffalo_calls

# View feed events
npx tsx scripts/check-db.ts feed_events

# Delete a specific user by email
npx tsx scripts/delete-user.ts user@example.com
```

## Common Database Operations

### View All Users
```sql
SELECT id, email, display_name, is_admin, created_at
FROM profiles
ORDER BY created_at DESC;
```

### Delete a User (and all their data)
```sql
-- Delete from auth.users will cascade to profiles and related data
DELETE FROM auth.users WHERE email = 'test@example.com';
```

### View Recent Buffalo Calls
```sql
SELECT
  bc.*,
  caller.display_name as caller_name,
  recipient.display_name as recipient_name
FROM buffalo_calls bc
LEFT JOIN profiles caller ON bc.caller_id = caller.id
LEFT JOIN profiles recipient ON bc.recipient_id = recipient.id
ORDER BY bc.called_at DESC
LIMIT 20;
```

### View Feed Events
```sql
SELECT
  fe.*,
  u.display_name as user_name
FROM feed_events fe
LEFT JOIN profiles u ON fe.user_id = u.id
ORDER BY fe.created_at DESC
LIMIT 20;
```

## Feed Not Updating Issue

The feed page queries data from two sources:
1. **buffalo_calls** table - Shows buffalo call activity
2. **feed_events** table - Shows general activity

### Why Feed Might Appear Empty:
- ✅ No users exist yet (database is empty)
- Once users sign up and submit predictions, feed will populate
- Buffalo calls will appear after users have buffalo balances
- Feed events are created automatically when actions occur

### Real-time Updates:
The feed uses Supabase real-time subscriptions to auto-update when:
- New buffalo calls are made
- New feed events are created
- Users submit predictions
- Results are entered

## Testing the Feed

To test the feed with real data:

1. **Sign up some test users** via the /auth page
2. **Submit predictions** via the /submit page
3. **Enter results as admin** via the /admin page
4. **Create buffalo balances** - they'll be calculated automatically after results
5. **Call buffalo** on someone from the Buffalo Board or home page
6. **Watch the feed populate** with activity

The feed should now show all activity in real-time!

## Cleanup Commands

### Delete All Test Data
```sql
-- Delete all feed events
DELETE FROM feed_events;

-- Delete all buffalo calls
DELETE FROM buffalo_calls;

-- Delete all buffalo balances
DELETE FROM buffalo_balances;

-- Delete all scores
DELETE FROM scores;

-- Delete all results
DELETE FROM results;

-- Delete all submissions
DELETE FROM submissions;

-- Delete all profiles (will cascade from auth.users)
DELETE FROM auth.users WHERE email LIKE '%test%' OR email LIKE '%live%';
```

### Reset Everything (DANGEROUS!)
```sql
-- Only do this if you want to completely start over
TRUNCATE auth.users CASCADE;
TRUNCATE profiles CASCADE;
TRUNCATE submissions CASCADE;
TRUNCATE results CASCADE;
TRUNCATE scores CASCADE;
TRUNCATE buffalo_balances CASCADE;
TRUNCATE buffalo_calls CASCADE;
TRUNCATE buffalo_requests CASCADE;
TRUNCATE feed_events CASCADE;
TRUNCATE notifications CASCADE;
```

## Environment Variables

Current environment variables in `.env`:
```
NEXT_PUBLIC_SUPABASE_URL=https://owgmlkiadmrlzdocswye.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[Your anon key]
```

These are automatically used by the app - no changes needed!
