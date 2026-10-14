// The card (show_game) and the list (find_games). Both speak to the grown-up, use the host's colors and
// fonts with the site's green as the accent, and keep to each host's rules: at most two actions per card,
// one per list item, at most two links per widget, and no logo or brand bar in ChatGPT (it shows our name
// and icon above the widget itself).
import type { GameOutput,GameView,ListOutput } from '../../src/schemas';
import mark from '../../../site/public/brand/mark-96.png';
import { h } from './dom';
import type { Host } from './host';
import { safeLink } from './links';

type Site = GameOutput['site'];
export const BRAND = 'AI Kids Games';
const SAFETY = 'No ads, purchases, accounts, chat or tracking. Saves stay on the device you play on.';

export function brandBar(host: Host) {
  if (host.state.kind === 'chatgpt') return null;
  return h('header',{ class: 'brand' },h('img',{ src: mark,alt: '',width: 24,height: 24 }),h('strong',{},BRAND),h('span',{ class: 'brand-tag' },'Free · No ads · Open source'));
}

/** A link opened the host's way; it does nothing for anything but our site and repo. */
export function link(host: Host,site: Site,url: string,label: string,className = 'link') {
  const href = safeLink(url,site.origin);
  return h('a',{ class: className,href: href ?? '#',rel: 'noopener noreferrer',target: '_blank',onclick: (event: Event) => { event.preventDefault(); if (href) void host.openLink(href); } },label);
}

export const facts = (game: GameView) => [`Ages ${game.ages}`,game.genres.join(' · '),game.sessionMinutes && `${game.sessionMinutes[0]}–${game.sessionMinutes[1]} min a sitting`].filter(Boolean).join(' · ');

function cover(game: GameView,eager = false) {
  return h('div',{ class: 'cover',style: `background:${game.accentColor}` },h('img',{ src: game.cover,alt: '',loading: eager ? 'eager' : 'lazy',decoding: 'async',onerror: (event: Event) => (event.target as HTMLElement).remove() }));
}

export function card(host: Host,data: GameOutput,tryHere: () => void) {
  const { game,site } = data, playable = game.embed !== 'site';
  const play = link(host,site,game.url,`Play on ${site.label}`,'button primary');
  const second = playable
    ? h('button',{ class: 'button secondary',type: 'button',onclick: tryHere },'Try it here')
    : link(host,site,`${site.origin}/games`,'See all games','button secondary');
  return h('article',{ class: 'card','aria-labelledby': 'game-title' },
    brandBar(host),
    cover(game,true),
    h('div',{ class: 'body' },
      data.note ? h('p',{ class: 'notice' },data.note) : null,
      h('p',{ class: 'eyebrow' },'A kid-safe game for your child'),
      h('h1',{ id: 'game-title',class: 'title' },game.title),
      h('p',{ class: 'facts' },facts(game)),
      h('p',{},game.pitch),
      h('dl',{ class: 'notes' },
        h('dt',{},'What to expect'),h('dd',{},game.contentNotes),
        h('dt',{},'Safety and privacy'),h('dd',{},SAFETY),
        game.madeBy ? h('dt',{},'Made by') : null,game.madeBy ? h('dd',{},`${game.madeBy}, a community creator, and approved by a person`) : null),
      h('p',{ class: 'hint' },playable ? `Try it together here, then keep playing on ${site.label}.` : `This game plays on ${site.label}.`)),
    h('footer',{ class: 'actions' },play,second));
}

export function list(host: Host,data: ListOutput) {
  const { site } = data, chosen = Object.entries(data.filters).map(([key,value]) => key === 'age' ? `age ${value}` : key === 'minutes' ? `${value} minutes` : String(value));
  const intro = data.games.length
    ? `Kid-safe games for your child${chosen.length ? `: ${chosen.join(' · ')}` : ''}`
    : 'No game matches all of that yet. Try fewer choices.';
  return h('section',{ class: 'list','aria-labelledby': 'list-title' },
    brandBar(host),
    h('h1',{ id: 'list-title',class: 'intro' },intro),
    data.relaxed.length ? h('p',{ class: 'muted small' },`Nothing matched every choice, so these leave out ${data.relaxed.join(' and ')}.`) : null,
    data.games.length ? h('ul',{ class: 'carousel' },...data.games.map(game => h('li',{ class: 'mini' },
      cover(game),
      h('div',{ class: 'mini-body' },h('h2',{ class: 'mini-title' },game.title),h('p',{ class: 'facts' },facts(game)),h('p',{ class: 'mini-tagline' },game.tagline)),
      h('button',{ class: 'button secondary',type: 'button',onclick: () => void host.sendMessage(`Show me ${game.title} from ${BRAND}.`) },'Show me')))) : null,
    h('footer',{ class: 'actions single' },link(host,site,`${site.origin}/games`,'See all games')));
}

export function message(text: string) { return h('p',{ class: 'status' },text); }
