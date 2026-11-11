VERDICT: APPROVED

Reviewed `git diff main...HEAD` (e095c79b8..0b1cb85f6, 4 commits) in the worktree against the Issue's Behavior, its Review amendments (which override), and the PRD's "Run order and gates for Issues 07-13".

## Acceptance criteria

- [met] Failing test first: a matching save creates the note at the resolved path, with the template and properties; a second save creates and changes nothing. — `auto-organize.service.test.ts` "creates the note at the resolved path with the template and properties, and changes nothing at the next save": asserts `createFile('/vault/notes', 'note follow-up.md', ...)`, the template's `_type`, a computed `source: [[note]]` and literal `status: todo`, the processed `<% tp.file.title %>` body, then a second run leaves `createFile` at one call and `writeTextFile` uncalled. On main the service never calls `createFile`, so the test cannot pass there.
- [met] An existing target is untouched. A missing folder is created. — "leaves an existing target untouched" (no `createFile`, no `writeTextFile`, content stays `mine`); "creates a missing target folder" (`mkdir('/vault/Follow-ups', { recursive: true })`). Code: `auto-organize.service.ts` `createRuleNote` checks `exists(targetPath)` first, `mkdir` only after the gates, template and self-match checks.
- [met] `open: true` opens a tab; the default does not. — "opens the note in a background tab with open: true, and not by default": tabs stay `[SOURCE]` by default, become `[SOURCE, TARGET]` with `open: true`, and the active tab stays `SOURCE`.
- [met] A run with 6 matching create rules creates 5 notes and logs the rest. — "creates at most 5 notes in one run and logs the rest once": 5 `createFile` calls, `note 6.md` absent, one `error` for rule c6. `MAX_CREATES_PER_RUN = 5`; `reportCreateProblem('cap', ...)` is once per rule per session.
- [met] Gates and the `..` guard hold. — `it.each` gates test (system, templates, excluded: no `createFile`, no `mkdir`); `{status}` = `../..` refused as "leaves the vault" before any `mkdir`; a configured path starting with `/` and a non-`.md` path dropped on load; `remove` and `todoist_project` dropped from `createNote.properties` on load; source gate ("creates nothing for a source the property gates skip"); `createTargetProblem` logic tests (case-insensitive, `a..b.md` allowed). Amendment 2 (two sources together create once) and amendment 1 (self-match, path and template variants, logged once) also have tests.
- [met] The created note's after-save does not run the rules in the same run. — `auto-organize.no-chain.test.ts` "a note a rule creates is not evaluated by the rules in the same run" uses the real `createFile` (mocked IPC writes the file) with a second rule that matches only the created note: the note stays `''`, `writeTextFile` is never called, no timer is left. `createFile` (`fs.service.ts:198`) fires no after-save observer.
- [met] Settings shows "Would create N notes now". — `AutoOrganizeRuleRow.svelte` renders `data-create-count` next to the match count; row test "shows how many notes it would create now, leaving out targets that exist" expects `Would create 1 note now`; `countNotesToCreate` logic tests cover distinct targets, case-insensitive existence, gates and broken filters.
- [met] Docs updated. Frontend gate passes. — `help/documentation/22-auto-organize.md`: fields table row, Settings step, Actions list entry (amendment 9), "Creating notes" section with the `{folder}/{basename} follow-up.md` example (amendment 3), only-when-missing, cap, gates and `..`, no chaining, self-match, the Settings count and the linking recipe. `pnpm check` passes (0 errors); targeted tests pass (see below). The full `pnpm vitest run` is deliver's to run.

## Checks run by this review

- `pnpm check`: exit 0, 0 errors, 0 warnings.
- `pnpm vitest run src/tests/lib/features/auto-organize/ src/tests/lib/architecture src/tests/help/`: exit 0, 27 files, 839 tests pass (covers `auto-organize.service.test.ts`, `auto-organize.logic.test.ts`, `auto-organize.no-chain.test.ts`, `AutoOrganizeRuleRow.test.ts`, the layer and cycle tests, and `auto-organize-doc-examples.test.ts`).
- `pnpm vitest run src/tests/lib/raw-write-ratchet.test.ts src/tests/lib/core/settings/settings-controls.test.ts src/tests/lib/architecture/feature-cycle.test.ts src/tests/lib/core/note-creator src/tests/lib/core/filesystem/fs.service.test.ts`: exit 0, 7 files, 173 tests pass.
- `pnpm vitest run src/tests/scripts/sync-wiki-docs.test.ts src/tests/lib/core/settings`: exit 0, 41 files, 771 tests pass.
- The test verdict rests on the files above. The full suite was not run (deliver runs it).

## Spec and layering checks

- Run order (PRD): create runs after the move, the legacy icon and the property write, inside the `writingPaths` window; a failed move returns before it (test "creates nothing when the move fails"). Only a source that passes `propertyWriteSkipReason` creates. The early return is widened to rules with a valid `createNote`, and so is the Settings "does nothing" hint (test "hides once the rule creates a note").
- Template: loaded with `loadNoteTemplate` from `core/note-creator`; no `plugins/templates` import. No layer baseline entry, no `BASELINE_SIZE` change, no composition root added.
- Amendment 10 (Issue 08 nit): `AutoOrganizeRuleProperty.svelte` `commitKey` now saves the rename with the stored expression while the draft is refused, and the field shows the draft (`value={draftExpr}`); row test "saves a key rename while the typed expression is refused, keeping the stored expression".
- Scope: `allowRemove` on the property row and the widened key suggestions serve the create-note properties editor. No scope creep found.

## Findings

1. minor — `src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:153` — `commitCreatePath` saves a path the loader refuses (for example `notes/x` without `.md`, or `/x.md`). Settings shows the error, but at the next config load `sanitizeCreateNote` drops the whole `createNote`, so the template, note properties and "Open it" set under it vanish without a message. Fix: do not save an invalid path (keep it as a draft with the error, as the expression field does), or say in the error that the consequence is discarded on reload.
2. nit — `src/lib/features/auto-organize/auto-organize.logic.ts:374` — `countNotesToCreate` counts sources the run never acts on (notes in excluded folders, `_system`, the templates folder, type definitions) and resolves targets at the source's current folder, not after the rule's move. The discovery records this as a default; the help page's "counts the notes the rule would create right now" can overstate. Fix: skip sources the run skips (at least excluded and protected folders, which need no content), or word the help line as an estimate.
3. nit — `src/lib/features/auto-organize/auto-organize.service.ts:386` — `template` gets no `..` or `.md` check, so a hand-edited `"template": "../outside.md"` reads a file outside the vault into the new note. It is owner-authored config, not frontmatter-driven, so low risk. Fix: refuse a template with a `..` segment or a leading `/` in `sanitizeCreateNote`.
4. nit — `src/lib/features/auto-organize/auto-organize.service.ts:345` — a variable that resolves empty can leave no file name, for example `{status}.md` on a note without `status` creates `.md` at the vault root. Fix: refuse a resolved target whose base name is empty in `createTargetProblem`.
5. nit — `src/lib/features/auto-organize/auto-organize.logic.ts:332` — `sanitizeCreateNote` validates `path.trim()` but stores the untrimmed `path`, so a hand-edited `" x.md"` creates `" x.md"`. Fix: store the trimmed path (Settings already trims).

## Resolution

1. Fixed. `commitCreatePath` no longer saves a path `isValidCreatePath` refuses; the field keeps the draft and says "It is not saved." Row test "does not save a path the loader would refuse, and says so".
2. Fixed. `countNotesToCreate` leaves out sources in the protected and excluded folders; the help line now says the count is an estimate read at the note's current folder, before a move. Templates folder and type definitions as sources need content and stay out of the count (the estimate wording covers them).
3. Fixed. `sanitizeCreateNote` drops a `createNote` whose template has a `..` segment or a leading `/` (`isValidTemplatePath`), and Settings does not save such a template.
4. Fixed. `createTargetProblem` refuses a target with an empty base name ("has no file name"); the count leaves it out too.
5. Fixed. `sanitizeCreateNote` stores the trimmed path and template.
