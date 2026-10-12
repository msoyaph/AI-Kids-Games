import { recommendTier, type DeviceSignals, type QualityTier } from '../systems/quality';

export interface DeviceInfo extends DeviceSignals {
  recommended: QualityTier;
}

/** Reads cheap device signals (touch, cores, memory, GPU name) to guess a starting quality tier. */
export function detectDevice(gl: WebGL2RenderingContext | null): DeviceInfo {
  const nav = navigator as Navigator & { deviceMemory?: number };
  let touch = false;
  try {
    touch = matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0;
  } catch {
    touch = false;
  }
  const ua = nav.userAgent || '';
  const small = typeof screen !== 'undefined' && Math.min(screen.width, screen.height) < 820;
  // iPadOS reports a desktop Mac user agent, but has touch points.
  const ipad = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
  const mobile = (touch && /Android|iPhone|iPad|iPod|Mobile|Silk|Kindle/i.test(ua)) || ipad || (touch && small);
  const cores = nav.hardwareConcurrency || 4;
  const memoryGb = nav.deviceMemory ?? (mobile ? 4 : 8);
  let gpu = '';
  if (gl) {
    try {
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      gpu = String(gl.getParameter(ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER) || '');
    } catch {
      gpu = '';
    }
  }
  const signals: DeviceSignals = { touch, mobile, cores, memoryGb, gpu };
  return { ...signals, recommended: recommendTier(signals) };
}
