// A tiny external store backed by localStorage, read in components with useSyncExternalStore.
// Writes in another tab reach this one through the storage event.

export type Store<T> = {
  get: () => T;
  set: (next: T | ((prev: T) => T)) => void;
  subscribe: (listener: () => void) => () => void;
};

export function createStore<T>(key: string, fallback: T, parse: (raw: unknown) => T): Store<T> {
  const listeners = new Set<() => void>();
  let value = read();

  function read(): T {
    try {
      const raw = globalThis.localStorage?.getItem(key);
      return raw == null ? fallback : parse(JSON.parse(raw));
    } catch {
      return fallback;
    }
  }

  function emit() {
    for (const listener of listeners) listener();
  }

  globalThis.addEventListener?.('storage', (event: StorageEvent) => {
    if (event.key !== key) return;
    value = read();
    emit();
  });

  return {
    get: () => value,
    set(next) {
      value = typeof next === 'function' ? (next as (prev: T) => T)(value) : next;
      try {
        globalThis.localStorage?.setItem(key, JSON.stringify(value));
      } catch {
        // Storage full or blocked: keep the in-memory value for this session.
      }
      emit();
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
