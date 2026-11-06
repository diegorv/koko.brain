# 84: Status colors use theme tokens, and a test forbids raw palette classes

**Migrated from:** `.scratch/ux-polish/issues/48-status-colors-use-tokens.md` (audit 2026-11-05). Priority: polish (bucket 3-polish). Polish/low. Its guard test flags 47's kanban sites, so it cannot go green before 47 lands. Blocker 08 is resolved.

**Audit check at `5f8003d67`:** still_present (polish, low). rg for palette color utilities outside components/ui: UpdateSection.svelte:252 text-green-500; KanbanLane.svelte:309 and KanbanTableView.svelte:74 and AutoMoveRuleRow.svelte:119 text-green-500; TasksView.svelte:184 text-purple-400 and :252 text-green-400; DiffViewer.svelte:14-15 bg-green-500/15 text-green-300 and bg-red-500/15 text-red-300 (pale on a light theme); BuildInfo.svelte:30-32 stable/nightly/dev with dark: variants. Tokens exist (src/app.css:69 --color-success, :193 and :266 --success, --color-warning). src/tests/lib/architecture/palette-classes.test.ts does not exist. Blocker 08 is resolved; 47 is not delivered (KanbanCard.svelte:118-125 and KanbanDatePicker.svelte:21-24 still use raw shades).

**Stale in the text below:** UpdateSection line is 252, not 340. BuildInfo now has three badges (stable, nightly, dev) on lines 30-32, not only line 31. The architecture test will also flag KanbanDatePicker.svelte:21-24, KanbanListView.svelte:48, KanbanTableView.svelte:69 and KanbanCard.svelte, which are Issue 47's sites, so 48 cannot go green before 47 lands. Mostly cosmetic on the default dark theme.

**What to build:** Swap the remaining raw Tailwind palette classes outside `components/ui` for tokens, then lock the rule in with an architecture test:
- `src/lib/core/settings/sections/UpdateSection.svelte:340` `text-green-500` to `text-success`.
- `src/lib/plugins/kanban/KanbanLane.svelte:311`, `src/lib/plugins/kanban/KanbanTableView.svelte:74`, `src/lib/features/auto-move/AutoMoveRuleRow.svelte:120`: `text-green-500` to `text-success`.
- `src/lib/features/tasks/TasksView.svelte:184` `text-purple-400` to `text-primary`; `:252` `text-green-400` to `text-success`.
- `src/lib/features/file-history/DiffViewer.svelte:14-15`: insert `bg-success/15 text-success`, delete `bg-destructive/15 text-destructive`.
- `src/lib/core/settings/BuildInfo.svelte:31`: `bg-warning/20 text-warning`, no `dark:` variant.
- New `src/tests/lib/architecture/palette-classes.test.ts`: scans `.svelte` and `.ts` files under `src/lib` and `src/routes`, skipping `src/lib/components/ui/`, and fails on any Tailwind palette color utility, with or without variant prefixes and `/NN` alpha (prefixes `bg`, `text`, `border` and its side forms, `ring`, `fill`, `stroke`, `outline`, `decoration`, `from`, `via`, `to`; the 22 palette names from `slate` to `rose`; a 2 or 3 digit shade). It prints `file:line` for each hit.

**Blocked by:** 68

**Status:** ready-for-agent

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

- 2026-11-06: migrated from `.scratch/ux-polish/issues/48-status-colors-use-tokens.md` by audit 2026-11-05, which re-checked it at `5f8003d67`.
