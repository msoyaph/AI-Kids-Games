// Maps panel names (opened from the simulation via game.ui.open) to UI panels.
import type { App } from '../app';
import { isHomeRoom, type Display } from '../sim/interior';
import { sleep } from '../sim/housing';
import { boardPanel, CraftPanel, exhibitPanel, HallPanel, MuseumPanel, ShopPanel, StoragePanel } from './panels';
import { EditorPanel } from './editor';
import { DecorEditPanel } from './decorEdit';
import { DyePanel, WardrobePanel } from './wardrobe';
import { weekdayOf } from '../sim/clock';
import { VILLAGER_BY_ID } from '../data/villagers';
import { talkToNpc, talkToVillager } from './conversation';

export function registerPanels(app: App): void {
  const P = app.panels;
  const g = () => app.game!;
  P.craft = () => {
    const p = new CraftPanel(app.ui, g());
    app.tipInside(p, 'craft');
    app.ui.push(p);
  };
  P.shop = () => {
    const p = new ShopPanel(app.ui, g());
    app.tipInside(p, 'shop');
    app.ui.push(p);
  };
  P.hall = () => app.ui.push(new HallPanel(app.ui, g(), app.hallExtras()));
  P.storage = () => app.ui.push(new StoragePanel(app.ui, g()));
  P.museumDesk = () => app.ui.push(new MuseumPanel(app.ui, g()));
  P.exhibit = (d) => app.ui.push(exhibitPanel(app.ui, d as Display));
  P.board = () => app.ui.push(boardPanel(app.ui, app.boardNotes()));
  P.editor = () => {
    if (!isHomeRoom(g().state.player.location)) return;
    app.ui.closeAll();
    app.ui.push(new EditorPanel(app.ui, g(), app.view.interior, app.canvas));
  };
  P.wardrobe = () => app.ui.push(new WardrobePanel(app.ui, g()));
  P.dye = () => app.ui.push(new DyePanel(app.ui, g()));
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
