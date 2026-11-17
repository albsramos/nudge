import { Search } from 'lucide-react';
import { Input } from '@/shared/ui/Input/Input';
import { useNoteSearch } from '../../../hooks/useNoteParams';
import styles from './SearchField.module.css';

export function SearchField() {
  const [query, setQuery] = useNoteSearch();

  return (
    <div className={styles.root}>
      <Search className={styles.icon} aria-hidden />
      <Input
        type="search"
        aria-label="Search notes"
        placeholder="Search notes"
        value={query}
        onChange={(event) => void setQuery(event.target.value || null)}
        className={styles.input}
      />
    </div>
  );
}
