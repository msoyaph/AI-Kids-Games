import { AdditiveBlending, Color, ConeGeometry, Mesh, MeshBasicMaterial, TorusGeometry, Vector3 } from 'three';
import { S } from '../app/services';
import { sfx } from '../audio/sfx';
import { CATEGORY_NAMES, CODEX, CODEX_BY_ID, type CodexCategory } from '../data/codex';
import { factsFor } from '../data/facts';
import { codexPicture } from '../ui/pictures';
import { Character } from '../r3/models/characters';
import { disposeObject } from '../r3/dispose';
import { createPlanet, type PlanetView } from '../r3/space/planets';
import { codexPercent } from '../systems/codex';
import { clear, h } from '../ui/dom';
import { speak } from '../ui/speech';
import { button, iconEl } from '../ui/widgets';
import { AcademyScene } from './AcademyScene';
import { CAST_SCALE, focusPose, screenSpot } from './academyStage';

const TABS: Array<{ cat: CodexCategory; icon: string }> = [
  { cat: 'planet', icon: 'planet' },
  { cat: 'moon', icon: 'eye' },
  { cat: 'dwarf', icon: 'star' },
  { cat: 'star', icon: 'sparkle' },
  { cat: 'space', icon: 'target' },
  { cat: 'tech', icon: 'rocket' },
  { cat: 'story', icon: 'alien' },
];


/** How big the hologram is (world units). */
const HOLO = 0.85;

/**
 * The Space Codex: an encyclopedia of everything you have discovered. It lives in the Academy
 * library: the selected planet (or friend) floats as a hologram over the projector, seen through
 * a window in the panels.
 */
export class CodexScene extends AcademyScene {
  private cat: CodexCategory = 'planet';
  private selected: string | null = null;
  private grid: HTMLElement;
  private detail: HTMLElement;
  private holo: HTMLElement;
  private tabBtns = new Map<CodexCategory, HTMLButtonElement>();
  private planet: PlanetView | null = null;
  private friend: Character | null = null;
  private shownId = '';
  private readonly sunDir = new Vector3(0.6, 0.35, 0.75).normalize();
  private ring: Mesh;
  private beam: Mesh;
  private framed = false;

  constructor() {
    super('codex');
    this.music = 'hub';
    const d = S.state.data;
    const known = d.codex.filter((c) => CODEX_BY_ID[c]).length;
    const tabs = h('div', { class: 'tabs' });
    for (const t of TABS) {
      const b = button(CATEGORY_NAMES[t.cat], t.icon, () => this.setCat(t.cat), { size: 'small', color: 'white', id: `codex-tab-${t.cat}`, sound: 'tab' });
      b.classList.add('tab');
      this.tabBtns.set(t.cat, b);
      tabs.append(b);
    }
    const header = h(
      'div',
      { class: 'scr-header' },
      button('Back', 'back', () => this.back(), { round: true, color: 'white', id: 'btn-back' }),
      h('div', { class: 'title' }, 'Space Codex'),
      h('div', { class: 'spacer' }),
      h('div', { class: 'pill', 'data-testid': 'codex-progress' }, iconEl('book'), `${known} / ${CODEX.length} (${codexPercent(d.codex)}%)`),
    );
    this.grid = h('div', { class: 'cards scroll codex-grid', 'data-testid': 'codex-grid' });
    this.detail = h('div', { class: 'panel codex-detail scroll' });
    this.holo = h('div', { class: 'holo-window', 'data-testid': 'codex-holo' });
    this.ui.append(header, h('div', { class: 'board-main' }, h('div', { class: 'panel col codex-left' }, tabs, this.grid), h('div', { class: 'codex-right' }, this.holo, this.detail)));
    this.ui.classList.add('menu-screen');
    // Projector glow: a ring and a soft cone of light under the hologram.
    const glow = new MeshBasicMaterial({ color: new Color('#7dffe9').multiplyScalar(2), transparent: true, opacity: 0.85, blending: AdditiveBlending, depthWrite: false });
    this.ring = new Mesh(new TorusGeometry(HOLO * 1.15, 0.025, 8, 48), glow);
    this.ring.rotation.x = Math.PI / 2;
    this.beam = new Mesh(new ConeGeometry(HOLO * 1.1, HOLO * 2.2, 32, 1, true), new MeshBasicMaterial({ color: new Color('#7dffe9').multiplyScalar(0.6), transparent: true, opacity: 0.18, blending: AdditiveBlending, depthWrite: false }));
    this.local.add(this.ring, this.beam);
  }

  override enter(): void {
    S.state.emit({ type: 'visit', place: 'codex' });
    this.setCat('planet');
    this.frame(false);
  }

  /** Point the camera at the projector so the hologram shows through the holo window. */
  private frame(instant: boolean): void {
    const spot = screenSpot(this.holo);
    const holo = this.stage.academy.spots.holo;
    const target = new Vector3(holo.x, holo.y + HOLO * 1.1, holo.z);
    if (!spot) {
      this.showRoom(this.stage.academy.poses.codex, instant);
      return;
    }
    const f = focusPose(target, HOLO * 2.6, spot.h, spot.x, spot.y, 34, 0.12);
    this.glide.to(f.pose, f.offX, f.offY, instant);
    this.framed = true;
  }

  override resize(w: number, hh: number): void {
    super.resize(w, hh);
    if (this.framed) requestAnimationFrame(() => this.frame(true));
  }

  protected override renderStage(dt: number): void {
    const holo = this.stage.academy.spots.holo;
    const y = holo.y + HOLO * 1.1 + Math.sin(this.time * 1.4) * 0.05;
    this.ring.position.set(holo.x, holo.y + 0.08, holo.z);
    this.ring.rotation.z = this.time * 0.6;
    this.beam.position.set(holo.x, holo.y + HOLO * 1.1, holo.z);
    this.beam.rotation.x = Math.PI;
    if (this.planet) {
      this.planet.group.position.set(holo.x, y, holo.z);
      this.planet.update(this.time, this.sunDir);
    }
    if (this.friend) {
      this.friend.group.position.set(holo.x, holo.y + 0.25, holo.z);
      this.friend.group.rotation.y = Math.sin(this.time * 0.6) * 0.5;
      this.friend.update(dt);
    }
  }

  /** Show the selected entry on the projector: a real planet, a 3D friend, or the picture in the window. */
  private showHolo(e: (typeof CODEX)[number], known: boolean): void {
    const id = `${e.id}:${known}`;
    if (id === this.shownId) return;
    this.shownId = id;
    if (this.planet) {
      this.local.remove(this.planet.group);
      disposeObject(this.planet.group);
      this.planet = null;
    }
    if (this.friend) {
      this.local.remove(this.friend.group);
      disposeObject(this.friend.group);
      this.friend = null;
    }
    this.holo.replaceChildren();
    const r3 = S.game.r3;
    if ('body' in e.picture) {
      this.planet = createPlanet(e.picture.body, HOLO, { renderer: r3.renderer, profile: r3.profile, detail: 'hero' });
      if (this.planet.recipe.rings) this.planet.group.scale.setScalar(HOLO * 0.62);
      this.planet.setDim(known ? 1 : 0.2);
      this.local.add(this.planet.group);
    } else if ('char' in e.picture && known) {
      this.friend = new Character(e.picture.char);
      this.friend.group.scale.setScalar(CAST_SCALE * 0.85);
      this.friend.setAnim('wave');
      this.local.add(this.friend.group);
    } else {
      const pic = codexPicture(e, 170);
      if (!known) pic.style.filter = 'brightness(0) opacity(.45)';
      this.holo.append(pic);
    }
  }

  override back(): boolean {
    void S.game.go('hub');
    return true;
  }

  private setCat(cat: CodexCategory): void {
    this.cat = cat;
    for (const [k, b] of this.tabBtns) b.classList.toggle('on', k === cat);
    const list = CODEX.filter((e) => e.category === cat);
    const found = list.find((e) => S.state.data.codex.includes(e.id));
    this.selected = found?.id ?? list[0]?.id ?? null;
    this.renderGrid();
    this.renderDetail();
  }

  private renderGrid(): void {
    clear(this.grid);
    const have = new Set(S.state.data.codex);
    for (const e of CODEX.filter((x) => x.category === this.cat)) {
      const known = have.has(e.id);
      const pic = codexPicture(e, 80);
      if (!known) pic.style.filter = 'brightness(0) opacity(.45)';
      const card = h('button', { class: `card codex-card ${this.selected === e.id ? 'sel' : ''}`, type: 'button', 'data-testid': `codex-${e.id}` }, pic, h('div', { class: 'card-name' }, known ? e.name : '???'));
      card.addEventListener('click', () => {
        this.selected = e.id;
        sfx('select');
        this.renderGrid();
        this.renderDetail();
      });
      this.grid.append(card);
    }
  }

  private renderDetail(): void {
    clear(this.detail);
    const e = this.selected ? CODEX_BY_ID[this.selected] : null;
    if (!e) return;
    const known = S.state.data.codex.includes(e.id);
    this.showHolo(e, known);
    if (!known) {
      this.detail.append(h('div', { class: 'h2' }, 'Not found yet!'), h('div', { class: 'detail-text' }, e.hint));
      return;
    }
    const tag = e.id === 'wormhole' ? h('span', { class: 'tag story' }, 'Science idea') : e.real ? h('span', { class: 'tag real' }, 'Real') : h('span', { class: 'tag story' }, 'Story (made up)');
    const facts = factsFor(e.id);
    const list = h('div', { class: 'fact-list' });
    for (const f of facts) {
      list.append(h('div', { class: 'fact' }, button('Read', 'speaker', () => speak(f.text, { force: true }), { round: true, size: 'small', color: 'white', sound: null }), h('span', null, f.text)));
    }
    const readAll = button('Read to me', 'speaker', () => speak([e.name, e.blurb, ...facts.map((f) => f.text)].join(' '), { force: true }), { size: 'small', color: 'white', id: 'btn-codex-read', sound: null });
    this.detail.append(h('div', { class: 'col' }, h('div', { class: 'row' }, h('div', { class: 'h2' }, e.name), tag), h('div', { class: 'detail-text' }, e.blurb), readAll));
    if (facts.length) this.detail.append(h('div', { class: 'h3' }, 'Fun facts'), list);
  }
}
