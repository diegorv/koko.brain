# 02 discovery: My people counts only 1:1s

## Files that change

- `src/lib/plugins/one-on-one/one-on-one.logic.ts:161-194` (`buildMyPeople`): the last-1:1 loop skips an entry unless `isOneOnOneNote(entry)`: frontmatter `kind` is `one-on-one` (trimmed, case-insensitive) or `entry.tags` holds `type/meeting/one-one` (the tag of brain-os's `_system/templates/periodic-note/One-On-One.md`, case-insensitive). New pure `withOneOnOneKind(content)`: adds `kind: one-on-one` after the opening `---` unless a top-level `kind:` line exists (line-based, never throws, same shape as `withUnorganizedFlag` in `core/note-creator/explicit-organization.logic.ts`).
- `src/lib/plugins/one-on-one/one-on-one.service.ts:96` (`createOneOnOneNote`): `buildContent` runs `withOneOnOneKind` before `ensureFrontmatterLink`, so a 1:1 made by New 1:1 counts even with the default empty template.
- `help/documentation/09-quick-notes-and-templates.md:108,120`: the created note gets `kind: one-on-one`; only notes with that kind or tag count.

## Tests (test-first)

- `src/tests/lib/plugins/one-on-one/one-on-one.logic.test.ts` `describe('buildMyPeople')` (~l.282): a group meeting `_related_to` the person (no kind) does not reset the counter while a `kind: one-on-one` note does; the tag counts; another `kind` does not. Existing fixtures that model a 1:1 gain `kind: 'one-on-one'` (a `oneOnOne(path, names, fm)` helper). `withOneOnOneKind` cases: no frontmatter, empty block, block without kind, block with kind (unchanged), nested `  kind:` not a top-level match.
- `one-on-one.service.test.ts:216,226`, `one-on-one.create.test.ts:91-140`, `MyPeopleSection.test.ts:46,161,169`: the written content now carries `kind: one-on-one`; the indexed-note fixture in MyPeopleSection carries it too, so "New 1:1 then 0d" still holds end to end.

## Risks

- Existing 1:1 notes without `kind: one-on-one` or the tag stop counting (the vault's template carries both, per the Issue the 14 reports are set up).
- A template that writes another `kind` (e.g. `kind: meeting`) keeps it; such a 1:1 counts only through the tag.

## Defaults taken

- Created 1:1s get `kind: one-on-one` (not asked by the Issue). Without it, New 1:1 with the default empty template would never count, breaking the tested "New 1:1, row reads 0d" flow and the doc's promise at `09-quick-notes-and-templates.md:120`.
- The tag matches exactly (no child tags such as `type/meeting/one-one/x`); body `#type/meeting/one-one` counts as well, since `entry.tags` merges frontmatter and inline tags.
- `kind` must be a string; a list value does not count.
