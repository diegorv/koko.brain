# 27: Zoom shows a chip and is remembered on this machine

**Origin:** design review 2026-11-17, proposal P99 (`.scratch/design-review/review.md`), prototype `.scratch/design-review/prototypes/shell-tabs-navigation.html` (P99 section), research `.scratch/shell-sidebars-ux/research/verdict-sh-empty-zoom-status.md` (its T3) and `.scratch/shell-sidebars-ux/research/breakdown.md` (old ticket 35, now this one). No open-itens Issue is absorbed (open-itens 030 is irrelevant while zoom stays out of `settings.json`).

**What to build:** in `src/lib/core/zoom/` and `src/lib/app/`:

1. **Chip.** Zooming (Cmd+=, Cmd+-, Cmd+0) shows a small chip with the level ("110%") for 1.5 s, restarted by each change; clicking it resets to 100%. Restoring at launch shows no chip.
2. **Remembered.** The level is remembered on this Mac in `localStorage['kokobrain:zoom']` and applied at launch, also on the vault picker (zoom never syncs with a vault, and `settings.json` cannot apply before a vault opens).
3. **Service** (`zoom.service.ts`): keep `ZOOM_LEVELS` and the synchronous `currentZoom = factor` before the `await` (`:27-29`). Held Cmd+= fires repeated keydowns, and moving the assignment after the await would make two quick presses both read 1.0 and lose a step. After `setZoom` resolves: write the key (remove it at 1.0), set `zoomStore.level` and `chipVisible`, restart the hide timer (in the service). On rejection the error propagates and storage and store are unchanged; a rejected IPC leaves the module level one step off until the next press, which is not worth more code. New `restoreZoom()`: a try/catch read, only a value in `ZOOM_LEVELS`, no call for 1.0 or junk, with a logged catch at the call site.
4. **Wiring.** Call `restoreZoom()` next to `applyStoredTheme()` in `src/routes/(app)/+layout.svelte:36`. New `zoom.store.svelte.ts` (getters only) and `ZoomChip.svelte`, mounted once in `src/lib/app/AppOverlays.svelte`, which is mounted on both screens (`(app)/+layout.svelte:183`); `AppShell.svelte` renders only `children` while no vault is open (`:184-185`), so a chip mounted there would never show on the vault picker. The chip is a `<button aria-label="Reset zoom to 100%">` with a `role="status"` `aria-live="polite"` percentage, `fixed right-3 bottom-[calc(var(--status-bar-height)+0.75rem)]`, `motion-reduce:transition-none`.
5. **Help:** `help/documentation/03-editor.md:157-165` (the chip, and that zoom is remembered on this Mac).

Not in this ticket: zoom palette commands; a per-vault zoom in `settings.json`; the composer window, which is a separate route (`src/routes/composer`) and stays at 100%.

**Blocked by:** none

**Status:** ready-for-agent

**Gate:** `pnpm check` + `pnpm vitest run`

- [ ] Failing test first, `src/tests/lib/core/zoom/zoom.service.test.ts` (mock only `@tauri-apps/api/webviewWindow`; `localStorage.clear()` per test): after `zoomIn()` the key is `'1.1'`; `restoreZoom()` with `'1.25'` calls `setZoom(1.25)` once and a following `zoomIn()` calls `setZoom(1.5)`; `'abc'`, `'1.3'`, `'NaN'`, `'1'` or no key make no call and the next `zoomIn()` goes to 1.1; `resetZoom()` removes the key; a rejecting `setZoom` propagates and leaves the key and `zoomStore.level`; two `zoomIn()` started without awaiting end at 1.25. The existing cases (`:1-40`, which reset through `resetZoom()` in `beforeEach`) stay green.
- [ ] Fake timers, real store and service: a change sets `level` and `chipVisible`; it hides after 1500 ms; a second change at 1000 ms keeps it visible until 2500 ms; `restoreZoom()` never sets `chipVisible`. `zoom.store.test.ts` covers each getter.
- [ ] `ZoomChip.test.ts`: absent before a change; "110%" after one `zoomIn()`; the button name is "Reset zoom to 100%"; clicking calls the mocked `setZoom(1)` and shows "100%".
- [ ] `src/tests/lib/app/AppOverlays.test.ts`: the chip appears after `zoomIn()` with no vault open.
- [ ] Not covered by tests, stated in the PR: WKWebView zoom after a real relaunch, the chip at 50% and 200%, and the composer window staying at 100%.
- [ ] Frontend gate: `pnpm check` and `pnpm vitest run` pass.

## Original proposal

- **P99.** Zoom gives no feedback and is not persisted. Persist the zoom factor and apply it at startup; show a brief "110%" chip that resets the zoom when clicked. Validation: revise.

## Problem

Zoom changes silently, and a launch always starts at 100%, so a user who needs 125% re-zooms every session with no sign of the current level.

## Evidence

Checked at `ab143a411`.

- `src/lib/core/zoom/zoom.service.ts:1-30`: module-level `currentZoom`, no store, no persistence; `ZOOM_LEVELS` has 11 steps from 0.5 to 2.0; `applyZoom` assigns before the await (`:27-29`).
- `src/lib/app/global-keybindings.ts:177-181` calls `zoomIn`, `zoomOut` and `resetZoom` and ignores the result.
- Zoom has no palette command, no `AppSettings` key and no `zoom` text in `src-tauri/src`; `src-tauri/capabilities/default.json:17` grants `allow-set-webview-zoom`.
- `src/routes/(app)/+layout.svelte:36` `applyStoredTheme()` (`src/lib/core/settings/theme.service.ts:54`) is the precedent for a pre-vault `localStorage` restore; `:183` mounts `AppOverlays`; `AppShell.svelte:184-185` renders only `children` with no vault.
- `e2e` aliases the webview module (`vite.config.js:66`), so an E2E could record `setZoom` through `e2e/mocks/tauri-webview-window.ts:38`.
- `help/documentation/03-editor.md:157-165` describes the 11 fixed levels.

## Sequence with

- `src/routes/(app)/+layout.svelte`: 06 (comment at `:91-104`), 28 (mounts the menu listener).
- `AppOverlays.svelte` and `AppOverlays.test.ts`: 08 (mounts the heading picker).
- `app.css:212` `--status-bar-height`: 02 changes it to 24 px; the chip offset reads the token and is correct in either order.
- `help/documentation/03-editor.md`: 15, 21, 22, 23, 24, 25, 26, 31, 32, 33.

## Comments

- 2026-11-17, triage: ready-for-agent. Decided by the owner: the 34-ticket consolidation (this ticket keeps its old scope). Defaults (not individually answered): 27.1 zoom is remembered per machine in `localStorage`, so it applies on the vault picker and never syncs with a vault, instead of per vault in `settings.json` (breakdown.md question 35.1).
