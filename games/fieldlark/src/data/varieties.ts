/**
 * Crop varieties: real colour and shape variants of twelve flowering crops. Each crop has one
 * heirloom variety (its seeds are sold from chapter 4) and one or two more waiting to be discovered
 * by crossing: plant two kinds of the same crop side by side with a beehive nearby, and when one is
 * picked the bees may have mixed them (src/sim/varieties.ts).
 *
 * A variety's harvest is its own item: it sells for a little more, and it can win "Best new
 * variety" at the fair. Workshops and orders use the ordinary crop.
 */

export interface VarietyDef {
  /** Its item id: `<crop>-<name>`. */
  id: string;
  crop: string;
  name: string;
  /** Heirloom seeds are sold; the others are found by crossing. */
  heirloom: boolean;
  /** For varieties found by crossing: the two kinds that make it (a variety id, or the crop id for the ordinary kind). */
  parents?: [string, string];
  /** The colour of the crop itself (its model and icon). */
  color: number;
}

const v = (crop: string, key: string, name: string, color: number, parents?: [string, string]): VarietyDef =>
  ({ id: `${crop}-${key}`, crop, name, heirloom: !parents, color, ...(parents ? { parents } : {}) });

export const VARIETIES: readonly VarietyDef[] = [
  v('strawberry', 'white', 'White Strawberry', 0xf6efe0),
  v('strawberry', 'yellow', 'Yellow Strawberry', 0xffe27a, ['strawberry', 'strawberry-white']),
  v('cucumber', 'lemon', 'Lemon Cucumber', 0xf2dc5d),
  v('cucumber', 'white', 'White Cucumber', 0xeef2dc, ['cucumber', 'cucumber-lemon']),
  v('zucchini', 'golden', 'Golden Zucchini', 0xf5c33b),
  v('zucchini', 'striped', 'Striped Zucchini', 0x6f9a4a, ['zucchini', 'zucchini-golden']),
  v('zucchini', 'round', 'Round Zucchini', 0x4a7c3a, ['zucchini-golden', 'zucchini-striped']),
  v('pumpkin', 'white', 'White Pumpkin', 0xf2eee2),
  v('pumpkin', 'blue', 'Blue Pumpkin', 0x8fa3a8, ['pumpkin', 'pumpkin-white']),
  v('watermelon', 'yellow', 'Yellow Watermelon', 0xf5d547),
  v('watermelon', 'orange', 'Orange Watermelon', 0xf59a3b, ['watermelon', 'watermelon-yellow']),
  v('watermelon', 'moonstars', 'Moon and Stars Watermelon', 0x2f5a2a, ['watermelon-yellow', 'watermelon-orange']),
  v('bellpepper', 'purple', 'Purple Bell Pepper', 0x5b2a6b),
  v('bellpepper', 'chocolate', 'Chocolate Bell Pepper', 0x6b3a24, ['bellpepper', 'bellpepper-purple']),
  v('okra', 'red', 'Red Okra', 0xa8323e),
  v('okra', 'white', 'White Okra', 0xdfe8c8, ['okra', 'okra-red']),
  v('cotton', 'brown', 'Brown Cotton', 0xb08a62),
  v('cotton', 'green', 'Green Cotton', 0xb7c98a, ['cotton', 'cotton-brown']),
  v('lavender', 'white', 'White Lavender', 0xf1eefa),
  v('lavender', 'pink', 'Pink Lavender', 0xf0b6d2, ['lavender', 'lavender-white']),
  v('clover', 'crimson', 'Crimson Clover', 0xc8283c),
  v('clover', 'white', 'White Clover', 0xf6f6ee, ['clover', 'clover-crimson']),
  v('flax', 'golden', 'Golden Flax', 0xe6c25a),
  v('flax', 'white', 'White Flax', 0xf4f2ea, ['flax', 'flax-golden']),
  v('squash', 'mini', 'Mini Butternut', 0xe8b86a),
  v('squash', 'neck', 'Long-neck Squash', 0xd9a45a, ['squash', 'squash-mini']),
];

export const VARIETY: Record<string, VarietyDef> = Object.fromEntries(VARIETIES.map(x => [x.id, x]));

/** Varieties sell for this much more than the ordinary crop, and their seeds cost this much more. */
export const VARIETY_PRICE = 1.25;
export const VARIETY_SEED = 1.5;
/** The chance a crossing works, and with healthy soil (rich in nitrogen and humus). */
export const CROSS_CHANCE = 0.2;
export const CROSS_CHANCE_HEALTHY = 0.25;
