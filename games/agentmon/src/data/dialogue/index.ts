/** Every story script, by id. Talking to someone, a trigger tile or a sign runs one. */
import type { Script } from '../../core/script';
import { CH0 } from './ch0';
import { CH2 } from './ch2';
import { CH3 } from './ch3';
import { CH5 } from './ch5';
import { CH7 } from './ch7';
import { CH9 } from './ch9';
import { CH11 } from './ch11';
import { POST } from './post';
import { SQ } from './sq';

export const SCRIPTS: Record<string, Script> = { ...CH0, ...CH2, ...CH3, ...CH5, ...CH7, ...CH9, ...CH11, ...POST, ...SQ };
