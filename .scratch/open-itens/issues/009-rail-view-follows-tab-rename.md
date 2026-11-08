# 009: Tab rename and delete keep `_rail_view` in sync

**Origin:** `view-editor` Issue 01, moved here on 2026-11-08. Its PRD, raw evidence and closed siblings stay in `.scratch/archived/view-editor/`. Bare Issue numbers in the text below use that feature's numbering; `priority-2026-11-08.md` in this folder maps them to the numbers here.

**What to build:** `renameView` and `removeView` (`src/lib/features/collection/yaml-parser.ts:364-407`) never touch `_rail_view`, and `railViewIndex` falls back to `views[0]` (`:142-144`). A double-click rename of the tab the rail runs (`CollectionView.svelte:476`) or a Delete of it silently moves the rail list, its count, its Sort and Filter and Edit view to `views[0]`. The only signal is a grey mark in the navigator (`type-sidebar.logic.ts:426-440`).

- `renameView`: when the top-level `_rail_view` equals the renamed view's old `name`, write the new name. A `_rail_view` that names another view, or no view, is left as it is.
- `removeView`: when the removed view is the one `_rail_view` resolves to (`viewIndexByName`, first match), delete `_rail_view`. Removing another view keeps it.
- The existing refusals (empty, unchanged or duplicate name; the last view) stay. The callers in `CollectionView.svelte:443-449` and `:476` do not change.

**Blocked by:** none

**Status:** ready-for-agent

**Gate:** frontend: `pnpm check` + `pnpm vitest run`.

- [ ] Failing tests first, in `src/tests/lib/features/collection/yaml-parser.test.ts`:
  - Renaming the view `_rail_view` names gives YAML whose `_rail_view` is the new name, and `railViewIndex(parseCollectionYaml(out).definition)` is still that view's index.
  - Renaming another view leaves `_rail_view` unchanged.
  - Removing the named view deletes the key; removing another view keeps it.
  - A stale `_rail_view` (names no view) is left as it is by both functions.
- [ ] `src/tests/lib/features/collection/CollectionView.view-writes.test.ts`: the tab rename path writes content whose `_rail_view` follows (assert on the content handed to the mocked write).
- [ ] `docs/adr/0027-frontmatter-system-metadata-underscore-prefix.md`: amend the line of the 2026-11-04 amendment (around :40) that accepts a stale `_rail_view` after a tab rename (PRD default D12).
- [ ] `help/documentation/25-types-and-relationships.md` § Multiple Views in a .view File (around :487): renaming or deleting a tab now keeps `_rail_view` in sync; drop "the row's mark then reports the stale name" for the rename case.

## Notes

- Both functions re-serialize the file (comments lost), as they do today. Issue 02's Document writer is for the dialog; moving these to it is not in scope.
- No test covers rename together with `_rail_view` today (`research/validated/A09.md`).
- **Size:** S.
