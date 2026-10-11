// Maps panel names (opened from the simulation via game.ui.open) to UI panels.
import type { App } from '../app';
import type { Display } from '../sim/interior';
import { sleep } from '../sim/housing';
import { boardPanel, CraftPanel, exhibitPanel, HallPanel, MuseumPanel, ShopPanel, StoragePanel } from './panels';
import { EditorPanel } from './editor';
import { DecorEditPanel } from './decorEdit';
import { weekdayOf } from '../sim/clock';
import { VILLAGER_BY_ID } from '../data/villagers';
import { talkToNpc, talkToVillager } from './conversation';

export function registerPanels(app: App): void {
  const P = app.panels;
  const g = () => app.game!;
  P.craft = () => {
    app.tip('craft');
    app.ui.push(new CraftPanel(app.ui, g()));
  };
  P.shop = () => {
    app.tip('shop');
    app.ui.push(new ShopPanel(app.ui, g()));
  };
  P.hall = () => app.ui.push(new HallPanel(app.ui, g(), app.hallExtras()));
  P.storage = () => app.ui.push(new StoragePanel(app.ui, g()));
  P.museumDesk = () => app.ui.push(new MuseumPanel(app.ui, g()));
  P.exhibit = (d) => app.ui.push(exhibitPanel(app.ui, d as Display));
  P.board = () => app.ui.push(boardPanel(app.ui, app.boardNotes()));
  P.editor = () => {
    if (g().state.player.location !== 'home') return;
    app.ui.closeAll();
    app.ui.push(new EditorPanel(app.ui, g(), app.view.interior, app.canvas));
  };
  P.decorEdit = (anchor) => app.ui.push(new DecorEditPanel(app.ui, g(), anchor as number));
  P.talk = (id) => {
    const who = id as string;
    void (VILLAGER_BY_ID[who] ? talkToVillager(app, g(), who) : talkToNpc(app, g(), who));
  };
  P.sleep = () => {
    void app.fade(() => {
      sleep(g());
      app.saveNow(true);
      app.hud.toast(`Good morning! ${weekdayOf(g().state.clock.day)}, day ${g().state.clock.day}.`, 'good');
    });
  };
}
