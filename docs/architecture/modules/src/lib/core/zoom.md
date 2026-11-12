---
summary: "Webview zoom service that steps through a fixed table of zoom levels and applies them to the Tauri window."
---

## Responsibility

Owns the app-wide webview zoom level. zoomIn, zoomOut and resetZoom move through a fixed table of zoom factors and apply the result with the Tauri webview window setZoom call. It has no store, setting or UI, and never reads the zoom back from the webview. The keyboard bindings that trigger it live in src/lib/app/global-keybindings.ts.

## Key files

- `src/lib/core/zoom/zoom.service.ts`: The whole module: the zoom table, the module-level current level, zoomIn, zoomOut, resetZoom and the private applyZoom.
- `src/lib/app/global-keybindings.ts`: Production caller that binds the zoom shortcuts.
- `src/tests/lib/core/zoom/zoom.service.test.ts`: Step logic tests with only the Tauri webview API mocked.

## State

- Module-level currentZoom in zoom.service.ts, in memory only, starting at 1.0 on each load, not persisted and not read back from the webview

## Collaborators

- `src/lib/app`: global-keybindings.ts imports zoomIn, zoomOut and resetZoom and logs rejected promises.

## Gotchas

- The level is module state only. It resets to 1.0 on every load and can drift from the real zoom if the webview zoom changes another way.
- Steps follow the fixed level table, not a multiplier. A level not in the table snaps to the neighbouring entry in the chosen direction.
- applyZoom assigns the in-memory level before awaiting setZoom, so if setZoom rejects the stored level already holds the new value and the error propagates to the caller.
- The factor is applied through the Tauri webview API. There is no zoom command in Rust.
