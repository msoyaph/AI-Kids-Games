import { Fragment } from 'react';
import { Link } from 'react-router-dom';
import { games } from '../data/games';
import { PROFILES } from '../data/site';
import { REPO } from '../lib/links';
import GameStrip from '../components/GameStrip';
import { TrailerInline } from '../components/Trailer';

export default function About() {
  return <div className="container page">
    <div className="page-head"><h1 className="display">About</h1></div>
    <div className="prose">
      <p>Kids deserve the same fun as everyone else: racing, building, exploring and defending, without ads, loot boxes, subscriptions or strangers in chat. AI Kids Games takes the kinds of games kids already love and rebuilds them from scratch to be kid-safe by design. Every game is free, runs offline in a single file, and is open source, so anyone can learn from it, remix it, or make their own.</p>
      <p>Today there are {games.length} games: {games.map((game,index) => <Fragment key={game.slug}>{index ? index === games.length-1 ? ' and ' : ', ' : ''}<Link to={`/game/${game.slug}`}>{game.title}</Link></Fragment>)}. There’s nothing to sign up for and nothing to buy: pick a game, press Play and keep your favorites close with the heart.</p>
      <p>Each game starts from a written brief and is built with AI coding tools, then checked with automated tests on computers, tablets and phones before every release. Every brief and every line of code is public on <a href={REPO}>GitHub</a>.</p>
      <p>Follow along on <a href={PROFILES[1]}>YouTube</a> and <a href={PROFILES[2]}>Facebook</a>, and read the <Link to="/faq">parent FAQ</Link> for the details.</p>
    </div>
    <section className="section" aria-labelledby="the-trailer"><h2 id="the-trailer" className="title" style={{ marginBottom: 16 }}>The trailer</h2><TrailerInline /></section>
    <section className="section" aria-labelledby="the-games"><h2 id="the-games" className="title" style={{ marginBottom: 16 }}>The games</h2><GameStrip label="The games" /></section>
  </div>;
}
