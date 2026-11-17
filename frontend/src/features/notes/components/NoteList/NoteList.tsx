import { filterNotes, sortNotes } from '../../domain/note';
import { useNoteSearch } from '../../hooks/useNoteParams';
import { useNotes } from '../../hooks/useNotes';
import { NoteCard } from '../NoteCard/NoteCard';
import { EmptyState } from './EmptyState/EmptyState';
import styles from './NoteList.module.css';
import { SearchField } from './SearchField/SearchField';

export function NoteList() {
  const notes = useNotes();
  const [query] = useNoteSearch();
  const visible = filterNotes(sortNotes(notes), query);

  return (
    <section className={styles.root} aria-label="Notes">
      {notes.length > 0 && <SearchField />}
      {visible.length === 0 ? (
        <EmptyState isSearching={notes.length > 0} />
      ) : (
        <ul className={styles.list}>
          {visible.map((note) => (
            <li key={note.id}>
              <NoteCard note={note} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
