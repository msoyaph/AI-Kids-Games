/**
 * The placement ghost: a see-through copy of the thing being placed, plus its footprint, green where
 * it fits and red where it doesn't (with a cross on red tiles, so it never depends on colour alone).
 */
import * as THREE from 'three';
import { STEP_Y, tileAt } from '../sim/map';
import { tilesOf, type Size } from '../sim/objects';

const ok = new THREE.MeshBasicMaterial({ color: 0x6fdc7a, transparent: true, opacity: 0.45, depthWrite: false });
const bad = new THREE.MeshBasicMaterial({ color: 0xff6b5a, transparent: true, opacity: 0.5, depthWrite: false });
const modelMat = new THREE.MeshLambertMaterial({ vertexColors: true, transparent: true, opacity: 0.6, depthWrite: false });
const tileGeo = new THREE.PlaneGeometry(0.92, 0.92).rotateX(-Math.PI / 2);
const crossGeo = (() => {
  const a = new THREE.BoxGeometry(0.6, 0.02, 0.08).rotateY(Math.PI / 4), b = new THREE.BoxGeometry(0.6, 0.02, 0.08).rotateY(-Math.PI / 4);
  const g = new THREE.BufferGeometry();
  const pa = a.toNonIndexed().getAttribute('position').array as Float32Array, pb = b.toNonIndexed().getAttribute('position').array as Float32Array;
  const pos = new Float32Array(pa.length + pb.length); pos.set(pa); pos.set(pb, pa.length);
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  return g;
})();
const crossMat = new THREE.MeshBasicMaterial({ color: 0xffffff, depthWrite: false, transparent: true, opacity: 0.9 });

export class Ghost {
  readonly group = new THREE.Group();
  private model: THREE.Mesh | null = null;
  private modelKey = '';
  private tiles: THREE.Mesh[] = [];
  private crosses: THREE.Mesh[] = [];

  constructor() { this.group.visible = false; this.group.renderOrder = 5; }

  hide() { this.group.visible = false; }

  /** Show `geo` (built from its north-west corner, facing south) at a spot, turned `rot` quarters. */
  show(key: string, make: () => THREE.BufferGeometry, at: { x: number; z: number; rot: number }, size: Size, fits: (x: number, z: number) => boolean) {
    this.group.visible = true;
    if (key !== this.modelKey) {
      if (this.model) { this.group.remove(this.model); this.model.geometry.dispose(); }
      this.model = new THREE.Mesh(make(), modelMat);
      this.model.renderOrder = 6;
      this.group.add(this.model);
      this.modelKey = key;
    }
    const cells = tilesOf(at, size);
    while (this.tiles.length < cells.length) {
      const t = new THREE.Mesh(tileGeo, ok); t.renderOrder = 5; this.tiles.push(t); this.group.add(t);
      const c = new THREE.Mesh(crossGeo, crossMat); c.renderOrder = 6; this.crosses.push(c); this.group.add(c);
    }
    let lowest = Infinity;
    this.tiles.forEach((t, i) => {
      const cell = cells[i];
      t.visible = !!cell;
      this.crosses[i]!.visible = false;
      if (!cell) return;
      const [x, z] = cell;
      const inMap = x >= 0 && z >= 0 && x < 56 && z < 56;
      const y = inMap ? Math.max(0, tileAt(x, z).level * STEP_Y) : 0;
      lowest = Math.min(lowest, y);
      const good = fits(x, z);
      t.material = good ? ok : bad;
      t.position.set(x + 0.5, y + 0.03, z + 0.5);
      if (!good) { this.crosses[i]!.visible = true; this.crosses[i]!.position.set(x + 0.5, y + 0.05, z + 0.5); }
    });
    const odd = at.rot % 2 === 1;
    const fw = odd ? size.d : size.w, fd = odd ? size.w : size.d;
    if (this.model) {
      this.model.position.set(at.x + fw / 2, Number.isFinite(lowest) ? lowest : 0, at.z + fd / 2);
      this.model.rotation.set(0, (-at.rot * Math.PI) / 2, 0);
      // the model is built from its corner: shift it so it turns about its middle
      this.model.updateMatrix();
      this.model.matrix.multiply(new THREE.Matrix4().makeTranslation(-size.w / 2, 0, -size.d / 2));
      this.model.matrixAutoUpdate = false;
      this.model.matrixWorldNeedsUpdate = true;
    }
  }
}
