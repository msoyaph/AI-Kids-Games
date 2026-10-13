/**
 * People: 16×24 chibi characters drawn from a `Look` (skin, hair style and colour, outfit, extras),
 * for 4 directions × 3 frames (stand, step A, step B). Left is the mirror of right.
 * Directions: 0 down, 1 left, 2 right, 3 up.
 */
import { P, HAIR_COLORS, OUTFITS, SKIN } from './palette';
import { darken, lighten, PixelCanvas } from './pixelcanvas';

export interface CharLook {
  skin: number;
  hair: number;
  hairColor: number;
  outfit: number;
  /** Extras for NPCs. */
  hat?: 'cap' | 'beanie' | 'sunhat' | 'band' | 'crown';
  hatColor?: number;
  glasses?: boolean;
  scarf?: number;
  apron?: number;
  coat?: number;
  kid?: boolean;
  elder?: boolean;
  pants?: number;
  /** Field Agent vest with a star pin (the player, Juno, Agents). */
  agent?: boolean;
}

export const HAIR_STYLES = 8;
export const CHAR_W = 16, CHAR_H = 24;

const EYE = P.ink;

function hairColor(look: CharLook) {
  return look.elder ? 0xdcdce4 : HAIR_COLORS[look.hairColor % HAIR_COLORS.length]!;
}

export function drawCharacter(look: CharLook, dir: number, frame: number): PixelCanvas {
  if (dir === 1) return drawCharacter(look, 2, frame).flipped();
  const c = new PixelCanvas(CHAR_W, CHAR_H);
  const skin = SKIN[look.skin % SKIN.length]!;
  const hair = hairColor(look);
  const outfit = look.coat ?? OUTFITS[look.outfit % OUTFITS.length]!;
  const pants = look.pants ?? (look.agent ? 0x3a3f5a : darken(outfit, 0.45));
  const kid = !!look.kid;
  const top = kid ? 3 : 1; // head top
  const bob = frame === 0 ? 0 : 1;
  const headY = top + bob * 0;
  const bodyY = headY + 10;
  const legY = bodyY + (kid ? 5 : 6);
  const side = dir === 2, back = dir === 3;

  // legs and shoes
  const shoe = 0x4a3a40;
  const stepA = frame === 1, stepB = frame === 2;
  if (!side) {
    c.rect(5, legY, 2, 3 - (stepA ? 1 : 0), pants).rect(9, legY, 2, 3 - (stepB ? 1 : 0), pants);
    c.rect(5, legY + 3 - (stepA ? 1 : 0), 2, 1, shoe).rect(9, legY + 3 - (stepB ? 1 : 0), 2, 1, shoe);
  } else {
    const a = stepA ? -1 : stepB ? 1 : 0;
    c.rect(7 + a, legY, 2, 3, pants).rect(7 - a, legY, 2, 3, darken(pants, 0.15));
    c.rect(7 + a, legY + 3, 3, 1, shoe).rect(7 - a, legY + 3, 2, 1, darken(shoe, 0.1));
  }
  // body
  const bodyH = kid ? 5 : 6;
  c.rect(4, bodyY, 8, bodyH, outfit);
  if (look.agent && !back) {
    c.rect(7, bodyY, 2, bodyH, P.white);
    c.set(5, bodyY + 2, P.beacon);
  }
  if (look.apron !== undefined && !back) c.rect(5, bodyY + 1, 6, bodyH, look.apron);
  // arms
  const armSwing = frame === 0 ? 0 : frame === 1 ? -1 : 1;
  if (!side) {
    c.rect(3, bodyY + 1 + (armSwing > 0 ? 1 : 0), 1, 4, outfit).set(3, bodyY + 5 + (armSwing > 0 ? 1 : 0), skin);
    c.rect(12, bodyY + 1 + (armSwing < 0 ? 1 : 0), 1, 4, outfit).set(12, bodyY + 5 + (armSwing < 0 ? 1 : 0), skin);
  } else {
    c.rect(7 + armSwing, bodyY + 1, 2, 4, darken(outfit, 0.1)).rect(7 + armSwing, bodyY + 5, 2, 1, skin);
  }
  if (look.scarf !== undefined) c.rect(4, bodyY, 8, 2, look.scarf);
  // head
  c.ellipse(8, headY + 5, 5, 5, skin);
  // hair (back layer and top)
  const style = look.hair % HAIR_STYLES;
  const hy = headY;
  if (back) {
    c.ellipse(8, hy + 4.5, 5.2, 5, hair);
    if (style === 1 || style === 6) c.rect(3, hy + 5, 10, 6, hair);
    if (style === 2) c.rect(7, hy + 6, 2, 6, hair);
    if (style === 4) c.circle(8, hy + 1, 2, hair);
  } else {
    c.ellipse(8, hy + 3, 5.2, 3.2, hair);
    if (side) c.rect(3, hy + 2, 3, 5, hair);
    else { c.rect(3, hy + 3, 1, 3, hair); c.rect(12, hy + 3, 1, 3, hair); }
    if (style === 1) { c.rect(2, hy + 4, 2, 7, hair); if (!side) c.rect(12, hy + 4, 2, 7, hair); }
    if (style === 2) { if (side) c.rect(1, hy + 3, 2, 5, hair); else c.rect(12, hy + 2, 2, 4, hair); }
    if (style === 3) { c.circle(4, hy + 2, 2.5, hair).circle(12, hy + 2, 2.5, hair).circle(8, hy, 3, hair); }
    if (style === 4) c.circle(8, hy, 2.2, hair);
    if (style === 5) { for (const x of [4, 6, 8, 10, 12]) c.set(x, hy - 1 + (x % 4 === 0 ? 0 : 1), hair); }
    if (style === 6) { c.rect(2, hy + 4, 1, 7, hair); if (!side) c.rect(13, hy + 4, 1, 7, hair); }
    if (style === 7) { c.rect(3, hy + 2, 10, 2, hair); c.rect(2, hy + 4, 2, 4, hair); if (!side) c.rect(12, hy + 4, 2, 4, hair); }
    // face
    if (side) {
      c.set(11, hy + 6, EYE).set(11, hy + 5, EYE);
      c.set(10, hy + 8, lighten(P.flowerPink, 0.2));
    } else {
      c.set(6, hy + 5, EYE).set(6, hy + 6, EYE).set(10, hy + 5, EYE).set(10, hy + 6, EYE);
      c.set(5, hy + 8, lighten(P.flowerPink, 0.2)).set(11, hy + 8, lighten(P.flowerPink, 0.2));
      c.set(8, hy + 8, darken(skin, 0.35));
      if (look.glasses) { c.hline(5, 7, hy + 4, P.ink); c.hline(9, 11, hy + 4, P.ink); c.set(8, hy + 5, P.ink); }
    }
  }
  // hats
  if (look.hat) {
    const hc = look.hatColor ?? 0xd9604f;
    if (look.hat === 'cap') { c.ellipse(8, hy + 1.5, 5.4, 2.5, hc); if (!back) c.rect(side ? 9 : 4, hy + 3, side ? 6 : 8, 1, darken(hc, 0.2)); }
    if (look.hat === 'beanie') { c.ellipse(8, hy + 1.5, 5.5, 3, hc); c.set(8, hy - 1, lighten(hc, 0.4)); }
    if (look.hat === 'sunhat') { c.ellipse(8, hy + 2, 7.5, 1.5, hc); c.ellipse(8, hy + 0.5, 4, 2.5, hc); }
    if (look.hat === 'band') c.hline(3, 12, hy + 2, hc);
    if (look.hat === 'crown') { c.rect(5, hy - 1, 6, 2, P.beacon); c.set(5, hy - 2, P.beacon).set(8, hy - 2, P.beacon).set(10, hy - 2, P.beacon); }
  }
  c.outline(P.ink, true);
  return c;
}

/** Default looks for the player (picked at the start) and for named characters. */
export function playerLook(skin: number, hair: number, hairColor: number, outfit: number): CharLook {
  return { skin, hair, hairColor, outfit, agent: true };
}
