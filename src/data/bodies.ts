import type { PlanetLook } from '../gfx/art/planets';

/**
 * Planets, moons and places. Real bodies use real names and accurate facts (see facts.ts).
 * Zephyra and its moons are made up for the story and are marked `real: false`.
 *
 * Flight layout is NOT to scale: sizes and distances are squished so trips are fun.
 */

export type SystemId =
  | 'earth' | 'mercury' | 'venus' | 'mars' | 'belt' | 'jupiter' | 'saturn' | 'uranus' | 'neptune' | 'pluto' | 'wormhole' | 'zephyra';

export type BodyKind = 'star' | 'planet' | 'dwarf' | 'moon' | 'alien-world' | 'wormhole';

export interface BodyDef {
  id: string;
  name: string;
  system: SystemId;
  kind: BodyKind;
  real: boolean;
  look: PlanetLook;
  /** Radius in the flight scene (world units). */
  radius: number;
  /** Position inside its system (system's main body at 0,0). */
  offset: [number, number];
  landable: boolean;
  /** Exploration areas (level ids). First is the default. */
  areas?: string[];
  /** Name of the refuel base here (Tuggy tows you to the nearest base). */
  base?: string;
  /** Real surface gravity compared to Earth (1 = Earth). Used for the codex and to tune jumping. */
  gravityG: number;
  /** Why you can't land here (kid-friendly, true). */
  noLand?: string;
  /** Gravity strength in flight (0 = none). */
  pull: number;
}

export interface SystemDef {
  id: SystemId;
  name: string;
  /** Order outward from the Sun, used for trip length. */
  order: number;
  /** Chapter in which this system appears on the star map. */
  chapter: number;
  /** Star map position (logical units on a 2400 x 720 map). */
  map: [number, number];
  main: string;
  bodies: string[];
  /** Background nebula tint. */
  nebula: string[];
  /** Hazard mix for trips that end here. */
  asteroids: number;
  comets: number;
  /** Gentle push of the space wind (Neptune) in units/s^2. */
  wind?: number;
}

const L = (look: PlanetLook) => look;

export const BODIES: BodyDef[] = [
  { id: 'sun', name: 'The Sun', system: 'mercury', kind: 'star', real: true, radius: 0, offset: [0, 0], landable: false, gravityG: 28, pull: 0, noLand: 'The Sun is a super hot ball of glowing gas. No landing!', look: L({ style: 'sun', base: '#ffd23f', second: '#ff9f1c', glow: '#ffb703', seed: 1 }) },
  { id: 'earth', name: 'Earth', system: 'earth', kind: 'planet', real: true, radius: 230, offset: [0, 0], landable: true, base: 'Space Sky Academy', gravityG: 1, pull: 1, look: L({ style: 'earth', base: '#3a8dff', second: '#36c46b', glow: '#7fd3ff', polarCaps: true, seed: 3 }) },
  { id: 'moon', name: 'The Moon', system: 'earth', kind: 'moon', real: true, radius: 80, offset: [1100, -420], landable: true, areas: ['moon_base'], base: 'Moon Base', gravityG: 0.17, pull: 0.5, look: L({ style: 'cratered', base: '#cfccc6', second: '#9c978f', seed: 4 }) },
  { id: 'mercury', name: 'Mercury', system: 'mercury', kind: 'planet', real: true, radius: 110, offset: [0, 0], landable: true, areas: ['mercury_craters'], gravityG: 0.38, pull: 0.7, look: L({ style: 'cratered', base: '#a89f94', second: '#7d746b', seed: 5 }) },
  { id: 'venus', name: 'Venus', system: 'venus', kind: 'planet', real: true, radius: 200, offset: [0, 0], landable: true, areas: ['venus_surface'], gravityG: 0.9, pull: 0.9, look: L({ style: 'cloudy', base: '#f2c66d', second: '#e8a94f', third: '#fff0b8', glow: '#ffe7a3', seed: 6 }) },
  { id: 'mars', name: 'Mars', system: 'mars', kind: 'planet', real: true, radius: 170, offset: [0, 0], landable: true, areas: ['mars_landing', 'mars_canyon', 'mars_icecap', 'mars_olympus'], base: 'Mars Outpost', gravityG: 0.38, pull: 0.8, look: L({ style: 'desert', base: '#e0623a', second: '#a8402a', glow: '#ff9b7a', polarCaps: true, seed: 7 }) },
  { id: 'phobos', name: 'Phobos', system: 'mars', kind: 'moon', real: true, radius: 34, offset: [520, -260], landable: false, gravityG: 0.0006, pull: 0, noLand: 'Phobos is tiny. Let\'s scan it from up here!', look: L({ style: 'rocky', base: '#8a7b6e', second: '#6e6156', seed: 8 }) },
  { id: 'deimos', name: 'Deimos', system: 'mars', kind: 'moon', real: true, radius: 26, offset: [-640, 330], landable: false, gravityG: 0.0003, pull: 0, noLand: 'Deimos is very small. Let\'s scan it!', look: L({ style: 'rocky', base: '#a39686', second: '#857869', seed: 9 }) },
  { id: 'ceres', name: 'Ceres', system: 'belt', kind: 'dwarf', real: true, radius: 90, offset: [0, 0], landable: true, areas: ['ceres_station'], base: 'Ceres Station', gravityG: 0.03, pull: 0.4, look: L({ style: 'cratered', base: '#8f8c87', second: '#6e6b66', spot: { color: '#f4f7ff', x: 0.2, y: -0.1, w: 0.1, h: 0.07 }, seed: 10 }) },
  { id: 'vesta', name: 'Vesta', system: 'belt', kind: 'moon', real: true, radius: 50, offset: [900, 380], landable: false, gravityG: 0.025, pull: 0, noLand: 'Vesta is a big asteroid. We can scan it from here.', look: L({ style: 'rocky', base: '#b0a493', second: '#8a7f70', seed: 11 }) },
  { id: 'jupiter', name: 'Jupiter', system: 'jupiter', kind: 'planet', real: true, radius: 440, offset: [0, 0], landable: false, gravityG: 2.5, pull: 1.4, noLand: 'Jupiter is a gas giant. There is no solid ground to land on!', look: L({ style: 'gas', base: '#e3b98a', second: '#c47f4f', third: '#f6e3c8', glow: '#ffd9b0', spot: { color: '#d9573b', x: 0.35, y: 0.32, w: 0.24, h: 0.13 }, seed: 12 }) },
  { id: 'io', name: 'Io', system: 'jupiter', kind: 'moon', real: true, radius: 66, offset: [-900, -520], landable: false, gravityG: 0.18, pull: 0.3, noLand: 'Io has lots of volcanoes. Too hot! Let\'s scan it from orbit.', look: L({ style: 'lava', base: '#f2dd6b', second: '#e08a2f', seed: 13 }) },
  { id: 'europa', name: 'Europa', system: 'jupiter', kind: 'moon', real: true, radius: 62, offset: [1000, -640], landable: true, areas: ['europa_ice'], gravityG: 0.13, pull: 0.3, look: L({ style: 'icy-moon', base: '#efe4d2', second: '#b5704a', seed: 14 }) },
  { id: 'ganymede', name: 'Ganymede', system: 'jupiter', kind: 'moon', real: true, radius: 92, offset: [1250, 520], landable: true, areas: ['ganymede_caves'], base: 'Ganymede Station', gravityG: 0.15, pull: 0.35, look: L({ style: 'rocky', base: '#9a8f84', second: '#c9bfb2', seed: 15 }) },
  { id: 'callisto', name: 'Callisto', system: 'jupiter', kind: 'moon', real: true, radius: 86, offset: [-1100, 700], landable: true, areas: ['callisto_crash'], gravityG: 0.13, pull: 0.35, look: L({ style: 'cratered', base: '#6e6458', second: '#5a5047', seed: 16 }) },
  { id: 'saturn', name: 'Saturn', system: 'saturn', kind: 'planet', real: true, radius: 300, offset: [0, 0], landable: false, gravityG: 1.07, pull: 1.1, noLand: 'Saturn is a gas giant. No solid ground here!', look: L({ style: 'gas', base: '#ecd59f', second: '#d4b57a', third: '#f7ebc8', glow: '#ffeec2', rings: { color: '#e8d3a2', tilt: 0.3, width: 1 }, seed: 17 }) },
  { id: 'titan', name: 'Titan', system: 'saturn', kind: 'moon', real: true, radius: 96, offset: [1300, -560], landable: true, areas: ['titan_lakes'], base: 'Titan Station', gravityG: 0.14, pull: 0.35, look: L({ style: 'haze', base: '#e8a23a', second: '#d98a2b', glow: '#ffc46b', seed: 18 }) },
  { id: 'enceladus', name: 'Enceladus', system: 'saturn', kind: 'moon', real: true, radius: 44, offset: [-1000, -560], landable: false, gravityG: 0.011, pull: 0, noLand: 'Enceladus shoots icy fountains! Let\'s scan them from a safe spot.', look: L({ style: 'icy-moon', base: '#f4fbff', second: '#a8d8f0', glow: '#e6f7ff', seed: 19 }) },
  { id: 'uranus', name: 'Uranus', system: 'uranus', kind: 'planet', real: true, radius: 250, offset: [0, 0], landable: false, gravityG: 0.9, pull: 1, noLand: 'Uranus is an ice giant made of gas and slush. No place to land!', look: L({ style: 'ice', base: '#9fe7e6', second: '#c2f5f2', glow: '#c8fffb', rings: { color: '#bfe9ef', tilt: 0.85, width: 0.4 }, seed: 20 }) },
  { id: 'miranda', name: 'Miranda', system: 'uranus', kind: 'moon', real: true, radius: 58, offset: [950, -480], landable: true, areas: ['miranda_cliffs'], gravityG: 0.008, pull: 0.25, look: L({ style: 'icy-moon', base: '#c5c9cc', second: '#8f979c', seed: 21 }) },
  { id: 'neptune', name: 'Neptune', system: 'neptune', kind: 'planet', real: true, radius: 240, offset: [0, 0], landable: false, gravityG: 1.14, pull: 1, noLand: 'Neptune is an ice giant with super fast winds. No ground to land on!', look: L({ style: 'ice', base: '#3d6df2', second: '#5b8cff', third: '#2a4bc4', glow: '#7fa6ff', spot: { color: '#22348f', x: -0.3, y: 0.25, w: 0.2, h: 0.1 }, seed: 22 }) },
  { id: 'triton', name: 'Triton', system: 'neptune', kind: 'moon', real: true, radius: 74, offset: [-1000, 560], landable: true, areas: ['triton_geysers'], base: 'Triton Outpost', gravityG: 0.08, pull: 0.3, look: L({ style: 'icy-moon', base: '#e9d6cf', second: '#c99f97', seed: 23 }) },
  { id: 'pluto', name: 'Pluto', system: 'pluto', kind: 'dwarf', real: true, radius: 80, offset: [0, 0], landable: true, areas: ['pluto_heart'], gravityG: 0.06, pull: 0.35, look: L({ style: 'dwarf', base: '#d8b99a', second: '#a87d5e', heart: true, seed: 24 }) },
  { id: 'charon', name: 'Charon', system: 'pluto', kind: 'moon', real: true, radius: 44, offset: [520, -300], landable: false, gravityG: 0.03, pull: 0, noLand: 'Charon is Pluto\'s moon partner. Let\'s scan it!', look: L({ style: 'rocky', base: '#9a9590', second: '#7d6b62', seed: 25 }) },
  { id: 'wormhole', name: 'The Wormhole', system: 'wormhole', kind: 'wormhole', real: false, radius: 160, offset: [0, 0], landable: false, gravityG: 0, pull: 0.6, noLand: 'Fly right into the middle of the swirl!', look: L({ style: 'alien', base: '#6b3fd4', second: '#ff7ad9', seed: 26 }) },
  { id: 'zephyra', name: 'Zephyra', system: 'zephyra', kind: 'alien-world', real: false, radius: 230, offset: [0, 0], landable: true, areas: ['zephyra_village', 'zephyra_crystal', 'zephyra_bubble', 'zephyra_sky', 'zephyra_beacon'], base: 'Zephyra Village', gravityG: 0.6, pull: 1, look: L({ style: 'alien', base: '#7a5cff', second: '#2de0c7', third: '#fff7b3', glow: '#c89bff', rings: { color: '#ff9ad9', tilt: 0.3, width: 0.7 }, seed: 27 }) },
  { id: 'tibble', name: 'Tibble', system: 'zephyra', kind: 'moon', real: false, radius: 50, offset: [900, -480], landable: false, gravityG: 0.1, pull: 0, noLand: 'Tibble is a bouncy little moon. Let\'s just wave hello!', look: L({ style: 'alien', base: '#ff7ad9', second: '#ffe066', third: '#ffffff', seed: 28 }) },
  { id: 'tobble', name: 'Tobble', system: 'zephyra', kind: 'moon', real: false, radius: 40, offset: [-860, 520], landable: false, gravityG: 0.1, pull: 0, noLand: 'Tobble is a tiny sleepy moon. Shh!', look: L({ style: 'alien', base: '#2de0c7', second: '#4c7dff', third: '#ffffff', seed: 29 }) },
];

export const BODY_BY_ID: Record<string, BodyDef> = Object.fromEntries(BODIES.map((b) => [b.id, b]));

export const SYSTEMS: SystemDef[] = [
  { id: 'mercury', name: 'Mercury', order: 0, chapter: 2, map: [250, 400], main: 'mercury', bodies: ['mercury'], nebula: ['#ff9f43', '#ff5d73'], asteroids: 0.2, comets: 0.3 },
  { id: 'venus', name: 'Venus', order: 1, chapter: 2, map: [420, 250], main: 'venus', bodies: ['venus'], nebula: ['#ffc83d', '#ff7ad9'], asteroids: 0.2, comets: 0.3 },
  { id: 'earth', name: 'Earth', order: 2, chapter: 1, map: [600, 460], main: 'earth', bodies: ['earth', 'moon'], nebula: ['#4c7dff', '#9b6bff'], asteroids: 0.25, comets: 0.2 },
  { id: 'mars', name: 'Mars', order: 3, chapter: 2, map: [780, 280], main: 'mars', bodies: ['mars', 'phobos', 'deimos'], nebula: ['#ff5d73', '#9b6bff'], asteroids: 0.3, comets: 0.3 },
  { id: 'belt', name: 'Asteroid Belt', order: 4, chapter: 3, map: [960, 470], main: 'ceres', bodies: ['ceres', 'vesta'], nebula: ['#9aa4c7', '#4c7dff'], asteroids: 1, comets: 0.4 },
  { id: 'jupiter', name: 'Jupiter', order: 5, chapter: 3, map: [1170, 300], main: 'jupiter', bodies: ['jupiter', 'io', 'europa', 'ganymede', 'callisto'], nebula: ['#ff9f43', '#ff5d73'], asteroids: 0.3, comets: 0.4 },
  { id: 'saturn', name: 'Saturn', order: 6, chapter: 4, map: [1400, 470], main: 'saturn', bodies: ['saturn', 'titan', 'enceladus'], nebula: ['#ffe066', '#9b6bff'], asteroids: 0.35, comets: 0.5 },
  { id: 'uranus', name: 'Uranus', order: 7, chapter: 4, map: [1610, 270], main: 'uranus', bodies: ['uranus', 'miranda'], nebula: ['#2de0c7', '#4c7dff'], asteroids: 0.3, comets: 0.5 },
  { id: 'neptune', name: 'Neptune', order: 8, chapter: 4, map: [1810, 480], main: 'neptune', bodies: ['neptune', 'triton'], nebula: ['#4c7dff', '#6b3fd4'], asteroids: 0.3, comets: 0.5, wind: 40 },
  { id: 'pluto', name: 'Pluto', order: 9, chapter: 4, map: [1990, 300], main: 'pluto', bodies: ['pluto', 'charon'], nebula: ['#ffb38a', '#6b3fd4'], asteroids: 0.4, comets: 0.4 },
  { id: 'wormhole', name: 'The Wormhole', order: 10, chapter: 5, map: [2160, 500], main: 'wormhole', bodies: ['wormhole'], nebula: ['#ff7ad9', '#6b3fd4', '#2de0c7'], asteroids: 0.1, comets: 0.8 },
  { id: 'zephyra', name: 'Zephyra', order: 11, chapter: 5, map: [2300, 260], main: 'zephyra', bodies: ['zephyra', 'tibble', 'tobble'], nebula: ['#ff7ad9', '#2de0c7', '#ffe066'], asteroids: 0.2, comets: 0.6 },
];

export const SYSTEM_BY_ID: Record<SystemId, SystemDef> = Object.fromEntries(SYSTEMS.map((s) => [s.id, s])) as Record<SystemId, SystemDef>;

export function systemOf(bodyId: string): SystemDef {
  return SYSTEM_BY_ID[BODY_BY_ID[bodyId]?.system ?? 'earth'];
}

/** The body that holds a level (exploration area). */
export function bodyForArea(areaId: string): BodyDef | undefined {
  return BODIES.find((b) => b.areas?.includes(areaId));
}
