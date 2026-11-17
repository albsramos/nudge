// The current time as a store, ticking every 30 s: renders stay pure and "in 5 min" stays true.
import { useSyncExternalStore } from 'react';

const tickMs = 30_000;
const listeners = new Set<() => void>();
let now = new Date();
let timer: ReturnType<typeof setInterval> | undefined;

function subscribe(listener: () => void) {
  listeners.add(listener);
  timer ??= setInterval(() => {
    now = new Date();
    for (const l of listeners) l();
  }, tickMs);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer) {
      clearInterval(timer);
      timer = undefined;
    }
  };
}

const getNow = () => now;

export function useNow(): Date {
  return useSyncExternalStore(subscribe, getNow, getNow);
}
