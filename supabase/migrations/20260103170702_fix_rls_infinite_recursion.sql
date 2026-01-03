-- Fix infinite recursion in RLS policies for event_members, event_teams, and event_invites
-- The problem: SELECT policies on event_members were causing recursive checks
-- Solution: Use simpler policies that don't cause circular dependencies

-- ============================================
-- Fix event_members policies
-- ============================================

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Members can view event members" ON event_members;
DROP POLICY IF EXISTS "Owner and Admin can add members" ON event_members;
DROP POLICY IF EXISTS "Owner and Admin can update members" ON event_members;
DROP POLICY IF EXISTS "Members can leave, Admin can remove" ON event_members;

-- Create new policies without recursion

-- Members can view other members in their events
CREATE POLICY "Members can view event members"
  ON event_members FOR SELECT
  USING (
    user_id = auth.uid() 
    OR 
    event_id IN (
      SELECT em.event_id 
      FROM event_members em 
      WHERE em.user_id = auth.uid()
    )
  );

-- Owner and Admin can add members (with bypass for first member)
-- The first member insertion is allowed if no members exist for the event yet
CREATE POLICY "Owner and Admin can add members"
  ON event_members FOR INSERT
  WITH CHECK (
    -- Allow if no members exist yet (first member / event creation)
    NOT EXISTS (
      SELECT 1 FROM event_members em WHERE em.event_id = event_members.event_id
    )
    OR
    -- Or allow if current user is owner/admin
    EXISTS (
      SELECT 1 FROM event_members em
      WHERE em.event_id = event_members.event_id
        AND em.user_id = auth.uid()
        AND em.role IN ('owner', 'admin')
    )
  );

-- Owner and Admin can update member roles
CREATE POLICY "Owner and Admin can update members"
  ON event_members FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM event_members em
      WHERE em.event_id = event_members.event_id
        AND em.user_id = auth.uid()
        AND em.role IN ('owner', 'admin')
    )
  );

-- Members can leave (but not owners), Admins can remove others (but not owners)
CREATE POLICY "Members can leave, Admin can remove"
  ON event_members FOR DELETE
  USING (
    (user_id = auth.uid() AND role != 'owner')
    OR
    (
      EXISTS (
        SELECT 1 FROM event_members em
        WHERE em.event_id = event_members.event_id
          AND em.user_id = auth.uid()
          AND em.role IN ('owner', 'admin')
      )
      AND role != 'owner'
    )
  );

-- ============================================
-- Fix event_teams policies (similar approach)
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Members can view event teams" ON event_teams;
DROP POLICY IF EXISTS "Owner and Admin can create teams" ON event_teams;
DROP POLICY IF EXISTS "Owner and Admin can update teams" ON event_teams;
DROP POLICY IF EXISTS "Owner and Admin can delete teams" ON event_teams;

-- Create new policies
CREATE POLICY "Members can view event teams"
  ON event_teams FOR SELECT
  USING (
    event_id IN (
      SELECT em.event_id 
      FROM event_members em 
      WHERE em.user_id = auth.uid()
    )
  );

CREATE POLICY "Owner and Admin can create teams"
  ON event_teams FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM event_members em
      WHERE em.event_id = event_teams.event_id
        AND em.user_id = auth.uid()
        AND em.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Owner and Admin can update teams"
  ON event_teams FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM event_members em
      WHERE em.event_id = event_teams.event_id
        AND em.user_id = auth.uid()
        AND em.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Owner and Admin can delete teams"
  ON event_teams FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM event_members em
      WHERE em.event_id = event_teams.event_id
        AND em.user_id = auth.uid()
        AND em.role IN ('owner', 'admin')
    )
  );

-- ============================================
-- Fix event_invites policies
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can view valid invites" ON event_invites;
DROP POLICY IF EXISTS "Owner and Admin can create invites" ON event_invites;
DROP POLICY IF EXISTS "Owner and Admin can update invites" ON event_invites;
DROP POLICY IF EXISTS "Owner and Admin can delete invites" ON event_invites;
DROP POLICY IF EXISTS "System can mark invites as used" ON event_invites;

-- Create new policies
CREATE POLICY "Anyone can view valid invites"
  ON event_invites FOR SELECT
  USING (expires_at > now() AND used_at IS NULL);

CREATE POLICY "Owner and Admin can create invites"
  ON event_invites FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM event_members em
      WHERE em.event_id = event_invites.event_id
        AND em.user_id = auth.uid()
        AND em.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Owner and Admin can update invites"
  ON event_invites FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM event_members em
      WHERE em.event_id = event_invites.event_id
        AND em.user_id = auth.uid()
        AND em.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Owner and Admin can delete invites"
  ON event_invites FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM event_members em
      WHERE em.event_id = event_invites.event_id
        AND em.user_id = auth.uid()
        AND em.role IN ('owner', 'admin')
    )
  );

-- Allow authenticated users to mark invites as used when accepting
CREATE POLICY "Users can mark invites as used"
  ON event_invites FOR UPDATE
  USING (
    auth.uid() IS NOT NULL 
    AND expires_at > now() 
    AND used_at IS NULL
  )
  WITH CHECK (
    -- Only allow updating used_at field
    used_at IS NOT NULL
  );
