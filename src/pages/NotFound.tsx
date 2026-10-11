import { Link } from 'react-router-dom';
import { usePageMeta } from '../lib/meta';
import { Icon } from '../components/Icon';
export default function NotFound() {
  usePageMeta('Oops! Page not found','This page wandered off. Let’s find another adventure at Ai Kids Games.');
  return <div className="container empty-state not-found"><span className="lost-number">4<img src="/favicon.svg" alt="A little lost gamepad" width="100" height="100" />4</span><h1>Oops, this page wandered off!</h1><p>Let’s head back and find a new adventure.</p><Link className="button primary" to="/">Back to home<Icon name="home" size={18} /></Link></div>;
}
