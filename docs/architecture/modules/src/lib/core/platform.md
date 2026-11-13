---
summary: "Runtime capability flag: whether the app runs in a browser served by the Mac instead of the desktop webview."
---

## Responsibility

Holds one flag, set once at boot, that says whether the app runs in a plain browser connected to the Mac's host. Code in any layer reads it to skip what the browser must not do, such as boot steps that write to the vault or the Mac. It lives in `core/` because `core/` cannot import `app/` (ADR-0003).

## Key files

- `src/lib/core/platform/capabilities.ts`: `setRemoteBrowser` and `isRemoteBrowser`.
- `src/lib/app/remote/remote-session.ts`: Production caller that sets the flag before the app mounts in the browser.

## State

- Module-level `remoteBrowser` boolean in capabilities.ts, false on the desktop.

## Collaborators

- `src/lib/app`: remote-session.ts sets the flag; the lifecycle service skips the daily-note auto-open, the templates folder, the bookmark migration, the debug log session and the remote server settings in the browser.
- `src/lib/core/settings`: settings.service.ts runs queryjs blocks only on demand in the browser.
- `src/lib/core/filesystem`: fs.service.ts refuses operations the host does not support in the browser.
- `src/lib/features/auto-organize`: the after-save hook skips moving a note in the browser.

## Gotchas

- The flag is never reset at runtime: tests that set it must set it back to false.
