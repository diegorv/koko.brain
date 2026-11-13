VERDICT: APPROVED

## Acceptance criteria

- [met] Failing first: a case in `e2e/specs/focus-ring.spec.ts` tabs to a folder row's toggle and to its folder-name button in the Files navigator and asserts the ring (box-shadow or outline in the ring color) on the focused button or its row; it fails on the current code — `a folder row rings when its toggle or folder-name button is focused by keyboard` (`focus-ring.spec.ts:68-86`) reaches `[data-files-navigator-toggle]` with real Tab presses (`tabUntil`), asserts `:focus-visible` and the row's computed `boxShadow !== 'none'`, then Tabs once to the same row's `[data-files-navigator-folder]` and asserts the same. Red probe run by this review: replaced `FilesNavigator.svelte` with `main`'s version, ran `bash scripts/e2e.sh e2e/specs/focus-ring.spec.ts`: the new keyboard case failed (`Expected: not "none"`, also on retry), 8 passed; the file was restored with `git checkout HEAD --` (worktree clean). The test does not compare the shadow to the ring color (finding 1), but a probe by this review read the row's shadow on keyboard focus as `oklab(0.729203 0.010925 -0.0795328 / 0.5) 0px 0px 0px 2px inset`, equal to `color-mix(in oklab, var(--ring) 50%, transparent)`.
- [met] A mouse click on the same folder-name button shows no ring (`:focus-visible` does not match after a pointer click), covered in the same spec; this also covers the optional Browse-trigger mouse case from the Issue 37 review — `a folder-name button clicked with the mouse shows no ring` (`focus-ring.spec.ts:88-97`) clicks a folder-row `[data-files-navigator-folder]`, asserts it is focused, not `:focus-visible`, and that both the button's and its row's `boxShadow` are `none`. A `has-[button:focus]` or `focus-within` variant would fail it. Passes in this review's green E2E run.
- [met] The vault-root row, file rows and Types navigator rows keep their Issue 37 focus behavior (existing `focus-ring.spec.ts` cases stay green) — `rowClass()` (`FilesNavigator.svelte:283-289`) and `TypesNavigator.svelte` are not in the diff; the new `has-[button:focus-visible]:` classes are appended only at the folder-row call site (`FilesNavigator.svelte:421`). All seven pre-existing cases in `focus-ring.spec.ts` pass in this review's run (9 passed, exit 0), including `a Files navigator row focused by keyboard shows the ring` and the Issue 36 toggle-outline case.
- [met] Drag-and-drop styling on the row (`dropTarget` dashed outline) is unchanged — the diff touches no `outline-dashed`/`outline-ring` fragment (`rowClass()` untouched); the new ring paints with `box-shadow`, and `focus-visible:outline-none` sits on the inner folder-name button (`:465`), not on the row div that carries the dashed outline, so a focused drop-target row keeps its outline. `FilesNavigator.menu.test.ts:572` (`outline-ring` on the drop row) passes unchanged.

## Findings

1. nit — `e2e/specs/focus-ring.spec.ts:77,83`: the row assertions check only `boxShadow !== 'none'`, not that the shadow is in the ring color the criterion names. Any future shadow utility on the row would pass it. This review's probe confirmed the color matches today. Optional fix: compare against the `color-mix(in oklab, var(--ring) 50%, transparent)` probe the Issue 36 case (`:42-52`) already uses, e.g. `expect(boxShadow).toContain(ringColor)`.
2. nit — `src/lib/features/rail-shell/FilesNavigator.svelte:418-421`: the reason for scoping the variant to `button` (the rename input must not ring the row) has no test. This review's probe (right-click, Rename, input focused and `:focus-visible`) read the row's `boxShadow` as `none`, so the code is right; a regression to `has-[:focus-visible]` would go unnoticed. Optional: a short E2E case asserting the row has no ring while renaming.

## Checks run by this review

- `taskpolicy -c background pnpm check`: 216 files, 0 errors, 0 warnings, exit 0.
- `taskpolicy -c background pnpm vitest run src/tests/lib/features/rail-shell`: 590 passed, 1 failed with a 5000 ms timeout in `RailNoteList.test.ts` ("offers Favorite and Change icon on a markdown row only...") at load average 19, a file and component the diff does not touch. Re-run alone: `RailNoteList.test.ts` 65 passed, exit 0. `FilesNavigator.test.ts`, `FilesNavigator.menu.test.ts`, `FilesNavigator.new-view.test.ts` passed in the first run.
- `bash scripts/e2e.sh e2e/specs/focus-ring.spec.ts`: 9 passed, exit 0.
- Red probe (pre-fix component): 1 failed (the new keyboard case), 8 passed.
- Probe spec (temporary, deleted after the run): ring color on the keyboard-focused row matches the ring token; row `boxShadow` is `none` during rename. 1 passed.
- Scope: the diff is the two class edits, one comment, and two E2E cases; no scope creep. The `fix:` commit stages `e2e/specs/focus-ring.spec.ts`, so no `Test-Exempt` trailer is needed. No layer-baseline change.
- Test verdict rests on: `e2e/specs/focus-ring.spec.ts` (the only test file the diff changes) and `src/tests/lib/features/rail-shell/` (the unit tests of the changed component). The full `pnpm vitest run` and `pnpm build` are deliver's to run. E2E runs Chromium only; WKWebView rendering is not checked.

## Resolution

1. Fixed: the two folder-row assertions in `e2e/specs/focus-ring.spec.ts` now check `boxShadow` contains the ring color, resolved by a shared `ringToken()` probe (`color-mix(in oklab, var(--ring) 50%, transparent)`).
2. Fixed: new E2E case `a folder row being renamed shows no row ring` opens Rename from the context menu, asserts the input is focused and `:focus-visible`, and that the row's `boxShadow` is `none`.

`bash scripts/e2e.sh e2e/specs/focus-ring.spec.ts`: 10 passed, exit 0. `pnpm check`: 0 errors.
