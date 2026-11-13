# Issue 16 discovery: Explicit organization marks new notes `_organized: false`

No `spec.md` exists for rail-shell-ux; the Issue's table and Notes carry the decisions.

## Files that change

- New `src/lib/core/note-creator/explicit-organization.logic.ts`: `withUnorganizedFlag`,
  `applyExplicitOrganization`. Self-contained regexes (no YAML parse), mirroring
  `ensureFrontmatterLink`'s `insertAfterOpen` (`properties.logic.ts:520-523`).
- Call sites (one wrap each, `settingsStore.explicitOrganization`):
  1 `plugins/quick-capture/note-composer.service.ts:43` `buildContent`
  2 `app/deep-link-actions.ts:196-205` `fileContent` after injection, before `writeTextFile`
  3 `features/rail-shell/new-note.service.ts:28` `newNoteContent(rule)`
  4+13 `features/type-definitions/type-definitions.service.ts:131` inside `createTypedNote`
  5 `type-definitions.service.ts:82` `createNoteOfType` `buildContent`
  6 `app/editor-host.ts:123` non-periodic `openOrCreateNote` `buildContent`
  7 `features/rail-shell/FilesNavigator.svelte:73` `createFile(dir, 'Untitled.md', <wrapped ''>)`
  8 `app/commands.ts:86` same
  9 `features/quick-switcher/QuickSwitcher.svelte:47` same
  10 `plugins/templates/templates.service.ts:62` `buildContent`
  11 `plugins/one-on-one/one-on-one.service.ts:85` compose after `ensureFrontmatterLink`
  12 `features/note-action-bar/note-action-bar.service.ts:94` wrap the link content
  14 `features/deep-link/deep-link.service.ts:315-336` silent `content` + `buildContent`
- Docs: `core/settings/sections/TypesSection.svelte:13`, `help/documentation/19-settings.md:148`,
  `help/documentation/25-*.md:253,277-284,553`, ADR 0026 amendment under Lifecycle,
  `help/examples/type-definitions-features/{person-bob.md,project-inbox-example.md,README.md}`.

## Plan

1. Logic test (red) then `explicit-organization.logic.ts` (green). Commit.
2. `openOrCreateNote` family (1, 5, 6, 10, 11, 14 non-silent): wrap + tests in each path's
   test file; the mocked `openOrCreateNote` gets its `buildContent` run on a sample.
   `_organized: true` template wins (path 10). Off -> no key (path 10). Failure (path 6/5).
3. `createFile`/`writeTextFile` family (2, 3, 4+13, 7, 8, 9, 12, 14 silent) + tests;
   new `QuickSwitcher.test.ts`. Off -> no key, failure propagates (path 3 or 7).
4. Periodic: parameterised test in `periodic-notes.service.test.ts`; wikilink `2026-11-04`
   in `src/tests/lib/app/editor-host.test.ts`. Inbox rule writes the key once.
5. Settings text, help 19/25, ADR 0026 amendment, help examples; `pnpm vitest run src/tests/help`.

## Prior-art tests

- `RailNoteList.test.ts:902` (`createFile` content assertion), `FilesNavigator.menu.test.ts:209`
  (`create_note` content via mocked `invoke`), `note-action-bar.service.test.ts:210`.

## Risks / defaults

- Key detection: a top-level (unindented) block line matching `/^_?organized\s*:/`; the
  optional whitespace before `:` is a superset of the Issue's "starts with `_organized:`".
- A `---` opener with no closing `---` counts as "no frontmatter": the block is prepended.
- Paths 7/8/9 pass `''` explicitly when off; `createFile`'s default is `''`, so the write is
  identical (existing `create_note` assertions expect `content: ''`).
- The `openOrCreateNote` paths without their own `buildContent` (1, 5, 6, 10, 14) pass
  `buildContent: settingsStore.explicitOrganization ? withUnorganizedFlag : undefined`, the
  same as `applyExplicitOrganization` but with no option at all when off: their existing
  exact `toHaveBeenCalledWith({...})` assertions must stay unchanged. Path 11 composes
  `applyExplicitOrganization` after `ensureFrontmatterLink`. The switch is read at the call.
- The `create_note`-rejecting test on an `openOrCreateNote` path runs the Cmd+N composer
  through the real `openOrCreateNote` in `note-creator.service.test.ts`: every path test file
  mocks `openOrCreateNote`.
