# 48: Status colors use theme tokens, and a test forbids raw palette classes

**What to build:** Swap the remaining raw Tailwind palette classes outside `components/ui` for tokens, then lock the rule in with an architecture test:
- `src/lib/core/settings/sections/UpdateSection.svelte:340` `text-green-500` to `text-success`.
- `src/lib/plugins/kanban/KanbanLane.svelte:311`, `src/lib/plugins/kanban/KanbanTableView.svelte:74`, `src/lib/features/auto-move/AutoMoveRuleRow.svelte:120`: `text-green-500` to `text-success`.
- `src/lib/features/tasks/TasksView.svelte:184` `text-purple-400` to `text-primary`; `:252` `text-green-400` to `text-success`.
- `src/lib/features/file-history/DiffViewer.svelte:14-15`: insert `bg-success/15 text-success`, delete `bg-destructive/15 text-destructive`.
- `src/lib/core/settings/BuildInfo.svelte:31`: `bg-warning/20 text-warning`, no `dark:` variant.
- New `src/tests/lib/architecture/palette-classes.test.ts`: scans `.svelte` and `.ts` files under `src/lib` and `src/routes`, skipping `src/lib/components/ui/`, and fails on any Tailwind palette color utility, with or without variant prefixes and `/NN` alpha (prefixes `bg`, `text`, `border` and its side forms, `ring`, `fill`, `stroke`, `outline`, `decoration`, `from`, `via`, `to`; the 22 palette names from `slate` to `rose`; a 2 or 3 digit shade). It prints `file:line` for each hit.

**Blocked by:** 08, 47

**Status:** wontfix

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [ ] Failing first: `palette-classes.test.ts` fails on the sites listed above before the swaps and passes after.
- [ ] No palette class is left outside `components/ui` (the test is the check).
- [ ] The commit body records a by-eye check of the diff viewer, the update row and the build badge in both themes.

## Notes

- **Source:** review-2026-11-04.md section 3 rows 87 and 99, color rules row ("never Tailwind palette classes"); `work/color.md` H4; `work/views.md` P1.
- **Commit:** the class swaps are CSS-only; the architecture test is their test, so no `Test-Exempt` trailer is needed.
- **Contrast:** `text-destructive` is about 3.4:1 on Default's card (`work/color.md` M5); lifting destructive-as-text is separate contrast work.
- **Out of scope:** `text-white` and `bg-black/NN` (not numbered palette shades), `components/ui` internals, the hover and selection recipes.
- **Size:** S.

## Comments

- 2026-11-06: migrated to `.scratch/open-itens/issues/198-status-colors-use-theme-tokens-test-forbids.md` by audit 2026-11-05 (its re-checked text and any related audit findings now live there, in one plan ordered by impact on written content and daily use). Closed here as wontfix so it is worked in one place; nothing was implemented.
