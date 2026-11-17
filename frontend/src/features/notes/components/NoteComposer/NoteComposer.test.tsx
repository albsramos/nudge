import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { NuqsTestingAdapter } from 'nuqs/adapters/testing';
import { updateSettings } from '@/shared/lib/settings';
import { server } from '@/test/setup';
import { notesStore } from '../../api/notesStore';
import { NoteList } from '../NoteList/NoteList';
import { NoteComposer } from './NoteComposer';

function renderComposer() {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <NuqsTestingAdapter>
        <NoteComposer />
        <NoteList />
      </NuqsTestingAdapter>
    </QueryClientProvider>,
  );
}

const inOneDay = new Date(Date.now() + 24 * 60 * 60_000);

function claudeReplies(json: object) {
  let body: { model?: string; output_config?: unknown } = {};
  server.use(
    http.post('https://api.anthropic.com/v1/messages', async ({ request }) => {
      body = (await request.json()) as typeof body;
      return HttpResponse.json({
        id: 'msg_1',
        type: 'message',
        role: 'assistant',
        model: 'claude-opus-5-5',
        content: [{ type: 'text', text: JSON.stringify(json) }],
        stop_reason: 'end_turn',
        stop_sequence: null,
        usage: { input_tokens: 10, output_tokens: 10 },
      });
    }),
  );
  return () => body;
}

beforeEach(() => {
  notesStore.set([]);
  updateSettings({ provider: 'anthropic', apiKey: 'sk-ant-test', model: '', serverUrl: '' });
});

test('turns "remind me" into a note with a reminder', async () => {
  const request = claudeReplies({
    title: 'Call mom',
    body: 'Ask about the weekend',
    tags: ['family'],
    reminders: [{ at: inOneDay.toISOString(), label: 'Call mom' }],
  });
  renderComposer();

  await userEvent.type(screen.getByLabelText('New note'), 'call mom about the weekend, remind me tomorrow');
  await userEvent.click(screen.getByRole('button', { name: 'Save note' }));

  expect(await screen.findByRole('heading', { name: 'Call mom' })).toBeInTheDocument();
  expect(screen.getByText('#family')).toBeInTheDocument();
  expect(await screen.findByRole('button', { name: /Remove reminder/ })).toBeInTheDocument();
  expect(request().model).toBe('claude-opus-5-5');
  expect(request().output_config).toMatchObject({ effort: 'low', format: { type: 'json_schema' } });
  expect(notesStore.get()[0]?.reminders[0]).toMatchObject({ delivery: 'local', label: 'Call mom', isDone: false });
});

test('saves the note as typed when the AI call fails', async () => {
  server.use(
    http.post('https://api.anthropic.com/v1/messages', () =>
      HttpResponse.json({ type: 'error', error: { type: 'authentication_error', message: 'invalid x-api-key' } }, { status: 401 }),
    ),
  );
  renderComposer();

  await userEvent.type(screen.getByLabelText('New note'), 'Pick up the parcel');
  await userEvent.click(screen.getByRole('button', { name: 'Save note' }));

  expect(await screen.findByRole('heading', { name: 'Pick up the parcel' })).toBeInTheDocument();
  expect(notesStore.get()[0]?.isAiProcessed).toBe(false);
});
