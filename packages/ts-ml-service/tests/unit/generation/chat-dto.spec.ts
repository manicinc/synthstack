import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ChatCompletionsRequestDto } from '../../../src/generation/dto/generation.dto';

async function modelErrors(model: string) {
  const dto = plainToInstance(ChatCompletionsRequestDto, {
    messages: [{ role: 'user', content: 'hi' }],
    model,
  });
  return (await validate(dto)).filter((e) => e.property === 'model');
}

describe('ChatCompletionsRequestDto.model', () => {
  it.each(['gpt-4o-mini', 'gpt-4o', 'gpt-5.2', 'gpt-6-luna', 'gpt-6.2-sol', 'gpt-6.2-astra'])(
    'accepts %s, which the gateway forwards',
    async (model) => {
      expect(await modelErrors(model)).toHaveLength(0);
    },
  );

  it('refuses a shut-down id', async () => {
    expect(await modelErrors('gpt-3.5-turbo')).toHaveLength(1);
  });
});
