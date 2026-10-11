import { DirectionalLight, HemisphereLight, Vector3 } from 'three';
import { Scene3D } from '../app/Scene3D';
import { S } from '../app/services';
import { CHARACTERS } from '../data/characters';
import { defaultProfile } from '../systems/save/schema';
import { Character, type Anim, type Mood } from '../r3/models/characters';
import { addSpaceSky } from '../r3/space/backdrop';
import { SKIES, type SpaceSky } from '../r3/space/sky';
import { h } from '../ui/dom';

/** Visual review page (?chars[&anim=wave&mood=wow&talk]): the whole cast in a row. */
export class CharGalleryScene extends Scene3D {
  private cast: Character[] = [];
  private labels: HTMLElement[] = [];
  private sky: SpaceSky;
  private readonly tmp = new Vector3();

  constructor() {
    super('chars');
    this.sky = addSpaceSky(this.world, SKIES.menu);
    this.world.environmentIntensity = 1;
    const key = new DirectionalLight('#fff4e0', 2.4);
    key.position.set(3, 5, 6);
    const rim = new DirectionalLight('#9fb4ff', 1.5);
    rim.position.set(-4, 3, -5);
    this.world.add(key, rim, new HemisphereLight('#c9d2ff', '#2a1850', 0.7));
    const q = new URLSearchParams(location.search);
    const anim = (q.get('anim') ?? 'idle') as Anim;
    const mood = (q.get('mood') ?? 'happy') as Mood;
    const ids = (q.get('ids') ?? CHARACTERS.map((c) => c.id).join(',')).split(',');
    const profiles = [defaultProfile(), { ...defaultProfile(), suit: '#ff7ad9', accent: '#9b6bff', helmet: 'ears', hairStyle: 'bun', skin: '#8d5a3b', hair: '#1a1a2e', face: 'grin', outfit: 'cape' }];
    const cols = Math.min(9, ids.length);
    ids.forEach((id, i) => {
      const c = new Character(id, id === 'player' ? profiles[0] : undefined);
      if (id === 'player' && ids.length > 1) {
        const c2 = new Character('player', profiles[1]);
        this.place(c2, ids.length, cols, anim, mood);
      }
      this.place(c, i, cols, anim, mood);
      void S;
    });
    for (const c of this.cast) c.talk(q.has('talk'));
    this.camera.fov = 30;
    this.camera.position.set(0, 1.2, ids.length > 9 ? 16 : 9);
    this.camera.lookAt(0, ids.length > 9 ? -0.2 : 0.5, 0);
  }

  private place(c: Character, i: number, cols: number, anim: Anim, mood: Mood): void {
    const col = i % cols;
    const row = Math.floor(i / cols);
    c.group.position.set((col - (cols - 1) / 2) * 1.25, -row * 1.7, 0);
    c.setAnim(anim);
    c.mood = mood;
    this.world.add(c.group);
    this.cast.push(c);
    const label = h('div', { class: 'gallery-label' }, c.id);
    this.labels.push(label);
    this.ui.append(label);
  }

  override render(): void {
    this.sky.update(this.time);
    const m = S.game.metrics;
    this.cast.forEach((c, i) => {
      c.update(1 / 60);
      this.tmp.copy(c.group.position);
      this.tmp.y -= 0.12;
      this.tmp.project(this.camera);
      this.labels[i].style.transform = `translate(${((this.tmp.x + 1) / 2) * m.width}px, ${((1 - this.tmp.y) / 2) * m.height}px) translate(-50%, 0)`;
    });
  }
}
