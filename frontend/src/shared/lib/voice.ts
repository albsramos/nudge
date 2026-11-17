// Voice input: the microphone's sound for the orb, and speech-to-text for the note. Knows no domain.
// One controller for the whole app, read in components with useVoice() (a store, no effects).
import { useSyncExternalStore } from 'react';

export type VoiceStatus = 'idle' | 'starting' | 'listening' | 'error';

export type VoiceState = {
  status: VoiceStatus;
  /** Final words heard so far in this session. */
  transcript: string;
  /** Words still being recognised (they may change). */
  interim: string;
  error?: string;
  /** False when the browser can hear but can't transcribe (the orb still reacts). */
  canTranscribe: boolean;
};

/** What the orb reads each frame: loudness and energy per band, all 0–1. */
export type VoiceFrame = { level: number; bands: number[]; pitch: number };

type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

const BANDS = 8;
const LOW_HZ = 90;
const HIGH_HZ = 4000;

const RecognitionCtor: (new () => Recognition) | undefined =
  typeof window === 'undefined'
    ? undefined
    : ((window as unknown as { SpeechRecognition?: new () => Recognition }).SpeechRecognition ??
      (window as unknown as { webkitSpeechRecognition?: new () => Recognition }).webkitSpeechRecognition);

const listeners = new Set<() => void>();
let state: VoiceState = { status: 'idle', transcript: '', interim: '', canTranscribe: Boolean(RecognitionCtor) };
let session: { stream: MediaStream; audio: AudioContext; analyser: AnalyserNode; bins: Uint8Array<ArrayBuffer>; wave: Uint8Array<ArrayBuffer>; recognition?: Recognition } | undefined;

function set(patch: Partial<VoiceState>) {
  state = { ...state, ...patch };
  for (const l of listeners) l();
}

export function useVoice(): VoiceState {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
    () => state,
  );
}

export function isVoiceSupported(): boolean {
  return typeof navigator !== 'undefined' && Boolean(navigator.mediaDevices?.getUserMedia);
}

/** Starts listening. Call from a tap: browsers only allow the microphone from a user gesture. */
export async function startVoice(): Promise<void> {
  if (session || state.status === 'starting') return;
  set({ status: 'starting', transcript: '', interim: '', error: undefined });
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    const audio = new AudioContext();
    await audio.resume();
    const analyser = audio.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.6;
    audio.createMediaStreamSource(stream).connect(analyser);
    session = {
      stream,
      audio,
      analyser,
      bins: new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount)),
      wave: new Uint8Array(new ArrayBuffer(analyser.fftSize)),
    };
    session.recognition = startRecognition();
    set({ status: 'listening' });
  } catch (error) {
    stopVoice();
    const denied = error instanceof DOMException && (error.name === 'NotAllowedError' || error.name === 'SecurityError');
    set({ status: 'error', error: denied ? 'Microphone access is blocked. Allow it in your browser settings.' : 'Couldn’t start the microphone.' });
  }
}

function startRecognition(): Recognition | undefined {
  if (!RecognitionCtor) return undefined;
  const rec = new RecognitionCtor();
  rec.lang = navigator.language || 'en-US';
  rec.continuous = true;
  rec.interimResults = true;
  rec.onresult = (event) => {
    let finals = '';
    let interim = '';
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i];
      if (result.isFinal) finals += result[0].transcript;
      else interim += result[0].transcript;
    }
    set({ transcript: join(state.transcript, finals), interim: interim.trim() });
  };
  rec.onerror = (event) => {
    if (event.error === 'no-speech' || event.error === 'aborted') return;
    set({ error: event.error === 'not-allowed' ? 'Speech recognition is blocked in this browser.' : 'Couldn’t transcribe. Keep talking or type instead.' });
  };
  // Some browsers end recognition after a pause: keep it going while the mic is open.
  rec.onend = () => {
    if (session?.recognition === rec) {
      try {
        rec.start();
      } catch {
        // Already restarting.
      }
    }
  };
  try {
    rec.start();
  } catch {
    return undefined;
  }
  return rec;
}

/** Stops listening and keeps what was heard. Returns the full transcript. */
export function stopVoice(): string {
  const current = session;
  session = undefined;
  if (current) {
    current.recognition?.stop();
    for (const track of current.stream.getTracks()) track.stop();
    void current.audio.close();
  }
  const heard = join(state.transcript, state.interim);
  set({ status: state.status === 'error' ? 'error' : 'idle', transcript: heard, interim: '' });
  return heard;
}

/** Forgets the transcript once the note has taken it. */
export function clearVoice() {
  set({ transcript: '', interim: '', error: undefined, status: session ? state.status : 'idle' });
}

const silent: VoiceFrame = { level: 0, bands: new Array(BANDS).fill(0), pitch: 0.5 };

/** The microphone right now. Cheap enough to call every animation frame. */
export function readVoice(): VoiceFrame {
  if (!session) return silent;
  const { analyser, bins, wave, audio } = session;
  analyser.getByteFrequencyData(bins);
  analyser.getByteTimeDomainData(wave);

  let sum = 0;
  for (const v of wave) sum += ((v - 128) / 128) ** 2;
  const level = Math.min(1, Math.sqrt(sum / wave.length) * 4);

  // Log-spaced bands across the range of speech, from 90 Hz to 4 kHz.
  const hzPerBin = audio.sampleRate / analyser.fftSize;
  const bands: number[] = [];
  let weighted = 0;
  let total = 0;
  for (let b = 0; b < BANDS; b++) {
    const lo = LOW_HZ * (HIGH_HZ / LOW_HZ) ** (b / BANDS);
    const hi = LOW_HZ * (HIGH_HZ / LOW_HZ) ** ((b + 1) / BANDS);
    let peak = 0;
    for (let k = Math.floor(lo / hzPerBin); k <= Math.ceil(hi / hzPerBin) && k < bins.length; k++) peak = Math.max(peak, bins[k]);
    // Below the noise floor counts as silence; above it, a curve so normal speech moves the rim visibly.
    const e = Math.max(0, (peak - 90) / 165) ** 0.8;
    bands.push(e);
    weighted += e * (b + 0.5);
    total += e;
  }
  // Pitch: where the energy sits, low (0) to high (1).
  const pitch = total > 0.05 ? weighted / total / BANDS : 0.5;
  return { level, bands, pitch };
}

function join(a: string, b: string): string {
  const left = a.trim();
  const right = b.trim();
  return left && right ? `${left} ${right}` : left || right;
}
