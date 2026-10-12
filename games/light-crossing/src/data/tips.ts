// One-time onboarding tips, keyed by the event that triggers them.
export interface TipDef {
  id: string;
  title: string;
  text: string;
}

export const TIPS: Record<string, TipDef> = {
  move: { id: 'move', title: 'Getting around', text: 'Walk with WASD, the arrow keys or the left stick. Hold Shift (or B) to run. Press E, Space or A to talk, pick up and use things.' },
  phone: { id: 'phone', title: 'Your Glowpad', text: 'Press Tab (or Start) to open your Glowpad. It has your missions, the map, your catalog and settings.' },
  net: { id: 'net', title: 'Catching bugs', text: 'Hold the action button to lift your net and sneak. Get close. Then let go to swing! Running scares bugs away.' },
  rod: { id: 'rod', title: 'Fishing', text: 'Face the water. Cast near a fish shadow. Wait while the fish nibbles. Press the button when it really bites!' },
  reel: { id: 'reel', title: 'Big fish!', text: 'Hold the action button to lift the hook. Let go to drop it. Keep the hook in the green part to pull the fish in!' },
  axe: { id: 'axe', title: 'Chopping', text: 'Hit a tree with your hatchet to get Timber. Each tree gives 3 pieces a day.' },
  shovel: { id: 'shovel', title: 'Digging', text: 'Dig where you see cracks in the ground. You may find treasure or fossils! You can also hit rocks to get stone and ore.' },
  can: { id: 'can', title: 'Watering', text: 'Water your flowers every day. Put two of the same kind side by side. A brand-new color may grow overnight!' },
  ladder: { id: 'ladder', title: 'Climbing', text: 'Hold your ladder and face a cliff. Press the action button to climb up or down.' },
  inventory: { id: 'inventory', title: 'Pockets', text: 'Pick an item to hold, plant, place or drop it. Use "Move" to sort your pockets.' },
  craft: { id: 'craft', title: 'Crafting', text: 'Pick a recipe to see what you need. You can get things from trees, rocks, weeds, the beach and more.' },
  shop: { id: 'shop', title: 'Buying and selling', text: 'Sell fish, bugs and treasures for Glints. The shop has new things each day. And one hot item sells for double!' },
  home: { id: 'home', title: 'Home sweet home', text: 'Sleep in your bed to skip to morning. Keep things in your chest. Pick "Decorate" to move your furniture.' },
  villager: { id: 'villager', title: 'Making friends', text: 'Talk to your neighbors every day. Give gifts, and help when they ask. Good friends give you recipes and presents!' },
  night: { id: 'night', title: 'Night time', text: 'Different fish and bugs come out at night. Feeling tired? Sleep at home to skip to morning.' },
  rain: { id: 'rain', title: 'Rainy day', text: 'Rain brings out rare fish and snails. But most butterflies hide!' },
  placement: { id: 'placement', title: 'Placing', text: 'Walk around to move the shape on the ground. Green means it fits! Press the action button to place it. Press Esc to cancel.' },
  museum: { id: 'museum', title: 'The museum', text: 'Donate every new fish, bug and fossil. Fill a whole wing to get a special prize!' },
  challenge: { id: 'challenge', title: 'Daily challenges', text: 'You get three new challenges each day. They give you Lumens. Spend them at the Lumen Exchange in Lantern Hall!' },
  decor: { id: 'decor', title: 'Decorating outside', text: 'Pick furniture in your pockets to place it in front of you. Face it and press E to move, turn or slide it. Decorations make the island glow!' },
};
