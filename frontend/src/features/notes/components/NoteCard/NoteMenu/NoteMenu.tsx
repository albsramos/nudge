import { BellPlus, Ellipsis, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/shared/ui/Button/Button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/shared/ui/DropdownMenu/DropdownMenu';

type NoteMenuProps = {
  title: string;
  onEdit: () => void;
  onAddReminder: () => void;
  onDelete: () => void;
};

/** The note's actions behind one "⋯" button. */
export function NoteMenu({ title, onEdit, onAddReminder, onDelete }: NoteMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`Actions for “${title}”`}>
          <Ellipsis />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem onSelect={onEdit}>
          <Pencil aria-hidden /> Edit
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={onAddReminder}>
          <BellPlus aria-hidden /> Add reminder
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onSelect={onDelete}>
          <Trash2 aria-hidden /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
