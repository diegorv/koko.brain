# 198: Status colors use theme tokens, and a test forbids raw palette classes

**Origin:** `audit-2026-11-05` Issue 84, moved here on 2026-11-08. Its PRD, raw evidence and closed siblings stay in `.scratch/archived/audit-2026-11-05/`. Bare Issue numbers in the Origin lines use that feature's numbering; `priority-2026-11-08.md` in this folder maps them to the numbers here. The site list below was re-checked by the Tasks view deep dive at `d2304ac9e` (`.scratch/tasks-view-ux/research/deep-dive/SUMMARY.md` 198, `dossier-129+198+205.md`, `cross-tests-relay.md` M6, M7, `cross-state-chain.md` L8); it replaces the audit's line lists.

**Migrated from:** `.scratch/archived/ux-polish/issues/48-status-colors-use-tokens.md` (audit 2026-11-05). Priority: polish (bucket 3-polish). Polish/low. Its guard test flags 47's kanban sites, so it cannot go green before 47 (here: 151) lands. Blocker 08 is resolved.

**What to build:** Swap the remaining raw Tailwind palette classes outside `components/ui` for theme tokens, then lock the rule in with an architecture test. At `d2304ac9e` the scan finds 19 line hits; Issue 151 removes the Kanban proximity sites (`KanbanCard`, `KanbanDatePicker`, `KanbanListView`, and the proximity chip in `KanbanTableView`) and Issue 236 removes `text-purple-400` from `TasksView.svelte`. The eight hits left for this Issue:

- `src/lib/core/settings/BuildInfo.svelte`, `BADGE_CLASSES`: `stable` to `bg-success/20 text-success`, `nightly` to `bg-warning/20 text-warning`, `dev` (violet today) to `bg-primary/20 text-primary`, with no `dark:` variants.
- `src/lib/core/settings/sections/UpdateSection.svelte`: the "You're up to date" `text-green-500` to `text-success`.
- `src/lib/plugins/kanban/KanbanLane.svelte`: the `CircleCheck` `text-green-500` to `text-success`.
- `src/lib/plugins/kanban/KanbanTableView.svelte`: the checked-item cell's `text-green-500` to `text-success`.
- `src/lib/features/file-history/DiffViewer.svelte`, the line class switch: `insert` to `bg-success/15 text-success`, `delete` to `bg-destructive/15 text-destructive`.

`src/lib/features/auto-move/AutoMoveRuleRow.svelte`, named by the audit, no longer exists: the feature is now `src/lib/features/auto-organize/`, and `AutoOrganizeRuleRow.svelte` has no palette class. The tokens exist in every theme (`--color-success`, `--color-warning` in `src/app.css`; `theme-builder.logic.ts` and `theme.types.ts` carry both), and `text-success` is already used.

The test, new `src/tests/lib/architecture/palette-classes.test.ts`, copying the scan of `src/tests/lib/chrome-state-styles.test.ts` (`readdirSync(..., { recursive: true })`, `.svelte` and `.ts`, skip `src/lib/components/ui/`) and the self-test shape of `src/tests/lib/architecture/raw-invoke.test.ts`:
- Scans `.svelte` and `.ts` files under `src/lib` and `src/routes`, skipping `src/lib/components/ui/`, and fails on any Tailwind palette color utility, with or without variant prefixes (`dark:`, `hover:` and the like) and `/NN` alpha. Prefixes: `bg`, `text`, `border` and its side forms (`border-x|y|t|b|l|r|s|e`), `ring`, `fill`, `stroke`, `outline`, `decoration`, `from`, `via`, `to`. Palette names: the 22 from `slate` to `rose`, plus `mauve`, `mist`, `olive` and `taupe`, which the installed Tailwind 4 ships (`node_modules/tailwindcss/theme.css`). A 2 or 3 digit shade. It prints `file:line` for each hit.
- Comments are not stripped. If a comment holds a palette class, reword the comment.
- A self-test of the pattern. Positives: `text-green-500`, `dark:text-green-400`, `bg-red-500/15`, `hover:bg-amber-500/20`, `border-l-red-500`, `border-t-blue-400`, `ring-violet-500`, `from-pink-400`, `fill-taupe-300`, `text-slate-950`, `bg-red-50`. Negatives: `text-type-orange`, `bg-muted`, `text-white`, `bg-black/50`, `border-l-destructive`, `text-success`, `ring-offset-2`, `bg-green`, `text-green-5`.

Once the test passes and covers `src/lib/features/tasks/`, delete Issue 236's `src/tests/lib/features/tasks/tasks-palette.test.ts`, which it duplicates.

**Blocked by:** 151

**Waits on:** Tasks view Issue 236 (`.scratch/tasks-view-ux/issues/236-tasks-group-header-reads-like-a-note.md`), which removes the Tasks view's raw palette class. relay-lite cannot see a blocker in another folder: launch this Issue by number only after 236 is `done` in `.scratch/tasks-view-ux/ledger.md`.

**Status:** ready-for-agent

**Answered:** first wave, picked by the owner on 2026-11-06. The BuildInfo mapping (stable success, nightly warning, dev primary) comes from the 2026-11-06 order review note. Nothing open.

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build` (Tailwind must generate `bg-success/15`, `bg-success/20`, `bg-warning/20`, `bg-primary/20`). relay-lite's configured checks do not run `pnpm build`: the build step runs it once before its last commit and reports the result; CI on `main` runs it again after the merge.

- [ ] Failing first: `palette-classes.test.ts` lists the eight sites above before the swaps and passes after. If it lists more, a predecessor left a palette class: stop and report the `file:line` instead of widening this Issue.
- [ ] The self-test's positives match and its negatives do not.
- [ ] No palette class is left outside `components/ui` (the test is the check); the three BuildInfo badges use success, warning and primary with no `dark:` variants. `src/tests/lib/core/settings/BuildInfo.test.ts` ("gives each kind of build its own color", "does not style the stable chip as muted") stays green unchanged.
- [ ] `src/tests/lib/features/tasks/tasks-palette.test.ts` is deleted, and the new test still finds no hit under `src/lib/features/tasks/`.
- [ ] The delivery comment says the diff viewer, the update row and the build badge were not checked by eye (relay agents cannot run the app); the owner checks them in both themes after the merge.

## Notes

- **Source:** review-2026-11-04.md section 3 rows 87 and 99, color rules row ("never Tailwind palette classes"); `work/color.md` H4; `work/views.md` P1.
- **Commit:** the class swaps are CSS-only; the architecture test is their test, so no `Test-Exempt` trailer is needed.
- **Contrast:** `text-destructive` is about 3.4:1 on Default's card (`work/color.md` M5); lifting destructive-as-text is separate contrast work. The diff viewer's text was pale `green-300` / `red-300` and becomes the full tokens; `bg-warning/20` on a light theme is darker than the old amber. Only the owner's by-eye check settles these.
- **Out of scope:** `text-white` and `bg-black/NN` (not numbered palette shades), `components/ui` internals, the hover and selection recipes, and the `shadow-`, `divide-`, `accent-`, `caret-` and `placeholder-` palette forms (none in use at `d2304ac9e`).
- This Issue never edits the Tasks view, which the Tasks view chain edits in series. After it lands, Tasks view Issues name `palette-classes.test.ts` among their targeted source scans, since a palette class there now fails this test.
- `UpdateSection.svelte` is also edited by Issues 157 and 202, and `KanbanLane.svelte` by 006, 040, 049, 197 and 214: different lines, but a rebase conflict is possible.
- **Size:** S.

## Comments

- 2026-11-06: migrated from `.scratch/archived/ux-polish/issues/48-status-colors-use-tokens.md` by audit 2026-11-05, which re-checked it at `5f8003d67`.
- 2026-11-06: BuildInfo badge tokens named and line numbers updated after the order review.

- 2026-11-12: the Tasks view sites are out of this Issue. Issue 236 removes `text-purple-400` from `TasksView.svelte` with its own check, and the `text-green-400` site no longer exists. The audit notes above still name them; ignore those two. This Issue waits on 236, so the new test never meets that class, and it never edits the Tasks view, which the Tasks chain edits in series.
- 2026-11-12: deep dive applied (SUMMARY 198, `dossier-129+198+205.md`, `cross-tests-relay.md` M6, M7, `cross-state-chain.md` L8). The site list is the one at `d2304ac9e` after 151 and 236 (eight hits, by file and symbol); the stale audit line lists and `AutoMoveRuleRow` (the feature is now `auto-organize`) are gone. The by-eye criterion is now a delivery note for the owner. The test gets a pattern self-test and a comment rule, and it replaces Issue 236's `tasks-palette.test.ts`.

- 2026-11-12: the Tasks view Issues moved to `.scratch/tasks-view-ux/issues/`; the 236 edge became a Waits on line.
