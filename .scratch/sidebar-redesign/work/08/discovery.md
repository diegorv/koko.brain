# Issue 08 discovery: New here on the note list

No `spec.md`; source is `PRD.md` (Lenses table "+ New here" column, Q16) and ADR 0033. Builds on
`work/07` (rail shell, `lens.logic.ts`, `RailNoteList.svelte`, registry); only the differences are listed.

## Files that change
- NEW `utils/capture-path.ts`: `buildCaptureFolder(vaultPath, baseFolder, folderFormat, date)`, the
  folder half of `plugins/quick-capture/note-composer.logic.ts:9-22::buildCapturePath`, which now calls
  it. The rail shell cannot import `plugins/` (`rail-shell.boundary.test.ts`), so the Cmd+N folder rule
  moves to `utils/` and stays one rule.
- `features/rail-shell/rail-shell.types.ts`: `NewNoteRule { folder; frontmatter }`, `NewNoteContext`
  (vault path, `periodicNotes.folder`, `quickCapture.folderFormat`, date), optional
  `RailLensProvider.newNote(lens, ctx)`.
- `features/rail-shell/lens.logic.ts`: `newNoteRule(lens, ctx, providers)`: Inbox -> Cmd+N folder +
  `{ _organized: false }`; other kinds -> the provider's `newNote`, none -> null. `newNoteContent(rule)`
  renders the frontmatter block.
- NEW `features/rail-shell/new-note.service.ts`: `createNoteHere(rule)`: `create_folder` (the dated
  folder may not exist), `fs.service::createFile(folder, 'Untitled.md', content)` (dedupe, `create_note`,
  `applyNoteChange` source `fs`), then `openFileInEditor`. Same shape as `createTypedNote`.
- `features/rail-shell/RailNoteList.svelte`: header "+ New here" button, only when the rule is non-null;
  failure -> `toast.error`.

## Plan (test-first)
1. `utils/capture-path.test.ts` + existing `note-composer.logic` tests stay green.
2. `lens.logic.test.ts`: Inbox rule == folder of `buildCapturePath` + `_organized: false`; no vault -> null;
   provider without `newNote` / unknown kind -> null; provider `newNote` dispatched; content rendering.
3. `new-note.service.test.ts` (mock `invoke`, `plugin-fs`, editor service; real `createFile` path is the
   fs.service owner): folder created before write, content, opens path; create failure rejects, opens nothing.
4. `RailNoteList.test.ts`: button shown for Inbox, hidden for a provider lens without a rule; click
   creates + opens, new entry appears after `setEntries`; failure toasts.
5. E2E `rail-shell.spec.ts`: New here creates the file under the Cmd+N folder with `_organized: false`,
   opens it, the row appears.

## Prior art
`type-definitions.service.test.ts` (`createTypedNote`), `RailNoteList.test.ts`, `rail-shell.spec.ts`.

## Defaults taken
- Filename `Untitled.md`, deduped by `createFile` (like `Untitled <Type>`), not the Cmd+N timestamp name;
  no template (PRD: "a plain note"). Only the folder comes from Cmd+N.
- An open failure after a successful write is toasted too; the note then exists (not rolled back).

## Risks
- The new row shows only after the throttled `vaultIndexVersion` bump reloads the entries (~2 s).
