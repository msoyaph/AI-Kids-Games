import { Link } from 'react-router-dom';
import { guides } from '../data/guides';
import { readingMinutes } from '../data/guide-bodies';

export default function Guides() {
  return <div className="container page">
    <div className="page-head"><h1 className="display">Guides for parents</h1><p className="muted">Short, practical reads about kids and games, from the people who make AI Kids Games.</p></div>
    <ul className="guide-list">{guides.map(guide => <li key={guide.slug}><Link className="guide-card" to={`/guides/${guide.slug}`}><h2 className="heading">{guide.title}</h2><p>{guide.description}</p><span className="muted">{readingMinutes(guide.slug)} min read</span></Link></li>)}</ul>
    <p className="links"><Link className="text-link" to="/faq">Parent FAQ</Link><Link className="text-link" to="/parents">For parents</Link></p>
  </div>;
}
