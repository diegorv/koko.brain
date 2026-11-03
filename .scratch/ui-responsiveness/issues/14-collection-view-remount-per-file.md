# 14: Each collection file gets its own `CollectionView` instance

**Status:** resolved

Priority: P3 (correctness: the active view index leaks across files; owner decision recorded)

**What to build:** One `CollectionView` instance is shared across collection files. The reset effect (`src/lib/features/collection/CollectionView.svelte:113-121`) never resets `activeViewIndex`, and the clamp (`:93-96`) only shrinks it, so opening collection B after viewing tab 3 of collection A opens B on tab 3 when B has one. Wrap the view in `{#key activeTab.path}` around `EditorView.svelte:83`, and remember the active view index per collection path for the session (a module-level `Map<path, index>`, clamped to the file's view count on restore). A collection never opened in the session opens on view 0; returning to one restores the view last used in it. Clear the map on vault teardown; on a rename or move, either carry the entry through the path-change consumer or drop it (view 0 is acceptable).

**Blocked by:** 04

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build` (frontend)

**Source:** src/lib/features/collection/CollectionView.svelte:93-121,370, src/lib/app/EditorView.svelte:83

- [x] Owner decision recorded in Notes
- [x] Failing first: open A, switch to view 2, open B (two views): B shows view 0
- [x] Failing first: open A, switch to view 2, open B, reopen A: A shows view 2
- [x] A remembered index larger than the file's current view count is clamped
- [x] With Issue 04's synchronous seed, the remount costs no stale full-vault pass (the jsdom MutationObserver test from 04 extended to a path change)

## Notes

- Owner decision (2026-11-03): remember the view per file for the session, not always view 0.

- Do not replace the effects with a writable `$derived`: it breaks the `selfUpdate` latch.
- Research: `.scratch/ui-responsiveness/research/D-deep-dive.md` (fix 3), `D-verify.md`.

## Comments

- 2026-11-03, branch `issue/14-collection-view-remount-per-file`: `CollectionView` is keyed per file, so each collection file gets its own instance; the active view index is remembered per file for the session and clamped to the file's view count. Review fixes: the index is recorded only while the definition parses; a rename test confirms the active view survives `applyPathChange`. Tests: `pnpm check` 0 errors; targeted vitest 24 files / 820 passed; full suite run 2 exit=0, 450 files, 10305 passed / 1 skipped / 1 todo, `pnpm build` OK (run 1 had one load flake in MarkdownEditor.test.ts, passed alone). Reviews: round 1 APPROVED (review.md, findings fixed), round 2 APPROVED (review-2.md, no findings).
