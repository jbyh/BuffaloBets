# Setup Guide

## Quick Start

### 1. Environment Setup

Your `.env` file should already contain:
```
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 2. Database Setup

The database schema has been automatically applied with the migration. Your Supabase database now includes:

- ✅ `profiles` table
- ✅ `submissions` table
- ✅ `results` table
- ✅ `scores` table
- ✅ `buffalo_balances` table
- ✅ `buffalo_calls` table
- ✅ `invites` table
- ✅ Row Level Security (RLS) policies
- ✅ Storage bucket for buffalo shot photos

### 3. Create Your First Admin

1. Sign up for an account through the app
2. Go to your Supabase SQL Editor
3. Run this query (replace with your email):

```sql
UPDATE profiles SET is_admin = true WHERE email = 'your-email@example.com';
```

### 4. Start the App

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## First Competition Setup

### Timeline

**November (Before Wrapped)**
- Players sign up and create accounts
- Players submit their predictions for top 5 artists and songs
- Submissions can be edited until results are entered

**Early December (After Wrapped Releases)**
- Admin logs into Spotify to view everyone's Wrapped
- Admin enters each player's actual results via Admin Panel
- System automatically calculates scores and rankings
- Buffalo balances are awarded

**Ongoing**
- Winners can call buffalo on other players
- Recipients take shots and upload proof photos
- All activity appears in the feed

### Admin Panel Workflow

1. Go to Admin Panel (visible only to admin users)
2. Select a player from dropdown
3. Enter their actual top 5 artists from Spotify Wrapped
4. Enter their actual top 5 songs from Spotify Wrapped
5. Click "Submit Results"
6. System automatically:
   - Calculates their score
   - Compares predictions vs actual
   - Ranks all players
   - Awards buffalo balances

Repeat for each player in the competition.

## How to Invite Friends

Currently manual - share the app URL with friends and have them sign up.

Future enhancement: Generate invite links through the app.

## Testing the App

### Test Scenario

1. Create 4 test accounts
2. Submit predictions for each account
3. Make one account admin
4. Enter results for all 4 players
5. Check home page for rankings
6. Try calling buffalo from winner accounts
7. Upload photos as recipients

### Example Predictions

**Player 1:**
- Artists: Taylor Swift, Drake, The Weeknd, Bad Bunny, Ed Sheeran
- Songs: Anti-Hero, Rich Flex, Die For You, Tití Me Preguntó, Shivers

**Player 2:**
- Artists: Drake, Taylor Swift, Bad Bunny, The Weeknd, SZA
- Songs: Rich Flex, Anti-Hero, Die For You, Kill Bill, Flowers

**Example Actual Results (Player 1):**
- Artists: Taylor Swift, The Weeknd, Drake, Ed Sheeran, SZA
- Songs: Anti-Hero, Die For You, Flowers, Rich Flex, Kill Bill

This would give Player 1:
- Correct Artists: 4/5 (all except Bad Bunny)
- Correct Songs: 4/5 (all except Tití Me Preguntó)
- Total: 8/10 correct

## Mobile Optimization

The app is built mobile-first with:

- Bottom navigation bar (always visible)
- Touch-optimized buttons and cards
- Responsive design for all screen sizes
- Dark mode optimized for viewing in bars/social settings
- Safe area support for notched devices

## Troubleshooting

### "Unauthorized" error when trying admin features
- Make sure you ran the SQL command to make your account an admin
- Sign out and sign back in

### Photos not uploading
- Check that the buffalo-shots storage bucket exists in Supabase
- Verify storage policies are in place

### Can't see submissions
- Make sure RLS policies are enabled
- Check that you're signed in

### Scores not calculating
- Ensure all players have both submissions AND results entered
- Check browser console for errors

## Security Notes

- All database operations are protected by Row Level Security
- Users can only modify their own data
- Only admins can enter results and calculate scores
- Photos are stored in Supabase Storage with public read access
- Authentication uses Supabase Auth (secure, production-ready)

## Support

For issues or questions, check:
1. Browser developer console for errors
2. Supabase logs for database/auth errors
3. Network tab for failed API calls
