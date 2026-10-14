/**
 * Onboarding: a short tip the first time each thing comes up, shown once (remembered in the save).
 * Lines are short and plain (checked by tests/unit/reading.test.ts).
 */

export interface Tip { id: string; title: string; text: string }

export const TIPS: Record<string, Tip> = {
  move: { id: 'move', title: 'Look around', text: 'Drag to move around the farm. Pinch or scroll to zoom. Twist two fingers, or press Q and E, to turn.' },
  plant: { id: 'plant', title: 'Plant a field', text: 'Tap an empty field and choose some seeds. With seeds chosen, drag along a row to plant it all.' },
  water: { id: 'water', title: 'Water your crops', text: 'Choose Water and tap growing crops. Watered crops earn a star. Rain waters them too!' },
  pick: { id: 'pick', title: 'Ready to pick', text: 'Ripe crops are ready. Tap them, or drag across a row. Crops never wilt, so there is no rush.' },
  barn: { id: 'barn', title: 'Your barn', text: 'Everything you pick goes in the barn. Sell it there, or keep it for orders and workshops.' },
  compost: { id: 'compost', title: 'Compost', text: 'The compost bin turns scraps into compost. Use it on crops and trees: they grow faster and better.' },
  orders: { id: 'orders', title: 'Orders from town', text: 'The board by the dock has orders from Larkford. Fill one, and the boat takes it to town.' },
  farmhouse: { id: 'farmhouse', title: 'The farmhouse', text: 'Tap the farmhouse for your Farm Book and Ledger. The book has a real fact about every crop.' },
  shop: { id: 'shop', title: 'The shop', text: 'The shop has animal homes, workshops and fruit trees. Choose one, then tap where it should go.' },
  animals: { id: 'animals', title: 'Animals', text: 'Tap a home to see its animals. Feed and brush them for better products. They are fine on their own too.' },
  workshop: { id: 'workshop', title: 'Workshops', text: 'Tap a workshop and press Make. It works through its list, and finished goods wait for you.' },
  build: { id: 'build', title: 'Build mode', text: 'In build mode you can move things, lay paths, plant flowers and open new land. Undo fixes mistakes.' },
  neighbours: { id: 'neighbours', title: 'Neighbours', text: 'Your neighbours offer a swap each day. Open Town, then Neighbours.' },
  fair: { id: 'fair', title: 'Fair day!', text: 'The fair is open today. Open your goals or Town to enter your best things.' },
  rain: { id: 'rain', title: 'Rain', text: 'It is raining! Every growing crop gets a drink, and a star for being watered.' },
  stars: { id: 'stars', title: 'Stars', text: 'Stars show how well a crop was cared for. More stars sell for more and win at the fair.' },
};
