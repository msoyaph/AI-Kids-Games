/**
 * EVERY REAL-WORLD FACT IN THE GAME, in one file, so a parent or teacher can review them all.
 * The Crop Book, the Animal Book and the farm's little "Did you know?" notes read from here.
 *
 * Rules (tests/unit/facts.test.ts): one fact for every crop, orchard plant and animal; at most three
 * short sentences; plain words for readers aged about 8; and a `check` naming where a grown-up can
 * confirm it. `note` explains any rounding. Made-up things (the town, the people, the farm) are never
 * in this file. Checked 2026-10-13 (web searches for the numbers).
 */

export interface Fact {
  /** What it's about: `crop:<id>`, `tree:<id>`, `animal:<id>` or `idea:<name>`. */
  about: string;
  text: string;
  check: string;
  note?: string;
}

export const FACTS: readonly Fact[] = [
  // --- field crops (src/data/crops.ts) ---
  { about: 'crop:wheat', text: 'Wheat is a kind of grass. Its seeds are ground into flour to make bread.', check: 'Britannica, "wheat"' },
  { about: 'crop:clover', text: 'Clover puts nitrogen into the soil, and nitrogen feeds plants. Farmers grow it to make a tired field rich again.', check: 'USDA SARE, "Managing Cover Crops Profitably": legumes' },
  { about: 'crop:strawberry', text: 'A strawberry wears its seeds on the outside. A medium one has about 200 of them!', check: 'Michigan State University Extension, "Plant science at the dinner table: Strawberries"', note: 'About 200 is an average; each "seed" is really a tiny fruit with a seed inside.' },
  { about: 'crop:onion', text: 'An onion is made of layers. Cutting one lets out a gas that makes your eyes water.', check: 'Library of Congress, "Why does chopping an onion make you cry?"' },
  { about: 'crop:cabbage', text: 'Cabbage, broccoli, kale and cauliflower all came from the same wild plant. Farmers grew each one to look different.', check: 'Britannica, "cabbage" (Brassica oleracea)' },
  { about: 'crop:oats', text: 'Oats like cool, damp weather. Rolled oats are oat grains that have been steamed and pressed flat.', check: 'Britannica, "oat"' },
  { about: 'crop:bokchoy', text: 'Bok choy is a kind of Chinese cabbage. It grows quickly in cool weather.', check: 'University of Minnesota Extension, "Growing Asian greens"' },
  { about: 'crop:peanuts', text: 'Peanuts grow underground! After the flowers fade, their stems push down into the soil, and the pods grow there.', check: 'Britannica, "peanut"' },
  { about: 'crop:sugarbeet', text: 'About one fifth of the world’s sugar comes from sugar beets. The rest comes from sugarcane.', check: 'FAO sugar statistics; Springer, "Sugar Beet" handbook chapter', note: 'Beet gave 19.6% of world sugar in 2015/16; the share changes a little each year.' },
  { about: 'crop:cucumber', text: 'A cucumber is about 95 percent water. That is why it tastes so cool and crunchy.', check: 'USDA FoodData Central, "Cucumber, with peel, raw"' },
  { about: 'crop:garlic', text: 'A garlic bulb is made of small pieces called cloves. Plant one clove, and it grows into a whole new bulb.', check: 'Britannica, "garlic"' },
  { about: 'crop:cotton', text: 'Cotton grows in fluffy white balls called bolls. The fluff is spun into thread for clothes.', check: 'Britannica, "cotton"' },
  { about: 'crop:turnip', text: 'Long ago in Ireland and Scotland, people carved lanterns out of turnips. Pumpkin lanterns came later.', check: 'Britannica, "jack-o’-lantern"' },
  { about: 'crop:soybeans', text: 'Soybeans are full of protein. They are used to make tofu, soy milk and soy sauce.', check: 'Britannica, "soybean"' },
  { about: 'crop:zucchini', text: 'Zucchini is a summer squash. Its big yellow flowers can be eaten too!', check: 'University of Illinois Extension, "Watch Your Garden Grow: Summer Squash"' },
  { about: 'crop:chickpeas', text: 'Chickpeas are also called garbanzo beans. They are mashed up to make hummus.', check: 'Britannica, "chickpea"' },
  { about: 'crop:barley', text: 'Barley was one of the very first grains people farmed, more than 10,000 years ago.', check: 'Britannica, "barley"' },
  { about: 'crop:bellpepper', text: 'Green, yellow and red bell peppers can come from the same plant. Red ones have ripened the longest.', check: 'University of Illinois Extension, "Peppers"', note: 'True for most garden varieties.' },
  { about: 'crop:leek', text: 'A leek is a cousin of the onion. You eat its long white stem.', check: 'Britannica, "leek"' },
  { about: 'crop:flax', text: 'Flax stems are made into linen cloth. Its seeds are called linseed.', check: 'Britannica, "flax"' },
  { about: 'crop:watermelon', text: 'A watermelon is more than 90 percent water. No wonder it’s a juicy summer treat!', check: 'USDA FoodData Central, "Watermelon, raw"' },
  { about: 'crop:rice', text: 'Rice is the main food for more than half of the people in the world. It is often grown in flooded fields called paddies.', check: 'FAO, "Rice is life"; Britannica, "rice"' },
  { about: 'crop:rhubarb', text: 'People eat rhubarb stalks in pies and jams. Its leaves are not food, so never eat them!', check: 'RHS, "Rhubarb"; Britannica, "rhubarb"' },
  { about: 'crop:chamomile', text: 'Chamomile flowers smell a little like apples. People dry them to make tea.', check: 'Britannica, "chamomile"' },
  { about: 'crop:pumpkin', text: 'Pumpkin flowers need bees to carry their pollen. Without bees, very few pumpkins can grow.', check: 'USDA Forest Service, "Squash Bee"; Penn State Extension, pumpkin pollination' },
  { about: 'crop:okra', text: 'Okra is a cousin of cotton and hibiscus. Its pods are picked while they are young and soft.', check: 'Britannica, "okra"' },
  { about: 'crop:parsnip', text: 'Parsnips taste sweeter after a frost. The cold turns some of their starch into sugar.', check: 'University of Minnesota Extension, "Growing parsnips"' },
  { about: 'crop:buckwheat', text: 'Buckwheat is not wheat at all! It is related to rhubarb, and bees love its flowers.', check: 'Britannica, "buckwheat"' },
  { about: 'crop:lavender', text: 'Lavender has sweet-smelling purple flowers. Bees and butterflies love to visit them.', check: 'RHS, "Lavender"' },
  { about: 'crop:squash', text: 'Butternut squash can keep for months in a cool, dry place. Farmers store it for winter.', check: 'University of Minnesota Extension, "Harvesting and storing winter squash"' },
  // --- orchard trees and bushes (src/data/orchard.ts) ---
  { about: 'tree:plum', text: 'A dried plum is called a prune.', check: 'Britannica, "prune"' },
  { about: 'tree:apricot', text: 'Apricot trees bloom very early in spring, often before their leaves come out.', check: 'Britannica, "apricot"' },
  { about: 'tree:lemon', text: 'A lemon tree can have flowers and fruit on it at the same time.', check: 'University of California Agriculture and Natural Resources, "Lemons"' },
  { about: 'tree:fig', text: 'Wild figs are pollinated by tiny wasps that crawl inside the fig. Many garden figs grow without any help at all.', check: 'Britannica, "fig wasp"; "fig"' },
  { about: 'tree:walnut', text: 'Walnut trees are pollinated by the wind, not by bees.', check: 'Britannica, "walnut"' },
  { about: 'tree:almond', text: 'Almond flowers need bees to carry pollen from tree to tree. Without bees, there would be hardly any almonds.', check: 'USDA, "The Importance of Pollinators"; Almond Board of California' },
  { about: 'tree:raspberry', text: 'A raspberry is made of lots of tiny round bumps. Each bump holds one seed.', check: 'Britannica, "raspberry" (drupelets)' },
  { about: 'tree:gooseberry', text: 'Gooseberry bushes have sharp thorns, so pickers wear gloves.', check: 'RHS, "Gooseberries"' },
  { about: 'tree:blackcurrant', text: 'Blackcurrants have more than three times as much vitamin C as oranges.', check: 'University College Dublin Institute of Food and Health, PlantFoods issue 18', note: 'About 181 mg per 100 g against about 50 mg per 100 g.' },
  { about: 'tree:hazelnut', text: 'In late winter, hazel catkins puff out clouds of pollen. The wind carries it to tiny red flowers.', check: 'Woodland Trust, "Hazel"' },
  // --- animals (src/data/animals.ts) ---
  { about: 'animal:chicken', text: 'A hen can lay about one egg a day when the days are long and bright.', check: 'Penn State Extension, "Egg production"' },
  { about: 'animal:cow', text: 'A cow’s stomach has four parts. Cows chew their food twice, which is called chewing the cud.', check: 'Britannica, "ruminant"' },
  { about: 'animal:goat', text: 'Goats have rectangle-shaped pupils. They help goats see almost all the way around them.', check: 'Science Advances (2015), "Why do animal eyes have pupils of different shapes?"' },
  { about: 'animal:sheep', text: 'Most sheep grow wool all year long, so they need a haircut called shearing.', check: 'Britannica, "sheep"; "shearing"' },
  { about: 'animal:duck', text: 'Ducks spread oil from a gland near their tail over their feathers. Water rolls right off them.', check: 'Britannica, "preen gland"' },
  { about: 'animal:bee', text: 'Honeybees do a waggle dance to tell other bees where to find flowers.', check: 'Britannica, "honeybee"; "waggle dance"' },
  { about: 'animal:dog', text: 'A dog’s nose is thousands of times better at smelling than a person’s.', check: 'PBS NOVA, "Dogs’ Dazzling Sense of Smell"' },
  // --- ideas the farm teaches ---
  { about: 'idea:rotation', text: 'Farmers change what grows in a field each time. This keeps the soil healthy and confuses pests.', check: 'USDA SARE, "Crop Rotation on Organic Farms"' },
  { about: 'idea:legumes', text: 'Beans, peas and clover have tiny helpers on their roots that pull nitrogen from the air into the soil.', check: 'Britannica, "nitrogen fixation"' },
  { about: 'idea:compost', text: 'Compost is old plant scraps that worms and tiny living things turn into rich food for soil.', check: 'US EPA, "Composting At Home"' },
  { about: 'idea:bees', text: 'Bees carry pollen from flower to flower. That helps many fruits and vegetables grow.', check: 'USDA, "The Importance of Pollinators"' },
  { about: 'idea:rain', text: 'Plants drink water through their roots. Rain saves farmers lots of watering.', check: 'Britannica, "plant: water uptake"' },
  { about: 'idea:nitrogen', text: 'Plants need nitrogen to grow green leaves. Hungry crops like wheat and squash use up a lot of it.', check: 'USDA SARE, "Building Soils for Better Crops": nitrogen' },
  { about: 'idea:humus', text: 'Humus is the dark, crumbly part of soil, made from old plants. It holds water like a sponge and feeds tiny soil creatures.', check: 'Britannica, "humus"' },
  { about: 'idea:breeding', text: 'When bees carry pollen from one kind of plant to another, the seeds can mix both parents. Growers keep the best ones, year after year.', check: 'Britannica, "plant breeding"; "pollination"' },
  { about: 'idea:heirloom', text: 'Heirloom seeds are old kinds of plants. Families and growers have saved their seeds for many years.', check: 'University of Illinois Extension, "Heirloom vegetables"' },
  { about: 'forage:mushroom', text: 'Mushrooms are not plants. They are fungi, and they love damp, misty weather. Never eat a wild mushroom unless an expert grown-up says it is safe.', check: 'Britannica, "mushroom"; "fungus"' },
];

export const factAbout = (about: string) => FACTS.find(f => f.about === about);
