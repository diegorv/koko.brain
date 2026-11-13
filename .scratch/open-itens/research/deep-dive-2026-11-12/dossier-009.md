# Dossier: Issue 009, tab rename and delete keep `_rail_view` in sync

Written 2026-11-12 against HEAD 115d8d576. Read-only research; nothing else was edited.

## Verdict

| Question | Answer |
|---|---|
| Still present | Yes, exactly as described. Only the line numbers drifted. |
| Impact for this owner | Low to medium. Wrong data in a view file, silent, but needs `_rail_view` set (by hand today) and a multi-view `.view`. |
| Complexity / risk | S. Two pure functions in one file, no store, no Rust, no CodeMirror. Low risk. |
| Queue position | Cheap, isolated. Hold at its place (after 070, before 028 is fine); it unblocks 011 and by chain 012. |

## 1. Still present? (verified in code)

- `removeView` is at `src/lib/features/collection/yaml-parser.ts:364-379` (the Issue says 364-407, which spans both functions). It parses, splices `views`, and re-serializes. It never reads or writes `_rail_view`. (verified)
- `renameView` is at `yaml-parser.ts:381-406`. Refusals: empty name (`:388`), out-of-range index (`:398`), same name (`:399`), name carried by another view (`:400`). Then `views[index].name = trimmed` and `stringifyYaml(raw)`. It never touches `_rail_view`. (verified)
- `railViewIndex` is `Math.max(0, viewIndexByName(definition.views, definition.railView))` at `:142-144`. A `_rail_view` that matches nothing resolves to 0. (verified)
- Callers are unchanged: `CollectionView.svelte:450` (`removeView(onView(content, idx, name), idx)`) and `:478` (`renameView(onView(content, idx, name), idx, value)`). The Issue cites `:443-449` and `:476`, so those lines drifted by a few. These are the only callers in `src/lib` (grep). (verified)
- The consumers that silently move to `views[0]` are real: `lens.logic.ts:805`, `RailNoteList.svelte:272`, `type-note-list.logic.ts:169,200`, `ViewDialog.svelte:96`. The grey mark is `railViewNameNote`/`railViewMissNote` in `type-sidebar.logic.ts:439-453`. (verified)
- The sibling path already does the right thing: `updateViewEditYaml` writes `out._rail_view = edit.label` when `_rail_view` resolved to the edited view (`yaml-parser.ts:297-319`), and guards the duplicate-name case. Rename and delete from the tab strip are the only writers left out of sync. (verified)
- Docs still state the bug as accepted: ADR 0027 line 40 ("renaming a view tab in the editor does not") and help `25-types-and-relationships.md:487` ("renaming a view tab in the editor does not update `_rail_view` (the row's mark then reports the stale name)"). PRD D12 (`.scratch/archived/view-editor/PRD.md:38`) is the decision to fix. (verified)
- `git log -- yaml-parser.ts` shows no commit touching these two functions since the audit; last commits are `cf6fe6ef3` (Issue 24) and earlier. No fix exists. (verified)
- Tests today: `yaml-parser.test.ts:828-866` (`removeView`) and `:868-920` (`renameView`) have no `_rail_view` assertions except the duplicate-name refusal at `:904-914`. `CollectionView.view-writes.test.ts:316-348` covers rename and delete with a YAML that has no `_rail_view`. (verified)

## 2. Impact for this owner

- Trigger: in a `.view` that has `_rail_view` set, double-click rename the tab it names, or Delete that tab. (verified)
- Who writes `_rail_view` today: only Edit view's rename (`updateViewEditYaml`) when it already resolves; there is no UI that sets it from scratch. Grep of `src/lib` and `src-tauri/src` shows no other writer. So the key exists only if the owner typed it into the YAML or a help example (`help/examples/type-definitions-features/projects-by-status.view`) was copied. (verified; the owner's own vaults were not inspected)
- Planned Issue 136 (rail view switcher, blocked by 013, deferred) will write `_rail_view` from a UI. After that lands, the trigger frequency rises. (verified from the Issue text)
- Inference: owner "uses .view rail views (bugs only)" and multi-view files with a hand-set `_rail_view` are a minority case. When it hits, the effect is wrong data, not data loss: the rail list, count, Sort/Filter and Edit view silently switch to `views[0]`; the file content is otherwise intact. Recovery is a manual YAML edit. Rank: low-to-medium frequency, medium severity.
- Rename-to-same-name is already refused, so no extra loss path there.

## 3. Complexity and risk

- Files: `src/lib/features/collection/yaml-parser.ts` (two functions), tests, ADR 0027, help 25. No Svelte change (the Issue says callers do not change).
- Centrality: `yaml-parser.ts` is shared by the collection editor, rail lens, dialogs and block widgets, but `removeView`/`renameView` have one caller file. Pure functions on a string. No store writes (Pre-Change Checklist 1-3: none; the result goes to `writeYaml` in `CollectionView.svelte:308`, then `rewriteView`/`onYamlChange`).
- Regression risks:
  - Duplicate names (hand-edited): `_rail_view` resolves to the FIRST view of a name. The Issue's wording for rename ("when `_rail_view` equals the renamed view's old name") is looser than for remove ("the one `_rail_view` resolves to"). Renaming the second of two same-named views would wrongly rewrite `_rail_view` and move the rail off the first. The condition must be `viewIndexByName(views, readRailView(raw._rail_view)) === index`, for both functions. (inference from `viewIndexByName` semantics, `:131-134`; this is a gap in the Issue text)
  - Rename already refuses a name another view carries, so after the rewrite `_rail_view` resolves to the same index. Good, no new conflict.
  - Remove of a view before the railed one: indexes shift but `_rail_view` is name-based, so it is untouched. The test should cover it.
  - Remove of the railed view deletes the key, so the rail runs `views[0]` by default with no grey mark (the intended silent default). Make sure `delete raw._rail_view` happens after the last-view and range guards so refusals return the original string.
  - Non-string or blank `_rail_view` (`readRailView` returns undefined): leave untouched. Use `readRailView` (module-private, same file), not `railView === oldName`, to match trimming rules (it keeps the value as written; exact match, so `" Board"` does not name `Board`).
  - Both functions re-serialize and drop comments already (existing behavior, noted in the Issue).
  - `CollectionView.svelte` `onView(...)` conflict guard and `activeViewIndex` clamping are unaffected.
- Size: S. About 10 lines of source, about 50 lines of tests, 2 doc edits.

## 4. Implementation plan (test-first)

Plan assumption: take the conventional reading of the Issue, with the resolves-to-index condition for both functions (state this in the commit).

1. Red: add to `src/tests/lib/features/collection/yaml-parser.test.ts`, in `describe('renameView')` and `describe('removeView')` (use tabs, real functions, no mocks):
   - rename the view `_rail_view` names (`_rail_view: Other`, rename index 1 to `Moved`): parsed `railView === 'Moved'` and `railViewIndex(parsed.definition) === 1`. Fails today (key stays `Other`, index falls to 0).
   - rename a view that `_rail_view` does not name: `_rail_view` unchanged.
   - duplicate names, `_rail_view: Dup`, rename the SECOND `Dup`: `_rail_view` stays `Dup`.
   - stale `_rail_view: Gone`: rename and remove leave it as `Gone`.
   - non-string `_rail_view: [Board]` or blank: left as it is (key still present with the same raw value).
   - remove the named view: `'_rail_view' in raw` is false (`parseYaml(out)`), and `railViewIndex` is 0.
   - remove another view (before and after the named one): key kept with the same name, and `railViewIndex` still points at the named view.
   - refusals still return the original string (last view, out of range) even with `_rail_view` set.
2. Green: in `renameView`, after the guards, before the assignment: `const railed = viewIndexByName(views, readRailView(raw._rail_view)) === index;` set `views[index].name = trimmed; if (railed) raw._rail_view = trimmed;`. Compute `railed` BEFORE renaming. In `removeView`, after the guards: compute the same `railed`, splice, then `if (railed) delete raw._rail_view;`. Update both JSDoc blocks (`:360-363` and `:381-387`) to say `_rail_view` follows or is dropped.
3. Red then green: in `CollectionView.view-writes.test.ts` add a `_rail_view` variant of `YAML` (add `_rail_view: Second` after `_sidebar_label`):
   - rename test: dblclick `Second` tab, type `Later`, Enter, `settle()`; assert `diskYaml()` equals `{ _sidebar_label, _rail_view: 'Later', filters, views: [ALL, {...SECOND, name: 'Later'}] }`.
   - delete test: context menu on `Second` (copy the pattern at `:332-348`), Delete view, assert disk has no `_rail_view`.
   - Note: the existing delete test opens the menu on `All` and the file has one railed target; mirror it with `Second` as the railed view. Assert on `diskYaml()` (disk content), which is the content handed to the mocked write. This is a real-boundary assertion, not a `toHaveBeenCalled`.
4. Docs: ADR 0027 line 40, drop "; renaming a view tab in the editor does not" and say tab rename keeps it, tab delete removes it. Help `25-types-and-relationships.md:487`, replace the clause "renaming a view tab in the editor does not update `_rail_view` (the row's mark then reports the stale name)" with the sync behavior. Also check `12-collection.md:157` (no change needed; it only says the editor does not read the key).
5. Gate: `pnpm check` + `pnpm vitest run` (frontend only). Targeted first: `pnpm vitest run src/tests/lib/features/collection/yaml-parser.test.ts src/tests/lib/features/collection/CollectionView.view-writes.test.ts`.

Acceptance criteria review:
- Wrong: "`renameView`: when `_rail_view` equals the renamed view's old `name`" should read "when `_rail_view` resolves to the renamed index (first match)". Otherwise the duplicate-name case regresses the rail.
- Missing: the duplicate-name test, the remove-before-the-named-view test, and a non-string `_rail_view` test.
- Line numbers cited in the Issue are slightly off (removeView `:364-379`, renameView `:381-406`, callers `:450` and `:478`). The CollectionView test line is fine as a target.
- The ADR line is `:40` (confirmed). The "D12" amendment note should say where the stale-name acceptance ended.
- All criteria are testable.

## 5. Run order

- Blockers: none. Blocks 011 (`Blocked by: 009`), and by the series rule precedes 012 (VD-01 before VE-01).
- Hot-code series group: `RailNoteList` / `lens.logic.ts` / `CollectionView.svelte` (priority doc line 63). This Issue edits only `yaml-parser.ts` and tests, not `CollectionView.svelte` itself, so it does not conflict on files, but its test file `CollectionView.view-writes.test.ts` is shared with 011, 012, 010 and 070. Run strictly before them and merge first.
- Shared files with other queue Issues: `yaml-parser.ts` and `yaml-parser.test.ts` (011 touches the same file; 010 and 068 touch filter/view code nearby). `CollectionView.view-writes.test.ts` is shared with 012 and 011.
- Cost/benefit: very cheap, isolated, no core write path. Fine to run as a small direct merge (small-issue rule) at its queue slot, no adversarial reviewer needed beyond the standard gate.

## Not checked

- The owner's actual vaults were not inspected for `_rail_view` usage, so the frequency estimate is inference.
- No tests or builds were run (read-only task).
