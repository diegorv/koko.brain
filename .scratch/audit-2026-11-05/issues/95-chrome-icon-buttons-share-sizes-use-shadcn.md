# 95: Chrome icon buttons share sizes and use shadcn tooltips

**Migrated from:** `.scratch/ux-polish/issues/66-chrome-icon-buttons.md` (audit 2026-11-05). Priority: polish (bucket 3-polish). Design polish. Its blocker 37 is resolved.

**Audit check at `5f8003d67`:** design_or_refactor (polish, low). src/lib/components/ui/button/button.svelte:23-25 has only icon, icon-sm, icon-lg (no icon-xs or icon-chrome); src/lib/utils/text-roles.ts:6 lists only label, meta, row, title (no heading); Rail.svelte:122,144 and NoteActionBar.svelte:148,157,175,188,228 still use native title= for labels. Blocker Issue 37 is done (ledger row 37, 56072aa3d), so it is unblocked. Consistency and tooltip polish, not a defect.

**What to build:** Chrome icon buttons are hand-rolled at several sizes and use `title=` for their labels. Add `icon-xs` (24px, icon 3.5) and `icon-chrome` (28px, icon 4) sizes to the shadcn Button, add the `text-heading` (18/26/600) role to `app.css` and `utils/text-roles.ts`, and move rail, tab band, note action bar and note list header buttons to `Button variant="ghost"` with a shadcn Tooltip that shows the label and shortcut.

**Blocked by:** none

**Status:** ready-for-agent

**First wave:** yes, picked by the owner on 2026-11-06.

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [ ] Button size variants have tests; `text-roles.ts` lists the new role (its test enforces the list)
- [ ] The migrated buttons render a tooltip with label and shortcut (component tests)
- [ ] No migrated button keeps a `title=` attribute

## Notes

- **Source:** `.scratch/ux-polish/review-2026-11-04.md` Review section 2 "Icon buttons" and "Type scale".
- Size: M.
- **Triage:** drafted from the review without the deep dive the bugs and polish tickets got; check the cited lines before promoting to ready-for-agent.

## Comments

- 2026-11-06: migrated from `.scratch/ux-polish/issues/66-chrome-icon-buttons.md` by audit 2026-11-05, which re-checked it at `5f8003d67`.
