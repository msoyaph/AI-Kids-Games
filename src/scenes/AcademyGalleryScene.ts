import { Vector3 } from 'three';
import { Scene3D } from '../app/Scene3D';
import { S } from '../app/services';
import { STARTER_LOADOUT } from '../data/parts';
import { Character } from '../r3/models/characters';
import { RocketModel } from '../r3/models/rocket';
import { createPlanet, type PlanetView } from '../r3/space/planets';
import { Academy, fitFov, type CameraPose, type RoomId } from '../r3/rooms/academy';
import { defaultProfile } from '../systems/save/schema';
import { h } from '../ui/dom';

const ROOMS: RoomId[] = ['board', 'codex', 'badges', 'lounge', 'shop', 'lobby', 'hangar'];

/**
 * Visual review page for the Academy diorama:
 * ?academy[&room=board|codex|badges|lounge|shop|lobby|hangar][&cast][&decor=plant,rug,...][&ui][&spin]
 * &cast places placeholder crew at their spots, the cadet on the shop stage and a rocket on the
 * turntable; &ui shades where the hub's DOM bars go (top 200px, bottom 120px of 720).
 */
export class AcademyGalleryScene extends Scene3D {
  private readonly academy: Academy;
  private readonly cast: Character[] = [];
  private rocket: RocketModel | null = null;
  private holo: PlanetView | null = null;
  private readonly sun = new Vector3(0.4, 0.3, 1).normalize();
  private pose: CameraPose;
  private last = 0;
  private readonly spin: boolean;

  constructor() {
    super('academy');
    const r3 = S.game.r3;
    this.world.environmentIntensity = 0.9;
    this.academy = new Academy({ renderer: r3.renderer, profile: r3.profile });
    this.world.add(this.academy.group);
    const q = new URLSearchParams(location.search);
    const room = q.get('room') as RoomId | null;
    this.pose = room && ROOMS.includes(room) ? this.academy.poses[room] : this.academy.overview;
    this.spin = q.has('spin');
    const decor = q.get('decor');
    if (decor) this.academy.setDecor(decor === 'all' ? ['plant', 'rug', 'telescope', 'model', 'lavalamp', 'mobile', 'plush', 'trophy', 'beanbag', 'globe'] : decor.split(','));
    if (q.has('cast')) this.placeCast();
    if (q.has('ui')) {
      this.ui.append(
        h('div', { style: 'position:absolute;left:0;right:0;top:0;height:27.8%;background:rgba(10,0,40,0.45);pointer-events:none' }),
        h('div', { style: 'position:absolute;left:0;right:0;bottom:0;height:16.7%;background:rgba(10,0,40,0.45);pointer-events:none' }),
      );
    }
    this.applyPose();
  }

  private placeCast(): void {
    const shadows = S.game.r3.profile.shadows;
    for (const [id, spot] of Object.entries(this.academy.spots.crew)) {
      const c = new Character(id);
      c.group.scale.setScalar(1.6);
      c.group.position.copy(spot.pos);
      c.group.rotation.y = spot.rotY;
      c.setAnim(id === 'tuggy' ? 'hover' : 'idle');
      this.world.add(c.group);
      this.cast.push(c);
    }
    const p = new Character('player', defaultProfile());
    p.group.scale.setScalar(1.6);
    p.group.position.copy(this.academy.spots.shopStage);
    p.setAnim('wave');
    this.world.add(p.group);
    this.cast.push(p);
    const rocket = new RocketModel(STARTER_LOADOUT, { glossy: S.game.r3.profile.tier === 'high' });
    const e = rocket.extent;
    const s = 3.4 / (e.top - e.bottom);
    const t = this.academy.spots.turntable;
    rocket.group.scale.setScalar(s);
    rocket.group.position.set(t.x, t.y - e.bottom * s + 0.05, t.z);
    this.world.add(rocket.group);
    this.rocket = rocket;
    // Stand-in for the Codex hologram (radius 0.9 at spots.holo).
    this.holo = createPlanet('earth', 0.9, { renderer: S.game.r3.renderer, profile: S.game.r3.profile, detail: 'normal' });
    this.holo.group.position.copy(this.academy.spots.holo);
    this.world.add(this.holo.group);
    if (shadows) {
      for (const o of [rocket.group, ...this.cast.map((c) => c.group)]) {
        o.traverse((x) => {
          const m = x as { isMesh?: boolean; castShadow: boolean; material?: { isMeshStandardMaterial?: boolean; transparent?: boolean } };
          if (m.isMesh && m.material?.isMeshStandardMaterial && !m.material.transparent) m.castShadow = true;
        });
      }
    }
  }

  private applyPose(): void {
    const c = this.camera;
    c.position.copy(this.pose.pos);
    c.lookAt(this.pose.look);
    c.fov = fitFov(this.pose.fov, c.aspect);
    c.updateProjectionMatrix();
  }

  override resize(w: number, h: number): void {
    super.resize(w, h);
    this.applyPose();
  }

  override render(): void {
    const dt = Math.min(0.1, Math.max(0, this.time - this.last)) || 1 / 60;
    this.last = this.time;
    this.academy.update(dt, this.time);
    if (this.spin) this.academy.turntable.rotation.y = this.time * 0.4;
    if (this.rocket) {
      this.rocket.group.rotation.y = this.academy.turntable.rotation.y;
      this.rocket.update(dt, 0.15, 0);
    }
    for (const c of this.cast) c.update(dt);
    this.holo?.update(this.time, this.sun);
  }

  override destroy(): void {
    this.academy.dispose();
    super.destroy();
  }
}
