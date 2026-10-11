// Tree fruit. Index order matters: worldgen picks a native fruit by index.
export interface FruitDef {
  id: string;
  name: string;
  color: number;
  /** sell price when native; foreign fruit sells for 4x */
  price: number;
}

export const FRUITS: FruitDef[] = [
  { id: 'fruit_sunplum', name: 'Sunplum', color: 0xffc24d, price: 100 },
  { id: 'fruit_duskfig', name: 'Duskfig', color: 0x9b87e0, price: 100 },
  { id: 'fruit_blushpear', name: 'Blushpear', color: 0xffaab9, price: 100 },
  { id: 'fruit_glowlemon', name: 'Glowlemon', color: 0xfff06b, price: 100 },
  { id: 'fruit_rubylychee', name: 'Ruby Lychee', color: 0xff6b7a, price: 100 },
];

export const COCONUT = { id: 'fruit_seacoconut', name: 'Sea Coconut', color: 0x9c6b48, price: 250 };

export const FOREIGN_FRUIT_MULT = 4;
