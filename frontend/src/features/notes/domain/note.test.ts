import { draftFromExtraction, dueReminders, filterNotes, plainDraft, type Note, type Reminder } from './note';

const now = new Date('2026-11-17T12:00:00Z');

function reminder(overrides: Partial<Reminder>): Reminder {
  return { id: 'r', at: now.toISOString(), label: '', delivery: 'local', isDone: false, ...overrides };
}

function note(reminders: Reminder[], overrides: Partial<Note> = {}): Note {
  return { id: 'n', text: 't', title: 'Title', body: '', tags: [], reminders, createdAt: now.toISOString(), isAiProcessed: false, ...overrides };
}

describe('plainDraft', () => {
  test('uses the first line as the title', () => {
    expect(plainDraft('Groceries\nmilk\neggs')).toEqual({ title: 'Groceries', body: 'milk\neggs', tags: [], reminders: [] });
  });
});

describe('draftFromExtraction', () => {
  test('keeps future reminders in order and drops past, invalid and duplicate ones', () => {
    const draft = draftFromExtraction(
      {
        title: ' Call mom ',
        body: 'About the weekend',
        tags: ['#Family', 'family', ' calls '],
        reminders: [
          { at: '2026-11-18T18:00:00+01:00', label: 'Call mom' },
          { at: '2026-11-17T13:00:00Z', label: 'Soon' },
          { at: '2026-11-18T17:00:00Z', label: 'Duplicate time' },
          { at: '2026-11-16T09:00:00Z', label: 'Yesterday' },
          { at: 'not a date', label: 'Broken' },
        ],
      },
      'call mom',
      now,
    );
    expect(draft.title).toBe('Call mom');
    expect(draft.tags).toEqual(['family', 'calls']);
    expect(draft.reminders.map((r) => [r.at.toISOString(), r.label])).toEqual([
      ['2026-11-17T13:00:00.000Z', 'Soon'],
      ['2026-11-18T17:00:00.000Z', 'Call mom'],
    ]);
  });
});

describe('dueReminders', () => {
  const lastCheck = new Date(now.getTime() - 10_000);

  test('shows a local reminder that just fell due', () => {
    const due = dueReminders([note([reminder({ at: '2026-11-17T11:59:55Z' })])], now, lastCheck);
    expect(due.map((d) => d.isStale)).toEqual([false]);
  });

  test('catches up on a local reminder missed a few hours ago, but not a day ago', () => {
    const due = dueReminders(
      [note([reminder({ id: 'a', at: '2026-11-17T08:00:00Z' }), reminder({ id: 'b', at: '2026-11-16T08:00:00Z' })])],
      now,
      lastCheck,
    );
    expect(due.map((d) => [d.reminder.id, d.isStale])).toEqual([
      ['a', false],
      ['b', true],
    ]);
  });

  test('leaves push reminders that fell due while the app was closed to the server', () => {
    const due = dueReminders([note([reminder({ delivery: 'push', at: '2026-11-17T11:00:00Z' })])], now, lastCheck);
    expect(due.map((d) => d.isStale)).toEqual([true]);
  });

  test('ignores future and done reminders', () => {
    const due = dueReminders(
      [note([reminder({ at: '2026-11-17T13:00:00Z' }), reminder({ at: '2026-11-17T11:59:59Z', isDone: true })])],
      now,
      lastCheck,
    );
    expect(due).toEqual([]);
  });
});

test('filterNotes matches title, body and tags', () => {
  const notes = [note([], { id: '1', title: 'Dentist' }), note([], { id: '2', title: 'x', tags: ['health'] })];
  expect(filterNotes(notes, 'dent').map((n) => n.id)).toEqual(['1']);
  expect(filterNotes(notes, 'HEALTH').map((n) => n.id)).toEqual(['2']);
});
