// Pooled CPU particles for cozy juice: dust, leaves, wood chips, dirt, splashes, sparkles, fireflies.
import * as THREE from 'three';
import type { Game } from '../sim/game';
import { curved } from './curve';

interface P {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  life: number;
  max: number;
  size: number;
  grav: number;
  color: number;
  spin: number;
}

const MAX = 420;

export class Particles {
  readonly group = new THREE.Group();
  private mesh: THREE.InstancedMesh;
  private glow: THREE.InstancedMesh;
  private ps: P[] = [];
  private flies: { x: number; y: number; z: number; ph: number }[] = [];
  private dummy = new THREE.Object3D();
  private col = new THREE.Color();
  enabled = true;

  constructor(private game: Game) {
    this.mesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.06, 0), curved(new THREE.MeshLambertMaterial({ color: 0xffffff })), MAX);
    this.mesh.frustumCulled = false;
    this.mesh.count = 0;
    this.glow = new THREE.InstancedMesh(new THREE.SphereGeometry(0.045, 6, 4), curved(new THREE.MeshBasicMaterial({ color: 0xfff3a0 })), 40);
    this.glow.frustumCulled = false;
    this.glow.count = 0;
    this.group.add(this.mesh, this.glow);
    game.bus.on('fx', (f) => this.burst(f.kind, f.x, f.y, f.z, f.color));
  }

  private add(x: number, y: number, z: number, vx: number, vy: number, vz: number, life: number, size: number, color: number, grav = 6): void {
    if (this.ps.length >= MAX) this.ps.shift();
    this.ps.push({ x, y, z, vx, vy, vz, life, max: life, size, grav, color, spin: Math.random() * 6 });
  }

  burst(kind: string, x: number, y: number, z: number, color?: number): void {
    if (!this.enabled) return;
    const R = () => Math.random() - 0.5;
    switch (kind) {
      case 'dust':
        for (let k = 0; k < 4; k++) this.add(x + R() * 0.3, y + 0.05, z + R() * 0.3, R() * 0.8, 0.6 + Math.random() * 0.4, R() * 0.8, 0.5, 1.4, color ?? 0xe8dcc4, 1.5);
        break;
      case 'treeShake':
      case 'leaves':
        for (let k = 0; k < 8; k++) this.add(x + R() * 1.2, y + 1.4 + Math.random() * 0.8, z + R() * 1.2, R() * 1.2, -0.2 + Math.random() * 0.6, R() * 1.2, 1.6, 1.1, [0x7fc77a, 0x9bd67f, 0x6aa86f][k % 3]!, 1.2);
        break;
      case 'chips':
        for (let k = 0; k < 7; k++) this.add(x + R() * 0.4, y + 0.6, z + 0.3, R() * 3, 2 + Math.random() * 2, 1 + Math.random() * 2, 0.7, 1, 0xd9ad7c, 9);
        break;
      case 'rockHit':
        for (let k = 0; k < 7; k++) this.add(x + R() * 0.4, y + 0.4, z + 0.3, R() * 3, 2 + Math.random() * 2, 1 + Math.random() * 2, 0.6, 1, 0xb8b4c4, 10);
        break;
      case 'dirt':
        for (let k = 0; k < 9; k++) this.add(x + R() * 0.3, y + 0.1, z + R() * 0.3, R() * 2.5, 2 + Math.random() * 2, R() * 2.5, 0.6, 1.1, 0x9b7457, 10);
        break;
      case 'splash':
      case 'bite':
        for (let k = 0; k < 10; k++) this.add(x + R() * 0.3, y - 0.2, z + R() * 0.3, R() * 2, 2.5 + Math.random() * 2, R() * 2, 0.6, 0.9, 0xcfefff, 10);
        break;
      case 'pop':
      case 'sparkle':
        for (let k = 0; k < 8; k++) this.add(x + R() * 0.5, y + 1.2, z + R() * 0.5, R() * 2, 1.5 + Math.random(), R() * 2, 0.7, 0.9, color ?? 0xffe27a, 2);
        break;
      default:
        break;
    }
  }

  frame(dt: number, night: number, camTarget: THREE.Vector3): void {
    const g = this.game;
    this.group.visible = g.state.player.location === 'island';
    let n = 0;
    for (let i = this.ps.length - 1; i >= 0; i--) {
      const p = this.ps[i]!;
      p.life -= dt;
      if (p.life <= 0) {
        this.ps.splice(i, 1);
        continue;
      }
      p.vy -= p.grav * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.z += p.vz * dt;
      p.vx *= 0.97;
      p.vz *= 0.97;
      const k = p.life / p.max;
      this.dummy.position.set(p.x, p.y, p.z);
      this.dummy.rotation.set(p.spin * k, p.spin, 0);
      this.dummy.scale.setScalar(p.size * Math.min(1, k * 2));
      this.dummy.updateMatrix();
      this.mesh.setMatrixAt(n, this.dummy.matrix);
      this.mesh.setColorAt(n, this.col.setHex(p.color));
      n++;
    }
    this.mesh.count = n;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
    // ambient fireflies at night around the camera focus
    const want = night > 0.5 && g.state.weather.today !== 'rain' ? 26 : 0;
    while (this.flies.length < want) this.flies.push({ x: camTarget.x + (Math.random() - 0.5) * 30, y: 0.6 + Math.random() * 1.5, z: camTarget.z + (Math.random() - 0.5) * 22, ph: Math.random() * 10 });
    if (this.flies.length > want) this.flies.length = want;
    let f = 0;
    for (const fl of this.flies) {
      fl.ph += dt;
      fl.x += Math.sin(fl.ph * 0.7) * dt * 0.4;
      fl.z += Math.cos(fl.ph * 0.5) * dt * 0.4;
      if (Math.abs(fl.x - camTarget.x) > 18) fl.x = camTarget.x - Math.sign(fl.x - camTarget.x) * 15;
      if (Math.abs(fl.z - camTarget.z) > 14) fl.z = camTarget.z - Math.sign(fl.z - camTarget.z) * 11;
      const blink = 0.5 + 0.5 * Math.sin(fl.ph * 2.3);
      this.dummy.position.set(fl.x, fl.y + Math.sin(fl.ph) * 0.2, fl.z);
      this.dummy.rotation.set(0, 0, 0);
      this.dummy.scale.setScalar(0.4 + blink * 0.8);
      this.dummy.updateMatrix();
      this.glow.setMatrixAt(f++, this.dummy.matrix);
    }
    this.glow.count = f;
    this.glow.instanceMatrix.needsUpdate = true;
  }
}
