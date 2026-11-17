import { useState } from 'react';
import { isAiConfigured, useSettings } from '@/shared/lib/settings';
import { clearVoice, isVoiceSupported, SESSION_LIMIT_S, SILENCE_LIMIT_S, startVoice, stopVoice, useVoice, type VoiceState } from '@/shared/lib/voice';
import { Button } from '@/shared/ui/Button/Button';
import { Orb } from '@/shared/ui/Orb/Orb';
import { Textarea } from '@/shared/ui/Textarea/Textarea';
import { useCreateNote } from '../../hooks/useCreateNote';
import { ListeningBar } from './ListeningBar/ListeningBar';
import styles from './NoteComposer.module.css';

const join = (...parts: string[]) => parts.map((p) => p.trim()).filter(Boolean).join(' ');

function statusText(voice: VoiceState, isPending: boolean, isAiOn: boolean): string {
  if (isPending) return isAiOn ? 'Reading your note…' : 'Saving…';
  if (voice.status === 'starting') return 'Opening the microphone…';
  if (voice.status === 'listening') return voice.canTranscribe ? 'Listening. Tap the orb when you’re done.' : 'Listening, but this browser can’t transcribe. Type instead.';
  if (voice.error) return voice.error;
  if (voice.stoppedBecause === 'silence') return `Stopped listening: ${SILENCE_LIMIT_S} seconds of silence`;
  if (voice.stoppedBecause === 'background') return 'Stopped listening when you left the app';
  if (voice.stoppedBecause === 'limit') return `Stopped listening after ${SESSION_LIMIT_S / 60} minutes`;
  return isVoiceSupported() ? 'Tap the orb and talk, or type below' : 'Type your note below';
}

export function NoteComposer() {
  const { createNote, isPending } = useCreateNote();
  const isAiOn = isAiConfigured(useSettings());
  const voice = useVoice();
  const [text, setText] = useState('');
  const [kick, setKick] = useState(0);
  const isListening = voice.status === 'listening';
  const isMicOn = isListening || voice.status === 'starting';
  // What you said is shown after what you typed, live, until you edit or save.
  const spoken = join(voice.transcript, voice.interim);
  const value = spoken ? join(text, spoken) : text;

  function handleOrb() {
    setKick((k) => k + 1);
    if (isMicOn) stopVoice();
    else void startVoice();
  }

  function handleChange(next: string) {
    if (isListening) stopVoice();
    clearVoice();
    setText(next);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const note = join(text, isListening ? stopVoice() : spoken);
    if (!note || isPending) return;
    clearVoice();
    setText('');
    await createNote(note);
    setKick((k) => k + 1);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) event.currentTarget.form?.requestSubmit();
  }

  return (
    <form className={styles.root} onSubmit={handleSubmit} aria-busy={isPending}>
      {isMicOn && <ListeningBar isStarting={!isListening} onStop={() => stopVoice()} />}
      <button
        type="button"
        className={styles.orb}
        onClick={handleOrb}
        aria-pressed={isListening}
        aria-label={isMicOn ? 'Stop listening' : 'Talk'}
        data-state={voice.status}
        disabled={isPending || !isVoiceSupported()}
      >
        <Orb size={136} grid={40} isListening={isListening} isBusy={isPending || voice.status === 'starting'} kick={kick} isIntro />
      </button>
      <p className={styles.status} role="status" data-tone={voice.error && !isListening ? 'error' : undefined}>
        {statusText(voice, isPending, isAiOn)}
      </p>
      <label htmlFor="new-note" className={styles.srOnly}>
        New note
      </label>
      <Textarea
        id="new-note"
        name="text"
        value={value}
        onChange={(event) => handleChange(event.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Call mom about the weekend, remind me tomorrow at 6pm"
        rows={3}
        maxLength={4000}
        disabled={isPending}
        data-live={isListening && Boolean(voice.interim)}
        className={styles.input}
      />
      <Button type="submit" size="lg" disabled={isPending || !value.trim()}>
        Save note
      </Button>
      {!isAiOn && <p className={styles.hint}>Add an AI key in Settings to turn “remind me…” into reminders.</p>}
    </form>
  );
}
