# 07: A click on the blank space left of a table keeps it rendered

**Status:** resolved

Priority: P2 (reported by the owner in the macOS app after Issues 01 and 02 shipped)

**What to build:** In the owner's note `_journal-day-03-11-2026.md`, a click in the blank space to the LEFT of a rendered table still reveals its markdown. Issues 01 and 02 fixed the bands above and below, the zone right of the line box and the table wrapper's corner; the left side has no test and still reveals. Owner decision (triage 2026-11-03, Issue 02): blank space around a widget never reveals it, and the cursor stays where it was.

A likely cause, not confirmed: `bandClickTarget` (`src/lib/core/markdown-editor/extensions/live-preview/core/block-band-click.ts`) returns `null` (CodeMirror's default, which reveals) when the press target is the widget's own `.cm-line` and `clientY` is inside the widget's vertical range (`dir === 0`), which is where a press in the line's left padding lands. The left side may also be outside `.cm-content` (the centered editor column's margin on a wide window). Reproduce first and record which element the press hits.

Check the same zone for the other block widgets (fenced and indented code, math block, mermaid, image, embeds, audio, video, collection, queryjs, meta-bind button): fix them in the same place if they share the cause.

**Blocked by:** none

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build` (frontend) + `bash scripts/e2e.sh e2e/specs/live-preview` (E2E)

**Source:** owner report 2026-11-03 (macOS app), src/lib/core/markdown-editor/extensions/live-preview/core/block-band-click.ts, `e2e/specs/live-preview/click-reveal/table.spec.ts`

- [x] Failing first: an E2E test in `table.spec.ts` that clicks left of the table at its vertical center and asserts the table stays rendered, the source stays hidden and the cursor stays where it was; record the hit element in Notes
- [x] The same zone is checked for the other block widgets; each one that revealed gets a test
- [x] A click on a plain text line's left padding still puts the cursor at the start of that line
- [x] The existing click-reveal specs and `block-band-click.test.ts` stay green
- [ ] Not verified by the agent: the owner checks the left side in the macOS app (WebKit)

## Notes

- Owner decision (triage 2026-11-03): blank space around a widget never reveals it.
- Hit element (Chromium E2E, 1280px window): a press left of the table at its vertical center lands on the table's own `DIV.cm-line`, in CodeMirror's 6px left line padding (line left 532px, table left 538px); further left it is `DIV.cm-content` (already kept by Issue 02). `bandClickTarget` returned `null` there (`dir === 0`), so the default revealed. The same press revealed all 13 other block widgets; see `work/07/discovery.md`.

## Comments

- 2026-11-03, branch `issue/07-table-left-side-click`: `bandClickTarget` now keeps the selection for a press on a sole block widget's own `.cm-line` padding level with the widget box (left 6px / right 2px), so a click left of a table or any other block widget no longer reveals it. E2E left-side tests for the table and 13 other block widgets (`clickLeftOfWidget` fixture), a plain-text-line padding test, unit test update, `docs/LIVE-PREVIEW.md` lists the new zone. Full suite on 3c5741f4: exit 0, 459 files / 10624 tests passed, build passed; `pnpm check` 0 errors; table.spec.ts E2E 10 passed. Reviews: round 1 APPROVED (findings 1 and 3 fixed, others recorded), round 2 APPROVED (no findings). Owner WebKit check still pending.
