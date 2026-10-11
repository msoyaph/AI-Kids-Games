// One-time onboarding tips, keyed by the event that triggers them.
export interface TipDef {
  id: string;
  title: string;
  text: string;
}

export const TIPS: Record<string, TipDef> = {
  move: { id: 'move', title: 'Getting around', text: 'Move with WASD / arrow keys or the left stick. Hold Shift (or B) to run. Press E / Space / A to interact.' },
  phone: { id: 'phone', title: 'Your Glowpad', text: 'Press Tab (Start) any time for missions, the map, your catalog and settings.' },
  net: { id: 'net', title: 'Catching bugs', text: 'Hold the action button to raise your net and sneak. Get close, then let go to swing. Running scares bugs away!' },
  rod: { id: 'rod', title: 'Fishing', text: 'Face the water and cast near a fish shadow. Wait through the little nibbles — press right when it really bites!' },
  reel: { id: 'reel', title: 'Big fish!', text: 'Hold the action button to lift the hook, let go to drop it. Keep it inside the green zone to reel the fish in.' },
  axe: { id: 'axe', title: 'Chopping', text: 'Hit a tree with the hatchet for Timber. Each tree shares 3 pieces per day.' },
  shovel: { id: 'shovel', title: 'Digging', text: 'Dig up cracks in the ground for buried treasure and fossils. You can also hit rocks for stone and ore.' },
  can: { id: 'can', title: 'Watering', text: 'Water flowers every day. Watered flowers next to the same kind can grow a brand-new color overnight!' },
  ladder: { id: 'ladder', title: 'Climbing', text: 'Face a cliff with the ladder equipped and press the action button to climb up or down.' },
  inventory: { id: 'inventory', title: 'Pockets', text: 'Select an item to equip, plant, place or drop it. Use "Move" to rearrange your pockets.' },
  craft: { id: 'craft', title: 'Crafting', text: 'Pick a recipe to see what you need. Materials come from trees, rocks, weeds, the beach and more.' },
  shop: { id: 'shop', title: 'Trading', text: 'Sell catches and treasures for Glints. The stock changes every day — and there is always a hot item that sells for double.' },
  home: { id: 'home', title: 'Home sweet home', text: 'Sleep in your bed to skip to morning, use the chest for storage, and choose "Decorate" to arrange furniture.' },
  villager: { id: 'villager', title: 'Making friends', text: 'Chat every day, give gifts and help with requests. Close friends share recipes and presents!' },
  night: { id: 'night', title: 'Nightfall', text: 'Different fish and bugs come out at night. When you are tired, sleep at home to skip to morning.' },
  rain: { id: 'rain', title: 'Rainy day', text: 'Rain brings out rare fish and snails — but most butterflies hide.' },
  placement: { id: 'placement', title: 'Placing', text: 'Walk around to move the preview. Green means it fits. Press the action button to place, or Esc to cancel.' },
  museum: { id: 'museum', title: 'The museum', text: 'Donate every new fish, bug and fossil. Completing a wing earns a special reward.' },
  challenge: { id: 'challenge', title: 'Daily challenges', text: 'Three new challenges appear each day. They earn Lumens to spend at the Lumen Exchange in Lantern Hall.' },
  decor: { id: 'decor', title: 'Decorating outside', text: 'Use furniture from your pockets to place it in front of you. Face it and press E to move it, turn it, or slide it a little. Decorations make the island glow!' },
};
