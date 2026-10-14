/**
 * The Farm Lab (in the farmhouse, from chapter 6): ideas to try, in six branches of four. Each branch
 * goes in order. Ideas are paid with Lab ideas, which are only ever earned: one per farm level from
 * level 3, two per finished contract, one per top-three fair ribbon and one per new variety. They are
 * never for sale. Each idea sets a flag `lab:<id>` that the rest of the game reads.
 */

export type Branch = 'tools' | 'workshops' | 'water' | 'glass' | 'helpers' | 'decor';

export interface LabIdea { id: string; branch: Branch; name: string; text: string; cost: number }

export const BRANCHES: { id: Branch; name: string; icon: string }[] = [
  { id: 'tools', name: 'Tools', icon: 'plough' },
  { id: 'workshops', name: 'Workshops', icon: 'build' },
  { id: 'water', name: 'Water', icon: 'water' },
  { id: 'glass', name: 'Glass', icon: 'calm' },
  { id: 'helpers', name: 'Helpers', icon: 'farm' },
  { id: 'decor', name: 'Decor', icon: 'star' },
];

export const LAB: readonly LabIdea[] = [
  { id: 'widecan', branch: 'tools', name: 'Wide watering can', text: 'Watering a crop also waters the dry crops right next to it.', cost: 1 },
  { id: 'stand1', branch: 'tools', name: 'Bigger stand', text: 'Two more shelves on your farm stand.', cost: 2 },
  { id: 'barn', branch: 'tools', name: 'Barn builders', text: 'Making the barn bigger costs a fifth less.', cost: 2 },
  { id: 'stand2', branch: 'tools', name: 'Even bigger stand', text: 'Two more shelves again.', cost: 3 },
  { id: 'fast1', branch: 'workshops', name: 'Oiled gears', text: 'Every workshop works a little faster.', cost: 1 },
  { id: 'slot', branch: 'workshops', name: 'Longer lists', text: 'Every workshop can line up one more job.', cost: 2 },
  { id: 'fast2', branch: 'workshops', name: 'Clever tools', text: 'Every workshop works a little faster again.', cost: 2 },
  { id: 'compost', branch: 'workshops', name: 'Hot compost', text: 'The compost bin makes compost twice as fast.', cost: 2 },
  { id: 'sprinkler2', branch: 'water', name: 'Bigger sprinklers', text: 'Sprinklers reach 2 tiles away.', cost: 2 },
  { id: 'culverts', branch: 'water', name: 'Pipes under paths', text: 'Water runs under paths, so channels can cross them.', cost: 1 },
  { id: 'sprinkler3', branch: 'water', name: 'Super sprinklers', text: 'Sprinklers reach 3 tiles away.', cost: 3 },
  { id: 'deep', branch: 'water', name: 'Wide channels', text: 'Channels water fields up to 2 tiles away.', cost: 2 },
  { id: 'medium', branch: 'glass', name: 'Glasshouse', text: 'A bigger greenhouse in the Shop, with 8 beds.', cost: 2 },
  { id: 'warm', branch: 'glass', name: 'Warm glass', text: 'Greenhouse crops grow faster in winter.', cost: 1 },
  { id: 'large', branch: 'glass', name: 'Big glasshouse', text: 'The biggest greenhouse, with 12 beds.', cost: 3 },
  { id: 'glassstars', branch: 'glass', name: 'Sunny benches', text: 'Greenhouse crops earn one more care point.', cost: 2 },
  { id: 'skills', branch: 'helpers', name: 'Good teachers', text: 'Helpers learn their jobs twice as fast.', cost: 1 },
  { id: 'helpers1', branch: 'helpers', name: 'A new friend', text: 'One more helper can join the farm.', cost: 2 },
  { id: 'quick', branch: 'helpers', name: 'Comfy boots', text: 'Helpers work a little faster.', cost: 2 },
  { id: 'helpers2', branch: 'helpers', name: 'Another friend', text: 'One more helper again.', cost: 3 },
  { id: 'pondset', branch: 'decor', name: 'Pond Set', text: 'A duck statue and a lily planter for Build mode.', cost: 1 },
  { id: 'lanternset', branch: 'decor', name: 'Lantern Set', text: 'Paper lanterns and a lantern post.', cost: 2 },
  { id: 'windmillset', branch: 'decor', name: 'Windmill Set', text: 'A garden windmill and a birdhouse.', cost: 2 },
  { id: 'beauty', branch: 'decor', name: 'Green fingers', text: 'Flower beds count double for beauty.', cost: 2 },
];

export const LAB_BY_ID: Record<string, LabIdea> = Object.fromEntries(LAB.map(l => [l.id, l]));
/** The decoration set each Decor idea unlocks. */
export const LAB_SETS: Record<string, string> = { pondset: 'pond', lanternset: 'lantern', windmillset: 'windmill' };
