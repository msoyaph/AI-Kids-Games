// Makes the 2D-save fixture for tests/e2e/save2d.spec.ts with the ORIGINAL 2D game (the `main` branch):
// a new game, then main's own mission engine is driven by the gameplay events each objective waits for,
// until the cadet is in the middle of Chapter 3 ("A Strange Signal": find 3 signal chips on Ceres). A part
// is bought and equipped on the way. The real localStorage (spacesky.*) is written to the fixture.
//
//   (in a `main` worktree) npx vite build && npx vite preview --port 4394
//   node scripts/make-2d-save.mjs [--base http://localhost:4394] [--out tests/fixtures/save-2d-chapter3.json]
import { chromium } from '@playwright/test';
import fs from 'fs';

const arg = (k, d) => {
  const i = process.argv.indexOf(`--${k}`);
  return i > 0 ? process.argv[i + 1] : d;
};
const base = arg('base', 'http://localhost:4394');
const out = arg('out', 'tests/fixtures/save-2d-chapter3.json');

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
await page.goto(`${base}/?debug`);
await page.getByTestId('btn-play').waitFor({ timeout: 30000 });
await page.evaluate(() => localStorage.clear());
await page.reload();
await page.getByTestId('btn-play').waitFor({ timeout: 30000 });
await page.getByTestId('btn-play').click({ force: true });
await page.getByTestId('slot-0').click({ force: true });
await page.getByTestId('name-input').fill('Kai');
await page.getByTestId('btn-start').click({ force: true });
await page.getByTestId('hub-banner').waitFor({ timeout: 30000 });

const log = await page.evaluate(async () => {
  const S = window.__spacesky;
  const st = S.state;
  const steps = [];
  for (let i = 0; i < 400; i++) {
    let cur = S.missions.currentObjective();
    if (!cur) {
      const next = S.missions.available().find((m) => m.kind === 'main');
      if (!next) break;
      S.missions.start(next.id, true);
      continue;
    }
    if (cur.mission.id === 'c3_signal') break;
    const o = cur.obj;
    steps.push(`${cur.mission.id}:${o.kind}`);
    const need = (o.count ?? 1) - (cur.prog.count ?? 0);
    switch (o.kind) {
      case 'visit': st.emit({ type: 'visit', place: o.place }); break;
      case 'arrive': st.emit({ type: 'arrive', system: o.system }); break;
      case 'near': st.emit({ type: 'near', body: o.body }); break;
      case 'land': st.emit({ type: 'land', body: o.body, perfect: true }); break;
      case 'home': st.emit({ type: 'home' }); break;
      case 'enterArea': st.emit({ type: 'enterArea', area: o.area }); break;
      case 'collect': st.emit({ type: 'collect', item: o.item, area: o.area, count: need }); break;
      case 'scan': st.emit({ type: 'scan', target: o.target.endsWith(':') ? `${o.target}${i}` : o.target }); break;
      case 'talk': st.emit({ type: 'talk', npc: o.npc, area: o.area ?? 'lounge' }); break;
      case 'reach': st.emit({ type: 'reach', marker: o.marker, area: o.area }); break;
      case 'solve': st.emit({ type: 'solve', puzzle: o.puzzle, area: o.area }); break;
      case 'gates': st.emit({ type: 'gates', course: o.course }); break;
      case 'race': st.emit({ type: 'race', course: o.course, medal: 'gold', time: 40 }); break;
      case 'equip': st.emit({ type: 'equip', part: o.part ?? 'any' }); break;
      case 'coins': st.addCoins(need); st.emit({ type: 'coins', amount: need, system: o.system }); break;
      case 'fuel': st.emit({ type: 'fuel' }); break;
      case 'boost': st.emit({ type: 'boost' }); break;
      case 'slingshot': st.emit({ type: 'slingshot' }); break;
      case 'haul': st.emit({ type: 'haul', item: o.item }); break;
      case 'glimmer': st.emit({ type: 'glimmer' }); break;
      case 'deliver':
        st.data.cargo[o.item] = need;
        st.emit({ type: 'land', body: o.body, perfect: true });
        break;
      default:
        steps.push(`?? ${o.kind}`);
        i = 9999;
    }
  }
  // Some shopping and exploring flavour, like a real player.
  st.data.coins += 200;
  st.addUnique(st.data.visitedBodies, 'moon');
  return { steps, chapter: st.data.chapter, coins: st.data.coins, active: st.data.activeMission };
});
console.log(`drove ${log.steps.length} objectives; chapter ${log.chapter}; active ${log.active}`);
// Buy and equip a part through the real hangar screen.
await page.evaluate(() => window.__spacesky.game.go('hangar'));
await page.waitForTimeout(1500);
for (let i = 0; i < 40; i++) {
  const d = page.getByTestId('dialogue');
  if (!(await d.isVisible().catch(() => false))) break;
  await d.click({ force: true }).catch(() => {});
  await page.waitForTimeout(60);
}
await page.getByTestId('tab-engine').click({ force: true });
await page.waitForTimeout(300);
const bought = await page.evaluate(() => {
  const S = window.__spacesky;
  const owned = new Set(S.state.data.owned);
  const card = [...document.querySelectorAll('[data-testid^="part-"]:not([data-testid="part-cards"])')].find((c) => !owned.has(c.getAttribute('data-testid').slice(5)) && c.querySelector('.price:not(.poor)'));
  if (!card) return null;
  card.click();
  return card.getAttribute('data-testid').slice(5);
});
await page.waitForTimeout(300);
if (bought) {
  // Click the element itself (a dialogue overlay may cover its spot on screen).
  await page.getByTestId('btn-part-action').evaluate((el) => el.click());
  await page.waitForTimeout(400);
}
// Saved on every scene change.
await page.evaluate(() => window.__spacesky.game.go('hub'));
await page.waitForTimeout(1500);
const save = await page.evaluate(() => {
  const S = window.__spacesky;
  const keys = Object.keys(localStorage).filter((k) => k.startsWith('spacesky.'));
  return {
    summary: {
      name: S.state.data.profile.name,
      chapter: S.state.data.chapter,
      coins: S.state.data.coins,
      activeMission: S.state.data.activeMission,
      objective: S.missions.currentObjective()?.obj.text,
      owned: S.state.data.owned.length,
      loadout: S.state.data.loadout,
      codex: S.state.data.codex.length,
      badges: S.state.data.badges.length,
      stickers: S.state.data.stickers.length,
      zibboJoined: S.state.flag('zibboJoined'),
    },
    storage: Object.fromEntries(keys.map((k) => [k, localStorage.getItem(k)])),
  };
});
save.summary.bought = bought;
save.madeWith = 'main (2D PixiJS) build via scripts/make-2d-save.mjs';
fs.mkdirSync('tests/fixtures', { recursive: true });
fs.writeFileSync(out, JSON.stringify(save, null, 2));
console.log(JSON.stringify(save.summary));
await browser.close();
