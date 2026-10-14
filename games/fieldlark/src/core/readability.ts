// Reading level (Flesch–Kincaid grade) for in-game text. Copied from Light Crossing
// (games/light-crossing/src/core/readability.ts); the targets below are set for ages 8–14.
// words, so "Professor Vesper" doesn't make a line look harder than it reads.

/** Rough syllable count for one English word. */
export function syllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!w) return 0;
  if (w.length <= 3) return 1;
  const trimmed = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '').replace(/^y/, '');
  const groups = trimmed.match(/[aeiouy]{1,2}/g);
  return Math.max(1, groups ? groups.length : 1);
}

/** Strip expression tags and template tokens, keeping what a child actually reads. */
export function plainText(line: string): string {
  return line
    .replace(/^\[[a-z]+\]/i, '')
    .replace(/\{[a-z]+\}/gi, 'Name')
    .replace(/[✦✿★♥◆]/g, '')
    .trim();
}

export interface Reading {
  words: number;
  sentences: number;
  syllables: number;
  grade: number;
}

export function readability(text: string): Reading {
  const t = plainText(text);
  const sentences = t
    .split(/(?<=[.!?…])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => /[a-z]/i.test(s));
  let words = 0;
  let syl = 0;
  for (const s of sentences) {
    const ws = s.split(/[\s—–-]+/).map((w) => w.replace(/^[^A-Za-z']+|[^A-Za-z']+$/g, '')).filter(Boolean);
    ws.forEach((w, k) => {
      words++;
      const name = k > 0 && /^[A-Z]/.test(w);
      syl += name ? Math.min(2, syllables(w)) : syllables(w);
    });
  }
  const n = Math.max(1, sentences.length);
  if (!words) return { words: 0, sentences: 0, syllables: 0, grade: 0 };
  const grade = 0.39 * (words / n) + 11.8 * (syl / words) - 15.59;
  return { words, sentences: n, syllables: syl, grade: Math.round(grade * 10) / 10 };
}

/** Targets for ages 8–14 (tests/unit/reading.test.ts): no line above grade 7, groups averaging 4.5 or below. */
export const READING_TARGET = { average: 4.5, max: 7 };
