-- Fix infinite recursion by using security definer functions
-- These functions bypass RLS policies to avoid circular checks

-- Create a security definer function to check if user is event member
CREATE OR REPLACE FUNCTION public.is_event_member(p_event_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM event_members
    WHERE event_id = p_event_id
      AND user_id = p_user_id
  );
END;
$$;

-- Create a security definer function to check if user is owner/admin
CREATE OR REPLACE FUNCTION public.is_event_admin(p_event_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM event_members
    WHERE event_id = p_event_id
      AND user_id = p_user_id
      AND role IN ('owner', 'admin')
  );
END;
$$;

-- Create a security definer function to get user's event IDs
CREATE OR REPLACE FUNCTION public.get_user_event_ids(p_user_id UUID)
RETURNS SETOF UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT event_id
  FROM event_members
  WHERE user_id = p_user_id;
END;
$$;

-- ============================================
-- Recreate event_members policies with security definer functions
-- ============================================

DROP POLICY IF EXISTS "Members can view event members" ON event_members;
DROP POLICY IF EXISTS "Owner and Admin can add members" ON event_members;
DROP POLICY IF EXISTS "Owner and Admin can update members" ON event_members;
DROP POLICY IF EXISTS "Members can leave, Admin can remove" ON event_members;

-- Members can view other members in their events (using security definer)
CREATE POLICY "Members can view event members"
  ON event_members FOR SELECT
  USING (
    user_id = auth.uid()
    OR
    is_event_member(event_id, auth.uid())
  );

-- Owner and Admin can add members (with bypass for first member)
CREATE POLICY "Owner and Admin can add members"
  ON event_members FOR INSERT
  WITH CHECK (
    -- Allow if no members exist yet (first member / event creation)
    NOT EXISTS (
      SELECT 1 FROM event_members em WHERE em.event_id = event_members.event_id
    )
    OR
    -- Or allow if current user is owner/admin (using security definer)
    is_event_admin(event_id, auth.uid())
  );

-- Owner and Admin can update member roles
CREATE POLICY "Owner and Admin can update members"
  ON event_members FOR UPDATE
  USING (is_event_admin(event_id, auth.uid()));

-- Members can leave (but not owners), Admins can remove others (but not owners)
CREATE POLICY "Members can leave, Admin can remove"
  ON event_members FOR DELETE
  USING (
    (user_id = auth.uid() AND role != 'owner')
    OR
    (is_event_admin(event_id, auth.uid()) AND role != 'owner')
  );

-- ============================================
-- Recreate event_teams policies with security definer functions
-- ============================================

DROP POLICY IF EXISTS "Members can view event teams" ON event_teams;
DROP POLICY IF EXISTS "Owner and Admin can create teams" ON event_teams;
DROP POLICY IF EXISTS "Owner and Admin can update teams" ON event_teams;
DROP POLICY IF EXISTS "Owner and Admin can delete teams" ON event_teams;

CREATE POLICY "Members can view event teams"
  ON event_teams FOR SELECT
  USING (is_event_member(event_id, auth.uid()));

CREATE POLICY "Owner and Admin can create teams"
  ON event_teams FOR INSERT
  WITH CHECK (is_event_admin(event_id, auth.uid()));

CREATE POLICY "Owner and Admin can update teams"
  ON event_teams FOR UPDATE
  USING (is_event_admin(event_id, auth.uid()));

CREATE POLICY "Owner and Admin can delete teams"
  ON event_teams FOR DELETE
  USING (is_event_admin(event_id, auth.uid()));

-- ============================================
-- Recreate event_invites policies with security definer functions
-- ============================================

DROP POLICY IF EXISTS "Anyone can view valid invites" ON event_invites;
DROP POLICY IF EXISTS "Owner and Admin can create invites" ON event_invites;
DROP POLICY IF EXISTS "Owner and Admin can update invites" ON event_invites;
DROP POLICY IF EXISTS "Owner and Admin can delete invites" ON event_invites;
DROP POLICY IF EXISTS "Users can mark invites as used" ON event_invites;

CREATE POLICY "Anyone can view valid invites"
  ON event_invites FOR SELECT
  USING (expires_at > now() AND used_at IS NULL);

CREATE POLICY "Owner and Admin can create invites"
  ON event_invites FOR INSERT
  WITH CHECK (is_event_admin(event_id, auth.uid()));

CREATE POLICY "Owner and Admin can update invites"
  ON event_invites FOR UPDATE
  USING (is_event_admin(event_id, auth.uid()));

CREATE POLICY "Owner and Admin can delete invites"
  ON event_invites FOR DELETE
  USING (is_event_admin(event_id, auth.uid()));

CREATE POLICY "Users can mark invites as used"
  ON event_invites FOR UPDATE
  USING (
    auth.uid() IS NOT NULL 
    AND expires_at > now() 
    AND used_at IS NULL
  )
  WITH CHECK (used_at IS NOT NULL);
