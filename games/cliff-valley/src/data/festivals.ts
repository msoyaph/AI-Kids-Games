/** Festivals: one per season, each with an activity (run by the festival system). */
export interface FestivalDef {
  id: 'sprout' | 'berry' | 'harvest' | 'starlight';
  name: string;
  season: number;
  day: number;
  /** festival hours */
  open: number;
  close: number;
  where: string;
  desc: string;
  activity: string;
}

export const FESTIVALS: FestivalDef[] = [
  { id: 'sprout', name: 'Sprout Fair', season: 0, day: 8, open: 9 * 60, close: 15 * 60, where: 'town', desc: 'A spring fair with flower stalls and the famous seed race!', activity: 'Seed Race: plant your row before everyone else.' },
  { id: 'berry', name: 'Berry Bash', season: 1, day: 6, open: 9 * 60, close: 15 * 60, where: 'town', desc: 'Juicy summer fun with berry treats for everyone.', activity: 'Berry Pick: gather as many berries as you can.' },
  { id: 'harvest', name: 'Harvest Show', season: 2, day: 7, open: 9 * 60, close: 15 * 60, where: 'town', desc: 'Show off your best crops and win a ribbon!', activity: 'Enter your best produce to be judged.' },
  { id: 'starlight', name: 'Starlight Night', season: 3, day: 8, open: 17 * 60, close: 22 * 60, where: 'town', desc: 'Lanterns, cocoa and a secret gift exchange under the stars.', activity: 'Gift Exchange: give a present to your secret friend.' },
];

export function festivalOn(day: number): FestivalDef | null {
  const s = Math.floor(day / 10) % 4, d = (day % 10) + 1;
  return FESTIVALS.find((f) => f.season === s && f.day === d) ?? null;
}
