// Always-on HUD: clock/date/weather, wallet, equipped tool, action prompt, toasts.
import { fmt } from '../core/math';
import { item } from '../data/registry';
import { formatTime, weekdayOf } from '../sim/clock';
import type { Game } from '../sim/game';
import { equippedTool, TOOL_LABEL } from '../sim/tools';
import type { WeatherT } from '../sim/state';
import { WEATHER_LABEL } from '../sim/weather';
import { h } from './dom';
import { iconImg, iconURL } from './icons';

export function weatherSvg(w: WeatherT, size = 26): string {
  const sun = `<circle cx="16" cy="16" r="7" fill="#ffd166"/><g stroke="#ffd166" stroke-width="2.5" stroke-linecap="round">${[0, 45, 90, 135, 180, 225, 270, 315]
    .map((a) => {
      const r = (a * Math.PI) / 180;
      return `<line x1="${16 + Math.cos(r) * 10}" y1="${16 + Math.sin(r) * 10}" x2="${16 + Math.cos(r) * 13}" y2="${16 + Math.sin(r) * 13}"/>`;
    })
    .join('')}</g>`;
  const cloud = (fill: string) => `<path d="M8 22 a5 5 0 0 1 1-10 a7 7 0 0 1 13-1 a5 5 0 0 1 2 11 z" fill="${fill}"/>`;
  let body = '';
  switch (w) {
    case 'sunny':
      body = sun;
      break;
    case 'cloudy':
      body = `<g transform="translate(-3,-3) scale(0.8)">${sun}</g>` + cloud('#dfe6f2');
      break;
    case 'rain':
      body = cloud('#b9c4d8') + `<g stroke="#7fb2ff" stroke-width="2.5" stroke-linecap="round"><line x1="11" y1="25" x2="9" y2="30"/><line x1="17" y1="25" x2="15" y2="30"/><line x1="23" y1="25" x2="21" y2="30"/></g>`;
      break;
    case 'rainbow':
      body = ['#f27c7c', '#ffd166', '#8fd18a', '#7fb2ff', '#b48cf0']
        .map((c, k) => `<path d="M${4 + k * 2} 24 a${12 - k * 2} ${12 - k * 2} 0 0 1 ${24 - k * 4} 0" fill="none" stroke="${c}" stroke-width="2"/>`)
        .join('');
      break;
  }
  return `<svg width="${size}" height="${size}" viewBox="0 0 32 32">${body}</svg>`;
}

export class Hud {
  readonly el: HTMLDivElement;
  private time = h('div', { class: 'time' });
  private date = h('div', { class: 'date' });
  private weather = h('div', { class: 'weather' });
  private glints = h('span');
  private lumens = h('span');
  private toolBox = h('div', { class: 'hud-tool' });
  private prompt = h('div', { class: 'hud-prompt hidden' });
  private toasts = h('div', { class: 'toasts' });
  readonly saving = h('div', { class: 'saving' }, 'Saving…');
  readonly extra = h('div', { class: 'hud-extra' });
  private lastTool = '';
  private lastWeather = '';
  private lastPrompt = '';
  visible = true;
  device: 'keyboard' | 'gamepad' | 'touch' = 'keyboard';

  constructor(root: HTMLElement) {
    this.el = h(
      'div',
      { class: 'hud' },
      h('div', { class: 'hud-clock' }, this.weather, h('div', null, this.time, this.date)),
      h(
        'div',
        { class: 'hud-money' },
        h('div', { class: 'pill' }, h('span', { class: 'glint' }, '✦'), this.glints),
        h('div', { class: 'pill' }, h('span', { class: 'lumen' }, '❖'), this.lumens),
      ),
      this.toolBox,
      this.prompt,
      this.extra,
      this.saving,
    );
    root.appendChild(this.el);
    root.appendChild(this.toasts);
  }

  setVisible(v: boolean): void {
    this.visible = v;
    this.el.style.display = v ? '' : 'none';
  }

  keyLabel(): string {
    return this.device === 'gamepad' ? 'A' : this.device === 'touch' ? '●' : 'E';
  }

  toast(text: string, kind = 'info', itemId?: string): void {
    const t = h('div', { class: `toast ${kind}` }, itemId ? iconImg(itemId, 'icon sm') : null, text);
    this.toasts.appendChild(t);
    while (this.toasts.children.length > 4) this.toasts.firstChild?.remove();
    setTimeout(() => t.classList.add('out'), 2600);
    setTimeout(() => t.remove(), 3100);
  }

  update(g: Game): void {
    if (!this.visible) return;
    const s = g.state;
    this.time.textContent = formatTime(s.clock.minute);
    this.date.textContent = `${weekdayOf(s.clock.day)} · Day ${s.clock.day}`;
    if (this.lastWeather !== s.weather.today) {
      this.lastWeather = s.weather.today;
      this.weather.innerHTML = weatherSvg(s.weather.today, 30);
      this.weather.title = WEATHER_LABEL[s.weather.today];
    }
    this.glints.textContent = fmt(s.player.glints);
    this.lumens.textContent = fmt(s.player.lumens);
    const t = equippedTool(g);
    const key = t ? `${t.s.id}|${t.s.dur}` : 'none';
    if (key !== this.lastTool) {
      this.lastTool = key;
      this.toolBox.innerHTML = '';
      if (t) {
        const def = item(t.s.id);
        const img = h('img', { class: 'icon', src: iconURL(t.s.id), alt: '' });
        this.toolBox.append(img, h('div', null, TOOL_LABEL[t.kind]));
        if (def.tool && def.tool.durability > 0 && t.s.dur !== undefined) {
          const pct = Math.max(0, Math.min(1, t.s.dur / def.tool.durability));
          const bar = h('div', { class: 'dur' }, h('div', { style: `width:${pct * 100}%;background:${pct < 0.25 ? '#f2a07b' : '#8fd18a'}` }));
          this.toolBox.append(bar);
        }
        this.toolBox.style.display = '';
      } else this.toolBox.style.display = 'none';
    }
    const pl = g.runtime.placement as { valid: boolean; reason: string; kind: string } | undefined;
    const inter = g.mode === 'play' && !g.action ? g.resolve() : null;
    const label = pl ? (pl.valid ? `Place ${pl.kind === 'plot' ? 'the home plot' : `the ${pl.kind}`} here  ·  Esc to cancel` : `${pl.reason}  ·  Esc to cancel`) : inter ? inter.label : '';
    if (label !== this.lastPrompt) {
      this.lastPrompt = label;
      this.prompt.innerHTML = '';
      if (label) {
        this.prompt.append(h('kbd', null, this.keyLabel()), label);
        this.prompt.classList.remove('hidden');
      } else this.prompt.classList.add('hidden');
    }
  }
}
