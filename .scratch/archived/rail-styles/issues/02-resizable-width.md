# 02: Resizable width saved in `layout.railWidth`

**What to build:** the labeled rail's width drags from its right edge, clamps to 140-320, and a double-click returns it to 192. It is saved per vault.

- **Setting:** `railWidth: 192` in the layout defaults (`settings.store.svelte.ts`) and `LayoutSettings` (`settings.types.ts`). `parseRailWidth(saved: unknown)` in `rail-items.logic.ts`: a finite number is rounded and clamped, anything else (a string, `NaN`, `null`, missing) gives 192. Add min and max to `RAIL_WIDTH`.
- **Saving:** live width stays in `Rail.svelte` local state during the drag (`let dragWidth = $state<number | null>(null)`, the shown width is `dragWidth ?? parseRailWidth(settingsStore.layout.railWidth)`). `updateLayout({ railWidth })` runs once when the drag ends, on `pointerup` and `pointercancel`. Reason: `updateLayout` triggers the persistence effect, which re-serializes every setting on each call and writes after a 500 ms pause (`settings-persistence.svelte.ts`), so per-move calls cost a full serialize per pointer event and a slow drag would write mid-way.
- **Handle:** a `<button type="button">` in the frame, `absolute top-10 -right-1 bottom-0 z-30 w-2 shrink-0 cursor-col-resize touch-none`, a hover color, `aria-label="Resize rail"`, `title="Drag to resize, double-click to reset"`, `data-rail-resize`, `tabindex="-1"` (it has no keyboard behavior, so it is not a tab stop), `onmousedown` preventing default, `setPointerCapture` on `pointerdown`.
- **Double-click:** `updateLayout({ railWidth: RAIL_WIDTH.default })`.
- **Block native drag:** `<svelte:window ondragstart={...} />` calling `preventDefault` only while a resize runs. As the rail shrinks, a draggable note row ends up under the pressed point and its native drag cancels the pointer and stops the resize. This was a real bug in the prototype.
- **Header pad:** `AppShell.svelte` computes `--rail-header-pad` from `parseRailWidth(...)`. Inside 140-320 the pad stays at its 12 px floor, so the pad does not need the live drag width.

**Blocked by:** 01

**Status:** resolved

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`, then `bash scripts/e2e.sh e2e/specs/rail-styles.spec.ts e2e/specs/sidebars.spec.ts`.

- [x] Failing tests were written first and seen failing, for each item below.
- [x] `parseRailWidth`: in range, below 140, above 320, a fraction, a string, `NaN`, `Infinity`, `null`, `undefined`.
- [x] `mergeLayout` keeps `railWidth` from a saved file and an old file without it gets 192.
- [x] `Rail.test.ts` (stub `setPointerCapture`, which jsdom lacks): a pointer move changes the frame's width and leaves `settingsStore.layout.railWidth` unchanged; `pointerup` writes the clamped value to the real store; a hand-edited `railWidth: "wide"` renders at 192.
- [x] `Rail.test.ts`: a `dragstart` dispatched during a resize has `defaultPrevented` true, and one dispatched with no resize running has it false.
- [x] E2E: dragging to 260 gives about 260 px, the file on the mock FS (`window.__e2e.fs.readFile`) holds that width after the drag, and a restart from that saved file (`restartWithSettings` in `e2e/specs/rail-shell.spec.ts`; a bare `page.reload` reseeds the mock FS) opens at it.
- [x] E2E: dragging to 1000 gives 320, dragging to 10 gives 140, and a double-click on the handle gives 192 and saves it.
- [x] E2E: a drag left from 320 px with the note list on the Inbox lens, ending past a note row, follows the pointer to the end, proving the row's native drag does not cancel it.
- [x] E2E: header text still starts past the rail at 140 and 320 px.

## Notes

- The E2E drag helper is in the prototype spec (`dragRailTo`).
- At 320 px the editor falls under 600 px at 1440 px with every panel open. That is the owner's own drag, not the default, and `sidebars.spec.ts` only checks defaults.

## Comments

2026-11-06, branch `issue/02-resizable-width`: the labeled rail resizes from its right edge, clamped to 140-320, with a double-click reset to 192. The width is saved once per drag in `layout.railWidth`, and native drags are blocked while a resize runs. Fix round: only a primary press starts a resize (`Rail.svelte`, round 1 finding).
Tests: full suite at 73511a1a6 (`pnpm vitest run && pnpm build`) exit 0, 565 files, 13447 passed, 1 skipped, 1 todo, build done. `Rail.test.ts` 65 passed; `pnpm check` 0 errors, 0 warnings. E2E in round 2: `rail-styles.spec.ts` 18 passed; the 23-test run over `rail-styles` and `sidebars` was in round 1, before the fix.
Reviews: round 1 APPROVED (one minor finding, fixed); round 2 APPROVED (no findings).
