// App settings: which AI provider to call, with what key, and which reminder server to use.
// They never leave the device except as the credentials of the calls they configure.
import { useSyncExternalStore } from 'react';
import { z } from 'zod';
import { createStore } from './createStore';

export const providers = ['anthropic', 'openai', 'gemini', 'openai-compatible'] as const;
export type Provider = (typeof providers)[number];

export const providerLabels: Record<Provider, string> = {
  anthropic: 'Anthropic (Claude)',
  openai: 'OpenAI',
  gemini: 'Google Gemini',
  'openai-compatible': 'OpenAI-compatible (OpenRouter, Groq, Ollama…)',
};

export const defaultModels: Record<Provider, string> = {
  anthropic: 'claude-opus-5-5',
  openai: 'gpt-5-mini',
  gemini: 'gemini-2.5-flash',
  'openai-compatible': '',
};

const settingsSchema = z.object({
  provider: z.enum(providers).catch('anthropic'),
  apiKey: z.string().catch(''),
  model: z.string().catch(''),
  baseUrl: z.string().catch(''),
  serverUrl: z.string().catch(''),
});

export type Settings = z.infer<typeof settingsSchema>;

const defaults: Settings = {
  provider: 'anthropic',
  apiKey: '',
  model: '',
  baseUrl: '',
  serverUrl: import.meta.env.VITE_DEFAULT_SERVER_URL ?? '',
};

const store = createStore<Settings>('nudge.settings', defaults, (raw) => settingsSchema.parse({ ...defaults, ...(raw as object) }));

export const getSettings = store.get;

export function updateSettings(patch: Partial<Settings>) {
  store.set((prev) => ({ ...prev, ...patch }));
}

export function useSettings(): Settings {
  return useSyncExternalStore(store.subscribe, store.get, store.get);
}

/** The model to call: the one the user typed, or the provider's default. */
export function resolveModel(settings: Settings): string {
  return settings.model.trim() || defaultModels[settings.provider];
}

export function isAiConfigured(settings: Settings): boolean {
  if (!settings.apiKey.trim() && settings.provider !== 'openai-compatible') return false;
  if (settings.provider === 'openai-compatible') return Boolean(settings.baseUrl.trim() && resolveModel(settings));
  return true;
}

export function serverBaseUrl(settings: Settings = getSettings()): string {
  return settings.serverUrl.trim().replace(/\/+$/, '');
}

export function isServerConfigured(settings: Settings = getSettings()): boolean {
  return serverBaseUrl(settings) !== '';
}
