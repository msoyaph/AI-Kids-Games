import {
  CapsuleGeometry,
  Color,
  CylinderGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  SphereGeometry,
  TorusGeometry,
} from 'three';
import { Flame } from '../fx/flame';

/**
 * Tuggy the friendly tow-bot: a round yellow robot with a screen face, a tow hook and two little
 * thrusters. Body is about 1 unit tall (scale it up for the scene).
 */
export class TuggyModel {
  readonly group = new Group();
  private readonly flames: Flame[] = [];
  private readonly eyes: Mesh[] = [];
  private readonly hook: Group;
  private t = 0;

  constructor() {
    const yellow = new MeshStandardMaterial({ color: '#ffc83d', roughness: 0.4, metalness: 0.1, envMapIntensity: 1.4 });
    const dark = new MeshStandardMaterial({ color: '#2a2f55', roughness: 0.5, metalness: 0.4 });
    const metal = new MeshStandardMaterial({ color: '#c9d2ee', roughness: 0.25, metalness: 0.9, envMapIntensity: 2 });
    const screen = new MeshStandardMaterial({ color: '#10163a', roughness: 0.15, metalness: 0.2, emissive: new Color('#0a1a40') });
    const eyeMat = new MeshBasicMaterial({ color: new Color('#7dffe9').multiplyScalar(2.2) });

    const body = new Mesh(new SphereGeometry(0.5, 32, 20), yellow);
    body.scale.set(1.1, 0.95, 1);
    const face = new Mesh(new SphereGeometry(0.38, 28, 16, -Math.PI / 2, Math.PI, Math.PI * 0.22, Math.PI * 0.5), screen);
    face.position.z = 0.17;
    face.scale.set(1, 1, 0.9);
    for (const s of [-1, 1]) {
      const eye = new Mesh(new CapsuleGeometry(0.045, 0.07, 4, 10), eyeMat);
      eye.position.set(s * 0.12, 0.06, 0.52);
      this.eyes.push(eye);
      this.group.add(eye);
    }
    const smile = new Mesh(new TorusGeometry(0.09, 0.018, 6, 16, Math.PI), eyeMat);
    smile.rotation.z = Math.PI;
    smile.position.set(0, -0.08, 0.53);
    const band = new Mesh(new TorusGeometry(0.53, 0.05, 10, 40), dark);
    band.rotation.x = Math.PI / 2;
    const antenna = new Mesh(new CylinderGeometry(0.015, 0.015, 0.25, 6), metal);
    antenna.position.y = 0.58;
    const bulb = new Mesh(new SphereGeometry(0.06, 12, 10), new MeshBasicMaterial({ color: new Color('#ff5d73').multiplyScalar(2.5) }));
    bulb.position.y = 0.72;
    this.group.add(body, face, smile, band, antenna, bulb);
    // Thrusters on both sides.
    for (const s of [-1, 1]) {
      const pod = new Mesh(new CapsuleGeometry(0.11, 0.22, 6, 12), dark);
      pod.position.set(s * 0.62, -0.05, -0.05);
      this.group.add(pod);
      const flame = new Flame(0.09, '#4dd4ff', '#e6fbff');
      flame.group.position.set(s * 0.62, -0.25, -0.05);
      this.flames.push(flame);
      this.group.add(flame.group);
    }
    // Tow hook below.
    this.hook = new Group();
    const arm = new Mesh(new CylinderGeometry(0.03, 0.03, 0.35, 8), metal);
    arm.position.y = -0.17;
    const claw = new Mesh(new TorusGeometry(0.1, 0.03, 8, 16, Math.PI * 1.4), metal);
    claw.position.y = -0.4;
    claw.rotation.z = Math.PI * 0.8;
    this.hook.add(arm, claw);
    this.hook.position.y = -0.45;
    this.group.add(this.hook);
  }

  update(dt: number, thrust = 0.6): void {
    this.t += dt;
    for (const f of this.flames) f.set(this.t, thrust, 0);
    // Blink now and then.
    const blink = (this.t % 3.2) < 0.12;
    for (const e of this.eyes) e.scale.y = blink ? 0.15 : 1;
    this.hook.rotation.z = Math.sin(this.t * 3) * 0.15;
  }
}
