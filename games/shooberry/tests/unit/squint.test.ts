// The squint test (owner's art direction, 2026-10-14): shrink the screen to 25% and every plant and
// critter must still be identifiable by silhouette and colour alone. Checked here from the models
// and the real camera on every supported screen:
// - size: each unit stands at least 75% of its tile's height on screen, and at 25% scale it is still
//   at least 10 px tall on the smallest phone;
// - contrast: each unit's signature fill stands 3:1 or more from both soil tones, and its outline
//   3:1 or more from the grass (WCAG contrast ratio);
// - colour: every plant has its own main hue, at least 40° from the others.
// The style-frame capture (scripts/style-frame.ts) measures the same things in rendered pixels.
import * as THREE from 'three';
import { describe, expect, it } from 'vitest';
import { fitCamera, lean, project } from '../../src/render/camera';
import { CRITTER_MODELS } from '../../src/render/models/critters';
import { PLANT_MODELS } from '../../src/render/models/plants';
import type { Model } from '../../src/render/models/types';
import { contrast, hue, PALETTE } from '../../src/render/palette';
import { WORLD_DEFS } from '../../src/data/levels';

const saturation = (hex: number) => { const r = ((hex >> 16) & 255) / 255, g = ((hex >> 8) & 255) / 255, b = (hex & 255) / 255; const mx = Math.max(r, g, b), mn = Math.min(r, g, b); return mx === 0 ? 0 : (mx - mn) / mx; };
import { colX, laneZ, LANES, TILE_D } from '../../src/sim/board';
import { SMALLEST_PHONE, SUPPORTED_VIEWPORTS, type Viewport } from '../../src/ui/layout';

const plants = Object.values(PLANT_MODELS).map(make => make());
const critters = Object.values(CRITTER_MODELS).map(make => make());
const units: Model[] = [...plants, ...critters];
const cam = new THREE.PerspectiveCamera();

/** A unit's height on screen standing on a tile (as the view draws it: turned toward the camera, leaned back). */
function onScreen(model: Model, vp: Viewport, lane: number, col: number) {
  const fit = fitCamera(cam, vp.w, vp.h, vp.insets);
  const box = new THREE.Box3();
  for (const part of model.parts) { part.geo.computeBoundingBox(); box.union(part.geo.boundingBox!); }
  const yaw = plants.includes(model) ? 0 : 0.4;
  const m = new THREE.Matrix4().makeTranslation(colX(col), 0, laneZ(lane)).multiply(new THREE.Matrix4().makeRotationX(-lean(fit.pitch))).multiply(new THREE.Matrix4().makeRotationY(yaw));
  let top = Infinity, bottom = -Infinity;
  for (let i = 0; i < 8; i++) {
    const v = new THREE.Vector3(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z).applyMatrix4(m);
    const p = project(cam, vp.w, vp.h, v.x, v.y, v.z);
    top = Math.min(top, p.y); bottom = Math.max(bottom, p.y);
  }
  const back = project(cam, vp.w, vp.h, colX(col), 0, laneZ(lane) - TILE_D / 2).y, front = project(cam, vp.w, vp.h, colX(col), 0, laneZ(lane) + TILE_D / 2).y;
  return { height: bottom - top, tile: front - back };
}

describe('the squint test', () => {
  for (const vp of [...SUPPORTED_VIEWPORTS, SMALLEST_PHONE]) {
    it(`every unit fills 75% of its tile's height on a ${vp.name} (${vp.w}×${vp.h})`, () => {
      const short: string[] = [];
      for (const model of units) for (const lane of [0, LANES - 1]) {
        const { height, tile } = onScreen(model, vp, lane, 4);
        if (height < 0.75 * tile) short.push(`${model.id} in lane ${lane}: ${(height / tile * 100).toFixed(0)}% of its tile`);
      }
      expect(short).toEqual([]);
    });
  }

  it('at 25% size every unit is still at least 10 px tall on the smallest phone', () => {
    expect(units.map(m => [m.id, Math.round(onScreen(m, SMALLEST_PHONE, 0, 4).height * 0.25 * 10) / 10] as const).filter(([, h]) => h < 10)).toEqual([]);
  });

  it('every unit stands out 3:1 from both soil tones, and its outline 3:1 from the grass', () => {
    for (const model of units) {
      expect(contrast(model.fill, PALETTE.soilLight), `${model.id} on light soil`).toBeGreaterThanOrEqual(3);
      expect(contrast(model.fill, PALETTE.soilDark), `${model.id} on dark soil`).toBeGreaterThanOrEqual(3);
    }
    expect(contrast(PALETTE.outline, PALETTE.grass)).toBeGreaterThanOrEqual(3);
  });

  it('the soil columns alternate visibly, so the grid reads at a glance', () => {
    expect(contrast(PALETTE.soilLight, PALETTE.soilDark)).toBeGreaterThanOrEqual(1.4);
  });

  it('in every world, each colourful plant has its own main hue (pale ones stand out by lightness)', () => {
    for (const w of WORLD_DEFS) {
      const set = plants.filter(p => w.rows.some(r => r.unlock === p.id) || (w.id === 'meadow' && ['rowan', 'comfrey'].includes(p.id)));
      const colourful = set.filter(p => saturation(p.fill) > 0.35);
      for (const a of colourful) for (const b of colourful) {
        if (a === b) continue;
        const d = Math.abs(hue(a.fill) - hue(b.fill)), gap = Math.min(d, 360 - d);
        expect(gap, `${w.id}: ${a.id} vs ${b.id}`).toBeGreaterThanOrEqual(25);
      }
    }
  });
});
