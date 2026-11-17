import { cn } from '@/shared/lib/cn';
import styles from './Badge.module.css';

type BadgeProps = React.ComponentProps<'span'> & {
  variant?: 'default' | 'secondary' | 'outline' | 'destructive';
};

export function Badge({ variant = 'default', className, ...rest }: BadgeProps) {
  return <span data-variant={variant} className={cn(styles.root, className)} {...rest} />;
}
