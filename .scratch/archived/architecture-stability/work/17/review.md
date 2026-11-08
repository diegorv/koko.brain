VERDICT: APPROVED

# Issue 17 review

Reviewed `git diff main...HEAD` (e9c1385c..e2b31703, 5 commits, 6 files). There is no `spec.md` for architecture-stability. ADR 0003 (layers) is respected: the new `.logic.ts` has no imports, and the ratchet imports only `node:fs` / `node:path`.

## Acceptance criteria

- [met] Logic tests: — `src/tests/lib/features/rail-shell/view-lens-seed.logic.test.ts` covers all three sub-items and passes (part of the 395/395 run). (1) a view switch during the previous view's save does not consume its latch (b48787e4) — table rows "a foreign latch is cleared by the re-seed" (:37) and the sequence test at :46. A mutation probe that makes any latch count as own (`own = prev.selfUpdatePath !== null`, the pre-b48787e4 boolean latch) fails both, plus two RailNoteList view cases. (2) a content-hash change re-seeds, and an unchanged hash does not — table rows "a content-hash change re-seeds" and "same path and hash does not re-seed" (:34-35). (3) a parse failure or a rejected read clears the seed — row "a parse failure or rejected read clears the seed" (:38) and the sequence at :60. Both component paths (`!parsed.success` and the `catch`) now emit the same `load-failed` event (RailNoteList.svelte:163, :186). The one behaviour delta is that a rejected read also clears the hash. I traced it: `stepViewSeed` compares the hash only when `seededPath === path`, and `viewToolbarReady` reads only `seededPath`, so the result is the same.
- [met] The two missing cases (309, the 546 switch-back) pass in `RailNoteList.view.test.ts` — added at :348 and :363. I compared them against `43498215^:src/tests/lib/features/type-definitions/TypeNoteList.view.test.ts` 309 and 546, and both pass. The 546 port includes the switch-back. It is the only test that catches a re-seed which leaves the foreign latch in place: the mutation `selfUpdatePath = own ? null : prev.selfUpdatePath` fails it, while the older "keeps the view the lens moved to..." case still passes.
- [met] The ratchet test has a baseline allowlist (21 sites at dad4c4c6), each with a reason. Adding a site fails until it is listed. The test reads source text and imports no feature — `git grep 'writeTextFile(' dad4c4c6` outside core/filesystem gives 21 sites including the exempt owner. `bookmarks.service.ts:49` was removed in fe41f726 (Issue 24), so main has 20: 19 listed and 1 exempt. The allowlist matches that, which is the correct baseline for today. I checked each reason against its call site (editor/deep-link `notifyAfterSave`, file-icons/type-definitions `applyNoteChange`, config/manifest JSON, `.view` YAML, the template scaffold, the log), and they are accurate. The `toEqual` on per-file counts fails on an unlisted file, on an extra site in a listed file, and on a stale entry. Imports are `vitest`, `node:fs` and `node:path` only.
- [met] No behaviour change in the rail: the existing `RailNoteList.view.test.ts` cases pass unedited — the diff of that file has 0 removed lines (only the two added cases), and the file passes. I compared the `loaded` branch of `stepViewSeed` line by line with the removed inline code: own latch clears it without a re-seed, a re-seed clears it, and otherwise the latch is kept. `save-started`, `save-failed` and `no-view` also match the removed writes.

## Checks run

- `pnpm check`: exit 0, 212 files, 0 errors, 0 warnings.
- `pnpm vitest run src/tests/lib/features/rail-shell/ src/tests/lib/raw-write-ratchet.test.ts`: exit 0, 16 files, 395 tests passed. My test verdict rests on these files: `view-lens-seed.logic.test.ts`, `RailNoteList.view.test.ts`, `raw-write-ratchet.test.ts`, and the rest of `src/tests/lib/features/rail-shell/` (the test files of the changed `RailNoteList.svelte`).
- Mutation probes on `view-lens-seed.logic.ts`, reverted afterwards (worktree clean): (1) a boolean latch gives 4 failures; (2) a re-seed that keeps a foreign latch gives 3 failures, including the ported 546 case.
- I did not run the full suite or `pnpm build`. Deliver runs them.

## Findings

1. minor — `src/tests/lib/raw-write-ratchet.test.ts:90` — `EXEMPT` exempts all of `frontmatter-write.service.ts`, but the Issue exempts only the one owner site (`:145`). A second raw `writeTextFile(` added to that file would pass the ratchet silently, and the sanity check asserts only `toBeGreaterThan(0)`. Fix: assert `toBe(1)` for the exempt file, so a new site there fails too.
2. nit — `src/tests/lib/features/rail-shell/RailNoteList.view.test.ts:348` — the ported 309 case cannot detect a spurious re-seed, because re-seeding from an unchanged file gives the same rows (the original case had the same limit, and the build report says so). The logic table row pins the rule. No change needed unless someone wants a component-level guard. That would need toolbar state that differs from the file without a write landing.

## Resolution

1. Fixed: `raw-write-ratchet.test.ts` now asserts the exempt `frontmatter-write.service.ts` has exactly one raw `writeTextFile(` site (`toBe(1)`), so a second site in that file fails the ratchet.
2. Accepted as noted, no change: the reviewer marks it "no change needed"; the logic table row in `view-lens-seed.logic.test.ts` pins the no-re-seed rule, and a component-level guard would need toolbar state that differs from the file without a write landing.
