/**
 * Sim entry point: registers all content and systems (order matters for overnight
 * processing), then re-exports the Sim. Always import the Sim from here.
 */
import '../data';
import './economy';
import './farming';
import './shops';
import './npcs';
import './friendship';
import './mail';
import './quests';
import './animals';
import './buildings';
import './mine';
import './critters';
import './forage';
export { Sim } from './sim';
export type { SavedLoc, SimEvents } from './sim';
