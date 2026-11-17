// shadcn's Card: <Card><CardHeader><CardTitle /></CardHeader><CardContent /></Card>.
import { cn } from '@/shared/lib/cn';
import styles from './Card.module.css';

type DivProps = React.ComponentProps<'div'>;

export function Card({ className, ...rest }: DivProps) {
  return <div className={cn(styles.root, className)} {...rest} />;
}

export function CardHeader({ className, ...rest }: DivProps) {
  return <div className={cn(styles.header, className)} {...rest} />;
}

export function CardTitle({ className, ...rest }: React.ComponentProps<'h3'>) {
  return <h3 className={cn(styles.title, className)} {...rest} />;
}

export function CardDescription({ className, ...rest }: React.ComponentProps<'p'>) {
  return <p className={cn(styles.description, className)} {...rest} />;
}

export function CardAction({ className, ...rest }: DivProps) {
  return <div className={cn(styles.action, className)} {...rest} />;
}

export function CardContent({ className, ...rest }: DivProps) {
  return <div className={cn(styles.content, className)} {...rest} />;
}

export function CardFooter({ className, ...rest }: DivProps) {
  return <div className={cn(styles.footer, className)} {...rest} />;
}
