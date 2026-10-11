import * as THREE from 'three';
import type { CharacterDef, EnemyDef, ProjectileVisual, PropKind } from '../config/types';
import { GeoBuilder, P } from './geo';

/**
 * Every model in TheaBonk, built from primitives in code. Models face +Z with their base
 * at y = 0 unless noted.
 */

const DARK = 0x231c2e;
const WHITE = 0xf8f4ea;

function eyes(b: GeoBuilder, y: number, z: number, spread: number, size = 0.07, color = DARK): void {
  b.add(P.box(size, size * 1.4, 0.03), color, [-spread, y, z]);
  b.add(P.box(size, size * 1.4, 0.03), color, [spread, y, z]);
}

// ───────────────────────────── characters ─────────────────────────────

export function characterGeometry(c: CharacterDef): THREE.BufferGeometry {
  const b = new GeoBuilder();
  const { primary, secondary, accent, skin } = c.colors;
  if (c.id === 'thea') {
    b.add(P.box(0.18, 0.5, 0.22), 0x3a3550, [-0.14, 0.25, 0]);
    b.add(P.box(0.18, 0.5, 0.22), 0x3a3550, [0.14, 0.25, 0]);
    b.add(P.cyl(0.28, 0.42, 0.75, 7), primary, [0, 0.82, 0]);
    b.add(P.box(0.42, 0.5, 0.06), secondary, [0, 0.78, 0.3], [-0.12, 0, 0]);
    b.add(P.cyl(0.06, 0.07, 0.55, 5), skin, [-0.36, 0.9, 0.05], [0, 0, 0.35]);
    b.add(P.cyl(0.06, 0.07, 0.55, 5), skin, [0.36, 0.9, 0.05], [0, 0, -0.35]);
    b.add(P.ico(0.31, 0), skin, [0, 1.42, 0]);
    b.add(P.dodeca(0.34), accent, [0, 1.53, -0.07], [0, 0, 0], [1, 0.82, 1]);
    b.add(P.ico(0.15, 0), accent, [0, 1.85, -0.16]);
    eyes(b, 1.44, 0.28, 0.11);
    b.add(P.box(0.08, 0.04, 0.02), 0xe86a6a, [0, 1.33, 0.3]);
    // the mallet, slung across the back
    b.add(P.cyl(0.05, 0.05, 1.05, 5), 0x8a5a3b, [0.05, 1.0, -0.36], [0, 0, 0.6]);
    b.add(P.box(0.5, 0.3, 0.3), 0xd9603b, [0.36, 1.45, -0.36], [0, 0, 0.6]);
    b.add(P.box(0.52, 0.08, 0.32), 0xf2b04b, [0.36, 1.45, -0.36], [0, 0, 0.6]);
  } else if (c.id === 'pip') {
    b.add(P.box(0.16, 0.22, 0.24), 0x4a3424, [-0.18, 0.11, 0.05]);
    b.add(P.box(0.16, 0.22, 0.24), 0x4a3424, [0.18, 0.11, 0.05]);
    b.add(P.ico(0.5, 1), primary, [0, 0.66, 0], [0, 0, 0], [1, 1.02, 1.1]);
    b.add(P.ico(0.38, 0), secondary, [0, 0.62, 0.22]);
    for (let i = 0; i < 11; i++) {
      const a = (i / 11) * Math.PI * 1.6 - Math.PI * 0.8;
      const up = 0.35 + (i % 2) * 0.35;
      const dx = Math.sin(a) * 0.42;
      const dz = -Math.cos(a) * 0.32 - 0.12;
      b.add(P.cone(0.11, 0.42, 4), 0x5a3b26, [dx, 0.62 + up * 0.45, dz], [-1.2 + up * 0.6, a * 0.3, -a * 0.9]);
    }
    b.add(P.cone(0.17, 0.32, 5), secondary, [0, 0.74, 0.62], [Math.PI / 2, 0, 0]);
    b.add(P.ico(0.06, 0), DARK, [0, 0.74, 0.79]);
    eyes(b, 0.88, 0.44, 0.15, 0.08);
    b.add(P.torus(0.33, 0.08, 4, 8), accent, [0, 0.98, 0.04], [Math.PI / 2, 0, 0]);
    b.add(P.box(0.14, 0.32, 0.06), accent, [0.22, 0.78, -0.3], [0.3, 0, 0.3]);
    b.add(P.cone(0.1, 0.18, 4), primary, [-0.22, 1.12, 0.18], [0, 0, 0.3]);
    b.add(P.cone(0.1, 0.18, 4), primary, [0.22, 1.12, 0.18], [0, 0, -0.3]);
  } else if (c.id === 'ottie') {
    // Ottie — river otter standing tall, tail out behind, a disc slung on the back
    const dark = new THREE.Color(primary).multiplyScalar(0.7).getHex();
    b.add(P.box(0.17, 0.24, 0.3), dark, [-0.15, 0.12, 0.04]);
    b.add(P.box(0.17, 0.24, 0.3), dark, [0.15, 0.12, 0.04]);
    b.add(P.cyl(0.27, 0.36, 0.85, 7), primary, [0, 0.66, 0], [0.08, 0, 0], 1, 0.05);
    b.add(P.ico(0.25, 0), secondary, [0, 0.7, 0.2], [0, 0, 0], [1, 1.3, 0.7]);
    b.add(P.cone(0.17, 1.1, 5), dark, [0, 0.35, -0.55], [-1.15, 0, 0]);
    b.add(P.cyl(0.06, 0.07, 0.45, 5), dark, [-0.3, 0.82, 0.12], [0.5, 0, 0.35]);
    b.add(P.cyl(0.06, 0.07, 0.45, 5), dark, [0.3, 0.82, 0.12], [0.5, 0, -0.35]);
    b.add(P.torus(0.24, 0.07, 4, 8), accent, [0, 1.08, 0.02], [Math.PI / 2, 0, 0]);
    b.add(P.ico(0.3, 1), primary, [0, 1.36, 0.02], [0, 0, 0], [1.05, 0.95, 1]);
    b.add(P.ico(0.16, 0), secondary, [0, 1.3, 0.24], [0, 0, 0], [1.3, 0.9, 1]);
    b.add(P.box(0.09, 0.06, 0.05), DARK, [0, 1.34, 0.4]);
    b.add(P.ico(0.08, 0), dark, [-0.24, 1.55, -0.02]);
    b.add(P.ico(0.08, 0), dark, [0.24, 1.55, -0.02]);
    eyes(b, 1.44, 0.27, 0.11, 0.065);
    for (const sd of [-1, 1]) b.add(P.box(0.28, 0.015, 0.015), 0xf4ead6, [sd * 0.2, 1.3, 0.3], [0, 0, sd * 0.15]);
    b.add(P.cyl(0.3, 0.3, 0.07, 8), 0x8ff0e8, [0, 0.82, -0.36], [Math.PI / 2 - 0.2, 0, 0]);
    b.add(P.cyl(0.13, 0.13, 0.09, 6), 0x2a8a84, [0, 0.82, -0.37], [Math.PI / 2 - 0.2, 0, 0]);
  } else if (c.id === 'bramble') {
    // Bramble — beetle knight: horned helm, glossy shell, round shield
    b.add(P.box(0.2, 0.42, 0.24), skin, [-0.17, 0.21, 0]);
    b.add(P.box(0.2, 0.42, 0.24), skin, [0.17, 0.21, 0]);
    b.add(P.cyl(0.3, 0.36, 0.7, 7), skin, [0, 0.76, 0.05]);
    b.add(P.dodeca(0.55), primary, [0, 0.95, -0.2], [0.2, 0, 0], [1.05, 1.1, 0.75], 0.06);
    b.add(P.box(0.03, 0.9, 0.05), 0x1c3a2c, [0, 0.98, -0.6], [0.2, 0, 0]);
    b.add(P.ico(0.3, 1), secondary, [0, 1.38, 0.08], [0, 0, 0], [1, 0.95, 1.05]);
    b.add(P.cone(0.09, 0.55, 5), secondary, [0, 1.75, 0.3], [0.7, 0, 0]);
    b.add(P.cone(0.06, 0.25, 4), secondary, [0, 1.98, 0.5], [1.4, 0, 0]);
    b.add(P.box(0.4, 0.09, 0.05), DARK, [0, 1.38, 0.36]);
    b.add(P.box(0.08, 0.05, 0.03), accent, [-0.1, 1.38, 0.39]);
    b.add(P.box(0.08, 0.05, 0.03), accent, [0.1, 1.38, 0.39]);
    b.add(P.cyl(0.07, 0.08, 0.5, 5), skin, [-0.38, 0.88, 0.08], [0, 0, 0.4]);
    b.add(P.cyl(0.07, 0.08, 0.5, 5), skin, [0.38, 0.88, 0.08], [0, 0, -0.4]);
    b.add(P.cyl(0.3, 0.3, 0.07, 8), secondary, [-0.5, 0.82, 0.18], [0, 0, Math.PI / 2 - 0.25]);
    b.add(P.ico(0.09, 0), accent, [-0.55, 0.82, 0.19]);
    b.add(P.box(0.18, 0.2, 0.12), 0x8a5a36, [0.38, 0.62, 0.2]);
  } else if (c.id === 'nova') {
    // Nova — owl stargazer: round body, huge eyes, ear tufts, a starry little telescope
    b.add(P.box(0.14, 0.12, 0.2), 0xffa23d, [-0.15, 0.06, 0.1]);
    b.add(P.box(0.14, 0.12, 0.2), 0xffa23d, [0.15, 0.06, 0.1]);
    b.add(P.ico(0.5, 1), primary, [0, 0.62, 0], [0, 0, 0], [1, 1.12, 0.95], 0.04);
    b.add(P.ico(0.33, 1), secondary, [0, 0.52, 0.26], [0, 0, 0], [1, 1.2, 0.6]);
    b.add(P.ico(0.42, 1), primary, [0, 1.22, 0.02], [0, 0, 0], [1.1, 0.95, 1]);
    b.add(P.cone(0.09, 0.32, 4), skin, [-0.27, 1.58, 0], [0, 0, 0.35]);
    b.add(P.cone(0.09, 0.32, 4), skin, [0.27, 1.58, 0], [0, 0, -0.35]);
    for (const sd of [-1, 1]) {
      b.add(P.cyl(0.15, 0.15, 0.05, 10), secondary, [sd * 0.16, 1.26, 0.35], [Math.PI / 2, 0, 0]);
      b.add(P.cyl(0.07, 0.07, 0.06, 8), DARK, [sd * 0.16, 1.26, 0.38], [Math.PI / 2, 0, 0]);
      b.add(P.ico(0.26, 0), new THREE.Color(primary).multiplyScalar(0.75).getHex(), [sd * 0.5, 0.7, -0.02], [0, 0, sd * 0.2], [0.45, 1.1, 0.8]);
    }
    b.add(P.cone(0.06, 0.16, 4), accent, [0, 1.14, 0.42], [Math.PI / 2 + 0.4, 0, 0]);
    for (let k = 0; k < 4; k++) b.add(P.octa(0.06), accent, [Math.sin(k * 1.7) * 0.3, 0.45 + k * 0.17, -0.42 + Math.cos(k) * 0.05]);
    b.add(P.cyl(0.05, 0.08, 0.5, 6), 0xb07a3a, [0.42, 0.55, 0.25], [0.4, 0, -0.9]);
  } else {
    // Brindle — tortoise sage with a lantern staff
    for (const [x, z] of [[-0.42, 0.35], [0.42, 0.35], [-0.42, -0.35], [0.42, -0.35]] as const) {
      b.add(P.cyl(0.15, 0.17, 0.42, 6), skin, [x, 0.21, z]);
    }
    b.add(P.cyl(0.78, 0.82, 0.18, 8), secondary, [0, 0.5, 0]);
    b.add(P.dodeca(0.74), primary, [0, 0.72, 0], [0, 0.3, 0], [1.05, 0.62, 1.1]);
    b.add(P.cyl(0.18, 0.2, 0.08, 6), 0x3d6e39, [0, 1.17, 0]);
    b.add(P.cyl(0.2, 0.18, 0.4, 6), skin, [0, 0.82, 0.7], [1.1, 0, 0]);
    b.add(P.ico(0.3, 0), skin, [0, 1.04, 0.92]);
    eyes(b, 1.1, 1.18, 0.12, 0.07);
    b.add(P.cone(0.13, 0.36, 5), WHITE, [0, 0.8, 1.02], [Math.PI, 0, 0]);
    b.add(P.cone(0.32, 0.55, 6), 0x5a4b8a, [0, 1.48, 0.86], [-0.25, 0, 0]);
    b.add(P.cyl(0.36, 0.36, 0.04, 8), 0x5a4b8a, [0, 1.24, 0.9], [-0.25, 0, 0]);
    b.add(P.cyl(0.045, 0.045, 1.9, 5), 0x7a5a3a, [0.75, 0.95, 0.5]);
    b.add(P.box(0.24, 0.28, 0.24), accent, [0.75, 2.0, 0.5]);
    b.add(P.box(0.3, 0.05, 0.3), 0x3a3550, [0.75, 2.16, 0.5]);
  }
  return b.build();
}

// ───────────────────────────── enemies ─────────────────────────────

const ICE = 0xe6fbff;
const SNOW = 0xf6faff;

/** Radius of the Snowball Roller's body (its model is centred so it can spin while rolling). */
export const ROLLER_BODY = 0.85;

/** An enemy's model: its base model (variants reuse one) in its colour, plus variant trim. */
export function enemyGeometry(def: EnemyDef): THREE.BufferGeometry {
  const b = new GeoBuilder();
  const id = def.model ?? def.id;
  const color = def.color;
  const darker = new THREE.Color(color).multiplyScalar(0.62).getHex();
  const lighter = new THREE.Color(color).lerp(new THREE.Color(0xffffff), 0.35).getHex();
  switch (id) {
    case 'gloomling':
      b.add(P.ico(0.6, 0), color, [0, 0.6, 0], [0, 0, 0], [1, 0.95, 1], 0.08);
      b.add(P.ico(0.24, 0), WHITE, [0, 0.72, 0.46]);
      b.add(P.ico(0.11, 0), DARK, [0, 0.72, 0.66]);
      b.add(P.cone(0.12, 0.42, 4), darker, [-0.3, 1.12, -0.05], [0, 0, 0.45]);
      b.add(P.cone(0.12, 0.42, 4), darker, [0.3, 1.12, -0.05], [0, 0, -0.45]);
      b.add(P.box(0.2, 0.14, 0.26), darker, [-0.22, 0.07, 0.05]);
      b.add(P.box(0.2, 0.14, 0.26), darker, [0.22, 0.07, 0.05]);
      break;
    case 'gnatlet':
      b.add(P.octa(0.3), color, [0, 0.95, 0], [0, 0, 0], [1, 0.8, 1.35], 0.1);
      b.add(P.cone(0.07, 0.3, 4), darker, [0, 0.9, -0.48], [-Math.PI / 2, 0, 0]);
      b.add(P.box(0.55, 0.03, 0.22), 0xe8f4ff, [-0.38, 1.12, -0.02], [0, 0, 0.35]);
      b.add(P.box(0.55, 0.03, 0.22), 0xe8f4ff, [0.38, 1.12, -0.02], [0, 0, -0.35]);
      b.add(P.ico(0.09, 0), 0xff3b3b, [-0.1, 1.0, 0.33]);
      b.add(P.ico(0.09, 0), 0xff3b3b, [0.1, 1.0, 0.33]);
      break;
    case 'boulderback':
      b.add(P.dodeca(1.1), color, [0, 1.15, 0], [0.2, 0.4, 0], [1.1, 0.92, 1.0], 0.1);
      b.add(P.dodeca(0.75), 0x6fa84f, [0, 1.85, -0.1], [0, 0.7, 0], [1.2, 0.4, 1.1], 0.12);
      b.add(P.dodeca(0.45), darker, [-1.05, 0.7, 0.35], [0.4, 0, 0], 1, 0.1);
      b.add(P.dodeca(0.45), darker, [1.05, 0.7, 0.35], [0.4, 0, 0], 1, 0.1);
      b.add(P.box(0.18, 0.12, 0.05), 0xffa23d, [-0.3, 1.3, 0.98]);
      b.add(P.box(0.18, 0.12, 0.05), 0xffa23d, [0.3, 1.3, 0.98]);
      break;
    case 'spitcap':
      b.add(P.cyl(0.24, 0.32, 0.85, 6), 0xf1e3c6, [0, 0.42, 0]);
      b.add(P.cone(0.78, 0.62, 7), color, [0, 1.12, 0], [0, 0, 0], 1, 0.06);
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        b.add(P.ico(0.1, 0), WHITE, [Math.sin(a) * 0.45, 1.1, Math.cos(a) * 0.45]);
      }
      b.add(P.ico(0.1, 0), WHITE, [0, 1.42, 0]);
      b.add(P.box(0.22, 0.1, 0.05), DARK, [0, 0.45, 0.31]);
      eyes(b, 0.68, 0.3, 0.09, 0.07);
      break;
    case 'ramhorn':
      b.add(P.box(0.85, 0.75, 1.25), color, [0, 0.8, 0], [0, 0, 0], 1, 0.08);
      b.add(P.box(0.6, 0.55, 0.6), lighter, [0, 0.95, 0.8]);
      b.add(P.box(0.36, 0.26, 0.2), 0xe8b48a, [0, 0.82, 1.15]);
      b.add(P.torus(0.24, 0.09, 4, 6), 0xefe3c4, [-0.38, 1.18, 0.7], [0, Math.PI / 2, 0]);
      b.add(P.torus(0.24, 0.09, 4, 6), 0xefe3c4, [0.38, 1.18, 0.7], [0, Math.PI / 2, 0]);
      for (const [x, z] of [[-0.3, 0.42], [0.3, 0.42], [-0.3, -0.42], [0.3, -0.42]] as const) {
        b.add(P.box(0.2, 0.45, 0.2), darker, [x, 0.22, z]);
      }
      b.add(P.box(0.08, 0.08, 0.04), 0xff3030, [-0.18, 1.05, 1.11]);
      b.add(P.box(0.08, 0.08, 0.04), 0xff3030, [0.18, 1.05, 1.11]);
      break;
    case 'blobbin':
    case 'blobbit':
      b.add(P.ico(0.9, 1), color, [0, 0.8, 0], [0, 0, 0], [1, 0.85, 1], 0.05);
      b.add(P.ico(0.36, 0), darker, [0, 0.8, 0]);
      b.add(P.ico(0.16, 0), WHITE, [-0.25, 1.0, 0.72]);
      b.add(P.ico(0.16, 0), WHITE, [0.25, 1.0, 0.72]);
      b.add(P.ico(0.08, 0), DARK, [-0.25, 1.0, 0.85]);
      b.add(P.ico(0.08, 0), DARK, [0.25, 1.0, 0.85]);
      break;
    case 'fusewick':
      b.add(P.sphere(0.55, 7, 5), color, [0, 0.62, 0], [0, 0, 0], 1, 0.08);
      b.add(P.cyl(0.05, 0.05, 0.35, 4), 0xc9b48a, [0, 1.3, 0]);
      b.add(P.octa(0.16), 0xffb02e, [0, 1.56, 0], [0, 0, 0], [1, 1.5, 1]);
      b.add(P.box(0.14, 0.06, 0.04), WHITE, [-0.18, 0.78, 0.5], [0, 0, -0.3]);
      b.add(P.box(0.14, 0.06, 0.04), WHITE, [0.18, 0.78, 0.5], [0, 0, 0.3]);
      b.add(P.box(0.16, 0.14, 0.24), DARK, [-0.2, 0.07, 0.05]);
      b.add(P.box(0.16, 0.14, 0.24), DARK, [0.2, 0.07, 0.05]);
      break;
    case 'grumblecap':
      b.add(P.cyl(1.3, 1.6, 3.2, 8), 0xf1e3c6, [0, 1.6, 0], [0, 0, 0], 1, 0.05);
      b.add(P.cone(3.3, 2.3, 9), color, [0, 4.1, 0], [0, 0, 0], 1, 0.06);
      for (let i = 0; i < 9; i++) {
        const a = (i / 9) * Math.PI * 2;
        b.add(P.ico(0.32, 0), WHITE, [Math.sin(a) * 2.0, 3.85, Math.cos(a) * 2.0]);
      }
      b.add(P.cyl(0.8, 0.9, 0.5, 6), 0xffd34d, [0, 5.35, 0]);
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        b.add(P.cone(0.18, 0.5, 4), 0xffd34d, [Math.sin(a) * 0.75, 5.8, Math.cos(a) * 0.75]);
      }
      b.add(P.box(0.5, 0.18, 0.1), DARK, [-0.45, 2.55, 1.45], [0, 0, -0.35]);
      b.add(P.box(0.5, 0.18, 0.1), DARK, [0.45, 2.55, 1.45], [0, 0, 0.35]);
      b.add(P.box(0.9, 0.3, 0.1), 0x8a2a2a, [0, 1.9, 1.5]);
      b.add(P.cyl(0.35, 0.4, 1.3, 6), 0xf1e3c6, [-1.7, 2.2, 0.3], [0, 0, 0.9]);
      b.add(P.cyl(0.35, 0.4, 1.3, 6), 0xf1e3c6, [1.7, 2.2, 0.3], [0, 0, -0.9]);
      break;
    case 'clockjaw':
      b.add(P.box(3.4, 2.3, 3.8), color, [0, 2.2, -0.3], [0, 0, 0], 1, 0.07);
      b.add(P.box(2.6, 1.0, 1.9), lighter, [0, 2.9, 2.2]);
      b.add(P.box(2.4, 0.6, 1.8), darker, [0, 1.75, 2.15]);
      for (let i = 0; i < 6; i++) {
        b.add(P.cone(0.16, 0.45, 4), WHITE, [-0.95 + i * 0.38, 2.25, 3.0], [Math.PI, 0, 0]);
        b.add(P.cone(0.14, 0.4, 4), WHITE, [-0.95 + i * 0.38, 2.15, 2.95]);
      }
      b.add(P.cyl(1.0, 1.0, 0.3, 8), 0xa87a2e, [-1.85, 2.4, -0.3], [0, 0, Math.PI / 2]);
      b.add(P.cyl(1.0, 1.0, 0.3, 8), 0xa87a2e, [1.85, 2.4, -0.3], [0, 0, Math.PI / 2]);
      b.add(P.cyl(0.6, 0.6, 0.34, 6), 0xe0b25a, [0, 3.5, -0.8], [Math.PI / 2, 0, 0]);
      b.add(P.box(0.4, 0.25, 0.1), 0x5ff2ff, [-0.7, 3.2, 3.16]);
      b.add(P.box(0.4, 0.25, 0.1), 0x5ff2ff, [0.7, 3.2, 3.16]);
      for (const [x, z] of [[-1.3, 1.2], [1.3, 1.2], [-1.3, -1.6], [1.3, -1.6]] as const) {
        b.add(P.box(0.7, 1.2, 0.7), darker, [x, 0.6, z]);
      }
      break;
    case 'gloamRegent':
      b.add(P.cone(2.3, 5.2, 8), color, [0, 3.0, 0], [0, 0, 0], 1, 0.06);
      b.add(P.ico(1.15, 0), 0x2a1d4d, [0, 5.6, 0.1]);
      b.add(P.ico(0.95, 0), 0x0c0814, [0, 5.5, 0.45]);
      b.add(P.ico(0.16, 0), 0xffe97a, [-0.32, 5.6, 1.3]);
      b.add(P.ico(0.16, 0), 0xffe97a, [0.32, 5.6, 1.3]);
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2;
        b.add(P.octa(0.3), 0xb48cff, [Math.sin(a) * 1.1, 6.8, Math.cos(a) * 1.1], [0, 0, 0], [0.7, 1.8, 0.7]);
      }
      b.add(P.cyl(0.25, 0.4, 2.2, 6), darker, [-1.6, 3.6, 0.6], [0.3, 0, 0.9]);
      b.add(P.cyl(0.25, 0.4, 2.2, 6), darker, [1.6, 3.6, 0.6], [0.3, 0, -0.9]);
      b.add(P.box(0.5, 0.65, 0.5), 0xffd34d, [2.4, 3.0, 1.0]);
      break;
    case 'snowRoller': {
      // a grumpy snowball: pebbles and twigs show it spinning as it rolls
      const r = ROLLER_BODY;
      b.add(P.ico(r, 1), color, [0, 0, 0], [0, 0, 0], 1, 0.05);
      // packed-snow bands: contrast on white ground, and they make the spin readable
      b.add(P.torus(r * 0.98, 0.11, 4, 12), darker, [0, 0, 0], [0, Math.PI / 2, 0]);
      b.add(P.torus(r * 0.98, 0.09, 4, 12), darker, [0, 0, 0], [0, Math.PI / 2, Math.PI / 2]);
      b.add(P.ico(0.16, 0), WHITE, [-0.26, 0.2, r * 0.86]);
      b.add(P.ico(0.16, 0), WHITE, [0.26, 0.2, r * 0.86]);
      b.add(P.ico(0.08, 0), DARK, [-0.26, 0.2, r * 0.98]);
      b.add(P.ico(0.08, 0), DARK, [0.26, 0.2, r * 0.98]);
      b.add(P.box(0.28, 0.06, 0.05), DARK, [-0.26, 0.38, r * 0.9], [0, 0, -0.35]);
      b.add(P.box(0.28, 0.06, 0.05), DARK, [0.26, 0.38, r * 0.9], [0, 0, 0.35]);
      b.add(P.cone(0.09, 0.3, 4), 0xff8a3d, [0, 0.02, r * 1.02], [Math.PI / 2, 0, 0]);
      for (let k = 0; k < 9; k++) {
        const a = k * 2.4;
        const y = Math.cos(k * 1.7) * 0.8;
        const q = Math.sqrt(1 - y * y);
        b.add(P.ico(0.09, 0), 0x6a7488, [Math.sin(a) * q * r, y * r, -Math.abs(Math.cos(a)) * q * r]);
      }
      b.add(P.cyl(0.04, 0.05, 0.9, 4), 0x7a5a3a, [-r - 0.25, 0.1, 0], [0, 0, 1.2]);
      b.add(P.cyl(0.04, 0.05, 0.9, 4), 0x7a5a3a, [r + 0.25, 0.1, 0], [0, 0, -1.2]);
      break;
    }
    case 'oldRime': {
      // Old Rime, the Frost Stag
      const hoof = 0x3a4a6a;
      const antler = 0xcfeaff;
      b.add(P.box(1.9, 1.7, 3.6), color, [0, 3.3, -0.2], [0, 0, 0], 1, 0.06);
      b.add(P.box(1.6, 1.2, 1.2), lighter, [0, 3.1, 1.2], [0.2, 0, 0], 1, 0.05);
      for (const [x, z] of [[-0.65, 1.2], [0.65, 1.2], [-0.65, -1.5], [0.65, -1.5]] as const) {
        b.add(P.cyl(0.26, 0.2, 2.6, 6), darker, [x, 1.3, z]);
        b.add(P.box(0.42, 0.3, 0.5), hoof, [x, 0.15, z + 0.05]);
      }
      b.add(P.box(0.9, 1.9, 0.9), color, [0, 4.4, 1.7], [-0.5, 0, 0], 1, 0.05);
      // frost mane
      for (let k = 0; k < 7; k++) b.add(P.cone(0.22, 0.8, 4), SNOW, [(k - 3) * 0.14, 4.6 - k * 0.12, 1.25 - k * 0.12], [-1.1, 0, (k - 3) * 0.2]);
      b.add(P.box(0.95, 0.85, 1.5), color, [0, 5.25, 2.5], [0.15, 0, 0], 1, 0.05);
      b.add(P.box(0.6, 0.55, 0.7), lighter, [0, 5.05, 3.35]);
      b.add(P.box(0.24, 0.16, 0.12), DARK, [0, 5.15, 3.72]);
      b.add(P.box(0.2, 0.14, 0.06), 0x5ff2ff, [-0.4, 5.5, 2.95]);
      b.add(P.box(0.2, 0.14, 0.06), 0x5ff2ff, [0.4, 5.5, 2.95]);
      b.add(P.cone(0.18, 0.5, 4), color, [-0.6, 5.85, 2.2], [0, 0, 0.9]);
      b.add(P.cone(0.18, 0.5, 4), color, [0.6, 5.85, 2.2], [0, 0, -0.9]);
      // antlers: a beam each side with tines tipped in ice
      for (const side of [-1, 1]) {
        b.add(P.cyl(0.1, 0.16, 2.2, 5), antler, [side * 0.9, 6.6, 2.2], [0.25, 0, -side * 0.7]);
        b.add(P.cyl(0.08, 0.12, 1.8, 5), antler, [side * 1.9, 7.6, 1.9], [-0.2, 0, -side * 0.25]);
        for (let t = 0; t < 4; t++) {
          const y = 6.7 + t * 0.55;
          const x = side * (1.05 + t * 0.3);
          b.add(P.cone(0.07, 0.75, 4), antler, [x, y + 0.3, 2.35 + t * 0.05], [-0.35, 0, -side * 0.3]);
          b.add(P.octa(0.16), 0x8fe3ff, [x, y + 0.75, 2.45], [0, 0, 0], [0.7, 1.5, 0.7]);
        }
        b.add(P.octa(0.24), 0x8fe3ff, [side * 2.05, 8.55, 1.7], [0, 0, 0], [0.7, 1.6, 0.7]);
      }
      b.add(P.cone(0.35, 0.8, 5), SNOW, [0, 3.7, -2.2], [-2.2, 0, 0]);
      // icicles hanging from the belly
      for (let k = 0; k < 6; k++) b.add(P.cone(0.1, 0.55, 4), ICE, [-0.7 + (k % 3) * 0.7, 2.25, -1.2 + Math.floor(k / 3) * 1.6], [Math.PI, 0, 0]);
      break;
    }
    default:
      b.add(P.ico(0.6, 0), color, [0, 0.6, 0]);
  }
  frostTrim(b, def.id);
  return b.build();
}

/** Rimewood variants: the same creatures, iced over. */
function frostTrim(b: GeoBuilder, id: string): void {
  switch (id) {
    case 'frostling':
      for (let k = 0; k < 3; k++) b.add(P.octa(0.13), ICE, [(k - 1) * 0.22, 1.12 + (k === 1 ? 0.1 : 0), -0.2], [0, 0, (k - 1) * 0.35], [0.7, 1.8, 0.7]);
      b.add(P.box(0.5, 0.08, 0.1), SNOW, [0, 0.98, 0.42]);
      break;
    case 'icicap':
      b.add(P.ico(0.55, 0), SNOW, [0, 1.38, 0], [0, 0, 0], [1, 0.32, 1]);
      for (let k = 0; k < 7; k++) {
        const a = (k / 7) * Math.PI * 2;
        b.add(P.cone(0.06, 0.32, 4), ICE, [Math.sin(a) * 0.68, 0.7, Math.cos(a) * 0.68], [Math.PI, 0, 0]);
      }
      break;
    case 'grumblecapFrost':
      b.add(P.ico(2.4, 0), SNOW, [0, 4.75, 0], [0, 0.3, 0], [1, 0.28, 1]);
      for (let k = 0; k < 12; k++) {
        const a = (k / 12) * Math.PI * 2;
        b.add(P.cone(0.16, 0.9, 4), ICE, [Math.sin(a) * 3.0, 2.75, Math.cos(a) * 3.0], [Math.PI, 0, 0]);
      }
      break;
    case 'clockjawFrost':
      b.add(P.box(3.5, 0.3, 3.9), SNOW, [0, 3.45, -0.3]);
      for (let k = 0; k < 8; k++) b.add(P.cone(0.12, 0.6, 4), ICE, [-1.6 + k * 0.46, 1.2, -2.2], [Math.PI, 0, 0]);
      break;
  }
}

// ───────────────────────────── projectiles ─────────────────────────────

export function projectileGeometry(kind: ProjectileVisual): THREE.BufferGeometry {
  const b = new GeoBuilder();
  switch (kind) {
    case 'dart':
      b.add(P.cone(0.09, 0.7, 4), 0xc8ff9a, [0, 0, 0], [Math.PI / 2, 0, 0]);
      b.add(P.box(0.24, 0.02, 0.12), 0x6fc24a, [0, 0, -0.3]);
      break;
    case 'lantern':
      b.add(P.octa(0.34), 0xffc93d, [0, 0, 0], [0, 0, 0], [1, 1.25, 1]);
      b.add(P.octa(0.2), 0xfff6c8, [0, 0, 0], [0, 0, 0], [1, 1.3, 1]);
      b.add(P.box(0.5, 0.06, 0.5), 0xb07a3a, [0, 0.36, 0]);
      b.add(P.box(0.5, 0.06, 0.5), 0xb07a3a, [0, -0.36, 0]);
      break;
    case 'disc':
      b.add(P.cyl(0.62, 0.62, 0.12, 8), 0x8ff0e8, [0, 0, 0]);
      b.add(P.cyl(0.28, 0.28, 0.16, 6), 0x2a8a84, [0, 0, 0]);
      break;
    case 'bee':
      b.add(P.ico(0.2, 0), 0xe4d4ff, [0, 0, 0], [0, 0, 0], [1, 1, 1.3]);
      b.add(P.box(0.4, 0.02, 0.14), 0xffffff, [0, 0.14, 0]);
      b.add(P.cone(0.05, 0.16, 4), 0x8a6ad0, [0, 0, -0.3], [-Math.PI / 2, 0, 0]);
      break;
    case 'shard':
      b.add(P.octa(0.2), 0xe6fbff, [0, 0, 0], [0, 0, 0], [0.8, 0.8, 3]);
      break;
    case 'seed':
      b.add(P.ico(0.26, 0), 0xffa05a, [0, 0, 0]);
      b.add(P.cone(0.08, 0.2, 4), 0x6fc24a, [0, 0.26, 0]);
      break;
    case 'enemyOrb':
      b.add(P.ico(0.34, 0), 0xff4fa3, [0, 0, 0]);
      b.add(P.ico(0.2, 0), 0xffd0e8, [0, 0, 0]);
      break;
    case 'enemySpore':
      b.add(P.ico(0.4, 0), 0xc6ff4f, [0, 0, 0]);
      break;
    default:
      b.add(P.ico(0.2, 0), 0xffffff);
  }
  return b.build();
}

// ───────────────────────────── props ─────────────────────────────

export function propGeometry(kind: PropKind): THREE.BufferGeometry {
  const b = new GeoBuilder();
  switch (kind) {
    case 'pine':
      b.add(P.cyl(0.18, 0.25, 1.2, 5), 0x7a5435, [0, 0.6, 0]);
      b.add(P.cone(1.5, 2.0, 6), 0x2f7d4f, [0, 1.9, 0], [0, 0, 0], 1, 0.08);
      b.add(P.cone(1.15, 1.7, 6), 0x3a8f58, [0, 2.9, 0], [0, 0.4, 0], 1, 0.08);
      b.add(P.cone(0.75, 1.3, 6), 0x48a364, [0, 3.8, 0], [0, 0.2, 0], 1, 0.08);
      break;
    case 'oak':
      b.add(P.cyl(0.22, 0.32, 1.6, 6), 0x8a5f3c, [0, 0.8, 0]);
      b.add(P.ico(1.5, 0), 0x5fae4c, [0, 2.6, 0], [0.3, 0.2, 0], 1, 0.1);
      b.add(P.ico(1.0, 0), 0x74c25a, [0.7, 3.2, 0.3], [0, 0.5, 0], 1, 0.1);
      b.add(P.ico(0.9, 0), 0x4f9a42, [-0.7, 2.9, -0.4], [0.5, 0, 0], 1, 0.1);
      break;
    case 'rock':
      b.add(P.dodeca(1.0), 0x9a9aa6, [0, 0.45, 0], [0.3, 0.5, 0.1], [1.2, 0.75, 1], 0.1);
      b.add(P.dodeca(0.55), 0x868693, [0.75, 0.25, 0.3], [0.1, 0.2, 0.6], 1, 0.1);
      break;
    case 'stump':
      b.add(P.cyl(0.45, 0.55, 0.6, 7), 0x8a5f3c, [0, 0.3, 0]);
      b.add(P.cyl(0.42, 0.42, 0.04, 7), 0xd9b98a, [0, 0.61, 0]);
      break;
    case 'crystal':
      b.add(P.octa(0.5), 0x8fe3ff, [0, 0.9, 0], [0, 0, 0.15], [0.6, 2.0, 0.6]);
      b.add(P.octa(0.35), 0xc59bff, [0.45, 0.55, 0.15], [0, 0, -0.5], [0.6, 1.6, 0.6]);
      b.add(P.octa(0.3), 0x8fe3ff, [-0.35, 0.45, -0.2], [0.3, 0, 0.5], [0.6, 1.5, 0.6]);
      break;
    case 'mushroom':
      b.add(P.cyl(0.08, 0.1, 0.4, 5), 0xf1e3c6, [0, 0.2, 0]);
      b.add(P.cone(0.3, 0.25, 6), 0xe0483e, [0, 0.48, 0]);
      b.add(P.ico(0.05, 0), WHITE, [0.12, 0.5, 0.08]);
      break;
    case 'flower':
      b.add(P.cyl(0.02, 0.02, 0.35, 3), 0x4f9a42, [0, 0.17, 0]);
      b.add(P.ico(0.11, 0), 0xffffff, [0, 0.38, 0]);
      b.add(P.ico(0.05, 0), 0xffd34d, [0, 0.38, 0.08]);
      break;
    case 'tuft':
      b.add(P.cone(0.07, 0.5, 3), 0x5aa64a, [0, 0.25, 0], [0, 0, 0.2]);
      b.add(P.cone(0.07, 0.42, 3), 0x6fbf5a, [0.1, 0.21, 0.05], [0.2, 0, -0.3]);
      b.add(P.cone(0.07, 0.38, 3), 0x4c9a40, [-0.08, 0.19, -0.06], [-0.2, 0, 0.35]);
      break;
    case 'post':
      b.add(P.box(0.22, 1.2, 0.22), 0x8a6a4a, [0, 0.6, 0]);
      b.add(P.box(0.08, 0.12, 2.6), 0xa07a52, [0, 0.9, 0]);
      break;
    // ── Rimewood ──
    case 'frostPine':
      b.add(P.cyl(0.18, 0.25, 1.2, 5), 0x6a4a35, [0, 0.6, 0]);
      b.add(P.cone(1.5, 2.0, 6), 0x24584a, [0, 1.9, 0], [0, 0, 0], 1, 0.08);
      b.add(P.cone(1.25, 0.7, 6), SNOW, [0, 2.45, 0], [0, 0.3, 0], 1, 0.03);
      b.add(P.cone(1.15, 1.7, 6), 0x2c6654, [0, 2.9, 0], [0, 0.4, 0], 1, 0.08);
      b.add(P.cone(0.95, 0.6, 6), SNOW, [0, 3.35, 0], [0, 0.7, 0], 1, 0.03);
      b.add(P.cone(0.75, 1.3, 6), 0x36745f, [0, 3.8, 0], [0, 0.2, 0], 1, 0.08);
      b.add(P.cone(0.5, 0.55, 6), SNOW, [0, 4.25, 0], [0, 0.5, 0], 1, 0.03);
      break;
    case 'birch':
      b.add(P.cyl(0.16, 0.22, 3.4, 6), 0xeeeae2, [0, 1.7, 0]);
      for (let k = 0; k < 5; k++) b.add(P.box(0.2, 0.06, 0.24), 0x3a3540, [0, 0.5 + k * 0.62, 0], [0, k * 1.3, 0.2]);
      b.add(P.cyl(0.05, 0.07, 1.2, 4), 0xeeeae2, [0.45, 2.8, 0], [0, 0, -0.8]);
      b.add(P.cyl(0.05, 0.07, 1.0, 4), 0xeeeae2, [-0.4, 3.2, 0.1], [0.2, 0, 0.9]);
      b.add(P.ico(0.75, 0), 0xb8d8c0, [0.15, 3.9, 0], [0.3, 0.2, 0], [1.2, 0.8, 1.1], 0.1);
      b.add(P.ico(0.5, 0), SNOW, [0.15, 4.35, 0], [0, 0, 0], [1.1, 0.45, 1]);
      break;
    case 'snowRock':
      b.add(P.dodeca(1.0), 0x7d8698, [0, 0.45, 0], [0.3, 0.5, 0.1], [1.2, 0.75, 1], 0.1);
      b.add(P.dodeca(0.55), 0x6e7788, [0.75, 0.25, 0.3], [0.1, 0.2, 0.6], 1, 0.1);
      b.add(P.dodeca(0.95), SNOW, [0, 0.82, 0], [0.3, 0.5, 0.1], [1.15, 0.32, 0.95], 0.03);
      break;
    case 'iceCrystal':
      b.add(P.octa(0.5), 0xbff0ff, [0, 0.9, 0], [0, 0, 0.15], [0.6, 2.0, 0.6]);
      b.add(P.octa(0.35), 0x8fd8ff, [0.45, 0.55, 0.15], [0, 0, -0.5], [0.6, 1.6, 0.6]);
      b.add(P.octa(0.3), 0xe6fbff, [-0.35, 0.45, -0.2], [0.3, 0, 0.5], [0.6, 1.5, 0.6]);
      break;
    case 'frostShrub':
      b.add(P.ico(0.4, 0), 0x5a8a7a, [0, 0.3, 0], [0, 0, 0], [1.2, 0.8, 1.1], 0.1);
      b.add(P.ico(0.32, 0), SNOW, [0.05, 0.5, 0], [0, 0, 0], [1.1, 0.45, 1]);
      b.add(P.ico(0.06, 0), 0xe0483e, [0.3, 0.38, 0.2]);
      b.add(P.ico(0.06, 0), 0xe0483e, [-0.25, 0.42, 0.18]);
      break;
    case 'snowTuft':
      b.add(P.cone(0.07, 0.45, 3), 0xa8c0b8, [0, 0.22, 0], [0, 0, 0.2]);
      b.add(P.cone(0.07, 0.38, 3), 0xc4d8d0, [0.1, 0.19, 0.05], [0.2, 0, -0.3]);
      b.add(P.cone(0.07, 0.34, 3), 0x98b2aa, [-0.08, 0.17, -0.06], [-0.2, 0, 0.35]);
      break;
  }
  return b.build();
}

/** A falling icicle (tip down, centred). */
export function icicleGeometry(): THREE.BufferGeometry {
  return new GeoBuilder()
    .add(P.cone(0.32, 1.6, 5), ICE, [0, 0, 0], [Math.PI, 0, 0])
    .add(P.cone(0.2, 0.5, 5), 0xffffff, [0, 0.9, 0])
    .build();
}

/** An ice spike bursting from the ground (base at y = 0). */
export function iceSpikeGeometry(): THREE.BufferGeometry {
  return new GeoBuilder()
    .add(P.cone(0.45, 1.8, 5), 0xbff0ff, [0, 0.9, 0], [0.12, 0, 0.08])
    .add(P.cone(0.25, 1.1, 4), ICE, [0.35, 0.55, 0.1], [0, 0, -0.5])
    .add(P.cone(0.22, 0.9, 4), 0x8fd8ff, [-0.3, 0.45, -0.15], [0.3, 0, 0.5])
    .build();
}

/** Ice shard enemy shot. */
export function shardGeometry(): THREE.BufferGeometry {
  return new GeoBuilder()
    .add(P.octa(0.3), 0xbff0ff, [0, 0, 0], [0, 0, 0], [0.7, 0.7, 1.9])
    .add(P.octa(0.16), 0xffffff, [0, 0, 0], [0, 0, 0], [0.7, 0.7, 1.9])
    .build();
}

// ───────────────────────────── pickups ─────────────────────────────

export function gemGeometry(): THREE.BufferGeometry {
  return new GeoBuilder().add(P.octa(0.28), 0xffffff, [0, 0, 0], [0, 0, 0], [1, 1.5, 1]).build();
}

export function coinGeometry(): THREE.BufferGeometry {
  return new GeoBuilder()
    .add(P.cyl(0.32, 0.32, 0.08, 8), 0xffd34d, [0, 0, 0], [Math.PI / 2, 0, 0])
    .add(P.cyl(0.18, 0.18, 0.1, 6), 0xffb020, [0, 0, 0], [Math.PI / 2, 0, 0])
    .build();
}

export function heartGeometry(): THREE.BufferGeometry {
  // a warm bun with a cherry: heals
  return new GeoBuilder()
    .add(P.ico(0.38, 1), 0xe8a35a, [0, 0, 0], [0, 0, 0], [1, 0.7, 1])
    .add(P.ico(0.3, 0), 0xfff0d8, [0, 0.16, 0], [0, 0, 0], [1, 0.45, 1])
    .add(P.ico(0.12, 0), 0xe8233f, [0, 0.32, 0])
    .build();
}

export function magnetGeometry(): THREE.BufferGeometry {
  return new GeoBuilder()
    .add(new THREE.TorusGeometry(0.32, 0.1, 4, 8, Math.PI), 0xe8423f, [0, 0.05, 0], [0, 0, 0])
    .add(P.box(0.2, 0.22, 0.2), 0xdfe6ee, [-0.32, -0.1, 0])
    .add(P.box(0.2, 0.22, 0.2), 0xdfe6ee, [0.32, -0.1, 0])
    .build();
}

export function chestGeometry(): THREE.BufferGeometry {
  return new GeoBuilder()
    .add(P.box(1.2, 0.7, 0.8), 0x9a6034, [0, 0.35, 0], [0, 0, 0], 1, 0.05)
    .add(P.cyl(0.4, 0.4, 1.2, 6, ), 0xb07040, [0, 0.72, 0], [0, 0, Math.PI / 2], [1, 1, 1])
    .add(P.box(1.24, 0.12, 0.84), 0xffd34d, [0, 0.62, 0])
    .add(P.box(0.2, 0.26, 0.06), 0xffd34d, [0, 0.55, 0.42])
    .build();
}

export function shrineGeometry(): THREE.BufferGeometry {
  const b = new GeoBuilder();
  b.add(P.cyl(1.1, 1.3, 0.4, 7), 0x9a96a8, [0, 0.2, 0], [0, 0, 0], 1, 0.06);
  b.add(P.cyl(0.55, 0.7, 1.2, 6), 0xb4b0c2, [0, 1.0, 0], [0, 0, 0], 1, 0.06);
  b.add(P.cyl(0.8, 0.6, 0.25, 6), 0x9a96a8, [0, 1.7, 0]);
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    b.add(P.box(0.3, 0.8, 0.3), 0x8a8698, [Math.sin(a) * 1.7, 0.4, Math.cos(a) * 1.7], [0, a, 0.1]);
  }
  return b.build();
}

export function shrineCrystalGeometry(): THREE.BufferGeometry {
  return new GeoBuilder().add(P.octa(0.55), 0xffffff, [0, 0, 0], [0, 0, 0], [1, 1.7, 1]).build();
}
