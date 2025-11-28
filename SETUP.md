# Setup Guide - Apply Database Migrations

Your database is at: **https://mmzsptvwrwdcqsecocqa.supabase.co**

## Quick Setup (Do This!)

1. Go to https://supabase.com/dashboard
2. Find project `mmzsptvwrwdcqsecocqa`
3. Click **"SQL Editor"** in left sidebar
4. Click **"New Query"**
5. Copy/paste each migration file below and click **"Run"**

## Migrations to Run (In Order)

### 1. Copy this file and run:
`supabase/migrations/20251125181330_create_buffalo_predictions_schema.sql`

### 2. Copy this file and run:
`supabase/migrations/20251125203221_enhance_buffalo_schema_with_new_features.sql`

### 3. Copy this file and run:
`supabase/migrations/20251126000822_fix_security_and_performance_issues.sql`

### 4. Copy this file and run:
`supabase/migrations/20251127021206_add_buffalo_requests_system.sql`

### 5. Copy this file and run:
`supabase/migrations/20251127082211_allow_users_to_create_buffalo_balances.sql`

## Verify It Worked

Run this query in SQL Editor:

\`\`\`sql
SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;
\`\`\`

You should see: buffalo_balances, buffalo_calls, buffalo_requests, feed_events, invites, notifications, profiles, results, scores, submissions

## ✅ You're Done!

Database is ready with NO test data.
