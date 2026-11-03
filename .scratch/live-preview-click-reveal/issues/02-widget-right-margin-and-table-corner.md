# 02: A click right of a table, code block or math block, or in the table's empty corner, keeps it rendered

**Status:** resolved

Priority: P3 (same symptom as Issue 01 in smaller zones)

**What to build:** Two more blank zones reveal a widget's source on click. (1) The 20 px of `.cm-content` padding right of the line box of a table, fenced code block or block math: the hit element is `.cm-content`, CodeMirror sends the click to the widget's line and the widget reveals. (2) The 24x24 px bottom-right corner of the table wrapper (`.cm-lp-table-wrapper` padding between the `+` column and `+` row buttons): it is widget DOM with no control, so the click lands in the table line. Owner decision: both are blank space and keep the widget rendered, with the cursor left where it was.

**Blocked by:** 01

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build` (frontend) + `bash scripts/e2e.sh e2e/specs/live-preview` (E2E)

**Source:** `.scratch/live-preview-click-reveal/report.md` section 3, `e2e/specs/live-preview/click-reveal/{table,code-block,math-block}.spec.ts`

- [x] These tests pass with `test.fail()` removed: `table.spec.ts` "bottom-right corner of the wrapper stays rendered" and "20px right of the line box, at the table vertical center, stays rendered"; `code-block.spec.ts` "margin right of the line box keeps it rendered"; `math-block.spec.ts` "20px right of the line box stays rendered"
- [x] A click right of a plain text line still puts the cursor at the end of that line
- [x] The table `+` row and `+` column buttons still work (`table-add-buttons.spec.ts` stays green)

## Notes

- Owner decision (triage 2026-11-03): blank space around a widget never reveals it.
- Blocked by 01: same widgets and files, and the root fix there may change these zones.

## Comments

- 2026-11-03, branch `issue/02-widget-right-margin-and-table-corner`: `blockBandClick` keeps the selection on a click right of a table, code block or math block line box and in the table's empty bottom-right corner; a drag starting there still selects. Docs describe the keep-the-selection zones. Tests: pnpm check exit 0; block-band-click.test.ts 23/23; e2e table.spec.ts 8/8; full suite at 9b462e13 exit=0 (459 files, 10623 passed, 1 skipped, 1 todo, build OK). Reviews: round 1 APPROVED, round 2 APPROVED (no findings).
