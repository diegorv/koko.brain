VERDICT: APPROVED

# Review: issue 02, E2E proof that the Properties panel never writes across notes

Reviewed `git diff main...HEAD` (main f978493f, HEAD bcc29569): `e2e/specs/properties-cross-note.spec.ts` (new), `work/02/discovery.md`, and the Issue comments. No `src/` or `src-tauri/` change.

## Checks I ran

- `bash scripts/e2e.sh e2e/specs/properties-cross-note.spec.ts --retries=0 --repeat-each=3` on HEAD: 9 passed.
- Revert probe: I checked out `src/lib/features/properties/` from `a50c4699^` in the worktree (not committed), then restored it with `git checkout HEAD --` (`git status` clean afterwards).
  - Full spec run: all 3 failed (1 failed, 2 interrupted by the config's stop-on-failure). S3: `expect(panelKeys).toEqual([])` received `["prioridade", "status"]`.
  - S1 run alone: fails at `expect(doc).not.toContain('status')`. B's editor = `---\nstatus: todo\nprioridade: alta\nfoo: ""\n---\n# Tables...`.
  - S2 run alone: same assertion. B's editor = `---\nstatus: todo\nprioridade: media\nfoo: ""\n---\n# Tables...` (A's stale pre-select properties, the owner's case).
  - These match the revert-proof comment in the Issue word for word.
- `pnpm check`: 0 errors, 0 warnings (211 files). It does not cover `e2e/`.
- `tsc --ignoreConfig --strict` on the spec plus `e2e/types/global.d.ts`: the only error is the pre-existing one in `e2e/mocks/vault-index.ts:203`. The spec itself is clean.
- I ran no unit tests: the diff changes no source file.

My test verdict rests on `e2e/specs/properties-cross-note.spec.ts`, run on the fixed code and with issue 01's fix reverted.

## Acceptance criteria

- [x] **Met.** The three scenarios are in one spec and pass on main with issue 01 merged. Evidence: S1 is at spec:141, S2 at spec:156 and S3 at spec:176, and all 9 of 9 runs passed. S1 covers a panel edit, a switch and "Add property" in B. S2 does the same with a meta-bind `inlineSelect` change in A's body. S3 covers a panel edit, a switch and a wait past the debounce.
- [ ] **Pending for deliver.** The closing commit must record that the spec failed with the fix reverted. The spec commit eaccaf6a already states it in its Behavior section, and the Issue's revert-proof comment has the exact text. The closing commit still has to copy it (finding 2).
- [x] **Met.** The spec asserts on editor content and on the saved file.
  - `expectBHasOnlyFoo` (spec:124-138) reads B's CodeMirror doc and `window.__e2e.fs.readFile(B_PATH)`, and checks the panel rows.
  - S3 (spec:186-188) asserts that the editor doc and the saved file both equal `B_CONTENT` exactly.
  - S1 and S2 also check that A's own edit reached A's file (spec:153, spec:173), so the fix does not prove itself by dropping the edit.

## Plan and CLAUDE.md fit

- Timing is deterministic. `clockTime` plus `page.clock.pauseAt` before the A edit holds every step inside the 300 ms window, and `runFor(2000)` passes the 300 ms parse debounce and the 500 ms frontmatter auto-save. Without that, a slow run could pass on buggy code. The revert probe confirms the window is hit.
- Rule 8 (assert on rendered content): met for S1 and S2. S3 has a gap (finding 1).
- No scope creep: one new spec, and fixtures are seeded in-spec, so `test-vault.ts` is untouched. Comments explain why, with no session narration. Indentation uses tabs.
- Commits follow docs/COMMITS.md (Context, Problem, Solution, Behavior, Files).

## Findings

1. **Low**, `e2e/specs/properties-cross-note.spec.ts:186`. S3 asserts `panelKeys(page)` equals `[]` and never checks that the panel is rendered for B. If the Properties panel were unmounted or hidden for a note without frontmatter, the assertion would still pass. S1 and S2 do not have this gap, because they click "Add property" and expect `['foo']`.
   - Fix: before line 186, add `await expect(page.locator('button', { hasText: 'Add property' })).toBeVisible();`.
2. **Info (deliver must do)**, Issue file, acceptance criterion 2. The closing commit (`docs(scratch): close issue 02: ...`) must copy the revert-proof failures: which scenarios failed and the failure messages. The text is in the Issue comment dated 2026-10-30 07:38. I reproduced it independently (see above).
3. **Nit**, `e2e/specs/properties-cross-note.spec.ts:106`. `editPrioridadeInPanel` finds the row as the first `div.group` that contains a `[data-property-key]` input. Tabs in `EditorTabs.svelte` also use `group`. If a future layout wraps the panel in an ancestor `.group`, that ancestor would match first, and `fill` would hit a strict-mode multi-match. It fails loudly, so the risk is low.
   - Optional fix: anchor on the key input with `page.locator('input[data-property-key][value="prioridade"]').locator('xpath=ancestor::div[contains(@class,"group")][1]')`, or leave it as is.
4. **Info, pre-existing, out of scope**, `e2e/fixtures/helpers.ts:77-84`. `activeTab` and `expectTabActive` look for `[data-state="active"]`, but `EditorTabs.svelte:37` renders `aria-selected`. No spec calls them today. The spec rightly does not touch them. They are worth a separate Issue: fix them, or delete them as dead code.

## Resolution

1. Fixed. S3 now expects the "Add property" button to be visible before it checks `panelKeys`, so a hidden or unmounted panel fails the test. The spec passes (3 of 3).
2. Done in the closing commit, which copies the revert-proof failures from the Issue comment dated 2026-10-30 07:38.
3. Rejected. `PropertyField.svelte:102-105` renders the key input with `value={property.key}`, which Svelte 5 sets as a DOM property, not an attribute, so `input[data-property-key][value="prioridade"]` is not a reliable selector. The current locator fails loudly with a strict-mode multi-match if the layout changes, so it stays.
4. Out of scope (pre-existing, not touched by this Issue). Left for a separate Issue.
