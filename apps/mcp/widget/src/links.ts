// Links go only to the website and the project's GitHub repo, never with query strings or tracking
// parameters, and always the host's way (host.openLink).
import { REPO } from '../../src/config';

export function safeLink(url: string,siteOrigin: string) {
  try {
    const link = new URL(url), repo = new URL(REPO);
    const ours = link.origin === siteOrigin || (link.origin === repo.origin && (link.pathname === repo.pathname || link.pathname.startsWith(`${repo.pathname}/`)));
    if (!ours || link.protocol !== 'https:' && !link.hostname.match(/^(127\.0\.0\.1|localhost)$/)) return undefined;
    link.search = ''; link.hash = '';
    return link.href;
  } catch { return undefined; }
}
