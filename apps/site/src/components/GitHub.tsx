import type { Game } from '../data/games';
import { REPO } from '../lib/links';

// Links to the open-source code on GitHub. The marks are Octicons (MIT), drawn inline, so nothing
// loads from GitHub until someone follows a link, and every link leaves the site through the
// grown-up check (ExitGuard).

export function GitHubMark({ size = 22 }: { size?: number }) {
  return <svg aria-hidden="true" focusable="false" width={size} height={size} viewBox="0 0 16 16" fill="currentColor"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z" /></svg>;
}

function ForkMark({ size = 18 }: { size?: number }) {
  return <svg aria-hidden="true" focusable="false" width={size} height={size} viewBox="0 0 16 16" fill="currentColor"><path d="M5 5.372v.878c0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75v-.878a2.25 2.25 0 1 1 1.5 0v.878a2.25 2.25 0 0 1-2.25 2.25h-1.5v2.128a2.251 2.251 0 1 1-1.5 0V8.5h-1.5A2.25 2.25 0 0 1 3.5 6.25v-.878a2.25 2.25 0 1 1 1.5 0ZM5 3.25a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Zm6.75.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5Zm-3 8.75a.75.75 0 1 0-1.5 0 .75.75 0 0 0 1.5 0Z" /></svg>;
}

/** The header's box: the whole project on GitHub (the mark alone on phones). */
export function RepoBox() {
  return <a className="repo-box" href={REPO} aria-label="AI Kids Games on GitHub: the open-source code" title="Open source on GitHub"><GitHubMark /><span className="repo-box-label">GitHub</span></a>;
}

/** Where a game's own code lives in the repository. */
export const gameCodeUrl = (game: Pick<Game,'slug' | 'community'>) => `${REPO}/tree/main/${game.community ? 'community' : 'games'}/${game.slug}`;

/**
 * One game's box: its own folder of code, and Fork. GitHub forks a whole repository, never one
 * folder, so Fork copies the project; each game's README says how to run and change it on its own.
 */
export function GameRepoBox({ game }: { game: Pick<Game,'slug' | 'title' | 'community'> }) {
  return <span className="repo-group" role="group" aria-label={`${game.title} on GitHub`}>
    <a className="repo-part" href={gameCodeUrl(game)} aria-label={`${game.title}’s code on GitHub`} title={`${game.title}’s code on GitHub`}><GitHubMark size={18} /><span>Code</span></a>
    <a className="repo-part" href={`${REPO}/fork`} aria-label={`Fork AI Kids Games on GitHub to make your own ${game.title}`} title="Fork on GitHub (copies the whole project)"><ForkMark /><span>Fork</span></a>
  </span>;
}
