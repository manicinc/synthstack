/**
 * GPT-6 request fields and explicit model resolution in the LLM router.
 */

import { describe, it, expect, vi } from 'vitest';

vi.mock('../../../config/index.js', () => ({ config: { openaiApiKey: '' } }));

import { openaiRequestFields } from '../adapters/openai.js';
import { ModelRegistry } from '../models.js';

describe('openaiRequestFields', () => {
  const options = { maxTokens: 500, temperature: 0.3, topP: 0.9, stop: ['END'] };

  it('sends gpt-6.2 models low effort and max_completion_tokens only', () => {
    expect(openaiRequestFields('gpt-6.2-astra', options, 4096)).toEqual({
      reasoning_effort: 'low',
      max_completion_tokens: 500,
    });
  });

  it('refuses function tools on gpt-6.2 models', () => {
    const tools = [{ type: 'function' as const, function: { name: 'f', parameters: {} } }];
    expect(() => openaiRequestFields('gpt-6.2-sol', { ...options, tools } as any, 4096)).toThrow(
      /does not take function tools/
    );
  });

  it('keeps temperature and top_p on gpt-6-luna at effort none, without stop', () => {
    const fields = openaiRequestFields('gpt-6-luna', options, 4096);
    expect(fields).toMatchObject({
      reasoning_effort: 'none',
      max_completion_tokens: 500,
      temperature: 0.3,
      top_p: 0.9,
    });
    expect(fields).not.toHaveProperty('stop');
    expect(fields).not.toHaveProperty('max_tokens');
  });

  it('leaves other models on max_tokens', () => {
    expect(openaiRequestFields('gpt-4o', options, 4096)).toMatchObject({
      max_tokens: 500,
      temperature: 0.3,
      stop: ['END'],
    });
  });
});

describe('ModelRegistry explicit GPT-6 models', () => {
  const registry = new ModelRegistry();

  it('resolves a named GPT-6 model', () => {
    expect(registry.getModel('gpt-6.2-astra')?.id).toBe('gpt-6.2-astra');
    expect(registry.getModel('gpt-6-luna')?.provider).toBe('openai');
  });

  it('keeps GPT-6 models out of tier routing and the cheapest search', () => {
    const tierIds = ['cheap', 'standard', 'premium'].flatMap((t) =>
      registry.getModelsByTier(t as any).map((m) => m.id)
    );
    expect(tierIds.some((id) => id.startsWith('gpt-6'))).toBe(false);
    expect(registry.findCheapestModel({ requiresTools: true }, ['openai'])?.id).not.toMatch(/^gpt-6/);
  });
});
