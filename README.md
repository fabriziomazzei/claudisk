# ClauDisk

<p align="center">
  <img src="icons/icon-128.png" width="96" height="96" alt="ClauDisk logo" />
</p>

<p align="center">
  <strong>Your Claude.ai projects, mirrored live to disk</strong><br />
  Chats, docs, files, memory and artifacts as Markdown - ready for Cursor and Claude Code.
</p>

<p align="center">
  <a href="./LICENSE"><img src="https://img.shields.io/badge/License-MIT-c45c26?style=flat-square" alt="MIT" /></a>
  <a href="./manifest.json"><img src="https://img.shields.io/badge/Chrome-MV3-4285F4?style=flat-square" alt="Manifest V3" /></a>
  <a href="./CHANGELOG.md"><img src="https://img.shields.io/badge/version-1.0.0-1a1a18?style=flat-square" alt="1.0.0" /></a>
  <a href="https://claudisk-web.vercel.app"><img src="https://img.shields.io/badge/site-claudisk--web.vercel.app-000?style=flat-square" alt="Website" /></a>
</p>

> Not affiliated with Anthropic. Unofficial community tool. Use at your own risk and respect Claude’s Terms of Service.

<p align="center">
  <img src="docs/screenshots/claudisk%20button.png" width="90%" alt="ClauDisk button on claude.ai" />
</p>
<p align="center"><em>One button on claude.ai - open the local mirror when chats change.</em></p>

---

## Why ClauDisk

Most tools do a **one-shot export**. ClauDisk keeps a **living folder** on your machine.

| | |
| --- | --- |
| **Projects as folders** | `chats/`, `knowledge/`, `artifacts/` |
| **Incremental sync** | While you browse claude.ai |
| **Full local copy** | Memory, instructions, binaries, attachments |
| **Agent-ready** | Markdown + indexes for Cursor / Claude Code |
| **Private by design** | No ClauDisk servers, no telemetry |

---

## How it looks

### Control room

<p align="center">
  <img src="docs/screenshots/claudisk%20mirror%20ready.png" width="90%" alt="ClauDisk tab ready to sync" />
</p>
<p align="center"><em>ClauDisk tab: folder connected, permission granted, ready to update.</em></p>

### Dry-run before write

<p align="center">
  <img src="docs/screenshots/claudisk%20dryrunning.png" width="90%" alt="ClauDisk dry-run sync plan" />
</p>
<p align="center"><em>See the plan first - confirm only when you want files written.</em></p>

### Archive statistics

<p align="center">
  <img src="docs/screenshots/claudisk%20stats.png" width="90%" alt="ClauDisk archive statistics" />
</p>
<p align="center"><em>Chats by project, freshness, activity - without crowding the main UI.</em></p>

### Vault on disk

<p align="center">
  <img src="docs/screenshots/claudisk%20claude%20brain.png" width="90%" alt="Local vault folder structure" />
</p>
<p align="center"><em>Projects, chats, knowledge and indexes as plain files you own.</em></p>

### Use it from Cursor

<p align="center">
  <img src="docs/screenshots/claudisk%20demo%20brain%20cursor.png" width="90%" alt="Cursor querying the ClauDisk vault" />
</p>
<p align="center"><em>Ask Cursor across projects - kickoff, pricing, decisions - with paths cited.</em></p>

### Use it from Claude Code

<p align="center">
  <img src="docs/screenshots/claudisk%20demo%20brain%20claude%20code.png" width="90%" alt="Claude Code using the ClauDisk vault" />
</p>
<p align="center"><em>Same vault, same Markdown - works with Claude Code too.</em></p>

---

## Install (Chrome / Edge)

1. Clone or download this repository
2. Open `chrome://extensions` (or `edge://extensions`)
3. Enable **Developer mode**
4. **Load unpacked** → select this folder (the one with `manifest.json`)
5. Open [claude.ai](https://claude.ai) → use the ClauDisk button, or click the toolbar icon
6. Connect a local folder and run **Update**

Optional packaging: `npm run zip` → `dist/claudisk-1.0.0.zip`

Site / docs: [claudisk-web.vercel.app](https://claudisk-web.vercel.app)

---

## Features

- **Dry-run plan** before writing (confirm / cancel)
- **Heuristic tags** + related-chat links (no external AI API)
- **Vault verify** (index ↔ disk)
- **Archive statistics** (by project, freshness, sync history)
- **English** UI by default; **Italian** in Settings
- **Spotlight tour** on first run (replayable from Settings)
- Toolbar **badge** for new / changed chats

---

## Privacy

Everything stays on **your** machine. See [PRIVACY.md](./PRIVACY.md).

---

## Project layout

```
manifest.json
_locales/          Store name & description (en, it)
icons/
src/
  background/      Service worker + offscreen
  content/         Button on claude.ai
  ui/              ClauDisk tab
  lib/             Capture, filesystem, sync
docs/screenshots/  README images
scripts/           zip / check
```

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md). Please read [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md) and [SECURITY.md](./SECURITY.md).

---

## Roadmap

- [ ] Chrome Web Store listing
- [ ] Marketing site polish on [claudisk-web.vercel.app](https://claudisk-web.vercel.app)
- [ ] <!-- PLACEHOLDER: your next idea -->

Fancy looping demos (OmniRoute-style motion) belong on the **site**, not necessarily in this README - GitHub is happier with static screenshots; the site can host lightweight Lottie / CSS / short GIF loops.

---

## Disclaimer

ClauDisk reads data from claude.ai using your existing browser session. Anthropic’s Terms may restrict scraping / automated access. You are responsible for how you use this tool.

## License

[MIT](./LICENSE) © 2026 [Fabrizio Mazzei](https://www.fabriziomazzei.it/)
