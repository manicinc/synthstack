/**
 * GitHub Organization Service
 *
 * Manages GitHub organization invitations for lifetime license buyers.
 * Handles user validation, organization invitations, and access control.
 */

import { Octokit } from '@octokit/rest';
import type { FastifyInstance } from 'fastify';

export class GitHubOrgService {
  private octokit: Octokit;
  private orgName: string;
  private teamSlug: string;

  constructor(private fastify: FastifyInstance) {
    const pat = process.env.GH_PAT;
    if (!pat) {
      throw new Error('GH_PAT environment variable is required');
    }

    this.octokit = new Octokit({ auth: pat });
    this.orgName = process.env.GITHUB_ORG_NAME || 'manicinc';
    this.teamSlug = process.env.GITHUB_TEAM_SLUG || 'synthstack-pro';
  }

  /**
   * Validate that a GitHub username exists
   */
  async validateUsername(username: string): Promise<{ valid: boolean; error?: string }> {
    try {
      await this.octokit.users.getByUsername({ username });
      return { valid: true };
    } catch (error: any) {
      if (error.status === 404) {
        return { valid: false, error: 'GitHub username not found' };
      }
      this.fastify.log.error({ error }, 'Error validating GitHub username');
      return { valid: false, error: 'Failed to validate username' };
    }
  }

  /**
   * Invite user to organization and add to team
   */
  async inviteToOrganization(username: string, email: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Get user ID
      const userId = await this.getUserId(username);

      // Get team ID
      const teamId = await this.getTeamId();

      // Invite to organization with team membership
      await this.octokit.orgs.createInvitation({
        org: this.orgName,
        invitee_id: userId,
        role: 'direct_member', // Regular member, not admin
        team_ids: [teamId],
      });

      this.fastify.log.info({ username, org: this.orgName, team: this.teamSlug }, 'Invited user to organization');
      return { success: true };
    } catch (error: any) {
      this.fastify.log.error({ error, username }, 'Error inviting user to organization');
      return { success: false, error: error.message };
    }
  }

  /**
   * Check if user has accepted invitation
   */
  async checkMembershipStatus(username: string): Promise<'active' | 'pending' | 'none'> {
    try {
      // Check if user is a member
      await this.octokit.orgs.checkMembershipForUser({
        org: this.orgName,
        username,
      });

      return 'active';
    } catch (error: any) {
      if (error.status === 404) {
        // Check if invitation is pending
        const invitations = await this.octokit.orgs.listPendingInvitations({
          org: this.orgName,
        });

        const hasPendingInvite = invitations.data.some(
          (inv) => inv.login?.toLowerCase() === username.toLowerCase()
        );

        return hasPendingInvite ? 'pending' : 'none';
      }

      throw error;
    }
  }

  /**
   * Revoke access (remove from org)
   */
  async revokeAccess(username: string): Promise<{ success: boolean; error?: string }> {
    try {
      await this.octokit.orgs.removeMembershipForUser({
        org: this.orgName,
        username,
      });

      this.fastify.log.info({ username }, 'Revoked organization access');
      return { success: true };
    } catch (error: any) {
      this.fastify.log.error({ error, username }, 'Error revoking access');
      return { success: false, error: error.message };
    }
  }

  /**
   * Get user ID from username
   */
  private async getUserId(username: string): Promise<number> {
    const { data } = await this.octokit.users.getByUsername({ username });
    return data.id;
  }

  /**
   * Get team ID from team slug
   */
  private async getTeamId(): Promise<number> {
    const { data } = await this.octokit.teams.getByName({
      org: this.orgName,
      team_slug: this.teamSlug,
    });
    return data.id;
  }
}
