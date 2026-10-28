# 15: One owner for creating a typed note

**What to build:** creating a note of a type has one owner for folder, filename dedupe and template, shared by the type sidebar's "New Event" and the calendar (D18). The template block of `openOrCreateNote` becomes an exported `loadNoteTemplate`, the target resolution of `createNoteOfType` becomes `resolveTypedNoteTarget`, and a new `createTypedNote` creates a typed note without opening it. It renders `tp.date.now()` against a caller-supplied `contextDate`, lets the caller merge content into the template through `buildContent` after seeing the deduped name, and reports `no-vault` and `create-failed` as errors. The type sidebar's behaviour does not change, which its existing tests prove by passing unchanged.

**Plan reference:** Task 14 in `.scratch/calendar-feature/plan-2026-10-28.md` (lines 339-358). The plan task is the full spec (files, line anchors, test cases); this ticket is the definition of done. The Pre-Change Checklist answers are Notes C3 (lines 981-987).

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

**Touches:**
- `src/lib/core/note-creator/note-creator.service.ts` (modify)
- `src/lib/features/type-definitions/type-definitions.service.ts` (modify)
- `src/tests/lib/core/note-creator/note-creator.service.test.ts` (modify)
- `src/tests/lib/features/type-definitions/type-definitions.service.test.ts` (modify)

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build` + `bash scripts/e2e.sh e2e/specs/wikilink-create-on-click.spec.ts` (exercises `openOrCreateNote`)

- [ ] `note-creator.service.ts` exports `loadNoteTemplate({ templatePath, inlineTemplate, title, customVariables, contextDate }): Promise<string>`, holding the template block of `openOrCreateNote` (`:67-79`) moved unchanged; `openOrCreateNote` calls it and `create_note` still receives its result
- [ ] The plan's removal proof holds: the moved lines are the only reader of those options, and the replacement performs the same `readTextFile` with the inline fallback and the same `processTemplate(content, title, customVariables, contextDate)` call (`src/lib/utils/template.ts:22-27`)
- [ ] `resolveTypedNoteTarget(typeName, baseTitle)` is extracted from `createNoteOfType` (metadata lookup, `buildTypeNoteDir`, `readDir` dedupe, `templatePath`, `inlineTemplate`) and returns `{ dir; fileName; title; templatePath; inlineTemplate }`, or null without a vault
- [ ] `createNoteOfType` calls `resolveTypedNoteTarget` and passes the same arguments to `openOrCreateNote`; the existing tests at `type-definitions.service.test.ts:157-230` pass unchanged
- [ ] `createTypedNote({ typeName, title, contextDate?, buildContent? }): Promise<string>` does not open the note: it resolves the target, calls `invoke('create_folder', { path: dir })`, then `loadNoteTemplate` with `title: target.title` and `contextDate`, then `buildContent?.(base, { fileName: target.fileName, title: target.title }) ?? base`, then `createFile(dir, fileName, content)`, and returns the created path
- [ ] `createTypedNote` throws `Error('no-vault')`, `Error('create-failed')` when `createFile` returns null (including a case-folded name collision refused by Rust `create_note`), or whatever `buildContent` throws
- [ ] `note-creator.service.test.ts` covers `loadNoteTemplate`: reads the template, falls back to inline when the read fails, uses inline alone, applies `processTemplate`, and resolves `<% tp.date.now("YYYY-MM-DD") %>` to `contextDate`; the existing `openOrCreateNote` cases stay green
- [ ] `type-definitions.service.test.ts` covers `createTypedNote`: folder from `_folder` plus `typesBaseFolder`; dedupe (the second `Standup` gets `Standup 1.md` and `buildContent` receives that target); template followed by `buildContent`; a template using `tp.date.now("YYYY-MM-DD")` with `contextDate` 2026-11-12; a throwing `buildContent` creates no file; a null `createFile` throws; no vault throws; each asserts the returned path and the `createFile` content
- [ ] The note-creator mock in `type-definitions.service.test.ts` is extended with `loadNoteTemplate` from `vi.importActual`, so the real template path runs against the mocked `readTextFile`, and its `vi.mock` string uses the same specifier as the module's import (Notes > Dependencies)
- [ ] The `createTypedNote` and `loadNoteTemplate` tests are written first, before the functions are exported (Notes C3, Q5)
- [ ] Gate green; one commit in the full CLAUDE.md format (Context, Problem, Solution, Behavior, Files with line ranges)

## Comments

- 2026-10-28 12:05 — discovery — plan in work/15/discovery.md: move the template block, extract resolveTypedNoteTarget, add createTypedNote, tests first — fce4801d
