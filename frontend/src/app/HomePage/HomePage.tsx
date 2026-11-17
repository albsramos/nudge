import { NoteComposer, NoteList } from '@/features/notes';
import { NotificationPrompt, SettingsDialog } from '@/features/settings';
import styles from './HomePage.module.css';

export function HomePage() {
  return (
    <div className={styles.root}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Nudge</h1>
          <p className={styles.sub}>Say it or type it. Add “remind me…” to get a notification.</p>
        </div>
        <SettingsDialog />
      </header>
      <main className={styles.main}>
        <NoteComposer />
        <NotificationPrompt />
        <NoteList />
      </main>
    </div>
  );
}
