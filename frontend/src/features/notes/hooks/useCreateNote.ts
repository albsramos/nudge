import { useMutation } from '@tanstack/react-query';
import { getSettings, isAiConfigured } from '@/shared/lib/settings';
import { toast } from '@/shared/ui/Toaster/toast';
import { extractNote } from '../api/extractNote';
import { saveNote } from '../api/notesStore';
import { deliver } from '../api/remindersApi';
import { plainDraft, type Note, type NoteDraft } from '../domain/note';
import { absoluteTime } from '../domain/time';

/** Writes a note: AI structures it (if configured), it's saved at once, then its reminders are scheduled. */
async function createNote(text: string): Promise<Note> {
  const settings = getSettings();
  let draft: NoteDraft = plainDraft(text);
  let isAiProcessed = false;
  if (isAiConfigured(settings)) {
    try {
      draft = await extractNote(settings, text);
      isAiProcessed = true;
    } catch (error) {
      toast.warning('Saved without AI', { description: error instanceof Error ? error.message : String(error) });
    }
  }

  const note: Note = {
    id: crypto.randomUUID(),
    text,
    title: draft.title,
    body: draft.body,
    tags: draft.tags,
    createdAt: new Date().toISOString(),
    isAiProcessed,
    reminders: [],
  };
  // Save first so the note is never lost to a failing reminder server.
  saveNote(note);

  const reminders: Note['reminders'] = [];
  for (const r of draft.reminders) {
    const reminder = { id: crypto.randomUUID(), at: r.at.toISOString(), label: r.label };
    const { warning, ...delivery } = await deliver(note, reminder);
    if (warning) toast.warning('Reminder is in-app only', { description: warning });
    reminders.push({ ...reminder, ...delivery, isDone: false });
  }
  const saved = { ...note, reminders };
  if (reminders.length > 0) {
    saveNote(saved);
    const when = reminders.map((r) => absoluteTime(new Date(r.at), new Date())).join(', ');
    toast.success(`Reminder set: ${when}`);
  }
  return saved;
}

export function useCreateNote() {
  const mutation = useMutation({ mutationFn: createNote });
  return { ...mutation, createNote: mutation.mutateAsync };
}
