import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon';
import GameStrip from '../components/GameStrip';

export default function NotFound() {
  return <div className="container not-found">
    <h1 className="display">This page wandered off.</h1>
    <p className="muted">Let’s head back and find a game.</p>
    <Link className="button primary" to="/"><Icon name="home" />Back to home</Link>
    <div style={{ width: '100%',marginTop: 32 }}><GameStrip label="Or jump into a game" /></div>
  </div>;
}
