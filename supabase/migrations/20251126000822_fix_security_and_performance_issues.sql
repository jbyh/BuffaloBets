/*
  # Fix Security and Performance Issues
  
  This migration addresses all identified security and performance issues:
  
  ## 1. Add Missing Foreign Key Indexes
  - Add indexes for all foreign key columns to improve query performance
  - Covers: buffalo_balances (caller_id, recipient_id)
  - Covers: buffalo_calls (caller_id, recipient_id)
  - Covers: feed_events (user_id, related_user_id)
  - Covers: invites (creator_id, used_by)
  
  ## 2. Optimize RLS Policies
  - Replace auth.uid() with (SELECT auth.uid()) to prevent re-evaluation per row
  - Update all affected policies across all tables
  - Significantly improves query performance at scale
  
  ## 3. Remove Duplicate Permissive Policies
  - Consolidate multiple SELECT policies on buffalo_balances
  - Maintain security while improving clarity
  
  ## 4. Clean Up Unused Indexes
  - Remove indexes that are not being used by queries
  - Reduces storage overhead and improves write performance
  
  ## Security Notes
  - All changes maintain existing security constraints
  - Performance improvements do not compromise data access controls
  - Foreign key indexes improve join performance dramatically
*/

-- ============================================
-- 1. ADD MISSING FOREIGN KEY INDEXES
-- ============================================

-- Buffalo balances indexes
CREATE INDEX IF NOT EXISTS idx_buffalo_balances_caller_id ON buffalo_balances(caller_id);
CREATE INDEX IF NOT EXISTS idx_buffalo_balances_recipient_id ON buffalo_balances(recipient_id);

-- Buffalo calls indexes
CREATE INDEX IF NOT EXISTS idx_buffalo_calls_caller_id ON buffalo_calls(caller_id);
CREATE INDEX IF NOT EXISTS idx_buffalo_calls_recipient_id ON buffalo_calls(recipient_id);

-- Feed events indexes
CREATE INDEX IF NOT EXISTS idx_feed_events_user_id ON feed_events(user_id);
CREATE INDEX IF NOT EXISTS idx_feed_events_related_user_id ON feed_events(related_user_id);

-- Invites indexes
CREATE INDEX IF NOT EXISTS idx_invites_creator_id ON invites(creator_id);
CREATE INDEX IF NOT EXISTS idx_invites_used_by ON invites(used_by);

-- ============================================
-- 2. OPTIMIZE RLS POLICIES - PROFILES TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = id)
  WITH CHECK ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = id);

-- ============================================
-- 3. OPTIMIZE RLS POLICIES - SUBMISSIONS TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can insert own submissions" ON submissions;
CREATE POLICY "Users can insert own submissions"
  ON submissions FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own submissions" ON submissions;
CREATE POLICY "Users can update own submissions"
  ON submissions FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- ============================================
-- 4. OPTIMIZE RLS POLICIES - RESULTS TABLE
-- ============================================

DROP POLICY IF EXISTS "Admins can insert results" ON results;
CREATE POLICY "Admins can insert results"
  ON results FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.is_admin = true
    )
  );

DROP POLICY IF EXISTS "Admins can update results" ON results;
CREATE POLICY "Admins can update results"
  ON results FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.is_admin = true
    )
  );

-- ============================================
-- 5. OPTIMIZE RLS POLICIES - SCORES TABLE
-- ============================================

DROP POLICY IF EXISTS "Admins can insert scores" ON scores;
CREATE POLICY "Admins can insert scores"
  ON scores FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.is_admin = true
    )
  );

DROP POLICY IF EXISTS "Admins can update scores" ON scores;
CREATE POLICY "Admins can update scores"
  ON scores FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.is_admin = true
    )
  );

-- ============================================
-- 6. OPTIMIZE RLS POLICIES - BUFFALO_BALANCES TABLE
-- ============================================

-- Remove duplicate permissive policies and consolidate
DROP POLICY IF EXISTS "Users can view all buffalo balances" ON buffalo_balances;
DROP POLICY IF EXISTS "Admins can manage buffalo balances" ON buffalo_balances;

-- Single SELECT policy for all authenticated users
CREATE POLICY "Authenticated users can view buffalo balances"
  ON buffalo_balances FOR SELECT
  TO authenticated
  USING (true);

-- Admins can INSERT
CREATE POLICY "Admins can insert buffalo balances"
  ON buffalo_balances FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.is_admin = true
    )
  );

-- Admins can UPDATE
CREATE POLICY "Admins can update buffalo balances"
  ON buffalo_balances FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.is_admin = true
    )
  );

-- Admins can DELETE
CREATE POLICY "Admins can delete buffalo balances"
  ON buffalo_balances FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = (SELECT auth.uid())
      AND profiles.is_admin = true
    )
  );

-- ============================================
-- 7. OPTIMIZE RLS POLICIES - BUFFALO_CALLS TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can create buffalo calls" ON buffalo_calls;
CREATE POLICY "Users can create buffalo calls"
  ON buffalo_calls FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = caller_id);

DROP POLICY IF EXISTS "Recipients can update their buffalo calls" ON buffalo_calls;
CREATE POLICY "Recipients can update their buffalo calls"
  ON buffalo_calls FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = recipient_id)
  WITH CHECK ((SELECT auth.uid()) = recipient_id);

-- ============================================
-- 8. OPTIMIZE RLS POLICIES - INVITES TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can create invites" ON invites;
CREATE POLICY "Users can create invites"
  ON invites FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = creator_id);

DROP POLICY IF EXISTS "Anyone can update invites when using them" ON invites;
CREATE POLICY "Anyone can update invites when using them"
  ON invites FOR UPDATE
  TO authenticated
  USING (used_by IS NULL)
  WITH CHECK ((SELECT auth.uid()) = used_by);

-- ============================================
-- 9. OPTIMIZE RLS POLICIES - NOTIFICATIONS TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own notifications" ON notifications;
CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- ============================================
-- 10. OPTIMIZE RLS POLICIES - FEED_EVENTS TABLE
-- ============================================

DROP POLICY IF EXISTS "Users can create feed events" ON feed_events;
CREATE POLICY "Users can create feed events"
  ON feed_events FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

-- ============================================
-- 11. REMOVE UNUSED INDEXES
-- ============================================

-- These indexes exist but are not being used by queries
-- Removing them improves write performance and reduces storage
DROP INDEX IF EXISTS idx_notifications_user_id;
DROP INDEX IF EXISTS idx_notifications_created_at;
DROP INDEX IF EXISTS idx_feed_events_type;

-- Add a composite index that will actually be used for notifications queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, created_at DESC);

-- Add a composite index for feed_events that's more useful
CREATE INDEX IF NOT EXISTS idx_feed_events_year_created ON feed_events(year, created_at DESC);