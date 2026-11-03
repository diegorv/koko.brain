# 07: A click on the blank space left of a table keeps it rendered

**Status:** ready-for-agent

Priority: P2 (reported by the owner in the macOS app after Issues 01 and 02 shipped)

**What to build:** In the owner's note `_journal-day-03-11-2026.md`, a click in the blank space to the LEFT of a rendered table still reveals its markdown. Issues 01 and 02 fixed the bands above and below, the zone right of the line box and the table wrapper's corner; the left side has no test and still reveals. Owner decision (triage 2026-11-03, Issue 02): blank space around a widget never reveals it, and the cursor stays where it was.

A likely cause, not confirmed: `bandClickTarget` (`src/lib/core/markdown-editor/extensions/live-preview/core/block-band-click.ts`) returns `null` (CodeMirror's default, which reveals) when the press target is the widget's own `.cm-line` and `clientY` is inside the widget's vertical range (`dir === 0`), which is where a press in the line's left padding lands. The left side may also be outside `.cm-content` (the centered editor column's margin on a wide window). Reproduce first and record which element the press hits.

Check the same zone for the other block widgets (fenced and indented code, math block, mermaid, image, embeds, audio, video, collection, queryjs, meta-bind button): fix them in the same place if they share the cause.

**Blocked by:** none

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build` (frontend) + `bash scripts/e2e.sh e2e/specs/live-preview` (E2E)

**Source:** owner report 2026-11-03 (macOS app), src/lib/core/markdown-editor/extensions/live-preview/core/block-band-click.ts, `e2e/specs/live-preview/click-reveal/table.spec.ts`

- [ ] Failing first: an E2E test in `table.spec.ts` that clicks left of the table at its vertical center and asserts the table stays rendered, the source stays hidden and the cursor stays where it was; record the hit element in Notes
- [ ] The same zone is checked for the other block widgets; each one that revealed gets a test
- [ ] A click on a plain text line's left padding still puts the cursor at the start of that line
- [ ] The existing click-reveal specs and `block-band-click.test.ts` stay green
- [ ] Not verified by the agent: the owner checks the left side in the macOS app (WebKit)

## Notes

- Owner decision (triage 2026-11-03): blank space around a widget never reveals it.
