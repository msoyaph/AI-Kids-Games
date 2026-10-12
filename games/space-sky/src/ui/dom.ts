type Child = Node | string | number | null | undefined | false;
type Props = Record<string, unknown> & {
  class?: string;
  style?: string | Partial<CSSStyleDeclaration>;
  dataset?: Record<string, string>;
};

/** Tiny hyperscript helper: h('button', { class: 'btn', onclick }, 'Play'). */
export function h<K extends keyof HTMLElementTagNameMap>(tag: K, props: Props | null = null, ...children: Child[]): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (props) {
    for (const key in props) {
      const v = props[key];
      if (v === undefined || v === null || v === false) continue;
      if (key === 'class') el.className = String(v);
      else if (key === 'style') {
        if (typeof v === 'string') el.style.cssText = v;
        else Object.assign(el.style, v);
      } else if (key === 'dataset') Object.assign(el.dataset, v as Record<string, string>);
      else if (key === 'html') el.innerHTML = String(v);
      else if (key.startsWith('on') && typeof v === 'function') el.addEventListener(key.slice(2), v as EventListener);
      else if (v === true) el.setAttribute(key, '');
      else el.setAttribute(key, String(v));
    }
  }
  append(el, children);
  return el;
}

export function append(el: Element, children: Child[]): void {
  for (const c of children) {
    if (c === null || c === undefined || c === false) continue;
    el.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
  }
}

export function clear(el: Element): void {
  while (el.firstChild) el.removeChild(el.firstChild);
}

/** Set text only when it changed (avoids layout work in per-frame HUD updates). */
export function setText(el: HTMLElement, text: string): void {
  if (el.textContent !== text) el.textContent = text;
}

/** Element from an SVG markup string. */
export function svg(markup: string, cls = 'ico'): HTMLElement {
  const span = document.createElement('span');
  span.className = cls;
  span.innerHTML = markup;
  span.setAttribute('aria-hidden', 'true');
  return span;
}
