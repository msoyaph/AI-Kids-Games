import { Link } from 'react-router-dom';
import { usePageMeta } from '../lib/meta';
import { Icon } from '../components/Icon';

export default function About() {
  usePageMeta('About','Ai Kids Games is a small collection of original games for kids.');
  return <div className="container page">
    <div className="page-head"><h1 className="display">About</h1></div>
    <div className="prose">
      <p>Ai Kids Games is a small collection of original games: a cozy island, a monster-bonking adventure, a tower defense, a trip through space and a kart racer.</p>
      <p>There’s nothing to sign up for and nothing to buy. Pick a game, press Play and keep your favorites close with the heart.</p>
      <p style={{ marginTop: 24 }}><Link className="button primary" to="/games"><Icon name="grid" />See the games</Link></p>
    </div>
  </div>;
}
