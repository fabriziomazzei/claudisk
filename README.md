# ClauDisk

<p align="center">
  <img src="icons/icon-128.png" width="96" height="96" alt="ClauDisk logo" />
</p>

<p align="center">
  <strong>Living local mirror of Claude.ai projects</strong><br />
  Chats, docs, files, memory &amp; artifacts as Markdown for Cursor / Claude Code.<br />
  <em>Unofficial · local-first · MIT · free</em>
</p>

<p align="center">
  <a href="./LICENSE"><img src="https://img.shields.io/badge/License-MIT-c45c26?style=flat-square" alt="MIT" /></a>
  <a href="./manifest.json"><img src="https://img.shields.io/badge/Chrome%20%2F%20Edge-MV3-4285F4?style=flat-square" alt="Chrome / Edge MV3" /></a>
  <a href="./CHANGELOG.md"><img src="https://img.shields.io/badge/version-1.2.0-1a1a18?style=flat-square" alt="1.2.0" /></a>
  <a href="https://claudisk-web.vercel.app"><img src="https://img.shields.io/badge/site-claudisk--web.vercel.app-000?style=flat-square" alt="Website" /></a>
</p>

> Not affiliated with Anthropic. Unofficial community tool. Use at your own risk and respect Claude’s Terms of Service.

**What’s new:** [CHANGELOG](./CHANGELOG.md) · in-extension Settings → What’s new

Claude keeps knowledge inside project walls. ClauDisk copies it to a **folder you choose** - then every new chat keeps joining that vault. Open it in Cursor or Claude Code and ask across projects in one go.

<p align="center">
  <img src="docs/screenshots/sync-update.gif" width="90%" alt="ClauDisk update progress" />
</p>
<p align="center"><em>Update in progress: projects, chats, memory, indexes - live on disk.</em></p>

<p align="center">
  <img src="docs/screenshots/chats-joining.gif" width="90%" alt="New chats joining the vault" />
</p>
<p align="center"><em>New chats keep landing in the vault - always ready for your AI tools.</em></p>

---

## Contents

- [Quick start](#quick-start)
- [Why ClauDisk](#why-claudisk)
- [How it works](#how-it-works)
- [Install (Chrome or Edge)](#install-chrome-or-edge)
- [Features](#features)
- [Privacy](#privacy)
- [Project layout](#project-layout)
- [Contributing](#contributing)
- [Roadmap](#roadmap)
- [Disclaimer](#disclaimer)
- [License](#license)

---

## Quick start

1. Load the unpacked extension in Chrome or Edge (`chrome://extensions` / `edge://extensions`)
2. Open [claude.ai](https://claude.ai) and click the ClauDisk button
3. Choose a local folder → run **Update**
4. Open that folder in Cursor or Claude Code and ask across projects

Details: [Install](#install-chrome-or-edge) · release notes: [CHANGELOG](./CHANGELOG.md)

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

## How it works

### 1. One button on Claude.ai

<p align="center">
  <img src="docs/screenshots/claudisk%20button.png" width="90%" alt="ClauDisk button on claude.ai" />
</p>
<p align="center"><em>Bottom-right on claude.ai - open the mirror when chats change.</em></p>

### 2. Control room

<p align="center">
  <img src="docs/screenshots/claudisk%20mirror%20ready.png" width="90%" alt="ClauDisk tab ready to sync" />
</p>
<p align="center"><em>Folder connected, permission granted, ready to Update.</em></p>

### 3. Dry-run before write

<p align="center">
  <img src="docs/screenshots/claudisk%20dryrunning.png" width="90%" alt="ClauDisk dry-run sync plan" />
</p>
<p align="center"><em>See the plan first - confirm only when you want files written.</em></p>

### 4. Archive statistics

<p align="center">
  <img src="docs/screenshots/claudisk%20stats.png" width="90%" alt="ClauDisk archive statistics" />
</p>
<p align="center"><em>Chats by project, freshness, rankings - without crowding the main UI.</em></p>

### 5. Vault on disk

<p align="center">
  <img src="docs/screenshots/claudisk%20claude%20brain.png" width="90%" alt="Local vault folder structure" />
</p>
<p align="center"><em>Projects, chats, knowledge and indexes as plain files you own.</em></p>

### 6. Use it from Cursor

<p align="center">
  <img src="docs/screenshots/claudisk%20demo%20brain%20cursor.png" width="90%" alt="Cursor querying the ClauDisk vault" />
</p>
<p align="center"><em>Ask across projects - with paths cited.</em></p>

### 7. Use it from Claude Code

<p align="center">
  <img src="docs/screenshots/claudisk%20demo%20brain%20claude%20code.png" width="90%" alt="Claude Code using the ClauDisk vault" />
</p>
<p align="center"><em>Same vault, same Markdown.</em></p>

---

## Install (Chrome or Edge)

Works on **Chrome** and **Edge** (Chromium) with the same unpacked load - no code forks.

1. Clone or [download ZIP](https://github.com/fabriziomazzei/claudisk/archive/refs/heads/main.zip)
2. Open `chrome://extensions` or `edge://extensions`
3. Enable **Developer mode**
4. **Load unpacked** → select this folder (the one with `manifest.json`)
5. Open [claude.ai](https://claude.ai) → use the ClauDisk button, or the toolbar icon
6. Connect a local folder and run **Update**

Optional packaging: `npm run zip` → `dist/claudisk-1.2.0.zip`

Site: [claudisk-web.vercel.app](https://claudisk-web.vercel.app)

---

## Features

- **Dry-run plan** before writing (default on for Update)
- **Heuristic tags** + related-chat links (no external AI API)
- **Soft-delete** to `_deleted/` + optional auto-purge after N days
- **Attachment size cap** (skip huge binaries)
- **Desktop notification** when a sync finishes (optional)
- **Vault verify** (index ↔ disk)
- **Archive statistics** (projects, freshness, rankings, models)
- **English** UI by default; **Italian** in Settings
- **Spotlight tour** on first run · **What's new** / **About** in Settings
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
docs/screenshots/  README images + GIFs
scripts/           zip / check
```

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md). Please read [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md) and [SECURITY.md](./SECURITY.md).

---

## Roadmap

- [ ] Chrome Web Store listing
- [ ] Edge Add-ons listing (same MV3 package)
- [ ] Marketing site polish on [claudisk-web.vercel.app](https://claudisk-web.vercel.app)

GIF loops: `docs/screenshots/sync-update.gif` · `chats-joining.gif` (regenerate via `claudisk-web/scripts/record-gifs.mjs`).

---

## Disclaimer

ClauDisk reads data from claude.ai using your existing browser session. Anthropic’s Terms may restrict scraping / automated access. You are responsible for how you use this tool.

## License

[MIT](./LICENSE) © 2026 [Fabrizio Mazzei](https://www.fabriziomazzei.it/)
