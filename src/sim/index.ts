/**
 * Sim entry point: registers all content and systems (order matters for overnight
 * processing), then re-exports the Sim. Always import the Sim from here.
 */
import '../data';
import './economy';
import './farming';
import './shops';
export { Sim } from './sim';
export type { SavedLoc, SimEvents } from './sim';
