/**
 * Growing into the next stage: the friend glows, its shape swaps gently between old and new
 * (never faster than 2.5 times a second: safe for flashing), then the new form appears with
 * sparkles. Skippable with a tap or A.
 */
import { Container, Graphics, Sprite, type Texture } from 'pixi.js';

/** The swap rhythm: gaps between shape swaps, in ms. Never under 400 ms (at most 2.5 per second). */
export const EVOLVE_SWAPS = [800, 700, 600, 520, 460, 420, 400, 400, 400];

export async function playEvolution(parent: Container, from: Texture, to: Texture, size: { W: number; H: number; scale: number }, skip: () => boolean, fast: boolean): Promise<void> {
  const root = new Container();
  const bg = new Graphics().rect(0, 0, size.W, size.H).fill(0x2a2450);
  const glow = new Graphics();
  const sprite = new Sprite(from);
  sprite.anchor.set(0.5);
  sprite.scale.set(size.scale);
  sprite.x = size.W / 2;
  sprite.y = size.H / 2;
  root.addChild(bg, glow, sprite);
  parent.addChild(root);
  const wait = (ms: number) => new Promise<boolean>(resolve => {
    const t0 = performance.now();
    const f = () => {
      if (skip()) return resolve(true);
      const k = (performance.now() - t0) / ms;
      glow.clear().circle(size.W / 2, size.H / 2, size.scale * (18 + Math.sin(performance.now() / 300) * 2)).fill({ color: 0xfff3b0, alpha: 0.25 });
      if (k >= 1) return resolve(false);
      requestAnimationFrame(f);
    };
    requestAnimationFrame(f);
  });
  let skipped = false;
  if (!fast) {
    sprite.tint = 0xffffff;
    if (await wait(600)) skipped = true;
    for (let i = 0; i < EVOLVE_SWAPS.length && !skipped; i++) {
      sprite.texture = i % 2 === 0 ? to : from;
      sprite.tint = 0xfff3d0;
      if (await wait(EVOLVE_SWAPS[i]!)) skipped = true;
    }
  }
  sprite.texture = to;
  sprite.tint = 0xffffff;
  addSparkles(root, size);
  await wait(fast ? 300 : 900);
  root.destroy({ children: true });
}

function addSparkles(root: Container, size: { W: number; H: number; scale: number }): void {
  for (let i = 0; i < 16; i++) {
    const g = new Graphics().poly([0, -3, 1, -1, 3, 0, 1, 1, 0, 3, -1, 1, -3, 0, -1, -1]).fill(i % 2 ? 0xffffff : 0xffd84a);
    g.scale.set(size.scale * 0.5);
    g.x = size.W / 2 + Math.cos(i) * size.scale * 20;
    g.y = size.H / 2 + Math.sin(i * 1.7) * size.scale * 16;
    root.addChild(g);
  }
}

/** The moment the new form appears, held still (capture routes). */
export function evolutionStill(parent: Container, to: Texture, size: { W: number; H: number; scale: number }): Container {
  const root = new Container();
  const glow = new Graphics().circle(size.W / 2, size.H / 2, size.scale * 19).fill({ color: 0xfff3b0, alpha: 0.25 });
  const sprite = new Sprite(to);
  sprite.anchor.set(0.5);
  sprite.scale.set(size.scale);
  sprite.x = size.W / 2;
  sprite.y = size.H / 2;
  root.addChild(new Graphics().rect(0, 0, size.W, size.H).fill(0x2a2450), glow, sprite);
  addSparkles(root, size);
  parent.addChild(root);
  return root;
}
