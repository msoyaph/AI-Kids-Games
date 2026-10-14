/**
 * Shared materials: few materials means few shader programs. Everything is vertex-coloured Lambert
 * with the shared effects from fx.ts: drifting cloud shadows everywhere, a soft rim light on
 * buildings, animals and props, and wind sway on crops, trees and grass. (The rim idea is adapted
 * from Calex Cart's `withRim`, games/calex-cart/src/render/materials.ts.)
 */
import * as THREE from 'three';
import { fxUniforms, patchMaterial } from './fx';

/** Kept for older callers: the rim's colour and strength live in fxUniforms. */
export const rim = { color: fxUniforms.rimColor, strength: fxUniforms.rimStrength };

const lambert = (o: THREE.MeshLambertMaterialParameters = {}) => new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true, ...o });

// Instanced meshes get their own twins: three.js picks shader programs by "instanced or not", so one
// material shared by both kinds would swap programs on every draw.
export const Materials = {
  /** Faceted props and buildings, with their painted planks, shingles and stone. */
  flat: patchMaterial(lambert(), { key: 'flat', rim: true, patterns: true }),
  flatInst: patchMaterial(lambert(), { key: 'flat-i', rim: true, patterns: true }),
  /** The same, with unpatterned parts tinted per instance (produce on the farm stand). */
  flatTintInst: patchMaterial(lambert(), { key: 'flat-ti', rim: true, patterns: true, tint: true }),
  /** Smooth-shaded animals, people and the boat. */
  smooth: patchMaterial(lambert({ flatShading: false }), { key: 'smooth', rim: true }),
  smoothInst: patchMaterial(lambert({ flatShading: false }), { key: 'smooth-i', rim: true }),
  /** Crops and flowers: they sway in the wind. */
  plantInst: patchMaterial(lambert(), { key: 'plant-i', rim: true, wind: 'plant' }),
  /** Trees and bushes: soft round canopies that sway, and bark on the trunks. */
  treeInst: patchMaterial(lambert({ flatShading: false }), { key: 'tree-i', rim: true, wind: 'tree', patterns: true }),
  /** The same, with the canopy tinted per instance (two looks of a tree in one layer). */
  treeTintInst: patchMaterial(lambert({ flatShading: false }), { key: 'tree-ti', rim: true, wind: 'tree', patterns: true, tint: true }),
  /** Grass tufts and wildflowers around the view. */
  grassInst: patchMaterial(lambert({ side: THREE.DoubleSide }), { key: 'grass-i', wind: 'grass' }),
  /** Soft round shadows under things when the shadow map is off. */
  blob: new THREE.MeshBasicMaterial({ color: 0x1d2a12, transparent: true, opacity: 0.22, depthWrite: false }),
  /** Unlit vertex colours (highlights, glows). */
  basic: new THREE.MeshBasicMaterial({ vertexColors: true }),
};
Materials.blob.polygonOffset = true;
Materials.blob.polygonOffsetFactor = -2;
Materials.blob.polygonOffsetUnits = -2;
for (const m of Object.values(Materials)) m.userData.shared = true;
