/**
 * The river traffic and visitors: the Little Lark at the dock, or sailing down the river to Larkford's
 * jetty, waiting there a little while, and sailing home (it rocks gently on the water), and a
 * neighbour walking up from the dock when they visit.
 */
import * as THREE from 'three';
import { NEIGHBOR } from '../data/cast';
import { boatTrip } from '../sim/orders';
import { WATER_Y } from '../sim/map';
import type { Farm } from '../sim/state';
import { Materials } from './materials';
import { boat, person } from './models/town';

/** Where the boat ties up, beside the dock, and beside Larkford's jetty. */
export const MOORING = { x: 51.6, z: 44.6 };
export const JETTY = { x: 51.9, z: 64.3 };
const DOCK_STEP = { x: 47.5, z: 44.5 }, YARD = { x: 41.5, z: 42.5 };

export class TownView {
  readonly group = new THREE.Group();
  private boat: THREE.Mesh;
  private visitor: THREE.Mesh | null = null;
  private visit: { started: number; who: string } | null = null;

  constructor() {
    this.boat = new THREE.Mesh(boat(), Materials.smooth);
    this.boat.castShadow = true;
    this.group.add(this.boat);
  }

  /** A neighbour's visit begins (real seconds, so it plays out even while time is paused). */
  startVisit(who: string, now: number) {
    const n = NEIGHBOR[who];
    if (!n) return;
    if (this.visitor) { this.group.remove(this.visitor); this.visitor.geometry.dispose(); }
    this.visitor = new THREE.Mesh(person(n.color), Materials.smooth);
    this.visitor.castShadow = true;
    this.group.add(this.visitor);
    this.visit = { started: now, who };
  }

  update(farm: Farm, now: number, reduced: boolean) {
    // the boat: at the mooring, or along the river south to town and back
    const trip = boatTrip(farm);
    const bob = reduced ? 0 : Math.sin(now * 1.3) * 0.03;
    if (trip === null) {
      this.boat.visible = true;
      this.boat.position.set(MOORING.x, WATER_Y + 0.05 + bob, MOORING.z);
      this.boat.rotation.set(0, 0, reduced ? 0 : Math.sin(now * 0.9) * 0.02);
    } else {
      // down to town (0–0.4), tied up at the jetty (0.4–0.6), and home again (0.6–1)
      const out = trip < 0.5;
      const ease = (k: number) => k * k * (3 - 2 * k);
      const k = trip < 0.4 ? ease(trip / 0.4) : trip < 0.6 ? 1 : ease((1 - trip) / 0.4);
      const z = MOORING.z + k * (JETTY.z - MOORING.z);
      // keep to one side of the river on the way out and the other on the way back
      const lane = (out ? 0.3 : -0.3) * Math.sin(Math.PI * k);
      this.boat.visible = true;
      this.boat.position.set(MOORING.x + k * (JETTY.x - MOORING.x) + lane, WATER_Y + 0.05 + bob, z);
      this.boat.rotation.set(0, out ? 0 : Math.PI, 0);
    }
    // a visitor walks from the dock to the yard, looks around, and walks back
    if (this.visit && this.visitor) {
      const t = now - this.visit.started, walk = 8, stay = 10;
      let k: number, back = false;
      if (t < walk) k = t / walk;
      else if (t < walk + stay) k = 1;
      else if (t < walk * 2 + stay) { k = 1 - (t - walk - stay) / walk; back = true; }
      else { this.group.remove(this.visitor); this.visitor.geometry.dispose(); this.visitor = null; this.visit = null; return; }
      const x = DOCK_STEP.x + (YARD.x - DOCK_STEP.x) * k, z = DOCK_STEP.z + (YARD.z - DOCK_STEP.z) * k;
      const hop = reduced ? 0 : Math.abs(Math.sin(t * 6)) * (k > 0 && k < 1 ? 0.04 : 0);
      this.visitor.position.set(x, hop, z);
      this.visitor.rotation.y = Math.atan2((YARD.x - DOCK_STEP.x) * (back ? -1 : 1), (YARD.z - DOCK_STEP.z) * (back ? -1 : 1)) + (k === 1 && !reduced ? Math.sin(t) * 0.8 : 0);
    }
  }
}
