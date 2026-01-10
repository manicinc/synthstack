/**
 * Discount code types
 */

export type DiscountType = 'percent' | 'fixed' | 'free_month' | 'free_trial';
export type DiscountAppliesTo = 'lifetime' | 'subscription' | 'credits' | 'all';
export type DiscountSource = 'referral' | 'admin' | 'campaign' | 'partner';

export interface DiscountCode {
  id: string;
  code: string;
  name?: string;
  description?: string;
  type: DiscountType;
  value: number;
  applies_to: DiscountAppliesTo;
  source?: DiscountSource;
  max_uses?: number;
  max_uses_per_user: number;
  current_uses: number;
  min_purchase?: number;
  max_discount?: number;
  is_active: boolean;
  is_public?: boolean;
  referral_reward_id?: string;
  starts_at?: string;
  expires_at?: string;
  created_by?: string;
  created_at?: string;
}

export interface DiscountValidation {
  valid: boolean;
  discount?: DiscountCode;
  error?: string;
}

export interface DiscountApplication {
  success: boolean;
  finalAmount: number;
  discountAmount: number;
  error?: string;
}

export interface DiscountUsage {
  id: string;
  discount_code_id: string;
  user_id: string;
  order_id?: string;
  original_amount: number;
  discount_amount: number;
  final_amount: number;
  product_type?: string;
  product_id?: string;
  applied_at?: string;
}

export interface CreateDiscountCodeInput {
  code?: string;
  name?: string;
  description?: string;
  type?: DiscountType;
  value?: number;
  applies_to?: DiscountAppliesTo;
  max_uses?: number;
  max_uses_per_user?: number;
  min_purchase?: number;
  max_discount?: number;
  is_active?: boolean;
  is_public?: boolean;
  expires_at?: string;
  created_by?: string;
}
