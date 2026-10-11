import { S } from '../app/services';
import { BODY_BY_ID } from '../data/bodies';
import type { LandingScene } from './LandingScene';

/** What happens after a landing. Replaced by the mission director at boot. */
export const landingHooks = {
  onStart: (_scene: LandingScene) => {},
  onDone: (body: string, _perfect: boolean) => {
    S.state.data.location = body;
    if (body === 'earth') {
      S.state.emit({ type: 'home' });
      void S.game.go('hub');
      return;
    }
    const area = BODY_BY_ID[body]?.areas?.[0];
    if (area) void S.game.go('explore', { area });
    else void S.game.go('map');
  },
};
