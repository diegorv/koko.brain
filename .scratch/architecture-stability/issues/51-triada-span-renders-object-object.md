# 51: TRIADA scripts render a page link as "[object Object]"

**What to build:** `help/examples/triada/__system/queryjs/triada-inbox.js:28` (`kb.span(p.file.link)`) and `triada-parent-outcomes.js:28` (`kb.span(parent.file.link)`) pass a `KBLink` to `kb.span`, which takes a string (`src/lib/plugins/queryjs/kb-api.ts`, `span(text: string, …)`). The link renders as the text `[object Object]` instead of a clickable link to the note. Render the link with a KBAPI call that accepts a `KBLink` (`kb.list` renders `KBLink` items as wikilinks, as `queryjs-features/__system/queryjs/note-shortlist.js` shows; check whether an inline form exists before choosing), then update the contract snapshots that pin the broken output.

**Blocked by:** none

**Status:** ready-for-agent

**Gate:** `pnpm check` + `pnpm vitest run src/tests/help/queryjs-contract.test.ts`; the snapshot update is part of the change.

**Source:** Issue 19 review (`.scratch/architecture-stability/work/19/review.md`, finding 4), branch `issue/19-run-help-queryjs-examples-as-contract-tests`. Six snapshots in `src/tests/help/__snapshots__/queryjs-contract.test.ts.snap` pin `[object Object]`: `triada/templates/TRIADA Daily.md #1`, `TRIADA Weekly.md #1`, `TRIADA Weekly.md #4`, `TRIADA Monthly.md #1`, `triada/__system/queryjs/triada-inbox`, `triada/__system/queryjs/triada-parent-outcomes`.

- [ ] Neither TRIADA script renders `[object Object]`; each shows the note's name as a link
- [ ] No snapshot in `queryjs-contract.test.ts.snap` contains `[object Object]`

## Comments
