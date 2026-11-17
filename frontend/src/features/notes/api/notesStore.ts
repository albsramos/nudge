// Notes live on this device only (localStorage), so they work offline and the AI key's output stays private.
import { createStore } from '@/shared/lib/createStore';
import type { Note } from '../domain/note';

export const notesStore = createStore<Note[]>('nudge.notes', [], (raw) =>
  Array.isArray(raw) ? (raw as Note[]).filter((n) => typeof n?.id === 'string' && Array.isArray(n.reminders)) : [],
);

export function saveNote(note: Note) {
  notesStore.set((notes) => [note, ...notes.filter((n) => n.id !== note.id)]);
}

export function updateNote(id: string, update: (note: Note) => Note) {
  notesStore.set((notes) => notes.map((n) => (n.id === id ? update(n) : n)));
}

export function removeNote(id: string) {
  notesStore.set((notes) => notes.filter((n) => n.id !== id));
}
