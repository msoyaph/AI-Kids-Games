// Shared materials: few materials means few shader programs. Plants and critters are smooth,
// vertex-coloured toon shading in soft steps with a warm rim light (a plush, claymation look),
// unlike the faceted Lambert of the farm game. The rim's colour and strength are shared uniforms:
// the world's lighting sets the colour and Low turns it off. The rim follows farm-wip's
// render/materials.ts (from Calex Cart's withRim).
import * as THREE from 'three';

export const rim = {
  color: { value: new THREE.Color(0xfff3d6) },
  strength: { value: 0.32 },
};

/** Three soft steps of light: shade, mid, lit. */
function toonSteps(): THREE.DataTexture {
  const data = new Uint8Array([110, 190, 255]);
  const t = new THREE.DataTexture(data, data.length, 1, THREE.RedFormat);
  t.minFilter = THREE.NearestFilter;
  t.magFilter = THREE.NearestFilter;
  t.generateMipmaps = false;
  t.needsUpdate = true;
  return t;
}
const steps = toonSteps();

function withRim<T extends THREE.MeshToonMaterial>(m: T, key: string): T {
  m.onBeforeCompile = sh => {
    sh.uniforms.rimColor = rim.color;
    sh.uniforms.rimStrength = rim.strength;
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 rimColor;\nuniform float rimStrength;')
      .replace(
        '#include <opaque_fragment>',
        'outgoingLight += rimColor * pow(1.0 - clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0), 2.6) * rimStrength;\n#include <opaque_fragment>',
      );
  };
  m.customProgramCacheKey = () => key;
  return m;
}

const toon = (key: string, side: THREE.Side = THREE.FrontSide) => withRim(new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: steps, side }), key);

// Instanced meshes get their own twins: three.js picks shader programs by "instanced or not", so one
// material shared by both kinds would swap programs on every draw.
export const Materials = {
  /** Plants, critters and props drawn many times. */
  toonInst: toon('toon-i'),
  /** Thin double-sided things drawn many times (leaves in the air, petals). */
  toonInstTwo: toon('toon-i2', THREE.DoubleSide),
  /** One-off props: beds, blanket, basket, fence. */
  toon: toon('toon'),
  /** The grass and soil of the diorama base (no rim: it would outline the whole slab). */
  ground: new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: steps }),
  /** Soft round shadows under things on Low. */
  blob: new THREE.MeshBasicMaterial({ color: 0x24361a, transparent: true, opacity: 0.26, depthWrite: false }),
};
Materials.blob.polygonOffset = true;
Materials.blob.polygonOffsetFactor = -2;
Materials.blob.polygonOffsetUnits = -2;

/** A soft round shadow texture (drawn once on a canvas: no image files). */
export function blobTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(32, 32, 2, 32, 32, 31);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.6, 'rgba(255,255,255,0.55)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
