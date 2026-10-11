// A recipe pinned from the workbench: its materials with live counts, under the mission tracker.
import type { App } from '../app';
import { RECIPE_BY_ID, item } from '../data/registry';
import { ingredientStatus } from '../sim/crafting';
import { clear, h } from './dom';
import { iconImg } from './icons';

export class RecipeTracker {
  readonly el = h('div', { class: 'rtrack' });
  private key = '';

  constructor(root: HTMLElement) {
    root.appendChild(this.el);
    this.el.style.display = 'none';
  }

  update(app: App): void {
    const g = app.game;
    const r = g?.state.trackedRecipe ? RECIPE_BY_ID[g.state.trackedRecipe] : undefined;
    if (!g || !r || !app.hud.visible || app.ui.modalOpen) {
      this.el.style.display = 'none';
      this.key = '';
      return;
    }
    this.el.style.display = '';
    // sit just under the mission tracker (whatever its height)
    const t = document.querySelector('.tracker') as HTMLElement | null;
    const top = t && t.style.display !== 'none' ? t.offsetTop + t.offsetHeight + 8 : 74;
    if (this.el.style.top !== `${top}px`) this.el.style.top = `${top}px`;
    const st = ingredientStatus(g, r);
    const key = `${r.id}|${st.map((m) => m.have).join(',')}`;
    if (key === this.key) return;
    this.key = key;
    clear(this.el);
    const ready = st.every((m) => m.have >= m.need);
    const close = h('button', { class: 'rtrack-x', 'aria-label': 'Stop tracking', title: 'Stop tracking' }, '✕');
    close.addEventListener('click', () => {
      delete g.state.trackedRecipe;
      this.key = '';
    });
    this.el.append(
      h('div', { class: 'rtrack-head' }, iconImg(r.result, 'icon sm'), h('b', null, item(r.result).name), close),
      ...st.map((m) => h('div', { class: `rtrack-ing ${m.have >= m.need ? 'ok' : ''}` }, iconImg(m.id, 'icon xs'), h('span', null, item(m.id).name), h('b', null, `${Math.min(m.have, m.need)}/${m.need}`))),
    );
    if (ready) this.el.append(h('div', { class: 'rtrack-ready' }, '✓ Ready to craft at your workbench!'));
  }
}
