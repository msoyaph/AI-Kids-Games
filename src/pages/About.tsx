import { usePageMeta } from '../lib/meta';
import GameStrip from '../components/GameStrip';

export default function About() {
  usePageMeta('About','Ai Kids Games is a small collection of original games for kids.');
  return <div className="container page">
    <div className="page-head"><h1 className="display">About</h1></div>
    <div className="prose">
      <p>Ai Kids Games is a small collection of original games: a cozy island, a monster-bonking adventure, a tower defense, a trip through space and a kart racer.</p>
      <p>There’s nothing to sign up for and nothing to buy. Pick a game, press Play and keep your favorites close with the heart.</p>
    </div>
    <section className="section" aria-labelledby="the-games"><h2 id="the-games" className="title" style={{ marginBottom: 16 }}>The games</h2><GameStrip label="The games" /></section>
  </div>;
}
