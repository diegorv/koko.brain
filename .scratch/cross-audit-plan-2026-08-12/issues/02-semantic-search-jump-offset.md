# Issue 02: Semantic/hybrid search jump lands at top of file

Status: ready-for-agent
Phase: P0.2
Source: ARCH LB1 (arch 2.2 pre-fix) — plan-2026-08-12.md §P0 — Live-bug surgical fixes
Blocked by: none

## What

Clicking a semantic or hybrid search result puts the cursor at the top of the note instead of at the match. A 1-indexed `lineStart` is passed where a character offset is expected, so the jump is a unit mismatch. Goal: the click lands the cursor on the actual match.

## How

- Write the failing regression test FIRST (failing-test-first is mandatory here), reproducing the wrong landing position from the search-result click path. Then apply the fix.
- Convert the 1-indexed `lineStart` to a character offset via `doc.line(n).from` at `SearchResult.svelte:102` and `SearchResult.svelte:109`.
- Standalone commit; it must land before arch 2.2, which later subsumes this conversion into the typed `openNoteAt` target (`{kind:'offset'} | {kind:'line'}`). The regression test must survive that relocation.
- Do not pre-empt the path-helper work here: `#27`'s call-site flips (including `SearchResult.svelte:64`) belong to P3 Track C, not to this fix.
- No doc or ADR edits.

## Gate

- Frontend surface: `pnpm check` + `pnpm vitest run` + `pnpm build`.
- Stage only the files related to this issue (`git add <specific files>`), then verify with `git diff --cached --stat`.
- One commit for this fix, using the repo's full commit format (Context, Problem, Solution, Behavior, Files with line ranges). Test collateral lands in the same commit as the source change.

## Comments

**2026-08-17 — resolved.**

- **Red-green evidence:** regression test (`src/tests/lib/features/search/SearchResult.test.ts`, jsdom `mount()` of the real component, real stores, `editor.service` mocked) run against the pre-fix code failed for the right reason: semantic expected offset 20, received 4 (the raw line number); hybrid expected 9, received 3; failed-open expected null, received 4. After the fix: 148/148 search tests, full suite 6680 green, `pnpm check` 0 errors, `pnpm build` ok.
- **Mechanism deviation from the How (reviewed and upheld):** the literal `doc.line(n).from` inside the existing rAF would read `editorStore.editorView` while it is null (no editor mounted) or still holding the OLD file's doc (rAF fires before the async read finishes) — the literal fix would itself be broken for not-yet-open files. Implemented instead as the wikilink-anchor sibling pattern (`MarkdownEditor.svelte` handleEditorClick): `await openFileInEditor(path)`, then `lineStartToOffset(tab.content, lineStart)` (new pure helper in `search.logic.ts`), guarded by `tab.path === path` so a failed open no longer moves the cursor. Same arithmetic as `doc.line(n).from` for LF content.
- **Adversarial review (Fable 5, presumed-flawed stance): could not refute.** Full chain traced (effect ordering incl. fresh-mount, background-tab and already-active cases; 1-indexed premise verified down to `chunker.rs`; no other unit-mismatched `setPendingScrollPosition` producer). Two minors accepted as documented caveats, no code change: (1) CRLF files overshoot by 1 char per preceding line until first edit — identical characteristic as the sibling wikilink pattern, clamped by the consumer; (2) the component test asserts at the `openFileInEditor` mock seam, so the arch 2.2 relocation into typed `openNoteAt` will need to rework the mock, not just relocate — the `lineStartToOffset` unit tests survive as-is.
- **Discoveries for later:** `chunker.rs:196-209` emits a synthetic `line_start` for sliding-window chunks of long heading-less files — those results land near the top by construction, independent of this fix (pre-existing, out of scope). The issues-folder playbook claim "this repo has no component-rendering tooling" is outdated — five `mount()`-based tests exist and this fix used that pattern.
