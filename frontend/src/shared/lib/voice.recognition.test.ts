// Speech recognition the way Safari treats it: start() only works inside the tap, before anything is awaited.
import { act, renderHook } from '@testing-library/react';

let inTap = false;
let instance: FakeRecognition | undefined;
const track = { stop: vi.fn() };

class FakeRecognition {
  lang = '';
  continuous = false;
  interimResults = false;
  onresult: ((e: unknown) => void) | null = null;
  onerror: ((e: { error: string }) => void) | null = null;
  onend: (() => void) | null = null;
  isRunning = false;
  start() {
    if (!inTap) throw new DOMException('not allowed outside a user gesture', 'NotAllowedError');
    this.isRunning = true;
  }
  stop() {
    this.isRunning = false;
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
    value: { getUserMedia: vi.fn(async () => ({ getTracks: () => [track] })) },
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
