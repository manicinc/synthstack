import { assertVisibleContent, openaiSampling, REASONING_HEADROOM } from '../../../src/generation/generation.service';

describe('openaiSampling', () => {
  it('runs gpt-6-luna with no reasoning step and keeps the temperature', () => {
    expect(openaiSampling('gpt-6-luna', 1000, 0.7)).toEqual({
      reasoning_effort: 'none',
      max_completion_tokens: 1000,
      temperature: 0.7,
    });
  });

  it('gives gpt-6.2-sol a completion cap with reasoning room and no temperature', () => {
    expect(openaiSampling('gpt-6.2-sol', 500, 0.7)).toEqual({
      reasoning_effort: 'low',
      max_completion_tokens: 500 + REASONING_HEADROOM,
    });
  });

  it('keeps max_tokens and temperature for a chat model', () => {
    expect(openaiSampling('gpt-4o-mini', 500, 0.7)).toEqual({ max_tokens: 500, temperature: 0.7 });
  });
});

describe('assertVisibleContent', () => {
  it('throws when the cap cut the reply before any text', () => {
    expect(() =>
      assertVisibleContent({ finish_reason: 'length', message: { content: '' } }, 'gpt-6.2-sol'),
    ).toThrow(/token cap/);
  });

  it('passes a finished reply and a cut reply that has text', () => {
    expect(() => assertVisibleContent({ finish_reason: 'stop', message: { content: 'hi' } }, 'gpt-6.2-sol')).not.toThrow();
    expect(() => assertVisibleContent({ finish_reason: 'length', message: { content: 'part' } }, 'gpt-6.2-sol')).not.toThrow();
  });
});
