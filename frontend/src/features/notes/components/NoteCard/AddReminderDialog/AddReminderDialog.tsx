import { BellPlus } from 'lucide-react';
import { useState } from 'react';
import { useNow } from '@/shared/lib/now';
import { Button } from '@/shared/ui/Button/Button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/shared/ui/Dialog/Dialog';
import { Input } from '@/shared/ui/Input/Input';
import { Label } from '@/shared/ui/Label/Label';
import { toLocalInputValue } from '../../../domain/time';
import { useAddReminder } from '../../../hooks/useNoteActions';
import styles from './AddReminderDialog.module.css';

type AddReminderDialogProps = {
  noteId: string;
  defaultLabel: string;
};

function inAnHour(now: Date): string {
  const at = new Date(now.getTime() + 60 * 60_000);
  at.setMinutes(Math.ceil(at.getMinutes() / 5) * 5, 0, 0);
  return toLocalInputValue(at);
}

export function AddReminderDialog({ noteId, defaultLabel }: AddReminderDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { addReminder, isPending } = useAddReminder();
  const now = useNow();

  async function handleAction(formData: FormData) {
    const at = new Date(String(formData.get('at')));
    if (Number.isNaN(at.getTime())) return;
    await addReminder({ noteId, at, label: String(formData.get('label') ?? '') });
    setIsOpen(false);
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Add reminder">
          <BellPlus />
        </Button>
      </DialogTrigger>
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
            <Input id={`label-${noteId}`} name="label" defaultValue={defaultLabel} maxLength={200} />
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
