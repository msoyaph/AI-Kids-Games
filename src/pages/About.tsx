import { Link } from 'react-router-dom';
import { usePageMeta } from '../lib/meta';
import { Icon } from '../components/Icon';
export default function About() {
  usePageMeta('About','Ai Kids Games is a small, cheerful collection of original browser games.');
  return <div className="container inner-page about-page"><div className="page-heading"><img src="/favicon.svg" alt="Our playful gamepad mascot" width="100" height="100" /><h1>Made for a little<br />more play.</h1><p>Curiosity, courage, and the joy of finding something new.</p></div><div className="about-story"><h2>Welcome to Ai Kids Games.</h2><p>We’re starting small: two original games, a cozy island preview, and a brave little hero with a big hammer. Pick a world, press play, and see where your curiosity takes you.</p><p>There’s no feed to keep up with and no scoreboard to chase here. Just games to explore at your own pace, and a heart button to keep your favorites close.</p><p>The artwork on this website is an original illustration of each game’s world. The actual games open when you press Play.</p><div className="about-buttons"><Link to="/games" className="button primary">Find your adventure<Icon name="arrow" size={18} /></Link><Link to="/parents" className="text-link">Read our play promise</Link></div></div></div>;
}
