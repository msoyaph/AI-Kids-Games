// "Try again!" hints: after a lost level, one helpful, specific tip from what took the snacks.
import { BOSSES, CRITTERS } from '../data/tuning';
import { tipOf } from '../data/invaderBook';

export function hintFor(thieves: readonly string[], plants: readonly string[]): string {
  const has = (id: string) => plants.includes(id);
  for (const kind of thieves) {
    if (kind in BOSSES) return `${tipOf(kind)} Bosses are tough: more shooters in their lane really helps.`;
    const st = CRITTERS[kind];
    if (!st) continue;
    if (st.moves === 'fly' && !st.low) return has('bluebell') ? 'Flyers sail over plants. Bluebells ring them away, and lobbers like Maple and Hollyhock reach them too.' : 'Flyers sail over plants, but lobbers like the Maple Twirler can reach them. Plant one in their lane early.';
    if (st.blocksLobs) return "The frog's leaf umbrella stops lobs. Shoot it straight on with Rowan or Arrowhead.";
    if (st.shield) return 'Shields stop berries. Lob over them with Maple or Hollyhock, or pop right through with Wisteria.';
    if (st.moves === 'hop') return "Hoppers jump over plants. Lamb's Ear, Hop Vine, Boxwood and Pampas Plume stop them in their tracks.";
    if (st.moves === 'dig') return 'Watch for molehills: that is where a vole will pop up. Keep a shooter behind that spot.';
    if (st.group) return 'Ant columns come in threes. Plants that shoo lots at once, like Touch-me-not and Allium, are great against them.';
    if (kind === 'goat') return 'Goats nibble fast. Shoo them early, and keep a sturdy Boxwood or Agave in front of your shooters.';
    if (st.speed >= 0.4) return "Quick critters need slowing down: try a Lamb's Ear or a Boxwood in their lane.";
  }
  return 'Plant more Comfrey early on: more compost means more helpers. A Boxwood in front of your shooters buys them time.';
}
