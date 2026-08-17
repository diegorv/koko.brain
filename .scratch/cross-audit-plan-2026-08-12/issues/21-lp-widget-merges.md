# Issue 21: Merge the meta-bind and math widget pairs

Status: ready-for-agent
Phase: P3 Track A step 2
Source: PONY #24 + #16 — plan-2026-08-12.md §P3 — ARCH Strong refactors (Track A — Live preview)
Blocked by: 20-lp-parser-deletions

## What

Two widget pairs are near-duplicates: the meta-bind input widgets and the math widgets. Merge each
pair into one widget. Both merges carry a correctness constraint that must not be dropped, because
today's class identity is what silently keeps the two variants apart.

## How

- **#24 meta-bind widget merge:** the merged `eq()` **MUST compare input type and opts**. Class
  identity is today's ONLY barrier to a number widget being reused as a date widget — once the classes
  collapse, an `eq()` that ignores type/opts will happily reuse the wrong input.
- **#16 math widget merge:** the merged cache key **MUST include `displayMode`**. Keep the span/div
  swap (inline vs block element) and keep the **conditional empty-formula guard** — neither is
  redundant after the merge.
- Update the two clear call sites in `app-lifecycle.service.ts:75-76` and
  `app-lifecycle.service.ts:414-415` to the merged widgets' cache clears.
- Update `CLAUDE.md:231` (the widget-cache perf rule text) in the same series as the code it describes.
- Follows issue 20 so the parser deletions have already rewritten the shared LP test files.

## Gate

- Frontend surface: `pnpm check` + `pnpm vitest run` + `pnpm build`.
- Test collateral lands in the same commit as the source change; the widget tests must cover the
  type/opts comparison (#24) and the `displayMode` cache key (#16) explicitly.
- Stage only the files related to this step (`git add <specific files>`), verify with
  `git diff --cached --stat`.
- One commit per merge (#24, then #16), using the repo's full commit format (Context, Problem,
  Solution, Behavior, Files with line ranges).

## Comments
