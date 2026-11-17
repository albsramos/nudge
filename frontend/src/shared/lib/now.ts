// The current time as a store, ticking every 30 s: renders stay pure and "in 5 min" stays true.
// iOS freezes timers while the app is in the background, so the clock also resets whenever the app
// becomes visible again and when the first component subscribes; otherwise it would count from when you left.
import { useSyncExternalStore } from 'react';

const tickMs = 30_000;
const listeners = new Set<() => void>();
let now = new Date();
let timer: ReturnType<typeof setInterval> | undefined;

function refresh() {
  now = new Date();
  for (const l of listeners) l();
}

function onVisible() {
  if (document.visibilityState === 'visible') refresh();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  if (!timer) {
    now = new Date();
    timer = setInterval(refresh, tickMs);
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('pageshow', refresh);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer) {
      clearInterval(timer);
      timer = undefined;
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('pageshow', refresh);
    }
  };
}

const getNow = () => now;

export function useNow(): Date {
  return useSyncExternalStore(subscribe, getNow, getNow);
}
