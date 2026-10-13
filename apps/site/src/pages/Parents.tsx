import { useState } from 'react';
import { Link } from 'react-router-dom';
import { games } from '../data/games';
import { usePreferences } from '../lib/preferences';
import { Icon } from '../components/Icon';
import { mediaFor } from '../lib/media';
import { faq } from '../data/faq';
import { Blocks } from '../lib/rich';

export default function Parents() {
  const { clearHistory } = usePreferences(); const [cleared,setCleared] = useState(false);
  return <div className="container page">
    <div className="page-head"><h1 className="display">For parents</h1><p className="muted">The games kids love. None of the stuff parents don’t.</p></div>
    <ul className="promises">
      <li><Icon name="check" /><div><strong>No ads or tracking</strong><p className="muted">No advertising, analytics, tracking pixels or outside scripts. Everything loads from this site.</p></div></li>
      <li><Icon name="check" /><div><strong>No accounts or chat</strong><p className="muted">No sign-ups, messages, uploads or online players. Kids pick a game and play.</p></div></li>
      <li><Icon name="check" /><div><strong>Progress stays on this device</strong><p className="muted">Game saves, favorites and recently played live in this browser. We never receive them. Read the <Link to="/privacy">privacy page</Link>.</p></div></li>
    </ul>
    <section className="section" aria-labelledby="the-games"><h2 id="the-games" className="title" style={{ marginBottom: 16 }}>The games</h2>
      <table className="games-table"><thead><tr><th scope="col">Game</th><th scope="col">Age</th><th scope="col">What to expect</th></tr></thead>
        <tbody>{games.map(game => <tr key={game.slug}><th scope="row"><Link to={`/game/${game.slug}`}><img src={mediaFor(game).cover} alt="" width={96} height={54} loading="lazy" />{game.title}</Link></th><td className="age">{game.ageGuidance}</td><td>{game.contentNotes}</td></tr>)}</tbody></table>
    </section>
    <section className="section prose" aria-labelledby="tips"><h2 id="tips" className="title">Tips for grown-ups</h2>
      <p>Ages are our suggestion, not an official rating. Try a game together and decide what feels right. Take breaks, and help younger players with the controls.</p>
      <p>Saves are kept in this browser only, so clearing browser data removes them. Each game has its own save controls. Links to other websites ask a grown-up first.</p>
      {/* Devices and requirements, generated from the game manifests (the same answer as the FAQ). */}
      <Blocks blocks={faq(games).find(item => item.id === 'devices')!.answer} />
    </section>
    <section className="section prose" aria-labelledby="questions"><h2 id="questions" className="title">Questions?</h2>
      <p>The <Link to="/faq">parent FAQ</Link> answers the common ones: what’s free, what data is collected, ages, devices and offline play. Our <Link to="/guides">guides for parents</Link> cover choosing ad-free games, what makes a game kid-safe, and building a first game with your kid.</p>
    </section>
    <section className="section prose" aria-labelledby="makers"><h2 id="makers" className="title">Made in the open</h2>
      <p>Every game here is open source, so you can read exactly what it does. Families and young makers can build their own kid-safe games from the same starter, and listing games made by others is coming soon: see <Link to="/list-your-game">List your game</Link>.</p>
    </section>
    <section className="section panel" aria-labelledby="fresh-start"><div><h2 id="fresh-start" className="heading">Clear saved lists</h2><p>Removes favorites and recently played on this device. Game saves stay.</p></div>
      <button className="button secondary" onClick={() => { clearHistory(); setCleared(true); }}>Clear saved lists</button>
      {cleared && <p className="status" role="status"><Icon name="check" />Your saved lists have been cleared.</p>}</section>
  </div>;
}
