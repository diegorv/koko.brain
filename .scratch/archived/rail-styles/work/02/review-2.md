VERDICT: APPROVED

## Previous findings

| # | Finding | Status | Evidence |
|---|---------|--------|----------|
| 1 | minor, `Rail.svelte`: `startResize` does not filter by button, so a right press starts a resize | resolved | `Rail.svelte:173` returns before setting `resizeStart` or capturing the pointer when `event.button !== 0`. The new case 'ignores a press with any button but the primary one' covers capture, `dragstart`, width during a move and the store after `pointerup`. With the guard reverted to the pre-fix `Rail.svelte`, that one test fails and the other 64 in the file pass (temporary probe, restored). |

## Acceptance criteria

- [met] `Rail.test.ts` (stub `setPointerCapture`, which jsdom lacks): a pointer move changes the frame's width and leaves `settingsStore.layout.railWidth` unchanged; `pointerup` writes the clamped value to the real store; a hand-edited `railWidth: "wide"` renders at 192. — The `describe('resize')` cases are unchanged by the fix and pass; their events use the default `button: 0`, so the guard lets them through.
- [met] `Rail.test.ts`: a `dragstart` dispatched during a resize has `defaultPrevented` true, and one dispatched with no resize running has it false. — 'cancels a native dragstart only while a resize runs' passes, and the new case adds that a right press does not block `dragstart`.
- [met] E2E: dragging to 260 gives about 260 px, the file on the mock FS (`window.__e2e.fs.readFile`) holds that width after the drag, and a restart from that saved file (`restartWithSettings` in `e2e/specs/rail-shell.spec.ts`; a bare `page.reload` reseeds the mock FS) opens at it. — `e2e/specs/rail-styles.spec.ts` passes in my run with the guard in place; `page.mouse.down()` presses the left button.
- [met] E2E: dragging to 1000 gives 320, dragging to 10 gives 140, and a double-click on the handle gives 192 and saves it. — Same spec run, passes. A double-click fires primary presses, so the guard does not change it.
- [met] E2E: a drag left from 320 px with the note list on the Inbox lens, ending past a note row, follows the pointer to the end, proving the row's native drag does not cancel it. — Same spec run, passes.

## Findings

None open or new.

## Other checks

- The fix is two lines in `Rail.svelte` and one added test. No test was changed, weakened or removed, and there is no scope creep.
- A right press now leaves `resizeStart` and `dragWidth` null, so its `pointerup` reaches `endResize` and writes nothing, and `blockDragWhileResizing` stays inactive. The `mousedown` `preventDefault` still runs for every button; it does not block `contextmenu`.
- A second button pressed during a left drag fires no `pointerdown` under the Pointer Events chorded-button rules, so it does not reach the guard. This is from the spec as I remember it, not exercised here.
- Typecheck: `pnpm check` exit 0, 0 errors, 0 warnings.
- `pnpm vitest run` on `Rail.test.ts`, `LayoutSection.test.ts`, `mod-rail-icon.test.ts` and `AppShell.test.ts`: exit 0, 105 passed.
- `bash scripts/e2e.sh e2e/specs/rail-styles.spec.ts`: exit 0, 18 passed.
- The full suite and `pnpm build` were not run; they are deliver's.
- The worktree was clean after the probe.
- Not verified: WebKit and the real Tauri app. In particular, whether a macOS Control-click reports `button: 0` there, which would pass the guard and could still open the native menu with a resize running. Whether that menu swallows `pointerup` also stays unreproduced, as in round 1.
