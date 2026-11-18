// Domain layer: plain types and rules. Imports nothing from React, the API or the UI.

export type ReminderDelivery = 'push' | 'local';

export type Reminder = {
  id: string;
  /** When to notify, RFC 3339 in UTC. */
  at: string;
  label: string;
  /** Push: the server sends it even when the app is closed. Local: only while the app is open. */
  delivery: ReminderDelivery;
  /** The server's id, to cancel it. Only for push delivery. */
  serverId?: string;
  isDone: boolean;
};

export type Note = {
  id: string;
  /** What the user typed, kept verbatim. */
  text: string;
  title: string;
  body: string;
  tags: string[];
  reminders: Reminder[];
  createdAt: string;
  isAiProcessed: boolean;
};

/** What the AI (or the fallback) reads out of a note before it's saved. */
export type NoteDraft = {
  title: string;
  body: string;
  tags: string[];
  reminders: { at: Date; label: string }[];
};

const maxReminders = 5;
const pastGraceMs = 2 * 60_000;
/** A local reminder missed while the app was closed still shows if it's at most this late. */
export const localCatchUpMs = 12 * 60 * 60_000;

export function sortNotes(notes: Note[]): Note[] {
  return [...notes].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function filterNotes(notes: Note[], query: string): Note[] {
  const q = query.trim().toLowerCase();
  if (!q) return notes;
  return notes.filter((n) => [n.title, n.body, n.text, ...n.tags].some((field) => field.toLowerCase().includes(q)));
}

/** Without AI: the first line is the title, the rest the body. */
export function plainDraft(text: string): NoteDraft {
  const trimmed = text.trim();
  const [first = '', ...rest] = trimmed.split('\n');
  const title = first.length > 80 ? `${first.slice(0, 79)}…` : first;
  return { title, body: rest.join('\n').trim() || (first.length > 80 ? trimmed : ''), tags: [], reminders: [] };
}

type RawExtraction = { title: string; body: string; tags: string[]; reminders: { at: string; label: string }[] };

/** Cleans what a model returned: invalid or past times, duplicates and noise are dropped. */
export function draftFromExtraction(raw: RawExtraction, text: string, now: Date): NoteDraft {
  const fallback = plainDraft(text);
  const seen = new Set<number>();
  const reminders: NoteDraft['reminders'] = [];
  for (const r of raw.reminders) {
    const at = new Date(r.at);
    const time = at.getTime();
    if (Number.isNaN(time) || time < now.getTime() - pastGraceMs || seen.has(time)) continue;
    seen.add(time);
    reminders.push({ at, label: r.label.trim() });
  }
  reminders.sort((a, b) => a.at.getTime() - b.at.getTime());
  return {
    title: raw.title.trim().slice(0, 120) || fallback.title,
    body: raw.body.trim(),
    tags: [...new Set(raw.tags.map((t) => t.trim().toLowerCase().replace(/^#/, '')).filter(Boolean))].slice(0, 5),
    reminders: reminders.slice(0, maxReminders),
  };
}

export type DueReminder = { note: Note; reminder: Reminder; isStale: boolean };

/**
 * Reminders the app itself should show now. A push reminder is the server's job; the app only shows it
 * if it falls due while the app is open (the shared tag makes the two notifications collapse into one).
 */
export function dueReminders(notes: Note[], now: Date, lastCheck: Date): DueReminder[] {
  const due: DueReminder[] = [];
  for (const note of notes) {
    for (const reminder of note.reminders) {
      if (reminder.isDone) continue;
      const at = new Date(reminder.at).getTime();
      if (at > now.getTime()) continue;
      const fellDueUnwatched = at < lastCheck.getTime();
      const isStale = reminder.delivery === 'push' ? fellDueUnwatched : now.getTime() - at > localCatchUpMs;
      due.push({ note, reminder, isStale });
    }
  }
  return due;
}

export function nextReminder(note: Note, now: Date): Reminder | undefined {
  return note.reminders
    .filter((r) => !r.isDone && new Date(r.at).getTime() > now.getTime())
    .sort((a, b) => a.at.localeCompare(b.at))[0];
}

// Words that don't carry meaning in a short label, in English and Portuguese.
const fillerWords = new Set(
  'a an the my to of on in at for and or about me i it this that remind reminder um uma o os as de do da dos das no na em para e meu minha lembra lembrar'.split(' '),
);

function meaningfulWords(text: string): string[] {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .split(/[^\p{L}\p{N}]+/u)
    .filter((w) => w.length > 1 && !fillerWords.has(w));
}

/** True when a reminder's label only restates the note (most of its words are already in the title or text). */
export function isLabelRedundant(label: string, note: Pick<Note, 'title' | 'body'>): boolean {
  const words = meaningfulWords(label);
  if (words.length === 0) return true;
  const known = new Set(meaningfulWords(`${note.title} ${note.body}`));
  // A cut-off last word ("the ho…") counts if a known word starts with it.
  const isKnown = (w: string) => known.has(w) || [...known].some((k) => k.startsWith(w) && w.length >= 2);
  return words.filter(isKnown).length / words.length >= 0.6;
}

/** The notification: the label when it says something the title doesn't, otherwise the title with the note's text. */
export function notificationText(note: Note, reminder: Reminder): { title: string; body: string } {
  if (isLabelRedundant(reminder.label, note)) return { title: note.title, body: note.body };
  return { title: reminder.label, body: note.title };
}

export type NoteEdits = { title: string; body: string };

/**
 * Applies a user's edits. An empty title falls back to the body's first line. A reminder whose label was just
 * the old title follows the new one; labels the user or AI wrote on purpose stay as they are.
 */
export function editNote(note: Note, edits: NoteEdits): Note {
  const body = edits.body.trim();
  const title = edits.title.trim() || plainDraft(body).title || note.title;
  return {
    ...note,
    title,
    body,
    reminders: note.reminders.map((r) => (r.label === note.title ? { ...r, label: title } : r)),
  };
}

/** Reminders the server still has to send: changing the note means re-sending them with the new text. */
export function pendingPushReminders(note: Note, now: Date): Reminder[] {
  return note.reminders.filter((r) => r.delivery === 'push' && !r.isDone && new Date(r.at).getTime() > now.getTime());
}
