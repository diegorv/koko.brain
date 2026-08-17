# Issue 25: Typed openNoteAt(path, target) in core/editor

Status: ready-for-agent
Phase: P3 Track B step 2
Source: ARCH 2.2 (Strong) — plan-2026-08-12.md §P3 — ARCH Strong refactors (Track B — Editor/save)
Blocked by: 02-semantic-search-jump-offset, 24-autosave-scheduling

## What

Opening a note at a position is re-derived per call site, each redoing the await ordering, the
active-vs-switch branch, the animation-frame layering, the clamp and the focus. Give it one typed
owner, so unit mismatches like the search-jump bug (issue 02) become type errors instead of runtime
misplacement.

## How

- Add `openNoteAt(path, target: {kind:'offset'} | {kind:'line'})` in **core/editor**. It owns the
  await ordering, the active-vs-switch branch, the rAF layering, the clamp, and the focus.
- **Absorb `toc.service.ts::scrollToHeading`** into it — the table-of-contents jump is the same
  operation with a line target.
- **Subsume issue 02's conversion into the type system**: the 1-indexed-line vs char-offset
  distinction becomes the `target` discriminant. Issue 02's regression test must survive this
  relocation, still asserting the cursor lands on the match.
- **`pendingScrollPosition` and `editorStore.editorView` stay public.** Do not hide them behind the
  new function.
- **file-history's `restoreSnapshot` is NOT a caller** — it takes no position argument. Do not convert
  it (see issue 24's audit note).
- Calendar is permanently not a caller either (C13): `#38`'s call sites take `openFileInEditor`
  directly.

## Gate

- Frontend surface: `pnpm check` + `pnpm vitest run` + `pnpm build`.
- Test collateral lands in the same commit as the source change; assert real store state and the
  resulting cursor position, never a mock-call assertion alone.
- Stage only the files related to this step (`git add <specific files>`), verify with
  `git diff --cached --stat`.
- One commit, using the repo's full commit format (Context, Problem, Solution, Behavior, Files with
  line ranges).

## Comments
