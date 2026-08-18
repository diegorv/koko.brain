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

### 2026-08-18 - closed, resolved by the two-commit series

| Step | Resolving SHA | Fix rounds |
|---|---|---|
| #26 - `getInboxCount` becomes the sole inbox predicate (inbox trio + `countInbox` deleted, ADR-0026:41 amended) | `4c259ba3` | 1 |
| #20 + ARCH 6.2 - `formatDatePair` and `isInsideSystemFolder` deleted, edge cases ported, `untrack` import dropped | this commit | 0 |

**Per-step result**

- **#26** - Gate green (`pnpm check` + `pnpm vitest run` + `pnpm build`). Adversarial review: Fable 5 reviewer, `could_not_refute` after 1 fix round.
- **#20 + ARCH 6.2** - Gate green: `pnpm check` 190 files / 0 errors, `pnpm vitest run` 291 files / 6658 tests passed (exit 0), `pnpm build` exit 0. Adversarial review: Fable 5 reviewer, `could_not_refute`, 0 fix rounds.

**Evidence**

- *Caller trace, #26:* every deleted symbol (`isInboxEnabled`, `shouldNewNoteBeUnorganized`, `getInboxEntries`, `countInbox`) had zero production references, grep-verified over `src/` and `docs/` before and after the cut. `getInboxCount` survives as the dock badge's import (`dock-badge.logic.ts:16`) and its coverage at `inbox-workflow.logic.test.ts:41-49` is preserved, so the soft `dock-inbox-badge.md` Task 7 gate is satisfied.
- *Caller trace, #20:* pre-cut, the only reference to `isInsideSystemFolder` was its own definition at `type-sidebar.logic.ts:57` and its test describe; same for `formatDatePair` at `:384`. Post-cut, `grep -rn` over `src/` and `docs/` returns zero hits for both, and `untrack` has zero remaining uses in `TypeNoteList.svelte`.
- *Red-green:* both steps are pure deletions, so there is no reproducing regression test. The equivalent proof is the zero-caller grep above plus the ported edge cases, which now run against the surviving `excludeSystemFolder` rather than the deleted helper.
- *Mutation proof that C05 stays enforced:* the ported "empty/whitespace `systemFolder`" and "null/empty `vaultPath`" tests were strengthened from a length check to an identity assertion (`toBe(entries)`). ARCH 6.2's rejected dedup would replace the same-array early return at `type-sidebar.logic.ts:81` with an unconditional `entries.filter(...)`, which always allocates a new array - so reapplying the dedup now fails the suite instead of passing it silently.

**Discrepancies between issue and plan**

None. The issue's `## How` and plan §C05 agree on every point, and both line citations in §C05 (`type-sidebar.logic.ts:57` for the definition, `:81` for the early return) verified exact against the pre-change file.

**Notes**

- The issue enumerates 3 unique edge-case tests to port (`:1078`, `:1083`, `:1097-1098`); a 4th unique case, the trailing/leading-slash tolerance pair at old `:1087-1090`, was carried over as well rather than dropped with the function. The surviving `excludeSystemFolder` describe now covers empty and whitespace-only `systemFolder`, null and empty `vaultPath`, slash tolerance on both arguments, and nested folder paths.
- `countNavItems` was left untouched as instructed - its single-pass inline counter still computes the inbox tally alongside four other categories.
- ADR-0026:41 was amended in `4c259ba3` (step #26), so this final commit carries no ADR change.

**Minor findings worth follow-up**

None.
