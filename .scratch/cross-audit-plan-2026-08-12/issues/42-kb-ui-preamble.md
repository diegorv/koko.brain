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

### 2026-08-19 — implemented

**What discovery found.** The duplicated preamble is exactly two sites and nothing else in the
1036-line file repeats: `heatmapCalendar` (kb-ui.ts:651-698) and `yearlyCalendar` (kb-ui.ts:818-859).
They are identical except for three things: (1) `heatmapCalendar` also reads `weekStartDay` (:657,
consumed at :700 and :774) which `KBYearlyCalendarOptions` does not have; (2) the two loops write
into different key spaces — day-of-year via `KBUI.getDayOfYear` (:687) vs `month-day` string
(:843); (3) cosmetic field order in the stored object. That is why the finding's 3-field bag does
not compile: `firstColorKey` is still needed at :677/:907, `emptyColor` at :698/:859 and
`showCurrentDayBorder` at :655/:822.

**Shape shipped.** One private static `KBUI.calendarPreamble(entries, options?)` beside the other
private statics, returning 6 fields — `year`, `colors`, `firstColorKey`, `showCurrentDayBorder`,
`emptyColor`, `entries[]`. Two file-local, non-exported interfaces (`CalendarEntry`,
`CalendarPreamble`) carry the return type, so `kb-ui.types.ts` — the public queryjs API surface —
is untouched. The `options` parameter is a structural type covering only the six shared fields, so
both `KBHeatmapCalendarOptions` and `KBYearlyCalendarOptions` assign to it without widening either.
`weekStartDay` stayed caller-local in `heatmapCalendar`. The entries payload is a per-entry list in
caller order; each renderer builds its own map from it with unconditional assignment. The degenerate
scale branch (`minIntensity === maxIntensity && scaleStart === scaleEnd` -> `mapped = numLevels`) and
the call-time `document.documentElement.classList.contains('dark')` read moved verbatim.

**Red-green evidence.** Pure refactor, so there is no bug to reproduce. The evidence is mutation
based, per the issue's own "behaviour-neutrality proof" framing:

1. Added one test per describe: `keeps the last entry when two entries share the same date`. Both
   pass against the pre-refactor code (2 passed) — a characterization test, as expected.
2. Mutated both loops to first-wins (`if (key in map) continue;`) on the pre-refactor code:
   both new tests fail — `AssertionError: expected 'A' to be 'B'` at kb-ui.test.ts:1159 and :1336.
   None of the 43 pre-existing assertions catch that mutation, which is why this probe is the one
   worth adding rather than padding coverage.
3. Reverted; `git status --porcelain` showed only the test file modified.
4. Applied the extraction. Re-ran the same mutation against the *refactored* loops: both new tests
   fail again with the identical assertion. Restored; 132 passed | 1 todo.

The probe deliberately asserts on the distinct `content` string, not on background color: with
explicit `intensityScaleStart: 1` / `intensityScaleEnd: 5` the two intensities do map to different
palette indexes, but a color-only probe would still be fragile against the degenerate-scale branch.

**Gate.** `pnpm check` -> 191 files, 0 errors, 0 warnings. `pnpm vitest run` -> 284 files, 6363
passed | 1 todo. `pnpm build` -> built in 4.59s, adapter-static wrote the site. All green.

**Plan discrepancies.**

- The issue and plan-2026-08-12.md:155 both say "29 existing assertions guard this refactor". The
  real count is **43 `expect()` calls across 27 tests**: 22 assertions / 14 tests in
  `describe('heatmapCalendar')` (kb-ui.test.ts:973-1151) and 21 assertions / 13 tests in
  `describe('yearlyCalendar')` (:1152-1313). The requirement is unaffected and strictly better
  satisfied. `git diff --numstat` on the test file reports `34 0` — 34 insertions, **zero
  deletions** — so all 43 guarding assertions are byte-identical and green.
- "No new module beyond the helper itself" combined with repo rule 11 (no source change without a
  test change) and "do not rewrite the guarding assertions" only reconciles one way: leave all 43
  untouched and ADD tests. Two were added, one per renderer.
- Neither the issue nor the plan cites line numbers and the original PONY #37 finding text is not in
  `.scratch/`, so the surface was identified by reading kb-ui.ts directly. Recorded above.

**Minor finding worth a follow-up issue (out of scope, not touched).**
`KBUI.getDayOfYear` (kb-ui.ts:962-968) reads **UTC** date fields off a `Date` that `heatmapCalendar`
parsed as **local** (`new Date(e.date + 'T00:00')`). In timezones east of UTC the UTC calendar day is
one behind the local one, so every heatmap cell can be off by a day and two adjacent dates can
collapse onto the same day-of-year index. `getDayOfYearLocal` (:971-977) already exists and is used
for the "today" comparison at :705. This is pre-existing and unchanged by this refactor — the helper
returns a plain list precisely so the bug keeps manifesting identically rather than being reshaped by
a date-keyed map. `yearlyCalendar` is unaffected (it keys off local `getMonth()`/`getDate()`).

