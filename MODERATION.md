# Reviewing community games

How the owner reviews, approves, declines, updates and unlists community games
([SUBMITTING.md](SUBMITTING.md) is the creator's side). One rule above all: **nothing from a
community submission goes live without the owner's approval**, recorded in the game's `game.json`
by the owner's own pull request and tied to the exact source that was reviewed.

## How the pieces fit

- A submission is a pull request that changes only `community/<slug>/` (source only). CI checks the
  scope, the DCO sign-offs and the fields only the owner may set, then runs
  `npm run check-submission -- <slug>`. Fork pull requests run under `pull_request` only, with
  read-only permissions and no secrets, after the owner approves the workflow run.
- Merged as `"listing": "submitted"`, a game is still **not** on the live site: production builds
  serve only games with `"listing": "listed"` and an `approval` whose `sourceSha256` matches the
  game's current source (`scripts/lib/community.ts`). Any later change to the source takes it off
  the live site until it's approved again.
- Community games are built from source by the `ai-kids-games-play` Vercel project (`apps/play`)
  and served from their own address, `aikg-<slug>.vercel.app`. Its policy allows no connections at
  all, and only the website may frame it. They are **never** copied into `apps/site/public/games/`.
- Previews (pull requests) of both projects include unreviewed games marked **Preview**, behind
  Vercel sign-in. Vercel builds previews of fork pull requests only after the owner approves them.

## 1. Before anything runs

For a first-time contributor, GitHub asks the owner to approve the workflow run. Look at the
**Files changed** tab first: everything must be inside one `community/<slug>/` folder. Approve the
run only then. (The checks would fail it anyway; this keeps strangers' code off the runners.)

A pull request runs with the workflow files *it* contains, so one that edits `.github/` could make
its own checks pass. That's why the scope check isn't enough on its own: **never merge a community
pull request whose Files changed tab shows anything outside its `community/<slug>/` folder**, even
with CI green.

## 2. Review

```bash
npm run review-submission -- <PR>
```

This checks the pull request out into its own git worktree at `.review/pr-<n>/tree` and runs this
checkout's trusted tools against it. **The submission's own unit tests never run on your machine**
(`--untrusted`); its code is only bundled with our build setup and played inside Chromium. It
writes `.review/pr-<n>/REVIEW.md` with:

- what the game is (the manifest), the check results and the build size;
- **every piece of text in the game**, with file and line;
- the risky code patterns and the capabilities it uses (fullscreen, gamepads...);
- screenshots of every screen it reached and a 20-second recording;
- the approve or decline checklist.

Read every text line, watch the recording, and read the source: games are small. To play it
yourself:

```bash
AIKG_COMMUNITY_ROOT=.review/pr-<n>/tree/community npm run dev:community -- <slug>
```

or open the play project's preview link for the pull request (Vercel sign-in).

**Approve only if all of these hold:** every check passed and any "!" notes are fine in context;
it's fun, finished and fits the stated ages; all the text is friendly, honest and age-appropriate,
and nothing asks for personal details or points elsewhere; it looks original; nothing in the code
looks hidden, encoded or out of place; the manifest is honest.

## 3a. Decline

```bash
npm run review-submission -- <PR> --decline "the reason, in kind words"
```

This writes a friendly comment to `.review/pr-<n>/decline.md` and prints the `gh pr comment` and
`gh pr close` commands; posting is your choice. Common reasons: a failing check; another company's
name or characters; content that doesn't fit the stated ages; an unfinished game; text that asks for
personal details. If it's fixable, leave the pull request open so the creator can push a fix, and
review again.

## 3b. Approve

1. **Merge the pull request** (CI green). It stays off the live site while its listing is
   `"submitted"`.
2. **Record the approval** on an up-to-date, clean `main`:

   ```bash
   npm run review-submission -- <PR> --approve
   ```

   It refuses unless the review passed and the merged source matches what you reviewed. It writes
   `approval` (you, the date, the reviewed commit, the source and report fingerprints),
   `"listing": "listed"` and `submitted.sourceCommit` into the game's `game.json`. It also adds a
   cover, share image and screenshots from the review to `apps/site/public/media/community/<slug>/`.
   Then it prints the commands for the approval pull request.
3. **Open the approval pull request** with those commands (signed-off commit, branch
   `approve-<slug>`). The scope check accepts the art and the changed fields only in the owner's own
   pull request.
4. **Give the game its address** once the approval is merged:

   ```bash
   vercel domains add aikg-<slug>.vercel.app ai-kids-games-play --scope real-tours
   ```

5. **Release.** The game goes live with the next release of the website and the play project; both
   production builds need the owner's release approval (`apps/site/DEPLOYMENT.json`).

## Updates

A creator updates a game with a new pull request. Review it the same way. Once it's merged, the old
approval no longer matches the source, so the game stays off the live site until you run
`--approve` again. Approve before the next release, or the game is left out of that release.

## Unlisting

Set `"listing": "unlisted"` in the game's `game.json`, in your own signed-off pull request, then
release. Nothing is deleted: the source and history stay, and listing it again needs a new approval.
In an emergency, unlist first and investigate afterwards. You may also remove its address with
`vercel domains rm aikg-<slug>.vercel.app`.

## Reports

Each community game's page links to the **Report a problem with a community game** issue form, with
the game filled in. Read reports promptly. If one points to a child-safety problem (content, personal data, scary or
unkind text, anything that leaves the game), unlist the game first, then reply. Security problems go
through private advisories (see [SECURITY.md](SECURITY.md)).

## Never

- Never copy a community game into `apps/site/public/games/` or serve it from the website's origin.
- Never run `npm install`, its tests or its scripts from a submission on your machine; use the review
  kit.
- Never use `pull_request_target`, secrets or write permissions for community pull requests, and
  never weaken the scope check.
- Never approve without having read `REVIEW.md` and played the game.
