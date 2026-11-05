# Issue 18 discovery

No `spec.md` in `.scratch/ux-polish/`; the Issue and `work/radius.md` quick win 1 are the source. Same ratchet as Issue 17 (`work/17/`), but every site moves to `rounded-xs` and the baselines go to empty instead of shrinking.

## Pixel identity

`src/app.css:97-103` `@theme static` gives `--radius-xs: calc(var(--radius) - 6px)`; `--radius` is `0.625rem` (`:185`, the only declaration), so `rounded-xs` = 4px = Tailwind's bare `rounded` (0.25rem). `radius-scale.test.ts` already asserts the 4px.

## Sites (scanned with the test's own regexes, `.svelte` under `src/lib`, `components/ui` and the allowlisted `ThemePreview.svelte` left out)

- Rule (a) "bare rounded": 74 sites in 34 files, exactly the current baseline (`radius-scale.test.ts:153-188`). Two are side forms: `KanbanView.svelte:465` `rounded-l` and `:479` `rounded-r`. No variant-prefixed site (`hover:rounded`) exists today.
- Rule (b) "arbitrary": `EventPopover.svelte:165` `rounded-[4px]`. `EventBlock.svelte:76` `after:rounded-[inherit]` is excluded by the counter and stays.
- Every match sits inside a class string (checked line by line); none is prose or a variable.

## Plan

1. Failing first: set both baselines to `{}` (`radius-scale.test.ts:153`, `:193`), run the file, see it list the 35 files.
2. Rename: `rounded` -> `rounded-xs`, `rounded-l`/`rounded-r` -> `rounded-l-xs`/`rounded-r-xs`, `rounded-[4px]` -> `rounded-xs`. Done with a one-off node script over the scanned files using the test's own `BARE_ROUNDED_RE` (keeps any variant prefix and the side letter), then one Edit for `EventPopover`.
3. Run `radius-scale.test.ts`, the test files of the touched components that exist, `pnpm check`. `git diff --stat` must list only `.svelte` files plus `radius-scale.test.ts`.

## Tests to check

- No test or E2E selects on bare `.rounded`: `grep -rn rounded src/tests e2e` finds only `rounded-md` / `rounded-full` selectors and `not.toMatch(/(^|\s)rounded(\s|$)/)` guards (FilesNavigator, TypesNavigator, RailNoteList, MyPeopleSection tests), which stay green.
- `kb-ui.test.ts:1307` covers `.ts` (`kb-ui.ts`, allowlisted, out of scope).

## Risks / defaults

- The rule (a)/(b) `baseline: {}` keeps the `Rule` shape (rule (c) still has entries); no code path changes.
- Comment in the test file header ("The baselines only shrink") stays true; no comment edit needed beyond that.
- Commit as `refactor:` (mechanical, no pixel change); no `fix:`, so no Test-Exempt trailer.
