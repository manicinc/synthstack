import type { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import { randomBytes } from 'crypto';
import { sendTeamInvitationEmail } from '../services/email/helpers.js';

type ProjectPermission = 'view' | 'invite';
type MemberRole = 'owner' | 'admin' | 'member' | 'viewer';

interface InviteMemberBody {
  email: string;
  role?: Exclude<MemberRole, 'owner'>;
  permissions?: {
    can_edit?: boolean;
    can_delete?: boolean;
    can_invite?: boolean;
  };
}

interface UpdateMemberBody {
  role?: Exclude<MemberRole, 'owner'>;
  permissions?: {
    can_edit?: boolean;
    can_delete?: boolean;
    can_invite?: boolean;
  };
}

interface UpdateProfileBody {
  roleTitle?: string;
  skills?: string[];
  expertiseAreas?: string[];
  availability?: 'available' | 'busy' | 'away';
  capacityPercent?: number;
  preferredTaskTypes?: string[];
  bio?: string;
}

interface SuggestAssigneeBody {
  taskDescription?: string;
  requiredSkills?: string[];
  taskType?: string;
}

function parsePermissions(raw: unknown): { can_edit?: boolean; can_delete?: boolean; can_invite?: boolean } {
  if (!raw) return {};
  if (typeof raw === 'object') return raw as any;
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }
  return {};
}

function roleBasePermissions(role: string | null | undefined): { canEdit: boolean; canInvite: boolean; canDelete: boolean } {
  switch (role) {
    case 'owner':
      return { canEdit: true, canInvite: true, canDelete: true };
    case 'admin':
      return { canEdit: true, canInvite: true, canDelete: true };
    case 'member':
      return { canEdit: true, canInvite: false, canDelete: false };
    case 'viewer':
    default:
      return { canEdit: false, canInvite: false, canDelete: false };
  }
}

function defaultPermissionsForRole(role: Exclude<MemberRole, 'owner'>): { can_edit: boolean; can_delete: boolean; can_invite: boolean } {
  const base = roleBasePermissions(role);
  return {
    can_edit: base.canEdit,
    can_delete: base.canDelete,
    can_invite: base.canInvite,
  };
}

function normalizeProfile(profileRaw: unknown): Record<string, unknown> {
  const profile = profileRaw && typeof profileRaw === 'object' ? (profileRaw as Record<string, unknown>) : {};

  const skills = Array.isArray(profile.skills) ? profile.skills : [];
  const expertiseSnake = Array.isArray(profile.expertise_areas) ? profile.expertise_areas : null;
  const expertiseCamel = Array.isArray(profile.expertiseAreas) ? profile.expertiseAreas : null;
  const preferredSnake = Array.isArray(profile.preferred_task_types) ? profile.preferred_task_types : null;
  const preferredCamel = Array.isArray(profile.preferredTaskTypes) ? profile.preferredTaskTypes : null;

  const roleTitle = typeof profile.roleTitle === 'string'
    ? profile.roleTitle
    : typeof profile.role_title === 'string'
      ? profile.role_title
      : undefined;

  const availability = typeof profile.availability === 'string' ? profile.availability : 'available';
  const capacity = typeof profile.capacityPercent === 'number'
    ? profile.capacityPercent
    : typeof profile.capacity_percent === 'number'
      ? profile.capacity_percent
      : 100;

  const bio = typeof profile.bio === 'string' ? profile.bio : '';

  return {
    ...profile,
    role_title: roleTitle,
    roleTitle,
    skills,
    expertise_areas: expertiseSnake ?? expertiseCamel ?? [],
    expertiseAreas: expertiseCamel ?? expertiseSnake ?? [],
    availability,
    capacity_percent: capacity,
    capacityPercent: capacity,
    preferred_task_types: preferredSnake ?? preferredCamel ?? [],
    preferredTaskTypes: preferredCamel ?? preferredSnake ?? [],
    bio,
  };
}

async function requireProjectPermission(
  server: FastifyInstance,
  request: any,
  reply: FastifyReply,
  projectId: string,
  permission: ProjectPermission
): Promise<{
  project: { id: string; owner_id: string | null; is_system: boolean | null };
  userId: string | null;
  canInvite: boolean;
} | null> {
  const user = request.user;
  const userId: string | null = user?.id ?? null;

  const projectResult = await server.pg.query<{
    id: string;
    owner_id: string | null;
    is_system: boolean | null;
    member_role: string | null;
    member_permissions: unknown;
  }>(
    `
      SELECT
        p.id,
        p.owner_id,
        p.is_system,
        pm.role as member_role,
        pm.permissions as member_permissions
      FROM projects p
      LEFT JOIN project_members pm
        ON pm.project_id = p.id
       AND pm.user_id = $2
       AND pm.status = 'active'
      WHERE p.id = $1
      LIMIT 1
    `,
    [projectId, userId]
  );

  const project = projectResult.rows[0];
  if (!project) {
    reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Project not found' } });
    return null;
  }

  const isPlatformAdmin = user?.is_admin === true;
  const isOwner = Boolean(userId && project.owner_id && project.owner_id === userId);
  const memberRole = project.member_role;
  const base = roleBasePermissions(memberRole);
  const overrides = parsePermissions(project.member_permissions);

  let canInvite = base.canInvite || overrides.can_invite === true;
  if (isOwner || isPlatformAdmin) canInvite = true;

  const canView = Boolean(project.is_system) || isPlatformAdmin || isOwner || Boolean(memberRole);

  if (permission === 'view') {
    if (!canView) {
      reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Project not found' } });
      return null;
    }
    return { project, userId, canInvite };
  }

  // invite permission requires auth
  if (!userId) {
    reply.status(401).send({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
    return null;
  }

  if (!canInvite) {
    reply.status(403).send({ success: false, error: { code: 'FORBIDDEN', message: 'Invite permission required' } });
    return null;
  }

  return { project, userId, canInvite };
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function isValidEmail(email: string): boolean {
  // Basic sanity validation; do not over-reject.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default async function projectMembersRoutes(server: FastifyInstance) {
  // =====================================================
  // Members
  // =====================================================

  server.get(
    '/projects/:projectId/members',
    { preHandler: server.authenticate },
    async (request: FastifyRequest<{ Params: { projectId: string } }>, reply: FastifyReply) => {
      const { projectId } = request.params;
      const access = await requireProjectPermission(server, request as any, reply, projectId, 'view');
      if (!access) return;

      const result = await server.pg.query<{
        id: string;
        project_id: string;
        user_id: string;
        role: MemberRole;
        permissions: unknown;
        status: string;
        profile: unknown;
        date_created: string;
        date_updated: string;
        user_email: string;
        user_display_name: string | null;
        user_avatar_url: string | null;
      }>(
        `
        SELECT
          pm.*,
          au.email as user_email,
          au.display_name as user_display_name,
          au.avatar_url as user_avatar_url
        FROM project_members pm
        JOIN app_users au ON au.id = pm.user_id
        WHERE pm.project_id = $1 AND pm.status = 'active'
        ORDER BY
          CASE pm.role
            WHEN 'owner' THEN 0
            WHEN 'admin' THEN 1
            WHEN 'member' THEN 2
            WHEN 'viewer' THEN 3
            ELSE 4
          END,
          au.email ASC
      `,
        [projectId]
      );

      const members = result.rows.map((row) => ({
        id: row.id,
        project_id: row.project_id,
        user_id: row.user_id,
        role: row.role,
        permissions: row.permissions,
        status: row.status,
        profile: normalizeProfile(row.profile),
        date_created: row.date_created,
        date_updated: row.date_updated,
        user: {
          id: row.user_id,
          email: row.user_email,
          display_name: row.user_display_name ?? undefined,
          avatar_url: row.user_avatar_url ?? undefined,
        },
      }));

      return reply.send({ success: true, data: members });
    }
  );

  server.patch(
    '/projects/:projectId/members/:memberId',
    { preHandler: server.authenticate },
    async (
      request: FastifyRequest<{ Params: { projectId: string; memberId: string }; Body: UpdateMemberBody }>,
      reply: FastifyReply
    ) => {
      const { projectId, memberId } = request.params;
      const access = await requireProjectPermission(server, request as any, reply, projectId, 'invite');
      if (!access) return;

      const role = request.body?.role;
      if (role && !['admin', 'member', 'viewer'].includes(role)) {
        return reply.status(400).send({ success: false, error: { code: 'INVALID_ROLE', message: 'Invalid role' } });
      }

      const memberResult = await server.pg.query<{ id: string; project_id: string; role: MemberRole }>(
        `SELECT id, project_id, role FROM project_members WHERE id = $1 LIMIT 1`,
        [memberId]
      );

      if (memberResult.rows.length === 0 || memberResult.rows[0].project_id !== projectId) {
        return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Member not found' } });
      }

      if (memberResult.rows[0].role === 'owner') {
        return reply.status(400).send({ success: false, error: { code: 'CANNOT_UPDATE_OWNER', message: 'Cannot modify project owner' } });
      }

      const updates: string[] = [];
      const params: unknown[] = [];
      let i = 1;

      if (role) {
        updates.push(`role = $${i++}`);
        params.push(role);

        const defaults = defaultPermissionsForRole(role);
        const overrides = request.body.permissions || {};
        const mergedPermissions = {
          ...defaults,
          ...overrides,
        };
        updates.push(`permissions = $${i++}::jsonb`);
        params.push(JSON.stringify(mergedPermissions));
      } else if (request.body.permissions) {
        updates.push(`permissions = $${i++}::jsonb`);
        params.push(JSON.stringify(request.body.permissions));
      }

      if (updates.length === 0) {
        return reply.send({ success: true });
      }

      params.push(memberId);
      await server.pg.query(
        `UPDATE project_members SET ${updates.join(', ')}, date_updated = NOW() WHERE id = $${i}`,
        params
      );

      return reply.send({ success: true });
    }
  );

  server.delete(
    '/projects/:projectId/members/:memberId',
    { preHandler: server.authenticate },
    async (request: FastifyRequest<{ Params: { projectId: string; memberId: string } }>, reply: FastifyReply) => {
      const { projectId, memberId } = request.params;
      const access = await requireProjectPermission(server, request as any, reply, projectId, 'invite');
      if (!access) return;

      const memberResult = await server.pg.query<{ id: string; project_id: string; role: MemberRole }>(
        `SELECT id, project_id, role FROM project_members WHERE id = $1 LIMIT 1`,
        [memberId]
      );

      if (memberResult.rows.length === 0 || memberResult.rows[0].project_id !== projectId) {
        return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Member not found' } });
      }

      if (memberResult.rows[0].role === 'owner') {
        return reply.status(400).send({ success: false, error: { code: 'CANNOT_REMOVE_OWNER', message: 'Cannot remove project owner' } });
      }

      await server.pg.query(
        `UPDATE project_members SET status = 'removed', date_updated = NOW() WHERE id = $1`,
        [memberId]
      );

      return reply.send({ success: true, message: 'Member removed successfully' });
    }
  );

  // =====================================================
  // Invitations
  // =====================================================

  server.get(
    '/projects/:projectId/invitations',
    { preHandler: server.authenticate },
    async (request: FastifyRequest<{ Params: { projectId: string } }>, reply: FastifyReply) => {
      const { projectId } = request.params;
      const access = await requireProjectPermission(server, request as any, reply, projectId, 'invite');
      if (!access) return;

      const invitations = await server.pg.query(
        `
        SELECT *
        FROM project_invitations
        WHERE project_id = $1
        ORDER BY date_created DESC
      `,
        [projectId]
      );

      return reply.send({ success: true, data: invitations.rows });
    }
  );

  server.post(
    '/projects/:projectId/members/invite',
    { preHandler: server.authenticate },
    async (request: FastifyRequest<{ Params: { projectId: string }; Body: InviteMemberBody }>, reply: FastifyReply) => {
      const { projectId } = request.params;
      const userId = (request as any).user?.id as string | undefined;

      const access = await requireProjectPermission(server, request as any, reply, projectId, 'invite');
      if (!access) return;

      const role: Exclude<MemberRole, 'owner'> = request.body?.role || 'member';
      if (!['admin', 'member', 'viewer'].includes(role)) {
        return reply.status(400).send({ success: false, error: { code: 'INVALID_ROLE', message: 'Invalid role' } });
      }

      const email = normalizeEmail(request.body?.email || '');
      if (!email || !isValidEmail(email)) {
        return reply.status(400).send({ success: false, error: { code: 'INVALID_EMAIL', message: 'A valid email is required' } });
      }

      // Check if email already belongs to an active member
      const existingMember = await server.pg.query(
        `
        SELECT pm.id
        FROM project_members pm
        JOIN app_users au ON au.id = pm.user_id
        WHERE pm.project_id = $1 AND pm.status = 'active' AND LOWER(au.email) = $2
        LIMIT 1
      `,
        [projectId, email]
      );

      if (existingMember.rows.length > 0) {
        return reply.status(400).send({ success: false, error: { code: 'ALREADY_MEMBER', message: 'User is already a member of this project' } });
      }

      // Check for existing pending invitation
      const existingInvitation = await server.pg.query(
        `
        SELECT id
        FROM project_invitations
        WHERE project_id = $1 AND LOWER(email) = $2 AND status = 'pending'
        LIMIT 1
      `,
        [projectId, email]
      );

      if (existingInvitation.rows.length > 0) {
        return reply.status(400).send({ success: false, error: { code: 'INVITE_EXISTS', message: 'Invitation already sent to this email' } });
      }

      const defaults = defaultPermissionsForRole(role);
      const mergedPermissions = {
        ...defaults,
        ...(request.body.permissions || {}),
      };

      const token = randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      const invitationResult = await server.pg.query<{
        id: string;
        email: string;
        role: string;
        status: string;
        token: string;
        expires_at: string;
        date_created: string;
      }>(
        `
        INSERT INTO project_invitations (
          project_id,
          email,
          invited_by,
          role,
          permissions,
          status,
          token,
          expires_at
        )
        VALUES ($1, $2, $3, $4, $5::jsonb, 'pending', $6, $7)
        RETURNING id, email, role, status, token, expires_at, date_created
      `,
        [projectId, email, userId, role, JSON.stringify(mergedPermissions), token, expiresAt.toISOString()]
      );

      const invitation = invitationResult.rows[0];

      // Send invitation email (best effort)
      try {
        const projectResult = await server.pg.query<{ name: string; description: string | null }>(
          `SELECT name, description FROM projects WHERE id = $1 LIMIT 1`,
          [projectId]
        );

        const inviterEmail = (request as any).user?.email as string | undefined;
        const inviterDisplayName = (request as any).user?.display_name as string | null | undefined;
        const inviterName = inviterDisplayName || (inviterEmail ? inviterEmail.split('@')[0] : 'A teammate');

        const projectName = projectResult.rows[0]?.name || 'Untitled Project';
        const projectDescription = projectResult.rows[0]?.description || undefined;

        if (inviterEmail) {
          await sendTeamInvitationEmail(
            server,
            invitation.email,
            userId || '',
            inviterName,
            inviterEmail,
            projectId,
            projectName,
            projectDescription,
            role,
            invitation.token,
            new Date(invitation.expires_at)
          );
        }
      } catch (error) {
        request.log.error(error, 'Failed to send team invitation email');
      }

      return reply.send({
        success: true,
        message: 'Invitation sent successfully',
        data: invitation,
      });
    }
  );

  server.delete(
    '/projects/:projectId/invitations/:invitationId',
    { preHandler: server.authenticate },
    async (
      request: FastifyRequest<{ Params: { projectId: string; invitationId: string } }>,
      reply: FastifyReply
    ) => {
      const { projectId, invitationId } = request.params;
      const access = await requireProjectPermission(server, request as any, reply, projectId, 'invite');
      if (!access) return;

      const result = await server.pg.query(
        `DELETE FROM project_invitations WHERE id = $1 AND project_id = $2`,
        [invitationId, projectId]
      );

      if (result.rowCount === 0) {
        return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Invitation not found' } });
      }

      return reply.send({ success: true, message: 'Invitation cancelled successfully' });
    }
  );

  // Backwards-compatible route (deprecated): DELETE /api/v1/invitations/:invitationId
  server.delete(
    '/invitations/:invitationId',
    { preHandler: server.authenticate },
    async (request: FastifyRequest<{ Params: { invitationId: string } }>, reply: FastifyReply) => {
      const { invitationId } = request.params;
      const userId = (request as any).user?.id as string | undefined;
      if (!userId) {
        return reply.status(401).send({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
      }

      const inviteResult = await server.pg.query<{ id: string; project_id: string; invited_by: string }>(
        `SELECT id, project_id, invited_by FROM project_invitations WHERE id = $1 LIMIT 1`,
        [invitationId]
      );
      if (inviteResult.rows.length === 0) {
        return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Invitation not found' } });
      }

      const invitation = inviteResult.rows[0];
      const canCancelAsInviter = invitation.invited_by === userId;
      if (!canCancelAsInviter) {
        const access = await requireProjectPermission(server, request as any, reply, invitation.project_id, 'invite');
        if (!access) return;
      }

      await server.pg.query(`DELETE FROM project_invitations WHERE id = $1`, [invitationId]);
      return reply.send({ success: true, message: 'Invitation cancelled successfully' });
    }
  );

  // =====================================================
  // Invitation Acceptance & Public Lookup
  // =====================================================

  server.get(
    '/invitations/:token',
    async (request: FastifyRequest<{ Params: { token: string } }>, reply: FastifyReply) => {
      const { token } = request.params;

      const result = await server.pg.query<{
        id: string;
        project_id: string;
        email: string;
        invited_by: string;
        role: string;
        status: string;
        expires_at: string;
        token: string;
        project_name: string;
        project_description: string | null;
        inviter_email: string | null;
        inviter_display_name: string | null;
      }>(
        `
        SELECT
          i.*,
          p.name as project_name,
          p.description as project_description,
          au.email as inviter_email,
          au.display_name as inviter_display_name
        FROM project_invitations i
        JOIN projects p ON p.id = i.project_id
        LEFT JOIN app_users au ON au.id = i.invited_by
        WHERE i.token = $1
        LIMIT 1
      `,
        [token]
      );

      if (result.rows.length === 0) {
        return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Invitation not found' } });
      }

      const invitation = result.rows[0];

      if (invitation.status === 'accepted') {
        return reply.status(400).send({ success: false, error: { code: 'ALREADY_ACCEPTED', message: 'Invitation already accepted' } });
      }

      const isExpired = invitation.expires_at && new Date(invitation.expires_at) < new Date();
      if (isExpired) {
        if (invitation.status === 'pending') {
          await server.pg.query(`UPDATE project_invitations SET status = 'expired', date_updated = NOW() WHERE id = $1`, [invitation.id]);
        }
        return reply.status(400).send({ success: false, error: { code: 'EXPIRED', message: 'Invitation has expired' } });
      }

      if (invitation.status !== 'pending') {
        return reply.status(400).send({ success: false, error: { code: 'INVALID_STATUS', message: `Invitation is ${invitation.status}` } });
      }

      const inviterName = invitation.inviter_display_name
        || (invitation.inviter_email ? invitation.inviter_email.split('@')[0] : 'A teammate');

      return reply.send({
        success: true,
        data: {
          email: invitation.email,
          role: invitation.role,
          status: invitation.status,
          expires_at: invitation.expires_at,
          project: {
            id: invitation.project_id,
            name: invitation.project_name,
            description: invitation.project_description || undefined,
          },
          inviter: {
            name: inviterName,
            email: invitation.inviter_email,
          },
        },
      });
    }
  );

  server.post(
    '/invitations/:token/accept',
    { preHandler: server.authenticate },
    async (request: FastifyRequest<{ Params: { token: string } }>, reply: FastifyReply) => {
      const { token } = request.params;
      const userId = (request as any).user?.id as string | undefined;
      const userEmail = (request as any).user?.email as string | undefined;

      if (!userId || !userEmail) {
        return reply.status(401).send({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
      }

      const invitationResult = await server.pg.query<{
        id: string;
        project_id: string;
        email: string;
        role: Exclude<MemberRole, 'owner'>;
        permissions: unknown;
        status: string;
        expires_at: string;
      }>(
        `
        SELECT id, project_id, email, role, permissions, status, expires_at
        FROM project_invitations
        WHERE token = $1
        LIMIT 1
      `,
        [token]
      );

      if (invitationResult.rows.length === 0) {
        return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Invitation not found' } });
      }

      const invitation = invitationResult.rows[0];

      if (invitation.status !== 'pending') {
        return reply.status(400).send({ success: false, error: { code: 'INVALID_STATUS', message: `Invitation is ${invitation.status}` } });
      }

      const isExpired = invitation.expires_at && new Date(invitation.expires_at) < new Date();
      if (isExpired) {
        await server.pg.query(`UPDATE project_invitations SET status = 'expired', date_updated = NOW() WHERE id = $1`, [invitation.id]);
        return reply.status(400).send({ success: false, error: { code: 'EXPIRED', message: 'Invitation has expired' } });
      }

      if (normalizeEmail(invitation.email) !== normalizeEmail(userEmail)) {
        return reply.status(403).send({ success: false, error: { code: 'EMAIL_MISMATCH', message: 'This invitation was sent to a different email address' } });
      }

      // Ensure user isn't already an active member
      const existingMember = await server.pg.query<{ id: string; status: string }>(
        `SELECT id, status FROM project_members WHERE project_id = $1 AND user_id = $2 LIMIT 1`,
        [invitation.project_id, userId]
      );

      if (existingMember.rows.length > 0 && existingMember.rows[0].status === 'active') {
        return reply.status(400).send({ success: false, error: { code: 'ALREADY_MEMBER', message: 'You are already a member of this project' } });
      }

      const permissions = parsePermissions(invitation.permissions);

      if (existingMember.rows.length > 0) {
        await server.pg.query(
          `
          UPDATE project_members
          SET role = $1, permissions = $2::jsonb, status = 'active', date_updated = NOW()
          WHERE id = $3
        `,
          [invitation.role, JSON.stringify(permissions), existingMember.rows[0].id]
        );
      } else {
        await server.pg.query(
          `
          INSERT INTO project_members (project_id, user_id, role, permissions, status)
          VALUES ($1, $2, $3, $4::jsonb, 'active')
        `,
          [invitation.project_id, userId, invitation.role, JSON.stringify(permissions)]
        );
      }

      await server.pg.query(
        `
        UPDATE project_invitations
        SET status = 'accepted', accepted_at = NOW(), date_updated = NOW()
        WHERE id = $1
      `,
        [invitation.id]
      );

      return reply.send({
        success: true,
        message: 'Invitation accepted successfully',
        data: { project_id: invitation.project_id, role: invitation.role },
      });
    }
  );

  // =====================================================
  // Team Member Profile
  // =====================================================

  server.patch(
    '/projects/:projectId/members/:memberId/profile',
    { preHandler: server.authenticate },
    async (
      request: FastifyRequest<{ Params: { projectId: string; memberId: string }; Body: UpdateProfileBody }>,
      reply: FastifyReply
    ) => {
      const { projectId, memberId } = request.params;
      const updates = request.body || {};
      const userId = (request as any).user?.id as string | undefined;

      if (!userId) {
        return reply.status(401).send({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication required' } });
      }

      const memberResult = await server.pg.query<{ id: string; project_id: string; user_id: string; profile: unknown }>(
        `SELECT id, project_id, user_id, profile FROM project_members WHERE id = $1 LIMIT 1`,
        [memberId]
      );

      if (memberResult.rows.length === 0 || memberResult.rows[0].project_id !== projectId) {
        return reply.status(404).send({ success: false, error: { code: 'NOT_FOUND', message: 'Member not found' } });
      }

      const member = memberResult.rows[0];
      const isOwnProfile = member.user_id === userId;

      if (!isOwnProfile) {
        const access = await requireProjectPermission(server, request as any, reply, projectId, 'invite');
        if (!access) return;
      }

      const currentProfile = member.profile && typeof member.profile === 'object' ? (member.profile as Record<string, unknown>) : {};
      const nextProfile: Record<string, unknown> = { ...currentProfile };

      if (updates.roleTitle !== undefined) nextProfile.role_title = updates.roleTitle;
      if (updates.skills !== undefined) nextProfile.skills = updates.skills;
      if (updates.expertiseAreas !== undefined) nextProfile.expertise_areas = updates.expertiseAreas;
      if (updates.availability !== undefined) nextProfile.availability = updates.availability;
      if (updates.capacityPercent !== undefined) nextProfile.capacity_percent = Math.max(0, Math.min(100, updates.capacityPercent));
      if (updates.preferredTaskTypes !== undefined) nextProfile.preferred_task_types = updates.preferredTaskTypes;
      if (updates.bio !== undefined) nextProfile.bio = updates.bio;

      await server.pg.query(
        `UPDATE project_members SET profile = $1::jsonb, date_updated = NOW() WHERE id = $2`,
        [JSON.stringify(nextProfile), memberId]
      );

      return reply.send({
        success: true,
        message: 'Profile updated successfully',
        data: { memberId, profile: normalizeProfile(nextProfile) },
      });
    }
  );

  // =====================================================
  // Team Context + Assignee Suggestions (used by agents/copilot)
  // =====================================================

  server.get(
    '/projects/:projectId/team-context',
    { preHandler: server.authenticate },
    async (request: FastifyRequest<{ Params: { projectId: string } }>, reply: FastifyReply) => {
      const { projectId } = request.params;
      const access = await requireProjectPermission(server, request as any, reply, projectId, 'view');
      if (!access) return;

      const members = await server.pg.query<{
        id: string;
        user_id: string;
        role: MemberRole;
        profile: unknown;
        email: string;
        display_name: string | null;
      }>(
        `
        SELECT pm.id, pm.user_id, pm.role, pm.profile, au.email, au.display_name
        FROM project_members pm
        JOIN app_users au ON au.id = pm.user_id
        WHERE pm.project_id = $1 AND pm.status = 'active'
      `,
        [projectId]
      );

      return reply.send({
        success: true,
        data: {
          projectId,
          members: members.rows.map((m) => ({
            id: m.id,
            userId: m.user_id,
            displayName: m.display_name || m.email.split('@')[0],
            role: m.role,
            profile: normalizeProfile(m.profile),
          })),
        },
      });
    }
  );

  server.post(
    '/projects/:projectId/suggest-assignee',
    { preHandler: server.authenticate },
    async (
      request: FastifyRequest<{ Params: { projectId: string }; Body: SuggestAssigneeBody }>,
      reply: FastifyReply
    ) => {
      const { projectId } = request.params;
      const access = await requireProjectPermission(server, request as any, reply, projectId, 'view');
      if (!access) return;

      const { requiredSkills, taskType } = request.body || {};

      const members = await server.pg.query<{
        id: string;
        user_id: string;
        role: MemberRole;
        profile: unknown;
        email: string;
        display_name: string | null;
      }>(
        `
        SELECT pm.id, pm.user_id, pm.role, pm.profile, au.email, au.display_name
        FROM project_members pm
        JOIN app_users au ON au.id = pm.user_id
        WHERE pm.project_id = $1 AND pm.status = 'active'
      `,
        [projectId]
      );

      const suggestions = members.rows
        .map((member) => {
          const profile = normalizeProfile(member.profile);
          const memberSkills = Array.isArray(profile.skills) ? (profile.skills as string[]) : [];
          const memberTaskTypes = Array.isArray(profile.preferredTaskTypes)
            ? (profile.preferredTaskTypes as string[])
            : Array.isArray(profile.preferred_task_types)
              ? (profile.preferred_task_types as string[])
              : [];
          const availability = typeof profile.availability === 'string' ? (profile.availability as string) : 'available';
          const capacity = typeof profile.capacityPercent === 'number' ? (profile.capacityPercent as number) : 100;

          let skillScore = 0;
          const matchReasons: string[] = [];

          if (requiredSkills && requiredSkills.length > 0) {
            const matchedSkills = requiredSkills.filter((s: string) =>
              memberSkills.some((ms: string) => ms.toLowerCase() === s.toLowerCase())
            );
            skillScore = Math.min(40, matchedSkills.length * 10);
            if (matchedSkills.length > 0) matchReasons.push(`Has skills: ${matchedSkills.join(', ')}`);
          } else {
            skillScore = 20;
          }

          let availabilityScore = 0;
          if (availability === 'available') {
            availabilityScore = 25;
            matchReasons.push('Currently available');
          } else if (availability === 'busy') {
            availabilityScore = 10;
            matchReasons.push('Busy but reachable');
          }

          let capacityScore = 0;
          if (capacity <= 50) {
            capacityScore = 25;
            matchReasons.push(`Has capacity (${capacity}%)`);
          } else if (capacity <= 80) {
            capacityScore = 15;
          } else {
            capacityScore = 5;
          }

          let taskTypeScore = 0;
          if (taskType && memberTaskTypes.some((t) => t.toLowerCase() === taskType.toLowerCase())) {
            taskTypeScore = 10;
            matchReasons.push('Prefers this task type');
          } else {
            taskTypeScore = 5;
          }

          const totalScore = skillScore + availabilityScore + capacityScore + taskTypeScore;
          return {
            memberId: member.id,
            userId: member.user_id,
            displayName: member.display_name || member.email.split('@')[0],
            matchScore: totalScore,
            matchReasons,
          };
        })
        .filter((m) => m.matchScore > 0)
        .sort((a, b) => b.matchScore - a.matchScore)
        .slice(0, 3);

      return reply.send({
        success: true,
        data: {
          suggestions,
          query: { requiredSkills, taskType },
        },
      });
    }
  );
}
