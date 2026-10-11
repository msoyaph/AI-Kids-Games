import { Link } from 'react-router-dom';
import { usePageMeta } from '../lib/meta';

export default function Privacy() {
  usePageMeta('Privacy','Ai Kids Games has no accounts, ads, analytics or tracking. Game progress stays on your device.');
  return <div className="container page">
    <div className="page-head"><h1 className="display">Privacy</h1><p className="muted">Updated October 11, 2026</p></div>
    <div className="prose">
      <h2 className="heading">What we collect</h2>
      <p>Nothing about you or your child. Ai Kids Games has no accounts, sign-ups, ads, analytics, tracking or cookies, and it never asks for names, emails or photos.</p>
      <h2 className="heading" style={{ marginTop: 32 }}>What stays on your device</h2>
      <p>Game progress and settings, favorites and recently played are saved in this browser’s local storage. They stay on this device and are never sent to us. Clearing your browser data removes them. You can clear the lists on the <Link to="/parents">For parents</Link> page; each game manages its own saves.</p>
      <h2 className="heading" style={{ marginTop: 32 }}>Hosting</h2>
      <p>The site is hosted by Vercel. Like any web host, Vercel processes standard request data, such as IP addresses, browser type and the pages requested, to deliver the site and keep it secure. We don’t use that data to identify or track anyone. See <a href="https://vercel.com/legal/privacy-policy">Vercel’s privacy policy</a>.</p>
      <h2 className="heading" style={{ marginTop: 32 }}>Other websites</h2>
      <p>The games and site load only from this site. Any link to another website asks a grown-up first.</p>
    </div>
  </div>;
}
