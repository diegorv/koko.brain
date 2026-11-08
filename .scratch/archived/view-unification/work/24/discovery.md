# Issue 24 discovery

Line numbers in the Issue are from 4e382ea1e; current ones below.

## Bugs (all still apply)

1+2. `renameView` (`features/collection/yaml-parser.ts:383-400`): refuse a trimmed name another view of the file carries (exact, as `_rail_view` matches), and return the input unchanged when the name is the view's own. `CollectionView.svelte:470-477` writes nothing when the transform returns its base (`writeYaml:313`), so no component change. Tests: `yaml-parser.test.ts` `describe('renameView')`.
3. `validateViewName` (`type-definitions/type-definitions.logic.ts:185`) gets a `fileName` flag (default true); `ViewDialog.svelte:57` passes `!edit`. Edit view keeps the empty and taken-label checks. The `it.each` case at `ViewDialog.svelte.test.ts:664` pins the bug and flips to "Save enabled, no message".
4. `updateViewEditYaml` (`yaml-parser.ts:312-314`) deletes the `sidebar_label` / `sidebar label` aliases (Rust `aliases.rs` folds them, last wins).
5. `updateViewRailYaml` (`type-sidebar.logic.ts:577`) throws a readable error for a root that is not a mapping (scalar root throws a raw TypeError today). Same shape in `showViewInViewsYaml` / `updateViewListPropertiesYaml`: not in the Issue, left as is and reported.
6. `toSidebarNote` (`type-sidebar.logic.ts:137-139`): only a number or a non-blank numeric string pins; null, `""`, `false` (and `true`) do not.
7. `CollectionView.svelte:611` passes `onColorPropertyChange` only for `linear-calendar` (the panel hides the row without it). Test in `CollectionView.test.ts`.
8. `resolveInlinks` (`plugins/queryjs/queryjs.logic.ts:69`) returns `[]` for a path failing `isLinkTargetFile` (the Issue's first option). The same-stem basename credit stays: reported, not fixed.

## Docs and comments

- `fs.rs:122`, `fs.logic.ts:123`: already fixed by Issue 23. Dropped.
- `editor.logic.ts:22-25`: `.view` opens in the collection editor; name `.collection` / other text files instead.
- `collection-block-widget.ts:29`: "with defaults applied" is false (`{ ...view }`).
- `kb-api.ts:468`: not "the rail's rule": kb.pages() keeps archived notes.
- ADRs 0033 (`setTypeRailPin` is in `properties/lifecycle.service.ts`), 0026 (`countNavItems` gone; `isInboxEntry`), 0027 (`aliases.rs:32`, called from `parsing.rs`): dated amendments, per `docs/adr/README.md` rule on factual drift.
- `25-types-and-relationships.md` :49 and :405 (`_title_color` works without `_icon`), :267, :431, :447, :531; `12-collection.md:57` image removed, `:151` rename rule.

## Test gaps

- `e2e/mocks/vault-index.ts`: already indexes `.view` (`isIndexedFile`, `buildViewEntry`). Dropped.
- `type-definitions-views.test.ts`: fold keys through `canonicalizeKey` (`utils/frontmatter-aliases.ts`) for `.view` entries and the ignored-key check.
- Multi-document `.view`: TS test in `yaml-parser.test.ts` that `parseCollectionYaml` refuses both Rust cases.

## Defaults taken

- Tab rename refuses a duplicate always (not only when `_rail_view` resolves): simpler, and documented next to the empty-name rule. No toast, like the empty-name case.
- No `src-tauri/` change, so no cargo run in build.
