import type { Message } from './index';

const ACCENT: Record<string, string> = {
  a: 'á', b: 'ƀ', c: 'ç', d: 'ď', e: 'é', f: 'ƒ', g: 'ĝ', h: 'ĥ', i: 'í', j: 'ĵ', k: 'ķ', l: 'ľ', m: 'ɱ',
  n: 'ñ', o: 'ó', p: 'þ', q: 'ǫ', r: 'ŕ', s: 'š', t: 'ţ', u: 'ú', v: 'ṽ', w: 'ŵ', x: 'ẋ', y: 'ý', z: 'ž',
  A: 'Á', B: 'Ɓ', C: 'Ç', D: 'Ď', E: 'É', F: 'Ƒ', G: 'Ĝ', H: 'Ĥ', I: 'Í', J: 'Ĵ', K: 'Ķ', L: 'Ľ', M: 'Ṁ',
  N: 'Ñ', O: 'Ó', P: 'Þ', Q: 'Ǫ', R: 'Ŕ', S: 'Š', T: 'Ţ', U: 'Ú', V: 'Ṽ', W: 'Ŵ', X: 'Ẋ', Y: 'Ý', Z: 'Ž',
};

/**
 * Pseudo-localise one string: accent every letter (placeholders untouched) and
 * pad it to ~140% length so layouts get tested against longer languages.
 */
export function pseudoString(s: string): string {
  let out = '';
  let depth = 0;
  for (const ch of s) {
    if (ch === '{') depth++;
    if (depth > 0) out += ch;
    else out += ACCENT[ch] ?? ch;
    if (ch === '}') depth = Math.max(0, depth - 1);
  }
  const letters = s.replace(/\{\w+\}/g, '').length;
  const pad = Math.max(1, Math.round(letters * 0.4));
  let filler = '';
  const word = '·ẋ';
  while (filler.length < pad) filler += word;
  return `⟦${out} ${filler.slice(0, pad)}⟧`;
}

export function pseudoMessages<K extends string>(src: Record<K, Message>): Record<K, Message> {
  const out = {} as Record<K, Message>;
  for (const k of Object.keys(src) as K[]) {
    const m = src[k];
    if (typeof m === 'string') out[k] = pseudoString(m);
    else {
      const p: Record<string, string> = {};
      for (const [form, s] of Object.entries(m)) if (s) p[form] = pseudoString(s);
      out[k] = p as Message;
    }
  }
  return out;
}
