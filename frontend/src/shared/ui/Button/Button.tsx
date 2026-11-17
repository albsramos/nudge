import { Slot } from 'radix-ui';
import { cn } from '@/shared/lib/cn';
import styles from './Button.module.css';

type ButtonProps = React.ComponentProps<'button'> & {
  variant?: 'default' | 'secondary' | 'outline' | 'ghost' | 'destructive';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  /** Render the child element (e.g. a link) with button styles, as shadcn's `asChild`. */
  isAsChild?: boolean;
};

export function Button({ variant = 'default', size = 'default', isAsChild = false, className, type = 'button', ...rest }: ButtonProps) {
  const Comp = isAsChild ? Slot.Root : 'button';
  return (
    <Comp
      type={isAsChild ? undefined : type}
      data-variant={variant}
      data-size={size}
      className={cn(styles.root, className)}
      {...rest}
    />
  );
}
