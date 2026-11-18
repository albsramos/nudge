// Turning a speech recognizer's results into one transcript. Pure, so it's testable without a mic.
//
// Browsers report results differently. Chrome sends each new phrase once. iPhone sometimes repeats a finished
// phrase, or sends the whole sentence so far as each new result. Merging handles all three.

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();

/** Adds `next` to `text`: replaces it if `next` continues it, skips `next` if `text` already ends with it. */
export function mergePhrase(text: string, next: string): string {
  const a = text.trim();
  const b = next.trim();
  if (!b) return a;
  if (!a) return b;
  const na = norm(a);
  const nb = norm(b);
  if (nb.startsWith(na)) return b; // the whole sentence so far, grown
  if (na.endsWith(nb) || na.includes(nb)) return a; // a repeat
  return `${a} ${b}`;
}

export type RecognitionResult = { text: string; isFinal: boolean };

/** All of a recognizer run's results so far → its settled text and the part still being guessed. */
export function readResults(results: readonly RecognitionResult[]): { finals: string; interim: string } {
  let finals = '';
  let interim = '';
  for (const r of results) {
    if (r.isFinal) finals = mergePhrase(finals, r.text);
    else interim = mergePhrase(interim, r.text);
  }
  // A guess that only repeats what's settled adds nothing.
  if (interim && mergePhrase(finals, interim) === finals) interim = '';
  else if (interim && norm(interim).startsWith(norm(finals)) && finals) interim = interim.trim().slice(finals.trim().length).trim();
  return { finals, interim };
}
