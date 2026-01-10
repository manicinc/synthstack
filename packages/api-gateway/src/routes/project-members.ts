import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { directus } from '../services/directus.js';
import { randomBytes } from 'crypto';
import { sendTeamInvitationEmail } from '../services/email/helpers.js';

interface InviteMemberBody {
  email: string;
  role?: 'member' | 'admin' | 'viewer';
  permissions?: {
    can_edit?: boolean;
    can_delete?: boolean;
    can_invite?: boolean;
  };
}

interface AcceptInvitationBody {
  token: string;
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

export default async function projectMembersRoutes(server: FastifyInstance) {
  // Get project members
  server.get(
    '/projects/:projectId/members',
    { preHandler: server.authenticate },
    async (
      request: FastifyRequest<{ Params: { projectId: string } }>,
      reply: FastifyReply
    ) => {
      try {
        const { projectId } = request.params;
        const userId = (request as any).user?.id;

        if (!userId) {
          return reply.status(401).send({ error: 'Unauthorized' });
        }

        // Verify user has access to this project
        const project = await directus.items('projects').readOne(projectId);
        if (!project) {
          return reply.status(404).send({ error: 'Project not found' });
        }

        // Check if user is owner or member
        const isMember = await directus.items('project_members').readByQuery({
          filter: {
            project_id: { _eq: projectId },
            user_id: { _eq: userId },
            status: { _eq: 'active' },
          },
          limit: 1,
        });

        if (project.owner_id !== userId && (!isMember.data || isMember.data.length === 0)) {
          return reply.status(403).send({ error: 'Access denied' });
        }

        // Get all members
        const members = await directus.items('project_members').readByQuery({
          filter: {
            project_id: { _eq: projectId },
            status: { _eq: 'active' },
          },
        } as any);

        return reply.send({
          success: true,
          data: members.data || [],
        });
      } catch (error) {
        request.log.error(error, 'Error fetching project members');
        return reply.status(500).send({ error: 'Failed to fetch project members' });
      }
    }
  );

  // Invite member to project
  server.post(
    '/projects/:projectId/members/invite',
    { preHandler: server.authenticate },
    async (
      request: FastifyRequest<{ Params: { projectId: string }; Body: InviteMemberBody }>,
      reply: FastifyReply
    ) => {
      try {
        const { projectId } = request.params;
        const { email, role = 'member', permissions } = request.body;
        const userId = (request as any).user?.id;

        if (!userId) {
          return reply.status(401).send({ error: 'Unauthorized' });
        }

        if (!email) {
          return reply.status(400).send({ error: 'Email is required' });
        }

        // Verify user is owner of this project
        const project = await directus.items('projects').readOne(projectId);
        if (!project || project.owner_id !== userId) {
          return reply.status(403).send({ error: 'Only project owner can invite members' });
        }

        // Check if user is already a member
        const existingMember = await directus.items('project_members').readByQuery({
          filter: {
            project_id: { _eq: projectId },
            user_id: {
              email: { _eq: email },
            },
          },
          limit: 1,
        });

        if (existingMember.data && existingMember.data.length > 0) {
          return reply.status(400).send({ error: 'User is already a member of this project' });
        }

        // Check for existing pending invitation
        const existingInvitation = await directus.items('project_invitations').readByQuery({
          filter: {
            project_id: { _eq: projectId },
            email: { _eq: email },
            status: { _eq: 'pending' },
          },
          limit: 1,
        });

        if (existingInvitation.data && existingInvitation.data.length > 0) {
          return reply.status(400).send({ error: 'Invitation already sent to this email' });
        }

        // Generate unique invitation token
        const token = randomBytes(32).toString('hex');

        // Create invitation
        const defaultPermissions = {
          can_edit: permissions?.can_edit ?? true,
          can_delete: permissions?.can_delete ?? false,
          can_invite: permissions?.can_invite ?? false,
        };

        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

        const invitation = await directus.items('project_invitations').createOne({
          project_id: projectId,
          email,
          invited_by: userId,
          role,
          permissions: defaultPermissions,
          status: 'pending',
          token,
          expires_at: expiresAt,
        });

        // Send invitation email
        try {
          // Get inviter user details
          const inviterUser = await (directus as any).users.readOne(userId);
          const inviterName = inviterUser.first_name && inviterUser.last_name
            ? `${inviterUser.first_name} ${inviterUser.last_name}`
            : inviterUser.email;
          const inviterEmail = inviterUser.email;

          await sendTeamInvitationEmail(
            server,
            email,
            userId,
            inviterName,
            inviterEmail,
            projectId,
            project.name || 'Untitled Project',
            project.description,
            role,
            token,
            expiresAt
          );

          request.log.info({ invitationId: invitation.id, email }, 'Team invitation email sent successfully');
        } catch (emailError) {
          // Log email error but don't fail the invitation
          request.log.error(emailError, 'Failed to send team invitation email');
          // Invitation is still created, user can get link from UI
        }

        return reply.send({
          success: true,
          message: 'Invitation sent successfully',
          data: {
            id: invitation.id,
            email: invitation.email,
            role: invitation.role,
            expires_at: invitation.expires_at,
            // Include token in development only
            ...(process.env.NODE_ENV === 'development' && { token }),
          },
        });
      } catch (error) {
        request.log.error(error, 'Error inviting member');
        return reply.status(500).send({ error: 'Failed to invite member' });
      }
    }
  );

  // Get project invitations
  server.get(
    '/projects/:projectId/invitations',
    { preHandler: server.authenticate },
    async (
      request: FastifyRequest<{ Params: { projectId: string } }>,
      reply: FastifyReply
    ) => {
      try {
        const { projectId } = request.params;
        const userId = (request as any).user?.id;

        if (!userId) {
          return reply.status(401).send({ error: 'Unauthorized' });
        }

        // Verify user is owner of this project
        const project = await directus.items('projects').readOne(projectId);
        if (!project || project.owner_id !== userId) {
          return reply.status(403).send({ error: 'Only project owner can view invitations' });
        }

        // Get pending invitations
        const invitations = await directus.items('project_invitations').readByQuery({
          filter: {
            project_id: { _eq: projectId },
            status: { _in: ['pending', 'accepted', 'declined'] },
          },
          sort: ['-date_created'],
        });

        return reply.send({
          success: true,
          data: invitations.data || [],
        });
      } catch (error) {
        request.log.error(error, 'Error fetching invitations');
        return reply.status(500).send({ error: 'Failed to fetch invitations' });
      }
    }
  );

  // Accept invitation
  server.post(
    '/invitations/:token/accept',
    { preHandler: server.authenticate },
    async (
      request: FastifyRequest<{ Params: { token: string } }>,
      reply: FastifyReply
    ) => {
      try {
        const { token } = request.params;
        const userId = (request as any).user?.id;
        const userEmail = (request as any).user?.email;

        if (!userId || !userEmail) {
          return reply.status(401).send({ error: 'Unauthorized' });
        }

        // Find invitation
        const invitations = await directus.items('project_invitations').readByQuery({
          filter: {
            token: { _eq: token },
            status: { _eq: 'pending' },
          },
          limit: 1,
        });

        if (!invitations.data || invitations.data.length === 0) {
          return reply.status(404).send({ error: 'Invitation not found or already used' });
        }

        const invitation = invitations.data[0];

        // Verify invitation is for this user's email
        if (invitation.email !== userEmail) {
          return reply.status(403).send({ error: 'This invitation was sent to a different email address' });
        }

        // Check if invitation is expired
        if (new Date(invitation.expires_at) < new Date()) {
          await directus.items('project_invitations').updateOne(invitation.id, {
            status: 'expired',
          });
          return reply.status(400).send({ error: 'Invitation has expired' });
        }

        // Check if user is already a member
        const existingMember = await directus.items('project_members').readByQuery({
          filter: {
            project_id: { _eq: invitation.project_id },
            user_id: { _eq: userId },
          },
          limit: 1,
        });

        if (existingMember.data && existingMember.data.length > 0) {
          return reply.status(400).send({ error: 'You are already a member of this project' });
        }

        // Add user as project member
        await directus.items('project_members').createOne({
          project_id: invitation.project_id,
          user_id: userId,
          role: invitation.role,
          permissions: invitation.permissions,
          status: 'active',
        });

        // Update invitation status
        await directus.items('project_invitations').updateOne(invitation.id, {
          status: 'accepted',
          accepted_at: new Date(),
        });

        return reply.send({
          success: true,
          message: 'Invitation accepted successfully',
          data: {
            project_id: invitation.project_id,
            role: invitation.role,
          },
        });
      } catch (error) {
        request.log.error(error, 'Error accepting invitation');
        return reply.status(500).send({ error: 'Failed to accept invitation' });
      }
    }
  );

  // Cancel invitation
  server.delete(
    '/invitations/:invitationId',
    { preHandler: server.authenticate },
    async (
      request: FastifyRequest<{ Params: { invitationId: string } }>,
      reply: FastifyReply
    ) => {
      try {
        const { invitationId } = request.params;
        const userId = (request as any).user?.id;

        if (!userId) {
          return reply.status(401).send({ error: 'Unauthorized' });
        }

        // Get invitation
        const invitation = await directus.items('project_invitations').readOne(invitationId);
        if (!invitation) {
          return reply.status(404).send({ error: 'Invitation not found' });
        }

        // Verify user is the one who sent the invitation
        if (invitation.invited_by !== userId) {
          return reply.status(403).send({ error: 'You can only cancel invitations you sent' });
        }

        // Delete invitation
        await directus.items('project_invitations').deleteOne(invitationId);

        return reply.send({
          success: true,
          message: 'Invitation cancelled successfully',
        });
      } catch (error) {
        request.log.error(error, 'Error cancelling invitation');
        return reply.status(500).send({ error: 'Failed to cancel invitation' });
      }
    }
  );

  // Remove member from project
  server.delete(
    '/projects/:projectId/members/:memberId',
    { preHandler: server.authenticate },
    async (
      request: FastifyRequest<{ Params: { projectId: string; memberId: string } }>,
      reply: FastifyReply
    ) => {
      try {
        const { projectId, memberId } = request.params;
        const userId = (request as any).user?.id;

        if (!userId) {
          return reply.status(401).send({ error: 'Unauthorized' });
        }

        // Verify user is owner of this project
        const project = await directus.items('projects').readOne(projectId);
        if (!project || project.owner_id !== userId) {
          return reply.status(403).send({ error: 'Only project owner can remove members' });
        }

        // Get member
        const member = await directus.items('project_members').readOne(memberId);
        if (!member || member.project_id !== projectId) {
          return reply.status(404).send({ error: 'Member not found' });
        }

        // Cannot remove owner
        if (member.role === 'owner') {
          return reply.status(400).send({ error: 'Cannot remove project owner' });
        }

        // Update member status to removed
        await directus.items('project_members').updateOne(memberId, {
          status: 'removed',
        });

        return reply.send({
          success: true,
          message: 'Member removed successfully',
        });
      } catch (error) {
        request.log.error(error, 'Error removing member');
        return reply.status(500).send({ error: 'Failed to remove member' });
      }
    }
  );

  // Get invitation details (public route - no auth required)
  server.get(
    '/invitations/:token',
    async (
      request: FastifyRequest<{ Params: { token: string } }>,
      reply: FastifyReply
    ) => {
      try {
        const { token } = request.params;

        // Find invitation
        const invitations = await directus.items('project_invitations').readByQuery({
          filter: {
            token: { _eq: token },
          },
          limit: 1,
        });

        if (!invitations.data || invitations.data.length === 0) {
          return reply.status(404).send({ error: 'Invitation not found' });
        }

        const invitation = invitations.data[0];

        // Check if already accepted
        if (invitation.status === 'accepted') {
          return reply.status(400).send({
            error: 'Invitation already accepted',
            status: 'accepted'
          });
        }

        // Check if expired
        if (new Date(invitation.expires_at) < new Date()) {
          // Update status to expired if not already
          if (invitation.status === 'pending') {
            await directus.items('project_invitations').updateOne(invitation.id, {
              status: 'expired',
            });
          }
          return reply.status(400).send({
            error: 'Invitation has expired',
            status: 'expired'
          });
        }

        // Check if cancelled
        if (invitation.status === 'cancelled') {
          return reply.status(400).send({
            error: 'Invitation has been cancelled',
            status: 'cancelled'
          });
        }

        // Get project details
        const project = await directus.items('projects').readOne(invitation.project_id);

        // Get inviter details
        const inviter = await (directus as any).users.readOne(invitation.invited_by);
        const inviterName = inviter.first_name && inviter.last_name
          ? `${inviter.first_name} ${inviter.last_name}`
          : inviter.email;

        // Return invitation details (safe for public consumption)
        return reply.send({
          success: true,
          data: {
            email: invitation.email,
            role: invitation.role,
            status: invitation.status,
            expires_at: invitation.expires_at,
            project: {
              id: invitation.project_id,
              name: project?.name || 'Untitled Project',
              description: project?.description,
            },
            inviter: {
              name: inviterName,
              email: inviter.email,
            },
          },
        });
      } catch (error) {
        request.log.error(error, 'Error fetching invitation details');
        return reply.status(500).send({ error: 'Failed to fetch invitation details' });
      }
    }
  );

  // ============================================
  // Team Member Profile Endpoints
  // ============================================

  /**
   * Update member profile (skills, availability, etc.)
   * Members can update their own profile, admins/owners can update any member's profile
   */
  server.patch(
    '/projects/:projectId/members/:memberId/profile',
    { preHandler: server.authenticate },
    async (
      request: FastifyRequest<{
        Params: { projectId: string; memberId: string };
        Body: UpdateProfileBody;
      }>,
      reply: FastifyReply
    ) => {
      try {
        const { projectId, memberId } = request.params;
        const updates = request.body;
        const userId = (request as any).user?.id;

        if (!userId) {
          return reply.status(401).send({ error: 'Unauthorized' });
        }

        // Get the member being updated
        const member = await directus.items('project_members').readOne(memberId);
        if (!member || member.project_id !== projectId) {
          return reply.status(404).send({ error: 'Member not found' });
        }

        // Check permissions: user can update their own profile OR be admin/owner
        const isOwnProfile = member.user_id === userId;
        if (!isOwnProfile) {
          // Check if requester is admin/owner
          const requesterMember = await directus.items('project_members').readByQuery({
            filter: {
              project_id: { _eq: projectId },
              user_id: { _eq: userId },
              role: { _in: ['owner', 'admin'] },
              status: { _eq: 'active' },
            },
            limit: 1,
          });

          if (!requesterMember.data || requesterMember.data.length === 0) {
            return reply.status(403).send({ error: 'You can only update your own profile' });
          }
        }

        // Build profile update
        const currentProfile = member.profile || {};
        const newProfile = {
          ...currentProfile,
          ...(updates.roleTitle !== undefined && { role_title: updates.roleTitle }),
          ...(updates.skills !== undefined && { skills: updates.skills }),
          ...(updates.expertiseAreas !== undefined && { expertise_areas: updates.expertiseAreas }),
          ...(updates.availability !== undefined && { availability: updates.availability }),
          ...(updates.capacityPercent !== undefined && {
            capacity_percent: Math.max(0, Math.min(100, updates.capacityPercent)),
          }),
          ...(updates.preferredTaskTypes !== undefined && { preferred_task_types: updates.preferredTaskTypes }),
          ...(updates.bio !== undefined && { bio: updates.bio }),
        };

        // Update the profile
        await directus.items('project_members').updateOne(memberId, {
          profile: newProfile,
        });

        return reply.send({
          success: true,
          message: 'Profile updated successfully',
          data: {
            memberId,
            profile: newProfile,
          },
        });
      } catch (error) {
        request.log.error(error, 'Error updating member profile');
        return reply.status(500).send({ error: 'Failed to update profile' });
      }
    }
  );

  /**
   * Get team context for AI agents
   * Returns simplified team data with profiles for AI prompt injection
   */
  server.get(
    '/projects/:projectId/team-context',
    { preHandler: server.authenticate },
    async (
      request: FastifyRequest<{ Params: { projectId: string } }>,
      reply: FastifyReply
    ) => {
      try {
        const { projectId } = request.params;
        const userId = (request as any).user?.id;

        if (!userId) {
          return reply.status(401).send({ error: 'Unauthorized' });
        }

        // Verify user has access to this project
        const project = await directus.items('projects').readOne(projectId);
        if (!project) {
          return reply.status(404).send({ error: 'Project not found' });
        }

        // Check if user is owner or member
        const isMember = await directus.items('project_members').readByQuery({
          filter: {
            project_id: { _eq: projectId },
            user_id: { _eq: userId },
            status: { _eq: 'active' },
          },
          limit: 1,
        });

        if (project.owner_id !== userId && (!isMember.data || isMember.data.length === 0)) {
          return reply.status(403).send({ error: 'Access denied' });
        }

        // Get all active members with user info
        const members = await directus.items('project_members').readByQuery({
          filter: {
            project_id: { _eq: projectId },
            status: { _eq: 'active' },
          },
          fields: ['id', 'user_id', 'role', 'profile'],
        } as any);

        // Enrich with user display info
        const enrichedMembers = await Promise.all(
          (members.data || []).map(async (member: any) => {
            try {
              const user = await (directus as any).users.readOne(member.user_id);
              const displayName = user.first_name && user.last_name
                ? `${user.first_name} ${user.last_name}`
                : user.email?.split('@')[0] || 'Unknown';

              const profile = member.profile || {};

              return {
                id: member.id,
                userId: member.user_id,
                displayName,
                role: member.role,
                profile: {
                  roleTitle: profile.role_title || member.role,
                  skills: profile.skills || [],
                  expertiseAreas: profile.expertise_areas || [],
                  availability: profile.availability || 'available',
                  capacityPercent: profile.capacity_percent ?? 100,
                  preferredTaskTypes: profile.preferred_task_types || [],
                  bio: profile.bio || null,
                },
              };
            } catch {
              return null;
            }
          })
        );

        return reply.send({
          success: true,
          data: {
            projectId,
            members: enrichedMembers.filter(Boolean),
          },
        });
      } catch (error) {
        request.log.error(error, 'Error fetching team context');
        return reply.status(500).send({ error: 'Failed to fetch team context' });
      }
    }
  );

  /**
   * Suggest best assignee for a task based on skills and availability
   */
  server.post(
    '/projects/:projectId/suggest-assignee',
    { preHandler: server.authenticate },
    async (
      request: FastifyRequest<{
        Params: { projectId: string };
        Body: SuggestAssigneeBody;
      }>,
      reply: FastifyReply
    ) => {
      try {
        const { projectId } = request.params;
        const { taskDescription, requiredSkills, taskType } = request.body;
        const userId = (request as any).user?.id;

        if (!userId) {
          return reply.status(401).send({ error: 'Unauthorized' });
        }

        // Verify user has access to this project
        const project = await directus.items('projects').readOne(projectId);
        if (!project) {
          return reply.status(404).send({ error: 'Project not found' });
        }

        // Check if user is owner or member
        const isMember = await directus.items('project_members').readByQuery({
          filter: {
            project_id: { _eq: projectId },
            user_id: { _eq: userId },
            status: { _eq: 'active' },
          },
          limit: 1,
        });

        if (project.owner_id !== userId && (!isMember.data || isMember.data.length === 0)) {
          return reply.status(403).send({ error: 'Access denied' });
        }

        // Get all active members
        const members = await directus.items('project_members').readByQuery({
          filter: {
            project_id: { _eq: projectId },
            status: { _eq: 'active' },
          },
        } as any);

        // Score each member
        const scoredMembers = await Promise.all(
          (members.data || []).map(async (member: any) => {
            try {
              const user = await (directus as any).users.readOne(member.user_id);
              const displayName = user.first_name && user.last_name
                ? `${user.first_name} ${user.last_name}`
                : user.email?.split('@')[0] || 'Unknown';

              const profile = member.profile || {};
              const memberSkills = profile.skills || [];
              const memberTaskTypes = profile.preferred_task_types || [];
              const availability = profile.availability || 'available';
              const capacity = profile.capacity_percent ?? 100;

              // Calculate scores
              let skillScore = 0;
              const matchReasons: string[] = [];

              // Skill matching (40 points max)
              if (requiredSkills && requiredSkills.length > 0) {
                const matchedSkills = requiredSkills.filter((s: string) =>
                  memberSkills.some((ms: string) => ms.toLowerCase() === s.toLowerCase())
                );
                skillScore = Math.min(40, matchedSkills.length * 10);
                if (matchedSkills.length > 0) {
                  matchReasons.push(`Has skills: ${matchedSkills.join(', ')}`);
                }
              } else {
                skillScore = 20; // Neutral if no skills required
              }

              // Availability score (25 points max)
              let availabilityScore = 0;
              if (availability === 'available') {
                availabilityScore = 25;
                matchReasons.push('Currently available');
              } else if (availability === 'busy') {
                availabilityScore = 10;
                matchReasons.push('Busy but reachable');
              }

              // Capacity score (25 points max)
              let capacityScore = 0;
              if (capacity <= 50) {
                capacityScore = 25;
                matchReasons.push(`Has capacity (${capacity}%)`);
              } else if (capacity <= 80) {
                capacityScore = 15;
              } else {
                capacityScore = 5;
              }

              // Task type score (10 points max)
              let taskTypeScore = 0;
              if (taskType && memberTaskTypes.some((t: string) => t.toLowerCase() === taskType.toLowerCase())) {
                taskTypeScore = 10;
                matchReasons.push('Prefers this task type');
              } else {
                taskTypeScore = 5;
              }

              const totalScore = skillScore + availabilityScore + capacityScore + taskTypeScore;

              return {
                memberId: member.id,
                userId: member.user_id,
                displayName,
                matchScore: totalScore,
                matchReasons,
              };
            } catch {
              return null;
            }
          })
        );

        // Filter and sort by score
        const suggestions = scoredMembers
          .filter((m): m is NonNullable<typeof m> => m !== null && m.matchScore > 0)
          .sort((a, b) => b.matchScore - a.matchScore)
          .slice(0, 3);

        return reply.send({
          success: true,
          data: {
            suggestions,
            query: { taskDescription, requiredSkills, taskType },
          },
        });
      } catch (error) {
        request.log.error(error, 'Error suggesting assignee');
        return reply.status(500).send({ error: 'Failed to suggest assignee' });
      }
    }
  );
}
