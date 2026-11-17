// Public API of the notes feature. Code outside the feature imports only from here.
export { NoteComposer } from './components/NoteComposer/NoteComposer';
export { NoteList } from './components/NoteList/NoteList';
export { startReminderClock } from './lib/reminderClock';
export type { Note } from './domain/note';
