# 07: Fix-rate report script and rewrite-behind-interface triggers

**What to build:** A minimal report, not a gate. Add `scripts/fix-feat-ratio.mjs` with exported `parseSubject(subject)`, `areaOf(path)` and `aggregate(commits)`, and a CLI:

`node scripts/fix-feat-ratio.mjs [--since] [--until] [--paths <glob>] [--top N]`

- **Table mode** reads `git log --no-merges --name-only` and prints a month-by-area `fix:feat` table with total and ratio. Path areas: `core/<x>` (live-preview split out of markdown-editor), `features/<x>`, `plugins/<x>`, `rust/<module>`, utils, components, types, routes. Tests map to their source area; anything else is "(no product code)". A commit counts once per area it touches.
- **`--paths <glob>`** lists the `fix:` subjects of the last 8 weeks that touch the glob, for the owner to read. No automatic post-merge filtering: in-run review fixes cannot be told apart from git data alone (relay runs rebase and fast-forward; run markers come in two formats).

**Triggers.** Write a short hotspot doc, `docs/HOTSPOTS.md`. Each trigger has an explicit file glob, a threshold over 8 weeks, and what "rewrite behind an interface" means. The owner reads the `--paths` output and decides; the numbers only prompt the read.

| Module (glob) | Prompt | Action if confirmed |
|---|---|---|
| `src/lib/features/event-calendar/event-calendar.service.ts` (write queue and overlay) | 3+ fixes in 8 weeks, or any fix that must change (not add) an issue-14 invariant | split into an `EventWriteCoordinator` behind `{enqueue, drain, overlayFor, onPathChange}`, with issue 14 as its contract test |
| `src/lib/core/markdown-editor/extensions/live-preview/core/**` and each widget file | 4+ fixes in 8 weeks | rebuild behind one decoration coordinator |
| `src/lib/features/type-definitions/type-definitions.service.ts` | 3+ fixes in 8 weeks | split into create / rename / favorite / view-file writers |

**Blocked by:** none

**Status:** resolved

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build`

**Source:** src/tests/scripts/check-outdated-cargo.test.ts (pattern), docs/COMMITS.md

- [x] Tests come first, in src/tests/scripts/fix-feat-ratio.test.ts, on fixture commit records (never real git history: the CI vitest job uses a shallow clone):
  - `parseSubject` handles `fix(x)!:`, `feat:` and non-conventional subjects
  - `areaOf` maps src/lib, src/tests/lib, live-preview, src-tauri/src and src-tauri/tests, and returns null for help/
- [x] `aggregate` counts a two-area commit once in each area and once in TOTAL
- [x] Manual check, recorded in the commit message: `--since 2026-05-01 --until 2026-10-31T23:59:59` prints TOTAL 433:261
- [x] `docs/HOTSPOTS.md` lists the triggers with globs and thresholds, and sets the first review date 8 weeks after issues 14 and 16 merge
- [x] No writes to the repo; output goes to stdout only

## Notes

- **Why not automatic:** raw fix counts overstate hotspots. 61 of event-calendar's 64 fixes were in-run review fixes on 2026-10-28, before merge. At dad4c4c6 the event-calendar and type-definitions rows would already fire on unrelated commits (2430a64f is a file-tree toast that touches all three modules), so a human read of the subjects is required.
- **Root-cause baseline** (all 476 fixes, classified by agents from messages and file lists on 2026-11-01; not reproducible without the per-SHA labels, kept in the plan Notes only as context): logic-error 103, tooling/CI/deps 102, async/race/persistence 48, UI/CSS/focus 43, cross-feature coupling / init order 38, reactivity 38, CodeMirror 33, fix-of-fix 31, other 18, explicit Rust/TS drift 14, dates 8.
- **Size:** S.

## Comments

- 2026-11-01, branch `issue/07-stability-metric-and-rewrite-triggers`: added `scripts/fix-feat-ratio.mjs` (fix:feat report per area, stdout only), its tests in `src/tests/scripts/fix-feat-ratio.test.ts`, and `docs/HOTSPOTS.md` (rewrite-behind-interface triggers, first review 2026-12-27). Review round 1 APPROVED with 3 findings, fixed in 616cb38b: Rust test-stem exception map (`fts_repo` -> `rust/db`, etc.), HOTSPOTS widget exclusions stated, 2430a64f sentence corrected. Review round 2 APPROVED, no findings. Full suite at 616cb38b: vitest 416 files, 9796 passed, 1 skipped, 1 todo; `pnpm build` ok; exit=0. `pnpm check` 0 errors.
