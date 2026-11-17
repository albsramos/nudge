import { cn } from '@/shared/lib/cn';
import styles from './Textarea.module.css';

export function Textarea({ className, ...rest }: React.ComponentProps<'textarea'>) {
  return <textarea className={cn(styles.root, className)} {...rest} />;
}
