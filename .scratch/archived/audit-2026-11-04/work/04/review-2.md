VERDICT: APPROVED

## Previous findings

| # | Finding | Status | Evidence |
|---|---------|--------|----------|
| 1 | minor: a stem ending in .md (`notes.md.md`) lost the rewrite of `[[notes.md]]` | resolved | link-updater.logic.ts:49-52 adds a second branch: when `ext` is non-empty and `noteStem + ext` equals oldName (case-insensitive), it writes `prefix + newName` with no extension. Traced: `[[notes.md]]` splits to stem `notes`, ext `.md`; the first branch misses, the second matches and writes `[[other]]`. `[[notes.md.md]]` splits to stem `notes.md` and hits the first branch, giving `[[other.md]]`. Test at link-updater.logic.test.ts:163 covers both plus a prefixed, mixed-case, heading form (`[[a/Notes.md#H]]` -> `[[a/other#H]]`). |

## Acceptance criteria re-checked

- [met] Heading, block ref, alias and embed forms are kept with a path prefix and with .md ([[folder/Old.md#H|a]] becomes [[folder/New.md#H|a]], ![[folder/Old]] becomes ![[folder/New]]). — The fix only adds a branch for oldName values ending in .md/.markdown; heading and alias are still appended after `prefix + written` (link-updater.logic.ts:56-63). The existing tests for these forms still pass (52/52 in the two link-updater test files).
- [met] Non-matches stay unchanged: [[folder/Older]], [[Old.png]] (a different file, not a note stem match for a markdown rename), and empty-target links. — The new branch requires `ext !== ''`, so `.png` and empty targets cannot reach it, and for an ordinary oldName (no Markdown extension) `noteStem + ext` can never equal it. The non-match tests still pass.
- [met] The frontend gate is green: pnpm check, pnpm vitest run, pnpm build. — `pnpm check`: exit 0, 0 errors, 0 warnings. Targeted vitest (link-updater.logic.test.ts, link-updater.service.test.ts): exit 0, 52 passed. The fix adds no new imports or modules, so it cannot affect the bundle, and round 1 already ran `pnpm build` (exit 0). Deliver runs the full `pnpm vitest run` and `pnpm build`.

## Findings

1. nit, src/lib/core/filesystem/link-updater.logic.ts:49. When renaming `notes.md.md` in a vault that also has a separate `notes.md` file, a backlink source that also links `[[notes.md]]` (which Rust resolves to the file `notes.md`) gets that link rewritten too. This is not a regression: main compared the whole target and rewrote it the same way. It is the name-based filter the Issue's Notes defer to the next ticket. No change needed here.

## Regression and scope check

- The fix touches only link-updater.logic.ts and its logic test, plus the review file's Resolution. No test was weakened or deleted (the diff only adds a test). No layer-baseline, BASELINE_SIZE or composition-root changes.
- The new branch cannot fire for a normal rename: `ext` is only `.md`/`.markdown`, so `noteStem + ext` equals oldName only when oldName itself ends in that extension.
- The comment at :50-51 explains why the branch exists and does not narrate the session.
