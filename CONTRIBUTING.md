# Contributing

Thanks for considering a contribution to ClauDisk.

## Ground rules

- Keep the architecture: **browser extension**, local folder, no mandatory cloud backend.
- No external AI API calls for core features (tags/related stay heuristic).
- Do not commit personal vault folders, `samples/`, or secrets.
- Prefer small PRs with a clear problem statement.
- Be respectful: see [CODE_OF_CONDUCT.md](./CODE_OF_CONDUCT.md).
- Security issues: see [SECURITY.md](./SECURITY.md) (do not file public issues for vulns).

## Dev setup

1. Load unpacked from the repo root (`manifest.json` here)
2. After JS changes: reload the extension on `chrome://extensions`
3. Optional: `npm run check` (syntax), `npm run zip` (release archive)

## Code map

| Area | Path |
| --- | --- |
| Service worker / offscreen | `src/background/` |
| claude.ai button | `src/content/` |
| App UI + tour + i18n | `src/ui/` |
| Capture / FS / sync | `src/lib/` |
| Store listing strings | `_locales/` |
| Icons | `icons/` |

## Pull requests

- Describe *what* and *why*
- Note any ToS / privacy impact
- Update `CHANGELOG.md` under Unreleased or the next version

## License

By contributing, you agree your changes are licensed under the MIT License (see `LICENSE`).
