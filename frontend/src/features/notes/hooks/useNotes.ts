import { useSyncExternalStore } from 'react';
import { notesStore } from '../api/notesStore';

export function useNotes() {
  return useSyncExternalStore(notesStore.subscribe, notesStore.get, notesStore.get);
}
