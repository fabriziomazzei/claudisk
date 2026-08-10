# Changelog

All notable changes to ClauDisk are documented here.

## [1.2.0] - 2026-08-10

### Added
- Settings: desktop notification when a sync finishes
- Settings: auto-purge `_deleted/` after N days (default 30)
- Settings: skip message attachments larger than N MB (default 25)
- Settings pages: What's new and About
- Clearer “Default dry-run for Update” label

### Changed
- Version badge / packaging to 1.2.0
- Home tagline: free, always current, across every project

## [1.1.0] - 2026-08-09

### Added
- Settings full page (Vault / Capture / Sync / App / History)
- Statistics full page with rankings (idle, messages, files)
- Model stored into the chat index on sync

### Fixed
- Concentration copy; scrollbar layout shift on Statistics

## [1.0.0] - 2026-08-10

### Added
- English as default UI language; Italian available in Settings
- Product packaging (license, privacy, zip script)
- Official C+D disk logo in toolbar icons and app header
- Footer credit: Fabrizio Mazzei ([fabriziomazzei.it](https://www.fabriziomazzei.it/))
- Spotlight onboarding tour (skippable, replay from Settings)
- Toolbar badge for new/changed chats
- `_locales` en/it for Chrome Web Store name and description
- `minimum_chrome_version`: 116

### Changed
- Source layout under `src/` (`background`, `content`, `ui`, `lib`)
- App page: `src/ui/claudisk.html`
- Tagline: “Your Claude.ai projects, mirrored live to disk”
- Statistics moved to a dedicated dialog (header link); sync history lives under Settings
- Onboarding highlights Statistics instead of dry-run toggle
- User-visible stats / plan notes / activity log humanization respect EN/IT

### Notes
- First public-facing version number. SemVer: breaking changes will bump major.

## [0.17.0] - 2026-08-09

### Added
- Dry-run plan before write (confirm / cancel)
- Heuristic frontmatter tags (no external API)
- Related-chat links (same project / title overlap)
- Vault verify (index ↔ disk)

## [0.16.0] - 2026-08-08

### Notes
- Last pre-brand build as “Claude Mirror” feature set (sync, mirror UI, captures).
