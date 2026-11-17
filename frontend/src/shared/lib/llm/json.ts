import { z } from 'zod';
import { LlmError } from './types';

/** For providers without schema-constrained output: describe the shape in the prompt. */
export function schemaHint(schema: z.ZodType): string {
  return `Reply with only a JSON object matching this JSON Schema:\n${JSON.stringify(z.toJSONSchema(schema))}`;
}

/** Parses a model's reply, tolerating code fences or prose around the JSON object. */
export function parseJsonReply<T>(schema: z.ZodType<T>, text: string | undefined): T {
  if (!text) throw new LlmError('The model returned an empty reply.');
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end <= start) throw new LlmError("The model's reply had no JSON in it.");
  let raw: unknown;
  try {
    raw = JSON.parse(text.slice(start, end + 1));
  } catch (error) {
    throw new LlmError("The model's reply wasn't valid JSON.", { cause: error });
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) throw new LlmError("The model's reply didn't match the note format.", { cause: parsed.error });
  return parsed.data;
}
