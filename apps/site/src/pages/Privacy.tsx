import { Link } from 'react-router-dom';

export default function Privacy() {
  return <div className="container page">
    <div className="page-head"><h1 className="display">Privacy</h1><p className="muted">Updated October 13, 2026</p></div>
    <div className="prose">
      <h2 className="heading">What we collect</h2>
      <p>Nothing about you or your child. AI Kids Games has no accounts, sign-ups, ads, analytics, tracking or cookies, and it never asks for names, emails or photos.</p>
      <h2 className="heading">What stays on your device</h2>
      <p>Game progress and settings, favorites, recently played and which one-time tips you’ve answered are saved in this browser’s local storage. They stay on this device and are never sent to us. Clearing your browser data removes them. You can clear the lists on the <Link to="/parents">For parents</Link> page; each game manages its own saves. <Link to="/community">Community games</Link> keep their saves under their own separate address, in the same way.</p>
      <h2 className="heading">Hosting</h2>
      <p>The site, and the separate addresses community games play from, are hosted by Vercel. Like any web host, Vercel processes standard request data, such as IP addresses, browser type and the pages requested, to deliver the site and keep it secure. We don’t use that data to identify or track anyone. See <a href="https://vercel.com/legal/privacy-policy">Vercel’s privacy policy</a>.</p>
      <h2 className="heading">Other websites</h2>
      <p>The site and our own games load only from this site. Each community game loads from its own separate address on the same host, which can’t connect anywhere, reach this site or reach other games. Any link to another website asks a grown-up first.</p>
    </div>
  </div>;
}
