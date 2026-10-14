/**
 * The soil overlay: while the Seeds tool is chosen, each empty field on screen wears a small tag with
 * its nitrogen (N) and humus (H) as dots, so planning where to plant is easy. Tags are reused from a
 * pool and only empty fields get one (growing crops already show their care on their card).
 */
import { soilDots } from '../sim/soil';
import type { Farm } from '../sim/state';
import { h } from './h';

const MAX = 80;

export class SoilTags {
  private root: HTMLElement;
  private pool: HTMLElement[] = [];

  constructor(parent: HTMLElement) {
    this.root = h('div.soil-tags', { 'aria-hidden': 'true' });
    parent.appendChild(this.root);
  }

  hide() { if (!this.root.hidden) this.root.hidden = true; }

  /** Place a tag over every empty field that is on screen. */
  show(farm: Farm, onScreen: (x: number, z: number) => { x: number; y: number }, w: number, hgt: number) {
    this.root.hidden = false;
    let n = 0;
    for (const o of farm.objects) {
      if (o.kind !== 'field' || o.crop || n >= MAX) continue;
      const p = onScreen(o.x, o.z);
      if (p.x < -40 || p.y < -20 || p.x > w + 40 || p.y > hgt + 20) continue;
      let el = this.pool[n];
      if (!el) { el = h('span.soil-tag', null, h('i'), h('i')); this.pool.push(el); this.root.appendChild(el); }
      const key = `${o.nit}${o.hum}`;
      if (el.dataset.key !== key) {
        el.dataset.key = key;
        el.children[0]!.textContent = `N ${soilDots(o.nit)}`;
        el.children[1]!.textContent = `H ${soilDots(o.hum)}`;
        el.classList.toggle('rich', o.nit >= 2 && o.hum >= 2);
      }
      el.style.transform = `translate(${Math.round(p.x)}px, ${Math.round(p.y)}px) translate(-50%, -50%)`;
      el.hidden = false;
      n++;
    }
    for (let i = n; i < this.pool.length; i++) this.pool[i]!.hidden = true;
  }
}
