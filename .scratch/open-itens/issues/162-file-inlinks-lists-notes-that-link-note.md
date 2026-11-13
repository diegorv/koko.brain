# 162: file.inlinks lists the notes that link to a note whose name contains a dot

**Origin:** `audit-2026-11-05` Issue 53, moved here on 2026-11-08. Its PRD, raw evidence and closed siblings stay in `.scratch/archived/audit-2026-11-05/`. Bare Issue numbers in the text below use that feature's numbering; `priority-2026-11-08.md` in this folder maps them to the numbers here.

**What to build:** buildReverseIndex (src/lib/plugins/queryjs/queryjs.logic.ts:47-63) keys each link by getBasename(link.target), and getBasename (:12-17) strips everything after the last dot, so the target 'Dr. Silva' is stored under 'dr' and 'Release v1.2' under 'release v1'. resolveInlinks (:71-87) looks up getBasename of the file path ('dr. silva'), which never matches, so the note has no inlinks; a note named 'Dr.md' receives them instead. Outlinks already resolve targets with resolveWikilinkCached (:140-142), which handles dotted names, so a note's outlinks and its target's inlinks disagree. Fix direction: key the reverse index by the resolved target path, using the same resolution cache ensureCache builds (src/lib/plugins/queryjs/kb-api.ts:445-451), so inlinks are the mirror of outlinks. Update the buildReverseIndex tests whose keys change and say so in the commit.

**Blocked by:** none

**Status:** ready-for-agent

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`.

- [ ] Failing test first, in src/tests/lib/plugins/queryjs/queryjs.logic.test.ts: entries '/vault/a.md' linking 'Dr. Silva' and '/vault/b.md' linking 'Release v1.2'; the inlinks of '/vault/Dr. Silva.md' are ['/vault/a.md'] and of '/vault/Release v1.2.md' are ['/vault/b.md']; it fails today (both empty).
- [ ] A note '/vault/Dr.md' gets no inlink from a [[Dr. Silva]] link.
- [ ] Links written with a path (folder/sub/note) or a different case still count, as today; self-links are still left out; a .view still has no inlinks.
- [ ] For every page in a fixture vault, A is in B.file.inlinks exactly when B is in A.file.outlinks.
- [ ] Frontend gate: pnpm check and pnpm vitest run pass.

## Notes

- **Priority:** daily use and UI correctness (bucket 2-ux). Upheld ux/low. Dotted note names are uncommon, and the effect is wrong counts on screen.
- **Trigger:** A note named 'Dr. Silva.md' or 'Release v1.2.md' is linked from other notes as [[Dr. Silva]]; a block shows p.file.inlinks or its length (backlink counts, orphan or most-linked dashboards).
- **Evidence (verified by reading code at `5f8003d67`):** src/lib/plugins/queryjs/queryjs.logic.ts:15-16 lastIndexOf('.') strip applied to link targets at :53; :76-77 lookup by file basename; :140-142 outlinks use resolveWikilinkCached; src/lib/plugins/queryjs/kb-api.ts:445 buildReverseIndex, :451 resolution cache built in the same function; src/tests/lib/plugins/queryjs/queryjs.logic.test.ts:87-139 cover no dotted name.
- **Second opinion:** upheld (ux, low). Confirmed. buildReverseIndex keys targets by getBasename(link.target) (queryjs.logic.ts:53), and getBasename strips after the last dot, so 'Dr. Silva' becomes 'dr'. resolveInlinks then looks up 'dr. silva' (:76-77), so the note gets no inlinks and 'Dr.md' receives them instead. Dotted note names are uncommon, and the result is wrong counts on screen. Corrections to apply while implementing: Category ux, not content.
- **Source:** audit 2026-11-05, domain `queryjs`, finding `N-queryjs-04` (from queryjs-spec-4). Size M.

## Comments
