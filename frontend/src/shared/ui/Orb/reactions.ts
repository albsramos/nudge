// The orb's one-off reactions, from Stack: a spin, a flick of light, a pulse, a burst of dust, or a re-form.

export type Reaction = {
  kind: 'spin' | 'flick' | 'pulse' | 'burst' | 'reform';
  start: number;
  ms: number;
  dir: 1 | -1;
  speed: number;
  angle: number;
  amount: number;
};

const kinds: Reaction['kind'][] = ['spin', 'flick', 'pulse', 'burst', 'reform'];
const rand = (a: number, b: number) => a + Math.random() * (b - a);

/** A random reaction, never the same kind twice in a row. Rapid taps get gentler ones. */
export function pickReaction(last: Reaction['kind'] | null, isRapid: boolean): Reaction {
  const options = kinds.filter((k) => k !== last && !(isRapid && k === 'reform'));
  const kind = options[Math.floor(Math.random() * options.length)];
  const soft = isRapid ? 0.65 : 1;
  const base = { kind, start: 0, dir: (Math.random() < 0.5 ? 1 : -1) as 1 | -1, speed: 1, angle: 0, amount: 0 };
  switch (kind) {
    case 'spin':
      return { ...base, ms: rand(350, 650), speed: rand(0.9, 1.9) * soft };
    case 'flick':
      return { ...base, ms: rand(380, 650), angle: rand(-Math.PI, Math.PI) };
    case 'pulse':
      return { ...base, ms: rand(220, 380), amount: rand(0.45, 0.8) * soft };
    case 'burst':
      return { ...base, ms: 600, amount: rand(0.6, 1) * soft };
    case 'reform':
      return { ...base, ms: 700, amount: rand(0.35, 0.6) };
  }
}
