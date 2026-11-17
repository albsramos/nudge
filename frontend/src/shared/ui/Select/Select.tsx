// shadcn's Select over Radix: <Select><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>…</SelectContent></Select>.
import { Check, ChevronDown } from 'lucide-react';
import { Select as SelectPrimitive } from 'radix-ui';
import { cn } from '@/shared/lib/cn';
import styles from './Select.module.css';

export function SelectTrigger({ className, children, ...rest }: React.ComponentProps<typeof SelectPrimitive.Trigger>) {
  return (
    <SelectPrimitive.Trigger className={cn(styles.trigger, className)} {...rest}>
      {children}
      <SelectPrimitive.Icon asChild>
        <ChevronDown className={styles.icon} />
      </SelectPrimitive.Icon>
    </SelectPrimitive.Trigger>
  );
}

export function SelectContent({ className, children, ...rest }: React.ComponentProps<typeof SelectPrimitive.Content>) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content position="popper" sideOffset={4} className={cn(styles.content, className)} {...rest}>
        <SelectPrimitive.Viewport className={styles.viewport}>{children}</SelectPrimitive.Viewport>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  );
}

export function SelectItem({ className, children, ...rest }: React.ComponentProps<typeof SelectPrimitive.Item>) {
  return (
    <SelectPrimitive.Item className={cn(styles.item, className)} {...rest}>
      <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator className={styles.indicator}>
        <Check />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  );
}

export function Select(props: React.ComponentProps<typeof SelectPrimitive.Root>) {
  return <SelectPrimitive.Root {...props} />;
}

export function SelectValue(props: React.ComponentProps<typeof SelectPrimitive.Value>) {
  return <SelectPrimitive.Value {...props} />;
}
