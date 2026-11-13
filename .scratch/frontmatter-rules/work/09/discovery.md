# Issue 09 discovery: create note consequence

Builds on Issues 07/08 (`work/07/`, `work/08/`): same loader (`withValidProperties`), same once-per-rule log sets, same test helpers (`rule`, `saveAndRun`) and the same property planner (`sanitizeRuleProperties` -> `resolveComputedProperties` -> `propertiesToWrite` -> `applyPropertyWrites`), applied here to the template's parsed frontmatter instead of the source note.

## Files that change

- `features/auto-organize/auto-organize.types.ts:40-63`: `RuleCreateNote { path; template?; properties?; open? }`, `AutoOrganizeRule.createNote?`.
- `features/auto-organize/auto-organize.logic.ts`
  - new `sanitizeCreateNote(raw)`: undefined unless an object with a string `path` that is Markdown and does not start with `/`; `template` kept when a non-blank string; `properties` through `sanitizeRuleProperties` minus `remove`; `open` only `true`.
  - new `createTargetProblem(rel, vaultPath, protectedFolders, excludedFolders)`: a `..` segment, inside `_system` / templates (case-insensitive prefix, as `propertyWriteSkipReason:601`), inside an excluded folder (`isInExcludedFolder:625`).
  - new `countNotesToCreate(expression, createNote, index, vaultPath, protected, excluded)`: distinct resolved targets of matching records that pass the gates and are not in the index (case-insensitive); null when the filter is broken (as `countMatchingNotes:147`).
- `features/auto-organize/auto-organize.service.ts`
  - `:105-113` loader also sanitizes `createNote` (dropped when invalid).
  - `:272-285` early return widened to rules with a valid `createNote`; after the property write, inside the `writingPaths` window, `createRuleNotes(...)`, which runs only when the source passes `propertyWriteSkipReason`.
  - `createRuleNotes`: per matching rule, in order: cap 5 per run (rest logged once per rule), resolve with `resolveDestination` on the source record (rebuilt at the moved path), gate (`createTargetProblem`, before mkdir), module-level `creatingPaths` in-flight set, `exists(target)` -> stop, missing template -> log once, `loadNoteTemplate` (`note-creator.service.ts:53`), properties merged with `rebuildContent`, self-match check (rule filter on `buildNoteRecord(target, content)`) -> log once, mkdir parent, `createFile` (`fs.service.ts:198`), `open` -> background tab (`editorStore.addTab` then restore the active index, synchronously).
  - one `reportedCreateProblems` set keyed `kind:ruleId`, cleared in `resetAutoOrganize`.
- `AutoOrganizeRuleRow.svelte`: "Create note" path field (saves on change; blank removes `createNote`), and when set: template path field, properties rows (`AutoOrganizeRuleProperty`), "Open it" switch; "Would create N notes now" next to the match count; `doesNothing` (`:79`) counts a valid `createNote`.
- `AutoOrganizeRuleProperty.svelte:122-126` (Issue 08 nit): a key rename while the draft expression is refused saves the key with the stored expression; the refused draft and its error stay.
- `help/documentation/22-auto-organize.md`: Actions list entry, "Creating notes" section, Settings step, does-nothing sentence.

## Tests (test-first)

- `auto-organize.service.test.ts` `describe('create note')` with an in-memory `exists`/`createFile`: acceptance (template + literal + computed properties, second save does nothing), existing target untouched, missing folder mkdir, open / default, 6 rules -> 5 creates + 1 log, gates (`_system`, templates, excluded, `..` via `{status}` before mkdir), source gate, two sources together create once, self-match logs once over two saves, missing template logs once, a failed move skips the create, loader drops.
- `auto-organize.no-chain.test.ts`: real `createFile`; a rule matching only the created note does not write it in the same run.
- `auto-organize.logic.test.ts`: `sanitizeCreateNote`, `createTargetProblem`, `countNotesToCreate`.
- `AutoOrganizeRuleRow.test.ts`: create-note fields save; "Would create N notes now"; does-nothing hint hidden; key rename after a refused expr.

## Defaults taken

- Variables and `file.*` resolve against the source at its path after a move (the record is rebuilt there); Issue 08's property step keeps the pre-move record.
- Gate skips are `debug` (like property gates); cap, self-match, missing template, lossy template frontmatter with properties and a failed `createFile` are `error` once per rule per session.
- The Settings count ignores self-matching and the source gates (needs content Settings does not have).
- `open` with no active tab leaves the new tab active (there is nothing to stay on).

## Risks

- `createFile` uniquifies on a clash, so the in-flight set and `exists` are the only idempotency guard; a target created outside the app between `exists` and `createFile` becomes `X 1.md`.
