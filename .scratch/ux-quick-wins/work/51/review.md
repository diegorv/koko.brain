VERDICT: APPROVED

Reviewed `git diff main...HEAD` (c5435b84f, 9a015fd9d). No `spec.md` in `.scratch/ux-quick-wins/`; nothing in `docs/adr/` bears on this wording.

## Acceptance criteria

- [met] Failing test first: with Create note path `Meetings/{yaer}.md`, the warning names the path and does not say a folder would be created. — `AutoOrganizeRuleRow.test.ts:1432-1441` commits `Meetings/{yaer}.md`, expects `['{yaer} is not a variable, so the path would contain {yaer}']` and no `folder` in the text. Probe: with main's `AutoOrganizeRuleRow.svelte` swapped in (then restored), this test fails; on the branch it passes.
- [met] Failing test first: typing a refused path that contains `{yaer}` shows the warning for the typed text, not for the saved path. — `AutoOrganizeRuleRow.test.ts:1443-1459`: saved `a.md`, refused `{yaer}/x.txt` stays unsaved (store still `a.md`, field shows the typed text) and the warning names `{yaer}`; a later valid `{mnth}/x.md` save moves the warning to `{mnth}`. It fails on main at the first warning assertion (main reads the saved `a.md`, so no warning), which proves it tests the draft read and not only the wording. Implementation: `pathDraft` (`AutoOrganizeRuleRow.svelte:255`), `createPathText` (`:257`), `createPathWarnings` reads it (`:360`), `oninput` sets it (`:631`), and `commitCreatePath` clears it on any save that is not refused (`:288-290`).
- [met] Frontend gate: `pnpm check` and `pnpm vitest run` pass. — `pnpm check`: 0 errors, 0 warnings (exit 0). Targeted tests: `src/tests/lib/features/auto-organize/AutoOrganizeRuleRow.test.ts` and `src/tests/lib/features/auto-organize/AutoOrganizeSection.test.ts`, 144/144 passed (exit 0). The full suite is deliver's to run.

## Findings

1. minor, `src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:255-257`: a refused `pathDraft` survives a change to `rule.createNote.path` from outside the field (a config reload, or another window). Svelte then writes the new stored path into the input, but `createPathText` still reads the old draft, so the warning describes text the field no longer shows (`pathRefused` already behaved this way before this change). Rename's `renameDraft` has the same gap, and discovery records it as accepted. Fix, if wanted later: clear `pathDraft` and `pathRefused` in an `$effect` that tracks `rule.createNote?.path`. This does not block the Issue.
2. nit, `src/tests/lib/features/auto-organize/AutoOrganizeRuleRow.test.ts:1432-1459`: both new tests go through `commit` (input then change). Neither pins the live warning while the user types, before `change`, which the build chose as a default (`oninput`, `:631`). Fix: add a `type(...)`-only case that expects the warning before the field is left.

## Other checks

- Red first, verified by probe: the "template variables" describe gives 3 failed and 5 passed against main's component, and all 8 pass on the branch.
- Wording search: no other test, e2e spec or help page asserts the old create-path wording (`grep` over `src`, `e2e`, `help`, `docs`). The Move to folder and Rename wording is unchanged (`:353-354`).
- Rows are keyed by `rule.id` (`AutoOrganizeSection.svelte:213`), so a draft cannot leak to another rule's row.
- Scope: only the component, its test file and the workflow's discovery record changed. No layer-baseline or composition-root changes.
- Worktree clean after the probe (`git status --short` empty).

## Resolution

1. Fixed. `AutoOrganizeRuleRow.svelte`: an `$effect` on a `$derived` of `rule.createNote?.path` clears `pathDraft` and `pathRefused` when the stored path changes from outside the field. The derived keeps a new `rule` object with the same path (another field edited) from dropping the draft. Tests: "drops a refused create note path draft when the stored path changes from outside the field" (failed before the fix) and "keeps a refused create note path draft when another field of the rule changes". Rename's draft gap is left as discovery recorded it.
2. Fixed. Test "warns about the create note path while it is typed, before the field is left" uses `type()` only and expects the warning with the store unchanged.
