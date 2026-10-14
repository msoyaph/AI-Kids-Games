# AI assistants: what the AI Kids Games app can do in each

Research from the current official docs, read on **2026-10-13**. These products change quickly, so
check the linked sources before relying on a detail. "Unconfirmed" means no official source says so.

## Specs

- **MCP `2026-07-28`** (current) is stateless:
  - No `initialize` and no session id.
  - Each request carries the protocol version, client capabilities and client info in `_meta`.
  - Servers must answer `server/discover`.
  - Streamable HTTP is POST only, and servers must validate `Origin`.
  - Clients on `2025-11-25` still use `initialize`, so the server serves both eras: the SDK's
    `createMcpHandler`, with a stateless legacy fallback.
  - Sources: [changelog](https://modelcontextprotocol.io/specification/2026-07-28/changelog),
    [transport](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http).
- **MCP Apps** (stable spec `2026-01-26`) puts widgets in `ui://` resources (`text/html;profile=mcp-app`):
  - The widget's CSP is declared in `_meta.ui.csp` (`connectDomains`, `resourceDomains`,
    `frameDomains`, `baseUriDomains`).
  - Display modes are inline, fullscreen and PiP.
  - The widget can also send `ui/open-link`, `ui/message` and `resources/read` requests through the
    host.
  - There is no permission for fullscreen, gamepad or pointer lock.
  - Hosts must render widgets through a sandbox proxy on another origin.
  - Source: [spec](https://github.com/modelcontextprotocol/ext-apps/blob/main/specification/2026-01-26/apps.mdx).
- **Hosts that render MCP Apps** (per the [client matrix](https://modelcontextprotocol.io/extensions/client-matrix)):
  Claude (web and desktop), ChatGPT, VS Code Copilot, Microsoft 365 Copilot, Goose, Postman, MCPJam,
  Cursor and others.

## Per assistant

### Claude (web, desktop and mobile)

- **Adding a server:** Customize → Connectors → + Add → Add custom connector → **No sign in**. Works on
  every plan (Free: one connector). Claude connects from Anthropic's cloud (160.79.104.0/21).
  ([help](https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp))
- **Inline UI:** yes, on all plans since 2026-01-26. Each user allows apps once ("Always allow").
- **Fullscreen / PiP:**
  - Fullscreen works: Claude adds a close button and keeps the composer visible.
  - PiP is listed in the spec but not documented for Claude.
  - On touch screens, inline apps get **no vertical swipes**.
  - Mobile uses a native WebView.
  - ([design guidelines](https://claude.com/docs/connectors/building/mcp-apps/design-guidelines))
- **Storage in frames:**
  - Frames run on `{hash}.claudemcpcontent.com` with `allow-same-origin`.
  - By default the origin is per conversation and connector. It is shared across conversations only
    with a `ui.domain` equal to `sha256(connector URL)[:32]`.
  - How long storage lasts is not documented.
  - ([instance supersession](https://claude.com/docs/connectors/building/mcp-apps/instance-supersession))
- **Limits:**
  - Tool results ≤ ~150,000 characters; 240 s timeout.
  - Everything is blocked unless declared.
  - **`frameDomains` is restricted**.
  - No popups (links go through `ui/open-link`, which Claude confirms).
  - ([troubleshooting](https://claude.com/docs/connectors/building/mcp-apps/troubleshooting))
- **Directory:** claude.ai/directory/manage (Pro and up). It requires:
  - a `title` and read-only/destructive hints on every tool;
  - privacy, docs and support links, and an icon;
  - at least 3 example prompts;
  - 3–5 PNG screenshots, at least 1000 px wide;
  - no ads (policy 4C), minimal data (1D), and owning every domain fetched or rendered (3F).
  - ([submission](https://claude.com/docs/connectors/building/submission),
    [policy](https://support.claude.com/en/articles/13145358-anthropic-software-directory-policy))
- **Age rules:** **users must be 18+.** No directory rule on children or games. Usage Policy
  safeguards apply to products that minors use directly.

### ChatGPT

- **Adding a server:** developer mode, or chatgpt.com/plugins → + → Add custom MCP server → **No
  authentication**. Full access on Business, Enterprise and Edu; Pro users can use read-only tools
  (all of ours are read-only).
  ([guide](https://developers.openai.com/api/docs/guides/custom-mcp-server),
  [help](https://help.openai.com/en/articles/12584461-developer-mode-and-mcp-apps-in-chatgpt))
- **Inline UI:** yes, through the MCP Apps standard plus `window.openai` extras.
  ([reference](https://developers.openai.com/plugins/reference))
- **Fullscreen / PiP:** fullscreen works, with the composer overlaid. PiP works and is "suited to
  games"; on mobile it opens as fullscreen.
  ([UI guidelines](https://developers.openai.com/plugins/concepts/ui-guidelines))
- **Storage in frames:** OpenAI says `localStorage` **isn't reliable across sessions or devices**.
  `widgetState` lasts for one widget only.
- **Limits:**
  - No size limit is documented. Resources are cached for up to an hour, so the widget URI is
    versioned.
  - Inline scripts are allowed.
  - Nested frames need a justification and extra review.
  - In the widget: **no logo, no custom fonts, at most 2 actions per inline card**.
- **Directory:** plugin ZIP at platform.openai.com/plugins. It requires:
  - a verified identity and a domain token;
  - an MCP origin that **can't change after publishing**;
  - 5 positive and 3 negative test cases, and a demo video;
  - website, support, privacy and terms URLs;
  - a name and short description of 30 characters or fewer, and a logo;
  - explicit read-only, destructive and open-world hints on every tool.
  - There is no Games category.
  - ([submission](https://developers.openai.com/plugins/deploy/submission))
- **Age rules:** **"Plugins may not explicitly target children under 13"**; apps must suit ages
  13–17. Users must be 13+, and 13–17-year-olds need parental consent.
  ([guidelines](https://developers.openai.com/plugins/plugin-guidelines))

### ChatGPT Dots ("GPT Dots")

Part of ChatGPT (Pro and Business Premium, 18+). Whether it renders app UI is unconfirmed.

### Microsoft 365 Copilot

- **Adding a server:** a declarative agent with an MCP plugin. **Production needs OAuth or Entra**,
  which a no-account app can't offer.
- **Inline UI:** yes. **Fullscreen** only, no PiP.
- **Storage:** `widgetState`.
- **Limits:** connect and resource domains only; no `frameDomains`, `ui.domain` or permissions.
- **Directory:** Agent Store through Partner Center.

### VS Code Copilot, Cursor, Goose, Postman, MCPJam

Developer tools that accept a no-auth URL and render MCP Apps (Goose's support is experimental).
Fullscreen, PiP, storage and limits are not documented. No directories relevant to us.

### Gemini app (Spark)

- **Adding a server:** web only, US, 18+, personal account, Keep Activity on.
- **Inline UI:** no.
- **Directory:** partner-only catalog.
- **Age rules:** under-13 Family Link users can't use custom apps.
- ([help](https://support.google.com/gemini/answer/17209137))

### Gemini Enterprise / CLI

Admins add servers (no auth is allowed) in Enterprise, which uses A2UI rather than MCP Apps, so no
inline UI. Organisation gallery or GitHub-indexed extensions.

### Grok

Custom connectors at grok.com/connectors; the auth and plan details are unconfirmed. No inline UI.
First-party catalog only. Age rules: 13+, with parental permission for 13–17 (unconfirmed).
([docs](https://docs.x.ai/grok/connectors))

### Meta "Muse" (the Muse agent)

- **Adding a server:** Muse builds its own connectors. Its directory is at platform.muse.ai (OAuth or
  API key); MCP isn't stated.
- **Inline UI:** no evidence.
- **Directory:** Meta reviews submissions.
- **Age rules:** US only, 18+ (press reports).

### "Instinct" (Spear Street)

No public MCP or developer platform; invite-only.

### Mistral Vibe (formerly Le Chat)

An admin can add a no-auth server. UI rendering is not documented, and there's no submission
process.

### Perplexity

Pro and up, with "open authentication". No evidence of UI rendering.

## What the app does about it

- **The player never frames another origin.** It fetches the game from the website (the only
  `connectDomains` entry), or reads it through the host (`resources/read`). It checks the SHA-256
  against the verified import, then runs it from `srcdoc` with the website's own sandbox.
- **Fullscreen:**
  - Heavy games, and every game on a touch screen, ask for fullscreen.
  - A heavy game that can't get fullscreen offers the website instead.
- **Saves:** the storage note shows unless storage has visibly lasted (a day).
- **Branding by host:**
  - In ChatGPT there's no logo, brand bar or badge.
  - Everywhere, host fonts and colors, with our green on primary buttons.
  - At most 2 actions per card, 1 per list item and 2 links per widget.
- **Tone:** everything speaks to parents and caregivers.
- **Directories:** the ChatGPT submission waits for `aikids.games`, because the MCP origin is
  permanent once published.
