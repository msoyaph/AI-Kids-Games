type Child = Node | string | number | null | undefined | false;
type Props = Record<string, unknown> & { class?: string; style?: string };

/** Tiny hyperscript helper: h('div', { class: 'x', onclick }, ...children). */
export function h<K extends keyof HTMLElementTagNameMap>(tag: K, props: Props | null = null, ...children: Child[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (props) {
    for (const [k, v] of Object.entries(props)) {
      if (v === undefined || v === null || v === false) continue;
      if (k === 'class') el.className = String(v);
      else if (k === 'style') el.setAttribute('style', String(v));
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v as EventListener);
      else if (k === 'html') el.innerHTML = String(v);
      else el.setAttribute(k, v === true ? '' : String(v));
    }
  }
  for (const c of children) {
    if (c === null || c === undefined || c === false) continue;
    el.append(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
  }
  return el;
}

export function img(src: string, cls = 'icon', alt = ''): HTMLImageElement {
  const i = document.createElement('img');
  i.className = cls;
  i.alt = alt;
  i.draggable = false;
  if (src) i.src = src;
  return i;
}

/** Set text only if it changed (avoids layout work every frame). */
export function setText(el: HTMLElement, text: string): void {
  if (el.textContent !== text) el.textContent = text;
}

export function setWidth(el: HTMLElement, frac: number): void {
  const v = `${(Math.max(0, Math.min(1, frac)) * 100).toFixed(1)}%`;
  if (el.style.width !== v) el.style.width = v;
}
