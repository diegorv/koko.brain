# Issue 27 discovery: zoom chip, zoom remembered on this machine

No `spec.md` in the feature folder; the Issue and `research/verdict-sh-empty-zoom-status.md` T3 are the source. Line numbers at `3040b690a`.

## Files that change

- `src/lib/core/zoom/zoom.service.ts:1-30`: keep `ZOOM_LEVELS` and the sync `currentZoom = factor` before the await (`:27-29`). After `setZoom` resolves: `localStorage` `kokobrain:zoom` = `String(factor)` (removed at 1.0), `zoomStore.setLevel`, `zoomStore.showChip`, module-level hide timer restarted (1500 ms, `zoomStore.hideChip`). New exported `restoreZoom()`: try/catch read, `Number(raw)` must be in `ZOOM_LEVELS` and not 1.0, then `currentZoom`, `setZoom`, `setLevel`; never shows the chip.
- New `src/lib/core/zoom/zoom.store.svelte.ts`: `$state` `level` (1) and `chipVisible` (false), getters plus `setLevel`, `showChip`, `hideChip`, `_reset` (pattern `core/settings/applied-theme.store.svelte.ts`).
- New `src/lib/core/zoom/ZoomChip.svelte`: `{#if zoomStore.chipVisible}` a `<button aria-label="Reset zoom to 100%">` with `ZoomInIcon` (`@lucide/svelte/icons/zoom-in`) and a `role="status" aria-live="polite"` span `Math.round(level * 100)%`; classes `fixed right-3 bottom-[calc(var(--status-bar-height)+0.75rem)]`, `motion-reduce:transition-none`; click `resetZoom().catch(error('ZOOM', ...))`.
- `src/lib/app/AppOverlays.svelte:13-25`: mount `<ZoomChip />` (rendered on both screens, `(app)/+layout.svelte:183`).
- `src/routes/(app)/+layout.svelte:36`: `restoreZoom().catch((err) => error('ZOOM', 'restoreZoom failed:', err))` after `applyStoredTheme()`; add `error` to the `debug.js` import (`:21`).
- `help/documentation/03-editor.md:172-182` (the Zoom section moved from `:157-165`): the chip and that zoom is remembered on this Mac.

## Tests (prior art)

- `src/tests/lib/core/zoom/zoom.service.test.ts:1-40`: extend; add `localStorage.clear()` and `zoomStore._reset()` in `beforeEach`, fake timers for the whole file so no real hide timer from one test fires in another.
- `src/tests/lib/core/settings/applied-theme.store.test.ts` for `zoom.store.test.ts`.
- `src/tests/lib/core/status-bar/SaveStatus.test.ts` / `AppOverlays.test.ts` (`mount`, `flushSync`) for `ZoomChip.test.ts`; `AppOverlays.test.ts` gains a `vi.mock('@tauri-apps/api/webviewWindow')` and a no-vault chip case.

## Risks and defaults

- Rendered only while `chipVisible` (no Svelte transition: jsdom has no Web Animations); a `tw-animate-css` fade-in with `motion-reduce:animate-none` stands in for the prototype's fade.
- A rejected `setZoom` leaves `currentZoom` one step off (accepted by the Issue).
- `restoreZoom()` with a valid stored value that equals the module level still calls `setZoom` (only 1.0 is skipped), so a relaunch re-applies it.
- Chip `z-50`, same layer as other overlays; it scales with the webview (accepted in research T3).
- Not covered by tests: WKWebView zoom after a real relaunch, the chip at 50% and 200%, the composer window staying at 100%.
