// Voice input: the microphone's sound for the orb, and speech-to-text for the note. Knows no domain.
// One controller for the whole app, read in components with useVoice() (a store, no effects).
import { useSyncExternalStore } from 'react';
import { mergePhrase, readResults } from './transcript';
import { estimateVowel, silentVowel, type Vowel } from './vowel';

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
  /** Why the last session ended on its own, to tell the user. Unset when they stopped it. */
  stoppedBecause?: StopReason;
};

/** The mic never stays on unnoticed: it stops when the app is hidden, after a silence, or at a time limit. */
export type StopReason = 'background' | 'silence' | 'limit';

/** Seconds of quiet before listening stops by itself. */
export const SILENCE_LIMIT_S = 10;
/** The longest one listening session can run. */
export const SESSION_LIMIT_S = 120;

/** What the orb reads each frame: loudness, energy per band and pitch (all 0–1), and the vowel being said. */
export type VoiceFrame = { level: number; bands: number[]; pitch: number; vowel: Vowel };

type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: { resultIndex: number; results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  /** Fires once the recognizer is actually taking audio from the mic. */
  onaudiostart: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort?: () => void;
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
/** The sound analyser for the orb. */
type Mic = { stream: MediaStream; audio: AudioContext; analyser: AnalyserNode; bins: Uint8Array<ArrayBuffer>; wave: Uint8Array<ArrayBuffer> };

let session:
  | {
      /** Absent when the browser can't share the mic between speech recognition and the analyser. */
      mic?: Mic;
      recognition?: Recognition;
      watchdog: ReturnType<typeof setInterval>;
    }
  | undefined;
/** Recognition started by the tap, before the session exists (the mic is still opening). */
let pendingRecognition: Recognition | undefined;
/** The last recognizer, until it has fully ended: a new one can't start while it still holds the mic on iPhone. */
let liveRecognition: Recognition | undefined;
/**
 * The recognizer whose results still belong in the transcript. Stays set after Stop, so the last words (iPhone
 * sends them a moment later) still land; cleared once a note has taken the transcript, so they can't come back.
 */
let acceptingFrom: Recognition | undefined;
/** The transcript from earlier runs of this recording (browsers end a run after a pause; we start another). */
let runBase = '';
/** How long to wait for transcription to take the mic before opening the orb's analyser anyway. */
const AUDIO_START_WAIT_MS = 1500;

/** The live status: it can change while startVoice() awaits the mic, which a plain read can't see. */
const currentStatus = (): VoiceStatus => state.status;

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

/**
 * Starts listening. Call it straight from a tap: Safari only starts speech recognition inside the tap itself,
 * so recognition starts first, synchronously, and the mic for the orb opens after.
 */
export async function startVoice(): Promise<void> {
  if (session || state.status === 'starting') return;
  set({ status: 'starting', transcript: '', interim: '', error: undefined, stoppedBecause: undefined });
  pendingRecognition = startRecognition();
  let mic: Mic | undefined;
  try {
    // Let transcription take the mic first. iPhone gives it to whoever asks last, and without a permission prompt
    // in between (every session after the first) both would ask at once and transcription would lose.
    if (pendingRecognition) await audioStarted(pendingRecognition);
    if (currentStatus() !== 'starting') throw new DOMException('cancelled', 'AbortError');
    const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    const audio = new AudioContext();
    await audio.resume();
    const analyser = audio.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.6;
    audio.createMediaStreamSource(stream).connect(analyser);
    mic = { stream, audio, analyser, bins: new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount)), wave: new Uint8Array(new ArrayBuffer(analyser.fftSize)) };
  } catch (error) {
    const denied = error instanceof DOMException && (error.name === 'NotAllowedError' || error.name === 'SecurityError');
    if (error instanceof DOMException && error.name === 'AbortError') {
      pendingRecognition?.stop();
      pendingRecognition = undefined;
      return;
    }
    // Without the analyser, transcription alone still works; without either, there's nothing to do.
    if (denied || !pendingRecognition) {
      pendingRecognition?.stop();
      pendingRecognition = undefined;
      set({ status: 'error', error: denied ? 'Microphone access is blocked. Allow it in Settings → Safari → Microphone.' : 'Couldn’t start the microphone.' });
      return;
    }
  }
  const recognition = pendingRecognition;
  pendingRecognition = undefined;
  // Cancelled while the mic was opening (Stop tapped, or the app left during the permission prompt): release it.
  if (currentStatus() !== 'starting' || document.visibilityState === 'hidden') {
    releaseMic(mic);
    recognition?.stop();
    if (currentStatus() === 'starting') set({ status: 'idle', stoppedBecause: 'background' });
    return;
  }
  const startedAt = Date.now();
  let lastHeardAt = startedAt;
  session = {
    mic,
    recognition,
    // Checks four times a second, separately from the orb, so the limits hold even if nothing is drawing.
    watchdog: setInterval(() => {
      const now = Date.now();
      if (readVoice().level > 0.06) lastHeardAt = now;
      if (now - startedAt > SESSION_LIMIT_S * 1000) stopVoice('limit');
      else if (now - lastHeardAt > SILENCE_LIMIT_S * 1000) stopVoice('silence');
    }, 250),
  };
  set({ status: 'listening' });
}

function releaseMic(mic: Mic | undefined) {
  if (!mic) return;
  for (const track of mic.stream.getTracks()) track.stop();
  void mic.audio.close();
}

const recognitionErrors: Record<string, string> = {
  'not-allowed': 'This phone won’t let Nudge transcribe. Tap the 🎤 on your keyboard to dictate instead.',
  'service-not-allowed': 'This phone won’t let Nudge transcribe. Tap the 🎤 on your keyboard to dictate instead.',
  network: 'Speech-to-text needs an internet connection.',
  'language-not-supported': 'Speech-to-text doesn’t support your phone’s language here.',
};

/** Resolves once `rec` is taking audio, or after a short wait (some browsers never say). */
function audioStarted(rec: Recognition): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, AUDIO_START_WAIT_MS);
    rec.onaudiostart = () => {
      clearTimeout(timer);
      resolve();
    };
  });
}

function startRecognition(): Recognition | undefined {
  if (!RecognitionCtor) return undefined;
  // A recognizer from the last session may still be shutting down and holding the mic: cut it off now.
  liveRecognition?.abort?.();
  const rec = new RecognitionCtor();
  liveRecognition = rec;
  rec.lang = navigator.language || 'en-US';
  rec.continuous = true;
  rec.interimResults = true;
  acceptingFrom = rec;
  runBase = '';
  rec.onresult = (event) => {
    if (rec !== acceptingFrom) return;
    // Rebuild from every result of this run, not just the new ones: iPhone repeats and regrows phrases.
    const all = Array.from(event.results, (r) => ({ text: r[0].transcript, isFinal: r.isFinal }));
    const { finals, interim } = readResults(all);
    const transcript = mergePhrase(runBase, finals);
    const before = join(state.transcript, state.interim);
    const after = join(transcript, interim);
    if (after.length > before.length) feedWords(after.slice(before.length));
    set({ transcript, interim, error: undefined });
  };
  rec.onerror = (event) => {
    if (event.error === 'no-speech' || event.error === 'aborted') return;
    // The orb's analyser holds the mic and this browser won't share it: give the mic to transcription.
    if (event.error === 'audio-capture' && session?.mic) {
      releaseMic(session.mic);
      session.mic = undefined;
      return;
    }
    set({ error: recognitionErrors[event.error] ?? 'Couldn’t transcribe. Keep talking or type instead.' });
  };
  // Browsers end recognition after a pause: keep it going while listening.
  rec.onend = () => {
    if (liveRecognition === rec && session?.recognition !== rec && pendingRecognition !== rec) liveRecognition = undefined;
    if (session?.recognition !== rec) return;
    // The next run reports its results from scratch: keep what this one heard.
    runBase = join(state.transcript, state.interim);
    set({ transcript: runBase, interim: '' });
    try {
      rec.start();
    } catch {
      // iPhone won't restart it without a tap: say so instead of listening with nothing being written.
      set({ error: 'Transcription paused. Tap the orb to keep going.' });
    }
  };
  try {
    rec.start();
  } catch {
    set({ error: recognitionErrors['service-not-allowed'] });
    return undefined;
  }
  return rec;
}

/** Stops listening and keeps what was heard. Returns the full transcript. Pass a reason when it stops by itself. */
export function stopVoice(reason?: StopReason): string {
  const current = session;
  session = undefined;
  pendingRecognition?.stop();
  pendingRecognition = undefined;
  if (current) {
    clearInterval(current.watchdog);
    current.recognition?.stop();
    releaseMic(current.mic);
  }
  const heard = join(state.transcript, state.interim);
  set({ status: state.status === 'error' ? 'error' : 'idle', transcript: heard, interim: '', stoppedBecause: current ? reason : state.stoppedBecause });
  return heard;
}

// Leaving the app (switching apps, locking the phone, closing the tab) always turns the mic off.
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden' && session) stopVoice('background');
  });
  window.addEventListener('pagehide', () => {
    if (session) stopVoice('background');
  });
}

/** Forgets the transcript once the note has taken it. */
export function clearVoice() {
  acceptingFrom = undefined;
  runBase = '';
  set({ transcript: '', interim: '', error: undefined, stoppedBecause: undefined, status: session ? state.status : 'idle' });
}

const silent: VoiceFrame = { level: 0, bands: new Array(BANDS).fill(0), pitch: 0.5, vowel: silentVowel };

// Without the analyser, the orb reacts to words as they're recognised: each letter adds energy that fades.
// Open vowels go low, e/i in the middle, hissing consonants high, a rough stand-in for their sound.
const words = { bands: new Array<number>(BANDS).fill(0), level: 0, at: 0 };

function feedWords(text: string) {
  decayWords();
  for (const ch of text.toLowerCase()) {
    const band = 'aou'.includes(ch) ? 1 : 'ei'.includes(ch) ? 3 : 'sztfcxkh'.includes(ch) ? 6 : /\p{L}/u.test(ch) ? 4 : -1;
    if (band < 0) continue;
    words.bands[band] = Math.min(1, words.bands[band] + 0.3);
    words.bands[band + 1] = Math.min(1, words.bands[band + 1] + 0.15);
    words.level = Math.min(1, words.level + 0.08);
  }
}

function decayWords() {
  const now = Date.now();
  const k = Math.exp(-(now - words.at) / 330);
  words.at = now;
  words.level *= k;
  for (let b = 0; b < BANDS; b++) words.bands[b] *= k;
}

/** The microphone right now. Cheap enough to call every animation frame. */
export function readVoice(): VoiceFrame {
  if (!session) return silent;
  if (!session.mic) {
    decayWords();
    let w = 0;
    let t = 0;
    words.bands.forEach((e, b) => ((w += e * (b + 0.5)), (t += e)));
    return { level: words.level, bands: [...words.bands], pitch: t > 0.05 ? w / t / BANDS : 0.5, vowel: silentVowel };
  }
  const { analyser, bins, wave, audio } = session.mic;
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
  // Only a voice shapes the orb: quiet room noise can have peaks too, so the vowel fades out below speaking level.
  const vowel = estimateVowel(bins, hzPerBin);
  return { level, bands, pitch, vowel: { ...vowel, strength: vowel.strength * Math.min(1, level / 0.15) } };
}

function join(a: string, b: string): string {
  const left = a.trim();
  const right = b.trim();
  return left && right ? `${left} ${right}` : left || right;
}
