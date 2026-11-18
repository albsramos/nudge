import { useNow } from '@/shared/lib/now';
import { Button } from '@/shared/ui/Button/Button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/shared/ui/Dialog/Dialog';
import { Input } from '@/shared/ui/Input/Input';
import { Label } from '@/shared/ui/Label/Label';
import { toLocalInputValue } from '../../../domain/time';
import { useAddReminder } from '../../../hooks/useNoteActions';
import styles from './AddReminderDialog.module.css';

type AddReminderDialogProps = {
  noteId: string;
  isOpen?: boolean;
  onOpenChange: (isOpen: boolean) => void;
};

function inAnHour(now: Date): string {
  const at = new Date(now.getTime() + 60 * 60_000);
  at.setMinutes(Math.ceil(at.getMinutes() / 5) * 5, 0, 0);
  return toLocalInputValue(at);
}

export function AddReminderDialog({ noteId, isOpen = false, onOpenChange }: AddReminderDialogProps) {
  const { addReminder, isPending } = useAddReminder();
  const now = useNow();

  async function handleAction(formData: FormData) {
    const at = new Date(String(formData.get('at')));
    if (Number.isNaN(at.getTime())) return;
    await addReminder({ noteId, at, label: String(formData.get('label') ?? '') });
    onOpenChange(false);
  }

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add a reminder</DialogTitle>
          <DialogDescription>You'll get a notification at this time.</DialogDescription>
        </DialogHeader>
        <form action={handleAction} className={styles.form}>
          <div className={styles.field}>
            <Label htmlFor={`at-${noteId}`}>When</Label>
            <Input id={`at-${noteId}`} name="at" type="datetime-local" required defaultValue={inAnHour(now)} min={toLocalInputValue(now)} />
          </div>
          <div className={styles.field}>
            <Label htmlFor={`label-${noteId}`}>Notification text</Label>
            <Input id={`label-${noteId}`} name="label" placeholder="Same as the title" maxLength={200} />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="submit" disabled={isPending}>
              Set reminder
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
