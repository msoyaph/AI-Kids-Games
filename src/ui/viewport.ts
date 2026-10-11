// The on-screen keyboard: on iPhone and iPad it covers the page without resizing it, so menus follow
// the *visual* viewport (--vvt / --vvh) and the focused text field is scrolled into view. Android
// resizes the page itself (interactive-widget=resizes-content in index.html).
export function installViewport(): void {
  const vv = typeof window !== 'undefined' ? window.visualViewport : null;
  const root = document.documentElement;
  const sync = () => {
    if (!vv) return;
    root.style.setProperty('--vvt', `${Math.round(vv.offsetTop)}px`);
    root.style.setProperty('--vvh', `${Math.round(vv.height)}px`);
    const f = document.activeElement;
    if (f instanceof HTMLInputElement || f instanceof HTMLTextAreaElement) f.scrollIntoView({ block: 'nearest' });
  };
  vv?.addEventListener('resize', sync);
  vv?.addEventListener('scroll', sync);
  window.addEventListener('resize', sync);
  // a text field getting focus: keep it in view once the keyboard has slid up
  document.addEventListener('focusin', (e) => {
    const t = e.target;
    if (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement) {
      setTimeout(() => t.scrollIntoView({ block: 'center' }), 300);
    }
  });
  sync();
}
