import { openaiSampling } from '../../../src/generation/generation.service';

describe('openaiSampling', () => {
  it('runs gpt-6-luna with no reasoning step and keeps the temperature', () => {
    expect(openaiSampling('gpt-6-luna', 1000, 0.7)).toEqual({
      reasoning_effort: 'none',
      max_completion_tokens: 1000,
      temperature: 0.7,
    });
  });

  it('gives gpt-6.2-sol a completion cap and no temperature', () => {
    expect(openaiSampling('gpt-6.2-sol', 500, 0.7)).toEqual({ reasoning_effort: 'low', max_completion_tokens: 500 });
  });

  it('keeps max_tokens and temperature for a chat model', () => {
    expect(openaiSampling('gpt-4o-mini', 500, 0.7)).toEqual({ max_tokens: 500, temperature: 0.7 });
  });
});
