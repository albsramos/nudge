// Claude through the official SDK, called straight from the browser with the user's own key.
import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { LlmError, type JsonRequest, type ProviderConfig } from './types';

// Models that take server-side refusal fallbacks ("default" routes by refusal category).
const fallbackModels = new Set(['claude-opus-5-5', 'claude-sonnet-5-5', 'claude-opus-5', 'claude-fable-5-1', 'claude-fable-5-2']);

export async function anthropicJson<T>(config: ProviderConfig, request: JsonRequest<T>): Promise<T> {
  const client = new Anthropic({
    apiKey: config.apiKey,
    // The key is the user's own and stays on their device; there is no server to proxy through.
    dangerouslyAllowBrowser: true,
    maxRetries: 2,
  });
  const hasFallbacks = fallbackModels.has(config.model);

  try {
    const message = await client.beta.messages.parse({
      model: config.model,
      max_tokens: 16000,
      system: request.system,
      messages: [{ role: 'user', content: request.user }],
      // A note is a small extraction job: low effort keeps it fast and cheap.
      output_config: { effort: 'low', format: zodOutputFormat(request.schema) },
      ...(hasFallbacks ? { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const } : {}),
    });
    if (message.stop_reason === 'refusal') throw new LlmError('Claude declined to process this note.');
    if (message.parsed_output == null) throw new LlmError("Claude's reply wasn't valid note JSON.");
    return message.parsed_output as T;
  } catch (error) {
    throw toLlmError(error);
  }
}

function toLlmError(error: unknown): Error {
  if (error instanceof LlmError) return error;
  if (error instanceof Anthropic.AuthenticationError) return new LlmError('Anthropic rejected the API key.', { cause: error });
  if (error instanceof Anthropic.PermissionDeniedError) return new LlmError('This API key may not use that model.', { cause: error });
  if (error instanceof Anthropic.NotFoundError) return new LlmError('Unknown Claude model. Check the model in Settings.', { cause: error });
  if (error instanceof Anthropic.RateLimitError) return new LlmError('Rate limited by Anthropic. Try again in a moment.', { cause: error });
  if (error instanceof Anthropic.BadRequestError) return new LlmError(`Anthropic: ${error.message}`, { cause: error });
  if (error instanceof Anthropic.APIConnectionError) return new LlmError("Couldn't reach Anthropic. Are you offline?", { cause: error });
  if (error instanceof Anthropic.APIError) return new LlmError(`Anthropic error: ${error.message}`, { cause: error });
  return error instanceof Error ? error : new LlmError(String(error));
}
