/** Import every content module once so all items/content are registered. */
import './items';
import './resources';
import './crops';
import './placeables';
import './villagers';
import './animals';
import './minerals';
import './fish';
import { registerArtisanGoods } from './recipes';
registerArtisanGoods();
import './machines';
import './skills';
export { ITEMS, item, tryItem } from './items';
