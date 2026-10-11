import * as THREE from 'three';
import type { CharacterDef } from '../config/types';
import { damp, lerp, lerpAngle } from '../core/math';
import { lowPolyMaterial } from './geo';
import { characterGeometry } from './models';

/** The player's on-screen body: procedural model + squash/stretch/lean animation. */
export class PlayerView {
  readonly root = new THREE.Group();
  private body = new THREE.Group();
  private mesh: THREE.Mesh | null = null;
  /** Flat silhouette drawn only where something is in front of the player. */
  private ghost: THREE.Mesh | null = null;
  private ghostMat = new THREE.MeshBasicMaterial({
    color: 0x9fe8ff,
    depthFunc: THREE.GreaterDepth,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -4,
  });
  private shadow: THREE.Mesh;
  private yaw = 0;
  private lean = 0;
  private squash = 1;
  private bob = 0;
  private flash = 0;
  private charId = '';
  private material = lowPolyMaterial();

  constructor() {
    this.root.add(this.body);
    const sg = new THREE.CircleGeometry(0.75, 12);
    sg.rotateX(-Math.PI / 2);
    this.shadow = new THREE.Mesh(sg, new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.28, depthWrite: false }));
    this.shadow.renderOrder = 1;
    this.root.add(this.shadow);
  }

  setCharacter(def: CharacterDef, shadows: boolean): void {
    if (this.charId === def.id) return;
    this.charId = def.id;
    if (this.mesh) {
      this.body.remove(this.mesh);
      if (this.ghost) this.body.remove(this.ghost);
      this.mesh.geometry.dispose();
    }
    const geo = characterGeometry(def);
    this.mesh = new THREE.Mesh(geo, this.material);
    this.mesh.castShadow = shadows;
    // draw order: world (0) → silhouette (1, only where occluded) → player (2). The player is
    // drawn after the silhouette so her own limbs never show through her body.
    this.ghost = new THREE.Mesh(geo, this.ghostMat);
    this.ghost.renderOrder = 1;
    this.mesh.renderOrder = 2;
    this.body.add(this.ghost, this.mesh);
  }

  setShadows(on: boolean): void {
    if (this.mesh) this.mesh.castShadow = on;
  }

  /** Silhouette only during runs (the menu showcase has nothing in front of her). */
  showGhost = true;

  hurt(amount = 1): void {
    this.flash = amount;
    if (amount === 0) this.material.emissive.setRGB(0, 0, 0);
  }

  land(impact: number): void {
    this.squash = Math.max(0.65, 1 - impact * 0.02);
  }

  update(
    x: number,
    y: number,
    z: number,
    groundY: number,
    yaw: number,
    speed: number,
    onGround: boolean,
    sliding: boolean,
    vy: number,
    dt: number,
    time: number,
    invulnerable: boolean,
  ): void {
    this.root.position.set(x, 0, z);
    this.yaw = lerpAngle(this.yaw, yaw, damp(14, dt));
    this.body.rotation.y = this.yaw;
    const wantLean = sliding ? -0.55 : onGround ? Math.min(0.18, speed * 0.012) : 0.05;
    this.lean = lerp(this.lean, wantLean, damp(12, dt));
    this.body.rotation.x = this.lean;
    this.squash = lerp(this.squash, 1, damp(10, dt));
    const stretch = onGround ? this.squash : 1 + Math.max(-0.1, Math.min(0.18, vy * 0.02));
    if (onGround && !sliding && speed > 1) this.bob += dt * (8 + speed * 0.6);
    const bobY = onGround && !sliding ? Math.abs(Math.sin(this.bob)) * 0.09 * Math.min(1, speed / 6) : 0;
    this.body.position.y = y + bobY - (sliding ? 0.2 : 0);
    this.body.scale.set(1 / Math.sqrt(stretch), stretch * (sliding ? 0.8 : 1), 1 / Math.sqrt(stretch));
    // shadow
    this.shadow.position.y = groundY + 0.06;
    const h = Math.max(0, y - groundY);
    const ss = Math.max(0.35, 1 - h * 0.08);
    this.shadow.scale.setScalar(ss);
    // hurt flash / invulnerability blink
    this.flash = Math.max(0, this.flash - dt * 4);
    const blink = invulnerable && Math.sin(time * 40) > 0;
    this.material.emissive.setRGB(this.flash * 0.9, this.flash * 0.2, this.flash * 0.2);
    if (this.mesh) this.mesh.visible = !blink || this.flash > 0.5;
    if (this.ghost && this.mesh) this.ghost.visible = this.mesh.visible && this.showGhost;
  }
}
