/**
 * What's open when: tools, zone kinds, road kinds and catalogue items open chapter by chapter
 * (Creative mode has everything). Data in one place, so the story, the HUD and the bot agree.
 *
 * Pure: no DOM, no Date, no Math.random.
 */
import { THING } from '../data/things';
import type { ToolIdSim } from './tools';
import type { Town } from './state';

/** The chapter each tool opens in. */
export const TOOL_CHAPTER: Record<ToolIdSim, number> = { look: 0, road: 0, zones: 0, park: 1, cityhall: 0, build: 1, services: 2, maps: 2, transit: 3 };
/** The chapter each zone kind opens in (1 home, 2 shop, 3 work, 4 park). */
export const ZONE_CHAPTER: Record<number, number> = { 1: 0, 2: 0, 3: 2, 4: 1 };
export const LANE_CHAPTER = { bike: 5, tram: 7 } as const;

export const chapterOf = (town: Town) => (town.mode === 'creative' ? 99 : town.story.chapter);

export const toolOpen = (town: Town, tool: ToolIdSim) => chapterOf(town) >= TOOL_CHAPTER[tool];
export const zoneOpen = (town: Town, zone: number) => chapterOf(town) >= (ZONE_CHAPTER[zone] ?? 0);
export const laneOpen = (town: Town, lane: keyof typeof LANE_CHAPTER) => chapterOf(town) >= LANE_CHAPTER[lane];
export const thingOpen = (town: Town, def: string) => chapterOf(town) >= (THING[def]?.chapter ?? 0);
