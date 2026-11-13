# 10: A frontmatter write while scrolled down keeps the visible text in place

**Status:** resolved

Priority: P2 (reported by the owner: changing a meta-bind select in a daily note jumps the view to an unrelated spot)

**What to build:** In `_journal-day-03-11-2026.md` the owner clicks the `# Tue 03 Nov 2026` heading, scrolls down to the "Body & Mind" table and changes the `water` select (`INPUT[inlineSelect(...):life_track_water]`, bound to a frontmatter property). The view jumps to an unrelated part of the note.

Root cause, confirmed with a throwaway E2E probe (2026-11-03): `dispatchMetaBindUpdate` (`src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:804`) replaces the whole frontmatter range (`from: 0, to: frontmatterEnd`). The frontmatter is hidden in live preview (0 px lines, `core/hide-lines.ts`) and off screen, so CodeMirror drops the measured heights of the replaced lines and re-estimates them at the default line height. In the probe (4 frontmatter lines, cursor on the heading, select about 9600 px down) the gap above the viewport grew from 24 px to 121 px: `scrollTop` stayed at 9628 and the select moved down 97 px on screen. On the owner's note (13 frontmatter lines) that is roughly 300 px. Scrolling back to the top re-measures and the height drops again.

Probe fix that removed the jump (the select stayed at the same screen y; CodeMirror moved `scrollTop` by +97 to compensate): `const changes = view.state.changes({...}); view.dispatch({ changes, effects: view.scrollSnapshot().map(changes) })`. `EditorView.scrollSnapshot()` exists in `@codemirror/view` 6.43.15.

Also check the other frontmatter writers that change an open note through `syncExternalContentToEditor` from `updateNoteFrontmatter` (`src/lib/core/frontmatter/frontmatter-write.service.ts:99-150`; callers: properties panel, lifecycle actions, file icon, event calendar, bookmark migration): reproduce the same steps through one of them (the properties panel is the most common) and fix them in the same way if they jump. A root fix that tells CodeMirror the hidden frontmatter is 0 px (a block replace from the frontmatter StateField) is out of scope unless the agent shows it is small and safe; record the reason either way.

**Blocked by:** none

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build` (frontend) + `bash scripts/e2e.sh e2e/specs/live-preview` (E2E)

**Source:** owner report 2026-11-03, src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:804-822, src/lib/core/frontmatter/frontmatter-write.service.ts:99-150

- [x] Failing first: an E2E test with frontmatter, a heading with the cursor on it, enough content to scroll far, and a meta-bind `inlineSelect` bound to a frontmatter property at the bottom; after the select change, the select's screen position does not move (measure the element's y relative to `.cm-scroller`, not `scrollTop`)
- [x] The same holds for the meta-bind toggle and the number input
- [x] The properties panel path is checked with the same steps; if it jumps, it gets a test and the fix
- [x] A frontmatter write with the frontmatter on screen (scrolled to the top) still leaves the view where it was
- [ ] Not verified by the agent: the owner repeats the steps in the macOS app

## Notes

- The probe spec was not kept; the steps above rebuild it. Screen-y, not `scrollTop`, is the right measure: with the fix `scrollTop` changes on purpose.

## Comments

- 2026-11-03, branch `issue/10-frontmatter-write-keeps-scroll`: `dispatchMetaBindUpdate` (`widgets.ts`) now dispatches the frontmatter change with `view.scrollSnapshot().map(changes)`, so meta-bind select/toggle/number writes keep the visible text in place; new E2E spec `e2e/specs/live-preview/frontmatter-write-keeps-scroll.spec.ts` (properties panel path checked, does not jump). Review round 1: APPROVED (4 minor/nit findings; the comment fix applied, the rest accepted with no change). Review round 2: APPROVED, no findings. Tests: `pnpm check` 0 errors; full suite at 33bae7f1 exit=0, 459 files, 10624 passed, 1 skipped, 1 todo, build OK. Owner macOS check still pending.
