// Formatting times for people: "in 2 h", "Tomorrow, 18:00". Pure; the locale comes from the runtime.

const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto', style: 'short' });

export function relativeTime(at: Date, now: Date): string {
  const diffMin = Math.round((at.getTime() - now.getTime()) / 60_000);
  const abs = Math.abs(diffMin);
  if (abs < 1) return 'now';
  if (abs < 60) return rtf.format(diffMin, 'minute');
  if (abs < 48 * 60) return rtf.format(Math.round(diffMin / 60), 'hour');
  return rtf.format(Math.round(diffMin / 1440), 'day');
}

export function absoluteTime(at: Date, now: Date): string {
  const sameYear = at.getFullYear() === now.getFullYear();
  return at.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: sameYear ? undefined : 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** The value for <input type="datetime-local">, in local time. */
export function toLocalInputValue(at: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${at.getFullYear()}-${pad(at.getMonth() + 1)}-${pad(at.getDate())}T${pad(at.getHours())}:${pad(at.getMinutes())}`;
}

/** "2026-11-17T18:00:00+01:00 (Europe/Lisbon, Tuesday)": what the model needs to resolve "tomorrow at 6". */
export function describeNow(now: Date, timeZone: string): string {
  const offsetMin = -now.getTimezoneOffset();
  const sign = offsetMin >= 0 ? '+' : '-';
  const pad = (n: number) => String(Math.floor(Math.abs(n))).padStart(2, '0');
  const offset = `${sign}${pad(offsetMin / 60)}:${pad(offsetMin % 60)}`;
  const weekday = now.toLocaleDateString('en-US', { weekday: 'long', timeZone });
  return `${toLocalInputValue(now)}:${pad(now.getSeconds())}${offset} (${timeZone}, ${weekday})`;
}
