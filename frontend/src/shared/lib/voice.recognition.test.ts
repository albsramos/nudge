// Speech recognition the way Safari treats it: start() only works inside the tap, before anything is awaited.
import { act, renderHook } from '@testing-library/react';

let inTap = false;
let instance: FakeRecognition | undefined;
const track = { stop: vi.fn() };
/** Like iPhone: one recognizer holds the mic at a time, until it has fully ended. */
const mic: { holder?: FakeRecognition } = {};
/** Whether the analyser opened the mic before transcription had it (that makes transcription fail on iPhone). */
let analyserCutIn = false;

class FakeRecognition {
  lang = '';
  continuous = false;
  interimResults = false;
  onresult: ((e: unknown) => void) | null = null;
  onerror: ((e: { error: string }) => void) | null = null;
  onend: (() => void) | null = null;
  onaudiostart: (() => void) | null = null;
  isRunning = false;
  hasAudio = false;
  start() {
    if (!inTap) throw new DOMException('not allowed outside a user gesture', 'NotAllowedError');
    if (mic.holder && mic.holder !== this) throw new DOMException('recognition already started', 'InvalidStateError');
    mic.holder = this;
    this.isRunning = true;
    queueMicrotask(() => {
      this.hasAudio = true;
      this.onaudiostart?.();
    });
  }
  /** Stopping is slow: it keeps the mic until onend, like the real thing. */
  stop() {
    this.isRunning = false;
  }
  abort() {
    this.end();
  }
  end() {
    this.isRunning = false;
    if (mic.holder === this) mic.holder = undefined;
    this.onend?.();
  }
  say(text: string, isFinal: boolean) {
    const result = Object.assign([{ transcript: text }], { isFinal });
    this.onresult?.({ resultIndex: 0, results: [result] });
  }
}

class FakeAudioContext {
  sampleRate = 48000;
  resume = async () => {};
  close = async () => {};
  createMediaStreamSource = () => ({ connect: () => {} });
  createAnalyser = () => ({
    fftSize: 2048,
    frequencyBinCount: 1024,
    smoothingTimeConstant: 0,
    getByteFrequencyData: (a: Uint8Array) => a.fill(0),
    getByteTimeDomainData: (a: Uint8Array) => a.fill(128),
  });
}

async function loadVoice() {
  vi.resetModules();
  // `new webkitSpeechRecognition()` returns this object, so the test can drive it.
  vi.stubGlobal('webkitSpeechRecognition', function Recognition() {
    instance = new FakeRecognition();
    return instance;
  });
  vi.stubGlobal('AudioContext', FakeAudioContext);
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: {
      getUserMedia: vi.fn(async () => {
        if (mic.holder && !mic.holder.hasAudio) analyserCutIn = true;
        return { getTracks: () => [track] };
      }),
    },
  });
  return import('./voice');
}

/** A tap: synchronous code runs "inside" it, anything after the first await runs outside. */
async function tap(fn: () => Promise<void>) {
  inTap = true;
  const pending = fn();
  inTap = false;
  await act(() => pending);
}

afterEach(() => {
  vi.unstubAllGlobals();
  track.stop.mockClear();
  mic.holder = undefined;
  analyserCutIn = false;
});

test('recognition starts inside the tap, so Safari allows it, and words arrive', async () => {
  const voice = await loadVoice();
  await tap(() => voice.startVoice());
  expect(instance?.isRunning).toBe(true);

  act(() => instance?.say('call mom', true));
  act(() => instance?.say('tomorr', false));
  expect(voice.stopVoice()).toBe('call mom tomorr');
});

test('a transcription error is shown while still listening', async () => {
  const voice = await loadVoice();
  await tap(() => voice.startVoice());
  act(() => instance?.onerror?.({ error: 'service-not-allowed' }));
  const state = renderHook(() => voice.useVoice()).result;
  expect(state.current.status).toBe('listening');
  expect(state.current.error).toMatch(/keyboard/);
  voice.stopVoice();
});

test('if the browser won’t share the mic, transcription keeps it and the orb follows the words', async () => {
  const voice = await loadVoice();
  await tap(() => voice.startVoice());
  act(() => instance?.onerror?.({ error: 'audio-capture' }));
  expect(track.stop).toHaveBeenCalled(); // the analyser let go of the mic

  act(() => instance?.say('sss', false));
  expect(voice.readVoice().level).toBeGreaterThan(0.1);
  expect(voice.readVoice().bands[6]).toBeGreaterThan(0.2); // hissing sounds go high
  voice.stopVoice();
});

test('a second session right after the first still transcribes', async () => {
  const voice = await loadVoice();
  await tap(() => voice.startVoice());
  act(() => instance?.say('call mom', true));
  const first = instance;
  voice.stopVoice(); // e.g. Save: the first recognizer is still shutting down and holding the mic
  voice.clearVoice();
  expect(first?.isRunning).toBe(false);

  await tap(() => voice.startVoice());
  expect(instance).not.toBe(first);
  expect(instance?.isRunning).toBe(true);
  act(() => instance?.say('buy milk', true));
  expect(voice.stopVoice()).toBe('buy milk');
});

test('the orb’s analyser waits until transcription has the mic', async () => {
  const voice = await loadVoice();
  await tap(() => voice.startVoice());
  expect(analyserCutIn).toBe(false);
  expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
  voice.stopVoice();
});

test('if transcription ends and can’t restart, it says so', async () => {
  const voice = await loadVoice();
  await tap(() => voice.startVoice());
  const state = renderHook(() => voice.useVoice()).result;
  act(() => instance?.end()); // iPhone ended it; restarting outside a tap is refused
  expect(state.current.error).toMatch(/Tap the orb/);
  voice.stopVoice();
});
