// Adapter layer for the settings checks: "does my key work", "does push reach this device".
import { z } from 'zod';
import { getPushPublicKey } from '@/shared/api/generated/push/push';
import { createReminder } from '@/shared/api/generated/reminders/reminders';
import { generateJson } from '@/shared/lib/llm';
import { ensurePushSubscription } from '@/shared/lib/push';
import type { Settings } from '@/shared/lib/settings';

export async function testAi(settings: Settings): Promise<string> {
  const reply = await generateJson(settings, {
    schema: z.object({ reply: z.string() }),
    system: 'You are a connectivity check.',
    user: 'Reply with {"reply": "ok"}.',
  });
  return reply.reply;
}

/** Asks the server to push a test notification to this device in a few seconds. */
export async function testPush(): Promise<void> {
  const { publicKey } = await getPushPublicKey();
  const subscription = await ensurePushSubscription(publicKey);
  await createReminder({
    subscription,
    noteId: 'test',
    title: 'Nudge test notification',
    body: 'Push works. Reminders will reach you even when the app is closed.',
    fireAt: new Date(Date.now() + 5_000).toISOString(),
  });
}
