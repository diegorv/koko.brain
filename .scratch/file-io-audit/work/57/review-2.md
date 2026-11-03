VERDICT: APPROVED

## Previous findings

| # | Finding | Status | Evidence |
|---|---------|--------|----------|
| 1 | nit: Mod-z not covered by the tests | resolved | `table-widget.test.ts:372-384` makes one edit through `contentDOM` (asserted), then dispatches `keydown` `z` + `ctrlKey` on the focused select and asserts the edit survives and the event is not default-prevented. I restored `widgets.ts` from `main` and ran `-t "Mod-z"`: 1 failed (exit 1). With the branch `widgets.ts` back, the file passes 36/36 (exit 0). |

## Acceptance criteria

- [met] Failing test first: a mounted table with a meta-bind select in a cell, the editor cursor on another line; Enter and Backspace on the focused select leave the note unchanged — the `it.each` at `table-widget.test.ts:362-370` is unchanged by the fix commit; the file passes 36/36 on the branch.
- [met] `TableWidget.ignoreEvent(event)` returns `isFormControlInputEvent(event)`; mouse events and keys outside a form control keep today's routing (existing table-widget tests pass) — the fix commit does not touch `widgets.ts`; the mousedown and contentDOM Backspace tests still pass, as does every other test in the file.

## Findings

None open or new.

## Other checks

- Fix diff (`0dce12b0..HEAD`): one added test (14 lines) plus the `## Resolution` section in `review.md`. No source change, no test weakened or deleted, no layer-baseline change, no scope creep.
- Typecheck: `pnpm check` exit 0, 0 errors, 0 warnings.
- `table-widget.test.ts`: 36 passed, exit 0. The full suite and `pnpm build` are for deliver to run.
- Not verified: real WebKit on macOS (Cmd instead of Ctrl, native `<select>` key handling). jsdom maps Mod to Ctrl, so the test uses `ctrlKey`.
