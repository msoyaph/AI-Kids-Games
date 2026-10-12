import { AudioEngine } from './Audio';
import { LIMIT_CEILING_DB, LOUDNESS_TARGET, MIX } from './mix';
import { SONGS, type SongName } from './Music';

/**
 * Offline audio report: renders every sound and song through the real mix chain (default
 * volumes, glue compressor, limiter) in OfflineAudioContexts and measures them. Runs in a
 * browser (`npm run audio-report`, tests/e2e/audio.spec.ts) — nothing is played aloud.
 */

export interface ReportRow {
  name: string;
  kind: 'sound' | 'song' | 'stress';
  /** Target window for the loudness figure (dBFS). */
  target: [number, number];
  /** Sounds: loudest 100 ms RMS. Songs: RMS over the whole render. dBFS. */
  loudness: number;
  /** Sample peak, dBFS. */
  peak: number;
  ok: boolean;
}

const SR = 48000;
const DEFAULT_VOLUMES = { master: 0.8, music: 0.55, sfx: 0.8 };

function db(x: number): number {
  return 20 * Math.log10(Math.max(1e-9, x));
}

function measure(buf: AudioBuffer): { peak: number; momentary: number; rms: number } {
  let peak = 0;
  let sumAll = 0;
  const n = buf.length;
  const win = Math.round(SR * 0.1);
  const sq = new Float64Array(n);
  for (let c = 0; c < buf.numberOfChannels; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < n; i++) {
      const v = d[i];
      if (Math.abs(v) > peak) peak = Math.abs(v);
      sq[i] += (v * v) / buf.numberOfChannels;
    }
  }
  let run = 0;
  let maxWin = 0;
  for (let i = 0; i < n; i++) {
    sumAll += sq[i];
    run += sq[i];
    if (i >= win) run -= sq[i - win];
    if (i >= win - 1 && run > maxWin) maxWin = run;
  }
  return { peak: db(peak), momentary: db(Math.sqrt(maxWin / win)), rms: db(Math.sqrt(sumAll / n)) };
}

async function render(seconds: number, setup: (e: AudioEngine) => void): Promise<AudioBuffer> {
  const ctx = new OfflineAudioContext(2, Math.round(SR * seconds), SR);
  const e = new AudioEngine(false);
  e.offline = true;
  e.build(ctx);
  e.setVolumes(DEFAULT_VOLUMES.master, DEFAULT_VOLUMES.music, DEFAULT_VOLUMES.sfx);
  setup(e);
  return ctx.startRendering();
}

const within = (v: number, [lo, hi]: [number, number]): boolean => v >= lo && v <= hi;
const CEIL = LIMIT_CEILING_DB + 0.05;

export async function audioReport(): Promise<ReportRow[]> {
  const rows: ReportRow[] = [];
  for (const [name, m] of Object.entries(MIX)) {
    const buf = await render(name.startsWith('stinger') || name === 'gust' || name === 'roar' ? 2.5 : 1.6, (e) => e.play(name));
    const r = measure(buf);
    const target = LOUDNESS_TARGET[m.cat];
    rows.push({ name, kind: 'sound', target, loudness: r.momentary, peak: r.peak, ok: within(r.momentary, target) && r.peak <= CEIL });
  }
  for (const song of Object.keys(SONGS) as SongName[]) {
    const buf = await render(10, (e) => {
      e.music.intensity = 1;
      e.music.play(song);
      e.music.scheduleOffline(10);
    });
    const r = measure(buf);
    const target = LOUDNESS_TARGET.music;
    rows.push({ name: `song:${song}`, kind: 'song', target, loudness: r.rms, peak: r.peak, ok: within(r.rms, target) && r.peak <= CEIL });
  }
  // worst case: boss music + a pile-up of explosions, slams and roars — the limiter must hold
  const stress = await render(3, (e) => {
    e.music.intensity = 1;
    e.music.play('oldRime');
    e.music.scheduleOffline(3);
    for (let k = 0; k < 6; k++) {
      e.play('explode');
      e.play('slam');
      e.play('roar');
      e.play('bossKill');
      (e as unknown as { lastPlay: Map<string, number> }).lastPlay.clear();
    }
  });
  const sr = measure(stress);
  rows.push({ name: 'stress:pile-up', kind: 'stress', target: [-60, LIMIT_CEILING_DB], loudness: sr.rms, peak: sr.peak, ok: sr.peak <= CEIL });
  return rows;
}

export function formatReport(rows: ReportRow[]): string {
  const lines = ['sound / song             loudness   target          peak    ', '-'.repeat(62)];
  for (const r of rows) {
    lines.push(`${r.ok ? ' ' : '✗'} ${r.name.padEnd(22)} ${r.loudness.toFixed(1).padStart(7)} dB  [${r.target[0]}, ${r.target[1]}]`.padEnd(50) + `${r.peak.toFixed(1).padStart(6)} dBFS`);
  }
  const bad = rows.filter((r) => !r.ok);
  lines.push('', bad.length ? `${bad.length} out of range: ${bad.map((r) => r.name).join(', ')}` : `all ${rows.length} within targets; nothing above ${LIMIT_CEILING_DB} dBFS`);
  return lines.join('\n');
}
