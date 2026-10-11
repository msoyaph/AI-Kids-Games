/** Draws villagers that are in the current location (pooled sprites + shadows + emotes). */
import { Sprite } from 'pixi.js';
import { npcs } from '../sim/npcs';
import type { Sim } from '../sim/sim';
import type { Atlas } from './atlas';
import type { WorldView } from './world-view';

interface NpcSprites {
  body: Sprite;
  shadow: Sprite;
  emote: Sprite;
}

export class NpcView {
  private sprites = new Map<string, NpcSprites>();
  private atlas: Atlas;
  private view: WorldView;

  constructor(atlas: Atlas, view: WorldView) {
    this.atlas = atlas;
    this.view = view;
  }

  private get(id: string): NpcSprites {
    let s = this.sprites.get(id);
    if (!s) {
      const body = new Sprite();
      body.anchor.set(0.5, 1);
      body.label = 'nocull';
      const shadow = new Sprite(this.atlas.tex('shadow'));
      shadow.anchor.set(0.5);
      shadow.alpha = 0.25;
      shadow.label = 'nocull';
      const emote = new Sprite();
      emote.anchor.set(0.5, 1);
      emote.label = 'nocull';
      s = { body, shadow, emote };
      this.sprites.set(id, s);
    }
    return s;
  }

  update(sim: Sim, time: number): void {
    const here = sim.p.loc;
    const v = this.view.view;
    for (const rt of npcs(sim).list) {
      const show = rt.loc === here && !rt.hidden && rt.x > v.x - 32 && rt.x < v.x + v.w + 32 && rt.y > v.y - 8 && rt.y < v.y + v.h + 40;
      const s = this.get(rt.id);
      if (!show) {
        if (s.body.parent) {
          s.body.removeFromParent();
          s.shadow.removeFromParent();
          s.emote.removeFromParent();
        }
        continue;
      }
      if (!s.body.parent) this.view.sorted.addChild(s.shadow, s.body, s.emote);
      const frame = rt.moving ? [0, 1, 0, 2][Math.floor(time * 7) % 4] : 0;
      s.body.texture = this.atlas.tex(`ch.${rt.id}.${rt.dir}.${frame}`);
      s.body.x = Math.round(rt.x);
      s.body.y = Math.round(rt.y) + 1;
      s.body.zIndex = s.body.y;
      s.shadow.x = s.body.x;
      s.shadow.y = s.body.y - 1;
      s.shadow.zIndex = s.body.y - 2;
      if (rt.emote && rt.emote.until > time) {
        s.emote.visible = true;
        s.emote.texture = this.atlas.tex(`emote.${rt.emote.kind}`);
        s.emote.x = s.body.x;
        s.emote.y = s.body.y - 30 - Math.round(Math.abs(Math.sin(time * 4)) * 2);
        s.emote.zIndex = 100000;
      } else s.emote.visible = false;
    }
  }

  clear(): void {
    for (const s of this.sprites.values()) {
      s.body.removeFromParent();
      s.shadow.removeFromParent();
      s.emote.removeFromParent();
    }
  }
}
