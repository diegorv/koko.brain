VERDICT: APPROVED

## Acceptance criteria

- [met] Failing test first, a contrast test over `BUILTIN_THEMES` and the hard palettes fixture: each new token, resolved with `mixColors` (OKLab, as `color-mix(in oklab)`), is at least 4.5:1 on its tint flattened over each surface it is used on (fileExplorerBg for rows, popover for menus, background for search), and the old raw color on the same stack fails on at least one theme. — `src/tests/lib/tint-text-tokens.test.ts` parses every `--*-tint-fg` share from `src/app.css:431-439`, resolves it with `mixColors`, and checks 4.5:1 over `BUILTIN_THEMES` plus Zettlr Bielefeld Light and Tolaria Light. Those two are built in the test file from koko.brain-themes eb9f062 with a source comment, so the shared fixture is untouched. The surfaces are fileExplorerBg for rows, popover for menus and background for search, plus the hover and badge stacks. A raw-color assertion per token fails on at least one stack. Mutation probe: a copy of the test with primary set to 20% and destructive set to 70% fails 4 stack tests (selected note row, hovered wikilink pill, highlighted destructive item, hovered Retry), so the gate is live. Its primary, file-explorer-primary and destructive values match `research/theme-tokens.json` for both hard themes.
- [met] Component tests: the selected `NoteRow` title and pills, a search badge and the destructive menu item carry the new token class or style, not `text-primary` / `text-destructive`. — `NoteRow.test.ts` covers the selected title, subtitle and pills (`text-primary-tint-fg`, not `text-primary`, `bg-list-bg` chip) and the idle pills. `SearchResult.test.ts` covers all three badges. The destructive dropdown item is covered in `NoteActionBar.test.ts` and the context item in `NoteRowMenu.test.ts`: the three `*-destructive-tint-fg` variants are present and no class ends in `text-destructive`.
- [met] Frontend gate passes. — I ran `pnpm check` in the worktree: exit 0, 0 errors, 0 warnings. I ran 29 targeted vitest files: 760 tests, exit 0 (list below). The full suite is deliver's to run.

## Findings

1. minor — `src/lib/features/note-list/NoteRow.svelte:131`: the branch conflicts with main. `git merge-tree main HEAD` reports a content conflict in NoteRow.svelte, because Issue 02 (c648cd459) rewrote the title line to `style:color={titleColor}` (a `$derived` lifted with `readableOn`). Fix during deliver's sync: keep both sides, `class="... {isActive ? 'text-primary-tint-fg' : ''} ..." style:color={titleColor}`. Then re-run NoteRow.test.ts, FilesNavigator.test.ts and TypesNavigator.test.ts, which auto-merge with main's Issue 02 edits.
2. nit — `src/lib/features/rail-shell/FilesNavigator.svelte:561,563`, `src/lib/features/rail-shell/TypesNavigator.svelte:292,422`: the selected-row folder, type and view icons keep raw `text-file-explorer-primary` on the 25% tint. These are non-text, so 3:1 applies. On the built-ins they measure 3.70 (KokoBrain Default) and 3.87 (Lavender Haze), so they pass. Catalog themes were not measured; the audit's text figures for this stack go as low as 2.97. The Issue scopes text only, so no change here; record it for Issue 05 or a follow-up if wanted.
3. nit — `src/tests/lib/tint-text-tokens.test.ts:80-95`: the row and search surfaces follow the Issue (fileExplorerBg and background). The real surfaces are `bg-list-bg` (`RailNoteList.svelte:914`, `SearchPanel.svelte:230`) and `bg-nav-bg`. The test set is only four themes, so it would accept file-explorer-primary up to 29%, while discovery measured 20% as the limit on the 28 audited themes. A regression from 21% to 29% would pass the gate. That is a limit of the prescribed theme set, not a bug; a later Issue that moves onto the shared fixture can widen it.
4. nit — `src/tests/lib/tint-text-tokens.test.ts:22-40`: the Zettlr Bielefeld Light theme built in the test differs from `research/theme-tokens.json` on `muted` (#e0e0e4 vs #dcdcdc) and `fileExplorerMutedFg` (#5c5c64 vs #686870), likely a themes-repo version difference. Only the search Text badge tests use these, and `file-explorer-fg` on #dcdcdc is still about 6.5:1. Worth confirming the source version when the palettes move to the shared fixture.

## Scope

The extra tokens (`--search-semantic-tint-fg`, `--success-tint-fg`, `--warning-tint-fg`, `--type-purple-tint-fg`) serve sites the Issue names: the Semantic badge and every BuildInfo channel. The FilterPanel "This view" pill is the same pattern as the named "All views" pill. The wikilink pill hover drops from /20 to /15, which the measurement requires. I found no scope creep and no layer-baseline or composition-root change.

## Other checks

- I traced the `:root` declaration: the only subtree that overrides theme colors is `ThemePreview.svelte` (`.column-tones`), and it uses none of the new classes.
- NoteRow renders only in `RailNoteList` on `bg-list-bg`, so the active-row `bg-list-bg` chip matches its surface.
- Tabs only in the added lines. JSDoc is present on `pillClass`.

## Test verdict rests on

`pnpm check`, plus `pnpm vitest run` over:

- **Files the branch adds or changes:** tint-text-tokens, NoteRow, theme-builder.logic, FilesNavigator, TypesNavigator, SearchResult, FilterPanel.svelte, BuildInfo, TasksView, ModActionPicker, NoteActionBar, NoteRowMenu.
- **Tests of the touched code:** FilesNavigator.menu, RailNoteList, SearchPanel.
- **Tests that read app.css or scan class names:** event-color-tokens, theme-css-contract, palette-classes, muted-text-alpha, reduced-motion-css, focus-ring-styles, radius-scale, chrome-type-scale, pane-toolbar, settings-text, mod-theme, chrome-state-styles, text-roles, layer-rules.

All 29 files and 760 tests pass. I also ran temporary probes (contrast values, the share mutation and a palette dump), then removed them, and the worktree is clean.

## Resolution

1. Fixed. Rebased the branch onto origin/main (0a6e62fbb) and resolved the NoteRow.svelte conflict by keeping both sides: the title keeps `{isActive ? 'text-primary-tint-fg' : ''}` and Issue 02's `style:color={titleColor}`. `pnpm check` exit 0; NoteRow, tint-text-tokens, FilesNavigator and TypesNavigator tests (6 files, 226 tests) pass.
2. Not changed here. The Issue scopes text only, and the built-ins pass 3:1 for the selected-row icons. Left for Issue 05 or a follow-up to measure the catalog themes.
3. Not changed here. The surfaces are the ones the Issue's criterion names; widening the stacks to list-bg / nav-bg or the theme set belongs with the move of the palettes to the shared fixture.
4. Not changed here. Only the Text badge tests read those two values and they pass with either; confirm the themes-repo version when the palettes move to the shared fixture.
