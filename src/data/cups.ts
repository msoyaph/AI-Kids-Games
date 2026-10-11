import type { CupData } from './types';

export const CUPS: CupData[] = [
  { id: 'sunrise', name: 'Sunrise Cup', color: 0xffb300, tracks: ['seashell-boardwalk', 'rooftop-rally', 'candy-factory', 'canyon-run'], unlocked: true },
  { id: 'thunder', name: 'Thunder Cup', color: 0x7e57c2, tracks: ['cinder-summit', 'spooky-swirl-fair', 'sunstone-ruins', 'frostpeak-pass'], unlocked: true },
  { id: 'galaxy', name: 'Galaxy Cup', color: 0x26c6da, tracks: ['crater-hop-base', 'coral-dome-dash', 'windmill-sky-isles', 'gearworks-factory'], unlocked: false },
  { id: 'legend', name: 'Legend Cup', color: 0xff4081, tracks: ['neon-nightway', 'jadefall-temple', 'sky-castle-soar', 'prism-parkway'], unlocked: false },
  // v0.2: unlocks with any Legend Cup trophy. Not needed for Champion / Mirror (those stay on the original cups).
  { id: 'frost', name: 'Frost Cup', color: 0x7fd8ff, tracks: ['shiver-lake', 'crystal-cavern', 'lantern-village', 'avalanche-peak'], unlocked: false },
];

/** The four original cups: Champion and Mirror unlock from gold in these (adding cups never moves the goalposts). */
export const ORIGINAL_CUPS: CupData['id'][] = ['sunrise', 'thunder', 'galaxy', 'legend'];

export function findCup(id: string): CupData {
  return CUPS.find((c) => c.id === id) ?? CUPS[0];
}
