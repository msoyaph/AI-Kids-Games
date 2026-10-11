import { Link } from 'react-router-dom';
import { usePageMeta } from '../lib/meta';
import { Icon } from '../components/Icon';

export default function NotFound() {
  usePageMeta('Page not found','This page wandered off. Head back home to find a game.');
  return <div className="container not-found">
    <h1 className="display">This page wandered off.</h1>
    <p className="muted">Let’s head back and find a game.</p>
    <Link className="button primary" to="/"><Icon name="home" />Back to home</Link>
  </div>;
}
