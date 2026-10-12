// Ghost footprint for placement mode.
import * as THREE from 'three';
import type { Game } from '../sim/game';
import { placementRT } from '../sim/placement';
import { LEVEL_HEIGHT } from '../world/types';
import { curved } from './curve';

export class PlacementView {
  readonly group = new THREE.Group();
  private main: THREE.Mesh;
  private extra: THREE.Mesh;
  private matOk = curved(new THREE.MeshBasicMaterial({ color: 0x8fe39a, transparent: true, opacity: 0.45, depthWrite: false }));
  private matBad = curved(new THREE.MeshBasicMaterial({ color: 0xf27c7c, transparent: true, opacity: 0.45, depthWrite: false }));
  constructor(private game: Game) {
    this.main = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), this.matOk);
    this.extra = new THREE.Mesh(new THREE.BoxGeometry(1, 0.06, 1), this.matOk);
    this.group.add(this.main, this.extra);
    this.group.visible = false;
  }
  frame(): void {
    const pl = placementRT(this.game);
    if (!pl || !pl.rect) {
      this.group.visible = false;
      return;
    }
    this.group.visible = true;
    const m = pl.valid ? this.matOk : this.matBad;
    this.main.material = m;
    this.extra.material = m;
    const r = pl.rect;
    const y = (pl.level ?? this.game.state.player.level) * LEVEL_HEIGHT;
    const h = pl.kind === 'plot' ? 1.6 : 0.25;
    this.main.scale.set(r.w - 0.06, h, r.d - 0.06);
    this.main.position.set(r.x + r.w / 2, y + h / 2, r.z + r.d / 2);
    if (pl.extra) {
      this.extra.visible = true;
      this.extra.scale.set(pl.extra.w - 0.1, 1, pl.extra.d - 0.1);
      this.extra.position.set(pl.extra.x + pl.extra.w / 2, y + 0.04, pl.extra.z + pl.extra.d / 2);
    } else this.extra.visible = false;
  }
}
