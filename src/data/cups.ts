import type { CupData } from './types';

export const CUPS: CupData[] = [
  { id: 'sunrise', name: 'Sunrise Cup', color: 0xffb300, tracks: ['seashell-boardwalk', 'rooftop-rally', 'candy-factory', 'canyon-run'], unlocked: true },
  { id: 'thunder', name: 'Thunder Cup', color: 0x7e57c2, tracks: ['cinder-summit', 'spooky-swirl-fair', 'sunstone-ruins', 'frostpeak-pass'], unlocked: true },
  { id: 'galaxy', name: 'Galaxy Cup', color: 0x26c6da, tracks: ['crater-hop-base', 'coral-dome-dash', 'windmill-sky-isles', 'gearworks-factory'], unlocked: false },
  { id: 'legend', name: 'Legend Cup', color: 0xff4081, tracks: ['legend-1', 'legend-2', 'legend-3', 'legend-4'], unlocked: false },
];

export function findCup(id: string): CupData {
  return CUPS.find((c) => c.id === id) ?? CUPS[0];
}
