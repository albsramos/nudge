import { Bell, BellOff, Cloud, Smartphone, X } from 'lucide-react';
import type { Reminder } from '../../../domain/note';
import { absoluteTime, relativeTime } from '../../../domain/time';
import styles from './ReminderChip.module.css';

type ReminderChipProps = {
  reminder: Reminder;
  now: Date;
  /** Hide the label when it only repeats the note's title. */
  isLabelHidden?: boolean;
  onRemove: () => void;
};

export function ReminderChip({ reminder, now, isLabelHidden = false, onRemove }: ReminderChipProps) {
  const at = new Date(reminder.at);
  const isPush = reminder.delivery === 'push';
  const deliveryText = isPush ? 'Push: arrives even when the app is closed' : 'In-app: rings only while the app is open';

  return (
    <span className={styles.root} data-done={reminder.isDone}>
      {reminder.isDone ? <BellOff aria-hidden /> : <Bell aria-hidden />}
      <time dateTime={reminder.at} title={absoluteTime(at, now)}>
        {absoluteTime(at, now)}
        {!reminder.isDone && <span className={styles.relative}> · {relativeTime(at, now)}</span>}
      </time>
      {reminder.label && !isLabelHidden && <span className={styles.label}>{reminder.label}</span>}
      {isPush ? <Cloud aria-label={deliveryText} /> : <Smartphone aria-label={deliveryText} />}
      <button type="button" className={styles.remove} aria-label={`Remove reminder ${absoluteTime(at, now)}`} onClick={onRemove}>
        <X aria-hidden />
      </button>
    </span>
  );
}
