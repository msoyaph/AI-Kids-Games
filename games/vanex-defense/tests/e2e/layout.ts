import { expect, type Page } from '@playwright/test';

/** Shared layout checks (i18n + accessibility specs). */
export interface Issue {
  text: string;
  why: string;
}

/** Runs in the page: every visible text node must fit inside its clipping boxes. */
export function findOverflow(pseudo: boolean): Issue[] {
  const issues: Issue[] = [];
  const vw = innerWidth;
  const vh = innerHeight;
  const root = document.getElementById('ui') ?? document.body;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const range = document.createRange();
  const seen = new Set<Element>();
  const hiddenUp = (el: Element): boolean => {
    for (let a: Element | null = el; a; a = a.parentElement) {
      const cs = getComputedStyle(a);
      if (cs.display === 'none' || cs.visibility === 'hidden' || Number(cs.opacity) < 0.05 || a.getAttribute('aria-hidden') === 'true') return true;
    }
    return false;
  };
  while (walker.nextNode()) {
    const node = walker.currentNode as Text;
    const text = (node.textContent ?? '').trim();
    if (!text) continue;
    const el = node.parentElement;
    if (!el || hiddenUp(el)) continue;
    range.selectNodeContents(node);
    const rects = [...range.getClientRects()].filter((r) => r.width > 0.5 && r.height > 0.5);
    if (!rects.length) continue;
    // text parked fully off-screen (closed drawers, slide-outs) is not "clipped"
    if (rects.every((r) => r.right <= 0 || r.left >= vw || r.bottom <= 0 || r.top >= vh)) continue;
    // clip box: viewport width, narrowed by every ancestor that hides overflow
    let l = 0;
    let r = vw;
    let tp = -Infinity;
    let b = Infinity;
    // content inside a scroll container can be scrolled to: clipping from it
    // (and from anything above it) on that axis doesn't hide text for good
    let scrollX = false;
    let scrollY = false;
    for (let a: Element | null = el; a && a !== document.documentElement; a = a.parentElement) {
      const cs = getComputedStyle(a);
      const box = a.getBoundingClientRect();
      if (!scrollX && (cs.overflowX === 'hidden' || cs.overflowX === 'clip')) {
        l = Math.max(l, box.left);
        r = Math.min(r, box.right);
      }
      if (!scrollY && (cs.overflowY === 'hidden' || cs.overflowY === 'clip')) {
        tp = Math.max(tp, box.top);
        b = Math.min(b, box.bottom);
      }
      if (cs.overflowX === 'auto' || cs.overflowX === 'scroll') scrollX = true;
      if (cs.overflowY === 'auto' || cs.overflowY === 'scroll') scrollY = true;
    }
    const tol = 1.5;
    const bad = rects.find((q) => (!scrollX && (q.left < l - tol || q.right > r + tol)) || q.top < tp - tol || q.bottom > b + tol);
    if (bad) issues.push({ text, why: `clipped (${Math.round(bad.left)}..${Math.round(bad.right)} × ${Math.round(bad.top)}..${Math.round(bad.bottom)} vs ${Math.round(l)}..${Math.round(r)} × ${Math.round(tp)}..${Math.round(b)}) in <${el.tagName.toLowerCase()} class="${el.className}">` });
    // covered by another control (e.g. a wider label sliding under a button)?
    const modal = document.querySelector('.modal-back');
    if (!modal || modal.contains(el)) {
      const q = rects[0]!;
      const cx = q.left + q.width / 2;
      const cy = q.top + q.height / 2;
      if (cx > 0 && cx < vw && cy > 0 && cy < vh) {
        const hit = document.elementFromPoint(cx, cy);
        // big layers (panels, drawers) stack over each other on purpose; small controls must not hide text
        const layer = hit?.closest('.panel, .drawer, .modal-back') ?? hit;
        const lb = layer?.getBoundingClientRect();
        const small = !!lb && lb.width * lb.height < 160 * 160;
        if (hit && small && !layer!.contains(el) && hit !== el && !el.contains(hit) && !hit.contains(el) && hit.tagName !== 'CANVAS') issues.push({ text, why: `covered by <${hit.tagName.toLowerCase()} class="${hit.className}">` });
      }
    }
    const cs = getComputedStyle(el);
    if (!seen.has(el) && cs.textOverflow === 'ellipsis' && el.scrollWidth > el.clientWidth + 1) issues.push({ text, why: 'ellipsised' });
    seen.add(el);
    // pseudo-locale: any real words without the ⟦…⟧ marker skipped translation
    // (text marked with its own lang attribute — language names — is meant to stay as is)
    if (pseudo && !el.closest('#ui [lang]') && /[A-Za-z]{3,}/.test(text) && !/[⟦⟧]/.test(text) && !/[áéíóúñŕţšžçďĝĥĵķľṽŵẋýƀƒɱþǫ]/i.test(text)) issues.push({ text, why: 'not translated' });
  }
  return issues;
}

export async function check(page: Page, label: string, locale: string): Promise<void> {
  await page.waitForTimeout(350); // let entry transitions finish
  const issues = await page.evaluate(findOverflow, locale === 'pseudo');
  expect(issues, `${label} [${locale}]:\n${issues.map((i) => `  “${i.text}” — ${i.why}`).join('\n')}`).toEqual([]);
}

export async function open(page: Page, query: string): Promise<void> {
  await page.goto(`/?${query}`);
  await page.waitForFunction(() => !document.getElementById('boot'), null, { timeout: 30_000 });
}

