/** Shipping bin screen: put items in, see tonight's value, undo the last one. */
import { binValue, canShip, shipFromSlot, unshipLast } from '../sim/economy';
import type { Sim } from '../sim/sim';
import { fmt, h } from './dom';
import { icon } from './icons';
import { infoLine, invGrid } from './inventory';
import { iconName, itemName } from './itemview';
import type { Modals } from './widgets';

export function openShipping(sim: Sim, modals: Modals, sfx: (id: string) => void): void {
  const body = h('div', { class: 'wide-modal' });
  const info = infoLine();
  let close = () => {};
  const render = () => {
    body.innerHTML = '';
    const last = sim.state.bin[sim.state.bin.length - 1];
    const row = h(
      'div',
      { class: 'bin-row' },
      icon('ui.coin', 24),
      last ? h('span', null, 'Last: ', icon(iconName(last.id), 24), ` ${itemName(last.id)} ×${last.n}`) : h('span', null, 'The bin is empty.'),
      h('span', { class: 'v' }, `Tonight: ${fmt(binValue(sim))}`),
    );
    const grid = invGrid(sim.p.inv, {
      sim,
      info,
      enabled: (s) => canShip(s.id),
      onClick: (i, alt) => {
        const s = sim.p.inv[i];
        if (!s || !canShip(s.id)) return;
        if (shipFromSlot(sim, i, alt ? 1 : undefined)) {
          sfx('ship');
          render();
        }
      },
    });
    body.append(
      h('h2', null, 'Shipping Bin'),
      h('p', null, 'Tap items to ship them. You get paid overnight! (Shift-click or long-press ships just one.)'),
      row,
      grid,
      info,
      h(
        'div',
        { class: 'actions' },
        h('button', { class: 'btn gray', disabled: !last, onclick: () => { unshipLast(sim); render(); } }, 'Undo last'),
        h('button', { class: 'btn green primary', onclick: () => close() }, 'Done'),
      ),
    );
  };
  render();
  close = modals.show(body, { cancel: () => {} });
}
