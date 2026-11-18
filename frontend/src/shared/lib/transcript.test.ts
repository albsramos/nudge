import { mergePhrase, readResults } from './transcript';

const said = 'Remind me to repay Z’s manager PR at 9 AM today';

test('Chrome: each phrase once, in pieces', () => {
  expect(readResults([{ text: 'Remind me', isFinal: true }, { text: ' to repay', isFinal: true }])).toEqual({ finals: 'Remind me to repay', interim: '' });
});

test('iPhone: a finished phrase repeated', () => {
  expect(readResults([{ text: said, isFinal: true }, { text: said, isFinal: true }]).finals).toBe(said);
});

test('iPhone: the sentence so far, growing', () => {
  expect(
    readResults([
      { text: 'Remind me', isFinal: true },
      { text: 'Remind me to repay', isFinal: true },
      { text: said, isFinal: true },
    ]).finals,
  ).toBe(said);
});

test('a guess repeating the settled text adds nothing; a growing guess adds only its new words', () => {
  expect(readResults([{ text: said, isFinal: true }, { text: said, isFinal: false }])).toEqual({ finals: said, interim: '' });
  expect(readResults([{ text: 'Remind me', isFinal: true }, { text: 'Remind me to repay', isFinal: false }])).toEqual({
    finals: 'Remind me',
    interim: 'to repay',
  });
});

test('mergePhrase keeps different phrases', () => {
  expect(mergePhrase('Call mom', 'and buy milk')).toBe('Call mom and buy milk');
});
