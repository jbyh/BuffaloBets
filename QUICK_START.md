# Quick Start Guide

## 🎯 Your Database

**URL**: https://owgmlkiadmrlzdocswye.supabase.co
**Dashboard**: https://supabase.com/dashboard/project/owgmlkiadmrlzdocswye

**Current State**: ✅ Clean & Ready (No test accounts)

## 🚀 Delete Accounts (If Needed)

### Option 1: Via Supabase Dashboard (Easiest)
1. Go to https://supabase.com/dashboard/project/owgmlkiadmrlzdocswye
2. Click "Authentication" in sidebar
3. Click "Users"
4. Find the user you want to delete
5. Click the three dots (⋮) next to the user
6. Click "Delete User"
7. Confirm deletion

This will automatically delete:
- The user's auth account
- Their profile
- All their submissions
- All their scores
- All buffalo balances they're involved in
- All buffalo calls they made or received
- All feed events they created

### Option 2: Via SQL (Advanced)
1. Go to https://supabase.com/dashboard/project/owgmlkiadmrlzdocswye
2. Click "SQL Editor" in sidebar
3. Click "New Query"
4. Run this query:

```sql
-- Delete specific user by email
DELETE FROM auth.users WHERE email = 'test@example.com';

-- Or delete all test users
DELETE FROM auth.users
WHERE email LIKE '%test%'
   OR email LIKE '%live%';

-- Or delete ALL users (careful!)
DELETE FROM auth.users;
```

### Option 3: Via Command Line
```bash
# List all test users
npx tsx scripts/delete-user.ts test-users

# Get instructions for specific user
npx tsx scripts/delete-user.ts user@example.com
```

## 📊 Check What's in Database

```bash
# Check all tables at once
npx tsx scripts/check-db.ts all

# Check specific table
npx tsx scripts/check-db.ts profiles
npx tsx scripts/check-db.ts buffalo_calls
npx tsx scripts/check-db.ts feed_events
```

## 🔍 Test Connection

```bash
# Verify everything is working
npx tsx scripts/test-connection.ts
```

Should see:
```
✅ Database Connection
✅ Profiles Table
✅ Submissions Table
✅ Results Table
✅ Scores Table
✅ Buffalo Balances Table
✅ Buffalo Calls Table
✅ Buffalo Requests Table
✅ Feed Events Table
✅ Notifications Table
✅ Realtime Connection

🎉 All tests passed!
```

## 🎮 Why Feed is Empty

**This is normal!** The feed will populate when:
1. Users sign up
2. Users submit predictions
3. Admin enters results
4. Buffalo balances are created
5. People call buffalo

Right now, database is empty, so feed is empty. Not broken!

## 📱 Quick Test Flow

Want to see everything work? Follow these steps:

1. **Sign up 4 users** at `/auth`
   - Use real emails you can access
   - Or use temporary email services

2. **Make yourself admin**
   - Go to Supabase Dashboard → Table Editor → profiles
   - Find your profile
   - Set `is_admin` to `true`

3. **Submit predictions** (each user)
   - Go to `/submit`
   - Enter top 5 artists and songs
   - Click Submit

4. **Enter results** (admin only)
   - Go to `/admin`
   - Enter actual results for each user
   - System auto-calculates scores
   - Creates buffalo balances

5. **Call buffalo**
   - Check `/buffalo-board` to see balances
   - Call buffalo on someone you have buffalos on
   - They upload proof
   - Watch `/feed` update in real-time!

## 📚 Full Documentation

- **DATABASE_INFO.md** - Complete database guide
- **SYSTEM_REVIEW.md** - Full system review and status
- **README.md** - Original project documentation

## 🆘 Quick Fixes

### Feed shows error?
- Should be fixed now with null safety checks
- Refresh the page
- Check browser console for errors

### Can't call buffalo?
- Need buffalo balance first
- Only created after admin enters results
- Check `/buffalo-board` to see balances

### Not showing as admin?
- Go to Supabase Dashboard
- Table Editor → profiles
- Set `is_admin` to `true` for your profile

### Real-time not updating?
- Check browser console for WebSocket errors
- Make sure you're logged in
- Try refreshing the page

## ✅ Current Status

- ✅ All UI fixes applied
- ✅ Feed won't crash anymore
- ✅ Database fully operational
- ✅ No test accounts exist
- ✅ Build successful
- ✅ Ready for production

**Everything is working correctly!**
