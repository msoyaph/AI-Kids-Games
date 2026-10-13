import { Link } from 'react-router-dom';
import { games } from '../data/games';
import { faq } from '../data/faq';
import { Blocks } from '../lib/rich';

export default function Faq() {
  const questions = faq(games);
  return <div className="container page">
    <div className="page-head"><h1 className="display">Parent FAQ</h1><p className="muted">Plain answers to the questions parents ask most.</p></div>
    <nav className="toc" aria-label="Questions"><ol>{questions.map(item => <li key={item.id}><a href={`#${item.id}`}>{item.question}</a></li>)}</ol></nav>
    <div className="prose faq">{questions.map(item => <section key={item.id} aria-labelledby={item.id}><h2 id={item.id} className="heading">{item.question}</h2><Blocks blocks={item.answer} /></section>)}</div>
    <p className="links"><Link className="text-link" to="/guides">Guides for parents</Link><Link className="text-link" to="/parents">For parents</Link><Link className="text-link" to="/privacy">Privacy</Link></p>
  </div>;
}
