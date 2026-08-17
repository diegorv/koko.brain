# Issue 15: Inbox predicate and type-sidebar dead helpers

Status: ready-for-agent
Phase: P2 (conflict C05)
Source: PONY #26, PONY #20, ARCH 6.2 (discharged) — plan-2026-08-12.md §P2 — Safe deletion batch (Type-definitions/inbox/properties), §Conflicts resolved C05
Blocked by: none

## What

The inbox surface carries two predicates that count the same thing, plus a system-folder helper with
zero production callers. Collapse to one surviving predicate, `getInboxCount`, and delete the twins.
This also discharges ARCH 6.2, whose proposed dedup is rejected: it would move two regexes per entry
inside the filter loop at 4 call sites and forfeit the same-array early return at
`type-sidebar.logic.ts:81`.

## How

- **#26 first, then #20, as one commit series.** #26 first so `getInboxCount` is established as the
  sole inbox predicate *before* its `countInbox` twin is deleted.
- Delete: the inbox trio, `countInbox`, `formatDatePair`, and `isInsideSystemFolder`.
- **C05 resolution — `isInsideSystemFolder` IS deleted (pony wins).** Zero production callers: the
  only reference is its own definition at `type-sidebar.logic.ts:57`. Do **not** apply ARCH 6.2's
  dedup in its place.
- Port the **3 unique edge-case tests** (test `:1078`, `:1083`, `:1097-1098`) into the surviving
  `excludeSystemFolder` describe — do not drop them with the function.
- **Do NOT rewire `countNavItems`** — leave its single-pass inline counter alone.
- `getInboxCount` survives as the sole predicate (it is the dock badge's import). Its coverage at
  `inbox-workflow.logic.test.ts:41-49` is explicitly preserved, which is why the
  `dock-inbox-badge.md` Task 7 gate is treated as soft.
- Amend `docs/adr/0026-type-definitions-relationships-lifecycle.md:41` **in-series** (correct path —
  both audits cite it wrong).
- Drop the now-unused `untrack` import in `TypeNoteList.svelte`.

## Gate

- Frontend surface: `pnpm check` + `pnpm vitest run` + `pnpm build`.
- Stage only the files for this series (`git add <specific files>`), then verify with
  `git diff --cached --stat`.
- One commit per item (#26, then #20), each carrying its test collateral and the ADR amendment in the
  same series. Full commit format (Context, Problem, Solution, Behavior, Files with line ranges).

## Comments
