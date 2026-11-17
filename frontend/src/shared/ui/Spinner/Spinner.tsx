import { LoaderCircle } from 'lucide-react';
import { cn } from '@/shared/lib/cn';
import styles from './Spinner.module.css';

export function Spinner({ className, ...rest }: React.ComponentProps<'svg'>) {
  return <LoaderCircle role="status" aria-label="Loading" className={cn(styles.root, className)} {...rest} />;
}
