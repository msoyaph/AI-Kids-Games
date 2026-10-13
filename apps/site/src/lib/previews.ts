/**
 * One controller for every gameplay preview on the page, so at most one video plays at a time.
 * - Desktop (hover: hover): a hovered or focused card plays; otherwise an "auto" preview
 *   (the home hero or details page) plays while at least half in view.
 * - Touch (hover: none): the preview at least 60% in view and nearest the viewport center plays.
 * - Never with prefers-reduced-motion or Save-Data; a failed video keeps showing its still.
 * Videos get no source until they are first chosen, so nothing downloads before it is needed.
 */
export interface PreviewEntry {
  root: HTMLElement;
  video: HTMLVideoElement;
  sources: { webm: string; mp4: string };
  auto: boolean;
  onPlaying(playing: boolean): void;
  ratio: number;
  activeAt: number;
  loaded: boolean;
  failed: boolean;
}

const REDUCED = '(prefers-reduced-motion: reduce)', TOUCH = '(hover: none)';
const saveData = () => !!(navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;
export const previewsAllowed = () => typeof window !== 'undefined' && !matchMedia(REDUCED).matches && !saveData();

class PreviewController {
  private entries = new Set<PreviewEntry>();
  private byRoot = new Map<Element,PreviewEntry>();
  private current: PreviewEntry | null = null;
  private observer: IntersectionObserver | null = null;
  private frame = 0;

  register(entry: PreviewEntry) {
    if (!this.observer) this.start();
    this.entries.add(entry); this.byRoot.set(entry.root,entry);
    this.observer!.observe(entry.root);
    const fail = () => { entry.failed = true; entry.onPlaying(false); this.schedule(); };
    const playing = () => entry.onPlaying(true), paused = () => entry.onPlaying(false);
    entry.video.addEventListener('error',fail); entry.video.addEventListener('playing',playing); entry.video.addEventListener('pause',paused);
    return () => {
      this.observer?.unobserve(entry.root); this.entries.delete(entry); this.byRoot.delete(entry.root);
      entry.video.removeEventListener('error',fail); entry.video.removeEventListener('playing',playing); entry.video.removeEventListener('pause',paused);
      if (this.current === entry) { entry.video.pause(); this.current = null; }
      this.schedule();
    };
  }

  /** A card is hovered or focused (desktop), or no longer is. */
  setActive(entry: PreviewEntry,active: boolean) { entry.activeAt = active ? performance.now() : 0; this.schedule(); }

  private start() {
    this.observer = new IntersectionObserver(records => { for (const record of records) { const entry = this.byRoot.get(record.target); if (entry) entry.ratio = record.isIntersecting ? record.intersectionRatio : 0; } this.schedule(); },{ threshold: [0,.25,.5,.6,.75,.9,1] });
    for (const query of [REDUCED,TOUCH]) matchMedia(query).addEventListener('change',() => this.schedule());
    addEventListener('scroll',() => { if (matchMedia(TOUCH).matches) this.schedule(); },{ passive: true });
    addEventListener('resize',() => this.schedule(),{ passive: true });
  }

  private schedule() { cancelAnimationFrame(this.frame); this.frame = requestAnimationFrame(() => this.update()); }

  private choose(): PreviewEntry | null {
    if (!previewsAllowed()) return null;
    const ready = [...this.entries].filter(entry => !entry.failed);
    if (matchMedia(TOUCH).matches) {
      // nearest the middle of the screen: by row first, then (cards side by side) by column
      const middle = innerHeight/2, centre = innerWidth/2;
      const distance = (entry: PreviewEntry) => { const box = entry.root.getBoundingClientRect(); return Math.round(Math.abs(box.top+box.height/2-middle))*10000+Math.abs(box.left+box.width/2-centre); };
      return ready.filter(entry => entry.ratio >= .6).sort((a,b) => distance(a)-distance(b))[0] ?? null;
    }
    const hovered = ready.filter(entry => entry.activeAt > 0).sort((a,b) => b.activeAt-a.activeAt)[0];
    return hovered ?? ready.find(entry => entry.auto && entry.ratio >= .5) ?? null;
  }

  private update() {
    const next = this.choose();
    for (const entry of this.entries) if (entry !== next && !entry.video.paused) entry.video.pause();
    this.current = next;
    if (!next) return;
    const { video } = next;
    if (!next.loaded) {
      next.loaded = true;
      for (const [type,src] of [['video/webm',next.sources.webm],['video/mp4',next.sources.mp4]] as const) {
        const source = document.createElement('source'); source.type = type; source.src = src; video.append(source);
      }
      video.querySelector('source:last-of-type')?.addEventListener('error',() => { next.failed = true; next.onPlaying(false); this.schedule(); });
      video.load();
    }
    if (video.paused) video.play().catch(() => { /* Autoplay can be refused; the still stays visible. */ });
  }
}

export const previews = new PreviewController();
