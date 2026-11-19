# 52 discovery

Line numbers are at `31848f51d` (shell-sidebars-ux 15 and 19 have landed, so they moved from the Issue's).

## Files that change

1. `src/lib/features/note-list/NoteRow.svelte`
   - `:34` prop doc "Dims the row and adds an archive mark ..." becomes "Adds an archive mark ...".
   - `:108` drops `{archived ? 'opacity-60' : ''}`; `data-note-row-archived` (`:107`) and the Archive icon (`:134-136`) stay.
   - `:141`, `:152`, `:162` chips: `text-primary/80` becomes `text-primary`.
2. `src/lib/features/search/SearchResult.svelte:171` snippet: `text-file-explorer-fg/60` becomes `text-file-explorer-muted-fg`.
3. `src/tests/fixtures/NoteRowMenuHarness.svelte`: passes optional `archived` and `typeName` to every row, so `NoteRow.test.ts` can mount an archived, typed row with a property pill.

## Tests

- `src/tests/lib/core/settings/theme-builder.logic.test.ts`, new `describe` over `BUILTIN_THEMES` (pattern of the tab strip hover test, `:277-285`): chip bg = `flatten(alpha(primary, '1a'), fileExplorerBg)`; `contrastRatio(primary, bg) >= 4.5` on every theme; `contrastRatio(alpha(primary, 'cc'), bg)` (the old `/80`) is below 4.5 on at least one theme, Lavender Haze among them (about 3.58).
- `src/tests/lib/features/note-list/NoteRow.test.ts`, new `describe`: an archived row has `data-note-row-archived`, `[data-note-row-archived-icon]` and no `opacity-60`; the type chip and a property pill have `text-primary` and no `/80` class. Fails today on the class assertions.
- `src/tests/lib/features/search/SearchResult.test.ts`: snippet has `text-file-explorer-muted-fg` and no `/60` (pattern of the subtitle test, `:121-131`). Fails today.
- `RailNoteList.toolbar.test.ts` archived filter test (`:351`) stays green unchanged.

## Risks and defaults

- The theme test is a data check on the theme hexes; it holds before the component change too. The red step is the two component tests. Default taken: the theme check is the Issue's evidence pinned as a test, not the red test.
- Tailwind `/10` is 0.10; the test uses `'1a'` (0.102), as the tab strip test does. The difference is below the 0.005 ratio noise.
- No selector changes, so no E2E spec run.
