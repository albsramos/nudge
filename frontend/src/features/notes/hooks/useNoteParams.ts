import { parseAsString, useQueryState } from 'nuqs';

// Both live in the URL: the search survives a refresh, and a notification click opens ?note=<id>.
export const useNoteSearch = () => useQueryState('q', parseAsString.withDefault(''));
export const useFocusedNoteId = () => useQueryState('note');
