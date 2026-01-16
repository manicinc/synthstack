/**
 * Authentication and user types for SynthStack
 */

import type { SubscriptionTier } from '../billing/index.js';

export interface User {
  id: string;
  email: string;
  displayName?: string;
  avatarUrl?: string;
  subscriptionTier: SubscriptionTier;
  creditsRemaining: number;
  lifetimeCreditsUsed: number;
  stripeCustomerId?: string;
  isBanned: boolean;
  isModerator: boolean;
  isAdmin: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UserCredits {
  remaining: number;
  usedToday: number;
  dailyLimit: number;
  lifetimeUsed: number;
  tier: SubscriptionTier;
  resetsAt: string;
  unlimited: boolean;
}

export interface UserProfile {
  id: string;
  userId: string;
  bio?: string;
  website?: string;
  location?: string;
  company?: string;
  socialLinks?: SocialLinks;
}

export interface SocialLinks {
  twitter?: string;
  github?: string;
  linkedin?: string;
  discord?: string;
}

export interface Session {
  id: string;
  userId: string;
  token: string;
  expiresAt: string;
  createdAt: string;
  userAgent?: string;
  ipAddress?: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupCredentials {
  email: string;
  password: string;
  displayName?: string;
  referralCode?: string;
}
