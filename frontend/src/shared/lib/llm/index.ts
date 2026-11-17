// Provider-agnostic "ask a model for JSON matching this schema". Knows no domain.
// Each provider loads on first use (the Anthropic SDK is most of the bundle); the service worker precaches them.
import { resolveModel, type Settings } from '../settings';
import type { JsonRequest, ProviderConfig } from './types';

export { LlmError } from './types';
export type { JsonRequest } from './types';

export async function generateJson<T>(settings: Settings, request: JsonRequest<T>): Promise<T> {
  const config: ProviderConfig = {
    apiKey: settings.apiKey.trim(),
    model: resolveModel(settings),
    baseUrl: settings.baseUrl.trim(),
  };
  switch (settings.provider) {
    case 'anthropic':
      return (await import('./anthropic')).anthropicJson(config, request);
    case 'gemini':
      return (await import('./gemini')).geminiJson(config, request);
    case 'openai':
      return (await import('./openai')).openAiJson({ ...config, baseUrl: '' }, request);
    case 'openai-compatible':
      return (await import('./openai')).openAiJson(config, request);
  }
}
