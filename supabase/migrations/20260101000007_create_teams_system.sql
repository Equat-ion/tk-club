-- Migration to create teams and members system for event collaboration
-- Enables event organizers to invite members, organize them into teams,
-- and manage permissions at the event level

BEGIN;

-- ============================================
-- Table: event_members
-- Stores all members of an event with their roles
-- ============================================
CREATE TABLE IF NOT EXISTS event_members (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(event_id, user_id)
);

CREATE INDEX idx_event_members_event ON event_members(event_id);
CREATE INDEX idx_event_members_user ON event_members(user_id);

-- ============================================
-- Table: event_teams
-- Stores teams within an event
-- ============================================
CREATE TABLE IF NOT EXISTS event_teams (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT check_team_name_length CHECK (char_length(name) <= 100),
  CONSTRAINT check_team_description_length CHECK (char_length(description) <= 500)
);

CREATE INDEX idx_event_teams_event ON event_teams(event_id);

-- ============================================
-- Table: team_members
-- Junction table for member-to-team assignments
-- ============================================
CREATE TABLE IF NOT EXISTS team_members (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES event_teams(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES event_members(id) ON DELETE CASCADE,
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  UNIQUE(team_id, member_id)
);

CREATE INDEX idx_team_members_team ON team_members(team_id);
CREATE INDEX idx_team_members_member ON team_members(member_id);

-- ============================================
-- Table: event_invites
-- Stores invite metadata for both email and link invites
-- ============================================
CREATE TABLE IF NOT EXISTS event_invites (
  id UUID PRIMARY KEY DEFAULT extensions.uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  invite_type TEXT NOT NULL CHECK (invite_type IN ('email', 'link')),
  token UUID NOT NULL DEFAULT extensions.uuid_generate_v4(),
  email TEXT, -- Only for email invites
  invited_by UUID NOT NULL REFERENCES auth.users(id),
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT check_email_for_email_invite 
    CHECK (invite_type != 'email' OR email IS NOT NULL)
);

CREATE UNIQUE INDEX idx_event_invites_token ON event_invites(token);
CREATE INDEX idx_event_invites_event ON event_invites(event_id);
CREATE INDEX idx_event_invites_expires ON event_invites(expires_at);

-- ============================================
-- Enable Row Level Security
-- ============================================
ALTER TABLE event_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_invites ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS Policies for event_members
-- ============================================

-- Members can view other members in same event
CREATE POLICY "Members can view event members"
  ON event_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM event_members em
      WHERE em.event_id = event_members.event_id
      AND em.user_id = auth.uid()
    )
  );

-- Owner and Admin can insert members
CREATE POLICY "Owner and Admin can add members"
  ON event_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM event_members em
      WHERE em.event_id = event_members.event_id
      AND em.user_id = auth.uid()
      AND em.role IN ('owner', 'admin')
    )
    -- Also allow inserting the first owner (trigger will handle this)
    OR NOT EXISTS (
      SELECT 1 FROM event_members em
      WHERE em.event_id = event_members.event_id
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

-- Owner and Admin can remove members (except Owner)
-- Members can remove themselves (leave event)
CREATE POLICY "Members can leave, Admin can remove"
  ON event_members FOR DELETE
  USING (
    -- Can remove self (leave event)
    (user_id = auth.uid() AND role != 'owner')
    -- Or is Admin/Owner removing non-owner members
    OR (
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
-- RLS Policies for event_teams
-- ============================================

-- Members can view teams (filtered in app layer by role for Members)
CREATE POLICY "Members can view event teams"
  ON event_teams FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM event_members em
      WHERE em.event_id = event_teams.event_id
      AND em.user_id = auth.uid()
    )
  );

-- Owner and Admin can create teams
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

-- Owner and Admin can update teams
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

-- Owner and Admin can delete teams
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
-- RLS Policies for team_members
-- ============================================

-- Members can view team assignments
CREATE POLICY "Members can view team assignments"
  ON team_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM event_teams et
      JOIN event_members em ON em.event_id = et.event_id
      WHERE et.id = team_members.team_id
      AND em.user_id = auth.uid()
    )
  );

-- Owner and Admin can assign members
CREATE POLICY "Owner and Admin can assign members"
  ON team_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM event_teams et
      JOIN event_members em ON em.event_id = et.event_id
      WHERE et.id = team_members.team_id
      AND em.user_id = auth.uid()
      AND em.role IN ('owner', 'admin')
    )
  );

-- Owner and Admin can remove assignments
CREATE POLICY "Owner and Admin can remove assignments"
  ON team_members FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM event_teams et
      JOIN event_members em ON em.event_id = et.event_id
      WHERE et.id = team_members.team_id
      AND em.user_id = auth.uid()
      AND em.role IN ('owner', 'admin')
    )
  );

-- ============================================
-- RLS Policies for event_invites
-- ============================================

-- Anyone can view valid invite info (for invite page validation)
CREATE POLICY "Anyone can view valid invites"
  ON event_invites FOR SELECT
  USING (
    expires_at > now()
    AND used_at IS NULL
  );

-- Owner and Admin can create invites
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

-- Owner and Admin can update invites (mark as used)
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

-- Owner and Admin can delete invites (revoke)
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

-- Allow system to mark invites as used (for invite acceptance)
CREATE POLICY "System can mark invites as used"
  ON event_invites FOR UPDATE
  USING (
    -- Allow update if user is authenticated and invite is valid
    auth.uid() IS NOT NULL
    AND expires_at > now()
    AND used_at IS NULL
  );

-- ============================================
-- Trigger: Auto-create Owner as Event Member
-- ============================================
CREATE OR REPLACE FUNCTION create_owner_member()
RETURNS trigger AS $$
BEGIN
  -- Get the user_id from users table using organizer_id
  INSERT INTO event_members (event_id, user_id, role)
  SELECT NEW.id, u.auth_user_id, 'owner'
  FROM users u
  WHERE u.id = NEW.organizer_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_create_owner_member
  AFTER INSERT ON events
  FOR EACH ROW
  EXECUTE FUNCTION create_owner_member();

-- ============================================
-- Backfill: Add existing events' organizers as owners
-- ============================================
INSERT INTO event_members (event_id, user_id, role)
SELECT e.id, u.auth_user_id, 'owner'
FROM events e
JOIN users u ON u.id = e.organizer_id
ON CONFLICT (event_id, user_id) DO NOTHING;

-- ============================================
-- Update timestamps trigger
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_event_members_updated_at
  BEFORE UPDATE ON event_members
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_event_teams_updated_at
  BEFORE UPDATE ON event_teams
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMIT;
