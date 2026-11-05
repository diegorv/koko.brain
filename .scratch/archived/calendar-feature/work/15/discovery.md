# 15 discovery: one owner for creating a typed note

## Files that change

- `src/lib/core/note-creator/note-creator.service.ts:67-79`: the template block of `openOrCreateNote` moves unchanged into an exported `loadNoteTemplate({ templatePath, inlineTemplate, title, customVariables, contextDate }): Promise<string>`; `openOrCreateNote` calls it and hands the result to `create_note` (`:81`).
- `src/lib/features/type-definitions/type-definitions.service.ts:30-58`: extract `resolveTypedNoteTarget(typeName, baseTitle)` (metadata lookup, `buildTypeNoteDir`, `readDir` dedupe, `templatePath`, `inlineTemplate`); `createNoteOfType` calls it with `Untitled ${typeName}`; add `createTypedNote`.
- `src/tests/lib/core/note-creator/note-creator.service.test.ts`: new `describe('loadNoteTemplate')`.
- `src/tests/lib/features/type-definitions/type-definitions.service.test.ts`: note-creator mock gains `loadNoteTemplate` via `vi.importActual` (same `$lib/core/note-creator/note-creator.service` specifier as the module import); new `describe('createTypedNote')`.

## Plan

1. Tests first: `loadNoteTemplate` cases and `createTypedNote` cases; run them and see them fail on the missing exports.
2. Move the template block, extract the resolver, add `createTypedNote`; the existing `createNoteOfType` tests (`:157-316`) and `openOrCreateNote` tests stay unchanged.
3. One `refactor(type-definitions)` commit (the ticket asks for one), then the implement comment.

## Removal proof (template block)

`templatePath`, `inlineTemplate`, `title`, `customVariables`, `contextDate` are read only at `:46` (destructure), `:69-79` (template block) in `openOrCreateNote`; `filePath` is not part of the moved lines. `loadNoteTemplate` does the same `readTextFile(templatePath)` with the `inlineTemplate ?? ''` fallback on both branches and the same `processTemplate(content, title, customVariables, contextDate)` (`src/lib/utils/template.ts:22-27`). The `create_folder` call stays before it, so call order to Tauri is unchanged.

## Prior art

- `openOrCreateNote` template tests (`note-creator.service.test.ts:117-210`) are the template for the `loadNoteTemplate` cases.
- `createNoteOfType` tests (`type-definitions.service.test.ts:157-316`) and `makeMeta` for the `createTypedNote` cases; `createFile` is already mocked there.

## Risks

- `createNoteOfType` tests assert `openOrCreateNote` with an exact 4-key object: pass exactly `{ filePath, templatePath, inlineTemplate, title }`.
- `vi.importActual` of note-creator pulls the real `editor.service` / `fs.service` mocks from this file (already mocked), so no new real IPC path runs.
- `createFile` dedupes again against `readDir`; it re-reads the same folder, so the name it picks matches `target.fileName` unless the folder changed in between. The returned path is the one `createFile` reports.

## Defaults taken

- `resolveTypedNoteTarget` returns `fileName` with `.md` (`Standup 1.md`) and `title` without it; `dir` is the absolute folder.
- `contextDate` is a `Dayjs`, like `NoteCreationOptions.contextDate`. `createTypedNote` passes no `customVariables`.
- `create_folder` runs before `loadNoteTemplate`, as the ticket orders it; a throwing `buildContent` may leave an empty folder but never a file.
