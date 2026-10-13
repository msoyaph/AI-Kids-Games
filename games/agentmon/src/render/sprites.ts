/**
 * Every sprite the game draws, by name, made on first use from the art recipes and kept in the
 * atlas. Startup only bakes what the first screen needs; the rest arrives as scenes ask for it.
 */
import type { Texture } from 'pixi.js';
import { drawCharacter, type CharLook } from '../art/characters';
import { drawCreature } from '../art/creatures';
import { elementIcon, itemIcon, statusIcon } from '../art/icons';
import { POSES } from '../art/painter';
import type { PixelCanvas } from '../art/pixelcanvas';
import type { Element, StatusId } from '../core/types';
import { Atlas } from './atlas';

export type PoseName = 'idle' | 'blink' | 'happy' | 'hit' | 'nap';

export class Sprites {
  readonly atlas = new Atlas();

  creature(id: string, size: 32 | 16 | 64 = 32, pose: PoseName = 'idle', shimmer = false): Texture {
    return this.atlas.get(`c:${id}:${size}:${pose}:${shimmer ? 1 : 0}`, () => drawCreature(id, size, POSES[pose]!, shimmer));
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
