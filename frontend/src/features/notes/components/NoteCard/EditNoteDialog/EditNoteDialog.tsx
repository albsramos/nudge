import { Pencil } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/shared/ui/Button/Button';
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/shared/ui/Dialog/Dialog';
import { Input } from '@/shared/ui/Input/Input';
import { Label } from '@/shared/ui/Label/Label';
import { Textarea } from '@/shared/ui/Textarea/Textarea';
import type { Note } from '../../../domain/note';
import { useEditNote } from '../../../hooks/useNoteActions';
import styles from './EditNoteDialog.module.css';

type EditNoteDialogProps = {
  note: Note;
};

export function EditNoteDialog({ note }: EditNoteDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { editNote, isPending } = useEditNote();

  // The form starts from the note each time it opens (it remounts), so there's nothing to keep in sync.
  async function handleAction(formData: FormData) {
    await editNote({ noteId: note.id, title: String(formData.get('title') ?? ''), body: String(formData.get('body') ?? '') });
    setIsOpen(false);
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`Edit “${note.title}”`}>
          <Pencil />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit note</DialogTitle>
          <DialogDescription>Upcoming reminders will show the new text.</DialogDescription>
        </DialogHeader>
        <form action={handleAction} className={styles.form}>
          <div className={styles.field}>
            <Label htmlFor={`title-${note.id}`}>Title</Label>
            <Input id={`title-${note.id}`} name="title" defaultValue={note.title} maxLength={120} autoComplete="off" />
          </div>
          <div className={styles.field}>
            <Label htmlFor={`body-${note.id}`}>Note</Label>
            <Textarea id={`body-${note.id}`} name="body" defaultValue={note.body} maxLength={4000} rows={4} className={styles.body} />
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button type="submit" disabled={isPending}>
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
