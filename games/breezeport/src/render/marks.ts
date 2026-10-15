/**
 * Tile marks drawn just above the ground: the road a drag would lay, the lots a zone drag would
 * paint, where a building would go (green where it can, coral where it can't), and the cursor or
 * hover outline. One instanced mesh of soft-edged squares; colours per tile.
 */
import * as THREE from 'three';

const geo = new THREE.PlaneGeometry(0.94, 0.94).rotateX(-Math.PI / 2);
const mat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.5, depthWrite: false, vertexColors: false, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 });
const m4 = new THREE.Matrix4();
const col = new THREE.Color();

export const MARK = { ok: 0x7fe0a8, no: 0xff8a73, road: 0xfff2b0, info: 0xffffff } as const;

export class TileMarks {
  readonly mesh: THREE.InstancedMesh;
  private capacity = 256;
  private outline: THREE.LineLoop;

  constructor() {
    this.mesh = new THREE.InstancedMesh(geo, mat, this.capacity);
    this.mesh.count = 0;
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 5;
    const ring = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0.04, 0, 0.04), new THREE.Vector3(0.96, 0, 0.04), new THREE.Vector3(0.96, 0, 0.96), new THREE.Vector3(0.04, 0, 0.96)]);
    this.outline = new THREE.LineLoop(ring, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.95, depthTest: false }));
    this.outline.renderOrder = 10;
    this.outline.visible = false;
    this.mesh.add(this.outline);
  }

  /** Show these tiles (each with its colour), replacing the last set. */
  set(tiles: readonly { x: number; z: number; color: number }[], y = 0.02) {
    if (tiles.length > this.capacity) {
      const parent = this.mesh.parent;
      const grown = new THREE.InstancedMesh(geo, mat, Math.max(tiles.length, this.capacity * 2));
      Object.assign(grown, { frustumCulled: false, renderOrder: 5 });
      grown.add(this.outline);
      parent?.remove(this.mesh);
      parent?.add(grown);
      (this as { mesh: THREE.InstancedMesh }).mesh = grown;
      this.capacity = grown.count;
    }
    tiles.forEach((t, i) => {
      m4.makeTranslation(t.x + 0.5, y, t.z + 0.5);
      this.mesh.setMatrixAt(i, m4);
      this.mesh.setColorAt(i, col.setHex(t.color));
    });
    this.mesh.count = tiles.length;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }

  clear() { this.mesh.count = 0; }

  /** The white outline round one tile (the cursor or the hovered tile). */
  cursor(tile: { x: number; z: number } | null, y = 0.03) {
    this.outline.visible = !!tile;
    if (tile) this.outline.position.set(tile.x, y, tile.z);
  }
}
