# ClauDisk

**Your Claude.ai projects, mirrored live to disk** - chats, docs, files, memory and artifacts as Markdown for Cursor and Claude Code.

[![License: MIT](https://img.shields.io/badge/License-MIT-cream.svg)](./LICENSE)
[![Manifest V3](https://img.shields.io/badge/Chrome-MV3-4285F4.svg)](./manifest.json)
[![Version](https://img.shields.io/badge/version-1.0.0-c45c26.svg)](./CHANGELOG.md)

> Not affiliated with Anthropic. Unofficial community tool. Use at your own risk and respect Claude’s Terms of Service.

<!-- PLACEHOLDER: add a short GIF or screenshot strip here (button on claude.ai → plan → vault in Cursor) -->
<!-- Example: ![Demo](docs/screenshots/demo.gif) -->

## Why ClauDisk

Most tools do a **one-shot export**. ClauDisk keeps a **living folder**:

| | |
| --- | --- |
| **Projects as folders** | `chats/`, `knowledge/`, `artifacts/` |
| **Incremental sync** | While you browse claude.ai |
| **Full local copy** | Memory, instructions, binaries, attachments |
| **Agent-ready** | Markdown + indexes for Cursor / Claude Code |
| **Private by design** | No ClauDisk servers, no telemetry |

## Install (Chrome / Edge)

1. Clone or download this repository
2. Open `chrome://extensions` (or `edge://extensions`)
3. Enable **Developer mode**
4. **Load unpacked** → select this folder (the one with `manifest.json`)
5. Open [claude.ai](https://claude.ai) → use the ClauDisk button, or click the toolbar icon
6. Connect a local folder and run **Update**

Optional packaging: `npm run zip` → `dist/claudisk-1.0.0.zip`

## Screenshots

<!-- PLACEHOLDER: drop PNGs from docs/screenshots/ into the table below -->

| UI | Vault |
| --- | --- |
| <!-- `![ClauDisk UI](docs/screenshots/claudisk%20mirror%20ready.png)` --> *Add UI shot* | <!-- `![Vault](docs/screenshots/claudisk%20claude%20brain.png)` --> *Add vault shot* |

## Features

- Dry-run plan before writing (confirm / cancel)
- Heuristic tags + related-chat links (no external AI API)
- Vault verify (index ↔ disk)
- Archive statistics (chats by project, freshness, sync history)
- English UI by default; Italian in Settings
- Spotlight product tour (replayable)

## Privacy

Everything stays on **your** machine. See [PRIVACY.md](./PRIVACY.md).

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
docs/              Spec + screenshots
scripts/           zip / check
```

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md). Please read [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md) and [SECURITY.md](./SECURITY.md).

<!-- PLACEHOLDER: GitHub Discussions / Issues templates once the repo is public -->

## Roadmap ideas

<!-- PLACEHOLDER: tick what you actually plan; delete the rest -->

- [ ] Chrome Web Store listing
- [ ] Short demo GIF in this README
- [ ] <!-- your idea -->

## Disclaimer

ClauDisk reads data from claude.ai using your existing browser session. Anthropic’s Terms may restrict scraping / automated access. You are responsible for how you use this tool.

## License

[MIT](./LICENSE) © 2026 [Fabrizio Mazzei](https://www.fabriziomazzei.it/)
