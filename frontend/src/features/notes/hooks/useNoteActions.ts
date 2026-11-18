import { useMutation } from '@tanstack/react-query';
import { toast } from '@/shared/ui/Toaster/toast';
import { notesStore, removeNote, updateNote } from '../api/notesStore';
import { cancel, deliver } from '../api/remindersApi';
import { editNote as applyEdits, pendingPushReminders, type Note, type NoteEdits } from '../domain/note';

async function editNote({ noteId, ...edits }: NoteEdits & { noteId: string }) {
  const before = notesStore.get().find((n) => n.id === noteId);
  if (!before) return;
  const after = applyEdits(before, edits);
  updateNote(noteId, () => after);

  // The server holds each reminder's text until it's sent: swap the queued ones for the new wording.
  for (const reminder of pendingPushReminders(after, new Date())) {
    await cancel(reminder);
    const { warning, ...delivery } = await deliver(after, reminder);
    if (warning) toast.warning('Reminder is in-app only', { description: warning });
    updateNote(noteId, (n) => ({ ...n, reminders: n.reminders.map((r) => (r.id === reminder.id ? { ...r, ...delivery } : r)) }));
  }
}

async function deleteNote(note: Note) {
  removeNote(note.id);
  await Promise.all(note.reminders.map(cancel));
}

async function addReminder({ noteId, at, label }: { noteId: string; at: Date; label: string }) {
  const note = notesStore.get().find((n) => n.id === noteId);
  if (!note) return;
  const reminder = { id: crypto.randomUUID(), at: at.toISOString(), label: label.trim() };
  const { warning, ...delivery } = await deliver(note, reminder);
  if (warning) toast.warning('Reminder is in-app only', { description: warning });
  updateNote(noteId, (n) => ({
    ...n,
    reminders: [...n.reminders, { ...reminder, ...delivery, isDone: false }].sort((a, b) => a.at.localeCompare(b.at)),
  }));
}

async function removeReminder({ noteId, reminderId }: { noteId: string; reminderId: string }) {
  const reminder = notesStore.get().find((n) => n.id === noteId)?.reminders.find((r) => r.id === reminderId);
  updateNote(noteId, (n) => ({ ...n, reminders: n.reminders.filter((r) => r.id !== reminderId) }));
  if (reminder) await cancel(reminder);
}

export function useDeleteNote() {
  const mutation = useMutation({ mutationFn: deleteNote });
  return { ...mutation, deleteNote: mutation.mutate };
}

export function useAddReminder() {
  const mutation = useMutation({ mutationFn: addReminder });
  return { ...mutation, addReminder: mutation.mutateAsync };
}

export function useRemoveReminder() {
  const mutation = useMutation({ mutationFn: removeReminder });
  return { ...mutation, removeReminder: mutation.mutate };
}

export function useEditNote() {
  const mutation = useMutation({ mutationFn: editNote });
  return { ...mutation, editNote: mutation.mutateAsync };
}
