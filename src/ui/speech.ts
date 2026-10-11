/**
 * "Read aloud" using the browser's built-in speech synthesis. Fails quietly when the
 * browser has no voices or blocks speech.
 */
let voice: SpeechSynthesisVoice | null = null;
let enabled = false;

function synth(): SpeechSynthesis | null {
  try {
    return typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null;
  } catch {
    return null;
  }
}

export function speechAvailable(): boolean {
  return !!synth() && typeof SpeechSynthesisUtterance !== 'undefined';
}

function pickVoice(): void {
  const s = synth();
  if (!s) return;
  try {
    const voices = s.getVoices();
    const en = voices.filter((v) => /^en(-|_|$)/i.test(v.lang));
    const preferred = ['Samantha', 'Google US English', 'Karen', 'Moira', 'Microsoft Aria', 'Microsoft Jenny', 'Daniel'];
    voice = en.find((v) => preferred.some((p) => v.name.includes(p))) ?? en.find((v) => v.localService) ?? en[0] ?? voices[0] ?? null;
  } catch {
    voice = null;
  }
}

export function initSpeech(): void {
  const s = synth();
  if (!s) return;
  pickVoice();
  try {
    s.addEventListener?.('voiceschanged', pickVoice);
  } catch {
    /* old browsers */
  }
}

export function setReadAloud(on: boolean): void {
  enabled = on;
  if (!on) stopSpeech();
}

export function readAloudOn(): boolean {
  return enabled && speechAvailable();
}

/** Speak text if read-aloud is on (or `force`). Strips emoji-ish symbols. */
export function speak(text: string, opts: { pitch?: number; rate?: number; force?: boolean } = {}): void {
  if (!(enabled || opts.force)) return;
  const s = synth();
  if (!s) return;
  try {
    s.cancel();
    const u = new SpeechSynthesisUtterance(text.replace(/[*_#]/g, ''));
    if (voice) u.voice = voice;
    u.lang = voice?.lang ?? 'en-US';
    u.rate = Math.max(0.6, Math.min(1.3, (opts.rate ?? 1) * 0.92));
    u.pitch = Math.max(0.5, Math.min(2, opts.pitch ?? 1.1));
    u.volume = 1;
    s.speak(u);
  } catch {
    /* speech must never break the game */
  }
}

export function stopSpeech(): void {
  try {
    synth()?.cancel();
  } catch {
    /* ignore */
  }
}
