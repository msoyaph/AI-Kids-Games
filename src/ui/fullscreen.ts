// Full screen, only where the browser really allows it for a game: not on iPhone (Safari only lets
// videos go full screen), and not inside an iframe that wasn't given permission.
type FsDoc = Document & { webkitFullscreenEnabled?: boolean; webkitFullscreenElement?: Element | null; webkitExitFullscreen?: () => void };
type FsEl = HTMLElement & { webkitRequestFullscreen?: () => void };

export function fullscreenSupported(): boolean {
  try {
    const d = document as FsDoc;
    const el = document.documentElement as FsEl;
    const enabled = d.fullscreenEnabled === true || d.webkitFullscreenEnabled === true;
    return enabled && (typeof el.requestFullscreen === 'function' || typeof el.webkitRequestFullscreen === 'function');
  } catch {
    return false;
  }
}

export function isFullscreen(): boolean {
  const d = document as FsDoc;
  return !!(d.fullscreenElement ?? d.webkitFullscreenElement);
}

export function toggleFullscreen(): void {
  try {
    const d = document as FsDoc;
    const el = document.documentElement as FsEl;
    if (isFullscreen()) {
      if (d.exitFullscreen) void d.exitFullscreen().catch(() => {});
      else d.webkitExitFullscreen?.();
    } else if (el.requestFullscreen) void el.requestFullscreen({ navigationUI: 'hide' }).catch(() => {});
    else el.webkitRequestFullscreen?.();
  } catch {
    /* not allowed here */
  }
}
