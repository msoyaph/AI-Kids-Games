// Read-aloud: the browser's built-in speech (speechSynthesis), used for dialogue, tips and mission
// text. Every call is guarded; where speech isn't available the game simply stays quiet.

/** The parts of speechSynthesis we use (injectable for tests). */
export interface SpeechLike {
  speak(u: unknown): void;
  cancel(): void;
  getVoices?(): { name: string; lang: string; localService?: boolean }[];
}

type MakeUtterance = (text: string) => { text: string; pitch: number; rate: number; lang: string; voice?: unknown } | null;

function defaultSynth(): SpeechLike | null {
  try {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
    return window.speechSynthesis as unknown as SpeechLike;
  } catch {
    return null;
  }
}

function defaultUtterance(text: string): ReturnType<MakeUtterance> {
  try {
    if (typeof SpeechSynthesisUtterance === 'undefined') return null;
    return new SpeechSynthesisUtterance(text) as unknown as ReturnType<MakeUtterance>;
  } catch {
    return null;
  }
}

/** Text as it should be read: no expression tags, symbols or emoji. */
export function speakable(text: string): string {
  return text
    .replace(/^\[[a-z]+\]/i, '')
    .replace(/[✦✿★♥◆○✓•·▼]/g, ' ')
    .replace(/\p{Extended_Pictographic}/gu, ' ')
    .replace(/…/g, '...')
    .replace(/\s+/g, ' ')
    .trim();
}

export class ReadAloud {
  /** turned on in Settings */
  enabled = false;
  readonly available: boolean;
  private synth: SpeechLike | null;
  private make: MakeUtterance;
  /** last thing said (for the 🔊 replay buttons) */
  last = '';

  constructor(synth: SpeechLike | null | undefined = undefined, make: MakeUtterance = defaultUtterance) {
    this.synth = synth === undefined ? defaultSynth() : synth;
    this.make = make;
    let ok = !!this.synth;
    if (ok && make === defaultUtterance) ok = typeof SpeechSynthesisUtterance !== 'undefined';
    this.available = ok;
  }

  /**
   * Say something. `voice` is the character's voice pitch (0.75–1.35). Returns false when it
   * couldn't (turned off, not supported, or the browser refused).
   */
  speak(text: string, voice = 1, force = false): boolean {
    if (!this.available || (!this.enabled && !force)) return false;
    const say = speakable(text);
    if (!say) return false;
    try {
      this.synth!.cancel();
      const u = this.make(say);
      if (!u) return false;
      u.pitch = Math.max(0.6, Math.min(1.6, voice));
      u.rate = 0.92;
      u.lang = 'en-US';
      const voices = this.synth!.getVoices?.() ?? [];
      const en = voices.find((v) => v.lang?.startsWith('en') && v.localService) ?? voices.find((v) => v.lang?.startsWith('en'));
      if (en) u.voice = en;
      this.synth!.speak(u);
      this.last = say;
      return true;
    } catch {
      return false;
    }
  }

  private primed = false;
  /** Call inside a tap: lets iOS speak later lines that aren't started by a tap. */
  prime(): void {
    if (this.primed || !this.available || !this.enabled) return;
    this.primed = true;
    try {
      const u = this.make(' ');
      if (!u) return;
      (u as { volume?: number }).volume = 0;
      this.synth!.speak(u);
    } catch {
      /* ignore */
    }
  }

  stop(): void {
    try {
      this.synth?.cancel();
    } catch {
      /* ignore */
    }
  }
}
