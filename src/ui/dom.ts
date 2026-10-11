type Child = Node | string | number | null | undefined | false;
type Attrs = Record<string, unknown> & {
  class?: string;
  style?: string | Partial<CSSStyleDeclaration>;
  onClick?: (e: MouseEvent) => void;
};

/** Tiny hyperscript helper: h('button.big', { onClick }, 'Play'). */
export function h<K extends keyof HTMLElementTagNameMap>(tag: K | `${K}.${string}`, attrs?: Attrs | null, ...children: Child[]): HTMLElementTagNameMap[K] {
  const [name, ...classes] = (tag as string).split('.');
  const el = document.createElement(name as K);
  if (classes.length) el.className = classes.join(' ');
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      if (v === undefined || v === null || v === false) continue;
      if (k === 'class') el.className = [el.className, v as string].filter(Boolean).join(' ');
      else if (k === 'style') {
        if (typeof v === 'string') el.setAttribute('style', v);
        else Object.assign(el.style, v);
      } else if (k === 'onClick') {
        el.addEventListener('click', (e) => {
          (v as (e: MouseEvent) => void)(e as MouseEvent);
        });
      } else if (k.startsWith('on') && typeof v === 'function') {
        el.addEventListener(k.slice(2).toLowerCase(), v as EventListener);
      } else if (k === 'html') el.innerHTML = v as string;
      else if (v === true) el.setAttribute(k, '');
      else el.setAttribute(k, String(v));
    }
  }
  for (const c of children) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

/** Set text only if changed (avoids layout work in per-frame HUD updates). */
export function setText(el: HTMLElement, text: string): void {
  if (el.textContent !== text) el.textContent = text;
}

export function img(src: string, alt = '', cls = ''): HTMLImageElement {
  const i = document.createElement('img');
  i.src = src;
  i.alt = alt;
  i.draggable = false;
  if (cls) i.className = cls;
  return i;
}

export function clear(el: HTMLElement): void {
  while (el.firstChild) el.removeChild(el.firstChild);
}
