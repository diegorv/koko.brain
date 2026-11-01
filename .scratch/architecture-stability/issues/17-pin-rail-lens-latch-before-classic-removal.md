# 17: Pin the view-lens seed/latch logic and note writes before the classic Types panels go

**What to build:**
- **Latch logic.** Move the toolbar seed and self-update latch decision out of `RailNoteList.svelte:61-166` (state at 61, latch set and cleared in `persistViewState` at 151-166) into a pure transition function in `rail-shell/` (`.logic.ts`), and test it table-first.
- **Port the two missing cases.** Most `TypeNoteList.view.test.ts` cases are already ported to `RailNoteList.view.test.ts` (259 -> 348, 286 -> 339, 330 and 408 -> 357). Port the two that are missing: 309 (an unchanged hash does not re-seed) and the switch-back half of 546.
- **Write ratchet.** Add a ratchet test that lists the raw `writeTextFile(` sites outside `core/filesystem`, each with a one-line reason. Any unlisted site fails. `frontmatter-write.service.ts:145` (the `updateNoteFrontmatter` owner) is exempt by rule.

**Blocked by:** none. It must land BEFORE sidebar-redesign 25; ask the owner to add it to sidebar 25's Blocked by.

Also blocked by `.scratch/sidebar-redesign/issues/22-neighbourhood-lens.md`, in another feature: do not start until that file says `**Status:** resolved` on `main`.

**Status:** needs-triage

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build`

**Source:** `src/lib/features/rail-shell/RailNoteList.svelte`, `src/tests/lib/features/type-definitions/TypeNoteList.view.test.ts` (309, 546), `src/tests/lib/features/rail-shell/RailNoteList.view.test.ts`; commits b48787e4, 2c9abc6f, 55fc771b, 68e313fb, 2b82365b, ba242e39, 05a76e8d, 7bdf3c1a

- [ ] Logic tests:
  - a view switch during the previous view's save does not consume its latch (b48787e4)
  - a content-hash change re-seeds, and an unchanged hash does not
  - a parse failure or a rejected read clears the seed
- [ ] The two missing cases (309, the 546 switch-back) pass in `RailNoteList.view.test.ts`
- [ ] The ratchet test has a baseline allowlist (21 sites at dad4c4c6), each with a reason. Adding a site fails until it is listed. The test reads source text and imports no feature
- [ ] No behaviour change in the rail: the existing `RailNoteList.view.test.ts` cases pass unedited

## Notes

- **Why now:** 27 of the 43 type-definitions fixes are in components that sidebar 25 deletes. The latch logic was copied inline into RailNoteList.
- **Bug class:** 7 fixes were writes that bypassed the indexing owner. The ratchet makes a new raw write site visible in review. Whether a site writes a note cannot be decided from source text, so the allowlist reason is the review point.
- **Overlap:** touches files that sidebar issues 15-25 also touch. Run it between relay runs.
- **Size:** S.
