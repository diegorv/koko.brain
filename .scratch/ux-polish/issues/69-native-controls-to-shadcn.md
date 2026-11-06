# 69: Graph controls and the event dialog use shadcn Select, Switch and Checkbox

**What to build:** GraphControls uses native selects and a hand-built switch; EventDialog uses a native checkbox ("Open note after creating"). Replace them with the shadcn `Select`, `Switch` and a checkbox primitive (add one via the shadcn CLI if missing). Native date and time inputs stay.

**Blocked by:** none

**Status:** wontfix

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [ ] Component tests drive the new controls and assert the same store or form state as before
- [ ] No native `<select>` left in GraphControls

## Notes

- **Source:** `.scratch/ux-polish/review-2026-11-04.md` Review section 3 Feature views row 2 and Overlays row 11.
- Size: S.
- **Triage:** drafted from the review without the deep dive the bugs and polish tickets got; check the cited lines before promoting to ready-for-agent.

## Comments

- 2026-11-06: migrated to `.scratch/audit-2026-11-05/issues/91-graph-controls-event-dialog-use-shadcn-select.md` by audit 2026-11-05 (its re-checked text and any related audit findings now live there, in one plan ordered by impact on written content and daily use). Closed here as wontfix so it is worked in one place; nothing was implemented.
