/**
 * Global sound-effect hook. The Web Audio synth (audio/audio.ts) registers itself here at boot;
 * until then (or if audio is unavailable) calls are silently ignored.
 */
type Player = (name: string, opts?: { pitch?: number; volume?: number }) => void;

let player: Player | null = null;

export function setSfxPlayer(p: Player | null): void {
  player = p;
}

export function sfx(name: string, opts?: { pitch?: number; volume?: number }): void {
  try {
    player?.(name, opts);
  } catch {
    /* audio must never break the game */
  }
}
