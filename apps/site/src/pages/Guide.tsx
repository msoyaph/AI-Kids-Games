import { Link, useParams } from 'react-router-dom';
import { findGuide,guides } from '../data/guides';
import { guideBodies,readingMinutes } from '../data/guide-bodies';
import { Blocks } from '../lib/rich';
import { Icon } from '../components/Icon';
import NotFound from './NotFound';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
/** "2026-10-13" → "October 13, 2026", the same in every time zone. */
const day = (date: string) => { const [year,month,dayOfMonth] = date.split('-').map(Number); return `${MONTHS[month!-1]} ${dayOfMonth}, ${year}`; };

export default function Guide() {
  const { slug } = useParams(); const guide = findGuide(slug);
  if (!guide) return <NotFound />;
  const others = guides.filter(item => item.slug !== guide.slug);
  return <div className="container page">
    <Link className="back-link" to="/guides"><Icon name="back" size={20} />All guides</Link>
    <article className="article">
      <header className="page-head"><h1 className="display">{guide.title}</h1><p className="muted">{guide.description}</p>
        <p className="article-meta">{guide.updated === guide.published ? 'Published' : 'Updated'} <time dateTime={guide.updated}>{day(guide.updated)}</time> · {readingMinutes(guide.slug)} min read</p></header>
      <div className="prose"><Blocks blocks={guideBodies[guide.slug]!} /></div>
    </article>
    <section className="section" aria-labelledby="more-guides"><h2 id="more-guides" className="title" style={{ marginBottom: 16 }}>More guides</h2>
      <ul className="guide-list">{others.map(item => <li key={item.slug}><Link className="guide-card" to={`/guides/${item.slug}`}><h3 className="heading">{item.title}</h3><p>{item.description}</p></Link></li>)}</ul></section>
  </div>;
}
