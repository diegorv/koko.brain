# 05: A click on a note embed's header opens the embedded note

**Status:** resolved

Priority: P3 (the header shows a pointer cursor and does nothing)

**What to build:** The header of a note embed (`![[note]]`, `.cm-lp-embed-header`) has `cursor: pointer` but no click handler, so a click does nothing. Owner decision: a click on the header opens the embedded note, the same way a wikilink click does (including the missing-note path), and keeps the embed rendered.

**Blocked by:** none

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build` (frontend) + `bash scripts/e2e.sh e2e/specs/live-preview e2e/specs/embed-widgets.spec.ts` (E2E)

**Source:** `.scratch/live-preview-click-reveal/report.md` section 3, `e2e/specs/live-preview/click-reveal/wikilink-note-embed.spec.ts`, src/lib/core/markdown-editor/extensions/live-preview/plugins/wikilink-embed-plugin.ts

- [x] `wikilink-note-embed.spec.ts` "header click opens the embedded note" passes with `test.fail()` removed
- [x] The header's mousedown stops propagation (CLAUDE.md Live Preview rule 11), so the click does not move the cursor into the embed or reveal it
- [x] Failing first: an existing note embed opens that note's tab

## Notes

- Owner decision (triage 2026-11-03).

## Comments

- 2026-11-03, branch `issue/05-note-embed-header-opens-note`: a click on a note embed's header opens the embedded note (missing-note path included); the header's mousedown stops propagation so the embed stays rendered. Round 1 fix added an assertion that the source note keeps the embed rendered after a header click. Tests: full suite at 90ff1ed5 exit=0 (459 files, 10617 passed, 1 skipped, 1 todo, build OK); pnpm check 0 errors; editor-host.test.ts 24/24; wikilink-note-embed.spec.ts E2E 5/5. Reviews: round 1 APPROVED, round 2 APPROVED (no findings).
