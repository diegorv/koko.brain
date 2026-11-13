# 17: Pin the view-lens seed/latch logic and note writes

**What to build:**
- **Latch logic.** Move the toolbar seed and self-update latch decision out of `RailNoteList.svelte:118-205` (state at 118-122, the seed decision at 152-170, the latch set and cleared in `persistViewState` at 198-205) into a pure transition function in `rail-shell/` (`.logic.ts`), and test it table-first.
- **Port the two missing cases.** Sidebar-redesign Issue 25 (43498215) deleted `TypeNoteList.view.test.ts` without porting them; read them with `git show 43498215^:src/tests/lib/features/type-definitions/TypeNoteList.view.test.ts`. The other cases were already ported to `RailNoteList.view.test.ts` (259 -> 348, 286 -> 339, 330 and 408 -> 357). Port the two that are missing: 309 ("leaves the toolbar state alone while the .view content hash is unchanged") and the switch-back half of 546 ("does not let a view switch consume the previous view self-update latch").
- **Write ratchet.** Add a ratchet test that lists the raw `writeTextFile(` sites outside `core/filesystem`, each with a one-line reason. Any unlisted site fails. `frontmatter-write.service.ts:145` (the `updateNoteFrontmatter` owner) is exempt by rule.

**Blocked by:** none

**Status:** resolved

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build`

**Source:** `src/lib/features/rail-shell/RailNoteList.svelte`, `TypeNoteList.view.test.ts` at `43498215^` (309, 546), `src/tests/lib/features/rail-shell/RailNoteList.view.test.ts`; commits b48787e4, 2c9abc6f, 55fc771b, 68e313fb, 2b82365b, ba242e39, 05a76e8d, 7bdf3c1a

- [x] Logic tests:
  - a view switch during the previous view's save does not consume its latch (b48787e4)
  - a content-hash change re-seeds, and an unchanged hash does not
  - a parse failure or a rejected read clears the seed
- [x] The two missing cases (309, the 546 switch-back) pass in `RailNoteList.view.test.ts`
- [x] The ratchet test has a baseline allowlist (21 sites at dad4c4c6), each with a reason. Adding a site fails until it is listed. The test reads source text and imports no feature
- [x] No behaviour change in the rail: the existing `RailNoteList.view.test.ts` cases pass unedited

## Notes

- **Why now:** 27 of the 43 type-definitions fixes were in the components sidebar 25 deleted. The latch logic was copied inline into RailNoteList, and two of its regression cases went with the deleted tests. Lines re-checked at 1f4b769d.
- **Bug class:** 7 fixes were writes that bypassed the indexing owner. The ratchet makes a new raw write site visible in review. Whether a site writes a note cannot be decided from source text, so the allowlist reason is the review point.
- **Size:** S.

## Comments

- 2026-11-01, branch `issue/17-pin-rail-lens-latch-before-classic-removal`: added the pure `stepViewSeed` transition (`view-lens-seed.logic.ts`) with table and sequence tests; RailNoteList seeds the view toolbar through it; ported the unchanged-hash (309) and latch switch-back (546) view cases; added the raw `writeTextFile` ratchet with a 19-site allowlist plus the exempt owner, pinned to exactly one site after review. Full suite: 376 files, 9127 passed, 1 todo, `pnpm build` ok. Review round 1: APPROVED (finding 1 fixed, nit 2 accepted with no change).
