import { Container, Graphics, Sprite, Text } from 'pixi.js';
import { Scene } from '../app/Scene';
import { S } from '../app/services';
import { sfx } from '../audio/sfx';
import { clamp } from '../core/mathx';
import { BODY_BY_ID, SYSTEMS, systemOf, type SystemDef, type SystemId } from '../data/bodies';
import { drawToCanvas } from '../gfx/atlas';
import { drawGlyph } from '../gfx/art/glyphs';
import { drawPlanet } from '../gfx/art/planets';
import { Starfield } from '../gfx/starfield';
import { ensureTex, planetDiscFraction, planetTex, rocketTex, tex } from '../gfx/textures';
import { h, setText } from '../ui/dom';
import { button } from '../ui/widgets';
import { mapHooks } from './mapHooks';

const MAP_W = 2480;
const FONT = 'ui-rounded, "SF Pro Rounded", "Arial Rounded MT Bold", "Trebuchet MS", system-ui, sans-serif';

interface Node {
  sys: SystemDef;
  x: number;
  y: number;
  r: number;
  sprite: Sprite;
  label: Text;
  lock: Sprite | null;
  unlocked: boolean;
}

export class StarMapScene extends Scene {
  private stars = new Starfield(['#9b6bff', '#4c7dff', '#ff7ad9'], 'map');
  private map = new Container();
  private lane = new Graphics();
  private sun = new Sprite(tex('dot'));
  private sunDisc: Sprite;
  private nodes: Node[] = [];
  private ring = new Sprite(tex('ringDot'));
  private target = new Sprite(tex('marker'));
  private here = new Sprite();
  private panX = 0;
  private velX = 0;
  private dragging = false;
  private dragStartX = 0;
  private dragPanX = 0;
  private dragMoved = 0;
  private lastPointerX = 0;
  private w = 1280;
  private h = 720;
  private t = 0;
  private selected: Node | null = null;
  private card: HTMLElement;
  private cardPic: HTMLElement;
  private cardName: HTMLElement;
  private cardText: HTMLElement;
  private cardTag: HTMLElement;
  private flyBtn: HTMLButtonElement;
  private current: SystemId;
  private targetSys: SystemId | null;

  constructor() {
    super('map');
    this.music = 'map';
    this.current = systemOf(S.state.data.location).id;
    this.targetSys = mapHooks.targetSystem();
    this.root.addChild(this.stars, this.map);
    this.sun.anchor.set(0.5);
    this.sun.tint = 0xffc94d;
    this.sun.blendMode = 'add';
    this.sun.scale.set(30);
    this.sunDisc = new Sprite(planetTex('sun'));
    this.sunDisc.anchor.set(0.5);
    this.sunDisc.scale.set(230 / (256 * 0.41 * 2) * 1.0);
    this.map.addChild(this.sun, this.sunDisc, this.lane, this.ring);
    this.ring.anchor.set(0.5);
    this.ring.tint = 0xffe066;
    this.target.anchor.set(0.5, 1);
    this.here.texture = rocketTex(S.state.data.loadout);
    this.here.anchor.set(0.5);
    this.here.scale.set(0.42);

    const chapter = S.state.data.chapter;
    for (const sys of SYSTEMS) {
      const [x, y] = sys.map;
      const big = sys.id === 'jupiter' || sys.id === 'saturn';
      const r = big ? 70 : sys.id === 'uranus' || sys.id === 'neptune' ? 58 : sys.id === 'pluto' ? 34 : 46;
      let sprite: Sprite;
      if (sys.id === 'wormhole') {
        sprite = new Sprite(ensureTex('map_wormhole', 140, 140, (c, w) => drawGlyph(c, 'wormhole', w / 2, w / 2, w * 0.45)));
        sprite.anchor.set(0.5);
        sprite.scale.set((r * 2.4) / 140);
      } else if (sys.id === 'belt') {
        sprite = new Sprite(ensureTex('map_belt', 200, 120, (c, w, hh) => {
          for (let i = 0; i < 14; i++) {
            const a = (i / 14) * Math.PI * 2;
            const rr = 8 + (i % 3) * 4;
            c.save();
            c.translate(w / 2 + Math.cos(a) * w * 0.38, hh / 2 + Math.sin(a) * hh * 0.32);
            drawPlanet(c, { style: 'rocky', base: '#9a968e', second: '#77736c', seed: i }, rr * 2.4, rr * 2.4);
            c.restore();
          }
          c.save();
          c.translate(w / 2 - 30, hh / 2 - 30);
          drawPlanet(c, BODY_BY_ID.ceres.look, 60, 60);
          c.restore();
        }));
        sprite.anchor.set(0.5);
        sprite.scale.set((r * 2.6) / 200);
      } else {
        const pt = planetTex(sys.main);
        sprite = new Sprite(pt);
        sprite.anchor.set(0.5);
        sprite.scale.set(r / (pt.width * planetDiscFraction(sys.main)));
      }
      sprite.position.set(x, y);
      const unlocked = mapHooks.isUnlocked(sys, chapter);
      if (!unlocked) {
        sprite.tint = 0x3a3060;
        sprite.alpha = 0.85;
      }
      const label = new Text({
        text: unlocked ? sys.name : '???',
        style: { fontFamily: FONT, fontSize: 30, fontWeight: '900', fill: unlocked ? '#ffffff' : '#9a8fd0', stroke: { color: '#20124d', width: 7, join: 'round' } },
      });
      label.anchor.set(0.5, 0);
      label.position.set(x, y + r + 12);
      let lock: Sprite | null = null;
      if (!unlocked) {
        lock = new Sprite(ensureTex('map_lock', 60, 60, (c, w) => drawGlyph(c, 'shield', w / 2, w / 2, w * 0.4, '#ffc83d')));
        lock.anchor.set(0.5);
        lock.position.set(x, y);
        lock.scale.set(0.8);
      }
      this.map.addChild(sprite, label);
      if (lock) this.map.addChild(lock);
      this.nodes.push({ sys, x, y, r, sprite, label, lock, unlocked });
    }
    this.map.addChild(this.target, this.here);
    this.drawLane();

    // DOM: header + info card + drag surface.
    const drag = h('div', { class: 'map-drag hit', 'data-testid': 'map-drag' });
    this.bindDrag(drag);
    const header = h(
      'div',
      { class: 'map-header' },
      button('Back', 'back', () => mapHooks.back(), { round: true, color: 'white', id: 'btn-map-back' }),
      h('div', { class: 'title map-title' }, 'Star Map'),
      h('div', { class: 'spacer' }),
    );
    this.cardPic = h('div', { class: 'card-pic' });
    this.cardName = h('div', { class: 'h2' });
    this.cardTag = h('div', { class: 'tag' });
    this.cardText = h('div', { class: 'card-text' });
    this.flyBtn = button('Fly there!', 'rocket', () => this.fly(), { color: 'green', size: 'big', id: 'btn-fly-there', sound: 'launchUi' });
    this.card = h('div', { class: 'panel map-card', 'data-testid': 'map-card' }, this.cardPic, h('div', { class: 'col grow card-body' }, h('div', { class: 'row' }, this.cardName, this.cardTag), this.cardText), this.flyBtn);
    this.card.style.display = 'none';
    this.ui.append(drag, header, this.card);
  }

  override enter(): void {
    const start = this.nodes.find((n) => n.sys.id === (this.targetSys ?? this.current)) ?? this.nodes[0];
    this.panX = clamp(start.x - this.w / 2, 0, Math.max(0, MAP_W - this.w));
    const pick = this.nodes.find((n) => n.sys.id === this.targetSys && n.unlocked) ?? this.nodes.find((n) => n.sys.id === this.current);
    if (pick) this.select(pick, false);
    mapHooks.onEnter(this);
  }

  override back(): boolean {
    mapHooks.back();
    return true;
  }

  private drawLane(): void {
    const g = this.lane;
    g.clear();
    const pts = this.nodes.map((n) => [n.x, n.y] as const);
    for (let i = 0; i < pts.length - 1; i++) {
      const [x0, y0] = pts[i];
      const [x1, y1] = pts[i + 1];
      const d = Math.hypot(x1 - x0, y1 - y0);
      const n = Math.floor(d / 26);
      for (let k = 1; k < n; k++) {
        const t = k / n;
        const unlocked = this.nodes[i + 1].unlocked && this.nodes[i].unlocked;
        g.circle(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t + Math.sin(t * Math.PI) * 30, 4).fill({ color: unlocked ? 0xffffff : 0x5a4a9a, alpha: unlocked ? 0.55 : 0.4 });
      }
    }
  }

  private bindDrag(el: HTMLElement): void {
    const scale = () => S.game.metrics.scale;
    el.addEventListener('pointerdown', (e) => {
      this.dragging = true;
      this.dragStartX = e.clientX / scale();
      this.lastPointerX = this.dragStartX;
      this.dragPanX = this.panX;
      this.dragMoved = 0;
      this.velX = 0;
      try {
        el.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    });
    el.addEventListener('pointermove', (e) => {
      if (!this.dragging) return;
      const x = e.clientX / scale();
      this.dragMoved = Math.max(this.dragMoved, Math.abs(x - this.dragStartX));
      this.panX = clamp(this.dragPanX - (x - this.dragStartX), 0, Math.max(0, MAP_W - this.w));
      this.velX = (this.lastPointerX - x) * 60;
      this.lastPointerX = x;
    });
    const up = (e: PointerEvent) => {
      if (!this.dragging) return;
      this.dragging = false;
      if (this.dragMoved < 12) {
        // A tap: select the closest system.
        const mx = e.clientX / scale() + this.panX;
        const my = e.clientY / scale() - this.mapOffsetY();
        let best: Node | null = null;
        let bestD = Infinity;
        for (const n of this.nodes) {
          const d = Math.hypot(n.x - mx, n.y - my);
          if (d < n.r + 70 && d < bestD) {
            best = n;
            bestD = d;
          }
        }
        if (best) this.select(best, true);
        this.velX = 0;
      }
    };
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
  }

  private mapOffsetY(): number {
    return (this.h - 720) / 2 - 75;
  }

  select(n: Node, sound: boolean): void {
    this.selected = n;
    if (sound) sfx(n.unlocked ? 'select' : 'locked');
    this.card.style.display = '';
    const pic = drawToCanvas(130, 130, (c, w, hh) => {
      if (n.sys.id === 'wormhole') drawGlyph(c, 'wormhole', w / 2, hh / 2, w * 0.45);
      else drawPlanet(c, BODY_BY_ID[n.sys.main].look, w, hh);
    });
    if (!n.unlocked) pic.style.filter = 'brightness(.25) saturate(0)';
    this.cardPic.replaceChildren(pic);
    setText(this.cardName, n.unlocked ? n.sys.name : 'Not yet!');
    const real = BODY_BY_ID[n.sys.main]?.real !== false;
    setText(this.cardTag, real ? 'Real place' : 'Made-up place');
    this.cardTag.className = `tag ${real ? 'real' : 'story'}`;
    this.cardTag.style.display = n.unlocked ? '' : 'none';
    setText(this.cardText, n.unlocked ? mapHooks.blurb(n.sys) : mapHooks.lockedText(n.sys));
    const here = n.sys.id === this.current;
    this.flyBtn.disabled = !n.unlocked;
    const lbl = this.flyBtn.querySelector('.lbl');
    if (lbl) lbl.textContent = here ? 'Fly around here' : 'Fly there!';
  }

  fly(): void {
    const n = this.selected;
    if (!n || !n.unlocked) return;
    mapHooks.fly(this.current, n.sys.id);
  }

  selectNext(dir: number): void {
    const unlocked = this.nodes.filter((n) => n.unlocked);
    if (!unlocked.length) return;
    const i = this.selected ? unlocked.indexOf(this.selected) : -1;
    const next = unlocked[(i + dir + unlocked.length) % unlocked.length];
    this.select(next, true);
    this.panX = clamp(next.x - this.w / 2, 0, Math.max(0, MAP_W - this.w));
  }

  override resize(w: number, h: number): void {
    this.w = w;
    this.h = h;
    this.stars.resize(w, h);
  }

  override update(dt: number): void {
    this.t += dt;
    const inp = S.input.state;
    if (inp.navX !== 0) this.selectNext(inp.navX);
    if (inp.actionPressed || inp.boostPressed) this.fly();
    if (!this.dragging && Math.abs(this.velX) > 1) {
      this.panX = clamp(this.panX + this.velX * dt, 0, Math.max(0, MAP_W - this.w));
      this.velX *= Math.exp(-4 * dt);
    }
  }

  override render(): void {
    this.map.position.set(-Math.round(this.panX), this.mapOffsetY());
    this.stars.update(this.panX * 0.5, 0, 1 / 60);
    this.sun.position.set(-60, 380);
    this.sunDisc.position.set(-30, 380);
    this.sunDisc.rotation = this.t * 0.05;
    this.sun.alpha = 0.55 + Math.sin(this.t * 1.5) * 0.05;
    for (const n of this.nodes) {
      n.sprite.rotation = n.sys.id === 'wormhole' ? this.t * 0.8 : Math.sin(this.t * 0.3 + n.x) * 0.05;
      if (n.lock) n.lock.y = n.y + Math.sin(this.t * 2 + n.x) * 3;
    }
    const sel = this.selected;
    if (sel) {
      this.ring.visible = true;
      this.ring.position.set(sel.x, sel.y);
      this.ring.scale.set(((sel.r + 26) * 2) / 48 * (1 + Math.sin(this.t * 4) * 0.04));
      this.ring.rotation = this.t;
    } else this.ring.visible = false;
    const tgt = this.nodes.find((n) => n.sys.id === this.targetSys);
    this.target.visible = !!tgt && tgt.unlocked;
    if (tgt) this.target.position.set(tgt.x, tgt.y - tgt.r - 16 + Math.sin(this.t * 5) * 10);
    const cur = this.nodes.find((n) => n.sys.id === this.current);
    if (cur) {
      this.here.position.set(cur.x - cur.r - 36, cur.y + Math.sin(this.t * 3) * 6);
      this.here.rotation = 0.5;
    }
  }
}

