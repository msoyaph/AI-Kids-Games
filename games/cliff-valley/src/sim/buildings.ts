/** Carpenter: farm buildings, upgrades and farmhouse upgrades (built overnight over a few days). */
import { BUILDINGS, HOUSE_UPGRADES } from '../data/animals';
import { addStock, type ShopEntry } from '../data/shops';
import { SERVICES } from './shops';
import type { Sim } from './sim';
import type { GameState } from './state';
import { registerSystem } from './systems';

function busy(st: GameState): string | null {
  if (st.buildings.constructing) return 'Hollis is already building something for you. One project at a time!';
  if (st.buildings.houseUpgrade) return 'Hollis is busy upgrading your house.';
  return null;
}

addStock('carpenter', (st) => {
  const out: ShopEntry[] = [];
  const b = st.buildings;
  for (const o of BUILDINGS) {
    const cur = b.built[o.plot];
    const curLvl = cur === undefined ? -1 : cur;
    if (curLvl >= o.level && cur !== undefined) continue; // already have it
    if (curLvl !== o.needs) continue; // not the next step
    out.push({ id: `bld.${o.id}`, price: o.price, label: o.name, desc: `${o.desc} (${o.days} day${o.days > 1 ? 's' : ''})`, service: `build:${o.id}`, mats: o.mats, locked: busy(st) ?? undefined });
  }
  const next = HOUSE_UPGRADES.find((u) => u.level === b.houseLevel + 1);
  if (next) out.push({ id: `house.${next.level}`, price: next.price, label: next.name, desc: next.desc, service: `house:${next.level}`, mats: next.mats, locked: busy(st) ?? undefined });
  return out;
});

for (const o of BUILDINGS) {
  SERVICES[`build:${o.id}`] = (sim) => {
    const r = busy(sim.state);
    if (r) return { ok: false, msg: r };
    sim.state.buildings.constructing = { plot: o.plot, days: o.days, level: o.level };
    return { ok: true, msg: `Hollis will build your ${o.name}. It'll be ready in ${o.days} day${o.days > 1 ? 's' : ''}!` };
  };
}
for (const u of HOUSE_UPGRADES) {
  SERVICES[`house:${u.level}`] = (sim) => {
    const r = busy(sim.state);
    if (r) return { ok: false, msg: r };
    sim.state.buildings.houseUpgrade = { days: u.days, level: u.level };
    return { ok: true, msg: `Hollis will upgrade your house. Come home in ${u.days} days to see it!` };
  };
}

registerSystem({
  id: 'buildings',
  startDay(sim: Sim) {
    const b = sim.state.buildings;
    if (b.constructing) {
      b.constructing.days--;
      if (b.constructing.days <= 0) {
        const { plot, level } = b.constructing;
        b.built[plot] = level;
        b.constructing = null;
        const off = BUILDINGS.find((x) => x.plot === plot && x.level === level);
        sim.morningNotes.push(`Your ${off?.name ?? plot} is finished! Thanks, Hollis!`);
        sim.state.flags[`built.${plot}`] = level + 1;
        // clear anything left on the plot
        const farm = sim.loc('farm');
        const pl = farm.def.plots?.[plot];
        if (pl) for (let y = pl.y; y < pl.y + pl.h; y++) for (let x = pl.x; x < pl.x + pl.w; x++) farm.removeObj(x, y);
        sim.refreshLoc('farm');
      }
    }
    if (b.houseUpgrade) {
      b.houseUpgrade.days--;
      if (b.houseUpgrade.days <= 0) {
        b.houseLevel = b.houseUpgrade.level;
        b.houseUpgrade = null;
        sim.morningNotes.push(b.houseLevel === 1 ? 'Your house has a kitchen now! Cook food at the stove.' : 'Your house is bigger and cozier than ever!');
        sim.state.flags.houseLevel = b.houseLevel;
        sim.refreshLoc('farmhouse');
        sim.refreshLoc('farm');
        const bed = sim.loc('farmhouse').def.points.bed;
        if (sim.p.loc === 'farmhouse' && bed) sim.warpTo('farmhouse', bed.x, bed.y, 0);
      }
    }
  },
});
