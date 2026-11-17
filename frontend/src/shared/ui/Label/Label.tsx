import { Label as LabelPrimitive } from 'radix-ui';
import { cn } from '@/shared/lib/cn';
import styles from './Label.module.css';

export function Label({ className, ...rest }: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return <LabelPrimitive.Root className={cn(styles.root, className)} {...rest} />;
}
