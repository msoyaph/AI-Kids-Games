/**
 * Every sound is made with the Web Audio API: no audio files. Sound starts on the first tap or
 * key (browsers require a gesture) and everything is kept soft.
 */
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let tunes: GainNode | null = null;
let soundOn = true;
let musicOn = true;
let playing = false;
let timer: ReturnType<typeof setInterval> | undefined;
let nextBeat = 0;
let beat = 0;

/** Call on any tap or key press. */
export function unlock(): void {
  try {
    if (!ctx) {
      const Ctor = globalThis.AudioContext ?? (globalThis as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      ctx = new Ctor();
      master = ctx.createGain();
      master.gain.value = soundOn ? 0.9 : 0;
      master.connect(ctx.destination);
      tunes = ctx.createGain();
      tunes.gain.value = musicOn && soundOn ? 0.5 : 0;
      tunes.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') void ctx.resume();
  } catch {
    ctx = null;
  }
}

export function configure(sound: boolean, music: boolean): void {
  soundOn = sound;
  musicOn = music;
  if (ctx && master && tunes) {
    master.gain.setTargetAtTime(sound ? 0.9 : 0, ctx.currentTime, 0.03);
    tunes.gain.setTargetAtTime(music && sound ? 0.5 : 0, ctx.currentTime, 0.08);
  }
}

export const audioState = () => ctx?.state ?? 'none';

function tone(freq: number, delay: number, dur: number, type: OscillatorType = 'sine', vol = 0.14, slide = 1, out: GainNode | null = master): void {
  if (!ctx || !out) return;
  const t = ctx.currentTime + delay;
  const osc = ctx.createOscillator(), gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (slide !== 1) osc.frequency.exponentialRampToValueAtTime(freq * slide, t + dur);
  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(vol, t + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  osc.connect(gain).connect(out);
  osc.start(t);
  osc.stop(t + dur + 0.03);
}

function hiss(delay: number, dur: number, vol: number, freq: number): void {
  if (!ctx || !master) return;
  const t = ctx.currentTime + delay;
  const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * dur), ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  const src = ctx.createBufferSource(), filter = ctx.createBiquadFilter(), gain = ctx.createGain();
  src.buffer = buffer;
  filter.type = 'bandpass';
  filter.frequency.value = freq;
  gain.gain.value = vol;
  src.connect(filter).connect(gain).connect(master);
  src.start(t);
}

export const sfx = {
  tap: () => tone(620, 0, 0.07, 'triangle', 0.09, 1.25),
  nope: () => tone(240, 0, 0.12, 'triangle', 0.08, 0.8),
  start: () => { hiss(0, 0.35, 0.09, 3200); tone(330, 0, 0.1, 'triangle', 0.07, 1.4); },
  ready: () => { tone(1047, 0, 0.16, 'sine', 0.15); tone(1568, 0.11, 0.3, 'sine', 0.15); },
  collect: () => { tone(520, 0, 0.07, 'triangle', 0.12, 1.5); tone(780, 0.06, 0.09, 'triangle', 0.1); },
  deliver: () => { tone(660, 0, 0.08, 'triangle', 0.12); tone(880, 0.07, 0.12, 'triangle', 0.12); },
  coins: (hearts: number) => { for (let i = 0; i < hearts + 1; i++) tone(988 * 2 ** (i / 6), 0.1 + i * 0.075, 0.16, 'square', 0.045); },
  happy: () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.07, 0.16, 'triangle', 0.11)); },
  giveup: () => { tone(392, 0, 0.2, 'sine', 0.11, 0.8); tone(294, 0.18, 0.3, 'sine', 0.11, 0.8); },
  bell: () => { tone(1760, 0, 0.5, 'sine', 0.13); tone(2637, 0, 0.4, 'sine', 0.06); tone(1760, 0.16, 0.6, 'sine', 0.1); },
  pop: () => tone(420, 0, 0.09, 'sine', 0.1, 0.5),
  /** A friend's little hello: two chirps at their own pitch. */
  voice: (pitch: number) => { tone(380 * pitch, 0, 0.09, 'triangle', 0.1, 1.25); tone(460 * pitch, 0.1, 0.12, 'triangle', 0.1, 0.9); },
  win: (stars: number) => { [523, 659, 784, 1047, 1319].slice(0, 2 + stars).forEach((f, i) => tone(f, i * 0.13, 0.32, 'triangle', 0.12)); },
};

// A gentle looping tune: four chords, a bass note and a plucked melody.
const CHORDS = [[262, 330, 392], [220, 262, 330], [175, 220, 262], [196, 247, 294]];
const MELODY = [784, 0, 659, 784, 880, 0, 784, 0, 659, 0, 523, 659, 587, 0, 0, 0, 698, 0, 587, 698, 784, 0, 698, 0, 587, 0, 494, 587, 523, 0, 0, 0];
const BEAT = 0.3;

function schedule(): void {
  if (!ctx || !tunes || ctx.state !== 'running') return;
  if (nextBeat < ctx.currentTime) nextBeat = ctx.currentTime + 0.05;
  while (nextBeat < ctx.currentTime + 0.4) {
    const delay = nextBeat - ctx.currentTime, step = beat % 32, chord = CHORDS[Math.floor(step / 8) % 4];
    if (step % 4 === 0) tone(chord[0] / 2, delay, 0.5, 'triangle', 0.1, 1, tunes);
    if (step % 2 === 1) tone(chord[1 + (Math.floor(step / 2) % 2)], delay, 0.22, 'sine', 0.045, 1, tunes);
    const note = MELODY[step];
    if (note) tone(note, delay, 0.26, 'sine', 0.06, 1, tunes);
    nextBeat += BEAT;
    beat++;
  }
}

/** Start or stop the background tune (it only sounds once audio is unlocked and music is on). */
export function music(on: boolean): void {
  if (on === playing) return;
  playing = on;
  if (timer !== undefined) clearInterval(timer);
  timer = on ? setInterval(schedule, 120) : undefined;
}
