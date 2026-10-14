// The Seed Book's real plant facts, all in one place so they can be reviewed together. Each is a
// true, simply worded fact about the real plant that inspired the card (what it is, where it grows,
// why gardeners like it), plus its Garden Friends, if it has any.

export const FACTS: Record<string, string> = {
  comfrey: 'Comfrey has big, hairy leaves that are full of goodness. Gardeners add them to compost to help other plants grow.',
  rowan: 'Rowan trees, also called mountain ash, grow bunches of bright red berries in autumn. Birds like thrushes love to eat them.',
  boxwood: 'Boxwood is a slow-growing evergreen shrub. Gardeners have clipped it into hedges and shapes, called topiary, for hundreds of years.',
  'lambs-ear': "Lamb's ear leaves are covered in soft silver hairs, so they feel just like a lamb's ear.",
  maple: 'Maple seeds have wings. They spin like little helicopters as they fall, so the wind can carry them away from the tree.',
  basil: 'Basil is a herb grown for its tasty leaves. Gardeners often grow it next to tomatoes.',
  lavender: 'Lavender has a strong, sweet smell. Bees love it, and its scent keeps some insects, like clothes moths, away.',
  arrowhead: 'Arrowhead grows in ponds and ditches. Its leaves are shaped like arrowheads, and ducks eat its little round roots.',
  pickerelweed: 'Pickerelweed grows at the edges of ponds, with tall spikes of blue-purple flowers that bees and butterflies visit.',
  wisteria: 'Wisteria is a climbing vine with long hanging bunches of flowers. Its seed pods can burst open with a pop and fling their seeds.',
  yarrow: 'Yarrow has flat-topped clusters of tiny flowers. Gardeners add its leaves to compost to help it break down faster.',
  'touch-me-not': "Touch-me-not, also called jewelweed, has ripe seed pods that burst open when you touch them, shooting their seeds away. That's how it got its name.",
  primrose: 'Evening primrose flowers open in the evening, sometimes fast enough to watch them unfold. Moths visit them at night.',
  'four-oclock': "Four o'clock flowers open in the late afternoon, around four o'clock, and close again the next morning.",
  'hop-vine': 'Hops are climbing plants whose stems twist around poles and strings as they grow. Their flowers look like little papery green cones.',
  allium: 'Ornamental alliums are cousins of onions and garlic. Each round flower head is made of lots of tiny star-shaped flowers.',
  nasturtium: 'Gardeners plant nasturtiums as a "trap crop": pests like aphids go for the nasturtiums and leave other plants alone. Their flowers are good to eat, too.',
  agave: 'Agave plants store water in their thick leaves, so they can live through long dry spells in the desert.',
  hollyhock: 'Hollyhocks can grow taller than a grown-up, with flowers stacked all the way up the stem. Their seeds are flat and round, like little coins.',
  chamomile: 'Chamomile has small daisy-like flowers that smell a bit like apples. Some gardeners call it "the plant doctor".',
  milkweed: 'Milkweed is the only food monarch butterfly caterpillars eat. Its pods split open to let out seeds on silky white fluff that floats on the wind.',
  bluebell: 'In spring, bluebells cover some woodlands with nodding blue bell-shaped flowers. Some bluebell woods are hundreds of years old.',
  borage: 'Borage has star-shaped flowers that bees adore, so gardeners grow it to bring more bees to their gardens.',
  pampas: 'Pampas grass comes from the grasslands of South America. It grows tall, feathery plumes.',
};

/** Garden Friends, as the Seed Book explains them (the rules are in tuning.ts FRIENDS). */
export const FRIENDS_TEXT: Record<string, string> = {
  comfrey: 'Garden Friends: next to a Rowan, its leaves feed the tree, so the Rowan shoos harder. Next to Yarrow, both make richer compost.',
  rowan: 'Garden Friends: next to Comfrey it shoos harder; next to Allium, too.',
  yarrow: 'Garden Friends: next to Comfrey, both make richer compost. It also makes more compost the more neighbours it has.',
  nasturtium: 'Garden Friends: critters nibble its neighbours more slowly, because it draws them away.',
  chamomile: 'Garden Friends: the plants around it slowly mend. It also makes every card recharge sooner.',
  borage: "Garden Friends: its bees help flowering neighbours (Maple, Hollyhock, Lavender, Bluebell) act faster, and it makes every Garden Friends bonus around it bigger.",
  allium: 'Garden Friends: Rowan, Wisteria and Milkweed next to it shoo harder.',
  basil: 'It helps the plants around it work faster.',
  wisteria: 'Garden Friends: next to Allium, it shoos harder.',
  milkweed: 'Garden Friends: next to Allium, it shoos harder.',
  maple: 'Garden Friends: with Borage next door, its bees make it faster.',
  hollyhock: 'Garden Friends: with Borage next door, its bees make it faster.',
  lavender: 'Garden Friends: with Borage next door, its bees make it faster.',
  bluebell: 'Garden Friends: with Borage next door, its bees make it faster.',
};
