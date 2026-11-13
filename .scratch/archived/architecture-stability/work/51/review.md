VERDICT: APPROVED

## Acceptance criteria

- [met] Neither TRIADA script renders `[object Object]`; each shows the note's name as a link — `triada-inbox.js:28` and `triada-parent-outcomes.js:28` now call `kb.header(5, <page>.file.link)`. `KBAPI.header` (`src/lib/plugins/queryjs/kb-api.ts:229-238`) sends a non-string through `renderValue` (`:405`), whose KBLink branch builds `<a class="cm-lp-qjs-link">` with a mousedown handler that calls `openFileInEditor(link.path)`. The contract snapshots for both scripts and the four templates that run them now read the note name (`"Week: TRIADA Weekly ..."`, `"Inbox (1)TRIADA Weekly ..."`). I also ran a throwaway jsdom probe, deleted afterwards: `kb.header(5, kb.page(PATH).file.link)` produced `h5 > a.cm-lp-qjs-link` with text `TRIADA Weekly`, and `kb.span` with the same link produced `[object Object]`.
- [met] No snapshot in `queryjs-contract.test.ts.snap` contains `[object Object]` — `grep -c "object Object" src/tests/help/__snapshots__/queryjs-contract.test.ts.snap` returns 0. `pnpm vitest run src/tests/help/queryjs-contract.test.ts` passes, 133/133, with no snapshots written or obsolete. The full suite is deliver's to run.

## Checks run by the reviewer

- `pnpm check`: exit 0, 0 errors, 0 warnings.
- `pnpm vitest run src/tests/help/queryjs-contract.test.ts`: exit 0, 1 file, 133 tests passed. My test verdict rests on this file and on the temporary probe above. The diff changes no source under `src/lib`, so no other test file covers the change.
- Scope: the diff touches only the two help scripts (one line each), the six named snapshots and the discovery note. KBAPI, the layer baseline and composition roots are unchanged. Nothing under `src/lib`, `src/routes` or `src-tauri` changed, so no `Test-Exempt` trailer is needed.
- No `spec.md` exists under `.scratch/architecture-stability/`. Checked against ADR 0010 (QueryJS KBAPI): no API change, so no conflict.

## Findings

1. minor — `src/tests/lib/plugins/queryjs/kb-api.test.ts:431` — The fix depends on `kb.header(level, KBLink)` rendering an `<a>`, and no test checks that. `header` is only tested with a string (`:431-436`). The contract snapshots record `textContent`, so they would still pass if `header` regressed to plain text. Fix (follow-up): add a unit test like the one at `:452-459` (`list renders KBLink as clickable <a>`), asserting that `kb.header(5, link)` yields `h5 > a.cm-lp-qjs-link`.
2. nit — `help/examples/triada/__system/queryjs/triada-parent-outcomes.js:27-28` — The label `Week: ` is now a `<p>` and the link is an `<h5>` below it, so the label sits on its own line in body text above a heavier heading. Before, the label also sat in its own `<p>`, so the line break is not new. Only the heading weight is new. Fix: none required. An inline "Week: [[link]]" would need `kb.span` or `kb.paragraph` to accept a KBLink, which is a KBAPI change outside this Issue.

## Resolution

1. Fixed: added `header renders KBLink as clickable <a>` to `src/tests/lib/plugins/queryjs/kb-api.test.ts`, asserting `kb.header(5, link)` yields `h5 > a.cm-lp-qjs-link` with the link's display text.
2. No change: the reviewer marks it as requiring none; an inline label plus link needs a KBAPI change outside this Issue.
