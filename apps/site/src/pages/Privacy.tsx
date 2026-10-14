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
      <h2 className="heading">In AI assistants</h2>
      <p>You can add the AI Kids Games app to an AI assistant such as ChatGPT or Claude. The assistant’s company runs the conversation, and its own privacy policy covers what you type there. Our app never sees your conversation.</p>
      <p>When the assistant uses the app, our server receives only the choices it passes on: a child’s age, a kind of game, a device, how many minutes there are to play, a mood, or which game to show. It never receives free text, names or messages. Assistants may add their own details to each request, such as a language setting, an approximate location or anonymous identifiers; we don’t use, keep or log them. To keep the service from being overloaded, each server counts requests from a network address for one minute, using a scrambled form of the address that is never stored or logged. The app sets no cookies and logs nothing. Vercel keeps its standard request records, as for this site; the choices aren’t in them.</p>
      <p>Showing a game card or playing a game in the assistant loads the game and its pictures from this site, like a visit. Progress made there is saved in the assistant’s own storage, which it may clear; play on this site to keep it. The card also stores one date there, to tell whether saves last. Nothing in that storage is sent to us.</p>
      <h2 className="heading">Other websites</h2>
      <p>The site and our own games load only from this site. Each community game loads from its own separate address on the same host, which can’t connect anywhere, reach this site or reach other games. Any link to another website asks a grown-up first.</p>
    </div>
  </div>;
}
