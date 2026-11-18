// Asks the configured model to structure a note and find any "remind me…" in it.
import { z } from 'zod';
import { generateJson } from '@/shared/lib/llm';
import type { Settings } from '@/shared/lib/settings';
import { draftFromExtraction, type NoteDraft } from '../domain/note';
import { describeNow } from '../domain/time';

const extractionSchema = z.object({
  title: z.string().describe('A short title, at most 8 words, in the language of the note.'),
  body: z.string().describe('The note in the user’s own words, without the reminder instruction. Empty if the title says it all.'),
  tags: z.array(z.string()).describe('0 to 3 lowercase one-word topics.'),
  reminders: z
    .array(
      z.object({
        at: z.string().describe('When to notify: ISO 8601 with the user’s UTC offset, e.g. 2026-11-18T18:00:00+01:00.'),
        label: z
          .string()
          .describe('Empty unless the notification should say something the title doesn’t, e.g. "Leave for the dentist" on a note titled "Dentist Friday 10am".'),
      }),
    )
    .describe('Empty unless the user asks to be reminded, pinged or notified.'),
});

const system = `You turn a quick note into a structured note for a notes app with reminders.

Reminders:
- Add one only when the user asks to be reminded, notified, pinged or nudged ("remind me", "don't let me forget", "ping me at"). A date that is merely mentioned is not a reminder.
- Resolve relative times ("tomorrow", "in 2 hours", "next Friday", "tonight") against the current local time you are given.
- A day without a time means 09:00 that day. "Tonight" means 20:00. "This afternoon" means 15:00. "Morning" means 09:00.
- A time without a day means its next occurrence: today if still ahead, else tomorrow.
- "Every day" or other repeats: add just the next occurrence.
- Several distinct requests mean several reminders.
- Leave a reminder's label empty when it would just repeat the title. Give it one only when the notification
  needs different words, like "Leave for the dentist" an hour before "Dentist appointment".

Keep the user's language. Never invent facts.`;

export async function extractNote(settings: Settings, text: string, now = new Date()): Promise<NoteDraft> {
  const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const raw = await generateJson(settings, {
    schema: extractionSchema,
    system,
    user: `Current local time: ${describeNow(now, timeZone)}\n\nNote:\n${text}`,
  });
  return draftFromExtraction(raw, text, now);
}
