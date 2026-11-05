# Issue 43: Fold the four inline ViewPlugins into the handler registry

Status: needs-info
Phase: P5 (gated)
Source: ARCH 1.1 fold — plan-2026-08-12.md §P5 — Deferred / not applied

Blocked by: the freeze investigation (external, `tasks/todo/audit-vault-and-freeze.md` 0.2/0.3), 22-block-decorator-factory

## What

The four remaining inline ViewPlugins (image, footnote, wikilink-embed, meta-bind-input) should
collapse into the existing handler registry. This is **gated**: the fold removes the last four
LP-TRACE labels the open freeze hunt still needs. Its independent one-line perf fix already shipped
separately (the `doc.toString()` removal).

## How

- **Unblock condition first:** `tasks/todo/audit-vault-and-freeze.md` tasks **0.2 and 0.3 must both
  be checked**. Both are unchecked today. Do not start the fold before they close — the fold
  collapses the last four LP-TRACE labels the freeze hunt depends on.
- When unblocked, fold the four plugins as **plain handlers with NO change to the `NodeHandler`
  interface**. The interface stays exactly as it is.
- **Keep the per-handler profile labels inside `buildInlineDecorations`** so profiling granularity
  survives the fold.
- **Before merging**, add both tests: the **two-overlapping-range** case and the **`![[img.png]]`
  pipeline-dom** case.
- The `meta-bind-input-plugin.ts` `doc.toString()` one-liner is already done (P0.7) — do not redo it.

## Gate

- Frontend surface: `pnpm check` + `pnpm vitest run` + `pnpm build`, plus a re-run of the affected
  live-preview e2e spec.
- Stage only this change's files (`git add <specific files>`), verify with `git diff --cached --stat`.
- One commit containing the fold and both new tests, full commit format (Context, Problem, Solution,
  Behavior, Files with line ranges). Do not merge with either test missing.

## Comments
