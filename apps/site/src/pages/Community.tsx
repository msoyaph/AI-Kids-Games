import { Link } from 'react-router-dom';
import { communityGames } from '../data/community';
import GameGrid from '../components/GameGrid';

/** Community games: made by kids and families from the starter, checked and approved by the owner. */
export default function Community() {
  return <div className="container page">
    <div className="page-head"><h1 className="display">Community games</h1>
      <p className="muted">Games made by kids and families, often with an AI helper. Every one is checked by our automated tests and approved by a person before it appears here.</p></div>
    {communityGames.length ? <GameGrid games={communityGames} label="Community games" />
      : <div className="empty"><h2 className="heading">No community games yet.</h2><p>Be the first: build a kid-safe game from our starter and send it in.</p><Link className="button primary" to="/list-your-game">How to submit a game</Link></div>}
    <section className="section prose" aria-labelledby="how-safe"><h2 id="how-safe" className="title">How community games stay safe</h2>
      <ul>
        <li>Each one passes the same checks as our own games: no ads, purchases, chat, accounts or network requests, saves only on your device, and no fast flashing.</li>
        <li>A person plays every game and reads every word in it before approving it.</li>
        <li>Community games run from their own separate web address, so they can’t reach this site or each other’s saves.</li>
        <li>Spotted a problem? Each game’s page has a <strong>Report a problem</strong> link.</li>
      </ul>
      <p><Link to="/list-your-game">Submit a game</Link> · <Link to="/faq">Parent FAQ</Link></p>
    </section>
  </div>;
}
