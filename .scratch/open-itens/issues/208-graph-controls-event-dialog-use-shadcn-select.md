# 208: Graph controls and the event dialog use shadcn Select, Switch and Checkbox

**Origin:** `audit-2026-11-05` Issue 91, moved here on 2026-11-08. Its PRD, raw evidence and closed siblings stay in `.scratch/audit-2026-11-05/`. Bare Issue numbers in the text below use that feature's numbering; `priority-2026-11-08.md` in this folder maps them to the numbers here.

**Migrated from:** `.scratch/ux-polish/issues/69-native-controls-to-shadcn.md` (audit 2026-11-05). Priority: polish (bucket 3-polish). Polish/low, in surfaces that are not daily.

**Audit check at `5f8003d67`:** still_present (polish, low). src/lib/plugins/graph-view/GraphControls.svelte:100 and :113 are native <select>; :83-93 and the Arrows toggle (~:137-146) are hand-built switch buttons; src/lib/features/event-calendar/EventDialog.svelte:202 is a native <input type=checkbox> ('Open note after creating'). shadcn select and switch exist under src/lib/components/ui/ (no checkbox primitive yet). Graph view filters are an occasional-use panel.

**What to build:** GraphControls uses native selects and a hand-built switch; EventDialog uses a native checkbox ("Open note after creating"). Replace them with the shadcn `Select`, `Switch` and a checkbox primitive (add one via the shadcn CLI if missing). Native date and time inputs stay.

**Blocked by:** none

**Status:** ready-for-agent

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [ ] Component tests drive the new controls and assert the same store or form state as before
- [ ] No native `<select>` left in GraphControls

## Notes

- **Source:** `.scratch/ux-polish/review-2026-11-04.md` Review section 3 Feature views row 2 and Overlays row 11.
- Size: S.
- **Triage:** drafted from the review without the deep dive the bugs and polish tickets got; check the cited lines before promoting to ready-for-agent.

## Comments

- 2026-11-06: migrated from `.scratch/ux-polish/issues/69-native-controls-to-shadcn.md` by audit 2026-11-05, which re-checked it at `5f8003d67`.
