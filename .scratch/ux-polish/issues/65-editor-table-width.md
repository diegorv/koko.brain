# 65: Editor tables no longer reserve width for hover controls

**What to build:** Live-preview tables reserve a 24px right strip for the hover-only add-column control and a 6px add-row strip (`live-preview/styles.ts`, about lines 405-418), so they are narrower than sibling blocks. Overlay the controls on the table edge instead of reserving width.

**Blocked by:** None (can start immediately)

**Status:** needs-triage

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [ ] Table width equals sibling block width (E2E style check)
- [ ] The add-column and add-row controls still work and keep `stopPropagation` on mousedown (existing tests green)

## Notes

- **Source:** `.scratch/ux-polish/review-2026-11-04.md` Review section 3 Editor chrome row 3. CLAUDE.md Live Preview rule 11 applies.
- Size: S.
- **Triage:** drafted from the review without the deep dive the bugs and polish tickets got; check the cited lines before promoting to ready-for-agent.
