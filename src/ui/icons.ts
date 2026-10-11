/**
 * Procedurally drawn icons (canvas 2D → data URL, cached). No image assets.
 */
const cache = new Map<string, string>();
const S = 96;

type Ctx = CanvasRenderingContext2D;

function hex(c: number, a = 1): string {
  const r = (c >> 16) & 255;
  const g = (c >> 8) & 255;
  const b = c & 255;
  return a >= 1 ? `rgb(${r},${g},${b})` : `rgba(${r},${g},${b},${a})`;
}

function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function bg(ctx: Ctx, top: string, bottom: string, border: string): void {
  const g = ctx.createLinearGradient(0, 0, 0, S);
  g.addColorStop(0, top);
  g.addColorStop(1, bottom);
  roundRect(ctx, 3, 3, S - 6, S - 6, 18);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = border;
  ctx.stroke();
}

function outline(ctx: Ctx, w = 5): void {
  ctx.lineWidth = w;
  ctx.strokeStyle = '#231c2e';
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
}

function fillStroke(ctx: Ctx, fill: string, w = 5): void {
  ctx.fillStyle = fill;
  ctx.fill();
  outline(ctx, w);
  ctx.stroke();
}

function circle(ctx: Ctx, x: number, y: number, r: number): void {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
}

function star(ctx: Ctx, x: number, y: number, r: number, points = 5, inner = 0.45): void {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const rr = i % 2 === 0 ? r : r * inner;
    const a = (i / (points * 2)) * Math.PI * 2 - Math.PI / 2;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
}

function mallet(ctx: Ctx, x: number, y: number, a: number, s: number, head = '#e8683b'): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(a);
  ctx.scale(s, s);
  roundRect(ctx, -3, -2, 6, 26, 3);
  fillStroke(ctx, '#9a6a44', 3);
  roundRect(ctx, -12, -14, 24, 14, 4);
  fillStroke(ctx, head, 3);
  ctx.restore();
}

// ───────────────────────────── glyphs ─────────────────────────────

const GLYPHS: Record<string, (ctx: Ctx) => void> = {
  bonkRing: (ctx) => {
    circle(ctx, 48, 50, 26);
    ctx.lineWidth = 6;
    ctx.strokeStyle = 'rgba(255,200,120,0.6)';
    ctx.stroke();
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2;
      mallet(ctx, 48 + Math.sin(a) * 24, 50 - Math.cos(a) * 24, a, 0.9);
    }
  },
  thistleDarts: (ctx) => {
    for (let i = 0; i < 3; i++) {
      ctx.save();
      ctx.translate(26 + i * 16, 66 - i * 10);
      ctx.rotate(-0.8);
      ctx.beginPath();
      ctx.moveTo(0, -24);
      ctx.lineTo(6, 6);
      ctx.lineTo(-6, 6);
      ctx.closePath();
      fillStroke(ctx, '#c8ff9a', 4);
      ctx.beginPath();
      ctx.moveTo(-9, 14);
      ctx.lineTo(0, 4);
      ctx.lineTo(9, 14);
      fillStroke(ctx, '#6fc24a', 4);
      ctx.restore();
    }
  },
  lanterns: (ctx) => {
    const g = ctx.createRadialGradient(48, 52, 4, 48, 52, 36);
    g.addColorStop(0, 'rgba(255,240,150,0.9)');
    g.addColorStop(1, 'rgba(255,240,150,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, S, S);
    roundRect(ctx, 32, 34, 32, 36, 8);
    fillStroke(ctx, '#fff1a0');
    roundRect(ctx, 28, 26, 40, 9, 4);
    fillStroke(ctx, '#b07a3a', 4);
    roundRect(ctx, 28, 69, 40, 9, 4);
    fillStroke(ctx, '#b07a3a', 4);
    ctx.beginPath();
    ctx.arc(48, 24, 8, Math.PI, 0);
    outline(ctx, 4);
    ctx.stroke();
  },
  drumBurst: (ctx) => {
    star(ctx, 48, 40, 34, 8, 0.5);
    ctx.fillStyle = 'rgba(255,190,80,0.85)';
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(48, 52, 24, 9, 0, 0, Math.PI * 2);
    ctx.rect(24, 52, 48, 20);
    ctx.ellipse(48, 72, 24, 9, 0, 0, Math.PI);
    fillStroke(ctx, '#d9603b');
    ctx.beginPath();
    ctx.ellipse(48, 52, 24, 9, 0, 0, Math.PI * 2);
    fillStroke(ctx, '#f4e2c0');
  },
  zapJar: (ctx) => {
    roundRect(ctx, 28, 30, 40, 50, 12);
    fillStroke(ctx, 'rgba(200,235,255,0.9)');
    roundRect(ctx, 34, 20, 28, 12, 4);
    fillStroke(ctx, '#9a6a44', 4);
    ctx.beginPath();
    ctx.moveTo(52, 36);
    ctx.lineTo(40, 56);
    ctx.lineTo(50, 56);
    ctx.lineTo(42, 76);
    ctx.lineTo(58, 50);
    ctx.lineTo(48, 50);
    ctx.closePath();
    fillStroke(ctx, '#ffe066', 3);
  },
  wobbleDisc: (ctx) => {
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath();
    ctx.arc(48, 48, 34, 2.4, 4.4);
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(52, 50, 26, 18, -0.4, 0, Math.PI * 2);
    fillStroke(ctx, '#8ff0e8');
    ctx.beginPath();
    ctx.ellipse(52, 50, 10, 7, -0.4, 0, Math.PI * 2);
    fillStroke(ctx, '#2a8a84', 4);
  },
  emberSeeds: (ctx) => {
    ctx.beginPath();
    ctx.moveTo(48, 14);
    ctx.quadraticCurveTo(74, 44, 60, 62);
    ctx.quadraticCurveTo(48, 72, 36, 62);
    ctx.quadraticCurveTo(22, 44, 48, 14);
    fillStroke(ctx, '#ff7a3d');
    ctx.beginPath();
    ctx.moveTo(48, 34);
    ctx.quadraticCurveTo(60, 50, 52, 60);
    ctx.quadraticCurveTo(48, 64, 44, 60);
    ctx.quadraticCurveTo(36, 50, 48, 34);
    ctx.fillStyle = '#ffe066';
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(48, 74, 14, 10, 0, 0, Math.PI * 2);
    fillStroke(ctx, '#a86a3a');
  },
  wispBees: (ctx) => {
    ctx.beginPath();
    ctx.ellipse(36, 34, 14, 9, -0.6, 0, Math.PI * 2);
    ctx.ellipse(60, 34, 14, 9, 0.6, 0, Math.PI * 2);
    fillStroke(ctx, 'rgba(255,255,255,0.85)', 4);
    ctx.beginPath();
    ctx.ellipse(48, 56, 18, 22, 0, 0, Math.PI * 2);
    fillStroke(ctx, '#c6a8ff');
    ctx.fillStyle = '#6a4ab0';
    ctx.fillRect(32, 52, 32, 6);
    ctx.fillRect(34, 64, 28, 5);
    circle(ctx, 42, 46, 3);
    ctx.fillStyle = '#231c2e';
    ctx.fill();
    circle(ctx, 54, 46, 3);
    ctx.fill();
  },
  frostFan: (ctx) => {
    for (let i = 0; i < 5; i++) {
      const a = -0.9 + i * 0.45;
      ctx.save();
      ctx.translate(48, 78);
      ctx.rotate(a);
      ctx.beginPath();
      ctx.moveTo(0, -60);
      ctx.lineTo(7, -30);
      ctx.lineTo(0, -14);
      ctx.lineTo(-7, -30);
      ctx.closePath();
      fillStroke(ctx, i % 2 ? '#e6fbff' : '#a8e6ff', 4);
      ctx.restore();
    }
  },
  // passives
  whetstone: (ctx) => {
    ctx.beginPath();
    ctx.moveTo(18, 62);
    ctx.lineTo(54, 30);
    ctx.lineTo(80, 38);
    ctx.lineTo(44, 72);
    ctx.closePath();
    fillStroke(ctx, '#aeb4c0');
    star(ctx, 66, 24, 10, 4, 0.3);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  },
  quickspring: (ctx) => {
    outline(ctx, 7);
    ctx.beginPath();
    for (let i = 0; i <= 40; i++) {
      const t = i / 40;
      ctx.lineTo(48 + Math.sin(t * Math.PI * 9) * 20, 18 + t * 60);
    }
    ctx.stroke();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#7fe0c0';
    ctx.stroke();
  },
  bigHat: (ctx) => {
    ctx.beginPath();
    ctx.ellipse(48, 66, 38, 12, 0, 0, Math.PI * 2);
    fillStroke(ctx, '#8a5ae0');
    ctx.beginPath();
    ctx.moveTo(30, 64);
    ctx.lineTo(44, 16);
    ctx.lineTo(66, 64);
    ctx.closePath();
    fillStroke(ctx, '#b07cff');
    ctx.fillStyle = '#ffd34d';
    ctx.fillRect(33, 54, 30, 7);
  },
  echoShell: (ctx) => {
    ctx.beginPath();
    for (let i = 0; i <= 60; i++) {
      const t = i / 60;
      const r = 4 + t * 30;
      const a = t * Math.PI * 4;
      ctx.lineTo(48 + Math.cos(a) * r, 50 + Math.sin(a) * r);
    }
    ctx.lineTo(48, 50);
    fillStroke(ctx, '#ffb3c7');
  },
  swiftBoots: (ctx) => {
    ctx.beginPath();
    ctx.moveTo(30, 18);
    ctx.lineTo(56, 18);
    ctx.lineTo(56, 52);
    ctx.lineTo(80, 60);
    ctx.lineTo(80, 76);
    ctx.lineTo(26, 76);
    ctx.closePath();
    fillStroke(ctx, '#5fb0ff');
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 4;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(8, 34 + i * 12);
      ctx.lineTo(22, 34 + i * 12);
      ctx.stroke();
    }
  },
  heartyStew: (ctx) => {
    ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    ctx.lineWidth = 4;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(34 + i * 14, 34);
      ctx.quadraticCurveTo(28 + i * 14, 24, 36 + i * 14, 14);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(14, 46);
    ctx.lineTo(82, 46);
    ctx.quadraticCurveTo(80, 82, 48, 82);
    ctx.quadraticCurveTo(16, 82, 14, 46);
    fillStroke(ctx, '#ff7a6b');
    ctx.beginPath();
    ctx.ellipse(48, 46, 34, 7, 0, 0, Math.PI * 2);
    fillStroke(ctx, '#e8a35a', 4);
  },
  mossyCharm: (ctx) => {
    ctx.beginPath();
    ctx.moveTo(48, 14);
    ctx.quadraticCurveTo(84, 40, 48, 82);
    ctx.quadraticCurveTo(12, 40, 48, 14);
    fillStroke(ctx, '#7ccf5a');
    ctx.beginPath();
    ctx.moveTo(48, 22);
    ctx.lineTo(48, 76);
    outline(ctx, 3);
    ctx.stroke();
  },
  lodestone: (ctx) => {
    outline(ctx, 18);
    ctx.beginPath();
    ctx.arc(48, 44, 22, Math.PI, 0);
    ctx.lineTo(70, 70);
    ctx.moveTo(26, 44);
    ctx.lineTo(26, 70);
    ctx.stroke();
    ctx.lineWidth = 11;
    ctx.strokeStyle = '#ff5f5f';
    ctx.stroke();
    ctx.fillStyle = '#e8eef4';
    ctx.fillRect(20, 64, 13, 12);
    ctx.fillRect(64, 64, 13, 12);
  },
  cloverButton: (ctx) => {
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      circle(ctx, 48 + Math.cos(a) * 15, 46 + Math.sin(a) * 15, 14);
      fillStroke(ctx, '#4fd36b', 4);
    }
    circle(ctx, 48, 46, 6);
    ctx.fillStyle = '#2f9a48';
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(48, 52);
    ctx.quadraticCurveTo(52, 70, 62, 82);
    outline(ctx, 5);
    ctx.stroke();
  },
  kettleLid: (ctx) => {
    ctx.beginPath();
    ctx.ellipse(48, 60, 36, 16, 0, Math.PI, 0);
    ctx.lineTo(84, 64);
    ctx.lineTo(12, 64);
    ctx.closePath();
    fillStroke(ctx, '#9aa3ad');
    circle(ctx, 48, 40, 9);
    fillStroke(ctx, '#6a7380', 4);
  },
  hourglassSand: (ctx) => {
    ctx.beginPath();
    ctx.moveTo(26, 18);
    ctx.lineTo(70, 18);
    ctx.lineTo(50, 48);
    ctx.lineTo(70, 78);
    ctx.lineTo(26, 78);
    ctx.lineTo(46, 48);
    ctx.closePath();
    fillStroke(ctx, 'rgba(220,240,255,0.9)');
    ctx.beginPath();
    ctx.moveTo(32, 76);
    ctx.lineTo(64, 76);
    ctx.lineTo(48, 58);
    ctx.closePath();
    ctx.fillStyle = '#f2c46b';
    ctx.fill();
    ctx.fillStyle = '#9a6a44';
    ctx.fillRect(20, 12, 56, 8);
    ctx.fillRect(20, 76, 56, 8);
  },
  velocityFeather: (ctx) => {
    ctx.beginPath();
    ctx.moveTo(20, 80);
    ctx.quadraticCurveTo(30, 20, 80, 14);
    ctx.quadraticCurveTo(70, 60, 20, 80);
    fillStroke(ctx, '#dff6ff');
    ctx.beginPath();
    ctx.moveTo(20, 80);
    ctx.quadraticCurveTo(48, 50, 76, 18);
    outline(ctx, 3);
    ctx.stroke();
  },
  scholarsBookmark: (ctx) => {
    roundRect(ctx, 18, 22, 60, 52, 6);
    fillStroke(ctx, '#e8a75a');
    ctx.fillStyle = '#fff8ec';
    ctx.fillRect(24, 28, 48, 40);
    ctx.beginPath();
    ctx.moveTo(56, 22);
    ctx.lineTo(56, 84);
    ctx.lineTo(62, 76);
    ctx.lineTo(68, 84);
    ctx.lineTo(68, 22);
    fillStroke(ctx, '#e8423f', 3);
  },
  heal: (ctx) => {
    ctx.beginPath();
    ctx.ellipse(48, 56, 32, 22, 0, 0, Math.PI * 2);
    fillStroke(ctx, '#e8a35a');
    ctx.beginPath();
    ctx.ellipse(48, 48, 24, 10, 0, 0, Math.PI * 2);
    ctx.fillStyle = '#fff0d8';
    ctx.fill();
    circle(ctx, 48, 36, 8);
    fillStroke(ctx, '#e8233f', 4);
  },
  gold: (ctx) => {
    circle(ctx, 48, 50, 28);
    fillStroke(ctx, '#ffcc33');
    circle(ctx, 48, 50, 16);
    ctx.strokeStyle = '#d99a1e';
    ctx.lineWidth = 4;
    ctx.stroke();
  },
  kills: (ctx) => {
    star(ctx, 48, 50, 34, 6, 0.5);
    fillStroke(ctx, '#ffd34d');
    mallet(ctx, 48, 54, 0.5, 1.1);
  },
};

/** Evolved weapons reuse their base glyph on a golden plate. */
const EVOLVED_BASE: Record<string, string> = {
  quakeCrown: 'bonkRing',
  thornstorm: 'thistleDarts',
  everglow: 'lanterns',
  skyDrum: 'drumBurst',
  stormBottle: 'zapJar',
  cometDisc: 'wobbleDisc',
  wildfire: 'emberSeeds',
  queenSwarm: 'wispBees',
  glacierBloom: 'frostFan',
};

export type IconKind = 'weapon' | 'passive' | 'misc' | 'locked';

export function iconUrl(id: string, kind: IconKind = 'weapon'): string {
  const key = `${kind}:${id}`;
  const hit = cache.get(key);
  if (hit) return hit;
  let url = '';
  try {
    const c = document.createElement('canvas');
    c.width = c.height = S;
    const ctx = c.getContext('2d');
    if (ctx) {
      const evolvedBase = EVOLVED_BASE[id];
      if (kind === 'locked') bg(ctx, '#3a3350', '#241e36', '#5a5070');
      else if (evolvedBase) bg(ctx, '#ffe48a', '#e0a020', '#fff3c4');
      else if (kind === 'weapon') bg(ctx, '#5a3f9a', '#2f2160', '#8a70d0');
      else if (kind === 'passive') bg(ctx, '#2a7f78', '#174a48', '#5ac0b4');
      else bg(ctx, '#4a3f66', '#2a2140', '#7a6aa0');
      const glyph = GLYPHS[evolvedBase ?? id];
      if (kind === 'locked') {
        ctx.fillStyle = '#8a80a8';
        ctx.font = '900 54px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('?', 48, 52);
      } else if (glyph) {
        ctx.save();
        glyph(ctx);
        ctx.restore();
        if (evolvedBase) {
          star(ctx, 78, 18, 12, 5, 0.45);
          fillStroke(ctx, '#ffffff', 3);
        }
      }
      url = c.toDataURL('image/png');
    }
  } catch {
    url = '';
  }
  cache.set(key, url);
  return url;
}

/** Character portrait (simple stylised face). */
export function portraitUrl(id: string, colors: { primary: number; secondary: number; accent: number; skin: number }, locked = false): string {
  const key = `portrait:${id}:${locked}`;
  const hit = cache.get(key);
  if (hit) return hit;
  let url = '';
  try {
    const c = document.createElement('canvas');
    c.width = c.height = S * 2;
    const ctx = c.getContext('2d');
    if (ctx) {
      ctx.scale(2, 2);
      bg(ctx, hex(colors.primary), hex(colors.primary, 0.55), 'rgba(255,255,255,0.4)');
      ctx.save();
      if (locked) ctx.filter = 'brightness(0) opacity(0.55)';
      if (id === 'thea') {
        circle(ctx, 48, 48, 30);
        fillStroke(ctx, hex(colors.accent));
        circle(ctx, 48, 56, 24);
        fillStroke(ctx, hex(colors.skin));
        circle(ctx, 48, 18, 10);
        fillStroke(ctx, hex(colors.accent), 4);
        ctx.fillStyle = '#231c2e';
        ctx.fillRect(38, 52, 5, 8);
        ctx.fillRect(53, 52, 5, 8);
        ctx.fillStyle = '#e86a6a';
        ctx.fillRect(44, 68, 8, 3);
        mallet(ctx, 78, 70, 0.6, 0.9);
      } else if (id === 'pip') {
        for (let i = 0; i < 9; i++) {
          const a = -Math.PI + (i / 8) * Math.PI;
          ctx.beginPath();
          ctx.moveTo(48 + Math.cos(a) * 22, 54 + Math.sin(a) * 22);
          ctx.lineTo(48 + Math.cos(a) * 40, 54 + Math.sin(a) * 40);
          ctx.lineTo(48 + Math.cos(a + 0.25) * 22, 54 + Math.sin(a + 0.25) * 22);
          fillStroke(ctx, '#5a3b26', 3);
        }
        circle(ctx, 48, 56, 26);
        fillStroke(ctx, hex(colors.primary));
        ctx.beginPath();
        ctx.ellipse(48, 64, 18, 15, 0, 0, Math.PI * 2);
        fillStroke(ctx, hex(colors.secondary), 4);
        circle(ctx, 48, 62, 4);
        ctx.fillStyle = '#231c2e';
        ctx.fill();
        circle(ctx, 38, 50, 4);
        ctx.fill();
        circle(ctx, 58, 50, 4);
        ctx.fill();
        roundRect(ctx, 24, 76, 48, 8, 4);
        fillStroke(ctx, hex(colors.accent), 3);
      } else {
        ctx.beginPath();
        ctx.ellipse(48, 74, 40, 20, 0, Math.PI, 0);
        fillStroke(ctx, hex(colors.primary));
        circle(ctx, 48, 50, 20);
        fillStroke(ctx, hex(colors.skin));
        ctx.beginPath();
        ctx.moveTo(26, 38);
        ctx.lineTo(48, 4);
        ctx.lineTo(70, 38);
        ctx.closePath();
        fillStroke(ctx, '#5a4b8a');
        ctx.beginPath();
        ctx.moveTo(42, 62);
        ctx.lineTo(48, 82);
        ctx.lineTo(54, 62);
        fillStroke(ctx, '#f8f4ea', 3);
        ctx.fillStyle = '#231c2e';
        ctx.fillRect(40, 48, 5, 5);
        ctx.fillRect(51, 48, 5, 5);
        roundRect(ctx, 74, 36, 14, 16, 3);
        fillStroke(ctx, hex(colors.accent), 3);
      }
      ctx.restore();
      if (locked) {
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.font = '900 40px system-ui, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('?', 48, 50);
      }
      url = c.toDataURL('image/png');
    }
  } catch {
    url = '';
  }
  cache.set(key, url);
  return url;
}
