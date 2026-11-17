import styles from './ListeningBar.module.css';

type ListeningBarProps = {
  isStarting: boolean;
  onStop: () => void;
};

/** Pinned to the top of the screen for as long as the microphone is on, whatever is scrolled into view. */
export function ListeningBar({ isStarting, onStop }: ListeningBarProps) {
  return (
    <div className={styles.root} role="status" aria-live="polite">
      <span className={styles.dot} aria-hidden="true" />
      <span className={styles.text}>
        <b>{isStarting ? 'Opening the microphone…' : 'Listening'}</b>
        <span className={styles.sub}>Turns off when you go quiet or leave</span>
      </span>
      <button type="button" className={styles.stop} onClick={onStop}>
        Stop
      </button>
    </div>
  );
}
