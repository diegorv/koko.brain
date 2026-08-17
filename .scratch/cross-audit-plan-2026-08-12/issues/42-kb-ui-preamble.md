# Issue 42: kb-ui preamble helper

Status: ready-for-agent
Phase: P4
Source: PONY #37 — plan-2026-08-12.md §P4 — Worth-exploring variants and heavy-collateral PARTIALs

Blocked by: none

## What

The kb-ui preamble is rebuilt inline per call. Extract it into one helper — but at the shape the
code actually needs, not the shape the finding proposed: the 3-field bag it suggested does not
compile against the real call sites.

## How

- Extract a **~6-field helper**. **Not the 3-field bag from the finding — it does not compile.**
- The entries payload stays a **per-entry list, not a keyed map**.
- `weekStartDay` stays **caller-local** — it does not belong in the helper's shape.
- **29 existing assertions guard this refactor.** They must stay green unchanged; that is the
  behaviour-neutrality proof. Do not rewrite them to fit a new shape.
- No new module beyond the helper itself, and no behavior change.

## Gate

- Frontend surface: `pnpm check` + `pnpm vitest run` + `pnpm build`. The 29 guarding assertions must
  pass without edits.
- Stage only this change's files (`git add <specific files>`), verify with `git diff --cached --stat`.
- One commit, full commit format (Context, Problem, Solution, Behavior, Files with line ranges).

## Comments
