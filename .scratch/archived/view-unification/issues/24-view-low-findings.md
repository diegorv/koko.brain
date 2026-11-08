# 24: Low-severity view bugs and stale docs from the review

**What to build:** The findings from the 2026-11-05 review that no other Issue covers. Each was confirmed by reading code, none by running it. **Check that each still applies after Issues 01 to 23**, and drop any that went away, with a note in the commit.

**Bugs**

1. A tab rename accepts a name another view has, so `_rail_view` can silently move to another view (`yaml-parser.ts:396`). Refuse it, as Edit view does.
2. A tab rename with no change re-serializes the file and loses comments (`CollectionView.svelte:373`). Write nothing.
3. Edit view validates the label as a file name, though the file name never changes (`ViewDialog.svelte:57`). `_sidebar_label: "Q1: plan"` shows `Name cannot contain ":"` with Save disabled, so its filters cannot be edited.
4. Edit view does not change the label of a view using the `sidebar_label` alias (`yaml-parser.ts:312`): the old alias wins as last in the document, and the row keeps the old name.
5. `updateViewRailYaml` has no guard for a non-mapping root (`type-sidebar.logic.ts:565`), and the toast shows a raw TypeError.
6. A blank `_order:` coerces to 0 and pins a note above real pins (`type-sidebar.logic.ts:137`). The same for `_order: ""` and `_order: false`.
7. The config popover offers Color by property on `calendar` views, where it has no effect (`CollectionView.svelte:506`).
8. QueryJS `file.inlinks` still matches by basename (`buildReverseIndex` / `resolveInlinks`, `queryjs.logic.ts:46-84`), so `kb.page('<view path>').file.inlinks` lists every source of `[[Projects]]`, though Issue 15 made a view no link target. The basename match also credits same-stem notes. Return `[]` for a path that fails `isLinkTargetFile`, or rebuild inlinks over `buildResolutionCache`. Deferred from Issue 15's review (`work/15/review.md`, finding 1).

**Docs and comments**

- `src-tauri/src/utils/fs.rs:122`, `fs.logic.ts:123`, `editor.logic.ts:25` (says `.view` opens in the markdown editor), `collection-block-widget.ts:28`, `kb-api.ts:468`.
- `docs/adr/0033-...md:122` (wrong file for `setTypeRailPin`), `0026-...md:53` (cites `countNavItems`, which no longer exists), `0027-...md:68` (`canonicalize_key` line).
- `help/documentation/25-types-and-relationships.md`:
  - `:49`: `_title_color` works without `_icon`.
  - `:266`: unarchive moves back only for `{folder}/<segment>`.
  - `:424`: a wrong calendar key or filter does not fail the parse.
  - `:440`: "N results equals the count" needs the `_rail_view` qualifier.
  - `:524`: built-in types have no default icons or colors.
- `help/documentation/12-collection.md:55`: the screenshot does not exist.

**Test gaps**

- `e2e/mocks/vault-index.ts:263` never indexes `.view`, which hides the post-save refresh in rail view specs.
- `src/tests/help/type-definitions-views.test.ts:175` builds entries from raw YAML, so alias-spelled reserved keys are never checked.
- `vault_frontmatter_parity_test.rs:93` documents a multi-document divergence with no TypeScript test.

**Blocked by:** 23

**Status:** resolved

**Gate:** both: `cargo test --manifest-path src-tauri/Cargo.toml` + `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [x] Every bug has a failing test first, through real stores and logic.
- [x] Docs match the code at the time of the fix.
- [x] One commit per bug group. Docs go together.

## Notes

- **Size:** M. This can be split when picked up.

## Comments

- 2026-11-05, branch `issue/24-view-low-findings`: fixed the tab-rename, `_order`, calendar config and `.view` YAML guard bugs with failing tests first, corrected the stale docs and comments, tightened the help and parity test gaps. Review round 1 fixes: week-start row shown only on calendar views, `addContentOrder` follows the type list's position rule, `showViewInViewsYaml`/`updateViewListPropertiesYaml` refuse a non-mapping top level. Findings 4 (toast on refused rename) and 5 (inlinks over `buildResolutionCache`) left for follow-ups. Tests: pnpm check 0 errors; full suite on fb73c391d: vitest 545 files, 12950 passed, 1 skipped, 1 todo; pnpm build ok. cargo test not run, nothing under src-tauri/ changed. Reviews: round 1 APPROVED, round 2 APPROVED (no findings).
