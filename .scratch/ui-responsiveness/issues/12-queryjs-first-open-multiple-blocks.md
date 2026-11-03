# 12: Under `first-open`, every queryjs block in a note auto-runs on its first open, not only the first block

**Status:** resolved

Priority: P3 (behavior; owner decision recorded)

**What to build:** `markAutoRun(filePath)` runs synchronously in block 1's `toDOM` (`src/lib/plugins/queryjs/queryjs-block-widget.ts:117`) before block 2's `hasAutoRun` check (`:109`), and the marker is per file (`queryjs-session.store.svelte.ts:38,88-98`). So in a note with two blocks only the first auto-runs; the second shows the Run button. The log fits: at 17:54:59.534 week 40's wellness block was a cache hit and did not mark, and its habits block then auto-ran.

The owner must choose the semantics:
- **Mark after the render pass:** keeps per-file semantics; every block built in the first pass auto-runs, but blocks first built on scroll still show Run.
- **Per-block marker** (`${filePath}\0${jsContent}`): breaks the matrix row "first-open, cache miss after edit -> Run button" (`queryjs-block-widget.ts:40-44`, ADR 0010:36), because an edited block has new text and no marker, so it would auto-run on every edit-exit. `invalidatePath` would need a prefix scan.

**Blocked by:** 08

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build` (frontend)

**Source:** src/lib/plugins/queryjs/queryjs-block-widget.ts:40-44,98-117, src/lib/plugins/queryjs/queryjs-session.store.svelte.ts:38,88-98, docs/adr/0010-queryjs-kb-api-caching.md

- [x] Owner decision recorded in Notes
- [x] Failing first: two blocks in one file under `first-open` both auto-run on the first open
- [x] The full `autoRunQueries` matrix (CLAUDE.md live-preview rule 10) stays green, including "manual mode never marks `autoRunOnFirstOpen`"
- [x] ADR 0010 updated if the matrix changes

## Notes

- Owner decision (2026-11-03): mark after the render pass. Every block built in the first render pass of a file auto-runs; blocks first built on scroll still show Run; the rest of the `autoRunQueries` matrix, including "first-open, cache miss after edit -> Run button", is unchanged.

- Fixing this doubles executions in multi-block notes, so it waits for Issue 08's Chart.js `destroy`.
- Research: `.scratch/ui-responsiveness/research/E-deep-dive.md` (fix 4), `E-verify.md` (bug 1, fix 4 review).

## Comments

- 2026-11-03, branch `issue/12-queryjs-first-open-multiple-blocks`: under `first-open` the autoRun mark is now queued after the render pass (requestAnimationFrame), so every block built in the first pass auto-runs; blocks first built on scroll still show Run. ADR 0010 and the help doc updated. Review round 1 APPROVED (2 minor accepted, 2 nits fixed: doc-comment `always` row, help scroll caveat); fix round ran; round 2 APPROVED with no findings. Tests: pnpm check 0 errors; queryjs-block-widget.test.ts 24/24; kb-api-contract.test.ts 8/8; full suite at 3570b247 exit=0 (451 files, 10358 passed, 1 skipped, 1 todo), pnpm build ok.
