-- Migration 041: Project Members and Invitations System
-- Allows project owners (including guest users) to invite and manage team members

-- =====================================================
-- 1. Create project_members table
-- =====================================================
CREATE TABLE IF NOT EXISTS project_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES directus_users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'member',
    permissions JSONB DEFAULT '{"can_edit": true, "can_delete": false, "can_invite": false}'::jsonb,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'removed')),
    date_created TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    date_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_created UUID REFERENCES directus_users(id),
    user_updated UUID REFERENCES directus_users(id),
    UNIQUE(project_id, user_id)
);

-- Indexes for project_members
CREATE INDEX IF NOT EXISTS idx_project_members_project ON project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user ON project_members(user_id);
CREATE INDEX IF NOT EXISTS idx_project_members_status ON project_members(status);

COMMENT ON TABLE project_members IS 'Tracks team members assigned to projects';
COMMENT ON COLUMN project_members.role IS 'Member role: owner, admin, member, viewer';
COMMENT ON COLUMN project_members.permissions IS 'JSON object defining member permissions';

-- =====================================================
-- 2. Create project_invitations table
-- =====================================================
CREATE TABLE IF NOT EXISTS project_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    invited_by UUID NOT NULL REFERENCES directus_users(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'member',
    permissions JSONB DEFAULT '{"can_edit": true, "can_delete": false, "can_invite": false}'::jsonb,
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined', 'expired')),
    token VARCHAR(255) UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '7 days',
    accepted_at TIMESTAMP WITH TIME ZONE,
    date_created TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    date_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    user_created UUID REFERENCES directus_users(id),
    user_updated UUID REFERENCES directus_users(id),
    UNIQUE(project_id, email, status) DEFERRABLE INITIALLY DEFERRED
);

-- Indexes for project_invitations
CREATE INDEX IF NOT EXISTS idx_project_invitations_project ON project_invitations(project_id);
CREATE INDEX IF NOT EXISTS idx_project_invitations_email ON project_invitations(email);
CREATE INDEX IF NOT EXISTS idx_project_invitations_status ON project_invitations(status);
CREATE INDEX IF NOT EXISTS idx_project_invitations_token ON project_invitations(token);
CREATE INDEX IF NOT EXISTS idx_project_invitations_expires ON project_invitations(expires_at);

COMMENT ON TABLE project_invitations IS 'Manages pending invitations to join projects';
COMMENT ON COLUMN project_invitations.token IS 'Unique token for invitation acceptance';
COMMENT ON COLUMN project_invitations.expires_at IS 'Invitation expiration date';

-- =====================================================
-- 3. Auto-add project owner as member
-- =====================================================
-- Function to automatically add project owner as member
CREATE OR REPLACE FUNCTION add_project_owner_as_member()
RETURNS TRIGGER AS $$
BEGIN
    -- Add project owner as a member with owner role
    IF NEW.owner_id IS NOT NULL THEN
        INSERT INTO project_members (
            project_id,
            user_id,
            role,
            permissions,
            status,
            user_created
        ) VALUES (
            NEW.id,
            NEW.owner_id,
            'owner',
            '{"can_edit": true, "can_delete": true, "can_invite": true}'::jsonb,
            'active',
            NEW.user_created
        )
        ON CONFLICT (project_id, user_id) DO NOTHING;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to add owner as member on project creation
DROP TRIGGER IF EXISTS trigger_add_project_owner_as_member ON projects;
CREATE TRIGGER trigger_add_project_owner_as_member
    AFTER INSERT ON projects
    FOR EACH ROW
    EXECUTE FUNCTION add_project_owner_as_member();

-- =====================================================
-- 4. Add existing project owners as members
-- =====================================================
-- Backfill existing projects with their owners as members
INSERT INTO project_members (project_id, user_id, role, permissions, status, user_created)
SELECT
    p.id as project_id,
    p.owner_id as user_id,
    'owner' as role,
    '{"can_edit": true, "can_delete": true, "can_invite": true}'::jsonb as permissions,
    'active' as status,
    p.user_created
FROM projects p
WHERE p.owner_id IS NOT NULL
ON CONFLICT (project_id, user_id) DO NOTHING;

-- =====================================================
-- 5. Directus Permissions for Guest User role (v11)
-- =====================================================

-- Directus v11 uses policy-based permissions instead of role-based
DO $$
DECLARE
    guest_role_id UUID;
    guest_policy_id UUID;
    guest_access_id UUID;
BEGIN
    -- Find Guest User role
    SELECT id INTO guest_role_id
    FROM directus_roles
    WHERE name = 'Guest User'
    LIMIT 1;

    IF guest_role_id IS NOT NULL THEN
        -- Get or create policy for Guest User
        SELECT id INTO guest_policy_id
        FROM directus_policies
        WHERE name = 'Guest User Policy'
        LIMIT 1;

        IF guest_policy_id IS NULL THEN
            INSERT INTO directus_policies (id, name, admin_access, app_access, icon, description)
            VALUES (
                gen_random_uuid(),
                'Guest User Policy',
                false,
                true,
                'group',
                'Policy for guest users to manage their projects and team members'
            )
            RETURNING id INTO guest_policy_id;
        END IF;

        -- Link Guest User role to policy via directus_access
        SELECT id INTO guest_access_id
        FROM directus_access
        WHERE role = guest_role_id AND policy = guest_policy_id
        LIMIT 1;

        IF guest_access_id IS NULL THEN
            INSERT INTO directus_access (id, role, policy)
            VALUES (gen_random_uuid(), guest_role_id, guest_policy_id);
        END IF;

        -- Grant permissions for project_members collection
        INSERT INTO directus_permissions (collection, action, permissions, validation, fields, policy)
        VALUES
            -- Read all members of projects they own or are members of
            ('project_members', 'read', '{"_or":[{"project_id":{"owner_id":{"_eq":"$CURRENT_USER"}}},{"user_id":{"_eq":"$CURRENT_USER"}}]}', '{}', '*', guest_policy_id),

            -- Create members for projects they own
            ('project_members', 'create', '{"project_id":{"owner_id":{"_eq":"$CURRENT_USER"}}}', '{"project_id":{"owner_id":{"_eq":"$CURRENT_USER"}}}', '*', guest_policy_id),

            -- Update members for projects they own (except owner role)
            ('project_members', 'update', '{"_and":[{"project_id":{"owner_id":{"_eq":"$CURRENT_USER"}}},{"role":{"_neq":"owner"}}]}', '{}', '*', guest_policy_id),

            -- Delete members from projects they own (except owner role)
            ('project_members', 'delete', '{"_and":[{"project_id":{"owner_id":{"_eq":"$CURRENT_USER"}}},{"role":{"_neq":"owner"}}]}', '{}', NULL, guest_policy_id)
        ON CONFLICT DO NOTHING;

        -- Grant permissions for project_invitations collection
        INSERT INTO directus_permissions (collection, action, permissions, validation, fields, policy)
        VALUES
            -- Read invitations for their projects
            ('project_invitations', 'read', '{"project_id":{"owner_id":{"_eq":"$CURRENT_USER"}}}', '{}', '*', guest_policy_id),

            -- Create invitations for projects they own
            ('project_invitations', 'create', '{"project_id":{"owner_id":{"_eq":"$CURRENT_USER"}}}', '{"project_id":{"owner_id":{"_eq":"$CURRENT_USER"}},"invited_by":{"_eq":"$CURRENT_USER"}}', '*', guest_policy_id),

            -- Update their own invitations (cancel/resend)
            ('project_invitations', 'update', '{"invited_by":{"_eq":"$CURRENT_USER"}}', '{}', 'status,expires_at', guest_policy_id),

            -- Delete their own invitations
            ('project_invitations', 'delete', '{"invited_by":{"_eq":"$CURRENT_USER"}}', '{}', NULL, guest_policy_id)
        ON CONFLICT DO NOTHING;

        -- Update projects read permission to include projects where user is a member
        DELETE FROM directus_permissions
        WHERE policy = guest_policy_id
          AND collection = 'projects'
          AND action = 'read';

        INSERT INTO directus_permissions (collection, action, permissions, validation, fields, policy)
        VALUES
            ('projects', 'read', '{"_or":[{"owner_id":{"_eq":"$CURRENT_USER"}},{"project_members":{"user_id":{"_eq":"$CURRENT_USER"},"status":{"_eq":"active"}}}]}', '{}', '*', guest_policy_id)
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- =====================================================
-- 6. Helper Functions
-- =====================================================

-- Function to check if user is project member
CREATE OR REPLACE FUNCTION is_project_member(
    p_project_id UUID,
    p_user_id UUID
) RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1
        FROM project_members
        WHERE project_id = p_project_id
          AND user_id = p_user_id
          AND status = 'active'
    );
END;
$$ LANGUAGE plpgsql;

-- Function to get user's project role
CREATE OR REPLACE FUNCTION get_project_role(
    p_project_id UUID,
    p_user_id UUID
) RETURNS VARCHAR AS $$
DECLARE
    user_role VARCHAR;
BEGIN
    SELECT role INTO user_role
    FROM project_members
    WHERE project_id = p_project_id
      AND user_id = p_user_id
      AND status = 'active'
    LIMIT 1;

    RETURN user_role;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 7. Update timestamp triggers
-- =====================================================

CREATE OR REPLACE FUNCTION update_project_members_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.date_updated = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_project_members_timestamp
    BEFORE UPDATE ON project_members
    FOR EACH ROW
    EXECUTE FUNCTION update_project_members_timestamp();

CREATE OR REPLACE FUNCTION update_project_invitations_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.date_updated = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_project_invitations_timestamp
    BEFORE UPDATE ON project_invitations
    FOR EACH ROW
    EXECUTE FUNCTION update_project_invitations_timestamp();
