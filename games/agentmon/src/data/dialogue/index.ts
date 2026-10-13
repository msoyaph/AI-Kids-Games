/** Every story script, by id. Talking to someone, a trigger tile or a sign runs one. */
import type { Script } from '../../core/script';
import { CH0 } from './ch0';

export const SCRIPTS: Record<string, Script> = { ...CH0 };
