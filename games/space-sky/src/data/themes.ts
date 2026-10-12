/**
 * Look of each exploration area: ground colors, sky and background shapes.
 * Purely visual. `skyPlanet` puts a real neighbor in the sky (Earth from the Moon, Jupiter from Europa...).
 */
export type SurfaceStyle = 'dust' | 'grass' | 'ice' | 'snow' | 'metal' | 'crystal' | 'sand' | 'moss';
export type FarStyle = 'craters' | 'mountains' | 'spires' | 'domes' | 'cliffs' | 'crystals' | 'clouds' | 'dunes' | 'towers' | 'volcano';

export interface Theme {
  id: string;
  ground: string;
  ground2: string;
  surface: string;
  surfaceStyle: SurfaceStyle;
  rock: string;
  rockStyle: 'stone' | 'metal' | 'ice' | 'crystal';
  platform: string;
  goo: string;
  sky: [string, string];
  stars: boolean;
  far: string;
  mid: string;
  farStyle: FarStyle;
  midStyle: FarStyle;
  skyPlanet?: { body: string; x: number; y: number; size: number };
  /** Bumbler look: robots on real worlds (no made-up life there!), critters on Zephyra. */
  bumbler: 'dustbot' | 'fuzzle';
  /** Decoration for 'T' tiles. */
  plant: 'spire' | 'antenna' | 'tree' | 'crystal' | 'icicle' | 'mushroom';
  haze?: string;
}

const T = (t: Theme) => t;

export const THEMES: Record<string, Theme> = {
  moon: T({ id: 'moon', ground: '#9a98a6', ground2: '#7e7c8c', surface: '#d6d4dc', surfaceStyle: 'dust', rock: '#b9c0d6', rockStyle: 'metal', platform: '#c9d2ee', goo: '#8fd9ff', sky: ['#05031a', '#1d1456'], stars: true, far: '#3a3860', mid: '#5a587a', farStyle: 'craters', midStyle: 'craters', skyPlanet: { body: 'earth', x: 0.78, y: 0.2, size: 150 }, bumbler: 'dustbot', plant: 'antenna' }),
  mercury: T({ id: 'mercury', ground: '#8f7f70', ground2: '#76685b', surface: '#b9a894', surfaceStyle: 'dust', rock: '#a89f94', rockStyle: 'stone', platform: '#c9d2ee', goo: '#ffb38a', sky: ['#05031a', '#2a1b3a'], stars: true, far: '#4a3b40', mid: '#6a5650', farStyle: 'craters', midStyle: 'cliffs', skyPlanet: { body: 'sun', x: 0.15, y: 0.18, size: 260 }, bumbler: 'dustbot', plant: 'spire' }),
  venus: T({ id: 'venus', ground: '#b5703a', ground2: '#94582c', surface: '#e8a94f', surfaceStyle: 'sand', rock: '#c9874a', rockStyle: 'stone', platform: '#e0b583', goo: '#ff9f43', sky: ['#e8a94f', '#ffe7a3'], stars: false, far: '#c47f4f', mid: '#a8603a', farStyle: 'volcano', midStyle: 'dunes', bumbler: 'dustbot', plant: 'spire', haze: '#ffcf80' }),
  mars: T({ id: 'mars', ground: '#b8502e', ground2: '#953f24', surface: '#e0784a', surfaceStyle: 'dust', rock: '#c9d2ee', rockStyle: 'metal', platform: '#d9c1a8', goo: '#8fd9ff', sky: ['#d98a6a', '#f6c9a0'], stars: false, far: '#a8503a', mid: '#c4603e', farStyle: 'mountains', midStyle: 'dunes', bumbler: 'dustbot', plant: 'spire' }),
  marscanyon: T({ id: 'marscanyon', ground: '#a8442a', ground2: '#843520', surface: '#d9683c', surfaceStyle: 'dust', rock: '#c45a36', rockStyle: 'stone', platform: '#d9c1a8', goo: '#8fd9ff', sky: ['#c97a5a', '#f2b48a'], stars: false, far: '#8a3a28', mid: '#a84a30', farStyle: 'cliffs', midStyle: 'cliffs', bumbler: 'dustbot', plant: 'spire' }),
  marsice: T({ id: 'marsice', ground: '#b8502e', ground2: '#953f24', surface: '#f4f7ff', surfaceStyle: 'snow', rock: '#bfefff', rockStyle: 'ice', platform: '#d9c1a8', goo: '#8fd9ff', sky: ['#c99a8a', '#f6d9c8'], stars: false, far: '#e8e0e6', mid: '#c4807a', farStyle: 'mountains', midStyle: 'dunes', bumbler: 'dustbot', plant: 'icicle' }),
  olympus: T({ id: 'olympus', ground: '#9c4a30', ground2: '#7d3a25', surface: '#c96a44', surfaceStyle: 'dust', rock: '#8a4a3a', rockStyle: 'stone', platform: '#d9c1a8', goo: '#8fd9ff', sky: ['#7a4a6a', '#e0a08a'], stars: true, far: '#6a3a40', mid: '#8a4a3a', farStyle: 'volcano', midStyle: 'mountains', bumbler: 'dustbot', plant: 'spire' }),
  ceres: T({ id: 'ceres', ground: '#6e6b66', ground2: '#57544f', surface: '#9a968e', surfaceStyle: 'dust', rock: '#c9d2ee', rockStyle: 'metal', platform: '#c9d2ee', goo: '#8fd9ff', sky: ['#05031a', '#1a1840'], stars: true, far: '#2e2c48', mid: '#46445e', farStyle: 'craters', midStyle: 'domes', bumbler: 'dustbot', plant: 'antenna' }),
  europa: T({ id: 'europa', ground: '#c9c2b4', ground2: '#a89f8f', surface: '#f4f7ff', surfaceStyle: 'ice', rock: '#bfefff', rockStyle: 'ice', platform: '#e6f7ff', goo: '#4dd4ff', sky: ['#05031a', '#22285a'], stars: true, far: '#5a6a9a', mid: '#8a9ac0', farStyle: 'spires', midStyle: 'dunes', skyPlanet: { body: 'jupiter', x: 0.72, y: 0.28, size: 330 }, bumbler: 'dustbot', plant: 'icicle' }),
  callisto: T({ id: 'callisto', ground: '#5a5047', ground2: '#463e37', surface: '#8a7d70', surfaceStyle: 'dust', rock: '#7a6d60', rockStyle: 'stone', platform: '#c9d2ee', goo: '#8fd9ff', sky: ['#05031a', '#1a1630'], stars: true, far: '#2e2836', mid: '#463e44', farStyle: 'craters', midStyle: 'craters', skyPlanet: { body: 'jupiter', x: 0.2, y: 0.25, size: 220 }, bumbler: 'dustbot', plant: 'spire' }),
  ganymede: T({ id: 'ganymede', ground: '#7a7068', ground2: '#615850', surface: '#b5ab9e', surfaceStyle: 'dust', rock: '#c9d2ee', rockStyle: 'metal', platform: '#c9d2ee', goo: '#8fd9ff', sky: ['#05031a', '#1d1a40'], stars: true, far: '#38344e', mid: '#56506a', farStyle: 'mountains', midStyle: 'domes', skyPlanet: { body: 'jupiter', x: 0.8, y: 0.22, size: 260 }, bumbler: 'dustbot', plant: 'antenna' }),
  titan: T({ id: 'titan', ground: '#6a4a2a', ground2: '#553a20', surface: '#a8783a', surfaceStyle: 'sand', rock: '#c9d2ee', rockStyle: 'metal', platform: '#d9b583', goo: '#4a3a6a', sky: ['#c47a2a', '#f2b45a'], stars: false, far: '#a8682a', mid: '#8a5a2a', farStyle: 'dunes', midStyle: 'dunes', bumbler: 'dustbot', plant: 'spire', haze: '#ffb84d' }),
  miranda: T({ id: 'miranda', ground: '#8f979c', ground2: '#737b80', surface: '#c5c9cc', surfaceStyle: 'ice', rock: '#a8b0b5', rockStyle: 'stone', platform: '#c9d2ee', goo: '#8fd9ff', sky: ['#05031a', '#1a2a40'], stars: true, far: '#3a4a5a', mid: '#5a6a78', farStyle: 'cliffs', midStyle: 'cliffs', skyPlanet: { body: 'uranus', x: 0.75, y: 0.25, size: 260 }, bumbler: 'dustbot', plant: 'icicle' }),
  triton: T({ id: 'triton', ground: '#c99f97', ground2: '#ad857d', surface: '#f6e6e2', surfaceStyle: 'snow', rock: '#e9d6cf', rockStyle: 'ice', platform: '#e6f7ff', goo: '#8fd9ff', sky: ['#05031a', '#16204a'], stars: true, far: '#4a4a7a', mid: '#7a6a8a', farStyle: 'spires', midStyle: 'dunes', skyPlanet: { body: 'neptune', x: 0.25, y: 0.24, size: 280 }, bumbler: 'dustbot', plant: 'icicle' }),
  pluto: T({ id: 'pluto', ground: '#a87d5e', ground2: '#8a654b', surface: '#fff3e6', surfaceStyle: 'snow', rock: '#d8b99a', rockStyle: 'stone', platform: '#e6f7ff', goo: '#8fd9ff', sky: ['#05031a', '#1a1630'], stars: true, far: '#4a3a4a', mid: '#7a6060', farStyle: 'mountains', midStyle: 'dunes', skyPlanet: { body: 'charon', x: 0.7, y: 0.22, size: 160 }, bumbler: 'dustbot', plant: 'icicle' }),
  earth: T({ id: 'earth', ground: '#5a8a3a', ground2: '#466e2c', surface: '#8cff66', surfaceStyle: 'grass', rock: '#c9d2ee', rockStyle: 'metal', platform: '#ffe066', goo: '#4dd4ff', sky: ['#4c9dff', '#c9f0ff'], stars: false, far: '#9fc3ff', mid: '#7fbf6a', farStyle: 'towers', midStyle: 'mountains', bumbler: 'dustbot', plant: 'tree' }),
  zephyra: T({ id: 'zephyra', ground: '#6b3fd4', ground2: '#55309f', surface: '#2de0c7', surfaceStyle: 'grass', rock: '#ff9ad9', rockStyle: 'crystal', platform: '#ffe066', goo: '#ff7ad9', sky: ['#7a5cff', '#ffb0ea'], stars: true, far: '#9b6bff', mid: '#c48aff', farStyle: 'towers', midStyle: 'crystals', skyPlanet: { body: 'tibble', x: 0.8, y: 0.2, size: 140 }, bumbler: 'fuzzle', plant: 'tree' }),
  zcrystal: T({ id: 'zcrystal', ground: '#3a2a7a', ground2: '#2b1d5e', surface: '#c89bff', surfaceStyle: 'crystal', rock: '#7a5cff', rockStyle: 'crystal', platform: '#ff9ad9', goo: '#4dd4ff', sky: ['#140d3a', '#3a2a7a'], stars: true, far: '#4a2a9a', mid: '#6b3fd4', farStyle: 'crystals', midStyle: 'crystals', bumbler: 'fuzzle', plant: 'crystal' }),
  zbubble: T({ id: 'zbubble', ground: '#2a9a8a', ground2: '#1f7a6c', surface: '#8cff66', surfaceStyle: 'moss', rock: '#ff9ad9', rockStyle: 'crystal', platform: '#ffe066', goo: '#4dd4ff', sky: ['#4dd4ff', '#c9fff4'], stars: false, far: '#5ac8c8', mid: '#3aa8a0', farStyle: 'domes', midStyle: 'dunes', skyPlanet: { body: 'zephyra', x: 0.85, y: 0.18, size: 150 }, bumbler: 'fuzzle', plant: 'mushroom' }),
  zsky: T({ id: 'zsky', ground: '#9b6bff', ground2: '#7a50d9', surface: '#ffffff', surfaceStyle: 'snow', rock: '#ffe066', rockStyle: 'crystal', platform: '#ffffff', goo: '#ff7ad9', sky: ['#4c7dff', '#ffd6f1'], stars: false, far: '#ffffff', mid: '#e6ecff', farStyle: 'clouds', midStyle: 'clouds', bumbler: 'fuzzle', plant: 'tree' }),
  zbeacon: T({ id: 'zbeacon', ground: '#4a3a8a', ground2: '#3a2a6a', surface: '#ffe066', surfaceStyle: 'metal', rock: '#ffc83d', rockStyle: 'metal', platform: '#ffe066', goo: '#ff7ad9', sky: ['#140d3a', '#6b3fd4'], stars: true, far: '#3a2a7a', mid: '#5a3aa0', farStyle: 'towers', midStyle: 'crystals', bumbler: 'fuzzle', plant: 'crystal' }),
};

export function theme(id: string): Theme {
  return THEMES[id] ?? THEMES.moon;
}
