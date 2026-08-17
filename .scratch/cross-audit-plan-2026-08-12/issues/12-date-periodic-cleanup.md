# Issue 12: Date / periodic-notes surface cleanup

Status: ready-for-agent
Phase: P2
Source: PONY #13 + B4 → #61 → #62 → #32 — plan-2026-08-12.md §P2 — Safe deletion batch (Date/periodic surface)
Blocked by: none

## What

Remove the dead date/periodic-notes exports and collapse the surviving thin wrappers. All four
findings hit the same small set of files, so they run in a **strict order** and every deletion is made
**by symbol, not by line range** (§Sequencing constraints honored: "#13 → #62; #13+#32 delete by
symbol; B4 rides #13; #61 same files").

## How

Strict order, one commit per step:

1. **#13 + B4 first (one commit)** — delete the four dead exports plus the compat re-export; patch the
   affected test imports and `describe` blocks in the same commit.
2. **#61** — delete `parseDate` **and its import at `date.test.ts:3`**.
3. **#62** — delete `today()` and rewrite its call sites as `formatNow(...)`. **Do NOT loosen
   `formatNow`'s signature** to accommodate them.
4. **#32** — inline the three wrappers, and rewrite the two live expectation helpers in the service
   test at `:75` and `:270`.

Do not reorder, batch, or convert any of these to line-range deletions.

## Gate

Frontend surface only: `pnpm check` + `pnpm vitest run` + `pnpm build` before every commit. Stage only
the files for the current step, verify with `git diff --cached --stat`, and commit each step
separately using the repo's full commit format (Context, Problem, Solution, Behavior, Files with line
ranges).

## Comments
