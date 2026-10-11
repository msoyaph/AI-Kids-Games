import { S } from '../app/services';
import { BODY_BY_ID, SYSTEM_BY_ID } from '../data/bodies';
import type { FBody } from '../systems/flight';
import type { FlightExtras } from '../systems/flightWorld';
import type { FlightScene, FlightSceneParams } from './FlightScene';

export interface FlightTarget {
  x: number;
  y: number;
  r: number;
}

/**
 * Decides what a flight is *for*: where the arrow points, what the objective says, what can be
 * scanned, and what happens on landing. The mission engine provides a richer director later.
 */
export interface FlightDirector {
  extras(): FlightExtras;
  target(scene: FlightScene): FlightTarget | null;
  canScan(id: string): boolean;
  onStart(scene: FlightScene): void;
  update(scene: FlightScene, dt: number): void;
  onScan(scene: FlightScene, id: string): void;
  onLand(scene: FlightScene, bodyId: string): void;
  onCourseDone(scene: FlightScene, seconds: number): void;
  onTowedHome(scene: FlightScene): void;
}

export function findBody(scene: FlightScene, id: string): FBody | null {
  return scene.getLayout().world.bodies.find((b) => b.id === id) ?? null;
}

/** Plain travel: fly to the destination's main body. */
export function travelDirector(p: FlightSceneParams): FlightDirector {
  const dest = SYSTEM_BY_ID[p.to].main;
  return {
    extras: () => ({}),
    target: (scene) => findBody(scene, dest),
    canScan: (id) => !!BODY_BY_ID[id] && !BODY_BY_ID[id].landable,
    onStart: (scene) => scene.setObjective(`Fly to ${BODY_BY_ID[dest]?.name ?? dest}!`, 'rocket'),
    update: () => {},
    onScan: () => {},
    onLand: (_scene, bodyId) => {
      S.state.data.location = bodyId;
      void S.game.go('title');
    },
    onCourseDone: () => {},
    onTowedHome: () => void S.game.go('title'),
  };
}

/** Hook so the mission system can supply a smarter director. */
export const directorFactory = { make: (p: FlightSceneParams): FlightDirector => travelDirector(p) };

export function flightDirector(p: FlightSceneParams): FlightDirector {
  return directorFactory.make(p);
}
