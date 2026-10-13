/** Every map in Sunreach, by id. */
import type { MapDef } from '../../core/world/map';
import * as brightmoor from './brightmoor';
import * as coast from './coast';
import * as desert from './desert';
import * as forest from './forest';
import * as frost from './frost';
import * as meadow from './meadow';
import * as mountain from './mountain';
import * as postgame from './postgame';
import * as sky from './sky';

const isMap = (v: unknown): v is MapDef => !!v && typeof v === 'object' && 'rows' in v && 'id' in v;
const LIST: MapDef[] = [brightmoor, meadow, coast, forest, mountain, desert, frost, sky, postgame].flatMap(m => Object.values(m).filter(isMap));

export const MAPS: Record<string, MapDef> = Object.fromEntries(LIST.map(m => [m.id, m]));

/** Where a new adventure starts (in Gran's house). */
export const START = { map: 'home', x: 3, y: 4, dir: 2 as const };
