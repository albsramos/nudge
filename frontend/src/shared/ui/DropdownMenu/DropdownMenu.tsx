// shadcn's DropdownMenu over Radix: keyboard navigation, focus return and aria wiring come from the primitive.
// <DropdownMenu><DropdownMenuTrigger asChild>…</DropdownMenuTrigger><DropdownMenuContent><DropdownMenuItem /></DropdownMenuContent></DropdownMenu>
import { DropdownMenu as MenuPrimitive } from 'radix-ui';
import { cn } from '@/shared/lib/cn';
import styles from './DropdownMenu.module.css';

/** Non-modal, so a dialog opened from an item gets focus and pointer events cleanly. */
export function DropdownMenu(props: React.ComponentProps<typeof MenuPrimitive.Root>) {
  return <MenuPrimitive.Root modal={false} {...props} />;
}

export function DropdownMenuTrigger(props: React.ComponentProps<typeof MenuPrimitive.Trigger>) {
  return <MenuPrimitive.Trigger {...props} />;
}

export function DropdownMenuContent({ className, ...rest }: React.ComponentProps<typeof MenuPrimitive.Content>) {
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Content align="end" sideOffset={4} className={cn(styles.content, className)} {...rest} />
    </MenuPrimitive.Portal>
  );
}

type DropdownMenuItemProps = React.ComponentProps<typeof MenuPrimitive.Item> & {
  variant?: 'default' | 'destructive';
};

export function DropdownMenuItem({ variant = 'default', className, ...rest }: DropdownMenuItemProps) {
  return <MenuPrimitive.Item data-variant={variant} className={cn(styles.item, className)} {...rest} />;
}

export function DropdownMenuSeparator({ className, ...rest }: React.ComponentProps<typeof MenuPrimitive.Separator>) {
  return <MenuPrimitive.Separator className={cn(styles.separator, className)} {...rest} />;
}
