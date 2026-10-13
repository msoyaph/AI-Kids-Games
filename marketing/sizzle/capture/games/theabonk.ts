// TheaBonk takes for the reel and its trailer: the site's own capture route
// (apps/site/scripts/capture/theabonk.ts, the live v2 build), recorded with the game's sound
// effects on and its music off.
import { scenario as site } from '../../../../apps/site/scripts/capture/theabonk';
import type { Scenario } from '../../../../apps/site/scripts/capture/types';

const settings = { masterVolume: 0.8, musicVolume: 0, sfxVolume: 0.8, sensitivity: 1, invertY: false, quality: 'high', showFps: false, screenShake: false, damageNumbers: false, mouseMode: 'drag' };
const storage = { 'theabonk.save': JSON.stringify({ version: 1, settings }) };

export const scenario: Scenario = {
  ...site,
  takes: ['horde', 'ring-wave', 'level-up', 'rimewood', 'boss'].map(id => ({ ...site.takes.find(take => take.id === id)!, storage, audio: true }))
};
