/**
 * GitHub Integration Service - Community Edition Stub
 *
 * Full GitHub integration (PR creation, sync, etc.) is a PRO feature.
 * This stub provides the interface for build compatibility.
 */

import type { FastifyInstance } from 'fastify';

// ============================================
// Types (same as PRO for interface compatibility)
// ============================================

export interface GitHubIntegration {
  id: string;
  userId: string;
  githubUsername: string;
  accessibleRepos: string[];
  defaultRepo: string | null;
  defaultBranch: string;
  permissions: {
    canCreatePr: boolean;
    canCreateIssues: boolean;
    canComment: boolean;
    canReadCode: boolean;
    canAnalyzeRepo: boolean;
  };
  isActive: boolean;
  lastVerifiedAt: string | null;
  verificationError: string | null;
}

// ============================================
// Stub Functions
// ============================================

/**
 * Decrypt a PAT - stub for community edition
 */
export function decryptPAT(_encryptedPat: string): string {
  throw new Error('GitHub PAT decryption is not available in Community Edition. Upgrade to PRO at https://synthstack.app/pricing');
}

/**
 * Encrypt a PAT - stub for community edition
 */
export function encryptPAT(_pat: string): string {
  throw new Error('GitHub PAT encryption is not available in Community Edition. Upgrade to PRO at https://synthstack.app/pricing');
}

// ============================================
// Stub Service Class
// ============================================

export class GitHubService {
  constructor(_server: FastifyInstance) {
    // No-op constructor for community edition
  }

  /**
   * Sync project with GitHub - stub
   */
  async syncProjectGitHub(_projectId: string, _userId: string, _repo: string): Promise<void> {
    throw new Error('GitHub sync is not available in Community Edition. Upgrade to PRO at https://synthstack.app/pricing');
  }

  /**
   * Validate a GitHub PAT - stub
   */
  async validatePAT(_pat: string): Promise<{ valid: boolean; error?: string }> {
    throw new Error('GitHub PAT validation is not available in Community Edition. Upgrade to PRO at https://synthstack.app/pricing');
  }

  /**
   * Get user's GitHub integration - stub
   */
  async getIntegration(_userId: string): Promise<GitHubIntegration | null> {
    return null;
  }

  /**
   * Create or update GitHub integration - stub
   */
  async saveIntegration(_userId: string, _pat: string, _options?: Record<string, unknown>): Promise<GitHubIntegration> {
    throw new Error('GitHub integration is not available in Community Edition. Upgrade to PRO at https://synthstack.app/pricing');
  }

  /**
   * Delete GitHub integration - stub
   */
  async deleteIntegration(_userId: string): Promise<boolean> {
    throw new Error('GitHub integration management is not available in Community Edition. Upgrade to PRO at https://synthstack.app/pricing');
  }
}

export default GitHubService;
