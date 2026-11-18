import { Sparkles } from 'lucide-react';
import { useState } from 'react';
import { useNow } from '@/shared/lib/now';
import { Badge } from '@/shared/ui/Badge/Badge';
import { Card, CardAction, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/shared/ui/Card/Card';
import { isLabelRedundant, type Note } from '../../domain/note';
import { absoluteTime } from '../../domain/time';
import { useFocusedNoteId } from '../../hooks/useNoteParams';
import { useDeleteNote, useRemoveReminder } from '../../hooks/useNoteActions';
import { AddReminderDialog } from './AddReminderDialog/AddReminderDialog';
import { EditNoteDialog } from './EditNoteDialog/EditNoteDialog';
import { NoteMenu } from './NoteMenu/NoteMenu';
import styles from './NoteCard.module.css';
import { ReminderChip } from './ReminderChip/ReminderChip';

type NoteCardProps = {
  note: Note;
};

export function NoteCard({ note }: NoteCardProps) {
  const [focusedId] = useFocusedNoteId();
  const { deleteNote } = useDeleteNote();
  const { removeReminder } = useRemoveReminder();
  const isFocused = focusedId === note.id;
  const now = useNow();
  // Which sheet the menu opened. Local: only this card's pieces use it.
  const [sheet, setSheet] = useState<'edit' | 'reminder' | null>(null);
  const closeSheet = (isOpen: boolean) => !isOpen && setSheet(null);

  // Opened from a notification: bring the note into view.
  function focusRef(node: HTMLElement | null) {
    if (node && isFocused) node.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }

  return (
    <Card className={styles.root} data-focused={isFocused} ref={isFocused ? focusRef : undefined}>
      <CardHeader>
        <CardTitle>{note.title}</CardTitle>
        <CardDescription className={styles.meta}>
          <time dateTime={note.createdAt}>{absoluteTime(new Date(note.createdAt), now)}</time>
          {note.isAiProcessed && <Sparkles aria-label="Organised by AI" />}
        </CardDescription>
        <CardAction>
          <NoteMenu
            title={note.title}
            onEdit={() => setSheet('edit')}
            onAddReminder={() => setSheet('reminder')}
            onDelete={() => deleteNote(note)}
          />
          <EditNoteDialog note={note} isOpen={sheet === 'edit'} onOpenChange={closeSheet} />
          <AddReminderDialog noteId={note.id} isOpen={sheet === 'reminder'} onOpenChange={closeSheet} />
        </CardAction>
      </CardHeader>
      {(note.body || note.tags.length > 0) && (
        <CardContent className={styles.content}>
          {note.body && <p className={styles.body}>{note.body}</p>}
          {note.tags.length > 0 && (
            <div className={styles.tags}>
              {note.tags.map((tag) => (
                <Badge key={tag} variant="secondary">
                  #{tag}
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      )}
      {note.reminders.length > 0 && (
        <CardFooter>
          {note.reminders.map((reminder) => (
            <ReminderChip
              key={reminder.id}
              reminder={reminder}
              now={now}
              isLabelHidden={isLabelRedundant(reminder.label, note)}
              onRemove={() => removeReminder({ noteId: note.id, reminderId: reminder.id })}
            />
          ))}
        </CardFooter>
      )}
    </Card>
  );
}
