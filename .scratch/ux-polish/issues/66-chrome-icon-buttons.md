# 66: Chrome icon buttons share sizes and use shadcn tooltips

**What to build:** Chrome icon buttons are hand-rolled at several sizes and use `title=` for their labels. Add `icon-xs` (24px, icon 3.5) and `icon-chrome` (28px, icon 4) sizes to the shadcn Button, add the `text-heading` (18/26/600) role to `app.css` and `utils/text-roles.ts`, and move rail, tab band, note action bar and note list header buttons to `Button variant="ghost"` with a shadcn Tooltip that shows the label and shortcut.

**Blocked by:** 37

**Status:** needs-triage

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [ ] Button size variants have tests; `text-roles.ts` lists the new role (its test enforces the list)
- [ ] The migrated buttons render a tooltip with label and shortcut (component tests)
- [ ] No migrated button keeps a `title=` attribute

## Notes

- **Source:** `.scratch/ux-polish/review-2026-11-04.md` Review section 2 "Icon buttons" and "Type scale".
- Size: M.
- **Triage:** drafted from the review without the deep dive the bugs and polish tickets got; check the cited lines before promoting to ready-for-agent.
