import { Container, Sprite, Text, TilingSprite, type Texture } from 'pixi.js';
import { Scene } from '../app/Scene';
import { S } from '../app/services';
import { sfx } from '../audio/sfx';
import { exploreTrack } from '../audio/music';
import { clamp, lerp } from '../core/mathx';
import { BODY_BY_ID } from '../data/bodies';
import { CHAR_BY_ID } from '../data/characters';
import { dialogue } from '../data/dialogue';
import { ITEM_BY_ID, itemName } from '../data/items';
import { levelById } from '../data/levels';
import { CRYSTAL_COLORS, CRYSTAL_NAMES, type EntDef } from '../data/levelTypes';
import { stickerForLevel } from '../data/stickers';
import { theme, type Theme } from '../data/themes';
import { drawAstronautSide, drawNpcSide, drawRover, ASTRO_POSES, type AstroPose } from '../gfx/art/characters';
import { drawGlyph } from '../gfx/art/glyphs';
import { drawSilhouette, drawSkyGradient } from '../gfx/art/backgrounds';
import { propSprites, sampleArt, themeSprites } from '../gfx/art/tiles';
import { glowDot } from '../gfx/canvas';
import { FloatTexts, Particles, Shake } from '../gfx/particles';
import { hexNum } from '../gfx/palette';
import { ensureAtlas, ensureTex, planetDiscFraction, planetTex, rocketTex, tex } from '../gfx/textures';
import { condOk, entCond, parseLevel, tileAt, TILE, T_GEYSER, T_GOO, T_GROUND, T_ICE, T_PAD, T_PLATFORM, T_ROCK, isSolidTile, type LevelModel } from '../systems/level';
import {
  buildPlatWorld, doInteraction, findInteraction, geyserOn, makePlatEvents, makePlayer, platCfg, resetPlatEvents, resetPuzzle, restoreSolved, stepPlatformer,
  type Interaction, type PlatEvents, type PlatWorld, type PPlayer,
} from '../systems/platformer';
import { roundRect, ink, circle } from '../gfx/canvas';
import { C } from '../gfx/palette';
import { openAreas } from './director';
import { showDialogue } from '../ui/dialogue';
import { h, setText } from '../ui/dom';
import { Hud } from '../ui/hud';
import { closeTopModal, openModal } from '../ui/modal';
import { openPause, pauseHooks } from '../ui/pause';
import { toast } from '../ui/toast';
import { tip } from '../ui/tips';
import { button, iconEl } from '../ui/widgets';
import { exploreHooks } from './exploreHooks';

export interface ExploreParams {
  area: string;
}

const LABELS: Record<string, [string, string]> = {
  talk: ['Talk', 'chat'],
  pickOrb: ['Grab', 'hand'],
  dropOrb: ['Drop', 'hand'],
  deliver: ['Power up', 'boost'],
  crystal: ['Tap', 'sparkle'],
  exit: ['Fly', 'rocket'],
  sign: ['Read', 'info'],
};

export class ExploreScene extends Scene {
  private model: LevelModel;
  private th: Theme;
  private world!: PlatWorld;
  private player!: PPlayer;
  private ev: PlatEvents = makePlatEvents();
  private bodyId: string;
  private rover: boolean;
  private sky = new Sprite(tex('square'));
  private skyStars: TilingSprite | null = null;
  private skyPlanet: Sprite | null = null;
  private far!: TilingSprite;
  private mid!: TilingSprite;
  private cam = new Container();
  private tileChunks: Container[] = [];
  private backLayer = new Container();
  private itemLayer = new Container();
  private actorLayer = new Container();
  private fxAdd = new Particles(160, true);
  private fxNorm = new Particles(80, false);
  private floats = new FloatTexts(6);
  private shake = new Shake();
  private playerSprite = new Sprite();
  private poseTex: Record<string, Texture> = {};
  private roverTex: Texture[] = [];
  private pickupSprites: Sprite[] = [];
  private blockSprites: Sprite[] = [];
  private orbSprites: Sprite[] = [];
  private doorSprites: Container[] = [];
  private plateSprites: Sprite[] = [];
  private machineSprites: Sprite[] = [];
  private crystalSprites: Sprite[] = [];
  private bumblerSprites: Sprite[] = [];
  private npcSprites: Sprite[] = [];
  private geysers: Array<{ tx: number; ty: number }> = [];
  private machineLabels: Text[] = [];
  private crystalTicks: Sprite[] = [];
  private buddy: Sprite | null = null;
  private trail: Array<[number, number, number]> = [];
  private condT = 0;
  private marker = new Sprite(tex('marker'));
  private hud: Hud;
  private prompt: HTMLElement;
  private promptText: HTMLElement;
  private promptIcon: HTMLElement;
  private promptKind = '';
  private interact: Interaction = { kind: 'exit', index: 0, x: 0, y: 0 };
  private current: Interaction | null = null;
  private camX = 0;
  private camY = 0;
  private w = 1280;
  private h = 720;
  private t = 0;
  private walkDist = 0;
  private busy = false;
  private ready = false;
  private coinsHere = 0;

  constructor(p: ExploreParams) {
    super('explore');
    this.pausable = true;
    const def = levelById(p.area);
    if (!def) throw new Error(`Unknown area ${p.area}`);
    this.music = def.music ?? exploreTrack(def.theme);
    this.model = parseLevel(def);
    this.th = theme(def.theme);
    this.bodyId = def.body;
    this.rover = def.avatar === 'rover';
    this.hud = new Hud({ onPause: () => openPause('explore') });
    this.promptText = h('span', null, '');
    this.promptIcon = iconEl('hand');
    this.prompt = h('div', { class: 'prompt hit', 'data-testid': 'explore-prompt', onclick: () => this.doAction() }, this.promptIcon, this.promptText, h('span', { class: 'key' }, 'E'));
    this.prompt.style.display = 'none';
    this.ui.append(this.hud.el, this.prompt);
  }

  override async enter(): Promise<void> {
    const st = S.state;
    const def = this.model.def;
    await ensureAtlas('props', propSprites());
    await ensureAtlas(`theme_${this.th.id}`, themeSprites(this.th));
    this.bakeAvatar();
    const body = BODY_BY_ID[this.bodyId];
    const cfg = platCfg(body?.gravityG ?? 1, this.rover ? 'rover' : 'astronaut', st.tuning);
    const condState = exploreHooks.condState();
    this.world = buildPlatWorld(
      this.model,
      cfg,
      // NPCs are always built so they can appear during a mission (they are hidden until then).
      (e) => e.kind === 'npc' || condOk(entCond(e), condState),
      (key) => st.data.collected.includes(key),
    );
    restoreSolved(this.world, (pz) => st.flag(`solved:${pz}`), (id) => st.flag(`door:${id}`));
    this.refreshHidden();
    // Hidden sticker only if not found yet.
    const stickerDef = stickerForLevel(def.id);
    for (const pk of this.world.pickups) if (pk.kind === 'sticker' && (!stickerDef || st.data.stickers.includes(stickerDef.id))) pk.taken = true;
    this.player = makePlayer(this.world);
    this.buildBackground();
    this.buildTiles();
    this.buildEntities();
    this.root.addChild(this.cam);
    this.cam.addChild(this.backLayer, ...this.tileChunks, this.itemLayer, this.actorLayer, this.fxNorm, this.fxAdd, this.marker, this.floats);
    this.playerSprite.anchor.set(0.5, 1);
    if (st.flag('zibboJoined') && !this.world.npcs.some((n) => (n.ent.def as Extract<EntDef, { kind: 'npc' }>).char === 'zibbo')) {
      this.buddy = new Sprite(ensureTex('npc_zibbo', 96, 112, (c, ww, hh) => drawNpcSide(c, CHAR_BY_ID.zibbo, ww, hh), 0.5, 1));
      this.buddy.anchor.set(0.5, 1);
      this.buddy.scale.set(0.7);
      this.actorLayer.addChild(this.buddy);
    }
    this.actorLayer.addChild(this.playerSprite);
    this.marker.anchor.set(0.5, 1);
    this.marker.visible = false;
    this.marker.scale.set(0.7);
    this.resize(S.game.metrics.width, S.game.metrics.height);
    this.snapCamera();
    S.touch.setMode('explore');
    pauseHooks.backToRocket = () => this.teleportToRocket();
    pauseHooks.resetPuzzle = () => {
      resetPuzzle(this.world, this.player);
      toast('Puzzle reset!', 'reset');
    };
    st.addUnique(st.data.visitedBodies, this.bodyId);
    st.emit({ type: 'enterArea', area: def.id });
    this.updateObjective();
    this.hud.setCoins(st.data.coins);
    this.ready = true;
    const introKey = `intro:${def.id}`;
    if (def.intro && !st.flag(introKey)) {
      st.setFlag(introKey);
      setTimeout(() => void showDialogue(dialogue(def.intro!)), 400);
    }
    exploreHooks.onEnter(this);
    tip(this.rover ? 'explore_rover' : 'explore_move');
    if (this.buddy) tip('zibbo');
  }

  override exit(): void {
    S.touch.setMode('none');
    pauseHooks.backToRocket = () => {};
    pauseHooks.resetPuzzle = () => {};
  }

  override back(): boolean {
    openPause('explore');
    return true;
  }

  // ------------------------------------------------------------------ building

  private bakeAvatar(): void {
    const look = S.state.data.profile;
    if (this.rover) {
      for (let f = 0; f < 4; f++) this.roverTex.push(ensureTex(`rover_${f}`, 100, 80, (c, w, hh) => drawRover(c, w, hh, f), 0.5, 1));
      return;
    }
    const key = JSON.stringify(look).replace(/[^a-z0-9]/gi, '').slice(0, 80);
    for (const pose of ASTRO_POSES) this.poseTex[pose] = ensureTex(`astro_${key}_${pose}`, 72, 88, (c, w, hh) => drawAstronautSide(c, look, pose, w, hh), 0.5, 1);
  }

  private buildBackground(): void {
    const th = this.th;
    const skyTex = ensureTex(`sky_${th.id}`, 8, 256, (c, w, hh) => drawSkyGradient(c, w, hh, th.sky[0], th.sky[1], th.haze), 0, 0, 1);
    this.sky.texture = skyTex;
    this.sky.anchor.set(0);
    this.root.addChild(this.sky);
    if (th.stars) {
      this.skyStars = new TilingSprite({ texture: tex('stars1'), width: 100, height: 100 });
      this.skyStars.alpha = 0.8;
      this.root.addChild(this.skyStars);
    }
    if (th.skyPlanet) {
      const pt = planetTex(th.skyPlanet.body);
      this.skyPlanet = new Sprite(pt);
      this.skyPlanet.anchor.set(0.5);
      this.skyPlanet.scale.set(th.skyPlanet.size / (pt.width * planetDiscFraction(th.skyPlanet.body) * 2));
      this.root.addChild(this.skyPlanet);
    }
    const farTex = ensureTex(`far_${th.id}`, 1024, 360, (c, w, hh) => drawSilhouette(c, th.farStyle, th.far, w, hh, 11), 0, 0, 1);
    const midTex = ensureTex(`mid_${th.id}`, 1024, 300, (c, w, hh) => drawSilhouette(c, th.midStyle, th.mid, w, hh, 23), 0, 0, 1);
    this.far = new TilingSprite({ texture: farTex, width: 100, height: 360 });
    this.mid = new TilingSprite({ texture: midTex, width: 100, height: 300 });
    this.root.addChild(this.far, this.mid);
  }

  private tileTex(tx: number, ty: number, t: number): Texture | null {
    const id = this.th.id;
    const m = this.model;
    switch (t) {
      case T_GROUND: {
        const above = tileAt(m, tx, ty - 1);
        if (isSolidTile(above) && above !== T_PAD) return tex(`${id}_${(tx * 7 + ty * 3) % 5 === 0 ? 'fill2' : 'fill'}`);
        const leftOpen = !isSolidTile(tileAt(m, tx - 1, ty)) ? 1 : 0;
        const rightOpen = !isSolidTile(tileAt(m, tx + 1, ty)) ? 2 : 0;
        return tex(`${id}_top${leftOpen | rightOpen}`);
      }
      case T_ROCK:
        return tex(`${id}_rock`);
      case T_PLATFORM:
        return tex(`${id}_plat`);
      case T_ICE:
        return tex(`${id}_ice`);
      case T_GOO:
        return tex(tileAt(m, tx, ty - 1) === T_GOO ? `${id}_goo` : `${id}_gooTop`);
      case T_PAD:
        return tex(`${id}_pad`);
      case T_GEYSER:
        this.geysers.push({ tx, ty });
        return tex(`${id}_geyser`);
      default:
        return null;
    }
  }

  private buildTiles(): void {
    const m = this.model;
    const chunkW = 8;
    for (let cx = 0; cx < m.w; cx += chunkW) {
      const chunk = new Container();
      for (let x = cx; x < Math.min(m.w, cx + chunkW); x++) {
        for (let y = 0; y < m.h; y++) {
          const t = m.tiles[y * m.w + x];
          if (!t) continue;
          const tt = this.tileTex(x, y, t);
          if (!tt) continue;
          const s = new Sprite(tt);
          s.position.set(x * TILE, y * TILE);
          if (t === T_GOO) s.alpha = 0.9;
          chunk.addChild(s);
        }
      }
      this.tileChunks.push(chunk);
    }
  }

  private buildEntities(): void {
    const w = this.world;
    const th = this.th;
    // Decorations from fixed symbols and deco ents.
    for (const e of this.model.ents) {
      const cx = e.tx * TILE + TILE / 2;
      const by = (e.ty + 1) * TILE;
      let t: Texture | null = null;
      if (e.kind === 'plant') t = tex(`${th.id}_plant`);
      else if (e.kind === 'boulder') t = tex(`${th.id}_boulder`);
      else if (e.kind === 'lamp') t = tex('p_lamp');
      else if (e.kind === 'flag') t = tex('p_flag');
      else if (e.kind === 'deco' && e.def?.kind === 'deco' && condOk(entCond(e), exploreHooks.condState())) t = tex(`p_d_${e.def.art}`);
      if (t) {
        const s = new Sprite(t);
        s.position.set(cx, by + 2);
        this.backLayer.addChild(s);
      }
    }
    // The parked rocket.
    const rocket = new Sprite(rocketTex(S.state.data.loadout));
    rocket.anchor.set(0.5, 0.92);
    rocket.scale.set(0.95);
    rocket.position.set(w.exitX, w.exitY);
    const pad = new Sprite(tex('pad'));
    pad.position.set(w.exitX, w.exitY - 6);
    pad.scale.set(0.7);
    this.backLayer.addChild(pad, rocket);
    for (const sg of w.signs) if (sg.ent.def?.kind === 'sign') this.addAt(this.backLayer, tex('p_sign'), sg.x, sg.y + 2);
    for (const g of w.goals) this.addAt(this.backLayer, tex('p_goal'), g.x, g.y + 2);
    for (const pl of w.plates) {
      const s = this.addAt(this.backLayer, tex(pl.heavy ? 'p_plateHeavy' : 'p_plateUp'), pl.x, pl.y + 2);
      this.plateSprites.push(s);
    }
    for (const m of w.machines) {
      const art = (m.ent.def as Extract<EntDef, { kind: 'machine' }>).art;
      this.machineSprites.push(this.addAt(this.backLayer, tex(`p_m_${art}_off`), m.x, m.y + 2));
    }
    for (const c of w.crystals) {
      this.crystalSprites.push(this.addAt(this.backLayer, tex('p_crystal'), c.x, c.y + 2));
      const tick = this.addAt(this.itemLayer, tex('spark'), c.x, c.y - 92);
      tick.tint = 0x8cff66;
      tick.visible = false;
      this.crystalTicks.push(tick);
    }
    for (const m of w.machines) {
      const t = new Text({ text: '', style: { fontFamily: 'ui-rounded, "Arial Rounded MT Bold", sans-serif', fontSize: 30, fontWeight: '900', fill: '#ffffff', stroke: { color: '#20124d', width: 7, join: 'round' } } });
      t.anchor.set(0.5);
      t.position.set(m.x, m.y - 130);
      this.itemLayer.addChild(t);
      this.machineLabels.push(t);
    }
    for (const sg of w.signs) {
      const d = sg.ent.def;
      if (d?.kind !== 'panel') continue;
      const target = this.model.def.groups?.[d.group]?.target ?? [];
      const key = `panel_${this.model.def.id}_${d.group}`;
      const t = ensureTex(key, 40 + target.length * 40, 110, (c, ww, hh) => {
        c.fillStyle = C.ink;
        c.fillRect(ww / 2 - 4, hh * 0.5, 8, hh * 0.5);
        ink(c, roundRect(4, 6, ww - 8, hh * 0.5, 12), '#fff6e0', 4);
        target.forEach((col, i) => ink(c, circle(30 + i * 40, 6 + hh * 0.25, 14), CRYSTAL_COLORS[col], 3));
      }, 0.5, 1);
      this.addAt(this.backLayer, t, sg.x, sg.y + 2);
    }
    for (const d of w.doors) {
      const box = new Container();
      for (let k = 0; k < d.h / TILE; k++) {
        const s = new Sprite(tex(k === 0 ? 'p_doorTop' : 'p_door'));
        s.position.set(0, k * TILE);
        box.addChild(s);
      }
      box.position.set(d.x, d.y);
      this.doorSprites.push(box);
      this.itemLayer.addChild(box);
    }
    for (const n of w.npcs) {
      const ch = CHAR_BY_ID[(n.ent.def as Extract<EntDef, { kind: 'npc' }>).char];
      const t = ensureTex(`npc_${ch?.id}`, 96, 112, (c, ww, hh) => ch && drawNpcSide(c, ch, ww, hh), 0.5, 1);
      const s = this.addAt(this.actorLayer, t, n.x, n.y + 2);
      const face = (n.ent.def as Extract<EntDef, { kind: 'npc' }>).face ?? (n.x > w.exitX ? -1 : 1);
      s.scale.x = face;
      s.visible = !n.hidden;
      this.npcSprites.push(s);
    }
    for (const pk of w.pickups) {
      let t: Texture;
      if (pk.kind === 'coin') t = tex('coin');
      else if (pk.kind === 'sticker') t = tex('starBig');
      else {
        const d = pk.ent.def as Extract<EntDef, { kind: 'sample' | 'item' }>;
        const item = ITEM_BY_ID[d.item];
        t = ensureTex(`item_${d.item}`, 64, 64, (c, ww) => {
          if (item?.glyph) {
            glowDot(c, ww / 2, ww / 2, ww / 2, item.color);
            drawGlyph(c, item.glyph, ww / 2, ww / 2, ww * 0.3, item.color);
          } else sampleArt(c, ww, item?.color ?? '#d6d4dc');
        });
      }
      const s = this.addAt(this.itemLayer, t, pk.x, pk.y);
      s.anchor.set(0.5);
      if (pk.kind === 'sticker') s.scale.set(0.6);
      s.visible = !pk.taken;
      this.pickupSprites.push(s);
    }
    for (const b of w.blocks) {
      const s = new Sprite(tex('p_crate'));
      s.position.set(b.x, b.y);
      this.blockSprites.push(s);
      this.itemLayer.addChild(s);
    }
    for (const o of w.orbs) {
      const s = this.addAt(this.itemLayer, tex('p_orb'), o.x, o.y);
      s.anchor.set(0.5);
      this.orbSprites.push(s);
    }
    for (const b of w.bumblers) this.bumblerSprites.push(this.addAt(this.actorLayer, tex(`${th.id}_bumbler0`), b.x, b.y));
  }

  private addAt(layer: Container, t: Texture, x: number, y: number): Sprite {
    const s = new Sprite(t);
    s.position.set(x, y);
    layer.addChild(s);
    return s;
  }

  // ------------------------------------------------------------------ logic

  override update(dt: number): void {
    if (!this.ready) return;
    this.t += dt;
    const input = S.input.state;
    resetPlatEvents(this.ev);
    stepPlatformer(this.world, this.player, { x: input.x, jump: input.jump, jumpPressed: input.jumpPressed }, dt, this.ev);
    this.handleEvents();
    // What can the Action button do?
    this.current = this.busy ? null : findInteraction(this.world, this.player, this.interact);
    if (this.current) {
      if (this.current.kind === 'pickOrb') tip('explore_orb');
      if (this.current.kind === 'crystal') tip('explore_crystal');
      const [label, icon] = LABELS[this.current.kind];
      S.touch.setAction(label, icon);
      setText(this.promptText, label);
      if (this.promptKind !== this.current.kind) {
        this.promptKind = this.current.kind;
        const ni = iconEl(icon);
        this.promptIcon.replaceWith(ni);
        this.promptIcon = ni;
      }
      this.prompt.style.display = this.current.kind === 'dropOrb' ? 'none' : '';
      if (input.actionPressed) this.doAction();
    } else {
      S.touch.setAction(null);
      this.prompt.style.display = 'none';
    }
    // Effects.
    const p = this.player;
    const cfg = this.world.cfg;
    if (p.hovering && Math.random() < 0.7) {
      this.fxAdd.spawn(tex('dot'), p.x + cfg.pw / 2 - p.facing * 14, p.y + cfg.ph - 30, (Math.random() - 0.5) * 40, 160, 0.35, 0.5, 0.1, 0.9, 0xffb43b);
    }
    if (p.onGround && Math.abs(p.vx) > 120 && Math.random() < 0.15) {
      this.fxNorm.spawn(tex('puff'), p.x + cfg.pw / 2, p.y + cfg.ph, -p.vx * 0.1, -20, 0.5, 0.3, 0.6, 0.6, hexNum(this.th.surface));
    }
    for (const g of this.geysers) {
      if (geyserOn(this.world, g.tx) && Math.random() < 0.6) {
        this.fxNorm.spawn(tex('puff'), g.tx * TILE + TILE / 2 + (Math.random() - 0.5) * 20, g.ty * TILE, (Math.random() - 0.5) * 40, -420 - Math.random() * 200, 0.7, 0.5, 1.4, 0.8, 0xffffff);
      }
    }
    this.fxAdd.update(dt);
    this.fxNorm.update(dt);
    this.floats.update(dt);
    this.shake.update(dt);
    if (p.onGround && Math.abs(p.vx) > 10) this.walkDist += Math.abs(p.vx) * dt;
    this.condT -= dt;
    if (this.condT <= 0) {
      this.condT = 0.4;
      this.refreshHidden();
    }
    this.trail.push([p.x + this.world.cfg.pw / 2, p.y + this.world.cfg.ph, p.facing]);
    if (this.trail.length > 24) this.trail.shift();
    exploreHooks.update(this, dt);
  }

  private handleEvents(): void {
    const ev = this.ev;
    const st = S.state;
    const area = this.model.def.id;
    const p = this.player;
    const cx = p.x + this.world.cfg.pw / 2;
    if (ev.jumped) {
      if (!this.rover && st.data.stats.jumps > 3) tip('explore_hover');
      st.bump('jumps');
      sfx('jump');
    }
    if (ev.landed) {
      this.fxNorm.burst(tex('puff'), cx, p.y + this.world.cfg.ph, 5, 120, 0.5, 0.6, this.th.surface);
      sfx('land');
    }
    if (ev.bounced) sfx('boing');
    if (ev.bumped) {
      this.floats.show('Boing!', cx, p.y - 10, '#ffb0ea');
      this.shake.kick(8);
      sfx('bump');
    }
    if (ev.pushing) {
      tip('explore_crate');
      if (Math.random() < 0.1) sfx('push');
    }
    for (const pk of ev.picked) {
      const idx = this.world.pickups.indexOf(pk);
      if (idx >= 0) this.pickupSprites[idx].visible = false;
      st.addUnique(st.data.collected, pk.ent.key);
      if (pk.kind === 'coin') {
        st.addCoins(1);
        st.bump('coinsCollected');
        this.coinsHere++;
        this.fxAdd.burst(tex('spark'), pk.x, pk.y, 6, 200, 0.4, 0.5, '#ffe066');
        sfx('coin');
        st.emit({ type: 'coins', amount: 1, system: this.bodyId });
      } else if (pk.kind === 'sticker') {
        const sd = stickerForLevel(area);
        if (sd) st.emit({ type: 'sticker', id: sd.id });
        this.fxAdd.burst(tex('spark'), pk.x, pk.y, 24, 300, 0.8, 0.8, '#ff7ad9');
        sfx('sticker');
      } else {
        const d = pk.ent.def as Extract<EntDef, { kind: 'sample' | 'item' }>;
        if (pk.kind === 'sample') st.bump('samples');
        st.emit({ type: 'collect', item: d.item, area, count: 1 });
        this.floats.show(`${itemName(d.item)}!`, pk.x, pk.y - 40, '#bff6ff');
        this.fxAdd.burst(tex('spark'), pk.x, pk.y, 18, 260, 0.7, 0.7, ITEM_BY_ID[d.item]?.color ?? '#4dd4ff');
        sfx('collect');
      }
      this.updateObjective();
    }
    for (const g of ev.goals) {
      const d = g.ent.def as Extract<EntDef, { kind: 'goal' }>;
      st.setFlag(`reached:${d.marker}`);
      st.emit({ type: 'reach', marker: d.marker, area });
      this.fxAdd.burst(tex('spark'), g.x, g.y - 40, 24, 300, 0.8, 0.8, '#ffe066');
      sfx('goal');
      this.updateObjective();
    }
    for (const id of ev.opened) {
      st.setFlag(`door:${id}`);
      toast('A door opened!', 'check', 1800);
      sfx('door');
    }
    for (const puzzle of ev.solved) {
      st.bump('puzzles');
      st.setFlag(`solved:${puzzle}`);
      st.emit({ type: 'solve', puzzle, area });
      this.floats.show('Solved!', cx, p.y - 30, '#8cff66', 50);
      this.fxAdd.burst(tex('spark'), cx, p.y, 30, 380, 0.9, 0.8, '#8cff66');
      sfx('solve');
      this.updateObjective();
    }
    if (ev.delivered) sfx('power');
    if (ev.crystal) sfx('crystal');
    this.hud.setCoins(st.data.coins);
  }

  doAction(): void {
    const it = this.current;
    if (!it || this.busy) return;
    const w = this.world;
    switch (it.kind) {
      case 'talk': {
        const n = w.npcs[it.index];
        const d = n.ent.def as Extract<EntDef, { kind: 'npc' }>;
        this.busy = true;
        const npcId = d.char;
        S.state.addUnique(S.state.data.stats.talkedTo, npcId);
        const lines = exploreHooks.talkLines(npcId, this.model.def.id) ?? dialogue(d.talk);
        void showDialogue(lines).then(() => {
          this.busy = false;
          S.state.emit({ type: 'talk', npc: npcId, area: this.model.def.id });
          this.updateObjective();
        });
        break;
      }
      case 'sign': {
        const sgn = w.signs[it.index];
        const d = sgn.ent.def;
        let text = '';
        if (d?.kind === 'sign') text = d.text;
        else if (d?.kind === 'panel') {
          const target = this.model.def.groups?.[d.group]?.target ?? [];
          text = `Make the crystals match: ${target.map((c) => CRYSTAL_NAMES[c]).join(', ')}. Tap a crystal to change its color.`;
        }
        this.busy = true;
        void showDialogue([{ who: 'sign', text }]).then(() => (this.busy = false));
        break;
      }
      case 'exit':
        this.askLeave();
        break;
      default:
        doInteraction(w, this.player, it, this.ev);
        if (it.kind === 'pickOrb') sfx('pickup');
        if (it.kind === 'dropOrb') sfx('drop');
        // Interactions may solve puzzles right away.
        this.handleEvents();
        break;
    }
  }

  /** Show or hide NPCs that only appear at a certain point in a mission. */
  private refreshHidden(): void {
    const cs = exploreHooks.condState();
    this.world.npcs.forEach((n, i) => {
      n.hidden = !condOk(entCond(n.ent), cs);
      const sp = this.npcSprites[i];
      if (sp && sp.visible === n.hidden) {
        sp.visible = !n.hidden;
        if (!n.hidden) {
          this.fxAdd.burst(tex('spark'), n.x, n.y - 50, 20, 260, 0.8, 0.8, '#fff7b3');
          sfx('sparkle');
        }
      }
    });
  }

  private askLeave(): void {
    this.busy = true;
    const others = openAreas(this.bodyId).filter((a) => a !== this.model.def.id);
    const hop = h('div', { class: 'col area-list' });
    for (const a of others) {
      hop.append(button(`Hop to ${levelById(a)?.name ?? a}`, 'planet', () => {
        closeTopModal();
        sfx('launch');
        void S.game.go('explore', { area: a });
      }, { color: 'white', id: `hop-${a}` }));
    }
    const panel = h(
      'div',
      { class: 'panel col center', 'data-testid': 'leave-panel' },
      h('div', { class: 'h2' }, 'Fly away?'),
      others.length ? hop : null,
      h('div', { class: 'row' },
        button('Not yet', 'back', () => closeTopModal(), { color: 'white', id: 'btn-stay' }),
        button('Star Map', 'rocket', () => {
          closeTopModal();
          this.leave();
        }, { color: 'green', size: 'big', id: 'btn-fly' }),
      ),
    );
    openModal(panel, { onClose: () => (this.busy = false) });
  }

  leave(): void {
    S.state.data.location = this.bodyId;
    sfx('launch');
    exploreHooks.onLeave(this);
  }

  teleportToRocket(): void {
    const p = this.player;
    const np = makePlayer(this.world);
    p.x = p.px = np.x;
    p.y = p.py = np.y;
    p.vx = p.vy = 0;
    this.snapCamera();
    sfx('teleport');
  }

  updateObjective(): void {
    const o = exploreHooks.objective(this.model.def.id);
    this.hud.setObjective(o?.text ?? `Explore ${this.model.def.name}!`, o?.icon ?? 'flag');
    this.hud.setExtra(o?.extra ?? '');
  }

  get areaId(): string {
    return this.model.def.id;
  }

  get bodyName(): string {
    return BODY_BY_ID[this.bodyId]?.name ?? this.bodyId;
  }

  celebrate(): void {
    const p = this.player;
    this.fxAdd.burst(tex('spark'), p.x + 20, p.y, 40, 450, 1, 1, '#ffe066');
    this.fxAdd.burst(tex('confetti'), p.x + 20, p.y, 40, 450, 1.4, 1, '#ff7ad9', { gravity: 500, spin: true });
  }

  // ------------------------------------------------------------------ render

  override resize(w: number, h: number): void {
    this.w = w;
    this.h = h;
    if (!this.far) return;
    this.sky.width = w;
    this.sky.height = h;
    if (this.skyStars) {
      this.skyStars.width = w;
      this.skyStars.height = h;
    }
    if (this.skyPlanet && this.th.skyPlanet) this.skyPlanet.position.set(w * this.th.skyPlanet.x, h * this.th.skyPlanet.y);
    this.far.width = w;
    this.mid.width = w;
    this.far.y = h - 360 - 70;
    this.mid.y = h - 300 - 20;
  }

  private snapCamera(): void {
    const p = this.player;
    this.camX = this.targetCamX(p.x);
    this.camY = this.targetCamY(p.y);
  }

  private targetCamX(px: number): number {
    const lw = this.model.w * TILE;
    if (lw <= this.w) return -(this.w - lw) / 2;
    return clamp(px + this.world.cfg.pw / 2 - this.w * 0.45, 0, lw - this.w);
  }

  private targetCamY(py: number): number {
    const lh = this.model.h * TILE;
    if (lh <= this.h) return lh - this.h;
    return clamp(py - this.h * 0.55, 0, lh - this.h);
  }

  override render(alpha: number): void {
    if (!this.ready) return;
    const p = this.player;
    const cfg = this.world.cfg;
    const px = lerp(p.px, p.x, alpha);
    const py = lerp(p.py, p.y, alpha);
    this.camX += (this.targetCamX(px) - this.camX) * 0.15;
    this.camY += (this.targetCamY(py) - this.camY) * 0.12;
    const cx = Math.round(this.camX);
    const cy = Math.round(this.camY);
    this.cam.position.set(-cx + this.shake.x, -cy + this.shake.y);
    this.far.tilePosition.x = -cx * 0.15;
    this.mid.tilePosition.x = -cx * 0.35;
    if (this.skyStars) this.skyStars.tilePosition.set(-cx * 0.05, 0);
    // Cull tile chunks.
    const chunkPx = 8 * TILE;
    for (let i = 0; i < this.tileChunks.length; i++) {
      const x0 = i * chunkPx;
      this.tileChunks[i].visible = x0 + chunkPx > cx - 50 && x0 < cx + this.w + 50;
    }
    // Player.
    const s = this.playerSprite;
    s.position.set(px + cfg.pw / 2, py + cfg.ph + 2);
    if (this.rover) {
      s.texture = this.roverTex[Math.floor(this.walkDist / 18) % 4];
      s.scale.x = p.facing;
    } else {
      let pose: AstroPose = 'idle';
      if (!p.onGround) pose = p.vy < 0 ? 'jump' : 'fall';
      else if (p.pushing) pose = 'push';
      else if (Math.abs(p.vx) > 20) pose = `walk${Math.floor(this.walkDist / 26) % 4}` as AstroPose;
      s.texture = this.poseTex[pose];
      s.scale.set(p.facing * 1.05, 1.05);
    }
    s.alpha = p.bumpT > 0 && Math.floor(this.t * 16) % 2 === 0 ? 0.6 : 1;
    // Entities.
    const w = this.world;
    for (let i = 0; i < w.pickups.length; i++) {
      const pk = w.pickups[i];
      const sp = this.pickupSprites[i];
      if (!sp.visible) continue;
      if (pk.kind === 'coin') sp.scale.x = Math.cos(this.t * 3 + i);
      else sp.y = pk.y + Math.sin(this.t * 2.5 + i) * 5;
      if (pk.kind === 'sticker') sp.rotation = Math.sin(this.t * 2) * 0.3;
    }
    for (let i = 0; i < w.blocks.length; i++) {
      const b = w.blocks[i];
      this.blockSprites[i].position.set(lerp(b.px, b.x, alpha), lerp(b.py, b.y, alpha));
    }
    for (let i = 0; i < w.orbs.length; i++) {
      const o = w.orbs[i];
      const sp = this.orbSprites[i];
      sp.visible = !o.used;
      sp.position.set(lerp(o.px, o.x, alpha), lerp(o.py, o.y, alpha));
      sp.scale.set(0.9 + Math.sin(this.t * 5 + i) * 0.08);
    }
    for (let i = 0; i < w.doors.length; i++) {
      const d = w.doors[i];
      const box = this.doorSprites[i];
      box.y = d.y - d.amount * d.h;
      box.alpha = 1 - d.amount * 0.9;
      box.visible = d.amount < 1;
    }
    for (let i = 0; i < w.plates.length; i++) {
      const pl = w.plates[i];
      this.plateSprites[i].texture = tex(pl.heavy ? (pl.pressed ? 'p_plateHeavyDown' : 'p_plateHeavy') : pl.pressed ? 'p_plateDown' : 'p_plateUp');
    }
    for (let i = 0; i < w.machines.length; i++) {
      const m = w.machines[i];
      const art = (m.ent.def as Extract<EntDef, { kind: 'machine' }>).art;
      this.machineSprites[i].texture = tex(`p_m_${art}_${m.powered ? 'on' : 'off'}`);
      const lbl = this.machineLabels[i];
      lbl.visible = !m.powered;
      const txt = `${m.have} / ${m.needs}`;
      if (lbl.text !== txt) lbl.text = txt;
      lbl.y = m.y - 130 + Math.sin(this.t * 3 + i) * 4;
    }
    for (let i = 0; i < w.crystals.length; i++) {
      const c = w.crystals[i];
      const sp = this.crystalSprites[i];
      sp.tint = hexNum(CRYSTAL_COLORS[c.color]);
      const solved = w.solvedGroups.has(c.group);
      sp.scale.set(1 + c.bumpT * 0.6 + (solved ? Math.sin(this.t * 4) * 0.05 : 0));
      // Easy: a little green sparkle shows which crystals are already right.
      const g = this.model.def.groups?.[c.group];
      const idx = w.crystals.filter((q) => q.group === c.group).indexOf(c);
      this.crystalTicks[i].visible = S.state.difficulty === 'easy' && !solved && !!g && g.target[idx] === c.color;
      this.crystalTicks[i].rotation = this.t * 2;
    }
    for (let i = 0; i < w.bumblers.length; i++) {
      const b = w.bumblers[i];
      const sp = this.bumblerSprites[i];
      sp.texture = tex(`${this.th.id}_bumbler${Math.floor(this.t * 4) % 2}`);
      sp.position.set(lerp(b.px, b.x, alpha), b.y + 2);
      sp.scale.set((b.vx < 0 ? -1 : 1) * (1 + b.squish), 1 - b.squish);
    }
    for (let i = 0; i < this.npcSprites.length; i++) {
      const sp = this.npcSprites[i];
      sp.scale.y = 1 + Math.sin(this.t * 2 + i) * 0.02;
    }
    // Zibbo follows a little behind you.
    if (this.buddy && this.trail.length) {
      const [bx, by, bf] = this.trail[0];
      this.buddy.position.set(bx - bf * 40, by + 2 - Math.abs(Math.sin(this.t * 6)) * 10);
      this.buddy.scale.x = 0.7 * bf;
    }
    // Interaction marker.
    const cur = this.current;
    if (cur && cur.kind !== 'dropOrb') {
      this.marker.visible = true;
      const yTop = cur.kind === 'exit' ? cur.y - 170 : cur.kind === 'talk' ? cur.y - 120 : cur.y - 90;
      this.marker.position.set(cur.x, yTop + Math.sin(this.t * 5) * 6);
    } else this.marker.visible = false;
    this.fxAdd.render(alpha);
    this.fxNorm.render(alpha);
  }
}

export type { ExploreScene as ExploreSceneType };
