import { cn } from '@/shared/lib/cn';
import styles from './Input.module.css';

export function Input({ className, ...rest }: React.ComponentProps<'input'>) {
  return <input className={cn(styles.root, className)} {...rest} />;
}
