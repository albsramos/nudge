import { NotebookPen } from 'lucide-react';
import styles from './EmptyState.module.css';

type EmptyStateProps = {
  isSearching?: boolean;
};

export function EmptyState({ isSearching = false }: EmptyStateProps) {
  return (
    <div className={styles.root}>
      <NotebookPen className={styles.icon} aria-hidden />
      <p className={styles.title}>{isSearching ? 'No notes match your search' : 'No notes yet'}</p>
      {!isSearching && <p className={styles.text}>Tap the orb and say “Dentist on Friday, remind me Thursday at 7pm”.</p>}
    </div>
  );
}
