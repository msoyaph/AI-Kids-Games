/**
 * Every sprite the game draws, by name, made on first use from the art recipes and kept in the
 * atlas. Startup only bakes what the first screen needs; the rest arrives as scenes ask for it.
 */
import type { Texture } from 'pixi.js';
import { drawCharacter, type CharLook } from '../art/characters';
import { creatureFace, drawCreature } from '../art/creatures';
import { elementIcon, itemIcon, statusIcon } from '../art/icons';
import { POSES, spritePad } from '../art/painter';
import { dress } from '../art/accessories';
import { ACCESSORY_BY_N } from '../data/accessories';
import type { PixelCanvas } from '../art/pixelcanvas';
import type { Element, StatusId } from '../core/types';
import { Atlas } from './atlas';

export type PoseName = 'idle' | 'blink' | 'happy' | 'hit' | 'nap';

export class Sprites {
  readonly atlas = new Atlas();

  /** `wearing` (1.1) is an accessory number (0: none). */
  creature(id: string, size: 32 | 16 | 64 = 32, pose: PoseName = 'idle', shimmer = false, wearing = 0): Texture {
    const acc = wearing ? ACCESSORY_BY_N[wearing] : undefined;
    return this.atlas.get(`c:${id}:${size}:${pose}:${shimmer ? 1 : 0}${acc ? `:a${acc.n}` : ''}`, () => {
      const pc = drawCreature(id, size, POSES[pose]!, shimmer);
      return acc ? dress(pc, acc, size, spritePad(size), creatureFace(id, size)) : pc;
    });
  }

  character(key: string, look: CharLook, dir: number, frame: number): Texture {
    return this.atlas.get(`p:${key}:${dir}:${frame}`, () => drawCharacter(look, dir, frame));
  }

  element(e: Element): Texture {
    return this.atlas.get(`e:${e}`, () => elementIcon(e));
  }

  status(s: StatusId): Texture {
    return this.atlas.get(`s:${s}`, () => statusIcon(s));
  }

  item(id: string): Texture {
    return this.atlas.get(`i:${id}`, () => itemIcon(id));
  }

  /** Any other sprite: a stable key and its recipe. */
  get(key: string, make: () => PixelCanvas): Texture {
    return this.atlas.get(key, make);
  }

  flush(): void {
    this.atlas.flush();
  }
}
