# Sweep s4-views-rest: .view Issues outside the queue

Checked at HEAD `afc0a9df8` (2026-11-12), read-only. "Verified" means read in code at the cited line; "inferred" means reasoned, not run. No test was run. All 18 Issues in scope have ledger status `todo` and file status `ready-for-agent`; none is done or wontfix.

## Table

| # | Title | State at HEAD | Impact for this owner (trigger) | Cx | Risk | Owner decision open | Verdict |
|---|---|---|---|---|---|---|---|
| 011 | Edit view saves only what changed | Present | Low-medium. Trigger: Edit view > Save on a Types row. It always rewrites the whole file (comments lost, filters round-tripped, `views[0].name` and `_rail_view` rewritten). Rare dialog. | M | Medium (`type-definitions.service.ts` is a hotspot; new logic module) | No (decided 2026-11-06) | Stay deferred |
| 013 | Filter panel cannot write empty or unparseable filter | Present, all three parts | High. Trigger: rail Filter panel: Add filter, or pick a property with an accent or space (the Issue says the owner's vault has them). List empties or turns into an error with Sort and Filter hidden. | M (S if done as the pure subset below) | Low-medium (pure logic plus rail persist path, which is hot code) | No | JOIN QUEUE, after 012 |
| 069 | Small .view tab write feedback | Present, all three parts | Low. Rename refused silently; `addView` repeats `Untitled` (but it opens inline rename at once); `limit: 2.5/.inf/.nan` accepted. | S | Low | No (limit rule decided 2026-11-06) | Stay deferred |
| 071 | .view toolbar and icon writes keep YAML comments | Present | Low-medium. Trigger: any rail Sort/Filter change or icon/color change on a .view that carries comments. Comments only, no data. Owner has no external writer, so comments come from their own edits. | M | Medium (six-plus writers move to the Document API; key order and quoting expectations in existing tests) | No | Stay deferred |
| 131 | Section layout and live Filters preview | Not built | Feature (dialog redesign), not a bug. | L | Medium | No | Defer |
| 132 | Edit view from anywhere | Not built | Feature. Hidden views (every New table starts hidden) have no Edit view entry; that is a gap, not a data bug. | M | Low-medium | No | Defer |
| 133 | Sort & limit section | Not built | Feature. | M | Medium | No | Defer |
| 134 | Display section | Not built | Feature. | M | Medium | No | Defer |
| 135 | Behavior section | Not built | Feature. | M | Medium | No | Defer |
| 136 | Rail view switcher | Not built | Feature (multi-view files). | M | Medium (RailNoteList) | No | Defer |
| 137 | Rule line names limit and sort source | Not built | UX copy; sort menu wording. | S | Low | No | Defer |
| 138 | Calendars say how many notes have no date | Present (count is `records.length`, `CollectionView.svelte:587`; undated skipped at `calendar.logic.ts:109-111`) | Low. Calendar views are not in the owner's daily list. | S | Low | No | Defer |
| 139 | Properties panel matches the table's columns | Present | Medium. Trigger: first column toggle in the Properties panel of any New table (no `order` written, `collection.service.ts:18-22`). Panel shows `localColumns ?? allColumns` all vault properties as checked (`CollectionView.svelte:674`); the table infers columns from matched records only (`collection.logic.ts:461-486`). The first toggle persists the whole vault as `order`. Matters if the owner uses `.view` tables, not only markdown tables (unknown). | S-M | Low (CollectionView only) | No | Candidate, conditional |
| 140 | .view tab keyboard and labels | Present (`th` and `tr` have only `onclick`, `CollectionTableView.svelte:44-58`; icon buttons have no label) | Low. Accessibility, no data effect. | S | Low | No | Defer |
| 141 | Rail and editor run the file's filter as written | Present, partly | Medium. Trigger: a rail view or `.view` tab with `x != true` (or `!= false`). Parsed to `is_false` (`filter.logic.ts:411-413`), written back as `x == false`, so notes without `x` drop out in the rail and tab but not in inline blocks. The rail always queries the toolbar state, never the raw filter (`RailNoteList.svelte:278-285`). The full Issue is broader (list shapes become errors, a shape table) and M. | M (the `!=` part alone is S) | Medium (`lens.logic.ts`, rail, filter round trip) | No (decided 2026-11-06) | Narrow `!=` part is a candidate; full Issue stays deferred |
| 142 | New here infers type from compound `&&` filter | Present (`viewNoteType` skips raw rows, `lens.logic.ts:896`; `&&` string stays one raw row) | Low-medium. Trigger: a view written as `type == "X" && ...`, then New here makes a plain note. Hand-written or agent-written views only. | S-M | Low (pure logic) | No (the `filter-logic.test.ts:179-182` pin must stay) | Defer |
| 143 | Inline blocks choose a view and navigate months | Not built | Feature. | M | High (live preview widget) | No (key decided) | Defer |
| 144 | A .view checker for agents | Not built | Tooling for agents; no owner workflow hit. | S-M | Low | No (decided) | Defer |

## Notes

### Recommended to join the queue

1. **013** (verified). Place it right after 012. Its "Blocked by 012, 010" is a file-overlap line (CollectionView.svelte); the code does not need them. All three defects are still at HEAD:
   - `addFilter` appends an empty row (`FilterPanel.svelte:73-85`); `filterRowToExpression` emits `prop == ''` for it (`filter.logic.ts:46`, `createEmptyFilterRow` `:282-289`), and the rail persists each change (`RailNoteList.svelte:296-357`).
   - The picker lists every indexed key (`getAllKnownProperties`, `filter.logic.ts:226-243`) and the tokenizer reads only ASCII letters, digits, `_` and `-letter` as an identifier (`expression/tokenizer.ts:130-163`; anything else throws `Unexpected character`). An error status then hides Sort and Filter, and the only way out is Open view (`RailNoteList.svelte:199`, `:882`).
   - Date values are not escaped (`filter.logic.ts:70-77`, `date('${val}')`), while `quoteString` escapes (`:557-560`).
   - Cheap shape (inference): every query and every persist already passes through `filterGroupsToFilter` (`type-note-list.logic.ts:85-95`, `:152-153`), which already drops blank raw rows (`filter.logic.ts:147-150`). Dropping value-less rows there fixes the draft part in a few lines of pure logic with no change to RailNoteList or CollectionView. Caveat to decide when building: a saved `x == ''` parses to an `is` row with an empty value and would then be dropped as a draft; restrict the rule or test that case.
2. **141, narrow part only** (`!= true` and `!= false` must not become `== false` and `== true`). Verified: `filter.logic.ts:411-413`. Smallest safe fix (inference): return no editable row for a boolean `!=`, so it stays a raw row and round-trips byte for byte. The tests at `filter-logic.test.ts:120-131` pin only `==`. Do not take the rest of 141 (list/map shapes as errors, running the raw filter) now: it touches `lens.logic.ts` and the rail, and has five blockers. Worth doing only if the owner's views use `!= true`; one grep of their `.view` files would settle it (outside this sweep's scope).
3. **139**, conditional on the owner using `.view` tables (not only markdown tables). Real and easy to hit: New table writes no `order`, so the first toggle writes the whole vault. Ask the owner once; the "Blocked by 138, 069" is file overlap only.

### Already fixed

None. No Issue in scope is fixed at HEAD. Line numbers in some Issue texts have drifted (for example 071's `type-sidebar.logic.ts:542/570` is now `:555-648`), but every central claim still holds.

### Chain 131-144

None is a bug the owner hits, except the three above (139, 141 narrow, 142). 131-135 are the Edit view dialog expansion, 136-137 rail UX, 138 and 140 calendar and accessibility polish, 143 an inline-block feature (live preview, high risk), 144 an agent tool. Keep all deferred.

### Not checked

- No test run; the `!=` semantics (`null` vs `false` under `looseEqual`, `evaluator.ts:698`) are from reading the Issue and the mapping, not executed.
- Whether the owner's real `.view` files use `!= true`, accented or spaced property names in filters, or New table with the Properties panel was not checked (vault is outside the repo).
