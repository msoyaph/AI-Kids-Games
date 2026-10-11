// DEV-ONLY track editor (loaded with `?editor` on the dev server; never included in production builds).
// Top-down view of a track's control points: drag to move, double-click a segment to insert a point,
// select + Delete to remove, edit elevation/width/bank, live length + overlap check, Test Lap, Export.
import type { App } from '../game/app';
import type { TrackData, TrackPoint } from '../data/types';
import { TRACKS, DEV_TRACKS } from '../data/tracks/index';
import { TrackModel } from '../sim/track/trackModel';
import { pickOpponents } from '../game/modes/roster';

export function openEditor(app: App): void {
  app.ui.clear();
  const all = [...TRACKS, ...DEV_TRACKS];
  let data: TrackData = clone(all[0]);
  let model: TrackModel | null = null;
  let selected = -1;
  let drag = -1;
  let view = { cx: 0, cz: 0, scale: 1 };
  let error = '';

  const root = document.createElement('div');
  root.style.cssText = 'position:absolute;inset:0;display:flex;background:#16123a;color:#fff;font:600 13px system-ui;z-index:500';
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'flex:1;min-width:0;width:0;height:100%;cursor:crosshair';
  const side = document.createElement('div');
  side.style.cssText = 'width:300px;padding:12px;overflow:auto;display:flex;flex-direction:column;gap:8px;background:#221a55';
  root.append(canvas, side);
  document.getElementById('ui')!.appendChild(root);
  const ctx = canvas.getContext('2d')!;

  const select = document.createElement('select');
  for (const t of all) select.add(new Option(`${t.name} (${t.id})`, t.id));
  select.onchange = () => {
    data = clone(all.find((t) => t.id === select.value)!);
    selected = -1;
    fit();
    rebuild();
  };
  const info = document.createElement('div');
  const pointBox = document.createElement('div');
  const btn = (label: string, fn: () => void): HTMLButtonElement => {
    const b = document.createElement('button');
    b.textContent = label;
    b.style.cssText = 'padding:6px 10px;border-radius:8px;border:0;background:#7c5cff;color:#fff;font-weight:800;cursor:pointer';
    b.onclick = fn;
    return b;
  };
  const out = document.createElement('textarea');
  out.style.cssText = 'width:100%;height:160px;font:11px monospace';
  side.append(
    title('Track editor (dev only)'),
    select,
    info,
    pointBox,
    btn('▶ Test lap', () => testLap()),
    btn('⤓ Export points', () => {
      out.value = `points: ${JSON.stringify(data.points.map(round))},`;
      void navigator.clipboard?.writeText(out.value).catch(() => {});
    }),
    btn('✕ Close editor', () => {
      root.remove();
      window.removeEventListener('keydown', onKey);
      app.screens.mainMenu();
    }),
    out,
    hint('Drag points to move · Double-click a segment to add a point · Select + Delete to remove · Wheel to zoom'),
  );

  function title(t: string): HTMLElement {
    const d = document.createElement('div');
    d.textContent = t;
    d.style.cssText = 'font-size:16px;font-weight:900';
    return d;
  }
  function hint(t: string): HTMLElement {
    const d = document.createElement('div');
    d.textContent = t;
    d.style.opacity = '0.75';
    return d;
  }

  function rebuild(): void {
    try {
      model = new TrackModel(data);
      error = '';
    } catch (e) {
      model = null;
      error = String(e);
    }
    const overlaps = model ? countOverlaps(model) : 0;
    info.innerHTML = model ? `Length <b>${model.length.toFixed(0)} m</b> · ${data.points.length} points · overlaps: <b style="color:${overlaps ? '#ff4d6d' : '#8cff6b'}">${overlaps}</b>` : `<span style="color:#ff4d6d">${error}</span>`;
    renderPointBox();
    draw();
  }

  function renderPointBox(): void {
    pointBox.innerHTML = '';
    if (selected < 0) return;
    const p = data.points[selected];
    pointBox.append(title(`Point ${selected}`));
    for (const key of ['x', 'z', 'y', 'w', 'bank'] as const) {
      const row = document.createElement('label');
      row.style.cssText = 'display:flex;justify-content:space-between;gap:8px';
      row.textContent = key;
      const input = document.createElement('input');
      input.type = 'number';
      input.step = key === 'x' || key === 'z' ? '1' : '0.5';
      input.value = String(p[key] ?? '');
      input.style.width = '110px';
      input.onchange = () => {
        const v = input.value === '' ? undefined : Number(input.value);
        if (key === 'x' || key === 'z') p[key] = v ?? 0;
        else (p as unknown as Record<string, number | undefined>)[key] = v;
        rebuild();
      };
      row.appendChild(input);
      pointBox.appendChild(row);
    }
  }

  function fit(): void {
    const xs = data.points.map((p) => p.x);
    const zs = data.points.map((p) => p.z);
    view.cx = (Math.min(...xs) + Math.max(...xs)) / 2;
    view.cz = (Math.min(...zs) + Math.max(...zs)) / 2;
    const span = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...zs) - Math.min(...zs), 100);
    view.scale = (Math.min(canvas.clientWidth, canvas.clientHeight) * 0.85) / span;
  }

  // screen mapping: +X drawn to the LEFT so turns read like the in-game minimap
  const sx = (x: number): number => canvas.width / 2 - (x - view.cx) * view.scale * devicePixelRatio;
  const sy = (z: number): number => canvas.height / 2 - (z - view.cz) * view.scale * devicePixelRatio;
  const wx = (px: number): number => view.cx - (px * devicePixelRatio - canvas.width / 2) / (view.scale * devicePixelRatio);
  const wz = (py: number): number => view.cz - (py * devicePixelRatio - canvas.height / 2) / (view.scale * devicePixelRatio);

  function draw(): void {
    canvas.width = canvas.clientWidth * devicePixelRatio;
    canvas.height = canvas.clientHeight * devicePixelRatio;
    ctx.fillStyle = '#16123a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (model) {
      const rb = model.main;
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#5d6178';
      ctx.lineWidth = data.width * view.scale * devicePixelRatio;
      ctx.beginPath();
      for (let i = 0; i <= rb.n; i++) {
        const j = i % rb.n;
        if (i === 0) ctx.moveTo(sx(rb.px[j]), sy(rb.pz[j]));
        else ctx.lineTo(sx(rb.px[j]), sy(rb.pz[j]));
      }
      ctx.stroke();
      for (const sc of model.shortcuts) {
        ctx.strokeStyle = '#ff9f1c';
        ctx.lineWidth = sc.hw[0] * 2 * view.scale * devicePixelRatio;
        ctx.beginPath();
        for (let i = 0; i < sc.n; i++) (i ? ctx.lineTo : ctx.moveTo).call(ctx, sx(sc.px[i]), sy(sc.pz[i]));
        ctx.stroke();
      }
      // start line
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(sx(rb.px[0]), sy(rb.pz[0]), 6 * devicePixelRatio, 0, Math.PI * 2);
      ctx.fill();
    }
    data.points.forEach((p, i) => {
      ctx.fillStyle = i === selected ? '#ffd23f' : '#4ce0d2';
      ctx.beginPath();
      ctx.arc(sx(p.x), sy(p.z), 7 * devicePixelRatio, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = `${11 * devicePixelRatio}px system-ui`;
      ctx.fillText(`${i}${p.y ? ` y${p.y}` : ''}`, sx(p.x) + 9 * devicePixelRatio, sy(p.z) - 6 * devicePixelRatio);
    });
  }

  const hitPoint = (e: MouseEvent): number => {
    const r = canvas.getBoundingClientRect();
    const mx = (e.clientX - r.left) * devicePixelRatio;
    const my = (e.clientY - r.top) * devicePixelRatio;
    return data.points.findIndex((p) => Math.hypot(sx(p.x) - mx, sy(p.z) - my) < 12 * devicePixelRatio);
  };
  canvas.onpointerdown = (e) => {
    const i = hitPoint(e);
    selected = i;
    drag = i;
    canvas.setPointerCapture(e.pointerId);
    rebuild();
  };
  canvas.onpointermove = (e) => {
    if (drag < 0) return;
    const r = canvas.getBoundingClientRect();
    const p = data.points[drag];
    p.x = Math.round(wx(e.clientX - r.left));
    p.z = Math.round(wz(e.clientY - r.top));
    draw();
  };
  canvas.onpointerup = () => {
    if (drag >= 0) rebuild();
    drag = -1;
  };
  canvas.ondblclick = (e) => {
    const r = canvas.getBoundingClientRect();
    const x = wx(e.clientX - r.left);
    const z = wz(e.clientY - r.top);
    // insert after the nearest segment
    let best = 0;
    let bd = Infinity;
    for (let i = 0; i < data.points.length; i++) {
      const a = data.points[i];
      const b = data.points[(i + 1) % data.points.length];
      const d = Math.hypot((a.x + b.x) / 2 - x, (a.z + b.z) / 2 - z);
      if (d < bd) {
        bd = d;
        best = i;
      }
    }
    data.points.splice(best + 1, 0, { x: Math.round(x), z: Math.round(z) });
    selected = best + 1;
    rebuild();
  };
  canvas.onwheel = (e) => {
    e.preventDefault();
    view.scale *= e.deltaY < 0 ? 1.1 : 0.9;
    draw();
  };
  const onKey = (e: KeyboardEvent): void => {
    if ((e.key === 'Delete' || e.key === 'Backspace') && selected >= 0 && (e.target as HTMLElement).tagName !== 'INPUT' && data.points.length > 4) {
      data.points.splice(selected, 1);
      selected = -1;
      rebuild();
    }
  };
  window.addEventListener('keydown', onKey);

  function testLap(): void {
    if (!model) return;
    root.style.display = 'none';
    if (!app.saves.data) app.saves.create(3, 'Dev');
    app.startSession(
      {
        mode: 'versus',
        trackId: data.id,
        trackData: clone(data),
        speedClass: 'pro',
        mirror: false,
        items: true,
        itemSet: 'all',
        laps: 1,
        players: [{ racerId: app.save.racer, kart: app.save.kart, source: { kind: 'any' } }],
        ai: pickOpponents([app.save.racer], 3, 1),
        seed: 1,
        intro: false,
      },
      () => {
        app.endSession();
        app.ui.clear();
        root.style.display = 'flex';
        rebuild();
      },
    );
  }

  requestAnimationFrame(() => {
    fit();
    rebuild();
  });
}

function clone(t: TrackData): TrackData {
  return JSON.parse(JSON.stringify(t)) as TrackData;
}

function round(p: TrackPoint): TrackPoint {
  const o: TrackPoint = { x: Math.round(p.x), z: Math.round(p.z) };
  if (p.y !== undefined) o.y = Math.round(p.y * 10) / 10;
  if (p.w !== undefined) o.w = p.w;
  if (p.bank !== undefined) o.bank = p.bank;
  return o;
}

function countOverlaps(t: TrackModel): number {
  const rb = t.main;
  let count = 0;
  for (let i = 0; i < rb.n; i += 4) {
    for (let j = i + 60; j < rb.n - (i < 60 ? 60 - i : 0); j += 4) {
      if (Math.abs(rb.py[i] - rb.py[j]) > 5.5) continue;
      const d = Math.hypot(rb.px[i] - rb.px[j], rb.pz[i] - rb.pz[j]);
      if (d < rb.hw[i] + rb.hw[j] + Math.max(rb.shL[i], rb.shR[i]) * 2) count++;
    }
  }
  return count;
}
