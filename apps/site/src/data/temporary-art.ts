/**
 * TEMPORARY ART (release 2.1.0 work in progress).
 *
 * These games changed a lot (or are new), so their drawn covers no longer match them. Until they are
 * redrawn in the site's consistent style (scripts/art/), the site shows the game's own screenshots
 * instead: a still cover, no idle cover layers, and these stills in the gallery. Files live in
 * public/media/<slug>/temp/. Each one also has a gameplay loop recorded from its current build
 * (`loop`, release 2.10.0: scripts/capture/<slug>.ts with `gallery: false`, so only the loop and its
 * poster are written). Delete a game's entry (and its temp folder) as soon as its new art is in.
 */
export interface TemporaryArt {
  /** Where the screenshots came from, for whoever replaces them. */
  source: string;
  /** Gallery stills: temp/shot-N(-thumb).{avif,webp,jpg}; the cover is temp/cover.webp. */
  shots: string[];
  /** A gameplay loop from the current build is in public/media/<slug>/ (loop.*, poster.*; media.json). */
  loop?: true;
}

export const temporaryArt: Record<string,TemporaryArt> = {
  'cliff-valley': {
    loop: true,
    source: 'games/cliff-valley/docs/screenshots (the game\'s ?scene= capture routes)',
    shots: [
      'Harvest time on Clover Farm, with sunflowers and rows of crops',
      'The Starlight Night festival in the snowy town square',
      'Clover Farm in autumn',
      'Snow on the farm in winter',
      'Floor 24 of the mine, lit by glowing crystals',
      'Fishing off the pier at sunset'
    ]
  },
  'vanex-defense': {
    loop: true,
    source: 'games/vanex-defense/docs/screenshots/after (the 2.0 restyle)',
    shots: [
      'Building a maze of elemental towers in the frozen world of Frostspire Peaks',
      'Towers guard a sky lane in the Skyforge Ruins',
      'The Prism Matriarch boss marches toward the crystal citadel'
    ]
  },
  'space-sky': {
    loop: true,
    source: 'Space Sky\'s own 3D screenshots (npm run shots in games/space-sky)',
    shots: [
      'Landing the rocket softly on the Moon',
      'The Space Sky Academy, a dollhouse you can look into',
      'Choosing where to fly next on the Star Map',
      'Exploring the icy surface of Europa',
      'Exploring the red cliffs of Mars'
    ]
  },
  'calex-cart': {
    loop: true,
    source: 'games/calex-cart/docs/upgrade/after (the 0.2 upgrade)',
    shots: [
      'Racing through Lantern Village at night in the Frost Cup',
      'Avalanche Peak, a snowy mountain track in the Frost Cup',
      'Crystal Cavern, an icy track in the Frost Cup',
      'Neon Nightway, a glowing city track',
      'Seashell Boardwalk by the sea'
    ]
  }
};
