VERDICT: APPROVED

Reviewed `git diff main...HEAD` (0c2fc7063..eae1a7c45) in the worktree against the Issue's acceptance criteria. No `.scratch/ux-quick-wins/spec.md` exists.

## Acceptance criteria

- [met] Failing test first, `src/tests/lib/plugins/templates/TemplatePicker.test.ts`: after selecting "Daily" and typing "Standup", the dialog shows "Daily" and "Creates Standup.md in the vault root". — test "names the chosen template and where the new note goes" (TemplatePicker.test.ts:118-125) asserts both strings on the dialog's rendered text; the chip is TemplatePicker.svelte:95-98 (`selectedTemplateName` from `templatesStore.templates` by `selectedTemplatePath`, :24-26) and the hint :113-114. Passes in my run. Red-first is per the build report (4 failed before the component change); I did not reproduce the red state.
- [met] With `/vault/Standup.md` in the real `fsStore` tree and `vaultStore.path` `/vault`, typing "standup" shows "Enter opens the existing note"; Enter still calls `createFileFromTemplate` once with the typed name. A name with a `/` (`Projects/Standup`) shows the folder form. — test at TemplatePicker.test.ts:141-153 sets the real tree via `fsStore.setFileTree`, `vaultStore.open('/vault')` in `beforeEach`, asserts the hint, no "Creates", and `toHaveBeenCalledTimes(1)` + `toHaveBeenCalledWith('/vault/_templates/Daily.md', 'standup')`; folder test :127-133 asserts "Creates Projects/Standup.md in the vault" and no "vault root". `templates.service.ts` is untouched by the diff.
- [met] Backspace on the empty name input shows the template list again, keeps the dialog open and creates nothing (`createFileFromTemplate` not called). — handler TemplatePicker.svelte:70-73; test :162-174 asserts the file-name input is gone, the search input is present and focused, "Daily" is listed, `templatesStore.isOpen` is true and the service mock was not called. Test :176-182 covers Backspace with a typed name staying on the step.
- [met] An empty tree never shows "opens the existing note"; the existing create, trim, close and empty-Enter tests (`:66-95`) pass unchanged. — test :155-160 with the tree reset to `[]` by `fsStore.reset()`; `git diff` shows no removed line in the test file (only additions: imports, store resets in `beforeEach`, helpers, new tests), and the original four tests pass.
- [met] `src/tests/lib/plugins/templates/templates.logic.test.ts`: the existence function matches case-insensitively at the root and in a folder, ignores directories with the same name, adds `.md` the way the service does, and returns false for an empty tree and for a path outside the tree. — `describe('noteExistsInTree')` (templates.logic.test.ts:109-159) covers each: root `standup`/`STANDUP.md`, `projects/roadmap`, directory `Archive.md` and `Projects.md`, `Standup.MD` becoming `Standup.MD.md` (matches the service's case-sensitive `endsWith('.md')`, templates.service.ts:58), `[]`, missing folder, missing name, other vault path. `withMdExtension` has its own four cases.
- [met] Tests use the real `templatesStore`, `fsStore` and `vaultStore`; only `templates.service` stays mocked, as in the file's header comment. — the only `vi.mock` in TemplatePicker.test.ts is `templates.service.js` (:7-9); fsStore/vaultStore are imported real and driven through `reset`/`_reset`/`open`/`setFileTree`.
- [met] Frontend gate: `pnpm check` and `pnpm vitest run` pass. — `pnpm check` exit 0 (236 files, 0 errors, 0 warnings); targeted tests pass (see Test verdict). The full suite is deliver's to run.

## Test verdict

Rests on my own runs in the worktree, each read from its exit status:

- `pnpm check`: exit 0, 0 errors, 0 warnings.
- `pnpm vitest run src/tests/lib/plugins/templates/TemplatePicker.test.ts src/tests/lib/plugins/templates/templates.logic.test.ts`: exit 0, 2 files, 38 tests passed.
- `pnpm vitest run src/tests/scripts/sync-wiki-docs.test.ts src/tests/lib/core/settings/settings-copy.test.ts src/tests/lib/architecture`: exit 0, 13 files, 154 tests passed (help-doc readers and layer rules; `plugins/` importing `core/` is allowed, no baseline change).
- Searched `src/tests` and `e2e` for the removed hint ("Press Enter to create") and the other picker strings: no other test asserts them.

Doc criterion (What to build item 5): help/documentation/09-quick-notes-and-templates.md:183-184 and :190 mention the chip, both hint forms, Backspace and the folder form.

Scope: the `autofocus` on the list step's `Command.Input` (TemplatePicker.svelte:118-120) is outside the Issue's list but is required for criterion 3 to be usable from the keyboard (the focused input is unmounted), and it is tested. Not scope creep.

## Findings

1. minor — src/lib/plugins/templates/TemplatePicker.svelte:70 — holding Backspace to clear a typed name auto-repeats past the empty state and drops the template selection, so the person lands on the template list and must pick the template again. Fix: add `&& !e.repeat` to the Backspace branch (and a test with `repeat: true` staying on the naming step). Recoverable and visible, so not a blocker.
2. nit — src/lib/plugins/templates/templates.logic.ts:56-57 — `toLowerCase()` is not APFS's comparison: APFS is also normalization-insensitive (an NFD `Café.md` on disk vs a typed NFC `café`), and `./` or `//` in the typed name resolves on disk but not in the segment walk. In those cases the hint says "Creates" while Enter opens the existing note. Optional fix: compare `.normalize('NFC').toLowerCase()` on both sides; the path-segment cases are rare enough to leave.
3. nit — src/lib/plugins/templates/TemplatePicker.svelte:114 — a name with `../` shows "Creates ../X.md in the vault" although the service writes outside the vault. The service behavior predates this Issue and changing it is out of scope (059 territory); worth a follow-up Issue rather than a change here.

## Resolution

1. Fixed. `TemplatePicker.svelte` ignores an auto-repeated Backspace (`!e.repeat`) for the back step; test "a held (auto-repeated) Backspace on the empty name stays on the naming step" in `TemplatePicker.test.ts` (red before the change).
2. Fixed in part. `noteExistsInTree` compares paths folded with `.normalize('NFC').toLowerCase()` on both sides; test "matches across Unicode normalization forms, as APFS does" in `templates.logic.test.ts` (red before the change). The `./` and `//` segment cases are left as is, as the finding allows: rare, and the hint is only advisory.
3. Not changed here, as the finding says (the service behavior predates this Issue). Follow-up opened: `.scratch/ux-quick-wins/issues/48-template-file-name-stays-inside-vault.md` (needs-triage; the ledger row is the main session's).
