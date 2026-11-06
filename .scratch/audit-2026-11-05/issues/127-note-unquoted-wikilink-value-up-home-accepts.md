# 127: A note with an unquoted wikilink value (up: [[Home]]) accepts property, lifecycle, icon and meta-bind writes

**What to build:** The read side folds this shape into the string "[[X]]" (foldUnquotedWikilinks, src/lib/core/frontmatter/properties.logic.ts:112-165, used by toFrontmatterValue at :249; ADR 0029 amendment for architecture-stability Issue 39), matching Rust. detectLossyFrontmatter (:404-460) parses the raw block without that fold, so the inner one-item sequence has a sequence ancestor and the note is reported 'nested' (:434-438). Every writer refuses: updateNoteFrontmatter (frontmatter-write.service.ts:125-126), the panel's commitChanges (properties.service.ts:87) and dispatchMetaBindUpdate (widgets.ts:874), with the toast 'frontmatter has nested values; it cannot be rewritten without losing them'. The rewrite would only quote the link as "[[X]]", which both parsers already read as the same string, so nothing is lost. Fix direction: detectLossyFrontmatter treats a node the fold turns into a string as a scalar, not as nesting; genuinely nested lists (`[[1, 2]]`) and lists of maps stay refused.

**Blocked by:** none

**Status:** ready-for-agent

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`.

**Owner decision (2026-11-06):** fold unquoted wikilink values before the lossy check, so a write rewrites up: [[Home]] as up: "[[Home]]". Reverse the test at properties.logic.test.ts:1542-1544.

- [ ] Failing test first, in src/tests/lib/core/frontmatter/properties.logic.test.ts (describe 'detectLossyFrontmatter', :1101): detectLossyFrontmatter(note('_belongs_to: [[Team]]')) and detectLossyFrontmatter(note('people:\n  - [[Carol]]\n  - [[Dan]]')) return null. It fails today.
- [ ] In src/tests/lib/core/frontmatter/frontmatter-write.service.test.ts: updateNoteFrontmatter on '---\nup: [[Home]]\n---\nbody' setting _favorite: true writes `up: "[[Home]]"` and `_favorite: true`, body unchanged, and parseFrontmatterProperties reads `up` back as the same string.
- [ ] `grid: [[1, 2]]`, `grid: [[1, 2], [3, 4]]` and a list of maps are still 'nested' (existing tests at :1105-1110 and :1284 stay green).
- [ ] The ensureFrontmatterLink case at properties.logic.test.ts:1542-1544, which pins a throw for this shape, is updated to the new contract and the change is recorded in the commit message.
- [ ] Frontend gate: pnpm check and pnpm vitest run pass.

## Notes

- **Priority:** corner case (bucket 4-corner). Upheld ux/low. It needs a hand-typed unquoted link, which is invalid in Obsidian too. It reverses a pinned throw.
- **Trigger:** A note's frontmatter holds an unquoted wikilink, typed by hand or written by an outside editor or agent: `up: [[Home]]`, `_belongs_to: [[Team]]`, or a list item `- [[Carol]]`. The owner presses Cmd+D or Cmd+E, archives, sets an icon, edits the Properties panel or clicks a meta-bind toggle, select or button.
- **Evidence (verified by reading code at `5f8003d67`):** src/lib/core/frontmatter/properties.logic.ts:155-164 fold of a one-item list holding a one-item list of a scalar into "[[X]]"; :244-249 toFrontmatterValue folds before toJS; :404-460 detectLossyFrontmatter parses raw with parseDocument and no fold, :434-438 adds 'nested' for a collection with a sequence ancestor; :381 nested message; src/lib/core/frontmatter/frontmatter-write.service.ts:125-126 throws FrontmatterWriteError; src/lib/features/properties/properties.service.ts:87; src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:874; src/lib/features/auto-move/auto-move.service.ts:203 (rule icon skipped too); docs/adr/0029-frontmatter-yaml-canonical-form.md amendment 2026-11-01 (Issue 39) on the read shape; src/tests/lib/core/frontmatter/properties.logic.test.ts:1542-1544 only pin (ensureFrontmatterLink), no detectLossyFrontmatter test for this shape.
- **Second opinion:** upheld (ux, low). detectLossyFrontmatter (properties.logic.ts:404-460) parses the raw block without foldUnquotedWikilinks. For `up: [[Home]]`, the inner sequence has a sequence ancestor, so the note is reported 'nested' and every writer refuses with a toast. The read side folds the value to the string "[[Home]]" (ADR 0029, 2026-11-01 amendment), so the rewrite would be lossless. Writes are refused and nothing is lost, so this is ux. It needs a hand-typed unquoted link; the app's own writers quote it. Corrections to apply while implementing: Category content -> ux. Note that properties.logic.test.ts:1542-1544 explicitly pins the throw ('throws instead of rewriting an unquoted link to another target'). That is a contract change for the owner to confirm, not just a stale test; the Issue already names it in its acceptance criteria.
- **Source:** audit 2026-11-05, domain `metadata`, finding `N-metadata-04` (from metadata-ux-4, metadata-spec-2). Size S.

## Comments

- 2026-11-06: owner decision recorded from the 2026-11-06 survey; status ready-for-agent.
