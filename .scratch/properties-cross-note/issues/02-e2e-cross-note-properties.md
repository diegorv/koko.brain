# 02: E2E proves the Properties panel never writes across notes

**What to build:** A Playwright spec under `e2e/specs/` (run with `bash scripts/e2e.sh`, never `pnpm dev` by hand) that drives the real `PropertiesView` and tab switching, so the fix from issue 01 is proven with the real Svelte effect timing, not the inlined `$effect` copy the unit reproduction uses. Scenarios:
1. Open note A (with frontmatter, e.g. `status: todo`, `prioridade: media`) and note B (no frontmatter) in tabs. Edit a property of A in the panel, switch to B within 300 ms, then perform a panel action with B active (add or remove a property). Assert B's editor content and saved file never contain A's properties, and the panel shows B's properties.
2. Same, but change A's property through a meta-bind inline select in A's body (`INPUT[inlineSelect(todo, doing, done):status]`), then switch to B quickly and act in the panel. This is what the owner did when the bug appeared.
3. After a panel edit in A and a fast switch to B, wait past the debounce: the panel shows B's (empty) properties, not A's.
Assert on rendered content and saved file content (CLAUDE.md rule 8), not on container existence.

Prove the spec detects the bug: run it once with issue 01's fix reverted locally (do not commit the revert) and record that it fails, then run it on the fixed code and record that it passes.

**Context:** Owner request 2026-10-30. The unit reproduction in issue 01 inlines `PropertiesView`'s debounced `$effect` because the repo has no component-testing library, so it could pass while the real component still misbehaves.

**Blocked by:** 01 (panel-commit-writes-stale-properties)

**Status:** ready-for-agent

**Touches:**
- `e2e/specs/properties-cross-note.spec.ts` (new)
- `e2e/fixtures/` (new fixture notes, if the existing ones do not fit)

**Gate:** `bash scripts/e2e.sh` for the new spec (the automatic gate does not run E2E), plus the classifier's gate for anything else changed

- [ ] The three scenarios are in one spec and pass on main with issue 01 merged
- [ ] The closing commit records that the spec failed with issue 01's fix reverted (which scenarios, with the failure message)
- [ ] The spec asserts on editor content and on the saved file
