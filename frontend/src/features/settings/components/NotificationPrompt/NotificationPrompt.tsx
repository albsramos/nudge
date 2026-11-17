import { BellRing, Share } from 'lucide-react';
import { askForNotifications, useNotificationPermission } from '@/shared/lib/permission';
import { isStandalone } from '@/shared/lib/push';
import { Button } from '@/shared/ui/Button/Button';
import styles from './NotificationPrompt.module.css';

const isIos = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);

/** Asks for notification permission, which browsers only grant from a click. */
export function NotificationPrompt() {
  const permission = useNotificationPermission();

  if (isIos && !isStandalone()) {
    return (
      <aside className={styles.root}>
        <Share aria-hidden />
        <p className={styles.text}>
          To get reminders on iPhone, tap <strong>Share → Add to Home Screen</strong>, then open Nudge from there.
        </p>
      </aside>
    );
  }
  if (permission === 'granted') return null;
  if (permission === 'unsupported') {
    return (
      <aside className={styles.root}>
        <p className={styles.text}>This browser can't show notifications, so reminders won't ring.</p>
      </aside>
    );
  }
  if (permission === 'denied') {
    return (
      <aside className={styles.root} data-tone="warning">
        <p className={styles.text}>Notifications are blocked. Allow them in your browser's site settings to get reminders.</p>
      </aside>
    );
  }
  return (
    <aside className={styles.root}>
      <BellRing aria-hidden />
      <p className={styles.text}>Turn on notifications so reminders can reach you.</p>
      <Button size="sm" onClick={() => void askForNotifications()}>
        Turn on
      </Button>
    </aside>
  );
}
