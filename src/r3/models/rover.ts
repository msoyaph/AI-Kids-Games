import {
  BoxGeometry,
  CylinderGeometry,
  Group,
  Mesh,
  SphereGeometry,
  TorusGeometry,
  type BufferGeometry,
} from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type { AstronautLook } from '../../data/types';
import { markShared } from '../dispose';
import { buildCadet, type Character } from './characters';
import { fabricMat, glassMat, glowMat, metalMat, paintMat } from './rocketMaterials';

const geos = new Map<string, BufferGeometry>();
function geo(key: string, make: () => BufferGeometry): BufferGeometry {
  let g = geos.get(key);
  if (!g) {
    g = markShared(make());
    geos.set(key, g);
  }
  return g;
}

/**
 * The six-wheeled exploration rover, with the cadet driving under a glass bubble. About 1.6 long
 * and 1.1 tall, wheels on the ground at y = 0, front toward +x. `update` spins the wheels by the
 * distance driven and bounces the body on its springs.
 */
export class RoverModel {
  readonly group = new Group();
  readonly driver: Character;
  private readonly body = new Group();
  private readonly wheels: Mesh[] = [];
  private readonly dish: Mesh;
  private bounce = 0;
  private bounceV = 0;

  constructor(profile: AstronautLook) {
    const R = 0.22;
    const tire = fabricMat('#2b2840');
    const hub = metalMat('bright');
    for (const x of [-0.56, 0, 0.56]) {
      for (const z of [-0.42, 0.42]) {
        const w = new Mesh(geo('rv:tire', () => new TorusGeometry(R * 0.72, R * 0.3, 10, 20)), tire);
        w.position.set(x, R, z);
        const cap = new Mesh(geo('rv:hub', () => new CylinderGeometry(R * 0.55, R * 0.55, 0.14, 14).rotateX(Math.PI / 2)), hub);
        w.add(cap);
        this.wheels.push(w);
        this.group.add(w);
      }
    }
    this.group.add(this.body);
    const paint = paintMat('#f4f1ea', false);
    const accent = paintMat('#ff9f43', false);
    const chassis = new Mesh(geo('rv:chassis', () => new RoundedBoxGeometry(1.5, 0.34, 0.92, 3, 0.1)), paint);
    chassis.position.y = 0.48;
    const stripe = new Mesh(geo('rv:stripe', () => new RoundedBoxGeometry(1.52, 0.08, 0.94, 2, 0.03)), accent);
    stripe.position.y = 0.44;
    const fender = new Mesh(geo('rv:fender', () => new BoxGeometry(1.62, 0.06, 1.0)), metalMat('dark'));
    fender.position.y = 0.33;
    const panel = new Mesh(geo('rv:panel', () => new BoxGeometry(0.62, 0.04, 0.8)), paintMat('#3b4bd6', false));
    panel.position.set(-0.42, 0.72, 0);
    panel.rotation.z = 0.18;
    const mast = new Mesh(geo('rv:mast', () => new CylinderGeometry(0.025, 0.025, 0.55, 8)), metalMat('bright'));
    mast.position.set(-0.6, 0.9, 0.25);
    this.dish = new Mesh(geo('rv:dish', () => new SphereGeometry(0.13, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2.4).rotateX(Math.PI / 2)), metalMat('bright'));
    this.dish.position.set(-0.6, 1.17, 0.25);
    const tip = new Mesh(geo('rv:tip', () => new SphereGeometry(0.045, 10, 8)), glowMat('#ff5d73', 2.6));
    tip.position.set(-0.6, 1.2, 0.25);
    const lamp = new Mesh(geo('rv:lamp', () => new SphereGeometry(0.06, 12, 8)), glowMat('#fff3b0', 2.6));
    lamp.position.set(0.76, 0.5, 0.28);
    const lamp2 = lamp.clone();
    lamp2.position.z = -0.28;
    // The driver sits in a glass bubble at the front.
    this.driver = buildCadet(profile);
    this.driver.group.scale.setScalar(0.62);
    this.driver.group.position.set(0.25, 0.3, 0);
    this.driver.group.rotation.y = Math.PI / 2;
    // Legs tucked away inside the rover (bones, so shrink rather than hide).
    this.driver.j.lHip.scale.setScalar(0.001);
    this.driver.j.rHip.scale.setScalar(0.001);
    const bubble = new Mesh(geo('rv:bubble', () => new SphereGeometry(0.4, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2)), glassMat('#bfe9ff'));
    bubble.position.set(0.25, 0.64, 0);
    const ring = new Mesh(geo('rv:ring', () => new TorusGeometry(0.4, 0.045, 8, 28).rotateX(Math.PI / 2)), accent);
    ring.position.set(0.25, 0.65, 0);
    this.body.add(chassis, stripe, fender, panel, mast, this.dish, tip, lamp, lamp2, this.driver.group, ring, bubble);
  }

  /** `dist` = distance driven (world units), `vy` = vertical speed (for the spring bounce). */
  update(dt: number, dist: number, onGround: boolean, landed: boolean): void {
    const spin = -dist / 0.22;
    for (const w of this.wheels) w.rotation.z = spin;
    if (landed) this.bounceV -= 1.6;
    // A springy body.
    this.bounceV += (-this.bounce * 160 - this.bounceV * 10) * dt;
    this.bounce += this.bounceV * dt;
    this.body.position.y = this.bounce * 0.4 + (onGround ? Math.sin(dist * 9) * 0.008 : 0);
    this.dish.rotation.y += dt * 1.5;
    this.driver.update(dt);
  }
}
