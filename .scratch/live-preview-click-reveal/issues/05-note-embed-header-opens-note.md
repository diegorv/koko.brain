# 05: A click on a note embed's header opens the embedded note

**Status:** ready-for-agent

Priority: P3 (the header shows a pointer cursor and does nothing)

**What to build:** The header of a note embed (`![[note]]`, `.cm-lp-embed-header`) has `cursor: pointer` but no click handler, so a click does nothing. Owner decision: a click on the header opens the embedded note, the same way a wikilink click does (including the missing-note path), and keeps the embed rendered.

**Blocked by:** none

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build` (frontend) + `bash scripts/e2e.sh e2e/specs/live-preview e2e/specs/embed-widgets.spec.ts` (E2E)

**Source:** `.scratch/live-preview-click-reveal/report.md` section 3, `e2e/specs/live-preview/click-reveal/wikilink-note-embed.spec.ts`, src/lib/core/markdown-editor/extensions/live-preview/plugins/wikilink-embed-plugin.ts

- [ ] `wikilink-note-embed.spec.ts` "header click opens the embedded note" passes with `test.fail()` removed
- [ ] The header's mousedown stops propagation (CLAUDE.md Live Preview rule 11), so the click does not move the cursor into the embed or reveal it
- [ ] Failing first: an existing note embed opens that note's tab

## Notes

- Owner decision (triage 2026-11-03).
