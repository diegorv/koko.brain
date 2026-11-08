# 51: TRIADA scripts render a page link as "[object Object]"

**What to build:** `help/examples/triada/__system/queryjs/triada-inbox.js:28` (`kb.span(p.file.link)`) and `triada-parent-outcomes.js:28` (`kb.span(parent.file.link)`) pass a `KBLink` to `kb.span`, which takes a string (`src/lib/plugins/queryjs/kb-api.ts`, `span(text: string, …)`). The link renders as the text `[object Object]` instead of a clickable link to the note. Render the link with a KBAPI call that accepts a `KBLink` (`kb.list` renders `KBLink` items as wikilinks, as `queryjs-features/__system/queryjs/note-shortlist.js` shows; check whether an inline form exists before choosing), then update the contract snapshots that pin the broken output.

**Blocked by:** none

**Status:** resolved

**Gate:** `pnpm check` + `pnpm vitest run src/tests/help/queryjs-contract.test.ts`; the snapshot update is part of the change.

**Source:** Issue 19 review (`.scratch/architecture-stability/work/19/review.md`, finding 4), branch `issue/19-run-help-queryjs-examples-as-contract-tests`. Six snapshots in `src/tests/help/__snapshots__/queryjs-contract.test.ts.snap` pin `[object Object]`: `triada/templates/TRIADA Daily.md #1`, `TRIADA Weekly.md #1`, `TRIADA Weekly.md #4`, `TRIADA Monthly.md #1`, `triada/__system/queryjs/triada-inbox`, `triada/__system/queryjs/triada-parent-outcomes`.

- [x] Neither TRIADA script renders `[object Object]`; each shows the note's name as a link
- [x] No snapshot in `queryjs-contract.test.ts.snap` contains `[object Object]`

## Comments

- 2026-11-01, branch `issue/51-triada-span-renders-object-object`: `triada-inbox.js` and `triada-parent-outcomes.js` render the page link with `kb.header(5, <page>.file.link)` instead of `kb.span`, so the note name shows as a clickable link; the six contract snapshots no longer contain `[object Object]`. Added a `kb-api.test.ts` unit test that `kb.header` renders a KBLink as `h5 > a.cm-lp-qjs-link`. Tests: `pnpm check` 0 errors; full suite 395 files, 9518 passed, 1 skipped, 1 todo, `pnpm build` ok. Review round 1: APPROVED (finding 1 fixed, finding 2 needs no change).
