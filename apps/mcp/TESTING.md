# Testing the AI Kids Games app by hand

The automated checks run with `npm test`, `npm run inspect` and `npm run test:e2e` (in `apps/mcp`).
This guide is for trying the app in real assistants.

- **Endpoint:** production is `https://ai-kids-games-mcp.vercel.app/mcp`. The latest preview is in
  `DEPLOYMENT.json` (`preview.endpoint`).
- **Menus change often:** these steps follow each product's docs as of 2026-10-13
  ([docs/COMPATIBILITY.md](docs/COMPATIBILITY.md)). If a menu has moved, the linked help page has the
  current path.

## What to try in every assistant

Use these prompts as a parent would:

1. "My kid wants a racing game." Expected:
   - Calex Cart (ages 10–14) as a card list.
   - With an age under 10, no game, and the reply says so. Age is never relaxed.
2. "A quick puzzle for an 8-year-old." Expected:
   - Tuck Pop.
   - Its card: ages, content notes, safety and privacy.
   - Buttons: **Play on AI Kids Games** (primary) and **Try it here**.
3. "Show me Space Sky." Then press **Try it here** and **Start Space Sky**. Expected:
   - The assistant asks to open it fullscreen.
   - The 3D game runs.
   - The logo badge stays in the bar above the game.
4. "Let's play Tuck Pop." Expected:
   - The player, with a Start button.
   - Nothing downloads until you press it.
   - Pressing Escape (pause) shows "Keep your progress: play on AI Kids Games".
5. "Kid-safe games with no ads." Expected:
   - The list, and the safety facts in the reply.
6. "Are these games safe? What data do you collect?" Expected:
   - The parent info: the promises.
   - "Free and open source: see the code on GitHub", and the For Parents link.
7. "Let's play Cliff Valley." Expected:
   - A card that says it plays on the website.
   - Buttons: **Play on AI Kids Games** and **See all games**.
8. Check the links. Expected:
   - **Play on AI Kids Games** opens the game's page.
   - The address has no `?utm` or any other parameter.
   - The assistant may ask you to confirm first.
9. Light and dark mode. Expected:
   - The card follows the assistant's theme.
   - The site's green stays on the main button.
10. Saving. Expected:
    - Play a little, start a new conversation, open the same game again.
    - Write down whether your progress was still there; this tells us how each assistant keeps
      storage.
    - The "may not be saved" note should show in both cases until storage has lasted a day.

Every reply should end with "From AI Kids Games: free, ad-free games for kids." and the site's address.

## Claude (claude.ai, Claude Desktop, then the mobile apps)

[Help: custom connectors](https://support.claude.com/en/articles/11175166-get-started-with-custom-connectors-using-remote-mcp),
[interactive apps](https://support.claude.com/en/articles/13454812-use-interactive-connectors-in-claude).

1. On claude.ai (web) or Claude Desktop, open **Customize → Connectors**.
   - On a Team or Enterprise plan, an Owner adds it under **Organization settings → Connectors**.
2. Choose **+ Add → Add custom connector**.
3. Fill it in, then choose **Add**:
   - Name: `AI Kids Games`.
   - URL: the endpoint, ending in `/mcp`.
   - Authentication: **No sign in**.
4. Start a new chat. In **+ → Connectors**, make sure AI Kids Games is on.
5. Ask the prompts above. The first time a card appears, choose **Always allow** for interactive apps.
6. Fullscreen:
   - In the player, **Full screen** switches; Claude adds its own close button.
   - On a phone, the chat box stays on top: the game's bottom edge should not be covered by our bar.
7. Mobile: connectors added on the web appear in the Claude apps for iOS and Android. Try prompts
   3 and 4 there, and check that fullscreen opens when you press Start.
8. After an update to the server, start a new conversation. Claude Desktop caches widget pages, so
   quit and reopen it.

What we don't know yet and would like you to note:
- Does PiP exist in Claude?
- Do saves survive a new conversation? We expect no: each conversation gets its own storage.
- Does the gamepad work in a game there?

## ChatGPT (chatgpt.com on the web)

[Guide: add a custom MCP server](https://developers.openai.com/api/docs/guides/custom-mcp-server),
[help: developer mode](https://help.openai.com/en/articles/12584461-developer-mode-and-mcp-apps-in-chatgpt).

Developer mode needs Business, Enterprise or Edu. On Pro, read-only tools work, and all of ours are
read-only.

1. Go to **chatgpt.com/plugins → + → Add custom MCP server**.
   - On some accounts the path is **Settings → Apps → Advanced settings → Developer mode**, then
     **Apps → Create**.
2. Fill it in:
   - Name: `AI Kids Games`.
   - Description: "Kid-safe games for families".
   - Server URL: the endpoint.
   - Authentication: **No authentication**.
3. Confirm **I understand and want to continue**, then **Create**.
4. Install it from **chatgpt.com/plugins?view=personal** if asked.
5. Start a new chat, type `@`, choose AI Kids Games, then ask the prompts above.
6. Check that the card shows **no logo or brand bar** inside it: ChatGPT shows our name and icon above
   the widget instead. Each card should have at most two buttons.
7. After a server update, use **Refresh** on chatgpt.com/plugins, then start a new chat.
8. ChatGPT's MCP apps are web only for now. Note whether the app appears in the mobile apps.

## VS Code (GitHub Copilot Chat): renders the cards

1. Run **MCP: Add Server…** from the Command Palette.
2. Fill it in:
   - Type: **HTTP**.
   - URL: the endpoint.
   - Name: `ai-kids-games`.
3. Open Copilot Chat in **Agent** mode and ask "find a calm game for a 6-year-old".

The cards render inline ([VS Code docs](https://code.visualstudio.com/docs/copilot/chat/mcp-servers)).

## Goose, Cursor and MCPJam (render cards; handy for quick checks)

- **Goose:** Extensions → Add custom extension → Streamable HTTP → the endpoint. Goose's support for
  MCP Apps is experimental.
- **Cursor:** add the following to `~/.cursor/mcp.json`, then ask in the agent chat:
  `{ "mcpServers": { "ai-kids-games": { "url": "<endpoint>" } } }`.
- **MCPJam:** run `npx @mcpjam/inspector`, add the endpoint as HTTP, then use the App Builder / tools
  tab to call `show_game`.

## Assistants that use the tools as text only

These don't show the cards, but the answers and links should still read well:

| Assistant | How to add the server |
|---|---|
| **Mistral Vibe (Le Chat)** | An admin adds a custom MCP connector with no authentication ([docs](https://docs.mistral.ai/le-chat/knowledge-integrations/connectors/mcp-connectors)). |
| **Perplexity** (Pro and up) | Settings → Connectors → custom remote connector, "open authentication". |
| **Grok** | grok.com/connectors → Custom ([docs](https://docs.x.ai/grok/connectors)). |
| **Gemini app (Spark)** | US personal accounts, 18+, web: Settings → Connected apps → Custom apps → MCP server URL ([help](https://support.google.com/gemini/answer/17209137)). |

## The local harness (no account needed)

Run the following, then open the address it prints:

```bash
npm run build --workspace apps/mcp && npm run harness --workspace apps/mcp
```

For example: `http://127.0.0.1:4330/?profile=claude&tool=show_game&args={"game":"tuck-pop"}`.

| Option | Values |
|---|---|
| `profile` | `claude`, `chatgpt`, `strict` (the host blocks the fetch) or `nostorage` |
| `theme` | `light` or `dark` |
| `touch` | `1` for a touch screen |
| `width` | the card width, e.g. `320` |
