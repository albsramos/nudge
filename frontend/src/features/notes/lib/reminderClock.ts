// Shows due reminders while the app is open (and catches up on missed local ones when it opens).
// Started once from the app entry; push reminders are delivered by the server and the service worker.
import { showNotification } from '@/shared/lib/push';
import { notesStore, updateNote } from '../api/notesStore';
import { dueReminders, notificationText } from '../domain/note';

const intervalMs = 10_000;
let lastCheck = new Date();
let isStarted = false;

export function checkReminders(now = new Date()) {
  const due = dueReminders(notesStore.get(), now, lastCheck);
  lastCheck = now;
  for (const { note, reminder, isStale } of due) {
    updateNote(note.id, (n) => ({ ...n, reminders: n.reminders.map((r) => (r.id === reminder.id ? { ...r, isDone: true } : r)) }));
    if (isStale) continue;
    const { title, body } = notificationText(note, reminder);
    // The push notification is tagged with the server id, so if both arrive the user sees one.
    void showNotification({ title, body, tag: reminder.serverId ?? reminder.id, url: `${import.meta.env.BASE_URL}?note=${note.id}` });
  }
}

export function startReminderClock() {
  if (isStarted || typeof window === 'undefined') return;
  isStarted = true;
  checkReminders();
  window.setInterval(() => checkReminders(), intervalMs);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') checkReminders();
  });
}
