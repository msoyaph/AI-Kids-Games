# Claude connector directory: AI Kids Games

Prepared 2026-10-13, following
[Anthropic's submission guide](https://claude.com/docs/connectors/building/submission) and the
[Software Directory Policy](https://support.claude.com/en/articles/13145358-anthropic-software-directory-policy).
Submitted by the owner at claude.ai/directory/manage (Pro, Max, Team or Enterprise), under
**Submit new → MCP connector**.

> Submit once `https://aikids.games/mcp` is in production. The listing's slug is permanent.

## Connection

| Field | Value |
|---|---|
| URL | `https://aikids.games/mcp` (Streamable HTTP) |
| Authentication | None |
| Test account | Not applicable: no sign-in, every tool works for everyone |

## Listing

| Field | Value |
|---|---|
| Name (≤100) | `AI Kids Games` |
| Slug (permanent) | `ai-kids-games` |
| One-liner (≤200) | Find kid-safe, ad-free browser games for your child by age, genre, device, time or mood, and try one together right in the chat. |
| Categories | Entertainment; Education (pick from the portal's list) |
| Documentation | `https://github.com/msoyaph/AI-Kids-Games/tree/main/apps/mcp` |
| Privacy policy | `https://aikids.games/privacy` |
| Support | `https://github.com/msoyaph/AI-Kids-Games/discussions` |
| Icon | `logo-512.png` |
| Allowed link URIs | `https://aikids.games`. Third-party domains like github.com are removed, so the GitHub link always asks first. |

**Description** (≤2000):

> AI Kids Games helps parents and caregivers find a kid-safe browser game for their child. Ask for
> a game by age, kind of game, device, how much time there is, or mood. Each game appears as a card
> with its suggested ages, what to expect, and a short safety and privacy summary. You can try a game
> together right in the conversation; bigger 3D games open full screen. Then play on aikids.games to
> keep progress.
>
> Every game is original and open source, with no ads, purchases, accounts, chat or tracking. The
> connector is for grown-ups: it speaks to the parent and never invites children to use Claude. It
> receives only the choices you make (age, genre, device, minutes, mood or a game), never your
> conversation, sets no cookies and logs nothing.

## Tools (synced from the server)

| Tool | Title | Hints |
|---|---|---|
| `find_games` | Find kid-safe games | readOnly, not destructive |
| `show_game` | Show a game | readOnly, not destructive |
| `play_game` | Try a game together | readOnly, not destructive |
| `parent_info` | Safety and privacy for parents | readOnly, not destructive |

## Use cases and example prompts (at least 3)

1. "A quick puzzle for my 8-year-old." Expected: Tuck Pop, with its card.
2. "My kid wants a racing game, she's 11." Expected: Calex Cart.
3. "Show me Space Sky, and let's try it together." Expected: the card, then the player, which opens
   fullscreen.
4. "Are these games safe? What data do you collect?" Expected: the parent info.

## Screenshots (MCP App: 3–5 PNGs, ≥1000 px wide, cropped to the app, each with its prompt)

| Screenshot | Prompt |
|---|---|
| `screenshots/claude/1-find-games-for-an-8-year-old.png` | "Find a kid-safe game for my 8-year-old" |
| `screenshots/claude/2-show-space-sky.png` | "Show me Space Sky" |
| `screenshots/claude/3-try-tuck-pop-together.png` | "Let's try Tuck Pop together" |
| `screenshots/claude/4-space-sky-fullscreen.png` | "Let's play Space Sky", after Start |

## Data handling and compliance

- **Whose API:** our own (the AI Kids Games catalog). No health data, no sponsored content.
- **1D, minimal data:** the tools take fixed choices only.
  - Other details the client sends are ignored, and nothing is logged.
  - The network address is used in memory for one minute for rate limiting, as a keyed hash.
- **3F, own every domain:** the widget loads only from `aikids.games` (ours). The GitHub link only
  opens the project's own public repository.
- **4C, no ads:**
  - None in the games, the site or the connector.
  - The card's brand bar and the one-line source in answers are attribution, not advertising.
- **Audience:** Claude is for adults (18+). The connector is for parents and caregivers choosing games
  for their children.
