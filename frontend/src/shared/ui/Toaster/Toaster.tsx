// shadcn's toasts are sonner, styled like Stack's: a quiet card, top centre. Show one with `toast('…')` from './toast'.
import { Toaster as Sonner } from 'sonner';
import styles from './Toaster.module.css';

export function Toaster() {
  return (
    <Sonner
      theme="system"
      position="top-center"
      toastOptions={{ unstyled: true, classNames: { toast: styles.toast, title: styles.title, description: styles.description, icon: styles.icon } }}
    />
  );
}
