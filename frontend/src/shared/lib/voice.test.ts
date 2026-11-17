import { act, renderHook } from '@testing-library/react';
import { SESSION_LIMIT_S, SILENCE_LIMIT_S, startVoice, stopVoice, useVoice } from './voice';

// A fake microphone: `loud` decides whether the analyser hears a voice.
let loud = false;
const track = { stop: vi.fn() };
let resolveMic: (() => void) | undefined;

class FakeAudioContext {
  sampleRate = 48000;
  resume = vi.fn(async () => {});
  close = vi.fn(async () => {});
  createMediaStreamSource = () => ({ connect: () => {} });
  createAnalyser = () => ({
    fftSize: 2048,
    frequencyBinCount: 1024,
    smoothingTimeConstant: 0,
    getByteFrequencyData: (a: Uint8Array) => a.fill(0),
    getByteTimeDomainData: (a: Uint8Array) => {
      for (let i = 0; i < a.length; i++) a[i] = loud ? (i % 2 ? 200 : 56) : 128;
    },
  });
}

function setVisibility(state: 'visible' | 'hidden') {
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => state });
  document.dispatchEvent(new Event('visibilitychange'));
}

beforeEach(() => {
  loud = false;
  track.stop.mockClear();
  resolveMic = undefined;
  vi.stubGlobal('AudioContext', FakeAudioContext);
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia: vi.fn(async () => ({ getTracks: () => [track] })) },
  });
  setVisibility('visible');
});

afterEach(() => {
  stopVoice();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function voice() {
  return renderHook(() => useVoice()).result;
}

test('leaving the app turns the mic off', async () => {
  const state = voice();
  await act(() => startVoice());
  expect(state.current.status).toBe('listening');

  act(() => setVisibility('hidden'));
  expect(state.current.status).toBe('idle');
  expect(state.current.stoppedBecause).toBe('background');
  expect(track.stop).toHaveBeenCalled();
});

test(`${SILENCE_LIMIT_S} seconds of silence turn the mic off, talking keeps it on`, async () => {
  vi.useFakeTimers();
  const state = voice();
  await act(() => startVoice());

  loud = true;
  act(() => vi.advanceTimersByTime((SILENCE_LIMIT_S + 5) * 1000));
  expect(state.current.status).toBe('listening');

  loud = false;
  act(() => vi.advanceTimersByTime((SILENCE_LIMIT_S + 1) * 1000));
  expect(state.current.status).toBe('idle');
  expect(state.current.stoppedBecause).toBe('silence');
  expect(track.stop).toHaveBeenCalled();
});

test(`the mic turns off after ${SESSION_LIMIT_S / 60} minutes even while talking`, async () => {
  vi.useFakeTimers();
  const state = voice();
  await act(() => startVoice());
  loud = true;
  act(() => vi.advanceTimersByTime((SESSION_LIMIT_S + 1) * 1000));
  expect(state.current.status).toBe('idle');
  expect(state.current.stoppedBecause).toBe('limit');
});

test('Stop while the mic is still opening releases it and never listens', async () => {
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: {
      getUserMedia: vi.fn(
        () => new Promise((resolve) => (resolveMic = () => resolve({ getTracks: () => [track] }))),
      ),
    },
  });
  const state = voice();
  let starting: Promise<void> = Promise.resolve();
  act(() => {
    starting = startVoice();
  });
  expect(state.current.status).toBe('starting');

  act(() => {
    stopVoice();
  });
  await act(async () => {
    resolveMic?.();
    await starting;
  });
  expect(state.current.status).toBe('idle');
  expect(track.stop).toHaveBeenCalled();
});
