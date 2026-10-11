import * as THREE from 'three';

/** Shared materials (few materials = fewer shader programs and state changes). */
export const Materials = {
  /** Faceted, vertex-coloured: props, track, karts. */
  flat: new THREE.MeshLambertMaterial({ vertexColors: true, flatShading: true }),
  /** Smooth, vertex-coloured: characters. */
  smooth: new THREE.MeshLambertMaterial({ vertexColors: true }),
  /** Unlit vertex colours (sky, glows, UI-ish 3D). */
  basic: new THREE.MeshBasicMaterial({ vertexColors: true }),
  shield: new THREE.MeshLambertMaterial({
    color: 0x7fe7ff,
    emissive: 0x2a8fff,
    emissiveIntensity: 0.6,
    transparent: true,
    opacity: 0.35,
    depthWrite: false,
  }),
  blob: new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.32, depthWrite: false }),
};

Materials.blob.polygonOffset = true;
Materials.blob.polygonOffsetFactor = -2;
Materials.blob.polygonOffsetUnits = -2;
