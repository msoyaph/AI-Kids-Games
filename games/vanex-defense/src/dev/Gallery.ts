import { Sprite, Container } from 'pixi.js';
import type { Atlas } from '../render/atlas/bake';
import type { Stage } from '../render/Stage';

/** DEV: lays out every baked sprite in a grid so art can be reviewed (`?gallery=1`). */
export function showGallery(stage: Stage, atlas: Atlas): void {
  const c = new Container();
  stage.root.addChild(c);
  const names = [...atlas.baked.frames.keys()].sort();
  const layout = (): void => {
    c.removeChildren();
    const cell = 84;
    const cols = Math.max(1, Math.floor(stage.width / cell));
    names.forEach((n, i) => {
      const s = new Sprite(atlas.get(n));
      const f = atlas.baked.frames.get(n)!;
      const k = Math.min(1, (cell - 8) / Math.max(f.w, f.h));
      s.scale.set(k);
      s.x = (i % cols) * cell + cell / 2 + (f.ax - 0.5) * f.w * k;
      s.y = Math.floor(i / cols) * cell + cell / 2 + (f.ay - 0.5) * f.h * k;
      c.addChild(s);
    });
    stage.requestRender();
  };
  stage.onResize(layout);
  layout();
  let scroll = 0;
  addEventListener('wheel', (e) => {
    scroll = Math.min(0, scroll - e.deltaY);
    c.y = scroll;
    stage.requestRender();
  });
}
