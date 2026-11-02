# 14: Each collection file gets its own `CollectionView` instance

**Status:** needs-triage

Priority: P3 (correctness: the active view index leaks across files; needs an owner decision)

**What to build:** One `CollectionView` instance is shared across collection files. The reset effect (`src/lib/features/collection/CollectionView.svelte:113-121`) never resets `activeViewIndex`, and the clamp (`:93-96`) only shrinks it, so opening collection B after viewing tab 3 of collection A opens B on tab 3 when B has one. Wrap the view in `{#key activeTab.path}` around `EditorView.svelte:83`.

Behavior change the owner must accept: returning to a collection opens view 0. Today it opens whatever index the shared instance last had.

**Blocked by:** 04

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build` (frontend)

**Source:** src/lib/features/collection/CollectionView.svelte:93-121,370, src/lib/app/EditorView.svelte:83

- [ ] Owner decision recorded in Notes (or an alternative: remember the view index per file)
- [ ] Failing first: open A, switch to view 2, open B (two views): B shows view 0
- [ ] With Issue 04's synchronous seed, the remount costs no stale full-vault pass (the jsdom MutationObserver test from 04 extended to a path change)

## Notes

- Do not replace the effects with a writable `$derived`: it breaks the `selfUpdate` latch.
- Research: `.scratch/ui-responsiveness/research/D-deep-dive.md` (fix 3), `D-verify.md`.
