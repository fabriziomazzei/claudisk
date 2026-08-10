# Screenshots

Shots already in this folder (use in README / Store):

| File | Notes |
| --- | --- |
| `claudisk button.png` | Button on claude.ai |
| `claudisk mirror ready.png` | ClauDisk tab ready |
| `claudisk dryrunning.png` | Dry-run plan |
| `claudisk stats.png` | Archive overview |
| `claudisk claude brain.png` | Vault in Explorer |
| `claudisk demo brain cursor.png` | Cursor on demo vault |
| `claudisk demo brain claude code.png` | Claude Code on demo vault |
| `sync-update.gif` | Update progress loop (from `/gif/sync`) |
| `chats-joining.gif` | Chats counter loop (from `/gif/joiner`) |

## Regenerating GIFs

From `claudisk-web` (with Vite running on `:5173`):

```bash
npm i -D playwright
npx playwright install chromium
node scripts/record-gifs.mjs
```

Or open `http://127.0.0.1:5173/gif/sync` and `/gif/joiner` and capture with ScreenToGif / ShareX.

Fake vault for Finder screenshots:

`C:\Users\fabri\Documents\Estensioni\ClauDisk\demo-brain`

Avoid: real client names, emails, Anthropic logos as endorsement.
