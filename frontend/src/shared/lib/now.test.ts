import { act, renderHook } from '@testing-library/react';
import { useNow } from './now';

test('the clock catches up when the app comes back to the foreground', () => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-11-17T21:59:00Z'));
  const { result } = renderHook(() => useNow());
  // Backgrounded: time moves on, but iOS fires no timers.
  vi.setSystemTime(new Date('2026-11-17T22:02:00Z'));
  act(() => {
    document.dispatchEvent(new Event('visibilitychange'));
  });
  expect(result.current.toISOString()).toBe('2026-11-17T22:02:00.000Z');
  vi.useRealTimers();
});
