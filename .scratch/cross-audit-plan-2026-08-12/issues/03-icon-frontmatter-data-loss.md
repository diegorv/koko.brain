# Issue 03: Note icon/color lost to the next autosave

Status: ready-for-agent
Phase: P0.3
Source: ARCH LB2 + PONY #43 + arch 2.0 (fully discharged here) — plan-2026-08-12.md §P0 — Live-bug surgical fixes
Blocked by: none

## What

Setting a note's icon or color writes `_icon`/`_color` to disk, but the open dirty tab still holds the pre-write content, so the next autosave clobbers the file and the metadata silently evaporates. Goal: picking an icon or color survives the next autosave of that note.

## How

Four-commit series, in this order (per C15: `#43` first because it has zero test churn):

- (a) `#43`: delete `setFrontmatterIconColor` (`frontmatter-icon.service.ts:49-59`). Zero test churn.
- (b) Regression test, written FIRST and confirmed FAILING: dirty tab + `setIconForPath` must keep `_icon` after the following save.
- (c) Fix: call `syncExternalContentToEditor(filePath, newContent, true)` after the two `writeTextFile`s, INSIDE `frontmatter-icon.service.ts`. Not in `file-icons.service.ts` — `newContent` is local there.
- (d) Flip `type-definitions.service.ts:149` `markSaved` to `true`. Prescribed by both arch 2.0 and arch 2.1; it lands ONCE, here. Arch 2.1 (P3 Track B) must not repeat it.

No ADR-0017 edit in this series (arch 2.0 needs no ADR edit; the single ADR-0017 rewrite is owned by `#28`).

## Gate

- Frontend surface, per commit: `pnpm check` + `pnpm vitest run` + `pnpm build`.
- Stage only the files related to the current step (`git add <specific files>`), then verify with `git diff --cached --stat`.
- One commit per step (a, b, c, d) using the repo's full commit format (Context, Problem, Solution, Behavior, Files with line ranges). Test collateral lands in the same commit as its source change.

## Comments

**2026-08-17 (agent):** Fixed, four-commit series as prescribed: (a) 0635bfd deleted `setFrontmatterIconColor` (whole-repo grep confirmed zero callers, zero test refs, zero dynamic-import destructurings); (b) 61ef67f regression test — real editorStore + real `saveFileByPath`, dirty tab + `setIconForPath`, asserts the LAST `writeTextFile` payload keeps `_icon`; run red-first against broken code (final write was the dirty tab content without `_icon` — the exact clobber), then landed as `it.fails` so the per-commit gate stayed green; (c) 75ff4a7 the fix — `syncExternalContentToEditor(filePath, newContent, true)` after the two `writeTextFile`s inside `frontmatter-icon.service.ts` (also flips the regression test to plain `it`; sync collateral added to `frontmatter-icon.service.test.ts`); (d) 7bdf3c1 flipped `type-definitions.service.ts:149` `markSaved` to `true`, landed once. No ADR edit.

Findings recorded for posterity:

1. **Accepted tradeoff surfaced by review (b):** the prescribed fix rebuilds from DISK and marks the tab saved, so unsaved body edits present at the moment the icon is picked are replaced by the disk-rebuilt content. Bounded by the 500ms/2s autosave debounce and visible in the editor, versus the silent permanent icon loss it removes. Documented in 75ff4a7's Behavior section per reviewer advisory.
2. **Latent, out of scope (review d):** `toggleFavoriteForPath` syncs only when the note is the ACTIVE tab; a dirty background tab can still clobber `_favorite` on save-all. Pre-existing; `syncExternalContentToEditor` itself already handles any open tab, so the `activeTabPath` guard is stricter than the helper requires.
3. After (c), every disk-write-then-sync site uses `markSaved=true`; the two remaining `false` callers (`properties.service.ts:48`, `lifecycle.service.ts:18`) rebuild from in-memory tab content without writing disk, so `false` remains correct there.

Adversarial reviews (fable): four passes, one per commit; all four verdicts "could not refute". Working tree audited clean after each pass.
