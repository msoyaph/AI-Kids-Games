import type { Tuning } from '../../src/config/tuning';

export const TUNING_FILE = 'src/config/tuning.ts';
export const BEGIN = '// @tuning-values-begin';
export const END = '// @tuning-values-end';

const IDENT = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

function literal(v: unknown, indent: string): string {
  if (typeof v === 'number') return JSON.stringify(v);
  if (typeof v === 'string' || typeof v === 'boolean') return JSON.stringify(v);
  if (v && typeof v === 'object') {
    const inner = indent + '  ';
    const lines = Object.entries(v as Record<string, unknown>).map(([k, val]) => `${inner}${IDENT.test(k) ? k : JSON.stringify(k)}: ${literal(val, inner)},`);
    return `{\n${lines.join('\n')}\n${indent}}`;
  }
  throw new Error(`unsupported tuning value: ${String(v)}`);
}

/** The TypeScript source for the generated defaults block (between the markers). */
export function renderDefaults(t: Tuning): string {
  return `export const TUNING_DEFAULTS: Tuning = ${literal(t, '')};`;
}

/** Replace the generated block inside the tuning.ts source text. */
export function replaceBlock(source: string, t: Tuning): string {
  const b = source.indexOf(BEGIN);
  const e = source.indexOf(END);
  if (b < 0 || e < 0 || e < b) throw new Error(`${TUNING_FILE}: generated-block markers not found`);
  const headerEnd = source.indexOf('\n', b) + 1;
  return source.slice(0, headerEnd) + renderDefaults(t) + '\n' + source.slice(e);
}

/** The current block's text (for round-trip checks). */
export function currentBlock(source: string): string {
  const b = source.indexOf(BEGIN);
  const e = source.indexOf(END);
  return source.slice(source.indexOf('\n', b) + 1, e).trim();
}
