/**
 * EVERY REAL-WORLD FACT IN THE GAME, in one file for review.
 *
 * One fact per Field Guide page, about the real thing that species is inspired by. Facts are kept
 * short, simply worded for ages 7–12, and careful: "about" and "can" where numbers vary in nature.
 * `check` says where a grown-up can confirm it (checked 2026-10-13); `note` explains any rounding.
 * The game never says the creatures themselves are real: the Field Guide labels these "Real fact".
 */

export interface Fact {
  /** Species id (data/species.ts). */
  id: string;
  /** The real thing it's about. */
  topic: string;
  text: string;
  check: string;
  note?: string;
}

export const FACTS: Fact[] = [
  // Maple seeds (Spinnet line)
  { id: 'spinnet', topic: 'Maple seeds', text: 'Maple seeds have a thin wing. When they fall, they spin like little helicopters.', check: 'Smithsonian Magazine; botany textbooks (samaras)' },
  { id: 'twirlwing', topic: 'Maple seeds', text: 'Spinning slows a maple seed down, so the wind can carry it farther from its tree.', check: 'Science journal studies of samara flight (e.g. Lentink et al., Science 2009)' },
  { id: 'maplegale', topic: 'Maple trees', text: 'Maple syrup is made from the sap of maple trees. The sap is boiled until it is thick and sweet.', check: 'US Department of Agriculture; Britannica (maple syrup)' },

  // Geodes (Druzling line)
  { id: 'druzling', topic: 'Geodes', text: 'A geode can look like a plain rock outside. Inside, it can be hollow and lined with crystals.', check: 'US Geological Survey; Britannica (geode)' },
  { id: 'druzette', topic: 'Amethyst', text: 'Amethyst is a purple kind of quartz. It is a common crystal inside geodes.', check: 'Smithsonian National Museum of Natural History; Britannica (amethyst)' },
  { id: 'druzarch', topic: 'Geodes', text: 'Geode crystals grow very slowly from minerals in water that seeps into a hollow space in a rock.', check: 'US Geological Survey; Britannica (geode)' },

  // Platypuses (Buzzbill line)
  { id: 'buzzbill', topic: 'Platypuses', text: 'A platypus can feel the tiny electric signals that small water animals make, using its bill.', check: 'Australian Museum; National Geographic (electroreception)' },
  { id: 'zipbill', topic: 'Platypuses', text: 'The platypus is a mammal that lays eggs.', check: 'Australian Museum; National Geographic Kids' },
  { id: 'voltabill', topic: 'Platypuses', text: 'When a platypus dives, it closes its eyes, ears and nose. It finds food with its bill.', check: 'Australian Museum; San Diego Zoo Wildlife Alliance' },

  // Popcorn (Kernip line)
  { id: 'kernip', topic: 'Popcorn', text: 'Each popcorn kernel has a tiny bit of water inside. When it gets hot, the water turns to steam, and pop!', check: 'Smithsonian Magazine; university food science pages' },
  { id: 'poplet', topic: 'Popcorn', text: 'Good popcorn can puff up to about 40 times bigger than the kernel was.', check: 'Popcorn Board; food science texts on expansion volume', note: 'Expansion volume for quality popcorn is commonly given as about 40–50 times.' },
  { id: 'fluffkorn', topic: 'Popcorn', text: 'Scientists found very old corn in Peru, about 6,700 years old. People back then ate some of it as popcorn.', check: 'Smithsonian (2012); PNAS study by Grobman, Piperno and others', note: 'Corn remains date from about 6,700 to 3,000 years ago; the cobs show popping.' },

  // Leafcutter ants (Snipsy line)
  { id: 'snipsy', topic: 'Leafcutter ants', text: 'Leafcutter ants cut pieces of leaves and carry them home. A piece can be much heavier than the ant.', check: 'Smithsonian National Zoo; National Geographic' },
  { id: 'leafhauler', topic: 'Leafcutter ants', text: 'Leafcutter ants do not eat the leaves. They use them to grow a fungus garden, and they eat the fungus.', check: 'Smithsonian National Zoo; National Geographic' },
  { id: 'canopant', topic: 'Leafcutter ants', text: 'A big leafcutter ant colony can have millions of ants.', check: 'Smithsonian National Zoo; Britannica (leaf-cutting ant)' },

  // Hummingbirds (Hummet line)
  { id: 'hummet', topic: 'Hummingbirds', text: 'Hummingbirds can hover in one spot and even fly backward.', check: 'Smithsonian National Zoo; Audubon' },
  { id: 'whirrbird', topic: 'Hummingbirds', text: 'A hummingbird can beat its wings dozens of times every second. That is what makes the humming sound.', check: 'Smithsonian National Zoo; Audubon', note: 'Many species beat 50–80 times per second; "dozens" keeps it safe.' },
  { id: 'galehum', topic: 'Hummingbirds', text: 'The bee hummingbird is the smallest bird in the world. It is only about 5 to 6 centimeters long.', check: 'Guinness World Records; Britannica (bee hummingbird)' },

  // Wombats (Burrowby line)
  { id: 'burrowby', topic: 'Wombats', text: "A wombat's pouch opens toward its back legs, so dirt doesn't get in when it digs.", check: 'Australian Museum; National Geographic' },
  { id: 'burrowbat', topic: 'Wombats', text: 'Wombats are famous for making cube-shaped droppings. Scientists have studied how their bodies do it.', check: 'Soft Matter journal (Yang et al., 2021); National Geographic' },
  { id: 'bouldwom', topic: 'Wombats', text: 'Wombats dig long burrows with strong claws. Some burrows have many tunnels and rooms.', check: 'Australian Museum; Britannica (wombat)' },

  // Manatees (Lullakin line)
  { id: 'lullakin', topic: 'Manatees', text: 'Manatees are sometimes called sea cows. They eat lots of sea grass and other water plants.', check: 'NOAA Fisheries; US Fish and Wildlife Service' },
  { id: 'lullatee', topic: 'Manatees', text: "Elephants are among manatees' closest relatives on land.", check: 'Smithsonian Ocean; Save the Manatee Club' },
  { id: 'grandatee', topic: 'Manatees', text: 'Manatees breathe air. When resting, a manatee can stay underwater for up to about 20 minutes.', check: 'US National Park Service (Everglades, Fort Matanzas); SeaWorld', note: 'Active manatees surface much more often.' },

  // Tardigrades (Dewpud line)
  { id: 'dewpud', topic: 'Tardigrades', text: 'Tardigrades are tiny animals, most smaller than a millimeter. People call them water bears.', check: 'Smithsonian Magazine; Britannica (tardigrade)' },
  { id: 'mossbub', topic: 'Tardigrades', text: 'Many tardigrades live in the thin film of water on moss. Another nickname for them is moss piglets.', check: 'Smithsonian Magazine; Britannica (tardigrade)' },
  { id: 'hardigrade', topic: 'Tardigrades', text: 'When their home dries out, tardigrades can dry out too and curl up. They wake up when water comes back.', check: 'Britannica (cryptobiosis); NASA science features', note: 'The dried "tun" state is called cryptobiosis.' },

  // Ferns (Fiddlit line)
  { id: 'fiddlit', topic: 'Ferns', text: 'A new fern leaf starts curled up like the top of a violin. It is called a fiddlehead.', check: 'Royal Horticultural Society; Britannica (fern)' },
  { id: 'frondle', topic: 'Ferns', text: 'Ferns do not make flowers or seeds. They spread with tiny spores instead.', check: 'Royal Horticultural Society; Britannica (fern)' },
  { id: 'fernadore', topic: 'Ferns', text: 'Ferns grew on Earth long before the first dinosaurs.', check: 'Natural History Museum (London); Britannica (fern)', note: 'Ferns appear in the fossil record over 350 million years ago; dinosaurs about 230 million.' },

  // Glowworms (Gleamgrub line)
  { id: 'gleamgrub', topic: 'Glowworms', text: 'In New Zealand caves, glowworms light up the ceiling like a sky full of stars.', check: 'Department of Conservation (New Zealand); Te Ara Encyclopedia' },
  { id: 'silklight', topic: 'Glowworms', text: 'Glowworms hang sticky silk threads to catch flying insects. Their light helps draw the insects in.', check: 'Department of Conservation (New Zealand); Te Ara Encyclopedia' },
  { id: 'starwisp', topic: 'Glowworms', text: 'New Zealand glowworms are not really worms. They are the young of a small fly called a fungus gnat.', check: 'Department of Conservation (New Zealand); Te Ara Encyclopedia' },

  // Fluorite (Glintle line)
  { id: 'glintle', topic: 'Fluorite', text: 'Fluorite crystals often grow in the shape of cubes.', check: 'Minerals Education Coalition; Britannica (fluorite)' },
  { id: 'prismble', topic: 'Fluorite', text: 'Some fluorite glows under ultraviolet light. That kind of glow was named fluorescence after fluorite.', check: 'Smithsonian; Britannica (fluorescence)' },
  { id: 'fluorelle', topic: 'Fluorite', text: 'Fluorite comes in many colors, like purple, green, blue and yellow. One crystal can have stripes of different colors.', check: 'Minerals Education Coalition; Britannica (fluorite)' },

  // Lemons (Zestle line)
  { id: 'zestle', topic: 'Lemons', text: 'Lemons taste sour because they have lots of citric acid.', check: 'Britannica (citric acid); food science texts' },
  { id: 'zestwick', topic: 'Lemons', text: 'Push two different metals, like copper and zinc, into a lemon and connect them. It can make a tiny bit of electricity!', check: 'Science Buddies (lemon battery); university outreach pages', note: 'The metals react; the juice lets charges move. Very small current.' },
  { id: 'citrivolt', topic: 'Lemons', text: 'A lemon tree can have flowers, green lemons and yellow lemons all at the same time.', check: 'Royal Horticultural Society; citrus growing guides', note: 'Lemons ripen slowly, so new flowers and older fruit overlap.' },

  // Hailstones (Hailbit line)
  { id: 'hailbit', topic: 'Hail', text: 'Hail is ice that forms high up inside big storm clouds.', check: 'NOAA National Severe Storms Laboratory' },
  { id: 'hailroll', topic: 'Hail', text: 'Winds can carry a hailstone up and down inside a cloud. It can grow new layers of ice, a bit like an onion.', check: 'NOAA National Severe Storms Laboratory; Met Office', note: 'Layering explanation simplified for kids.' },
  { id: 'hailcastle', topic: 'Hail', text: 'Most hailstones are small, but the biggest ones ever found were bigger than a grapefruit.', check: 'NOAA National Weather Service (Vivian, South Dakota, 2010 record)' },

  // Snow leopards (Scarfcub line)
  { id: 'scarfcub', topic: 'Snow leopards', text: 'Snow leopards wrap their long, fluffy tails around themselves to keep warm.', check: 'WWF; Snow Leopard Trust' },
  { id: 'scarfpaw', topic: 'Snow leopards', text: 'Snow leopards have wide, furry paws that work like snowshoes.', check: 'WWF; Snow Leopard Trust' },
  { id: 'scarfspire', topic: 'Snow leopards', text: 'Snow leopards live high in the mountains of Central Asia.', check: 'WWF; Snow Leopard Trust' },

  // Capybaras (Bathlet line)
  { id: 'bathlet', topic: 'Capybaras', text: 'Capybaras are the biggest rodents in the world.', check: 'Smithsonian National Zoo; San Diego Zoo Wildlife Alliance' },
  { id: 'steambly', topic: 'Capybaras', text: 'Capybaras love water. They can stay underwater for up to about five minutes.', check: 'Zoo fact pages (e.g. Alexandria Zoo); San Diego Zoo Wildlife Alliance', note: 'Popular sources give "up to about five minutes".' },
  { id: 'thermabara', topic: 'Capybaras', text: "A capybara's eyes, ears and nose sit high on its head. It can see and breathe while almost all of it is underwater.", check: 'San Diego Zoo Wildlife Alliance; Smithsonian National Zoo' },

  // ---- 1.1 (checked 2026-10-13) --------------------------------------------------------------
  // Bombardier beetles (Puffbit line)
  { id: 'puffbit', topic: 'Bombardier beetles', text: 'When a bombardier beetle is scared, it mixes two chemicals inside its body and sprays out a hot, steamy puff.', check: 'Britannica (bombardier beetle); Eisner and Aneshansley, PNAS 1999' },
  { id: 'puffbeetle', topic: 'Bombardier beetles', text: "A bombardier beetle's spray is about as hot as boiling water, and the beetle can aim it.", check: 'Britannica (bombardier beetle); Eisner and Aneshansley, PNAS 1999' },
  { id: 'geyserguard', topic: 'Bombardier beetles', text: 'Its spray comes out in very fast pulses, hundreds of them every second.', check: 'Dean et al., Science 1990 (a biological pulse jet); Arndt et al., Science 2015' },

  // Mangroves (Stiltsprout line)
  { id: 'stiltsprout', topic: 'Mangroves', text: 'Many mangrove seeds start to sprout while they are still on the tree.', check: 'NOAA National Ocean Service; Smithsonian Ocean (mangroves)' },
  { id: 'wadewood', topic: 'Mangroves', text: 'Mangrove roots give young fish, crabs and shrimp a safe place to hide and grow.', check: 'NOAA Fisheries; Smithsonian Ocean (mangroves)' },
  { id: 'mangromere', topic: 'Mangroves', text: 'Mangroves can live in salty water. Some get rid of extra salt through their leaves.', check: 'Smithsonian Ocean (mangroves); NOAA National Ocean Service' },

  // Stick and leaf insects (Sprigling line)
  { id: 'sprigling', topic: 'Stick insects', text: 'Stick insects look so much like twigs that hungry birds often miss them.', check: 'Natural History Museum, London (stick insects); Smithsonian (phasmids)' },
  { id: 'twigstride', topic: 'Stick insects', text: 'Some stick insects sway back and forth, like a twig moving in the breeze.', check: 'Natural History Museum, London; Bian et al., Biology Letters 2016 (swaying)' },
  { id: 'leafwarden', topic: 'Leaf insects', text: 'Leaf insects have flat green bodies with lines that look like the veins of a leaf.', check: 'Natural History Museum, London (leaf insects); Smithsonian (phasmids)' },

  // Lithops (Lithlet line)
  { id: 'lithlet', topic: 'Lithops', text: 'Lithops are plants that look like pebbles, so hungry animals walk right past them.', check: 'Royal Botanic Gardens, Kew; Missouri Botanical Garden (Lithops)' },
  { id: 'lithopsy', topic: 'Lithops', text: 'Most of a lithops stays under the ground. Clear windows on top let sunlight in.', check: 'Royal Botanic Gardens, Kew; Missouri Botanical Garden (Lithops)' },
  { id: 'stonebloom', topic: 'Lithops', text: 'A lithops grows a flower from the gap between its two leaves, usually in autumn.', check: 'Missouri Botanical Garden (Lithops); Royal Botanic Gardens, Kew' },

  // Flying fish (Glidelet line)
  { id: 'glidelet', topic: 'Flying fish', text: 'Flying fish do not flap. They glide on big, stiff fins, like wings.', check: 'NOAA Fisheries; Smithsonian Ocean (flying fish)' },
  { id: 'skimfin', topic: 'Flying fish', text: 'A flying fish can glide a long way. Some glides are longer than two football fields.', check: 'National Geographic (flying fish); Smithsonian Ocean', note: 'Glides of up to about 200 m are reported; a football field is about 100 m.' },
  { id: 'galefin', topic: 'Flying fish', text: 'Flying fish leap out of the water to get away from bigger fish.', check: 'NOAA Fisheries; National Geographic (flying fish)' },

  // Springtails (Snowskip line)
  { id: 'snowskip', topic: 'Springtails', text: 'Springtails jump with a forked spring that folds under their body.', check: 'Natural History Museum, London (springtails); Penn State Extension' },
  { id: 'springfrost', topic: 'Springtails', text: 'Some springtails are called snow fleas. They hop around on snow on mild winter days.', check: 'Penn State Extension (snow fleas); US Forest Service' },
  { id: 'bounceberg', topic: 'Springtails', text: 'Springtails are tiny, but they can jump many times their own length.', check: 'Natural History Museum, London (springtails); Smithsonian' },

  // Elephantnose fish (Chinspark line)
  { id: 'chinspark', topic: 'Elephantnose fish', text: "The elephantnose fish's long trunk is really part of its chin.", check: 'Shedd Aquarium (elephantnose fish); von der Emde, Journal of Experimental Biology' },
  { id: 'zapsnoot', topic: 'Elephantnose fish', text: 'Elephantnose fish make a weak electric field and feel things around them with it.', check: 'Shedd Aquarium; von der Emde, Journal of Experimental Biology' },
  { id: 'voltrunk', topic: 'Elephantnose fish', text: 'They live in dark, muddy rivers in Africa, where their electric sense works better than eyes.', check: 'Shedd Aquarium; New England Aquarium (elephantnose fish)' },

  // Pyrosomes (Glimmerpod line)
  { id: 'glimmerpod', topic: 'Pyrosomes', text: 'A pyrosome looks like one creature, but it is made of thousands of tiny animals living together.', check: 'NOAA Ocean Exploration; Monterey Bay Aquarium Research Institute (pyrosomes)' },
  { id: 'lumitube', topic: 'Pyrosomes', text: 'Pyrosomes glow blue-green when they are touched.', check: 'NOAA Ocean Exploration; Monterey Bay Aquarium Research Institute' },
  { id: 'pyrolanterne', topic: 'Pyrosomes', text: 'A pyrosome is open at one end. It moves by pumping water out through its tube.', check: 'Monterey Bay Aquarium Research Institute; NOAA Ocean Exploration' },

  // Guardians
  { id: 'archwyn', topic: 'Natural arches', text: 'Natural rock arches form very slowly, as water, ice and wind wear away softer rock.', check: 'US National Park Service (Arches National Park)' },
  { id: 'tidecrest', topic: 'Tides', text: "Ocean tides happen mostly because the Moon's gravity pulls on Earth's water.", check: 'NOAA National Ocean Service; NASA' },
  { id: 'frostmantle', topic: 'Snowshoe hares', text: 'Snowshoe hares turn white in winter and brown in summer, so they blend in all year.', check: 'US Fish and Wildlife Service; National Wildlife Federation' },
  { id: 'aurelune', topic: 'Auroras', text: 'Auroras glow when tiny bits from the Sun crash into the air high above Earth, near the North and South Poles.', check: 'NASA; NOAA Space Weather Prediction Center' },
  { id: 'verdanyan', topic: 'Banyan trees', text: 'A banyan tree drops roots from its branches. They grow down into the ground and become new trunks.', check: 'Britannica (banyan); Royal Botanic Gardens, Kew' },
];

export const FACT_BY_ID: Record<string, Fact> = Object.fromEntries(FACTS.map(f => [f.id, f]));
