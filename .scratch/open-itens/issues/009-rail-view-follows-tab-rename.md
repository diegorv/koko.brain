# 009: Tab rename and delete keep `_rail_view` in sync

**Origin:** `view-editor` Issue 01, moved here on 2026-11-08. Its PRD, raw evidence and closed siblings stay in `.scratch/archived/view-editor/`. Bare Issue numbers in the text below use that feature's numbering; `priority-2026-11-08.md` in this folder maps them to the numbers here.

**What to build:** `removeView` (`src/lib/features/collection/yaml-parser.ts:364-379`) and `renameView` (`:388-407`) never touch `_rail_view`, and `railViewIndex` falls back to `views[0]` (`:142-144`). A double-click rename of the tab the rail runs (`CollectionView.svelte:478`) or a Delete of it (`:450`) moves the rail list, its count, its Sort and Filter and Edit view to `views[0]`. The signals are a grey mark in the navigator (`type-sidebar.logic.ts:426-453`) and a rule line that says "first view" instead of `view "<name>"`.

`_rail_view` resolves to the first view with that name (`viewIndexByName`, `:131`), and duplicate names are reachable from the UI: `addView` appends `Untitled` with no uniqueness check (`:353`). So both rules match on the resolved index, not on the name:

- `renameView`: when `viewIndexByName(views, readRailView(raw._rail_view)) === index`, computed before the rename, write the new name as `_rail_view`. Otherwise leave it as it is (it resolves to another view, names no view, or is not a non-blank string). With two views of the same name, only renaming the first one rewrites `_rail_view`.
- `removeView`: under the same condition, computed before the splice and after the existing guards, delete `_rail_view`, so the rail runs `views[0]` with no mark. Otherwise keep it. A refusal still returns the input string.
- The existing refusals (empty, unchanged or duplicate name; the last view; out of range) stay. The callers in `CollectionView.svelte` do not change.
- Update the JSDoc of both functions to say what happens to `_rail_view`.

**Blocked by:** none

**Status:** ready-for-agent

**Answered:** nothing open. PRD D12 of view-editor (`.scratch/archived/view-editor/PRD.md:38`) is the decision to keep `_rail_view` in sync. The resolves-to-index rule above is the deep dive's reading for duplicate names (refute-009 M1), not a new owner decision.

**Gate:** frontend: `pnpm check` + `pnpm vitest run`.

- [ ] Failing tests first, in `src/tests/lib/features/collection/yaml-parser.test.ts`. Red today: the two railed-view cases and the CollectionView tests below. The others are guards that pass before and after.
  - Red: renaming the view `_rail_view` names gives YAML whose `_rail_view` is the new name, and `railViewIndex(parseCollectionYaml(out).definition)` is still that view's index.
  - Red: removing the named view deletes the key, and `railViewIndex` is 0.
  - Guard: renaming another view leaves `_rail_view` unchanged. Removing another view keeps it.
  - Guard: `views: [A, B, C]`, `_rail_view: C`, remove index 0: `_rail_view` stays `C` and `railViewIndex` is 1.
  - Guard: duplicate names. With `views: [A, Dup, Dup]` and `_rail_view: Dup`, renaming index 2 leaves `_rail_view: Dup` and `railViewIndex` stays 1. Renaming index 1 (red) writes the new name, and `railViewIndex` stays 1.
  - Guard: a stale `_rail_view` (names no view) is left as it is by both functions.
  - Guard: a non-string `_rail_view` (`_rail_view: [Board]` with a view named `Board`): rename and remove of `Board` leave the raw value as it is.
  - Guard: the refusals (last view, out of range) still return the input string with `_rail_view` set.
- [ ] `src/tests/lib/features/collection/CollectionView.view-writes.test.ts`: the tab rename and the tab Delete paths write content whose `_rail_view` follows or is removed. Use a variant of `YAML` with `_rail_view: Second`, rename `Second` as the test at `:316` does and delete `Second` from its menu as the test at `:332` does, and assert on `diskYaml()` (the bytes the `writeTextFile` mock stored).
- [ ] `docs/adr/0027-frontmatter-system-metadata-underscore-prefix.md:40`: replace "Edit view rewrites it when it renames the view it names; renaming a view tab in the editor does not." with "Edit view rewrites it when it renames the view it names. In the collection editor's tab strip, renaming the view it names rewrites it to the new name, and deleting that view removes the key (PRD D12 of view-editor ended the stale `_rail_view` this amendment first accepted)."
- [ ] `help/documentation/25-types-and-relationships.md:487` § Multiple Views in a .view File: replace ", and renaming a view tab in the editor does not update `_rail_view` (the row's mark then reports the stale name)." with ". Renaming that view's tab in the editor rewrites `_rail_view` to the new name, and deleting the tab removes `_rail_view`, so the note list then runs the first view."

## Notes

- Both functions re-serialize the file (comments lost), as they do today. Issue 02's Document writer is for the dialog; moving these to it is not in scope.
- No test covers rename together with `_rail_view` today (`.scratch/archived/view-editor/research/validated/A09.md`). The existing test at `yaml-parser.test.ts:904-913` (`_rail_view: Other`, rename index 0) stays green: index 0 is not the railed view.
- Only `updateViewEditYaml` (`yaml-parser.ts:319`) writes `_rail_view` today, and only when it already resolves, so the bug needs a hand-written key. Impact is low; recovery is a one-line YAML edit.
- **Run order:** views chain, in series (`priority-2026-11-08.md:63`). This Issue edits only `yaml-parser.ts`, its test and `CollectionView.view-writes.test.ts`. It shares no file with 070 or 010; it shares `CollectionView.view-writes.test.ts` with 012, which is blocked by this Issue. It blocks 011.
- **Size:** S.

## Comments

- 2026-11-12, deep dive (`research/deep-dive-2026-11-12/refute-009.md`): the rename rule now matches on the index `_rail_view` resolves to, not on the old name, because `addView` creates duplicate names. Added the duplicate-name, remove-earlier-view, non-string and refusal tests, marked which tests are red today, added a Delete case to the CollectionView criterion, wrote the exact ADR 0027 and help 25 replacements, refreshed the line numbers and fixed the A09 path.
