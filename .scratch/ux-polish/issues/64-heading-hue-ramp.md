# 64: Each theme uses one heading hue ramp

**What to build:** Both built-in themes override H2 to H5 with a rainbow (`theme.logic.ts`, about lines 147-150 and 257-260). Drop the `heading2-5` overrides so headings come from one hue ramp per theme (`headingAt`).

**Blocked by:** 42

**Status:** needs-triage

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [ ] Theme snapshot tests are updated on purpose and show H2-H5 derived from the ramp in both themes
- [ ] The contrast guard still passes for every heading level

## Notes

- **Source:** `.scratch/ux-polish/review-2026-11-04.md` Review section 3 Editor chrome row 4. Issue 42 changes the Lavender H1 first.
- Owner check: this changes the look of every note heading.
- Size: S.
- **Triage:** drafted from the review without the deep dive the bugs and polish tickets got; check the cited lines before promoting to ready-for-agent.
