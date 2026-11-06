# 80: A kb.table, kb.ui.table or kb.list cell holding an array or DataArray of links renders each link as a clickable link

**What to build:** renderValue (src/lib/plugins/queryjs/kb-api.ts:488-523) renders a single KBLink as an <a>, but an array goes to el.textContent = value.map(String).join(', ') (:518-519), and a KBLink is a plain {path, display} object, so each shows as '[object Object]'. A DataArray cell falls to String(value) (:521), whose toString (src/lib/plugins/queryjs/data-array.ts:350-352) does the same. Render array and DataArray cells element by element through renderValue, joined with ', ', so links stay clickable and dates format as they do alone. kb.table, kb.list and kb.ui.table all use this renderer (kb-api.ts:306, :336, kb-ui.ts:443 via kb-api.ts:151).

**Blocked by:** none

**Status:** ready-for-agent

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`.

- [ ] Failing test first, in src/tests/lib/plugins/queryjs/kb-api.test.ts: kb.table(['N','L'], [[link0, [linkA, linkB]]]) renders a second cell with two a.cm-lp-qjs-link elements whose text is the two displays, and the cell text does not contain '[object Object]'; it fails today.
- [ ] A DataArray of links in a cell renders the same way.
- [ ] An array of strings or numbers still renders as 'a, b, c'; an array of KBDateTime renders ISO dates.
- [ ] kb.ui.table renders the same cells the same way.
- [ ] Frontend gate: pnpm check and pnpm vitest run pass.

## Notes

- **Priority:** polish (bucket 3-polish). Polish/low. It is a rendering nicety for a Dataview idiom.
- **Trigger:** A block puts an array of links in a cell, e.g. kb.table(['Note','Backlinks'], pages.map(p => [p.file.link, p.file.inlinks])) or a groupBy cell group.rows.file.link (a DataArray), the usual Dataview idiom for a backlinks column.
- **Evidence (verified by reading code at `5f8003d67`):** src/lib/plugins/queryjs/kb-api.ts:493-513 single KBLink branch, :518-519 array -> map(String), :521 String(value) for a DataArray; src/lib/plugins/queryjs/data-array.ts:350-352 toString; src/lib/plugins/queryjs/queryjs.logic.ts:20-22 buildKBLink returns a plain object with no toString; src/lib/plugins/queryjs/kb-api.ts:151 kb.ui gets the same renderValue; help/documentation/13-queryjs.md:153-158 documents inlinks/outlinks as KBLink[]. The help examples use kb.list(group.rows.file.link), which works, so only table cells and nested arrays are affected.
- **Source:** audit 2026-11-05, domain `queryjs`, finding `N-queryjs-05` (from queryjs-ux-3, queryjs-spec-6). Size S.

**Second opinion (audit 2026-11-05, round 2):** upheld (polish, low). Confirmed. renderValue (kb-api.ts:488-523) uses value.map(String) for arrays (:518-519) and String(value) for anything else (:521). DataArray.toString (data-array.ts:350-352) maps String over its items. buildKBLink returns a plain object with no toString, so each link renders as '[object Object]'. file.inlinks and outlinks are KBLink[]. kb.table (:331), kb.list (:306) and kb.ui (via renderValue bound at :151, used at kb-ui.ts:443) all share this renderer. A list whose items are single links works, as the Issue notes. Corrections to apply while implementing: The Issue cites kb-api.ts:336 for kb.table; the call is at :331.

## Comments
