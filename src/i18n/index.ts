import { en, type MessageKey } from './en';
import { fil } from './fil';
import { pseudoMessages } from './pseudo';

/**
 * Tiny i18n core (no dependencies, no network).
 *
 *   t('hud.wave', { n: 3, total: 40 })        → "Wave 3/40"
 *   t('wave.enemies', { count: 1 })           → "1 construct"  (plural via Intl.PluralRules)
 *
 * Messages are plain strings with `{name}` placeholders, or plural objects
 * keyed by CLDR category (`one`, `other`, …). Number values are formatted with
 * the locale's Intl.NumberFormat. Missing keys fall back to English.
 */
export type PluralMessage = Partial<Record<Intl.LDMLPluralRule, string>> & { other: string };
export type Message = string | PluralMessage;
export type Messages = Record<MessageKey, Message>;
export type { MessageKey };

export type LocaleId = 'en' | 'fil' | 'pseudo';
export type LocaleSetting = LocaleId | 'auto';

interface LocaleDef {
  id: LocaleId;
  /** Name shown in the language picker (in that language). */
  name: string;
  /** BCP 47 tag for Intl. */
  tag: string;
  messages: Partial<Record<MessageKey, Message>>;
  /** Shown only in dev builds (pseudo-localisation for layout testing). */
  devOnly?: boolean;
}

const LOCALES: Record<LocaleId, LocaleDef> = {
  en: { id: 'en', name: 'English', tag: 'en', messages: en },
  fil: { id: 'fil', name: 'Filipino', tag: 'fil', messages: fil },
  pseudo: { id: 'pseudo', name: 'Pseudo (ẋẋ)', tag: 'en', messages: {}, devOnly: true },
};

/** Register a locale's messages (Filipino is added by its own module). */
export function registerMessages(id: LocaleId, messages: Partial<Record<MessageKey, Message>>): void {
  LOCALES[id].messages = messages;
}

export function availableLocales(includeDev = false): { id: LocaleId; name: string }[] {
  return Object.values(LOCALES)
    .filter((l) => includeDev || !l.devOnly)
    .map((l) => ({ id: l.id, name: l.name }));
}

let current: LocaleDef = LOCALES.en;
let plural = new Intl.PluralRules('en');
let numFmt = new Intl.NumberFormat('en', { maximumFractionDigits: 1 });
const listeners: (() => void)[] = [];

/** Pick a supported locale from the browser's language list. */
export function detectLocale(languages: readonly string[] | undefined = globalThis.navigator?.languages): LocaleId {
  for (const raw of languages ?? []) {
    const l = raw.toLowerCase();
    if (l.startsWith('fil') || l.startsWith('tl')) return 'fil';
    if (l.startsWith('en')) return 'en';
  }
  return 'en';
}

export function resolveLocale(setting: LocaleSetting | undefined): LocaleId {
  if (!setting || setting === 'auto') return detectLocale();
  return setting in LOCALES ? setting : 'en';
}

export function setLocale(id: LocaleId): void {
  const next = LOCALES[id] ?? LOCALES.en;
  if (next.id === 'pseudo' && Object.keys(next.messages).length === 0) next.messages = pseudoMessages(en);
  if (next === current) return;
  current = next;
  plural = new Intl.PluralRules(next.tag);
  numFmt = new Intl.NumberFormat(next.tag, { maximumFractionDigits: 1 });
  try {
    document.documentElement.lang = next.id === 'pseudo' ? 'en' : next.tag;
  } catch {
    /* headless */
  }
  for (const fn of listeners) fn();
}

export function getLocale(): LocaleId {
  return current.id;
}

/** Called after the language changes (screens re-render their text). */
export function onLocaleChange(fn: () => void): () => void {
  listeners.push(fn);
  return () => {
    const i = listeners.indexOf(fn);
    if (i >= 0) listeners.splice(i, 1);
  };
}

/** Locale-aware number: grouping, at most one decimal. */
export function formatNumber(n: number): string {
  return numFmt.format(n);
}

export type Vars = Record<string, string | number>;

function lookup(key: MessageKey): Message {
  return current.messages[key] ?? en[key] ?? key;
}

function interpolate(msg: string, vars: Vars | undefined): string {
  if (!vars || msg.indexOf('{') < 0) return msg;
  return msg.replace(/\{(\w+)\}/g, (m, name: string) => {
    const v = vars[name];
    if (v === undefined) return m;
    return typeof v === 'number' ? numFmt.format(v) : v;
  });
}

/** Translate `key`. Plural messages choose their form from `vars.count`. */
export function t(key: MessageKey, vars?: Vars): string {
  const msg = lookup(key);
  if (typeof msg === 'string') return interpolate(msg, vars);
  const count = typeof vars?.count === 'number' ? vars.count : 0;
  const form = msg[plural.select(count)] ?? msg.other;
  return interpolate(form, vars);
}

/** True if `key` exists in English (for data-driven keys built at runtime). */
export function hasKey(key: string): key is MessageKey {
  return key in en;
}

/**
 * Define translated, read-only text fields on a data object as getters, so
 * `TOWERS.arrow.name` always returns the current language.
 */
export function localized<T extends object, F extends string>(obj: T, prefix: string, fields: readonly F[]): T & Readonly<Record<F, string>> {
  for (const f of fields) {
    const key = `${prefix}.${f}` as MessageKey;
    Object.defineProperty(obj, f, { get: () => t(key), enumerable: true, configurable: true });
  }
  return obj as T & Readonly<Record<F, string>>;
}
