VERDICT: APPROVED

## Acceptance criteria

- [met] Failing first: `e2e/specs/focus-ring.spec.ts` gains cases that focus by keyboard a rail item (`[data-rail-item]`), a Files navigator row, a note-list row (`[data-note-row]`) and a Settings nav button; each first asserts `el.matches(':focus-visible')`, then asserts the computed `boxShadow` is not `none` (ring utilities draw with box-shadow). Run them before the class changes and see them fail — the spec adds four keyboard cases (rail item, `[data-files-navigator-root]`, `[data-note-row]`, Settings close + nav button) that reach the target with real Tab presses (`tabUntil`) and call `expectRing` (`:focus-visible` first, then `boxShadow !== 'none'`). Red probe run by this review: reverse-applied the `src/` diff, ran `bash scripts/e2e.sh e2e/specs/focus-ring.spec.ts`, and all 4 keyboard cases failed on `Expected: not "none"` (with retries), the two Issue 36 cases passed; the source was then restored (`git checkout -- src`, worktree clean).
- [met] One case clicks a rail item with the mouse and asserts its `boxShadow` stays `none` (no ring on pointer focus), which pins the `focus-visible:` choice — `a rail item clicked with the mouse shows no ring` clicks `[data-rail-item="files"]`, asserts it is focused, not `:focus-visible`, and `boxShadow === 'none'`; passes in the green E2E run below.
- [met] Every site listed above carries its recipe; no plain `focus:` utility is added anywhere — row recipe on `Rail.svelte:79` `buttonClass()` (used at :121 and :143), `SettingsPanel.svelte:141`, `NoteRow.svelte:63`, `FilesNavigator.svelte:286` `rowClass()`, `TypesNavigator.svelte:265,403`; button recipe on `SettingsPanel.svelte:126`, `TypesNavigator.svelte:208,238`, `RailNoteList.svelte:470,482`, `EditorView.svelte:93,106,119,132`, `EditorSection.svelte:53` (its four `focus:` utilities removed). Recipes match the Issue text and `button.svelte:7`. `git diff main...HEAD -U0 -- src | grep '^+' | grep -cE '(^|[ "])focus:'` prints 0.
- [met] `src/tests/lib/features/rail-shell/FilesNavigator.menu.test.ts` (about line 572, drop-target `outline-ring`) and the rest of the rail-shell, note-list and settings unit tests stay green unchanged — no file under `src/tests/` is in the diff; `pnpm vitest run src/tests/lib/features/rail-shell src/tests/lib/features/note-list src/tests/lib/app/EditorView.test.ts src/tests/lib/app/SettingsPanel.test.ts src/tests/lib/core/settings/EditorSection.test.ts src/tests/lib/core/settings/settings-headings.test.ts`: 26 files, 662 tests passed, exit 0.
- [met] No hover, selected or drop-target class changes: each class-string diff adds only `focus-visible:` utilities, plus the EditorSection `focus:` removal — every `+` class line in the diff equals its `-` line plus appended `focus-visible:outline-none focus-visible:ring-… focus-visible:ring-ring/50` (and `focus-visible:ring-inset` for rows); the hover, active (`bg-…/25`, `!bg-settings-hover-bg bg-accent`) and drop-target (`outline-dashed outline-1 outline-ring`) fragments are byte-identical. EditorSection only drops `focus:ring-ring focus:ring-2 focus:ring-offset-2 focus:outline-none` and adds the button recipe.
- [met] The commit carries the E2E change, so no `Test-Exempt` trailer is needed — `a9d17270e` stages `e2e/specs/focus-ring.spec.ts` with the eight Svelte files and has no `Test-Exempt` trailer.

## Checks run by this review

- `taskpolicy -c background pnpm check`: 0 errors, 0 warnings (exit 0).
- Targeted vitest (files listed under criterion 4): 26 files, 662 tests passed (exit 0).
- `bash scripts/e2e.sh e2e/specs/focus-ring.spec.ts e2e/specs/file-explorer.spec.ts e2e/specs/file-operations.spec.ts e2e/specs/rail-shell.spec.ts e2e/specs/settings.spec.ts`: 50 passed (exit 0).
- Red probe on the pre-change classes (criterion 1): 4 failed, 2 passed.
- Test verdict rests on: `e2e/specs/focus-ring.spec.ts` (the only test file the diff changes), the Gate E2E specs above, and the vitest files under criterion 4. The full suite and `pnpm build` are deliver's to run.

## Findings

1. minor — `src/lib/features/rail-shell/FilesNavigator.svelte:420,464`: `rowClass()` is applied to the folder row `<div>`, which is not focusable, so its `focus-visible:` utilities never match; Tab lands on the inner folder-name button (:464) and the disclosure toggle, which have no focus class and get only the Issue 36 fallback outline, which the `overflow-y-auto` tree can clip (the symptom this Issue names). Only the vault-root row (a `<button>`) shows the new ring. The Issue lists `rowClass()` as the site, so this is in scope as written; fix in a follow-up Issue: give the folder-name button (and toggle) the row recipe, or put a `has-[:focus-visible]:` ring on the row div.
2. nit — `src/lib/core/settings/sections/EditorSection.svelte:53`: the behaviour change "Browse no longer rings on a mouse click" has no test, and the TypesNavigator, RailNoteList and EditorView sites have no E2E case. The Issue does not require them; optional: a mouse-click case on the Browse trigger asserting `boxShadow === 'none'`.
3. nit — `src/lib/features/rail-shell/FilesNavigator.svelte:286`: on the vault-root button, a drop-target that is also `:focus-visible` loses its dashed outline (`focus-visible:outline-none` wins on specificity). It needs keyboard focus to stay on the root while a mouse drag starts elsewhere, which a mousedown normally moves; the Issue mandates this recipe. No change needed.

## Resolution

1. Accepted as correct, not fixed here: the Issue names `rowClass()` as the site and the review asks for a follow-up Issue. The main session should file one for the folder-name button and disclosure toggle in `FilesNavigator.svelte` (row recipe on the buttons, or a `has-[:focus-visible]:` ring on the row div).
2. Rejected: optional, and not required by the Issue's acceptance criteria. A mouse-click case on the Browse trigger can go in the same follow-up Issue.
3. No change, as the review concludes.
