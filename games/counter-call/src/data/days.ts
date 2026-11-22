/** The days of the week at the counter. Each one adds a little more to juggle. */
import type { FoodId } from './menu';

export interface DayDef {
  name: string;
  /** Foods friends can order today (their stations are open). */
  menu: FoodId[];
  /** How many friends visit. */
  guests: number;
  /** How likely an order has 1, 2 or 3 things (weights). */
  sizes: [number, number, number];
  /** Seconds between friends arriving: shortest and longest. */
  gap: [number, number];
  /** Seconds a normal friend waits for a one-item order. */
  patience: number;
}

export const DAYS: DayDef[] = [
  { name: 'Opening Day', menu: ['juice', 'fries'], guests: 6, sizes: [1, 0, 0], gap: [7, 9], patience: 38 },
  { name: 'Burger Day', menu: ['juice', 'fries', 'burger'], guests: 8, sizes: [3, 2, 0], gap: [5.5, 7.5], patience: 36 },
  { name: 'Sweet Scoops', menu: ['juice', 'fries', 'burger', 'icecream'], guests: 9, sizes: [2, 3, 0], gap: [5.5, 7.5], patience: 36 },
  { name: 'Busy Lunch', menu: ['juice', 'fries', 'burger', 'icecream'], guests: 10, sizes: [2, 3, 1], gap: [5, 7], patience: 36 },
  { name: 'Pizza Party', menu: ['juice', 'fries', 'burger', 'icecream', 'pizza'], guests: 11, sizes: [2, 3, 1], gap: [5, 7], patience: 38 },
  { name: 'Rainy Rush', menu: ['juice', 'fries', 'burger', 'icecream', 'pizza'], guests: 12, sizes: [1, 3, 2], gap: [4.5, 6.5], patience: 38 },
  { name: 'Festival Eve', menu: ['juice', 'fries', 'burger', 'icecream', 'pizza'], guests: 13, sizes: [1, 3, 2], gap: [4.5, 6], patience: 40 },
  { name: 'The Big Feast', menu: ['juice', 'fries', 'burger', 'icecream', 'pizza'], guests: 15, sizes: [0, 3, 3], gap: [4, 6], patience: 42 },
];

/** The first day (1-based) a food is on the menu, for "opens on day N" labels. */
export function opensOnDay(food: FoodId): number {
  const i = DAYS.findIndex(d => d.menu.includes(food));
  return i < 0 ? DAYS.length : i + 1;
}
