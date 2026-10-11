/**
 * SPACE FACTS — every real space fact in Space Sky lives in this one file so a parent or
 * teacher can review it. Facts are short and simply worded for ages 6-10.
 *
 * Each fact belongs to a `subject` (a Codex entry id). Facts show up in the Codex, in
 * "Did you know?" cards when you visit a place, and when you tap Professor Pip.
 *
 * Numbers are rounded for young readers. Counts that change as scientists discover more
 * (like how many moons a planet has) say "more than".
 * Made-up things (Zephyra, Zibbo, the Star Beacon) are NOT in this file; they live in codex.ts
 * and are clearly marked as part of the story.
 */
export interface Fact {
  id: string;
  subject: string;
  text: string;
}

const F = (subject: string, texts: string[]): Fact[] => texts.map((text, i) => ({ id: `${subject}_${i + 1}`, subject, text }));

export const FACTS: Fact[] = [
  ...F('sun', [
    'The Sun is a star. It is the closest star to Earth.',
    'The Sun is so big that more than one million Earths could fit inside it.',
    'Light from the Sun takes about 8 minutes to reach Earth.',
    'Never look straight at the Sun. It can hurt your eyes!',
  ]),
  ...F('mercury', [
    'Mercury is the closest planet to the Sun.',
    'Mercury is the smallest planet in our solar system.',
    'A year on Mercury is only 88 Earth days long.',
    'Mercury has no moons.',
    'Mercury has almost no air. It gets very hot in the day and very cold at night.',
  ]),
  ...F('venus', [
    'Venus is the hottest planet, even though Mercury is closer to the Sun.',
    'Venus spins so slowly that one spin takes longer than one trip around the Sun!',
    'Venus spins the opposite way from most planets.',
    'Venus has very thick air and clouds that trap heat, like a blanket.',
    'After the Moon, Venus is the brightest natural thing in our night sky.',
  ]),
  ...F('earth', [
    'Earth is the only planet we know of where living things live.',
    'Most of Earth is covered by water.',
    'Earth spins around once a day and goes around the Sun once a year.',
    'Earth has one moon.',
  ]),
  ...F('moon', [
    'The Moon goes around Earth about once a month.',
    'Twelve astronauts walked on the Moon between 1969 and 1972.',
    'The Moon has no air and no wind, so footprints there can last a very long time.',
    "The Moon's gravity is about one sixth of Earth's. You could jump much higher there!",
    'The Moon does not make its own light. It shines because sunlight bounces off it.',
  ]),
  ...F('mars', [
    'Mars looks red because its dust has a lot of rust in it.',
    'Mars has two small moons, Phobos and Deimos.',
    'A day on Mars is just a little longer than a day on Earth.',
    'Mars has ice at its north and south poles.',
    'Robot rovers drive around on Mars and send pictures back to Earth.',
  ]),
  ...F('phobos', [
    'Phobos is the bigger of the two moons of Mars.',
    'Phobos goes around Mars about three times every day.',
    'Phobos is lumpy, a bit like a potato.',
  ]),
  ...F('deimos', [
    'Deimos is the smaller of the two moons of Mars.',
    'Deimos is tiny. It is only about 12 kilometers across.',
  ]),
  ...F('valles', [
    'Valles Marineris is a huge canyon on Mars.',
    'Valles Marineris is much, much longer than the Grand Canyon on Earth.',
  ]),
  ...F('olympus', [
    'Olympus Mons on Mars is the tallest volcano we know of.',
    'Olympus Mons is about two and a half times as tall as Mount Everest.',
  ]),
  ...F('belt', [
    'The asteroid belt is between Mars and Jupiter.',
    'There are millions of asteroids in the belt.',
    'Real asteroids are very far apart. Spacecraft have flown through the belt without bumping into any!',
  ]),
  ...F('asteroid', [
    'Asteroids are rocky leftovers from when the planets were made.',
    'Some asteroids even have their own tiny moons!',
  ]),
  ...F('ceres', [
    'Ceres is the biggest object in the asteroid belt.',
    'Ceres is a dwarf planet, just like Pluto.',
    'Ceres has bright white spots made of salty minerals.',
  ]),
  ...F('vesta', [
    'Vesta is one of the biggest asteroids in the asteroid belt.',
    'Vesta has a giant crater near its south pole.',
  ]),
  ...F('comet', [
    'Comets are big balls of ice, dust and rock.',
    'When a comet gets close to the Sun, it grows a long glowing tail.',
    "A comet's tail always points away from the Sun.",
  ]),
  ...F('jupiter', [
    'Jupiter is the biggest planet in our solar system.',
    'More than 1,000 Earths could fit inside Jupiter.',
    'The Great Red Spot on Jupiter is a giant storm that is bigger than Earth.',
    'Jupiter spins faster than any other planet. A day there lasts about 10 hours.',
    'Jupiter has lots of moons. Scientists have found more than 95!',
    'Jupiter is a gas giant, so there is no solid ground to stand on.',
  ]),
  ...F('io', [
    'Io has more active volcanoes than any other place in the solar system.',
    'Some volcanoes on Io shoot gas and dust hundreds of kilometers up into space.',
  ]),
  ...F('europa', [
    'Europa is covered in a shell of ice.',
    "Scientists think a huge salty ocean is hidden under Europa's ice.",
    'Europa is a little smaller than our Moon.',
  ]),
  ...F('ganymede', [
    'Ganymede is the biggest moon in the solar system.',
    'Ganymede is even bigger than the planet Mercury!',
    'Ganymede is the only moon we know of with its own magnetic field.',
  ]),
  ...F('callisto', [
    'Callisto is one of the most cratered places in the solar system.',
    "Callisto is Jupiter's second-biggest moon.",
  ]),
  ...F('saturn', [
    "Saturn's rings are made of billions of pieces of ice and rock.",
    'Saturn is so light for its size that it would float in a giant bathtub of water!',
    'Saturn has more known moons than any other planet.',
    'Saturn is a gas giant and the second-biggest planet.',
  ]),
  ...F('rings', [
    'Jupiter, Saturn, Uranus and Neptune all have rings.',
    "Saturn's rings are the biggest and easiest to see.",
  ]),
  ...F('titan', [
    "Titan is Saturn's biggest moon.",
    'Titan has a thick orange haze in its sky.',
    'Titan has lakes and rivers, but they are filled with liquid methane, not water.',
    'Titan is the only moon with a thick atmosphere.',
  ]),
  ...F('enceladus', [
    'Enceladus is a small, icy moon of Saturn.',
    'Enceladus shoots fountains of water and ice out into space.',
    'Enceladus is one of the shiniest objects in the solar system.',
  ]),
  ...F('uranus', [
    'Uranus spins on its side, like a ball rolling around the Sun.',
    'Uranus is an ice giant. It looks blue-green because of a gas called methane.',
    'One year on Uranus lasts 84 Earth years.',
  ]),
  ...F('miranda', [
    'Miranda is a small moon of Uranus.',
    'Miranda has a giant cliff that may be the tallest cliff in the solar system.',
  ]),
  ...F('neptune', [
    'Neptune is the farthest planet from the Sun.',
    'Neptune has the fastest winds of any planet.',
    'One year on Neptune lasts about 165 Earth years.',
    'Scientists used math to figure out where Neptune was. Then they found it with a telescope!',
  ]),
  ...F('triton', [
    "Triton is Neptune's biggest moon.",
    'Triton goes around Neptune backwards, the opposite way that Neptune spins.',
    'Triton has geysers that shoot gas and dust high into its thin air.',
    'Triton is one of the coldest places scientists have ever measured.',
  ]),
  ...F('pluto', [
    'Pluto is a dwarf planet far beyond Neptune.',
    'Pluto has a big icy area shaped like a heart.',
    'Pluto is smaller than our Moon.',
    'A year on Pluto lasts about 248 Earth years.',
  ]),
  ...F('charon', [
    "Charon is Pluto's biggest moon.",
    'Charon is about half as wide as Pluto.',
  ]),
  ...F('galaxy', [
    'Our Sun is one of billions of stars in the Milky Way galaxy.',
    'On a very dark night you can see the Milky Way as a cloudy band of light.',
  ]),
  ...F('star', [
    'Stars are giant balls of hot, glowing gas.',
    'Stars seem to twinkle because the air around Earth is always moving.',
  ]),
  ...F('gravity', [
    'Gravity is the pull that keeps your feet on the ground.',
    'Gravity keeps the Moon going around Earth, and Earth going around the Sun.',
  ]),
  ...F('slingshot', [
    'Spacecraft can swing past a planet to speed up. This is called a gravity assist.',
    'The Voyager 2 spacecraft used gravity assists to visit Jupiter, Saturn, Uranus and Neptune.',
  ]),
  ...F('satellite', [
    'A satellite is something that goes around a planet.',
    'Thousands of satellites go around Earth. They help with weather, maps and phone calls.',
  ]),
  ...F('rover', [
    'Rovers are robot cars that explore other worlds.',
    'Several rovers have explored Mars.',
  ]),
  ...F('astronaut', [
    'Astronauts wear space suits to breathe. Suits also keep them from getting too hot or too cold.',
    'Astronauts on a space station see about 16 sunrises every day.',
  ]),
  ...F('rocket', [
    'Rockets push hot gas out of the bottom so they can go up.',
    'Rockets need lots of fuel to get into space. Earth\'s gravity pulls hard!',
  ]),
  ...F('wormhole', [
    'A wormhole is an idea from science. It would be a shortcut through space.',
    'No one has ever found a real wormhole. In our story, we pretend!',
  ]),
];

export const FACTS_BY_SUBJECT: Record<string, Fact[]> = {};
for (const f of FACTS) (FACTS_BY_SUBJECT[f.subject] ??= []).push(f);

export function factsFor(subject: string): Fact[] {
  return FACTS_BY_SUBJECT[subject] ?? [];
}
