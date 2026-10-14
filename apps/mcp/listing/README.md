# Directory listings (prepared, not submitted)

Materials for the owner to submit the AI Kids Games app to:
- [ChatGPT's app directory](chatgpt.md);
- [Claude's connector directory](claude.md).

Both present the app **for parents and families**. ChatGPT's users must be 13 or older, and its
guidelines say apps "may not explicitly target children under 13". Claude's users must be 18 or
older.

**Wait for aikids.games.** Submit only after:
1. `aikids.games` is registered and live;
2. the app is in production at `https://aikids.games/mcp`;
3. the site's Privacy and Terms pages are live there.

ChatGPT never lets an app's MCP address change after publishing, so it must not be submitted with a
`vercel.app` address.

| File | What it is |
|---|---|
| `logo-512.png` | The square icon, the same as the website's app icon. |
| `screenshots/chatgpt/*.png` | 706 px wide, one per starter prompt. |
| `screenshots/claude/*.png` | At least 1000 px wide, cropped to the app. |

To regenerate the screenshots:

```bash
AIKG_LISTING=1 npm run test:e2e --workspace apps/mcp -- listing
```
