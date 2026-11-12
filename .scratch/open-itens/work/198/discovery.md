# 198 discovery

No `spec.md` in `.scratch/open-itens/`; the Issue is the spec.

## Current hits (scan at b7294258e, main after 151 and 236)

Exactly the eight sites the Issue names, nothing more:

- `src/lib/core/settings/BuildInfo.svelte:30-32` `BADGE_CLASSES` (stable, nightly, dev)
- `src/lib/core/settings/sections/UpdateSection.svelte:252` "You're up to date" `text-green-500`
- `src/lib/plugins/kanban/KanbanLane.svelte:309` `CircleCheck` `text-green-500`
- `src/lib/plugins/kanban/KanbanTableView.svelte:74` checked cell `text-green-500`
- `src/lib/features/file-history/DiffViewer.svelte:14-15` `insert` / `delete`

`mauve`, `mist`, `olive`, `taupe` confirmed in `node_modules/tailwindcss/theme.css`.
Tokens `--color-success` / `--color-warning` in `src/app.css:75-76`.

## Plan

1. Add `src/tests/lib/architecture/palette-classes.test.ts`: scan from
   `chrome-state-styles.test.ts` (`readdirSync` recursive, `.svelte|.ts`, skip
   `src/lib/components/ui/`), regex from Issue 236's `tasks-palette.test.ts`
   (same prefix and palette lists), self-test shape from `raw-invoke.test.ts`
   with the Issue's positives and negatives. Hits as `file:line`, comments not
   stripped. Plus an assertion that `src/lib/features/tasks/` files are in the
   scan. Run it red: expect exactly the eight lines above (recorded in the
   build report; no red commit on the branch).
2. Swap classes per the Issue mapping (no `dark:` variants). Commit the test
   and the swaps together: the test is the swaps' test (Issue Notes, Commit).
3. Delete `src/tests/lib/features/tasks/tasks-palette.test.ts` (own commit).

## Checks

`pnpm check`, `palette-classes.test.ts`, `BuildInfo.test.ts`, test files for
DiffViewer, UpdateSection, KanbanLane, KanbanTableView, and any test asserting
the old class strings (grep `green-500`, `green-300`, `red-300` in src/tests).
`pnpm build` once before the last commit (Issue gate).

## Risks

- Contrast change in diff viewer and light-theme warning badge: by-eye check is
  the owner's after merge (delivery note).
- Rebase conflicts on UpdateSection / KanbanLane with other Issues.
