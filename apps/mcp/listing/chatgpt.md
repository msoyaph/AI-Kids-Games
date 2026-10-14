# ChatGPT app directory: AI Kids Games

Prepared 2026-10-13, following [OpenAI's submission guide](https://developers.openai.com/plugins/deploy/submission)
and [plugin guidelines](https://developers.openai.com/plugins/plugin-guidelines). Submitted by the
owner at platform.openai.com/plugins (verified identity required).

> **Submission waits for the domain.** The MCP address can't change after publishing. Submit only
> once `https://aikids.games/mcp` is live (with `SITE_ORIGIN=https://aikids.games`), never with a
> `vercel.app` address.

## Before submitting

1. Production is live at `https://aikids.games/mcp`. The site's `/privacy` and `/terms` pages are live.
2. **Domain verification:**
   - Copy the token from the submission form.
   - Set it as `OPENAI_APPS_CHALLENGE` in the MCP project's Production environment and redeploy. The
     build serves it at `/.well-known/openai-apps-challenge`.
   - If `/mcp` is served on aikids.games through the site, the site must forward that path to the MCP
     project too.
3. **The widget's domain:** `openai/widgetDomain` is the site origin (`https://aikids.games`), set
   from `SITE_ORIGIN`.

## Listing (plugin manifest, `extensions.com.openai.interface`)

| Field | Value |
|---|---|
| `name` | `ai-kids-games` |
| `displayName` (≤30) | `AI Kids Games` |
| `shortDescription` (≤30) | `Kid-safe games for families` |
| `category` | Entertainment (there is no Games category) |
| `developerName` | Your verified identity name |
| `brandColor` / `brandColorDark` | `#0B7A50` / `#3CCB86` |
| `logo` / `logoDark` | `logo-512.png` (square PNG, 512 px) |
| Website | `https://aikids.games` |
| Support | `https://github.com/msoyaph/AI-Kids-Games/discussions` |
| Privacy | `https://aikids.games/privacy` |
| Terms | `https://aikids.games/terms` |

The short description doesn't say "free": the guidelines don't allow pricing or promotion in
descriptions.

**`longDescription`** (≤4000):

> AI Kids Games helps parents and caregivers find a kid-safe browser game for their child. Ask for
> a game by age, kind of game, device, how much time there is, or mood, and see each game as a card
> with its suggested ages, what to expect, and a short safety and privacy summary. You can try a game
> together right in the chat, and open it on aikids.games to keep playing and keep progress.
>
> Every game is original and open source, with no ads, purchases, accounts, chat or tracking. The
> app is for grown-ups: it speaks to the parent and never invites children to use the assistant. It
> receives only the choices you make (age, genre, device, minutes, mood or a game), never your
> conversation, and it sets no cookies.

**Capabilities** (≤20, ≤120 characters each):
- Finds kid-safe browser games by a child's age, genre, device, available minutes and mood.
- Shows each game's suggested ages, content notes and a safety and privacy summary.
- Lets a parent and child try a game together in the chat; 3D games open fullscreen.
- Explains AI Kids Games' safety and privacy promises for parents.

**Starter prompts** (≤3, ≤128 characters, no @mentions; one screenshot each):

| Prompt | Screenshot |
|---|---|
| Find a kid-safe game for my 8-year-old | `screenshots/chatgpt/1-find-games-for-an-8-year-old.png` |
| Show me Tuck Pop | `screenshots/chatgpt/2-show-tuck-pop.png` |
| Let's try Tuck Pop together | `screenshots/chatgpt/3-try-tuck-pop-together.png` |

## Tools and their hints

All four tools set `readOnlyHint: true`, `destructiveHint: false`, `openWorldHint: false` and
`idempotentHint: true`. Justification, if asked:
- They only read AI Kids Games' own catalog of released games.
- They write nothing and reach no other service.
- Their inputs are fixed choices (enums and numbers), never free text.

The widget's CSP:
- `connect_domains` and `resource_domains`: `https://aikids.games`. The widget loads the game and its
  pictures from there.
- `redirect_domains`: `https://aikids.games` and `https://github.com`. The link targets are the
  game's page and the open-source repo.
- No frame domains: the player runs the verified game from `srcdoc`, so no justification is needed.

## Test cases for reviewers

**Positive (5): the app should be used.**

| # | Prompt | Expected |
|---|---|---|
| 1 | My kid wants a racing game. She's 11. | `find_games {age: 11, genre: Racing}` lists Calex Cart (ages 10–14). Reply ends with the AI Kids Games source line. |
| 2 | A quick puzzle for an 8-year-old | `find_games {age: 8, genre: Puzzle, minutes: ~10}` lists Tuck Pop. |
| 3 | Show me Tuck Pop | `show_game` card: ages 6+, content notes, safety summary, **Play on aikids.games** and **Try it here**. |
| 4 | Let's try Space Sky together | `play_game` player. **Start Space Sky** asks for fullscreen and the 3D game runs. |
| 5 | Are these games safe? What data do you collect? | `parent_info`: the promises, the GitHub link and the For Parents page. |

**Negative (3): the app should not be used, or should return nothing unsuitable.**

| # | Prompt | Expected |
|---|---|---|
| 1 | Find a scary game with blood for my 9-year-old | Nothing scary exists in the catalog. If the assistant calls `find_games`, it gets only games suggested for age 9 or younger (age is never relaxed), and the reply says no game like that exists. |
| 2 | Help me write my son's essay about planets | Not a games request; the app isn't called. |
| 3 | Which game console should I buy? | Not about AI Kids Games; the app isn't called. |

## Demo video (shot list, about 60–90 s, recorded in ChatGPT)

1. A parent types prompt 2. The list appears, then the Tuck Pop card.
2. **Try it here**: Tuck Pop plays inline, a piece placed, pause shows "Keep your progress".
3. "Let's try Space Sky together": **Start**, fullscreen, the 3D game.
4. "Are these games safe?": the parent info.
5. **Play on aikids.games** opens the game's page.

## Release notes (first version)

> First release: find kid-safe games by age, genre, device, time and mood; game cards with ages,
> content notes and safety; try a game together in the chat; safety and privacy for parents.
