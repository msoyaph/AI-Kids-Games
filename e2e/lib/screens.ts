// Every screen of the game, staged through window.__lc.dev, plus an in-page layout checker:
// nothing outside the viewport or under a notch/home bar, no overlapping tap targets, every tap target
// at least 48 px, readable text, and the HUD never covering a menu. Used by the touch audit
// (scripts/touch-audit.ts) and the layout tests (e2e/layout.spec.ts).
import type { Page } from '@playwright/test';

export interface Viewport {
  name: string;
  width: number;
  height: number;
  /** simulated safe-area insets (notch / home bar), CSS px */
  insets: { t: number; r: number; b: number; l: number };
  kind: 'phone' | 'tablet';
}

const notchPortrait = { t: 47, r: 0, b: 34, l: 0 };
const notchLandscape = { t: 0, r: 47, b: 21, l: 47 };
const tabletInsets = { t: 24, r: 0, b: 20, l: 0 };
const tabletLandscape = { t: 24, r: 0, b: 20, l: 0 };

export const PHONES: [number, number][] = [
  [360, 800],
  [390, 844],
  [430, 932],
];
export const TABLETS: [number, number][] = [
  [820, 1180],
  [1024, 1366],
];

export const VIEWPORTS: Viewport[] = [
  ...PHONES.flatMap(([w, h]): Viewport[] => [
    { name: `phone-${w}x${h}`, width: w, height: h, insets: notchPortrait, kind: 'phone' },
    { name: `phone-${h}x${w}`, width: h, height: w, insets: notchLandscape, kind: 'phone' },
  ]),
  ...TABLETS.flatMap(([w, h]): Viewport[] => [
    { name: `tablet-${w}x${h}`, width: w, height: h, insets: tabletInsets, kind: 'tablet' },
    { name: `tablet-${h}x${w}`, width: h, height: w, insets: tabletLandscape, kind: 'tablet' },
  ]),
];

type Dev = Record<string, (...a: unknown[]) => unknown>;
type AppLike = { dev: Dev; panels: Record<string, (a?: unknown) => void>; input: { push(c: string): void }; settings: Record<string, unknown>; applySettings(): void; openPause(): void; tip(id: string): void; game: { state: Record<string, unknown> } | null; debugStep(n: number): void };

/** Run a setup function in the page with the app and its dev helpers. */
async function inPage(page: Page, f: (app: AppLike, d: Dev, arg: unknown) => unknown, arg?: unknown): Promise<void> {
  await page.evaluate(
    ([src, a]) => {
      const app = (window as unknown as { __lc: AppLike }).__lc;
      // tsx/esbuild may wrap helpers in __name(): give the page a no-op one
      (window as unknown as { __name: unknown }).__name ??= (fn: unknown) => fn;
      return new Function('app', 'd', 'arg', `return (${src})(app, d, arg)`)(app, app.dev, a);
    },
    [f.toString(), arg] as const,
  );
}

export interface Screen {
  name: string;
  setup(page: Page): Promise<void>;
}

const game = (f: (app: AppLike, d: Dev) => unknown): Screen['setup'] => async (page) => {
  await inPage(page, (_app, d) => {
    d.start!();
    d.town!();
    d.tools!();
  });
  await inPage(page, f as (app: AppLike, d: Dev, arg: unknown) => unknown);
};

export const SCREENS: Screen[] = [
  { name: 'title', setup: async () => {} },
  { name: 'slots', setup: async (page) => page.getByRole('button', { name: /Start|Continue/ }).click() },
  {
    name: 'creator',
    setup: async (page) => {
      await page.getByRole('button', { name: /Start|Continue/ }).click();
      await page.getByText('New Game').first().click();
    },
  },
  { name: 'play', setup: game((_a, d) => (d.equip!('shovel'), d.face!('tree'))) },
  { name: 'play-net', setup: game((_a, d) => d.equip!('net')) },
  { name: 'play-tracker', setup: game((app, d) => ((app.game!.state as { trackedRecipe?: string }).trackedRecipe = 'r_furn_wick_lantern', d.chapter!(2))) },
  { name: 'tip', setup: game((app) => ((app.game!.state as { tips: Record<string, number> }).tips = {}, app.tip('net'))) },
  { name: 'tool-ring', setup: game((app) => app.panels.toolRing!()) },
  { name: 'inventory', setup: game((app) => app.input.push('inventory')) },
  { name: 'dialogue', setup: game((app) => app.panels.talk!('tansy')) },
  { name: 'dialogue-choices', setup: game((app) => app.panels.talk!('fennimore')) },
  { name: 'phone', setup: game((app) => app.panels.phone!()) },
  { name: 'phone-map', setup: game((app) => app.panels.phone!('map')) },
  { name: 'phone-missions', setup: game((app) => app.panels.phone!('quests')) },
  { name: 'phone-settings', setup: game((app) => app.panels.phone!('settings')) },
  { name: 'phone-glow', setup: game((app) => app.panels.phone!('glow')) },
  { name: 'phone-friends', setup: game((app) => app.panels.phone!('friends')) },
  { name: 'phone-calendar', setup: game((app) => app.panels.phone!('calendar')) },
  { name: 'phone-catalog', setup: game((app) => app.panels.phone!('catalog')) },
  { name: 'pause', setup: game((app) => app.openPause()) },
  { name: 'settings', setup: game((app) => app.panels.settings!()) },
  { name: 'shop', setup: game((app, d) => (d.give!('fruit_blushpear', 6), app.panels.shop!())) },
  { name: 'craft', setup: game((app, d) => (d.give!('timber', 20), d.give!('fiber', 20), app.panels.craft!())) },
  { name: 'hall', setup: game((app) => app.panels.hall!()) },
  { name: 'museum-desk', setup: game((app) => app.panels.museumDesk!()) },
  { name: 'board', setup: game((app) => app.panels.board!()) },
  { name: 'shop-inside', setup: game((_a, d) => (d.hour!(11), d.inside!('shop'))) },
  { name: 'home-inside', setup: game((_a, d) => d.inside!('home')) },
  { name: 'editor', setup: game((app, d) => (d.give!('furn_plank_table'), d.give!('furn_wick_lantern'), d.give!('furn_sunset_painting'), d.inside!('home'), app.panels.editor!())) },
  { name: 'closet', setup: game((app, d) => (d.give!('cloth_sunny_tee'), d.inside!('home'), app.panels.wardrobe!())) },
  { name: 'dye', setup: game((app, d) => (d.give!('cloth_sunny_tee'), d.give!('flower_bell_red', 2), d.inside!('home'), app.panels.dye!())) },
  { name: 'placement', setup: game((_a, d) => d.plot!('bellamy')) },
  { name: 'reel', setup: game((_a, d) => (d.equip!('rod'), d.face!('water'), d.reel!())) },
  { name: 'contest', setup: game((_a, d) => (d.equip!('rod'), d.face!('water'), d.contest!('tournament'))) },
  { name: 'festival-skate', setup: game((_a, d) => d.festival!('lanternSkate')) },
  { name: 'gl-lost', setup: game((_a, d) => d.loseGL!()) },
  { name: 'dialogue-bigtext', setup: game((app) => ((app.settings.textSize = 1.5), app.applySettings(), app.panels.talk!('fennimore'))) },
];

/** Simulate a notch / home bar (the game reads them through --sat/--sar/--sab/--sal). */
export async function setInsets(page: Page, v: Viewport): Promise<void> {
  await page.evaluate((i) => {
    // tsx/esbuild may wrap helpers in __name(): give the page a no-op one
    (window as unknown as { __name: unknown }).__name ??= (fn: unknown) => fn;
    const s = document.documentElement.style;
    s.setProperty('--sat', `${i.t}px`);
    s.setProperty('--sar', `${i.r}px`);
    s.setProperty('--sab', `${i.b}px`);
    s.setProperty('--sal', `${i.l}px`);
  }, v.insets);
}

export interface LayoutIssue {
  kind: 'offscreen' | 'unsafe' | 'small' | 'overlap' | 'covers' | 'text';
  what: string;
  detail: string;
}

/** In-page layout check. `insets` are the simulated safe areas. */
export async function checkLayout(page: Page, insets: Viewport['insets'], minTap = 48): Promise<LayoutIssue[]> {
  return page.evaluate(
    ([ins, min]) => {
      const issues: { kind: string; what: string; detail: string }[] = [];
      const vw = innerWidth, vh = innerHeight;
      const name = (el: Element) => {
        const t = (el.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 24);
        const cls = (el.getAttribute('class') ?? '').split(' ').filter(Boolean).slice(0, 2).join('.');
        return `${el.tagName.toLowerCase()}${cls ? '.' + cls : ''}${t ? ` "${t}"` : ''}`;
      };
      const shown = (el: Element) => {
        const cs = getComputedStyle(el);
        if (cs.visibility === 'hidden' || cs.display === 'none' || el.getClientRects().length === 0) return false;
        for (let e: Element | null = el; e; e = e.parentElement) {
          const s = getComputedStyle(e);
          if (s.display === 'none' || Number(s.opacity) < 0.05) return false;
        }
        return true;
      };
      // the visible part of an element, clipped by scrolling/overflow-hidden ancestors
      const visibleRect = (el: Element) => {
        let r = el.getBoundingClientRect();
        let L = r.left, T = r.top, R = r.right, B = r.bottom;
        for (let e = el.parentElement; e; e = e.parentElement) {
          const s = getComputedStyle(e);
          if (/(auto|scroll|hidden)/.test(s.overflowX + s.overflowY)) {
            const c = e.getBoundingClientRect();
            L = Math.max(L, c.left);
            T = Math.max(T, c.top);
            R = Math.min(R, c.right);
            B = Math.min(B, c.bottom);
          }
        }
        return { left: L, top: T, right: R, bottom: B, w: R - L, h: B - T, full: r };
      };
      const tappable = Array.from(document.querySelectorAll('button, input, select, textarea, a[href], [data-nav], .tc-btn, .tc-stick-zone'))
        .filter((e) => shown(e) && getComputedStyle(e).pointerEvents !== 'none')
        .filter((e) => !e.closest('[data-layout-skip]'));
      const rects = new Map<Element, ReturnType<typeof visibleRect>>();
      for (const e of tappable) {
        const r = visibleRect(e);
        if (r.w <= 1 || r.h <= 1) continue; // scrolled out of view
        rects.set(e, r);
        const f = r.full;
        if (f.left < -1 || f.top < -1 || f.right > vw + 1 || f.bottom > vh + 1) {
          // inside a scroller it only has to be reachable, which visibleRect already clips
          if (r.left < -1 || r.top < -1 || r.right > vw + 1 || r.bottom > vh + 1) issues.push({ kind: 'offscreen', what: name(e), detail: `${Math.round(f.left)},${Math.round(f.top)} ${Math.round(f.width)}x${Math.round(f.height)}` });
        }
        if (r.left < ins.l - 1 || r.top < ins.t - 1 || r.right > vw - ins.r + 1 || r.bottom > vh - ins.b + 1) {
          if (!e.closest('.dim')) issues.push({ kind: 'unsafe', what: name(e), detail: `${Math.round(r.left)},${Math.round(r.top)}-${Math.round(r.right)},${Math.round(r.bottom)}` });
        }
        if (Math.min(f.width, f.height) < min - 0.5 && !e.matches('.dim, textarea')) issues.push({ kind: 'small', what: name(e), detail: `${Math.round(f.width)}x${Math.round(f.height)}` });
      }
      // every tap target must be the thing a finger hits at its centre (nothing laid over it),
      // except what an open menu's backdrop deliberately covers
      for (const [e, r] of rects) {
        const top = document.elementFromPoint(r.left + r.w / 2, r.top + r.h / 2);
        if (!top || e.contains(top) || top.contains(e)) continue;
        if (top.closest('.screen, .dim, .editor, .decor-edit, .dlg-wrap, .gl-card, .fade')) continue;
        issues.push({ kind: 'overlap', what: name(e), detail: `can't be tapped: ${name(top)} is on top` });
      }
      const els = [...rects.keys()];
      const hit = (a: { left: number; top: number; right: number; bottom: number }, b: typeof a) => {
        const w = Math.min(a.right, b.right) - Math.max(a.left, b.left);
        const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
        return w > 2 && h > 2 ? { x: (Math.max(a.left, b.left) + Math.min(a.right, b.right)) / 2, y: (Math.max(a.top, b.top) + Math.min(a.bottom, b.bottom)) / 2 } : null;
      };
      const round = (e: Element) => {
        const r = (e as HTMLElement).getBoundingClientRect();
        return parseFloat(getComputedStyle(e).borderTopLeftRadius) >= Math.min(r.width, r.height) / 2 - 1 && Math.abs(r.width - r.height) < 2;
      };
      for (let i = 0; i < els.length; i++)
        for (let j = i + 1; j < els.length; j++) {
          const a = els[i]!, b = els[j]!;
          if (a.contains(b) || b.contains(a)) continue;
          if (a.matches('.dim, .tc-zone') || b.matches('.dim, .tc-zone')) continue;
          if (!hit(rects.get(a)!, rects.get(b)!)) continue;
          if (round(a) && round(b)) {
            const ra = rects.get(a)!.full, rb = rects.get(b)!.full;
            const d = Math.hypot(ra.left + ra.width / 2 - (rb.left + rb.width / 2), ra.top + ra.height / 2 - (rb.top + rb.height / 2));
            if (d >= (ra.width + rb.width) / 2 - 2) continue;
          }
          issues.push({ kind: 'overlap', what: name(a), detail: `overlaps ${name(b)}` });
        }
      // HUD pieces: never on top of each other, of a tap target, or of an open menu
      const hud = Array.from(document.querySelectorAll('.hud-clock, .hud-money .pill, .hud-tool, .hud-prompt:not(.hidden), .tracker, .rtrack, .contest-hud, .tip, .reel, .toast, .pt-badge, .tc-sneak')).filter(shown);
      const hudRect = new Map(hud.map((e) => [e, e.getBoundingClientRect()]));
      for (let i = 0; i < hud.length; i++)
        for (let j = i + 1; j < hud.length; j++) {
          const a = hud[i]!, b = hud[j]!;
          if (a.contains(b) || b.contains(a)) continue;
          if (a.matches('.toast') && b.matches('.toast')) continue;
          if (hit(hudRect.get(a)!, hudRect.get(b)!)) issues.push({ kind: 'covers', what: name(a), detail: `HUD overlaps ${name(b)}` });
        }
      // HUD pieces ignore touches, so make them hit-testable for a moment to see what's painted on top
      const probe = document.createElement('style');
      probe.textContent = '.hud-lane *, .hud *, .tracker, .rtrack, .toast, .tip, .reel, .contest-hud, .pt-badge, .tc-sneak { pointer-events: auto !important; }';
      document.head.append(probe);
      for (const a of hud) {
        const ra = hudRect.get(a)!;
        if (ra.left < ins.l - 1 || ra.top < ins.t - 1 || ra.right > vw - ins.r + 1 || ra.bottom > vh - ins.b + 1) issues.push({ kind: 'unsafe', what: name(a), detail: `HUD ${Math.round(ra.left)},${Math.round(ra.top)}-${Math.round(ra.right)},${Math.round(ra.bottom)}` });
        for (const b of els) {
          if (a.contains(b) || b.contains(a)) continue;
          const p = hit(ra, rects.get(b)!);
          if (!p) continue;
          const top = document.elementFromPoint(p.x, p.y);
          if (top && a.contains(top)) issues.push({ kind: 'covers', what: name(a), detail: `HUD covers ${name(b)}` });
        }
      }
      probe.remove();
      // readable text: nothing visible under 12 px
      const walker = document.createTreeWalker(document.getElementById('ui') ?? document.body, NodeFilter.SHOW_TEXT);
      const small = new Set<string>();
      for (let n = walker.nextNode(); n; n = walker.nextNode()) {
        const el = n.parentElement;
        if (!el || !(n.textContent ?? '').trim() || !shown(el)) continue;
        const fs = parseFloat(getComputedStyle(el).fontSize);
        if (fs < 11.5) small.add(`${name(el)} ${fs}px`);
      }
      for (const s of small) issues.push({ kind: 'text', what: s, detail: 'font under 12px' });
      return issues;
    },
    [insets, minTap] as const,
  ) as Promise<LayoutIssue[]>;
}
