import { Link } from 'react-router-dom';
import { Icon } from '../components/Icon';
import { REPO } from '../lib/links';

const needs = [
  ['Kid-safe by design','No ads, purchases, loot boxes, subscriptions, accounts, chat or tracking, and no personal information.'],
  ['Original work','Its own name, characters, art and music. No other companies’ games, characters or trademarks.'],
  ['One file, no internet','Built from your source into one file that makes no network requests at all: art and sounds are made in code.'],
  ['Saves that play nicely','Everything it saves uses the game’s own storage name, and it never touches anything else.'],
  ['Gentle and readable','Honest ages and content notes, at most 3 flashes a second, readable text, 48 px touch targets and keyboard play.'],
  ['Open source (MIT)','Its source is public, so grown-ups and the community can read every line.']
] as const;

const PROMPT = 'Make a small game for a 7-year-old in this folder (community/my-game). Keep the starter’s structure: src/main.ts, src/sim.ts, src/render.ts and src/storage.ts, the test hook and the ?scene= capture routes. Draw everything in code and make sounds with Web Audio: no images, fonts or anything from the internet. Then run npm run check-submission -- my-game and fix every problem it reports.';

export default function ListYourGame() {
  return <div className="container page">
    <div className="page-head"><h1 className="display">Submit a game to AI Kids Games</h1><p className="muted">Made a kid-safe game? You can send it in to be listed in <Link to="/community">Community games</Link>. Here’s how, step by step.</p></div>
    <section className="section" aria-labelledby="needs"><h2 id="needs" className="title" style={{ marginBottom: 16 }}>What every game needs</h2>
      <ul className="promises">{needs.map(([title,text]) => <li key={title}><Icon name="check" /><div><strong>{title}</strong><p className="muted">{text}</p></div></li>)}</ul>
    </section>
    <div className="prose">
      <h2 className="heading">1. Get a grown-up and a computer</h2>
      <p>Games are submitted on GitHub, which is for people 13 and older. Kids, ask a parent or guardian to do it with you, and never share personal information. You’ll need a free GitHub account, Git and Node.js on a computer.</p>
      <h2 className="heading">2. Start from the starter</h2>
      <p>Fork <a href={REPO}>the AI Kids Games repository</a> on GitHub, open your copy on your computer, then run:</p>
      <ol>
        <li><code>npm ci</code> to install the shared tools;</li>
        <li><code>npm run new-community-game -- my-game --handle @your-nickname</code> to start your game in <code>community/my-game/</code> (use a nickname, never your real name);</li>
        <li><code>npm run dev:community -- my-game</code> to play it while you build.</li>
      </ol>
      <h2 className="heading">3. Build it, with an AI helper if you like</h2>
      <p>Change the rules, drawings and sounds to make it yours, and describe it honestly in <code>game.json</code>. An AI coding assistant can help: the folder has instructions for it. For example, you could ask:</p>
      <p className="prompt-example">“{PROMPT}”</p>
      <h2 className="heading">4. Check it</h2>
      <p><code>npm run check-submission -- my-game</code> runs every check our reviewers run: the build, no outside access, storage, the words in your game, a 20-second play test, flash safety and touch targets. Each problem comes with a fix. Run it until everything passes.</p>
      <h2 className="heading">5. Open a pull request</h2>
      <p>Commit with <code>git commit -s</code> (the “-s” signs off that it’s yours to share), push, and open a pull request with the <strong>Game submission</strong> template. It may change only your own <code>community/my-game/</code> folder. The full guide is <a href={`${REPO}/blob/main/SUBMITTING.md`}>SUBMITTING.md</a>.</p>
      <h2 className="heading">6. What happens next</h2>
      <p>Our automated checks run again, then a person plays your game and reads every word in it. If it’s ready, it’s approved and listed in Community games, with credit to your nickname. If something needs fixing, you’ll get a friendly note on your pull request. Approved games can be unlisted later if a problem turns up; see <a href={`${REPO}/blob/main/MODERATION.md`}>how reviews work</a>.</p>
      <p>Links to GitHub leave AI Kids Games, so they ask a grown-up first. Questions for parents are answered in the <Link to="/faq">Parent FAQ</Link>.</p>
    </div>
  </div>;
}
