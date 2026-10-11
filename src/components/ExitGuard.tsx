import { useEffect, useRef, useState } from 'react';
export default function ExitGuard() {
  const [destination,setDestination] = useState<string | null>(null); const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const intercept = (event: MouseEvent) => {
      const link = (event.target as Element)?.closest?.('a[href]') as HTMLAnchorElement | null;
      if (!link) return;
      const url = new URL(link.href,location.href);
      if (url.origin !== location.origin) { event.preventDefault(); event.stopPropagation(); if (url.protocol === 'http:' || url.protocol === 'https:') setDestination(url.href); }
    };
    document.addEventListener('click',intercept,true);
    document.addEventListener('auxclick',intercept,true);
    return () => { document.removeEventListener('click',intercept,true); document.removeEventListener('auxclick',intercept,true); };
  },[]);
  useEffect(() => { if (destination) dialog.current?.showModal(); else dialog.current?.close(); },[destination]);
  return <dialog ref={dialog} className="exit-dialog" aria-labelledby="exit-title" aria-describedby="exit-description" onCancel={() => setDestination(null)} onClose={() => setDestination(null)}><h2 id="exit-title" className="title">You’re leaving Ai Kids Games</h2><p id="exit-description">Ask a grown-up first!</p><p>The next website may have different rules.</p><div className="actions"><button className="button primary" autoFocus onClick={() => setDestination(null)}>Stay here</button><button className="button secondary" onClick={() => { if (destination) window.open(destination,'_blank','noopener,noreferrer'); setDestination(null); }}>A grown-up says it’s okay</button></div></dialog>;
}
