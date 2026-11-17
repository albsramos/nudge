// Google Gemini's REST API, which accepts browser requests with an API key.
import { LlmError, type JsonRequest, type ProviderConfig } from './types';
import { parseJsonReply, schemaHint } from './json';

export async function geminiJson<T>(config: ProviderConfig, request: JsonRequest<T>): Promise<T> {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(config.model)}:generateContent`;
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': config.apiKey },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: `${request.system}\n\n${schemaHint(request.schema)}` }] },
        contents: [{ role: 'user', parts: [{ text: request.user }] }],
        generationConfig: { responseMimeType: 'application/json' },
      }),
    });
  } catch (error) {
    throw new LlmError("Couldn't reach Gemini. Are you offline?", { cause: error });
  }
  const body = (await response.json().catch(() => undefined)) as
    | { candidates?: { content?: { parts?: { text?: string }[] } }[]; error?: { message?: string } }
    | undefined;
  if (!response.ok) {
    if (response.status === 400 || response.status === 403) throw new LlmError(body?.error?.message ?? 'Gemini rejected the request.');
    if (response.status === 429) throw new LlmError('Rate limited by Gemini. Try again in a moment.');
    throw new LlmError(body?.error?.message ?? `Gemini returned ${response.status}.`);
  }
  return parseJsonReply(request.schema, body?.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join(''));
}
