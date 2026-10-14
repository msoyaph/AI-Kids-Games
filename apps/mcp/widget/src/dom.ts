// A tiny element builder: h('p', { class: 'muted' }, 'text', child).
type Child = Node | string | false | null | undefined;
export function h<K extends keyof HTMLElementTagNameMap>(tag: K,attrs: Record<string,string | boolean | number | ((event: Event) => void) | undefined> = {},...children: Child[]) {
  const el = document.createElement(tag);
  for (const [name,value] of Object.entries(attrs)) {
    if (value === undefined || value === false) continue;
    if (typeof value === 'function') el.addEventListener(name.replace(/^on/,'').toLowerCase(),value);
    else if (value === true) el.setAttribute(name,'');
    else el.setAttribute(name,String(value));
  }
  for (const child of children) if (child !== false && child !== null && child !== undefined) el.append(child);
  return el;
}
