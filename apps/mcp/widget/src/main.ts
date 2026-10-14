// The AI Kids Games widget: one page for every tool. The tool result says what to show:
// find_games → the list, show_game → the card, play_game → the player ("Try it here" on a card too).
import type { GameOutput,ListOutput } from '../../src/schemas';
import { Host } from './host';
import { player } from './player';
import { card,list,message } from './views';

const app = document.getElementById('app')!;
const host = new Host();
const show = (view: HTMLElement,name: string) => { app.className = name; app.replaceChildren(view); };

host.onResult(raw => {
  const view = (raw as { view?: string }).view;
  if (view === 'list') return show(list(host,raw as ListOutput),'is-list');
  if (view === 'card' || view === 'player') {
    const game = raw as GameOutput;
    if (game.view === 'player' && game.game.build) return show(player(host,game,{ autostart: false }),'is-player');
    return show(card(host,game,() => show(player(host,{ ...game,view: 'player' },{ autostart: true }),'is-player')),'is-card');
  }
});
await host.connect();
setTimeout(() => { if (app.classList.contains('loading')) show(message('This is the AI Kids Games card for AI assistants. Ask the assistant for a game.'),'is-empty'); },8_000);
