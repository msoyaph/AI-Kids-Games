import type { Container } from 'pixi.js';
import { clamp } from '../core/math';

export interface Insets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/**
 * Pan / zoom transform for the world container. World units are pixels at
 * TILE=64 per cell; the camera fits the map into the free screen area
 * (excluding HUD insets) and allows pinch/wheel zoom and drag panning.
 */
export class Camera {
  scale = 1;
  x = 0;
  y = 0;
  fitScale = 1;
  minScale = 0.5;
  maxScale = 2.5;
  private viewW = 1;
  private viewH = 1;
  private insets: Insets = { top: 0, right: 0, bottom: 0, left: 0 };
  /** Shake offset (screen px), applied on top. */
  shakeX = 0;
  shakeY = 0;

  constructor(
    private readonly target: Container,
    private worldW: number,
    private worldH: number,
  ) {}

  setWorldSize(w: number, h: number): void {
    this.worldW = w;
    this.worldH = h;
  }

  /** Fit the whole map into the free area. Keeps relative zoom if `keepZoom`. */
  fit(viewW: number, viewH: number, insets: Insets, keepZoom = false): void {
    const prevRel = this.scale / this.fitScale;
    this.viewW = viewW;
    this.viewH = viewH;
    this.insets = insets;
    const availW = Math.max(50, viewW - insets.left - insets.right);
    const availH = Math.max(50, viewH - insets.top - insets.bottom);
    this.fitScale = Math.min(availW / this.worldW, availH / this.worldH);
    this.minScale = this.fitScale * 0.85;
    // allow zooming in until a tile is ~110 screen px (comfy for small fingers)
    this.maxScale = Math.max(this.fitScale * 1.2, 110 / 64);
    this.scale = keepZoom ? clamp(this.fitScale * prevRel, this.minScale, this.maxScale) : this.fitScale;
    if (!keepZoom) {
      this.x = insets.left + (availW - this.worldW * this.scale) / 2;
      this.y = insets.top + (availH - this.worldH * this.scale) / 2;
    }
    this.clampPan();
    this.apply();
  }

  /** Zoom by factor around a screen point. */
  zoomAt(factor: number, sx: number, sy: number): void {
    const ns = clamp(this.scale * factor, this.minScale, this.maxScale);
    const k = ns / this.scale;
    this.x = sx - (sx - this.x) * k;
    this.y = sy - (sy - this.y) * k;
    this.scale = ns;
    this.clampPan();
    this.apply();
  }

  panBy(dx: number, dy: number): void {
    this.x += dx;
    this.y += dy;
    this.clampPan();
    this.apply();
  }

  /** Keep at least part of the map on screen; centre it when smaller than the view. */
  private clampPan(): void {
    const { top, right, bottom, left } = this.insets;
    const availW = this.viewW - left - right;
    const availH = this.viewH - top - bottom;
    const w = this.worldW * this.scale;
    const h = this.worldH * this.scale;
    const slack = 40;
    if (w <= availW) this.x = clamp(this.x, left - slack, left + availW - w + slack);
    else this.x = clamp(this.x, left + availW - w - slack, left + slack);
    if (h <= availH) this.y = clamp(this.y, top - slack, top + availH - h + slack);
    else this.y = clamp(this.y, top + availH - h - slack, top + slack);
  }

  apply(): void {
    this.target.scale.set(this.scale);
    this.target.position.set(Math.round(this.x + this.shakeX), Math.round(this.y + this.shakeY));
  }

  screenToWorld(sx: number, sy: number): { x: number; y: number } {
    return { x: (sx - this.x) / this.scale, y: (sy - this.y) / this.scale };
  }

  worldToScreen(wx: number, wy: number): { x: number; y: number } {
    return { x: wx * this.scale + this.x, y: wy * this.scale + this.y };
  }

  get zoomedIn(): boolean {
    return this.scale > this.fitScale * 1.05;
  }
}
