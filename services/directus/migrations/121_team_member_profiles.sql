-- Migration 121: Team Member Profiles for AI Task Assignment
-- Adds profile data to project_members so AI agents can reference
-- team member skills, availability, and roles when suggesting task assignments.

-- =====================================================
-- 1. Add profile column to project_members
-- =====================================================
ALTER TABLE project_members
ADD COLUMN IF NOT EXISTS profile JSONB DEFAULT '{}'::jsonb;

COMMENT ON COLUMN project_members.profile IS 'Team member profile containing role, skills, availability, and capacity for AI-aware task assignment';

-- =====================================================
-- 2. Create GIN index for skills search
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_project_members_skills
ON project_members USING GIN ((profile->'skills'));

CREATE INDEX IF NOT EXISTS idx_project_members_availability
ON project_members ((profile->>'availability'));

-- =====================================================
-- 3. Add profile schema documentation
-- =====================================================
-- Profile JSON Schema:
-- {
--   "role_title": string,           -- "Lead Developer", "Marketing Manager"
--   "skills": string[],             -- ["Vue", "TypeScript", "SEO"]
--   "expertise_areas": string[],    -- ["frontend", "marketing", "research"]
--   "availability": string,         -- "available" | "busy" | "away"
--   "capacity_percent": number,     -- 0-100, current workload percentage
--   "preferred_task_types": string[],-- ["development", "content-writing"]
--   "bio": string                   -- Short description of the member
-- }

-- =====================================================
-- 4. Create helper function to get team context for AI
-- =====================================================
CREATE OR REPLACE FUNCTION get_project_team_context(p_project_id UUID)
RETURNS TABLE (
    member_id UUID,
    user_id UUID,
    display_name TEXT,
    email TEXT,
    role TEXT,
    role_title TEXT,
    skills TEXT[],
    expertise_areas TEXT[],
    availability TEXT,
    capacity_percent INTEGER,
    preferred_task_types TEXT[],
    bio TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        pm.id as member_id,
        pm.user_id,
        COALESCE(du.first_name || ' ' || du.last_name, du.email) as display_name,
        du.email,
        pm.role,
        pm.profile->>'role_title' as role_title,
        ARRAY(SELECT jsonb_array_elements_text(pm.profile->'skills')) as skills,
        ARRAY(SELECT jsonb_array_elements_text(pm.profile->'expertise_areas')) as expertise_areas,
        COALESCE(pm.profile->>'availability', 'available') as availability,
        COALESCE((pm.profile->>'capacity_percent')::INTEGER, 100) as capacity_percent,
        ARRAY(SELECT jsonb_array_elements_text(pm.profile->'preferred_task_types')) as preferred_task_types,
        pm.profile->>'bio' as bio
    FROM project_members pm
    JOIN directus_users du ON pm.user_id = du.id
    WHERE pm.project_id = p_project_id
      AND pm.status = 'active'
    ORDER BY
        CASE pm.role
            WHEN 'owner' THEN 1
            WHEN 'admin' THEN 2
            WHEN 'member' THEN 3
            ELSE 4
        END;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 5. Create function to find best assignee for task
-- =====================================================
CREATE OR REPLACE FUNCTION suggest_task_assignee(
    p_project_id UUID,
    p_required_skills TEXT[] DEFAULT NULL,
    p_task_type TEXT DEFAULT NULL
)
RETURNS TABLE (
    member_id UUID,
    user_id UUID,
    display_name TEXT,
    match_score INTEGER,
    match_reasons TEXT[]
) AS $$
DECLARE
    skill TEXT;
BEGIN
    RETURN QUERY
    WITH member_scores AS (
        SELECT
            pm.id as member_id,
            pm.user_id,
            COALESCE(du.first_name || ' ' || du.last_name, du.email) as display_name,
            -- Skill match score (40 points max)
            CASE
                WHEN p_required_skills IS NULL THEN 20
                ELSE LEAST(40, 10 * (
                    SELECT COUNT(*)::INTEGER
                    FROM unnest(p_required_skills) rs
                    WHERE rs = ANY(ARRAY(SELECT jsonb_array_elements_text(pm.profile->'skills')))
                ))
            END as skill_score,
            -- Availability score (25 points max)
            CASE pm.profile->>'availability'
                WHEN 'available' THEN 25
                WHEN 'busy' THEN 10
                ELSE 0
            END as availability_score,
            -- Capacity score (25 points max)
            CASE
                WHEN (pm.profile->>'capacity_percent')::INTEGER IS NULL THEN 15
                WHEN (pm.profile->>'capacity_percent')::INTEGER <= 50 THEN 25
                WHEN (pm.profile->>'capacity_percent')::INTEGER <= 80 THEN 15
                ELSE 5
            END as capacity_score,
            -- Task type preference score (10 points max)
            CASE
                WHEN p_task_type IS NULL THEN 5
                WHEN p_task_type = ANY(ARRAY(SELECT jsonb_array_elements_text(pm.profile->'preferred_task_types'))) THEN 10
                ELSE 0
            END as task_type_score,
            -- Build reasons array
            ARRAY_REMOVE(ARRAY[
                CASE WHEN p_required_skills IS NOT NULL AND (
                    SELECT COUNT(*)
                    FROM unnest(p_required_skills) rs
                    WHERE rs = ANY(ARRAY(SELECT jsonb_array_elements_text(pm.profile->'skills')))
                ) > 0 THEN 'Has matching skills' ELSE NULL END,
                CASE WHEN pm.profile->>'availability' = 'available' THEN 'Currently available'
                     WHEN pm.profile->>'availability' = 'busy' THEN 'Busy but reachable'
                     ELSE NULL END,
                CASE WHEN (pm.profile->>'capacity_percent')::INTEGER <= 50 THEN 'Has capacity (' || (pm.profile->>'capacity_percent') || '%)' ELSE NULL END,
                CASE WHEN p_task_type = ANY(ARRAY(SELECT jsonb_array_elements_text(pm.profile->'preferred_task_types'))) THEN 'Prefers this task type' ELSE NULL END
            ], NULL) as reasons
        FROM project_members pm
        JOIN directus_users du ON pm.user_id = du.id
        WHERE pm.project_id = p_project_id
          AND pm.status = 'active'
    )
    SELECT
        ms.member_id,
        ms.user_id,
        ms.display_name,
        (ms.skill_score + ms.availability_score + ms.capacity_score + ms.task_type_score) as match_score,
        ms.reasons as match_reasons
    FROM member_scores ms
    WHERE (ms.skill_score + ms.availability_score + ms.capacity_score + ms.task_type_score) > 0
    ORDER BY (ms.skill_score + ms.availability_score + ms.capacity_score + ms.task_type_score) DESC
    LIMIT 3;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 6. Update Directus permissions for profile field
-- =====================================================
DO $$
DECLARE
    guest_policy_id UUID;
BEGIN
    -- Find Guest User Policy
    SELECT id INTO guest_policy_id
    FROM directus_policies
    WHERE name = 'Guest User Policy'
    LIMIT 1;

    IF guest_policy_id IS NOT NULL THEN
        -- Update project_members permissions to include profile field
        -- Members can update their own profile
        INSERT INTO directus_permissions (collection, action, permissions, validation, fields, policy)
        VALUES
            ('project_members', 'update', '{"user_id":{"_eq":"$CURRENT_USER"}}', '{}', 'profile', guest_policy_id)
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- =====================================================
-- 7. Seed default profiles for existing members
-- =====================================================
-- Set default availability for existing members without profiles
UPDATE project_members
SET profile = jsonb_build_object(
    'role_title', CASE role
        WHEN 'owner' THEN 'Project Owner'
        WHEN 'admin' THEN 'Project Admin'
        WHEN 'member' THEN 'Team Member'
        ELSE 'Contributor'
    END,
    'skills', '[]'::jsonb,
    'expertise_areas', '[]'::jsonb,
    'availability', 'available',
    'capacity_percent', 100,
    'preferred_task_types', '[]'::jsonb,
    'bio', NULL
)
WHERE profile = '{}'::jsonb OR profile IS NULL;
