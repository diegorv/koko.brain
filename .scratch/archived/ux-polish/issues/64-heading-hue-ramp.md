# 64: Each theme uses one heading hue ramp

**What to build:** Both built-in themes override H2 to H5 with a rainbow (`theme.logic.ts`, about lines 147-150 and 257-260). Drop the `heading2-5` overrides so headings come from one hue ramp per theme (`headingAt`).

**Blocked by:** 08

**Status:** resolved

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [x] Theme snapshot tests are updated on purpose and show H2-H5 derived from the ramp in both themes
- [x] The contrast guard still passes for every heading level

## Notes

- **Source:** `.scratch/ux-polish/review-2026-11-04.md` Review section 3 Editor chrome row 4. Issue 08 (part C) changes the Lavender H1 first.
- Owner check: this changes the look of every note heading.
- Size: S.
- **Triage:** drafted from the review without the deep dive the bugs and polish tickets got; check the cited lines before promoting to ready-for-agent.

## Comments

- 2026-11-04, branch `issue/64-heading-hue-ramp`: built-in themes now color H2-H5 from one heading ramp (`headingAt` between H1 and H6); the `src/app.css` `.dark` fallback H2-H5 match the Default ramp (review 1 finding 2). Review 1 finding 1 (flat Lavender ramp) left for the owner visual check. Tests: pnpm check 0 errors; theme-css-contract + theme-snapshot 7 passed; full suite run 1 had one unrelated beforeAll timeout in queryjs-contract.test.ts (133/133 alone), run 2 exit=0, 493 files, 11688 tests passed, pnpm build passed. Reviews: round 1 APPROVED, round 2 APPROVED after the fix round.
