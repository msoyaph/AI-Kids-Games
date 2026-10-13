import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { promptInstall, useInstallWay } from '../lib/install';
import { Icon } from './Icon';

/**
 * "Add to Home" beside Play: the browser's own install prompt where there is one, otherwise the
 * steps in a dialog (Escape, Got it or the backdrop closes it, focus goes back). The dialog lives
 * on <body>, outside the hero's live region; React events still reach the hero, so the carousel
 * holds still while it is open.
 */
export default function AddToHome() {
  const way = useInstallWay();
  const dialog = useRef<HTMLDialogElement>(null);
  const [steps,setSteps] = useState<'apple' | 'menu' | null>(null);
  useEffect(() => { const node = dialog.current; if (node && steps && !node.open) node.showModal(); },[steps]);
  if (!way) return null;
  return <>
    <button type="button" className="button secondary add-home" onClick={() => { if (way === 'prompt') void promptInstall(); else setSteps(way); }}><Icon name="add" size={20} />Add to Home</button>
    {createPortal(<dialog ref={dialog} className="install-dialog" aria-labelledby="install-title" onClose={() => setSteps(null)} onClick={event => { if (event.target === dialog.current) dialog.current?.close(); }}>
      {steps && <>
        <Icon name="add" size={30} />
        <h2 id="install-title">Add Ai Kids Games to your Home Screen</h2>
        {steps === 'apple' ? <ol>
          <li>In Safari, tap <strong>Share</strong> <Icon name="share" size={18} /> (on newer iPhones it’s in the <strong>•••</strong> menu).</li>
          <li>Choose <strong>Add to Home Screen</strong>, then <strong>Add</strong>.</li>
          <li>Open <strong>Ai Kids Games</strong> from your Home Screen.</li>
        </ol> : <ol>
          <li>Open your browser’s menu (<strong>⋮</strong> or <strong>•••</strong>).</li>
          <li>Choose <strong>Add to Home screen</strong> or <strong>Install app</strong>.</li>
          <li>Open <strong>Ai Kids Games</strong> from your Home Screen.</li>
        </ol>}
        {steps === 'apple' && <p>Games on the Home Screen keep their own progress: saves from Safari don’t carry over there, and saves made there stay there.</p>}
        <button type="button" className="button primary" autoFocus onClick={() => dialog.current?.close()}>Got it</button>
      </>}
    </dialog>,document.body)}
  </>;
}
