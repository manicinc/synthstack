/**
 * BYOK (Bring Your Own Keys) Service
 *
 * Manages user-provided API keys for AI services.
 * Supports OpenAI and Anthropic.
 */

import { pool } from '../config/database';
import { encrypt, decrypt, getKeyHint, isEncryptionConfigured } from './encryption';
import { logger } from '../utils/logger';

// ============================================
// Types
// ============================================

export interface ApiKey {
  id: string;
  userId: string;
  provider: string;
  providerName: string;
  keyHint: string;
  isActive: boolean;
  isValid: boolean;
  lastError: string | null;
  totalRequests: number;
  totalTokens: number;
  lastUsedAt: Date | null;
  createdAt: Date;
}

export interface ApiProvider {
  id: string;
  name: string;
  description: string;
  docsUrl: string;
  keyFormatHint: string;
  isEnabled: boolean;
}

export interface CreateApiKeyInput {
  userId: string;
  provider: string;
  apiKey: string;
}

export interface ApiKeyUsageInput {
  apiKeyId: string;
  userId: string;
  provider: string;
  model?: string;
  endpoint?: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  estimatedCostCents?: number;
  success?: boolean;
  errorMessage?: string;
  responseTimeMs?: number;
}

// Database row types
interface ProviderRow {
  id: string;
  name: string;
  description: string;
  docs_url: string;
  key_format_hint: string;
  is_enabled: boolean;
}

interface ApiKeyRow {
  id: string;
  user_id: string;
  provider: string;
  provider_name?: string;
  key_hint: string;
  is_active: boolean;
  is_valid: boolean;
  last_error: string | null;
  total_requests: number;
  total_tokens: number;
  last_used_at: Date | null;
  created_at: Date;
  endpoint?: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  estimatedCostCents?: number;
  success: boolean;
  errorMessage?: string;
  responseTimeMs?: number;
}

interface EncryptedKeyRow {
  encrypted_key: string;
}

interface ProviderKeyRow {
  provider: string;
  encrypted_key: string;
}

interface UsageStatsRow {
  provider: string;
  requests: string;
  tokens: string;
  cost: string;
}

// ============================================
// Provider-specific key validation
// ============================================

async function validateOpenAIKey(apiKey: string): Promise<{ valid: boolean; error?: string }> {
  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    if (response.ok) {
      return { valid: true };
    }

    const error = await response.json().catch(() => ({}));
    return {
      valid: false,
      error: error.error?.message || `HTTP ${response.status}`,
    };
  } catch (err) {
    return {
      valid: false,
      error: err instanceof Error ? err.message : 'Connection failed',
    };
  }
}

async function validateAnthropicKey(apiKey: string): Promise<{ valid: boolean; error?: string }> {
  try {
    // Anthropic doesn't have a simple validation endpoint
    // We'll make a minimal request to check the key
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-3-haiku-20240307',
        max_tokens: 1,
        messages: [{ role: 'user', content: 'Hi' }],
      }),
    });

    // 200 = valid key, 401 = invalid key, other errors might be rate limits etc.
    if (response.ok || response.status === 429) {
      return { valid: true };
    }

    if (response.status === 401) {
      return { valid: false, error: 'Invalid API key' };
    }

    const error = await response.json().catch(() => ({}));
    return {
      valid: false,
      error: error.error?.message || `HTTP ${response.status}`,
    };
  } catch (err) {
    return {
      valid: false,
      error: err instanceof Error ? err.message : 'Connection failed',
    };
  }
}

// ============================================
// Service Functions
// ============================================

/**
 * Get all supported API providers
 */
export async function getProviders(): Promise<ApiProvider[]> {
  const result = await pool.query<ProviderRow>(`
    SELECT id, name, description, docs_url, key_format_hint, is_enabled
    FROM api_providers
    WHERE is_enabled = true
    ORDER BY sort_order
  `);

  return result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    docsUrl: row.docs_url,
    keyFormatHint: row.key_format_hint,
    isEnabled: row.is_enabled,
  }));
}

/**
 * Get user's API keys (without actual key values)
 */
export async function getUserApiKeys(userId: string): Promise<ApiKey[]> {
  const result = await pool.query<ApiKeyRow>(
    `
    SELECT
      k.id, k.user_id, k.provider, k.key_hint,
      k.is_active, k.is_valid, k.last_error,
      k.total_requests, k.total_tokens, k.last_used_at,
      k.created_at,
      p.name as provider_name
    FROM user_api_keys k
    JOIN api_providers p ON k.provider = p.id
    WHERE k.user_id = $1
    ORDER BY p.sort_order
  `,
    [userId]
  );

  return result.rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    provider: row.provider,
    providerName: row.provider_name ?? row.provider,
    keyHint: row.key_hint,
    isActive: row.is_active,
    isValid: row.is_valid,
    lastError: row.last_error,
    totalRequests: row.total_requests,
    totalTokens: row.total_tokens,
    lastUsedAt: row.last_used_at,
    createdAt: row.created_at,
  }));
}

/**
 * Add or update an API key
 */
export async function saveApiKey(input: CreateApiKeyInput): Promise<ApiKey> {
  if (!isEncryptionConfigured()) {
    throw new Error('Encryption not configured. Set ENCRYPTION_KEY environment variable.');
  }

  const { userId, provider, apiKey } = input;

  // Validate the key format
  if (!apiKey || apiKey.length < 10) {
    throw new Error('Invalid API key format');
  }

  // Encrypt the key
  const encryptedKey = encrypt(apiKey);
  const keyHint = getKeyHint(apiKey);

  // Validate the key with the provider
  let validation: { valid: boolean; error?: string } = { valid: false, error: 'Unknown provider' };

  if (provider === 'openai') {
    validation = await validateOpenAIKey(apiKey);
  } else if (provider === 'anthropic') {
    validation = await validateAnthropicKey(apiKey);
  }

  // Upsert the key
  const result = await pool.query<ApiKeyRow>(
    `
    INSERT INTO user_api_keys (user_id, provider, encrypted_key, key_hint, is_valid, last_error)
    VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (user_id, provider) DO UPDATE SET
      encrypted_key = EXCLUDED.encrypted_key,
      key_hint = EXCLUDED.key_hint,
      is_valid = EXCLUDED.is_valid,
      last_error = EXCLUDED.last_error,
      is_active = true,
      updated_at = NOW()
    RETURNING id, user_id, provider, key_hint, is_active, is_valid, last_error,
              total_requests, total_tokens, last_used_at, created_at
  `,
    [userId, provider, encryptedKey, keyHint, validation.valid, validation.error || null]
  );

  const row = result.rows[0];

  logger.info(`API key ${validation.valid ? 'added' : 'added (invalid)'} for user ${userId}, provider ${provider}`);

  return {
    id: row.id,
    userId: row.user_id,
    provider: row.provider,
    providerName: provider,
    keyHint: row.key_hint,
    isActive: row.is_active,
    isValid: row.is_valid,
    lastError: row.last_error,
    totalRequests: row.total_requests,
    totalTokens: row.total_tokens,
    lastUsedAt: row.last_used_at,
    createdAt: row.created_at,
  };
}

/**
 * Delete an API key
 */
export async function deleteApiKey(userId: string, keyId: string): Promise<boolean> {
  const result = await pool.query(
    `DELETE FROM user_api_keys WHERE id = $1 AND user_id = $2`,
    [keyId, userId]
  );

  if (result.rowCount && result.rowCount > 0) {
    logger.info(`API key ${keyId} deleted for user ${userId}`);
    return true;
  }

  return false;
}

/**
 * Get decrypted API key for a user and provider
 * Used internally when making API calls
 */
export async function getDecryptedApiKey(
  userId: string,
  provider: string
): Promise<string | null> {
  const result = await pool.query<EncryptedKeyRow>(
    `
    SELECT encrypted_key
    FROM user_api_keys
    WHERE user_id = $1 AND provider = $2 AND is_active = true AND is_valid = true
  `,
    [userId, provider]
  );

  if (result.rows.length === 0) {
    return null;
  }

  try {
    return decrypt(result.rows[0].encrypted_key);
  } catch (err) {
    logger.error(`Failed to decrypt API key for user ${userId}, provider ${provider}`, err);
    return null;
  }
}

/**
 * Check if user has a valid API key for a provider
 */
export async function hasValidApiKey(userId: string, provider: string): Promise<boolean> {
  const result = await pool.query(
    `
    SELECT 1 FROM user_api_keys
    WHERE user_id = $1 AND provider = $2 AND is_active = true AND is_valid = true
  `,
    [userId, provider]
  );

  return result.rows.length > 0;
}

/**
 * Check if user has any valid BYOK keys
 */
export async function hasByokEnabled(userId: string): Promise<boolean> {
  const result = await pool.query(
    `
    SELECT 1 FROM user_api_keys
    WHERE user_id = $1 AND is_active = true AND is_valid = true
    LIMIT 1
  `,
    [userId]
  );

  return result.rows.length > 0;
}

/**
 * Test an API key (re-validate)
 */
export async function testApiKey(
  userId: string,
  keyId: string
): Promise<{ valid: boolean; error?: string }> {
  // Get the encrypted key
  const result = await pool.query<ProviderKeyRow>(
    `SELECT provider, encrypted_key FROM user_api_keys WHERE id = $1 AND user_id = $2`,
    [keyId, userId]
  );

  if (result.rows.length === 0) {
    return { valid: false, error: 'Key not found' };
  }

  const { provider, encrypted_key } = result.rows[0];
  const apiKey = decrypt(encrypted_key);

  // Validate based on provider
  let validation: { valid: boolean; error?: string } = { valid: false, error: 'Unknown provider' };

  if (provider === 'openai') {
    validation = await validateOpenAIKey(apiKey);
  } else if (provider === 'anthropic') {
    validation = await validateAnthropicKey(apiKey);
  }

  // Update the key status
  await pool.query(
    `UPDATE user_api_keys SET is_valid = $1, last_error = $2, updated_at = NOW() WHERE id = $3`,
    [validation.valid, validation.error || null, keyId]
  );

  return validation;
}

/**
 * Log API key usage
 */
export async function logApiKeyUsage(input: ApiKeyUsageInput): Promise<void> {
  try {
    await pool.query(
      `
      INSERT INTO api_key_usage (
        api_key_id, user_id, provider, model, endpoint,
        prompt_tokens, completion_tokens, total_tokens,
        estimated_cost_cents, success, error_message, response_time_ms
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    `,
      [
        input.apiKeyId,
        input.userId,
        input.provider,
        input.model,
        input.endpoint,
        input.promptTokens,
        input.completionTokens,
        input.totalTokens,
        input.estimatedCostCents,
        input.success,
        input.errorMessage,
        input.responseTimeMs,
      ]
    );
  } catch (err) {
    logger.error('Failed to log API key usage', err);
  }
}

/**
 * Get API key usage stats for a user
 */
export async function getUsageStats(
  userId: string,
  days: number = 30
): Promise<{
  totalRequests: number;
  totalTokens: number;
  estimatedCostCents: number;
  byProvider: Record<string, { requests: number; tokens: number; cost: number }>;
}> {
  const result = await pool.query<UsageStatsRow>(
    `
    SELECT
      provider,
      COUNT(*) as requests,
      COALESCE(SUM(total_tokens), 0) as tokens,
      COALESCE(SUM(estimated_cost_cents), 0) as cost
    FROM api_key_usage
    WHERE user_id = $1 AND created_at > NOW() - INTERVAL '1 day' * $2
    GROUP BY provider
  `,
    [userId, days]
  );

  const byProvider: Record<string, { requests: number; tokens: number; cost: number }> = {};
  let totalRequests = 0;
  let totalTokens = 0;
  let estimatedCostCents = 0;

  for (const row of result.rows) {
    byProvider[row.provider] = {
      requests: parseInt(row.requests, 10),
      tokens: parseInt(row.tokens, 10),
      cost: parseInt(row.cost, 10),
    };
    totalRequests += parseInt(row.requests, 10);
    totalTokens += parseInt(row.tokens, 10);
    estimatedCostCents += parseInt(row.cost, 10);
  }

  return { totalRequests, totalTokens, estimatedCostCents, byProvider };
}

// ============================================
// BYOK Router Helper Functions
// ============================================

/**
 * Get user's BYOK key for a specific provider (with key ID for logging)
 * Returns null if no valid key found
 *
 * Used by BYOK router to get both the decrypted key and the key ID
 * for usage tracking.
 */
export async function getUserApiKeyForProvider(
  userId: string,
  provider: string
): Promise<{ apiKey: string; keyId: string } | null> {
  const result = await pool.query<{ id: string; encrypted_key: string }>(
    `
    SELECT id, encrypted_key
    FROM user_api_keys
    WHERE user_id = $1 AND provider = $2 AND is_active = true AND is_valid = true
  `,
    [userId, provider]
  );

  if (result.rows.length === 0) {
    return null;
  }

  try {
    const decryptedKey = decrypt(result.rows[0].encrypted_key);
    return {
      apiKey: decryptedKey,
      keyId: result.rows[0].id,
    };
  } catch (err) {
    logger.error(`Failed to decrypt API key for user ${userId}, provider ${provider}`, err);
    return null;
  }
}

/**
 * Get list of providers user has valid BYOK keys for
 * Returns array of provider IDs (e.g., ['openai', 'anthropic'])
 *
 * Used by BYOK router to determine which providers are available for BYOK routing.
 */
export async function getUserByokProviders(userId: string): Promise<string[]> {
  const result = await pool.query<{ provider: string }>(
    `
    SELECT provider
    FROM user_api_keys
    WHERE user_id = $1 AND is_active = true AND is_valid = true
    ORDER BY provider
  `,
    [userId]
  );

  return result.rows.map((r) => r.provider);
}

/**
 * Log BYOK usage (wrapper around logApiKeyUsage for BYOK router)
 *
 * Simplified interface for logging BYOK API calls.
 * Increments total_requests and total_tokens in user_api_keys table.
 */
export async function logByokUsage(
  keyId: string,
  userId: string,
  provider: string,
  model: string,
  tokens: { prompt?: number; completion?: number; total?: number },
  costCents?: number,
  responseTimeMs?: number,
  error?: string
): Promise<void> {
  try {
    // Log to api_key_usage table
    await logApiKeyUsage({
      apiKeyId: keyId,
      userId,
      provider,
      model,
      endpoint: 'byok_router',
      promptTokens: tokens.prompt,
      completionTokens: tokens.completion,
      totalTokens: tokens.total || (tokens.prompt || 0) + (tokens.completion || 0),
      estimatedCostCents: costCents,
      success: !error,
      errorMessage: error,
      responseTimeMs,
    });

    // Update usage counters in user_api_keys
    await pool.query(
      `
      UPDATE user_api_keys
      SET
        total_requests = total_requests + 1,
        total_tokens = total_tokens + $2,
        last_used_at = NOW(),
        updated_at = NOW()
      WHERE id = $1
    `,
      [keyId, tokens.total || (tokens.prompt || 0) + (tokens.completion || 0)]
    );
  } catch (err) {
    logger.error('Failed to log BYOK usage', err);
  }
}
