import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { REPO } from '../lib/links';

const needs = [
  ['Kid-safe by design','No ads, purchases, loot boxes, subscriptions, accounts, chat or tracking, and no personal information.'],
  ['Original work','Its own name, characters, art and music. No other companies’ games, characters or trademarks.'],
  ['One file that stays put','A single HTML file that works offline and makes no requests to other websites.'],
  ['Saves that play nicely','Every saved setting uses the game’s own storage name, and never touches anything else.'],
  ['Right for its ages','Honest age guidance and content notes, gentle flashing, readable text and big touch targets.'],
  ['Open source','Its code is public, so grown-ups and the community can read every line.']
] as const;

export default function ListYourGame() {
  return <div className="container page">
    <div className="page-head"><p className="soon-badge">Coming soon</p><h1 className="display">List your game on AI Kids Games</h1><p className="muted">We’re getting ready to list kid-safe games made by others, right next to our own.</p></div>
    <section className="section" aria-labelledby="needs"><h2 id="needs" className="title" style={{ marginBottom: 16 }}>What a listed game needs</h2>
      <ul className="promises">{needs.map(([title,text]) => <li key={title}><Icon name="check" /><div><strong>{title}</strong><p className="muted">{text}</p></div></li>)}</ul>
    </section>
    <div className="prose">
      <h2 className="heading">How to get in line</h2>
      <p>This website never collects any information, so there’s no form here. Listing requests happen on GitHub, where every game is built in the open: open a <a href={`${REPO}/issues/new?template=game-listing-request.yml`}>Game listing request</a>. GitHub is for people 13 and older, so kids, ask a grown-up to do it with you, and never share personal information.</p>
      <h2 className="heading">Build your own</h2>
      <p>Every game on AI Kids Games is open source, and the repository has a starter game and a step-by-step guide, including how to build a game with an AI coding assistant: <a href={REPO}>AI Kids Games on GitHub</a>.</p>
      <p>Links to GitHub leave AI Kids Games, so they ask a grown-up first. Questions for parents are answered on the <Link to="/parents">For parents</Link> page.</p>
    </div>
  </div>;
}
