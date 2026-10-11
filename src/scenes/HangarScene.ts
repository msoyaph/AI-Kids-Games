import { Vector3 } from 'three';
import { comfortOn } from '../app/comfort';
import { Scene3D } from '../app/Scene3D';
import { S } from '../app/services';
import { sfx } from '../audio/sfx';
import { PARTS, PART_BY_ID } from '../data/parts';
import { STICKER_BY_ID } from '../data/stickers';
import { STAT_KEYS, type PartSlot, type RocketLoadout, type StatKey } from '../data/types';
import { drawToCanvas } from '../gfx/canvas';
import { drawSticker } from '../gfx/art/stickers';
import { drawPortrait } from '../gfx/art/characters';
import { CHAR_BY_ID } from '../data/characters';
import { updateRocketTex } from '../gfx/textures';
import { Particles3 } from '../r3/fx/particles';
import { RocketModel } from '../r3/models/rocket';
import { buildHangarBay, type HangarBay } from '../r3/rooms/hangarBay';
import { buy, canBuy, equipPart, equipSticker, isUnlocked, unlockHint } from '../systems/economy';
import { statStars } from '../systems/rocketStats';
import { clear, h, setText } from '../ui/dom';
import { icon } from '../ui/icons';
import { speak } from '../ui/speech';
import { toast } from '../ui/toast';
import { button, iconEl, starIcon } from '../ui/widgets';
import { clearThumbQueue, rocketThumb } from '../ui/rocketThumbs';

type Tab = PartSlot | 'stickers';

const TABS: Array<{ tab: Tab; label: string; icon: string }> = [
  { tab: 'nose', label: 'Nose', icon: 'cone' },
  { tab: 'body', label: 'Body', icon: 'capsule' },
  { tab: 'engine', label: 'Engine', icon: 'nozzle' },
  { tab: 'fins', label: 'Fins', icon: 'fin' },
  { tab: 'tank', label: 'Tank', icon: 'fuel' },
  { tab: 'cargo', label: 'Cargo', icon: 'box' },
  { tab: 'lights', label: 'Lights', icon: 'bulb' },
  { tab: 'paint', label: 'Paint', icon: 'paint' },
  { tab: 'stickers', label: 'Stickers', icon: 'sticker' },
];

const STAT_INFO: Record<StatKey, { label: string; icon: string }> = {
  speed: { label: 'Speed', icon: 'boost' },
  fuel: { label: 'Fuel', icon: 'fuel' },
  cargo: { label: 'Cargo', icon: 'box' },
  shield: { label: 'Shield', icon: 'shield' },
};

/** Where the camera looks for each tab (height on the rocket) and whether to turn the rocket's front to you. */
const FOCUS: Record<Tab, { y: number; front: boolean; zoom: number }> = {
  nose: { y: 0.5, front: false, zoom: 0.94 },
  body: { y: 0.1, front: false, zoom: 1 },
  engine: { y: -0.5, front: false, zoom: 0.94 },
  fins: { y: -0.35, front: false, zoom: 0.97 },
  tank: { y: 0, front: false, zoom: 1 },
  cargo: { y: -0.2, front: true, zoom: 0.94 },
  lights: { y: 0.15, front: true, zoom: 1 },
  paint: { y: 0.1, front: false, zoom: 1 },
  stickers: { y: 0, front: true, zoom: 0.94 },
};

export class HangarScene extends Scene3D {
  private bay: HangarBay;
  private rocket: RocketModel;
  private sparkles = new Particles3(160, 'star');
  private spin = 0.6;
  private spinVel = 0;
  private spinGoal: number | null = null;
  private dragging = false;
  private lastX = 0;
  private idleT = 0;
  private camY = 0.2;
  private camZoom = 1;
  private hover = 0;
  private readonly tmp = new Vector3();
  private tab: Tab = 'nose';
  private tryLoadout: RocketLoadout;
  private selected: string | null = null;
  private preview: HTMLElement;
  private statRows: Record<StatKey, HTMLElement> = {} as Record<StatKey, HTMLElement>;
  private tabBtns = new Map<Tab, HTMLButtonElement>();
  private cards: HTMLElement;
  private detail: HTMLElement;
  private coinText: HTMLElement;
  private tip: HTMLElement;
  private t = 0;

  constructor() {
    super('hangar');
    this.music = 'hub';
    const st = S.state.data;
    this.tryLoadout = { ...st.loadout, stickers: [...st.loadout.stickers] };
    const prof = S.game.r3.profile;
    this.world.environmentIntensity = 0.9;
    this.bay = buildHangarBay(prof);
    this.world.add(this.bay.group);
    this.rocket = new RocketModel(this.tryLoadout, { glossy: prof.tier === 'high' });
    this.castShadows();
    this.rocket.onSnap = (_slot, local) => this.snapFx(local);
    this.world.add(this.rocket.group);
    this.sparkles.gravity = 1.5;
    this.sparkles.drag = 2;
    this.world.add(this.sparkles.points);
    this.camera.fov = 30;

    this.coinText = h('span', null, String(st.coins));
    const header = h(
      'div',
      { class: 'scr-header' },
      button('Back', 'back', () => this.back(), { round: true, color: 'white', id: 'btn-back' }),
      h('div', { class: 'title' }, 'Hangar'),
      h('div', { class: 'spacer' }),
      h('div', { class: 'pill', 'data-testid': 'coins' }, iconEl('coin'), this.coinText),
    );
    this.preview = h('div', { class: 'hangar-spin', 'data-testid': 'hangar-spin', 'aria-label': 'Drag to spin your rocket' });
    this.bindSpin(this.preview);
    const stats = h('div', { class: 'panel stats-panel' });
    for (const k of STAT_KEYS) {
      const row = h('div', { class: 'stat-row', 'data-testid': `stat-${k}` });
      this.statRows[k] = row;
      stats.append(row);
    }
    const boltzy = drawToCanvas(110, 110, (c, w, hh) => drawPortrait(c, CHAR_BY_ID.boltzy, w, hh, 'happy'));
    boltzy.className = 'tip-face';
    this.tip = h('div', { class: 'tip-text' }, 'Tap a part to try it on!');
    const tipBox = h('div', { class: 'tip-box' }, boltzy, this.tip);
    const left = h('div', { class: 'hangar-left' }, h('div', { class: 'preview-wrap' }, this.preview), stats);
    const tabs = h('div', { class: 'tabs' });
    for (const t of TABS) {
      const b = button(t.label, t.icon, () => this.setTab(t.tab), { size: 'small', color: 'white', id: `tab-${t.tab}`, sound: 'tab' });
      b.classList.add('tab');
      this.tabBtns.set(t.tab, b);
      tabs.append(b);
    }
    this.cards = h('div', { class: 'cards scroll', 'data-testid': 'part-cards' });
    this.detail = h('div', { class: 'detail' });
    const right = h('div', { class: 'panel hangar-right' }, tabs, this.cards, this.detail);
    this.ui.append(header, h('div', { class: 'hangar-main' }, left, right), tipBox);
    this.ui.classList.add('menu-screen');
  }

  override enter(): void {
    S.state.emit({ type: 'visit', place: 'hangar' });
    if (!S.state.flag('hangarHello')) {
      S.state.setFlag('hangarHello');
      S.state.post({ kind: 'dialogue', id: 'hangar_hello' });
    }
    this.setTab('nose');
    this.redrawPreview();
  }

  override back(): boolean {
    void S.game.go('hub');
    return true;
  }

  override exit(): void {
    clearThumbQueue();
  }

  override resize(w: number, hh: number): void {
    super.resize(w, hh);
    this.sparkles.setScreen(window.innerHeight * S.game.r3.pixelRatio);
    // Show the rocket in the left column: shift the picture so the turntable sits at ~20% across.
    const cx = w * 0.205;
    const cy = hh * 0.44;
    this.camera.setViewOffset(w, hh, w / 2 - cx, hh / 2 - cy, w, hh);
  }

  /** Only solid, lit parts cast shadows (flames and glows use custom shaders). */
  private castShadows(): void {
    const on = S.game.r3.profile.shadows;
    this.rocket.group.traverse((o) => {
      const m = (o as { material?: { isMeshStandardMaterial?: boolean } }).material;
      o.castShadow = on && !!m?.isMeshStandardMaterial;
    });
  }

  private bindSpin(el: HTMLElement): void {
    el.addEventListener('pointerdown', (e) => {
      this.dragging = true;
      this.lastX = e.clientX;
      this.spinGoal = null;
      try {
        el.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    });
    el.addEventListener('pointermove', (e) => {
      if (!this.dragging) return;
      const dx = (e.clientX - this.lastX) / S.game.metrics.scale;
      this.lastX = e.clientX;
      this.spin += dx * 0.012;
      this.spinVel = dx * 0.7;
      this.idleT = 0;
    });
    const up = () => {
      this.dragging = false;
    };
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
  }

  private snapFx(local: Vector3): void {
    const p = this.rocket.group.localToWorld(this.tmp.copy(local));
    const colors = ['#ffe066', '#4dd4ff', '#ff7ad9', '#ffffff'];
    for (let i = 0; i < 4; i++) this.sparkles.burst(p.x, p.y, p.z, comfortOn() ? 6 : 10, 3.2, 0.7, 0.16, colors[i]);
    sfx('equip');
  }

  override update(dt: number): void {
    this.t += dt;
    this.idleT += dt;
    if (!this.dragging) {
      if (this.spinGoal !== null) {
        const d = Math.atan2(Math.sin(this.spinGoal - this.spin), Math.cos(this.spinGoal - this.spin));
        this.spin += d * Math.min(1, dt * 5);
        if (Math.abs(d) < 0.01) this.spinGoal = null;
      } else {
        this.spin += this.spinVel * dt;
        this.spinVel *= Math.exp(-dt * 3);
        if (this.idleT > 2.5 && !comfortOn()) this.spin += dt * 0.25;
      }
    }
    this.sparkles.update(dt);
  }

  override render(): void {
    const dt = 1 / 60;
    const t = this.time;
    this.bay.update(t);
    const f = FOCUS[this.tab];
    this.camY += (f.y - this.camY) * 0.06;
    this.camZoom += (f.zoom - this.camZoom) * 0.06;
    const e = this.rocket.extent;
    const hoverY = this.bay.topY + 0.35 - e.bottom;
    this.hover = comfortOn() ? 0 : Math.sin(t * 1.6) * 0.06;
    this.rocket.group.position.set(0, hoverY + this.hover, 0);
    this.rocket.group.rotation.set(0, this.spin, 0);
    this.bay.turntable.rotation.y = this.spin * 0.35;
    this.rocket.update(dt, 0.18, 0);
    const lookY = hoverY + this.camY;
    const dist = 21 * this.camZoom;
    this.camera.position.set(0, lookY + 1.6, dist);
    this.camera.lookAt(0, lookY, 0);
  }

  private setTab(tab: Tab): void {
    this.tab = tab;
    for (const [t, b] of this.tabBtns) b.classList.toggle('on', t === tab);
    this.selected = tab === 'stickers' ? null : (this.tryLoadout[tab] as string);
    if (FOCUS[tab].front) this.spinGoal = 0;
    this.renderCards();
    this.renderDetail();
  }

  private renderCards(): void {
    clear(this.cards);
    const save = S.state.data;
    if (this.tab === 'stickers') {
      if (!save.stickers.length) {
        this.cards.append(h('div', { class: 'empty-note' }, 'Find stickers on planets. Then stick them on your rocket!'));
        return;
      }
      for (const id of save.stickers) {
        const def = STICKER_BY_ID[id];
        if (!def) continue;
        const pic = drawToCanvas(72, 72, (c, w) => drawSticker(c, id, w / 2, w / 2, w * 0.45));
        const on = this.tryLoadout.stickers.includes(id);
        const card = h('button', { class: `card ${on ? 'equipped' : ''}`, type: 'button', 'data-testid': `sticker-${id}` }, pic, h('div', { class: 'card-name' }, def.name), on ? h('div', { class: 'card-status ok' }, iconEl('check'), 'On rocket') : null);
        card.addEventListener('click', () => this.toggleSticker(id));
        this.cards.append(card);
      }
      return;
    }
    const slot = this.tab;
    for (const p of PARTS.filter((q) => q.slot === slot)) {
      const owned = save.owned.includes(p.id);
      const equipped = save.loadout[slot] === p.id;
      const unlocked = isUnlocked(p.unlock, save);
      const thumb = rocketThumb({ ...this.tryLoadout, [slot]: p.id } as RocketLoadout, 64, 88);
      if (!unlocked) thumb.style.filter = 'brightness(.3) saturate(0)';
      let status: HTMLElement;
      if (equipped) status = h('div', { class: 'card-status ok' }, iconEl('check'), 'Equipped');
      else if (owned) status = h('div', { class: 'card-status' }, 'Owned');
      else if (!unlocked) status = h('div', { class: 'card-status locked' }, iconEl('lock'), 'Locked');
      else status = h('div', { class: `card-status price ${save.coins >= p.price ? '' : 'poor'}` }, iconEl('coin'), String(p.price));
      const card = h('button', { class: `card ${this.selected === p.id ? 'sel' : ''} ${equipped ? 'equipped' : ''}`, type: 'button', 'data-testid': `part-${p.id}` }, thumb, h('div', { class: 'card-name' }, p.name), status);
      card.addEventListener('click', () => this.select(p.id));
      this.cards.append(card);
    }
  }

  private select(id: string): void {
    const p = PART_BY_ID[id];
    if (!p) return;
    this.selected = id;
    sfx('select');
    if (isUnlocked(p.unlock, S.state.data)) {
      const changed = (this.tryLoadout as unknown as Record<string, string>)[p.slot] !== id;
      (this.tryLoadout as unknown as Record<string, string>)[p.slot] = id;
      if (changed) {
        this.rocket.setLoadout(this.tryLoadout, p.slot);
        this.castShadows();
      }
      setText(this.tip, S.state.data.owned.includes(id) ? 'Looking good! Tap Equip to use it.' : 'Trying it on! Buy it to keep it.');
    } else setText(this.tip, 'That part is still locked. Keep exploring!');
    this.redrawPreview();
    this.renderCards();
    this.renderDetail();
  }

  private toggleSticker(id: string): void {
    const st = S.state;
    const on = st.data.loadout.stickers.includes(id);
    if (on) {
      const idx = st.data.loadout.stickers.indexOf(id) as 0 | 1;
      equipSticker(st, idx, null);
      sfx('click');
    } else {
      const slot = (st.data.loadout.stickers.length >= 2 ? 1 : st.data.loadout.stickers.length) as 0 | 1;
      equipSticker(st, slot, id);
      sfx('sticker');
    }
    this.tryLoadout.stickers = [...st.data.loadout.stickers];
    this.rocket.setLoadout(this.tryLoadout, 'stickers');
    this.castShadows();
    updateRocketTex(st.data.loadout);
    this.redrawPreview();
    this.renderCards();
  }

  private renderDetail(): void {
    clear(this.detail);
    if (this.tab === 'stickers') {
      this.detail.append(h('div', { class: 'detail-text' }, 'Tap a sticker to put it on your rocket. Tap again to take it off. You can use two!'));
      return;
    }
    const id = this.selected;
    const p = id ? PART_BY_ID[id] : null;
    if (!p) return;
    const save = S.state.data;
    const st = S.state;
    const speakBtn = button('Read to me', 'speaker', () => speak(`${p.name}. ${p.desc}`, { force: true }), { round: true, size: 'small', color: 'white', sound: null });
    let action: HTMLButtonElement;
    const equipped = save.loadout[p.slot] === p.id;
    if (equipped) action = button('Equipped!', 'check', () => {}, { color: 'green', disabled: true, id: 'btn-part-action' });
    else if (save.owned.includes(p.id)) {
      action = button('Equip', 'wrench', () => {
        equipPart(st, p.id);
        updateRocketTex(save.loadout);
        this.tryLoadout = { ...save.loadout, stickers: [...save.loadout.stickers] };
        sfx('equip');
        toast(`${p.name} equipped!`, 'wrench', 1800);
        setText(this.tip, 'Great choice, cadet!');
        this.renderCards();
        this.renderDetail();
        this.redrawPreview();
      }, { color: 'green', id: 'btn-part-action', sound: null });
    } else {
      const check = canBuy(save, p.id);
      if (check.ok) {
        action = button(`Buy for ${p.price}`, 'coin', () => {
          const r = buy(st, p.id);
          if (!r.ok) return;
          equipPart(st, p.id);
          updateRocketTex(save.loadout);
          this.tryLoadout = { ...save.loadout, stickers: [...save.loadout.stickers] };
          setText(this.coinText, String(save.coins));
          sfx('buy');
          toast(`You got the ${p.name}!`, 'gift', 2200);
          setText(this.tip, 'Woo-hoo! It is yours now!');
          this.renderCards();
          this.renderDetail();
          this.redrawPreview();
        }, { color: 'yellow', id: 'btn-part-action', sound: null });
      } else if (check.reason === 'coins') {
        action = button(`Need ${check.need} more`, 'coin', () => {}, { disabled: true, id: 'btn-part-action' });
      } else {
        action = button(unlockHint(p.unlock) || 'Locked', 'lock', () => {}, { disabled: true, id: 'btn-part-action' });
      }
    }
    this.detail.append(
      h('div', { class: 'detail-info' }, h('div', { class: 'h3' }, p.name), h('div', { class: 'detail-text' }, p.desc)),
      speakBtn,
      action,
    );
  }

  private redrawPreview(): void {
    // Stats: equipped vs. trying on.
    const now = statStars(S.state.data.loadout);
    const next = statStars(this.tryLoadout);
    for (const k of STAT_KEYS) {
      const row = this.statRows[k];
      clear(row);
      row.append(iconEl(STAT_INFO[k].icon), h('span', { class: 'stat-label' }, STAT_INFO[k].label));
      const stars = h('span', { class: 'stars big' });
      for (let i = 1; i <= 5; i++) {
        const nextIco = starIcon(next[k], i);
        const nowIco = starIcon(now[k], i);
        const rank = (x: string) => (x === 'star' ? 2 : x === 'starHalf' ? 1 : 0);
        const cls = rank(nextIco) > rank(nowIco) ? 'up' : rank(nextIco) < rank(nowIco) ? 'down' : '';
        const s = h('span', { class: `star ${cls}` });
        s.innerHTML = icon(nextIco);
        stars.append(s);
      }
      row.append(stars);
      row.setAttribute('aria-label', `${STAT_INFO[k].label}: ${next[k]} stars`);
    }
  }
}
