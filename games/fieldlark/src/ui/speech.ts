/**
 * Read-aloud with the browser's speech synthesis (copied from Agentmon's src/ui/speech.ts). Only
 * voices that run on this device (`localService`) are used: some browsers' cloud voices would send
 * the text over the network, and the game never makes network requests. With no local voice (or no
 * speech at all) read-aloud quietly isn't offered, and nothing ever throws.
 */

let voice: SpeechSynthesisVoice | null | undefined;

function synth(): SpeechSynthesis | null {
  try { return 'speechSynthesis' in globalThis ? globalThis.speechSynthesis : null; } catch { return null; }
}

function pickVoice(): SpeechSynthesisVoice | null {
  const s = synth();
  if (!s) return null;
  let voices: SpeechSynthesisVoice[] = [];
  try { voices = s.getVoices(); } catch { return null; }
  const local = voices.filter(v => v.localService);
  const en = local.filter(v => /^en(-|_|$)/i.test(v.lang));
  const pool = en.length ? en : local;
  return pool.find(v => v.default) ?? pool[0] ?? null;
}

/** Is read-aloud available (a local voice exists)? Voices can load late, so ask again later. */
export function speechAvailable(): boolean {
  if (voice === undefined || voice === null) voice = pickVoice();
  return !!voice;
}

try {
  synth()?.addEventListener?.('voiceschanged', () => { voice = pickVoice(); });
} catch { /* no speech */ }

/** Strips symbols that voices read out oddly. */
export const speakable = (text: string) => text.replace(/[★☆♥•·✓✔→←]/g, ' ').replace(/\s+/g, ' ').trim();

export function speak(text: string, rate = 0.95): void {
  const s = synth();
  if (!s || !speechAvailable()) return;
  try {
    s.cancel();
    const u = new SpeechSynthesisUtterance(speakable(text));
    u.voice = voice!;
    u.lang = voice!.lang;
    u.rate = rate;
    u.pitch = 1.05;
    s.speak(u);
  } catch { /* fail quietly */ }
}

export function stopSpeaking(): void {
  try { synth()?.cancel(); } catch { /* fail quietly */ }
}
