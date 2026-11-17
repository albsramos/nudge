// Adapter layer: the only place this feature touches generated API code.
import { getPushPublicKey } from '@/shared/api/generated/push/push';
import { createReminder, deleteReminder } from '@/shared/api/generated/reminders/reminders';
import { isServerConfigured, serverBaseUrl } from '@/shared/lib/settings';
import { ensurePushSubscription, isPushSupported, notificationPermission } from '@/shared/lib/push';
import { notificationText, type Note, type Reminder } from '../domain/note';

export type Delivery = Pick<Reminder, 'delivery' | 'serverId'> & { warning?: string };

// The VAPID key per server URL: switching servers in Settings fetches the new one.
const publicKeys = new Map<string, Promise<string>>();

function serverPublicKey(): Promise<string> {
  const url = serverBaseUrl();
  let key = publicKeys.get(url);
  if (!key) {
    key = getPushPublicKey().then((r) => r.publicKey);
    key.catch(() => publicKeys.delete(url));
    publicKeys.set(url, key);
  }
  return key;
}

export function canPush(): boolean {
  return isServerConfigured() && isPushSupported() && notificationPermission() === 'granted';
}

/** Hands a reminder to the server when it can, so it arrives with the app closed. Otherwise it stays local. */
export async function deliver(note: Note, reminder: Pick<Reminder, 'id' | 'at' | 'label'>): Promise<Delivery> {
  if (!canPush()) return { delivery: 'local' };
  try {
    const subscription = await ensurePushSubscription(await serverPublicKey());
    const { title, body } = notificationText(note, { ...reminder, delivery: 'push', isDone: false });
    const created = await createReminder({ subscription, noteId: note.id, title, body, fireAt: reminder.at });
    return { delivery: 'push', serverId: created.id };
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    return { delivery: 'local', warning: `Couldn't schedule a push (${reason}). It will only ring while the app is open.` };
  }
}

/** Best effort: a reminder the server can't find has already been sent or cancelled. */
export async function cancel(reminder: Reminder): Promise<void> {
  if (reminder.delivery !== 'push' || !reminder.serverId || reminder.isDone) return;
  try {
    await deleteReminder(reminder.serverId);
  } catch {
    // Offline or already gone: nothing else to do.
  }
}
