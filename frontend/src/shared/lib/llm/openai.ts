// OpenAI and any server that speaks its Chat Completions API (OpenRouter, Groq, Together, Ollama, LM Studio).
import { LlmError, type JsonRequest, type ProviderConfig } from './types';
import { parseJsonReply, schemaHint } from './json';

export async function openAiJson<T>(config: ProviderConfig, request: JsonRequest<T>): Promise<T> {
  const baseUrl = (config.baseUrl || 'https://api.openai.com/v1').replace(/\/+$/, '');
  let response: Response;
  try {
    response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
      },
      body: JSON.stringify({
        model: config.model,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: `${request.system}\n\n${schemaHint(request.schema)}` },
          { role: 'user', content: request.user },
        ],
      }),
    });
  } catch (error) {
    throw new LlmError(`Couldn't reach ${new URL(baseUrl).host}. Offline, or it blocks browser requests (CORS)?`, { cause: error });
  }
  const body = (await response.json().catch(() => undefined)) as
    | { choices?: { message?: { content?: string } }[]; error?: { message?: string } }
    | undefined;
  if (!response.ok) {
    if (response.status === 401) throw new LlmError('The provider rejected the API key.');
    if (response.status === 429) throw new LlmError('Rate limited by the provider. Try again in a moment.');
    throw new LlmError(body?.error?.message ?? `Provider returned ${response.status}.`);
  }
  return parseJsonReply(request.schema, body?.choices?.[0]?.message?.content);
}
