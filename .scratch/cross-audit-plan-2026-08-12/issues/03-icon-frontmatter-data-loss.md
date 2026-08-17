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
