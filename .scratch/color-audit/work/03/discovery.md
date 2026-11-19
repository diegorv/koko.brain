# Discovery: Issue 03, accent and status text on its own tint

No `spec.md`; the Issue, `report.md` and `research/` are the spec. Same measuring approach as `work/01` (real `contrastRatio` / `flatten` / `mixColors` over themes); differs in that the tokens live in `app.css` and the test reads their shares from it.

## Measured (largest share of the hue that keeps 4.5:1; sRGB composite of the Tailwind `/NN` tint)
- primary toward `--foreground`: 14 on the test set (Zettlr Bielefeld Light, active row on fileExplorerBg), 23 on the 28 audited themes over the real list-bg. Pick **14**.
- file-explorer-primary toward `--file-explorer-fg`: 29 test set, 20 on the 28 (Zettlr KMS Light active nav row). Pick **20**.
- destructive toward `--foreground`: 63 test set, 42 on the 28 (Tasks Retry hover, destructive/10 twice). Pick **40**.
- success 47, warning 50, type-purple 33 (BuildInfo /20 on setting-item-bg and card, 28 themes). Pick **45, 45, 30**.
- Pills on the active row (primary/10 over primary/25) fail even in pure foreground (4.34 Zettlr Bielefeld Light): the chip takes `bg-list-bg` there. Wikilink pill hover /20 over a hovered row fails at 14%: hover drops to /15.
- Highlighted destructive menu icons: raw destructive 2.56 on Zettlr Bordeaux Dark, under 3:1, so icons take the token too.

## Files that change
- `src/app.css`: `:root` block after `--event-*` with `--primary-tint-fg`, `--file-explorer-primary-tint-fg`, `--destructive-tint-fg`, `--search-semantic-tint-fg`, `--success-tint-fg`, `--warning-tint-fg`, `--type-purple-tint-fg`; `@theme inline` `--color-*` mappings.
- `NoteRow.svelte:108,127,129,141,152,164`: active title and subtitle `text-primary-tint-fg`; pills `text-primary-tint-fg`, `bg-primary/10` only when not active (`bg-list-bg` chip when active).
- `FilesNavigator.svelte:349,569`: active row text and count `text-file-explorer-primary-tint-fg` (`:566` muted name already excludes the active row).
- `TypesNavigator.svelte:282,299,411,430`: active row text and counts, same token.
- `SearchResult.svelte:153-156`: Both badge `--file-explorer-primary-tint-fg`; Semantic badge (builder: primary at 15%) gets `--search-semantic-tint-fg` (45%, 49 max on the 28); Text badge `text-file-explorer-fg` on `bg-muted` (4.82 min on the 28).
- `FilterPanel.svelte:96,162` (the This view pill is the same pattern), `BuildInfo.svelte:29-34` (all four channels), `TasksView.svelte:634`, `ModActionPicker.svelte:19`, `dropdown-menu-item.svelte:23`, `context-menu-item.svelte:23` (text and svg, at rest and highlighted).

## Tests
- New `src/tests/lib/tint-text-tokens.test.ts` (token declarations read from app.css by regex, as `event-color-tokens.test.ts` reads its tokens): each token parsed from app.css, resolved with `mixColors`, at least 4.5:1 on its stacks over `BUILTIN_THEMES` plus Zettlr Bielefeld Light and Tolaria Light built in-file from koko.brain-themes `themes/*.json` (commit eb9f062); raw color fails on at least one. Surfaces per the Issue: fileExplorerBg rows, popover menus, background search.
- Component: `NoteRow.test.ts`, `FilesNavigator.test.ts`, `TypesNavigator.test.ts`, `SearchResult.test.ts`, `FilterPanel.svelte.test.ts`, `BuildInfo.test.ts`, `ModActionPicker.test.ts`, `TasksView.test.ts`; menu items through the existing renders in `NoteActionBar.test.ts` (dropdown) and `NoteRowMenu.test.ts` (context).

## Defaults taken
- BuildInfo stable/nightly/preview get their own tint-fg tokens: the finding covers every channel, and the three named tokens cover only dev.
- Mix target per token: `--foreground`, except file-explorer-primary toward `--file-explorer-fg` (its rows draw on the explorer).
- Hover stacks over `file-explorer-accent/60` (search row hover under the Both badge) are not gated: share 6 would erase the hue; a transient state.

## Risks
- Issue 02 (parallel) edits title colors at `NoteRow.svelte:127`, `FilesNavigator.svelte:566`, `TypesNavigator.svelte:294`: rebase conflict likely. Issue 05 changes how primary is lifted: re-measure.
- Visual: selected rows read close to body text with a hue cast; the tint carries the selection.
