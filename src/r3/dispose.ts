import type { BufferGeometry, Material, Object3D, Texture } from 'three';

/**
 * GPU resource ownership. Anything cached and reused across scenes (shared geometries,
 * materials, planet bakes, the environment map) is flagged with `userData.shared = true`
 * and survives `disposeObject`. Everything else in a scene graph is freed on scene exit.
 */
export function markShared<T extends { userData: Record<string, unknown> }>(x: T): T {
  x.userData.shared = true;
  return x;
}

export function isShared(x: { userData?: Record<string, unknown> } | null | undefined): boolean {
  return !!x?.userData?.shared;
}

function disposeTexture(t: Texture, seen: Set<unknown>): void {
  if (seen.has(t) || isShared(t)) return;
  seen.add(t);
  t.dispose();
}

function disposeMaterial(m: Material, seen: Set<unknown>): void {
  if (seen.has(m) || isShared(m)) return;
  seen.add(m);
  const rec = m as unknown as Record<string, unknown>;
  for (const key of Object.keys(rec)) {
    const v = rec[key];
    if (v && typeof v === 'object' && (v as Texture).isTexture) disposeTexture(v as Texture, seen);
  }
  const uniforms = (m as unknown as { uniforms?: Record<string, { value: unknown }> }).uniforms;
  if (uniforms) {
    for (const u of Object.values(uniforms)) {
      const v = u?.value;
      if (v && typeof v === 'object' && (v as Texture).isTexture) disposeTexture(v as Texture, seen);
    }
  }
  m.dispose();
}

/** Frees every non-shared geometry, material and texture under `root`. */
export function disposeObject(root: Object3D): void {
  const seen = new Set<unknown>();
  root.traverse((o) => {
    const any = o as Object3D & { geometry?: BufferGeometry; material?: Material | Material[]; dispose?: () => void };
    if (any.geometry && !seen.has(any.geometry) && !isShared(any.geometry)) {
      seen.add(any.geometry);
      any.geometry.dispose();
    }
    const mat = any.material;
    if (Array.isArray(mat)) for (const m of mat) disposeMaterial(m, seen);
    else if (mat) disposeMaterial(mat, seen);
    // InstancedMesh, Skeleton, etc.
    if (typeof any.dispose === 'function' && (o as unknown as { isInstancedMesh?: boolean }).isInstancedMesh) any.dispose();
  });
  const bg = (root as unknown as { background?: Texture | null }).background;
  if (bg && (bg as Texture).isTexture) disposeTexture(bg, seen);
  const env = (root as unknown as { environment?: Texture | null }).environment;
  if (env && env.isTexture) disposeTexture(env, seen);
}
