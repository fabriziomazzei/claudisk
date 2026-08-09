# Privacy Policy - ClauDisk

**Last updated:** 2026-08-10

ClauDisk is a browser extension that copies **your** Claude.ai data into a **folder you choose** on your computer.

## Summary

- **No ClauDisk servers.** The extension does not upload your chats to us.
- **No analytics / telemetry** from ClauDisk.
- **Local only:** File System Access API + `chrome.storage.local`.
- We never use `chrome.storage.sync` for titles or content (that would sync via Google).

## Permissions (why each exists)

| Permission | Why |
| --- | --- |
| `https://claude.ai/*` | List/fetch your projects, chats, docs, files, memory while you are logged in |
| `https://*.claudeusercontent.com/*` | Download attachments / binaries referenced by Claude |
| `storage` | Settings, sync status, onboarding flag, folder handle metadata (local only) |
| `cookies` | Read org/session context required by claude.ai APIs in the page |
| `alarms` | Periodic health probe for the local folder (Manifest V3 background limits) |
| `offscreen` | Keep a short-lived document that can write `_health.json` when the service worker sleeps |

## What is written to disk

In the folder you authorize: Markdown chats, project docs, files, artifacts, `_raw/` JSON, `index.json`, health files. That folder can contain sensitive personal data. Keep it out of public git remotes and cloud sync if you care about confidentiality.

## Third parties

- **Anthropic / claude.ai** - your existing account and their privacy policy apply to the service you already use.
- **ClauDisk author** - receives nothing from the extension runtime.

## Contact

[Fabrizio Mazzei](https://www.fabriziomazzei.it/) · or open an issue on the GitHub repository for this project.
