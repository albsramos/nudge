import type { z } from 'zod';

export type JsonRequest<T> = {
  schema: z.ZodType<T>;
  system: string;
  user: string;
};

export type ProviderConfig = {
  apiKey: string;
  model: string;
  baseUrl: string;
};

/** A failure worth showing the user as is: a bad key, a rate limit, an unreadable reply. */
export class LlmError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'LlmError';
  }
}
