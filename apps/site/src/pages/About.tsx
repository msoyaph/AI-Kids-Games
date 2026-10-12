import { usePageMeta } from '../lib/meta';
import GameStrip from '../components/GameStrip';

export default function About() {
  usePageMeta('About','Ai Kids Games makes free, open-source browser games for kids, with no ads, subscriptions, sign-ups or tracking.');
  return <div className="container page">
    <div className="page-head"><h1 className="display">About</h1></div>
    <div className="prose">
      <p>Kids deserve the same fun as everyone else: racing, building, exploring and defending, without ads, loot boxes, subscriptions or strangers in chat. Ai Kids Games takes the kinds of games kids already love and rebuilds them from scratch to be kid-safe by design. Every game is free, runs offline in a single file, and is open source, so anyone can learn from it, remix it, or make their own.</p>
      <p>Today that means a farm to fix up, a cozy island, a monster-bonking adventure, a tower defense, a trip through space and a kart racer. There’s nothing to sign up for and nothing to buy: pick a game, press Play and keep your favorites close with the heart.</p>
    </div>
    <section className="section" aria-labelledby="the-games"><h2 id="the-games" className="title" style={{ marginBottom: 16 }}>The games</h2><GameStrip label="The games" /></section>
  </div>;
}
