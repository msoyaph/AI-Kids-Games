import { Link } from 'react-router-dom';
import { REPO } from '../lib/links';

export default function Terms() {
  return <div className="container page">
    <div className="page-head"><h1 className="display">Terms of use</h1><p className="muted">Updated October 13, 2026</p></div>
    <div className="prose">
      <h2 className="heading">Free to play</h2>
      <p>AI Kids Games and its games are free to play in a web browser, at home or in a classroom. There’s nothing to buy, no ads and no account. Please don’t try to break the site or the games, or use them to harm anyone.</p>
      <h2 className="heading">For families</h2>
      <p>The games are made for children, with a grown-up nearby. The ages on each game are our suggestion, not an official rating, so try a game together and decide what feels right. See <Link to="/parents">For parents</Link>.</p>
      <h2 className="heading">Open source</h2>
      <p>The code of the website and of every game is open source under the <a href={`${REPO}/blob/main/LICENSE`}>MIT License</a>: you may use, copy, change and share it under that license.</p>
      <h2 className="heading">Our name and logo</h2>
      <p>The AI Kids Games name and logo, and the games’ own titles and characters, are not covered by the MIT License. If you publish your own version, give it its own name and look, as our <a href={`${REPO}/blob/main/BRAND.md`}>brand guidelines</a> explain.</p>
      <h2 className="heading">Community games</h2>
      <p><Link to="/community">Community games</Link> are made by other people. Each one passes the same checks as ours and is approved by a person before it appears, and each plays from its own separate address.</p>
      <h2 className="heading">In AI assistants</h2>
      <p>These terms also cover the AI Kids Games app for AI assistants such as ChatGPT and Claude. The assistant you use has its own terms and age rules. What the app receives is on the <Link to="/privacy">privacy page</Link>.</p>
      <h2 className="heading">No warranty</h2>
      <p>We work hard to keep the site and the games safe and working, but they are provided as they are, without warranties of any kind, as the MIT License says. We can’t promise they will always be available or free of mistakes, and, as far as the law allows, we aren’t liable for any loss from using them.</p>
      <h2 className="heading">Changes and questions</h2>
      <p>We may update these terms; the date at the top shows the latest version. Questions are welcome in the project’s <a href={`${REPO}/discussions`}>GitHub Discussions</a>.</p>
    </div>
  </div>;
}
