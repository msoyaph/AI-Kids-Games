import type { KartConfig, SpeedClass, Stats } from '../data/types';
import { findBody, findGlider, findWheels } from '../data/parts';
import { findRacer } from '../data/racers';
import { Kart } from './kart';
import { SPEED_CLASSES, WEIGHT_BASE, combineStats, deriveParams } from './tuning';

export function kartStats(racerId: string, cfg: KartConfig): Stats {
  const racer = findRacer(racerId);
  return combineStats(WEIGHT_BASE[racer.weight], findBody(cfg.body).mod, findWheels(cfg.wheels).mod, findGlider(cfg.glider).mod);
}

export function createKart(index: number, racerId: string, cfg: KartConfig, speedClass: SpeedClass, player: number): Kart {
  const stats = kartStats(racerId, cfg);
  const params = deriveParams(stats, SPEED_CLASSES[speedClass].speedScale);
  return new Kart(index, racerId, cfg, stats, params, player, findRacer(racerId).name);
}
