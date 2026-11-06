# 17: DataArray sort and sortBy keep the items that have the key in order and group the items without it at one end

**What to build:** sort (src/lib/plugins/queryjs/data-array.ts:119-128) compares raw keys with va < vb ? -1 : va > vb ? 1 : 0. An undefined key compares equal to every value, so the comparator is not transitive and V8's sort leaves the defined values out of order (keys [5, undefined, 3, 1] ascending come out [5, undefined, 1, 3]). A null key coerces to 0 and sorts as a number. Make the comparator a total order: treat undefined and null as missing and place all missing keys together at one end (Dataview-compatible choice: the implementer picks one end and documents it), in both directions, with the defined keys sorted normally. sortBy delegates to sort, so one fix covers both.

**Blocked by:** none

**Status:** ready-for-agent

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`.

- [ ] Failing test first, in src/tests/lib/plugins/queryjs/data-array.test.ts (describe 'sort'): new DataArray([{p:5},{},{p:3},{p:1}]).sort(x => x.p).map(x => x.p).array() returns [1, 3, 5, undefined] (or the documented end); it fails today with [5, undefined, 1, 3].
- [ ] The same holds with 'desc' ([5, 3, 1] in order, missing grouped at the chosen end) and through sortBy.
- [ ] A null key is treated as missing, not as 0.
- [ ] KBDateTime keys (due dates) with some notes missing the field sort by date with the missing ones grouped.
- [ ] Arrays where every item has the key sort exactly as today (existing sort tests stay green).
- [ ] help/documentation/13-queryjs.md sort section states where notes without the field go.
- [ ] Frontend gate: pnpm check and pnpm vitest run pass.

## Notes

- **Priority:** daily use and UI correctness (bucket 2-ux). Upheld ux/high. The comparator is not transitive, so every dashboard sorted by an optional field shows rows out of order.
- **Trigger:** A dashboard sorts pages by an optional frontmatter field, e.g. kb.pages('#project').sort(p => p.priority, 'desc') or sortBy(p => p.due), and some notes lack the field (or have it empty).
- **Evidence (verified by reading code at `5f8003d67`):** src/lib/plugins/queryjs/data-array.ts:121-126 comparator (undefined < x and undefined > x both false -> 0); :131-133 sortBy delegates; help/documentation/13-queryjs.md:259-263 and :1184-1189 show sort on optional fields; src/tests/lib/plugins/queryjs/data-array.test.ts:230 'sort' describe has no missing-key case. Trace of V8 binary insertion for [5,u,3,1]: run detection accepts [5,u,3] (cmp 0, 0), inserting 1 lands at index 2 -> [5,u,1,3].
- **Second opinion:** upheld (ux, high). Confirmed. The comparator at data-array.ts:121-126 returns 0 for undefined against any value, which is not transitive. Tracing V8 run detection plus binary insertion on [5,u,3,1] gives [5,u,1,3], as the Issue says. The data-array tests have no missing-key case. Dashboards are shown out of order, nothing is written. Corrections to apply while implementing: Category ux, not content.
- **Source:** audit 2026-11-05, domain `queryjs`, finding `N-queryjs-02` (from queryjs-ux-2, queryjs-spec-2). Size S.

## Comments
