// Renders villagers + NPCs from the agent runtime, with emote bubbles.
import * as THREE from 'three';
import { NPC_BY_ID, VILLAGER_BY_ID, type CharacterLook } from '../data/villagers';
import { agents } from '../sim/agents';
import type { Game } from '../sim/game';
import { curved } from './curve';
import { animateRig, buildCharacter, type Rig } from './models/character';

function lookOf(id: string): CharacterLook | null {
  return VILLAGER_BY_ID[id]?.look ?? NPC_BY_ID[id]?.look ?? null;
}

const bubbleMat = (color: number) => curved(new THREE.MeshBasicMaterial({ color }));

export class AgentView {
  readonly group = new THREE.Group();
  private rigs = new Map<string, Rig>();
  private bubbles = new Map<string, THREE.Group>();

  constructor(private game: Game) {}

  private bubble(kind: string): THREE.Group {
    const g = new THREE.Group();
    const color = kind === 'heart' ? 0xff7f9f : kind === 'note' ? 0x7fb2ff : 0xffd166;
    const base = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), bubbleMat(0xffffff));
    base.scale.set(1, 0.85, 0.4);
    g.add(base);
    const shape = new THREE.Shape();
    shape.moveTo(0, -0.08);
    shape.bezierCurveTo(-0.16, 0.02, -0.08, 0.14, 0, 0.06);
    shape.bezierCurveTo(0.08, 0.14, 0.16, 0.02, 0, -0.08);
    const icon = new THREE.Mesh(new THREE.ShapeGeometry(shape), bubbleMat(color));
    icon.position.z = 0.1;
    g.add(icon);
    return g;
  }

  frame(dt: number): void {
    const g = this.game;
    const onIsland = g.state.player.location === 'island';
    this.group.visible = onIsland;
    if (!onIsland) return;
    const live = new Set<string>();
    for (const a of agents(g).values()) {
      live.add(a.id);
      let rig = this.rigs.get(a.id);
      if (!rig) {
        const look = lookOf(a.id);
        if (!look) continue;
        rig = buildCharacter({ species: look.species, skin: look.fur, accent: look.accent, outfit: look.outfit, eyes: look.eyes, blush: look.blush, scale: a.kind === 'npc' ? 1.08 : 1 });
        this.rigs.set(a.id, rig);
        this.group.add(rig.root);
      }
      rig.root.visible = a.visible;
      if (!a.visible) continue;
      const y = g.world.surfaceY(a.x, a.z);
      rig.root.position.set(a.x, y, a.z);
      rig.root.rotation.y = a.facing;
      animateRig(rig, dt, { speed: a.speed, action: -1, talking: a.talking });
      let b = this.bubbles.get(a.id);
      if (a.emote) {
        if (!b) {
          b = this.bubble(a.emote.kind);
          this.bubbles.set(a.id, b);
          this.group.add(b);
        }
        b.visible = true;
        b.position.set(a.x, y + 1.75 + Math.sin(a.emote.t * 6) * 0.05, a.z);
        b.scale.setScalar(Math.min(1, (2.2 - a.emote.t) * 5));
      } else if (b) {
        this.group.remove(b);
        this.bubbles.delete(a.id);
      }
    }
    for (const [id, rig] of this.rigs)
      if (!live.has(id)) {
        this.group.remove(rig.root);
        this.rigs.delete(id);
      }
  }
}
