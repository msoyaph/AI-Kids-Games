import { Container, Sprite } from 'pixi.js';
import { Scene } from '../app/Scene';
import { S } from '../app/services';
import { STARTER_LOADOUT } from '../data/parts';
import { Starfield } from '../gfx/starfield';
import { planetTex, rocketTex, tex } from '../gfx/textures';
import { h } from '../ui/dom';
import { button } from '../ui/widgets';
import { fullscreenAvailable, openSettings, toggleFullscreen } from '../ui/settings';

export class TitleScene extends Scene {
  private stars = new Starfield(['#9b6bff', '#ff7ad9', '#4c7dff'], 'title');
  private earth = new Sprite(planetTex('earth'));
  private saturn = new Sprite(planetTex('saturn'));
  private moon = new Sprite(planetTex('moon'));
  private rocket = new Container();
  private flame = new Sprite(tex('flame_single'));
  private t = 0;
  private w = 1280;
  private h = 720;

  constructor() {
    super('title');
    this.music = 'title';
    this.root.addChild(this.stars, this.saturn, this.earth, this.moon, this.rocket);
    const body = new Sprite(rocketTex(STARTER_LOADOUT));
    this.flame.anchor.set(0.5, 0);
    this.flame.position.set(0, 66);
    body.anchor.set(0.5);
    this.rocket.addChild(this.flame, body);
    this.rocket.scale.set(0.9);

    const logo = h('div', { class: 'title-logo' }, h('div', { class: 'logo-main' }, 'Space Sky'), h('div', { class: 'logo-sub' }, 'Academy Adventures'));
    const play = button('Play', 'play', () => void S.game.go('slots'), { color: 'green', size: 'big', id: 'btn-play' });
    const menu = h('div', { class: 'title-menu' }, play);
    const corner = h('div', { class: 'title-corner' }, button('Settings', 'gear', () => openSettings(), { round: true, color: 'white', id: 'btn-settings' }));
    if (fullscreenAvailable()) corner.prepend(button('Full screen', 'fullscreen', () => toggleFullscreen(), { round: true, color: 'white', id: 'btn-fullscreen' }));
    this.ui.append(logo, menu, corner);
  }

  override resize(w: number, h: number): void {
    this.w = w;
    this.h = h;
    this.stars.resize(w, h);
    this.earth.anchor.set(0.5);
    this.earth.scale.set(1.9);
    this.earth.position.set(w * 0.12, h * 0.98);
    this.saturn.anchor.set(0.5);
    this.saturn.scale.set(1.25);
    this.saturn.position.set(w * 0.86, h * 0.26);
    this.moon.anchor.set(0.5);
    this.moon.scale.set(0.5);
    this.moon.position.set(w * 0.34, h * 0.62);
  }

  override update(dt: number): void {
    this.t += dt;
    this.stars.update(this.t * 40, this.t * 6, dt);
    const t = this.t * 0.35;
    const x = this.w * 0.5 + Math.cos(t) * this.w * 0.33;
    const y = this.h * 0.55 + Math.sin(t * 2) * this.h * 0.14;
    const dx = -Math.sin(t) * this.w * 0.33;
    const dy = Math.cos(t * 2) * 2 * this.h * 0.14;
    this.rocket.position.set(x, y);
    this.rocket.rotation = Math.atan2(dy, dx) + Math.PI / 2;
    this.flame.scale.set(0.9 + Math.sin(this.t * 40) * 0.12, 0.8 + Math.sin(this.t * 33) * 0.2);
    this.earth.rotation += dt * 0.02;
    this.moon.rotation -= dt * 0.03;
  }
}
