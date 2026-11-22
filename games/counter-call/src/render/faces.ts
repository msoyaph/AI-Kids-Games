/**
 * Faces are drawn on a small canvas and wrapped onto the front of the head, so expressions are
 * just a redraw: no extra geometry. Each eye style in the registry is drawn here.
 */
import * as THREE from 'three';
import type { ChibiLook } from '../data/characters';

export type Expression = 'neutral' | 'happy' | 'wow' | 'sad';

const S = 256;
const INK = '#33262e';
const MOUTH = '#a8425a';

export class Face {
  readonly texture: THREE.CanvasTexture;
  private readonly c: CanvasRenderingContext2D;
  private key = '';

  constructor(private readonly look: ChibiLook) {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = S;
    this.c = canvas.getContext('2d')!;
    this.texture = new THREE.CanvasTexture(canvas);
    this.texture.colorSpace = THREE.SRGBColorSpace;
    this.draw('neutral', false, false);
  }

  /** Redraws only when something changed. */
  draw(expr: Expression, blink: boolean, talking: boolean): void {
    const key = `${expr}:${blink}:${talking}`;
    if (key === this.key) return;
    this.key = key;
    const c = this.c;
    c.clearRect(0, 0, S, S);
    if (this.look.blush) {
      c.fillStyle = 'rgba(255, 105, 130, 0.3)';
      for (const side of [-1, 1]) {
        c.beginPath();
        c.ellipse(S / 2 + side * 92, 168, 22, 13, 0, 0, Math.PI * 2);
        c.fill();
      }
    }
    this.eye(S / 2 - 58, 132, -1, expr, blink);
    this.eye(S / 2 + 58, 132, 1, expr, blink);
    this.mouth(expr, talking);
    this.texture.needsUpdate = true;
  }

  /** side: -1 is the eye on the viewer's left. */
  private eye(x: number, y: number, side: number, expr: Expression, blink: boolean): void {
    const c = this.c, style = this.look.eyes;
    c.lineCap = 'round';
    c.lineJoin = 'round';
    c.strokeStyle = c.fillStyle = INK;
    // An arch (∩) or a smile (U), with short straight legs like a horseshoe.
    const arch = (up: boolean, r: number, width: number, leg: number) => {
      const d = up ? 1 : -1;
      c.lineWidth = width;
      c.beginPath();
      c.moveTo(x - r, y + d * leg);
      c.lineTo(x - r, y);
      c.arc(x, y, r, Math.PI, 0, !up);
      c.lineTo(x + r, y + d * leg);
      c.stroke();
    };
    const dot = (rx: number, ry: number) => {
      c.beginPath();
      c.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
      c.fill();
    };
    const shine = (dx: number, dy: number, r: number) => {
      c.fillStyle = '#ffffff';
      c.beginPath();
      c.arc(x + dx, y + dy, r, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = INK;
    };

    if (style === 'sketch' || style === 'arches') {
      // Hand-drawn eyes. 'arches' is the hosts' pair of tall arches; 'sketch' is a wink, an arch
      // on the viewer's left and a smile on the right.
      const both = style === 'arches';
      c.strokeStyle = c.fillStyle = this.look.eyeColor ?? INK;
      c.lineCap = 'butt';
      if (expr === 'wow') {
        c.lineWidth = 12;
        c.beginPath();
        c.arc(x, y, 20, 0, Math.PI * 2);
        c.stroke();
        return;
      }
      if (both && blink) {
        c.lineWidth = 13;
        c.beginPath();
        c.moveTo(x - 23, y + 10);
        c.lineTo(x + 23, y + 10);
        c.stroke();
        return;
      }
      const up = both ? expr !== 'sad' : blink || expr === 'happy' ? true : expr === 'sad' ? false : side < 0;
      y += up ? 4 : -4;
      if (both) arch(up, 22, 15, 21);
      else arch(up, 23, 17, 13);
      return;
    }
    if (blink) {
      c.lineWidth = 7;
      c.beginPath();
      c.moveTo(x - 15, y + 3);
      c.lineTo(x + 15, y + 3);
      c.stroke();
      return;
    }
    if (expr === 'happy') {
      y += 6;
      arch(true, 15, 8, 3);
      return;
    }
    if (expr === 'sad') {
      c.lineWidth = 5;
      c.beginPath();
      c.moveTo(x + side * 17, y - 23);
      c.lineTo(x - side * 11, y - 31);
      c.stroke();
    }
    const big = expr === 'wow' ? 1.18 : 1;
    if (style === 'dot') {
      dot(15 * big, 16 * big);
      shine(-5, -6, 5 * big);
    } else if (style === 'oval') {
      dot(10 * big, 18 * big);
      shine(-3, -8, 3.5 * big);
    } else if (style === 'sparkle') {
      dot(18 * big, 23 * big);
      c.fillStyle = this.look.eyeColor ?? '#4a90d9';
      c.beginPath();
      c.ellipse(x, y + 7 * big, 12 * big, 13 * big, 0, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = INK;
      c.beginPath();
      c.ellipse(x, y + 3 * big, 7 * big, 9 * big, 0, 0, Math.PI * 2);
      c.fill();
      shine(-7, -10, 6 * big);
      shine(7, 10, 3 * big);
    } else {
      // sleepy: half-closed
      c.beginPath();
      c.arc(x, y, 13 * big, 0, Math.PI);
      c.closePath();
      c.fill();
      c.lineWidth = 6;
      c.beginPath();
      c.moveTo(x - 17, y);
      c.lineTo(x + 17, y);
      c.stroke();
    }
  }

  private mouth(expr: Expression, talking: boolean): void {
    const c = this.c, x = S / 2, y = 184;
    c.lineCap = 'round';
    c.fillStyle = MOUTH;
    c.strokeStyle = '#8a4450';
    c.lineWidth = 5;
    if (talking || expr === 'wow') {
      c.beginPath();
      c.ellipse(x, y + 1, talking ? 9 : 8, talking ? 11 : 10, 0, 0, Math.PI * 2);
      c.fill();
    } else if (expr === 'happy') {
      c.beginPath();
      c.arc(x, y - 7, 17, 0, Math.PI);
      c.closePath();
      c.fill();
      c.fillStyle = '#ff9aa8';
      c.beginPath();
      c.ellipse(x, y + 5, 8, 4, 0, 0, Math.PI * 2);
      c.fill();
    } else if (expr === 'sad') {
      c.beginPath();
      c.arc(x, y + 12, 11, Math.PI * 1.2, Math.PI * 1.8);
      c.stroke();
    } else if (this.look.mouth !== 'none') {
      c.beginPath();
      c.arc(x, y - 9, 12, Math.PI * 0.2, Math.PI * 0.8);
      c.stroke();
    }
  }
}
