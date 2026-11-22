/**
 * The menu. Each food is made at its own station; adding a food means adding a row here, a model
 * in render/food.ts and an appliance in render/world.ts.
 */
export type FoodId = 'juice' | 'fries' | 'burger' | 'icecream' | 'pizza';

export interface FoodDef {
  id: FoodId;
  /** As it reads in a sentence: "Pim wants fries." */
  name: string;
  /** Short label for buttons. */
  label: string;
  /** The station that makes it, as it reads in a sentence. */
  station: string;
  cookSeconds: number;
  /** Coins a friend pays for it. */
  price: number;
  /** Accent color of its station. */
  color: string;
}

export const MENU: FoodDef[] = [
  { id: 'juice', name: 'orange juice', label: 'Juice', station: 'juice bar', cookSeconds: 1.6, price: 3, color: '#ffa62b' },
  { id: 'fries', name: 'fries', label: 'Fries', station: 'fryer', cookSeconds: 3, price: 4, color: '#ffcf4a' },
  { id: 'burger', name: 'a burger', label: 'Burger', station: 'grill', cookSeconds: 4.2, price: 6, color: '#f2705c' },
  { id: 'icecream', name: 'ice cream', label: 'Ice cream', station: 'ice cream machine', cookSeconds: 2.2, price: 4, color: '#ff9ec4' },
  { id: 'pizza', name: 'pizza', label: 'Pizza', station: 'pizza oven', cookSeconds: 5.4, price: 7, color: '#7ac36a' },
];

export const FOOD_BY_ID = Object.fromEntries(MENU.map(f => [f.id, f])) as Record<FoodId, FoodDef>;

/** The stations from left to right. The first foods to unlock sit in the middle. */
export const STATION_ORDER: FoodId[] = ['icecream', 'burger', 'juice', 'fries', 'pizza'];
