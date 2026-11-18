VERDICT: APPROVED

Re-review of the fixes after `review.md`: `git diff 5fddf893d..HEAD` (fix commit 816708f2a), in `brain.worktrees/issue-03-my-people-setup-ago-overdue`. No `spec.md` exists for shell-sidebars-ux.

## Previous findings

| # | Previous finding | Status | Evidence |
|---|------------------|--------|----------|
| 1 | nit, row ring on `has-[[data-my-people-open]:focus-visible]` instead of the literal `has-[button:focus-visible]` | rejection stands | No change was requested. `MyPeopleSection.svelte:51` is unchanged, the comment at `:47` gives the reason (New 1:1 keeps a single indicator), and `MyPeopleSection.test.ts:241-248` still pins the classes. Deliver should name the deviation in the squash body. |
| 2 | nit, settings intro test asserted the `_one_on_one_every` literal | resolved | `OneOnOneSection.test.ts:6` imports `ONE_ON_ONE_EVERY_PROPERTY` from the plugin logic file, and `:50` asserts the intro contains it. A rename of the constant now fails this test while `OneOnOneSection.svelte:23` still hard-codes the old name. A test importing `plugins/` is outside the layer scan: `layer-rules.test.ts` passes. |
| 3 | nit, empty-folder fallback untested | resolved | `OneOnOneSection.test.ts:59-61` sets `workPeopleFolder: ''` and asserts `A person in the work people folder is listed`, which matches only the `|| 'the work people folder'` branch of `OneOnOneSection.svelte:23`. |
| 4 | nit, sr-only "Overdue" outside the open button | resolved | `MyPeopleSection.svelte:63-64` moves the `sr-only` span inside `[data-my-people-open]`, still gated by `row.overdue`. The icon at `:67` stays outside with `aria-hidden="true"`. `MyPeopleSection.test.ts:230` asserts `[data-my-people-open] .sr-only` reads "Overdue"; before the move that selector found nothing, so the assertion would fail. `:228` (exactly one sr-only per overdue row) and `:234` (no "Overdue" on Ana) still hold, so no duplicate text was left behind. |

## Acceptance criteria re-checked

- [met] Overdue and `never` rows render the icon and "Overdue"; on-time rows neither; the theme-token test (`:129-135`) stays green. — `MyPeopleSection.test.ts:211-235` passes: Bruno (never) and Caio (overdue) have the `aria-hidden` `text-warning` icon and exactly one "Overdue", now inside the open button; Ana has neither. The theme-token test passes in the same run.
- [met] Failing test first, `src/tests/lib/core/settings/OneOnOneSection.test.ts`: the page names `_one_on_one_every` and the configured work people folder. — `OneOnOneSection.test.ts:48-62` asserts `ONE_ON_ONE_EVERY_PROPERTY` (`_one_on_one_every`), `Work/_people`, the live update to `Team` and the empty-folder fallback; passes.
- [met] Class assertions for the row ring and `focus-visible:outline-none` (jsdom has no `:focus-visible`; `focus-ring.spec.ts:74-92` pins the pattern in a browser). — Unchanged by the fix; `MyPeopleSection.test.ts:238-249` passes.
- [met] `RailNoteList.test.ts:464-475` (Loading, then `[data-my-people-empty]`) and the registration test (`:202`) stay green. — `RailNoteList.test.ts` and `MyPeopleSection.test.ts` pass in my run.
- [met] Frontend gate: `pnpm check` and `pnpm vitest run` pass. — `pnpm check` exit 0 (234 files, 0 errors, 0 warnings); the targeted vitest files below pass. The full `pnpm vitest run` is deliver's to run.

## Checks run by the re-reviewer

- `pnpm check`: exit 0, 0 errors, 0 warnings.
- `pnpm vitest run` on `src/tests/lib/plugins/one-on-one/MyPeopleSection.test.ts`, `src/tests/lib/core/settings/OneOnOneSection.test.ts`, `src/tests/lib/plugins/one-on-one/one-on-one.logic.test.ts`, `src/tests/lib/features/rail-shell/RailNoteList.test.ts`, `src/tests/lib/architecture/layer-rules.test.ts`: exit 0, 5 files, 187 tests passed.
- No other test or e2e spec reads the open button's text (`grep` for `my-people-open` / `MyPeople` under `src/tests` and `e2e`), so the button's accessible name becoming "Ana Overdue" for overdue rows breaks no assertion. The `title="Open {row.name}"` tooltip is unchanged.
- The fix touches only the three files the fix report names plus `review.md`; no test was weakened or removed, no layer-baseline or composition-root change.

## Findings

None open or new.
