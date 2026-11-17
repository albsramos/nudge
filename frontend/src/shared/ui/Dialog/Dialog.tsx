// shadcn's Dialog over Radix: focus trap, Escape, scroll lock and aria wiring come from the primitive.
import { X } from 'lucide-react';
import { Dialog as DialogPrimitive } from 'radix-ui';
import { cn } from '@/shared/lib/cn';
import styles from './Dialog.module.css';

export function DialogContent({ className, children, ...rest }: React.ComponentProps<typeof DialogPrimitive.Content>) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className={styles.overlay} />
      <DialogPrimitive.Content className={cn(styles.content, className)} {...rest}>
        {children}
        <DialogPrimitive.Close className={styles.close} aria-label="Close">
          <X />
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  );
}

export function DialogHeader({ className, ...rest }: React.ComponentProps<'div'>) {
  return <div className={cn(styles.header, className)} {...rest} />;
}

export function DialogFooter({ className, ...rest }: React.ComponentProps<'div'>) {
  return <div className={cn(styles.footer, className)} {...rest} />;
}

export function DialogTitle({ className, ...rest }: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return <DialogPrimitive.Title className={cn(styles.title, className)} {...rest} />;
}

export function DialogDescription({ className, ...rest }: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return <DialogPrimitive.Description className={cn(styles.description, className)} {...rest} />;
}

export function Dialog(props: React.ComponentProps<typeof DialogPrimitive.Root>) {
  return <DialogPrimitive.Root {...props} />;
}

export function DialogTrigger(props: React.ComponentProps<typeof DialogPrimitive.Trigger>) {
  return <DialogPrimitive.Trigger {...props} />;
}

export function DialogClose(props: React.ComponentProps<typeof DialogPrimitive.Close>) {
  return <DialogPrimitive.Close {...props} />;
}
