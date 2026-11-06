# 61: Editor tables use the full content width, with hover controls overlaid and the gap below the table kept

**Migrated from:** `.scratch/ux-polish/issues/65-editor-table-width.md` (audit 2026-11-05). Priority: polish (bucket 3-polish). Polish/medium on the daily tables. The reservation is in the wrapper padding at styles.ts:376-379.

**Audit check at `5f8003d67`:** still_present (polish, medium). src/lib/core/markdown-editor/extensions/live-preview/styles.ts:373-380 .cm-lp-table-wrapper sets paddingRight: '24px' and paddingBottom: '10px'. .cm-lp-table is width: 100% of that content box (:420-421), so every rendered table is 24px narrower than sibling blocks. The add-col (:405-411, right: 0, width 20px) and add-row (:412-419, right: 24px, height 6px) controls are absolutely positioned into that reserved padding. Last change to these lines was 6899ebf2a (fix: shrink the gap below a rendered table, Issue 08). It adjusted the bottom padding and kept the right strip. The owner uses tables daily, so the narrower width shows on every table, though it is cosmetic.

**Stale in the text below:** The Issue places the reservation at 'about lines 405-418'. It actually lives in the wrapper padding at styles.ts:376 (paddingRight 24px) and :379 (paddingBottom 10px), which the controls at :405-419 fill. The bottom padding is documented as intentional (:377-378) because it holds the +row button, so the fix has to overlay both controls and keep the gap below the table that Issue 08 tuned. CLAUDE.md Live Preview rule 11 (mousedown stopPropagation on the controls, widgets.ts:442, :458) still applies.

**What to build:** Live-preview tables reserve a 24px right strip for the hover-only add-column control and a 6px add-row strip (`live-preview/styles.ts`, about lines 405-418), so they are narrower than sibling blocks. Overlay the controls on the table edge instead of reserving width.

**Blocked by:** none

**Status:** ready-for-agent

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [ ] Table width equals sibling block width (E2E style check)
- [ ] The add-column and add-row controls still work and keep `stopPropagation` on mousedown (existing tests green)

## Notes

- **Source:** `.scratch/ux-polish/review-2026-11-04.md` Review section 3 Editor chrome row 3. CLAUDE.md Live Preview rule 11 applies.
- Size: S.
- **Triage:** drafted from the review without the deep dive the bugs and polish tickets got; check the cited lines before promoting to ready-for-agent.

## Comments

- 2026-11-06: migrated from `.scratch/ux-polish/issues/65-editor-table-width.md` by audit 2026-11-05, which re-checked it at `5f8003d67`.
