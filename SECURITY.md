# Security Policy

## Supported versions

Security fixes are applied to the latest published release on the default branch.

## Reporting a vulnerability

ClauDisk runs in the browser with access to your Claude.ai session cookies and a local folder you authorize. Please **do not** open a public GitHub issue for security problems.

**Prefer:** email [Fabrizio Mazzei](https://www.fabriziomazzei.it/) via the contact options on that site, with subject `ClauDisk security`.

Include:

- ClauDisk version (`manifest.json` / UI badge)
- Browser and OS
- Steps to reproduce
- Impact (e.g. unexpected network calls, data leaving the machine)

You should receive an acknowledgement within a few days when possible. Please allow time for a fix before public disclosure.

## Scope notes

- Out of scope: Anthropic / claude.ai service bugs (report those to Anthropic)
- Out of scope: user mistakes (syncing a vault into a public git remote)
- In scope: extension code that leaks data off-device, privilege issues, or unsafe handling of the File System Access / cookie APIs
