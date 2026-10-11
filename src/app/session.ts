import { MISSIONS } from '../data/missions';
import { checkBadges } from '../systems/badges';
import { codexListener } from '../systems/codex';
import { dailyListener, ensureDailies } from '../systems/daily';
import { MissionEngine } from '../systems/missions';
import { stickerListener } from '../systems/stickers';
import { writeSlot } from '../systems/save/saveManager';
import type { SaveData } from '../systems/save/schema';
import { saveSettings } from '../systems/save/settings';
import { GameState } from '../systems/state';
import { S } from './services';

/** Extra systems that listen to game events (badges, dailies, codex) register here. */
export const sessionListeners: Array<(state: GameState) => void> = [];

/** Load a save slot into the live game. */
export function startSession(data: SaveData): void {
  S.state = new GameState(data);
  S.missions = new MissionEngine(S.state, MISSIONS);
  S.state.on((e) => S.missions.handle(e));
  S.state.on(codexListener);
  S.state.on(stickerListener);
  S.state.on(dailyListener);
  S.state.on((_e, st) => checkBadges(st));
  ensureDailies(S.state.data);
  for (const fn of sessionListeners) fn(S.state);
  if (!S.state.flag('introSeen')) {
    S.state.setFlag('introSeen');
    S.state.post({ kind: 'dialogue', id: 'intro' });
  }
  S.missions.autoStart();
  checkBadges(S.state);
  S.settings.lastSlot = data.slot;
  saveSettings(S.settings);
  saveNow();
}

export function hasSession(): boolean {
  return !!S.state && S.state.data.slot >= 0 && S.state.data.createdAt > 0;
}

export function saveNow(): void {
  if (!S.state || S.state.data.slot < 0) return;
  S.state.takeDirty();
  writeSlot(S.state.data);
}

let timer = 0;
/** Called every logic step: counts play time and autosaves every few seconds when something changed. */
export function tickSession(dt: number, playing: boolean): void {
  if (!S.state || S.state.data.slot < 0) return;
  if (playing) S.state.data.playTime += dt;
  timer += dt;
  if (timer >= 8) {
    timer = 0;
    if (S.state.takeDirty()) writeSlot(S.state.data);
  }
}
