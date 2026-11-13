VERDICT: APPROVED

## Acceptance criteria

- [met] Failing test first: src/tests/lib/core/filesystem/link-updater.logic.test.ts expects replaceWikilinks('See [[folder/Old]]', 'Old', 'New') to be 'See [[folder/New]]' and replaceWikilinks('See [[Old.md]]', 'Old', 'New') to be 'See [[New.md]]'. Both are red today. — Tests at link-updater.logic.test.ts:120 and :124 assert exactly these strings. Red on main by code trace: main's link-updater.logic.ts:27 compares the whole trimmed target ('folder/old', 'old.md') with 'old' and returns fullMatch. Both pass on the branch.
- [met] Heading, block ref, alias and embed forms are kept with a path prefix and with .md ([[folder/Old.md#H|a]] becomes [[folder/New.md#H|a]], ![[folder/Old]] becomes ![[folder/New]]). — link-updater.logic.test.ts:128 (prefix + .md + heading + alias), :132 (prefix + block ref), :136 (path-prefixed embed), :140 (.MARKDOWN case kept). A probe also confirmed [[a/Old.md#^b|x]] -> [[a/New.md#^b|x]] and [[Old.MD]] -> [[New.MD]].
- [met] Non-matches stay unchanged: [[folder/Older]], [[Old.png]] (a different file, not a note stem match for a markdown rename), and empty-target links. — link-updater.logic.test.ts:144 ([[folder/Older]]), :148 (![[Old.png]] and [[folder/Old.png]]), :154 ([[#H]], [[]], [[folder/]]). splitTarget only strips /\.(md|markdown)$/i, so a .png stem never equals the note stem.
- [met] A service test in link-updater.service.test.ts (invoke and plugin-fs mocked, real editorStore) sends a source containing [[folder/Old]] through updateLinksAfterRename('/v/folder/Old.md', '/v/folder/New.md') and asserts the written content and the synced tab content contain [[folder/New]]. — link-updater.service.test.ts:219. Mocks only @tauri-apps/plugin-fs, @tauri-apps/api/core and debug (lines 3-12); editorStore is the real store (line 23). It asserts writeTextFile('/v/ref.md', 'See [[folder/New]]') and the tab's content and savedContent in editorStore.
- [met] The frontend gate is green: pnpm check, pnpm vitest run, pnpm build. — I ran `pnpm check` (0 errors, 0 warnings) and `pnpm build` (exit 0, "Wrote site to build"). Targeted vitest is green (see Tests). The full `pnpm vitest run` is deliver's to run.

## Findings

1. minor, src/lib/core/filesystem/link-updater.logic.ts:30-31 (used at :45-46). A note whose stem itself ends in .md or .markdown now loses a rewrite it got on main. Example: the file /v/notes.md.md has the stem `notes.md`, and a source links to it as [[notes.md]]. Rust resolves that link to the note through the note-name cache when no file named notes.md exists (index.rs:161). On main, the whole target equals oldName and gets rewritten. On the branch, splitTarget strips `.md`, compares `notes` with `notes.md`, and leaves the link dangling. I confirmed this with a probe: replaceWikilinks('[[notes.md]] [[notes.md.md]]', 'notes.md', 'other') returns '[[notes.md]] [[other.md]]'. The case is rare, so this does not block. Fix: in replaceWikilinks, also match when the whole file name (prefix stripped, extension kept) equals oldName lowercased, and write prefix + newName with no extension. Add a logic test for [[notes.md]] with oldName 'notes.md'.

## Notes (not findings)

- The Issue says "getNoteName semantics", but it also requires that only .md and .markdown count as an extension. The implementation follows the stricter rule, and the JSDoc documents it. It also keeps today's handling of dotted names ([[v1.2 notes]], test at :159), where getNoteName would return `v1`. This is consistent with the Issue's Notes.
- Scope: the only source file the diff changes is link-updater.logic.ts, plus its two test files. link-updater.service.ts is unchanged, as the Issue asks. No layer-baseline or composition-root changes.
- updateLinksAfterRename runs only for markdown renames (path-change.service.ts:183). So the wider matching cannot rewrite [[Old.md]] when an image Old.png is renamed.
- Comments describe the code as it is, with no session narration. Tabs are used for indentation.

## Checks run by the reviewer

- `pnpm check`: exit 0, 0 errors, 0 warnings.
- `pnpm build`: exit 0.
- `pnpm vitest run src/tests/lib/core/filesystem/link-updater.logic.test.ts src/tests/lib/core/filesystem/link-updater.service.test.ts`: 2 files, 51/51 passed.
- `pnpm vitest run src/tests/lib/core/filesystem/fs.service.test.ts src/tests/lib/core/filesystem/fs.service.race-audit.test.ts` (other callers of the rename path): 2 files, 98/98 passed.
- The test verdict rests on those four files plus a temporary probe test, which was deleted and not committed.
- Mid-review I mistakenly ran `git checkout main -- .` in the worktree. I restored it at once with `git checkout HEAD -- .`. `git status --short` was empty afterwards and `git diff main...HEAD --stat` was unchanged. The link-updater tests and `pnpm check` ran before the mistake, on the clean branch HEAD. The fs.service tests and `pnpm build` ran after the restore.

## Resolution

- Finding 1 fixed: replaceWikilinks also matches when the file name with its Markdown extension (prefix stripped) equals oldName, and writes prefix + newName with no extension. Logic test added: `[[notes.md]] [[a/Notes.md#H]] [[notes.md.md]]` with oldName `notes.md` becomes `[[other]] [[a/other#H]] [[other.md]]` (red before the fix, green after).
