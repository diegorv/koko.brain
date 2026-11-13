# 65: Editor tables no longer reserve width for hover controls

**What to build:** Live-preview tables reserve a 24px right strip for the hover-only add-column control and a 6px add-row strip (`live-preview/styles.ts`, about lines 405-418), so they are narrower than sibling blocks. Overlay the controls on the table edge instead of reserving width.

**Blocked by:** none

**Status:** wontfix

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [ ] Table width equals sibling block width (E2E style check)
- [ ] The add-column and add-row controls still work and keep `stopPropagation` on mousedown (existing tests green)

## Notes

- **Source:** `.scratch/ux-polish/review-2026-11-04.md` Review section 3 Editor chrome row 3. CLAUDE.md Live Preview rule 11 applies.
- Size: S.
- **Triage:** drafted from the review without the deep dive the bugs and polish tickets got; check the cited lines before promoting to ready-for-agent.

## Comments

- 2026-11-06: migrated to `.scratch/open-itens/issues/211-editor-tables-use-full-content-width-hover.md` by audit 2026-11-05 (its re-checked text and any related audit findings now live there, in one plan ordered by impact on written content and daily use). Closed here as wontfix so it is worked in one place; nothing was implemented.
