import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NuqsTestingAdapter } from 'nuqs/adapters/testing';
import { notesStore } from '../../api/notesStore';
import type { Note } from '../../domain/note';
import { NoteList } from '../NoteList/NoteList';

const note: Note = {
  id: 'n1',
  text: 'look into home pitch perfect designs at 9',
  title: 'Look into home pitch perfect designs',
  body: '',
  tags: ['design'],
  reminders: [],
  createdAt: '2026-11-18T07:22:00Z',
  isAiProcessed: true,
};

function renderList() {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <NuqsTestingAdapter>
        <NoteList />
      </NuqsTestingAdapter>
    </QueryClientProvider>,
  );
}

test('edits a note’s title and text', async () => {
  notesStore.set([note]);
  renderList();

  await userEvent.click(screen.getByRole('button', { name: /Edit “Look into home pitch perfect designs”/ }));
  const title = screen.getByLabelText('Title');
  await userEvent.clear(title);
  await userEvent.type(title, 'Review Pitch Perfect home designs');
  await userEvent.type(screen.getByLabelText('Note'), 'Check the hero and pricing sections');
  await userEvent.click(screen.getByRole('button', { name: 'Save' }));

  expect(await screen.findByRole('heading', { name: 'Review Pitch Perfect home designs' })).toBeInTheDocument();
  expect(screen.getByText('Check the hero and pricing sections')).toBeInTheDocument();
  expect(notesStore.get()[0]).toMatchObject({ title: 'Review Pitch Perfect home designs', body: 'Check the hero and pricing sections' });
});

test('cancel leaves the note as it was', async () => {
  notesStore.set([note]);
  renderList();

  await userEvent.click(screen.getByRole('button', { name: /Edit “/ }));
  await userEvent.type(screen.getByLabelText('Title'), ' changed');
  await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));

  expect(notesStore.get()[0].title).toBe('Look into home pitch perfect designs');
});
