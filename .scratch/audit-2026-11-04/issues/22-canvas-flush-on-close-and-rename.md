# 22: A canvas edit closed or renamed inside the debounce window reaches the .canvas file

**What to build:** A canvas edit made less than 300 ms before the canvas tab is closed, or before the canvas file is renamed, is saved into that canvas's .canvas file. Today it is dropped: `closeTab` runs `removeTab` before the keyed CanvasInner's onDestroy flush, so `onContentChangeForPath(path, json)` (via `editorStore.updateTabContentOnly`) finds no tab and writes nothing; the tab was not dirty yet, so no "unsaved changes" prompt fires either. A rename re-keys the instance and the flush targets the old path, which has no tab. Options from the Issue 01 review: flush the canvas before `removeTab` (a pre-close hook the canvas registers), or have the path-scoped writer save a path with no open tab straight to disk.

**Blocked by:** none

**Status:** wontfix

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [ ] Failing test first: in src/tests/lib/features/canvas/canvas-tab-switch.test.ts, type into canvas A's card, advance 100 ms, `closeTab(A)`, advance 3000 ms: `writeTextFile` was called with A's path and the typed text, and never with the neighbour's path.
- [ ] Failing test first: the same for a rename of A inside the debounce window: the typed text reaches the renamed file.
- [ ] Frontend gate green: pnpm check, pnpm vitest run, pnpm build.

## Notes

- **Source:** Issue 01 review, findings 1 and 2 (`.scratch/audit-2026-11-04/work/01/review.md` in Issue 01's branch history). Not a regression: the reviewer's probe drops the edit on main too.
- Code: src/lib/features/canvas/CanvasInner.svelte (`ownPath`, the onDestroy flush), src/lib/core/editor/editor.service.ts (`onContentChangeForPath`, `closeTab`).
- **Size:** S to M.

## Comments

- 2026-11-06: migrated to `.scratch/audit-2026-11-05/issues/06-canvas-edit-closed-renamed-inside-debounce-window.md` by audit 2026-11-05 (its re-checked text and any related audit findings now live there, in one plan ordered by impact on written content and daily use). Closed here as wontfix so it is worked in one place; nothing was implemented.
