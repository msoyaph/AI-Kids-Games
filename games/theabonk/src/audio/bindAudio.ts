import { ENEMIES } from '../config/enemies';
import { Ev } from '../core/events';
import type { Game } from '../game/Game';
import type { AudioEngine } from './Audio';

const IS_BOSS = ENEMIES.map((e) => e.behavior === 'boss');

/** Connect game events / modes / settings to the audio engine. */
export function bindAudio(game: Game, audio: AudioEngine): void {
  const applyVolumes = (): void => {
    const s = game.save.data.settings;
    audio.setVolumes(s.masterVolume, s.musicVolume, s.sfxVolume);
  };
  game.onSettings = applyVolumes;
  applyVolumes();

  game.onSound = (name) => {
    if (name === 'achievement') audio.achievement();
    else audio.ui(name);
  };

  game.onMode = (mode, w) => {
    switch (mode) {
      case 'menu':
        audio.setDuck(1);
        audio.music.setMuffled(false);
        audio.music.setMood('menu');
        break;
      case 'run':
        audio.setDuck(1);
        audio.music.setMuffled(false);
        audio.music.setMood(w && w.director.bossUid ? 'boss' : 'run');
        break;
      case 'paused':
        audio.setDuck(0.25);
        audio.music.setMuffled(true);
        break;
      case 'end':
        audio.music.setMuffled(false);
        audio.setDuck(1);
        audio.music.setMood('menu');
        audio.stinger(w?.state === 'won');
        break;
    }
  };

  game.onFrame = () => audio.music.update();

  game.onEvents = (w) => {
    const ev = w.events;
    const p = w.player;
    for (let n = 0; n < ev.count; n++) {
      const t = ev.type[n];
      switch (t) {
        case Ev.Sfx: {
          const dx = ev.get(n, 0) - p.x;
          const dz = ev.get(n, 2) - p.z;
          const d = Math.sqrt(dx * dx + dz * dz);
          const att = Math.max(0.15, 1 - d / 50);
          audio.sfx(ev.i[n], ev.get(n, 3) * att);
          break;
        }
        case Ev.Damage:
          audio.hit(ev.get(n, 4) === 1);
          break;
        case Ev.EnemyDie: {
          const boss = IS_BOSS[ev.get(n, 3)] ?? false;
          audio.kill(boss);
          if (boss) audio.music.setMood('run');
          break;
        }
        case Ev.Gem:
          audio.gem();
          break;
        case Ev.Coin:
          audio.coin();
          break;
        case Ev.LevelUp:
          audio.levelUp();
          break;
        case Ev.PlayerHurt:
          audio.hurt();
          break;
        case Ev.PlayerHeal:
          audio.heal();
          break;
        case Ev.Jump:
          audio.jump();
          break;
        case Ev.Land:
          audio.land(ev.get(n, 3));
          break;
        case Ev.Slide:
          audio.slide();
          break;
        case Ev.Chest:
          audio.chest();
          break;
        case Ev.Evolve:
        case Ev.Revive:
          audio.evolve();
          break;
        case Ev.Banner: {
          const id = ev.i[n];
          audio.banner(id >= 1 && id <= 3);
          break;
        }
        case Ev.BossSpawn:
          audio.music.setMood('boss');
          break;
        case Ev.ShrineBreak:
        case Ev.Buff:
          audio.chest();
          break;
        case Ev.Explosion: {
          const d = Math.hypot(ev.get(n, 0) - p.x, ev.get(n, 2) - p.z);
          if (d < 40) audio.sfx(9, Math.max(0.15, 1 - d / 40) * 0.6);
          break;
        }
        case Ev.EnemyShoot: {
          const d = Math.hypot(ev.get(n, 0) - p.x, ev.get(n, 2) - p.z);
          if (d < 30) audio.sfx(11, 1 - d / 30);
          break;
        }
      }
    }
    // music intensity follows the pressure on screen
    const pressure = Math.min(1, 0.15 + w.enemies.count / 160 + (w.time / 1200) * 0.35);
    audio.music.intensity += (pressure - audio.music.intensity) * 0.02;
    if (p.alive && p.hp / p.stats.maxHp < 0.25 && w.state === 'playing') audio.heartbeat();
  };
}
