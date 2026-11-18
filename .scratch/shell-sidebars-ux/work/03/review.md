VERDICT: APPROVED

Review of `git diff main...HEAD` (3222974eb..9e5d3370f) in `brain.worktrees/issue-03-my-people-setup-ago-overdue`. No `spec.md` exists for shell-sidebars-ux, so the Issue is the spec.

## Acceptance criteria

- [met] Failing test first, `src/tests/lib/plugins/one-on-one/MyPeopleSection.test.ts` (real stores): with nobody tracked the text contains neither `_one_on_one_every` nor `Work/_people` (asserted today at `:195-196`) and a "Set up 1:1 tracking" button is inside `[data-my-people-empty]`; clicking it leaves the real `settingsPanelStore` (reset in `beforeEach`) with `isOpen` and `activeSection === 'one-on-one'`. — `MyPeopleSection.test.ts:193-210` asserts both negative texts, the button inside `[data-my-people-empty]`, `isOpen` false before and true after the click, and `activeSection === 'one-on-one'`; `settingsPanelStore._reset()` added to `beforeEach` (`:74`); the store is imported for real, not mocked. Against main's component (raw text, no button) this test cannot pass. Component: `MyPeopleSection.svelte:37-44`, `ONE_ON_ONE_EVERY_PROPERTY` import dropped.
- [met] Failing test first, `src/tests/lib/core/settings/OneOnOneSection.test.ts`: the page names `_one_on_one_every` and the configured work people folder. — `OneOnOneSection.test.ts:47-57` asserts `_one_on_one_every`, `Work/_people`, `My people`, the sentence sits above the first `h3`, and it follows `updateOneOnOne({ workPeopleFolder: 'Team' })` live. Component: `OneOnOneSection.svelte:22-24`, muted `text-sm text-muted-foreground` paragraph under the heading.
- [met] Failing test first, `src/tests/lib/plugins/one-on-one/one-on-one.logic.test.ts:517-523`: `0` is `today`, `1` is `1d ago`, `15` is `15d ago`, `null` is `never`; the section assertions at `MyPeopleSection.test.ts` `:109`, `:118`, `:155`, `:173`, `:188` follow the new strings. — `one-on-one.logic.test.ts:518-523` covers all four values; `one-on-one.logic.ts:239-242` implements them; section assertions now read `5d ago`/`never` (`:111-112`), `14d ago` (`:120`), `31d ago` (`:157`), `today` (`:175`), `never` (`:190`).
- [met] Overdue and `never` rows render the icon and "Overdue"; on-time rows neither; the theme-token test (`:129-135`) stays green. — `MyPeopleSection.test.ts:211-232`: Bruno (never) and Caio (31d, past 14) carry `[data-my-people-overdue]` with `aria-hidden="true"` and `text-warning` plus exactly one `.sr-only` "Overdue"; Ana (5d) has neither, and `data-overdue` is still `true`/`false` on the days span. The theme-token test (`:131-137`) passes and now also sees the icon (Ana there is `never`).
- [met] Class assertions for the row ring and `focus-visible:outline-none` (jsdom has no `:focus-visible`; `focus-ring.spec.ts:74-92` pins the pattern in a browser). — `MyPeopleSection.test.ts:235-249` asserts the three ring classes on the row, `focus-visible:outline-none` on the open button and none on New 1:1. I compiled the classes with the repo's `tailwindcss@4.3.5`: `has-[[data-my-people-open]:focus-visible]:ring-2` emits `.…:has(:is([data-my-people-open]:focus-visible))` with the ring box-shadow, so the narrowed selector is valid CSS (see finding 1 for the deviation from the Issue's literal selector).
- [met] `RailNoteList.test.ts:464-475` (Loading, then `[data-my-people-empty]`) and the registration test (`:202`) stay green. — `RailNoteList.test.ts` and `MyPeopleSection.test.ts` (registration case) pass in my run; `[data-my-people-empty]` is kept on the empty-state wrapper.
- [met] Frontend gate: `pnpm check` and `pnpm vitest run` pass. — `pnpm check` run by me: exit 0, 0 errors, 0 warnings. Targeted vitest files pass (below); the full `pnpm vitest run` is deliver's to run.

## Checks run by the reviewer

- `pnpm check`: exit 0, 234 files, 0 errors, 0 warnings.
- `pnpm vitest run` on `src/tests/lib/plugins/one-on-one/MyPeopleSection.test.ts`, `src/tests/lib/plugins/one-on-one/one-on-one.logic.test.ts`, `src/tests/lib/core/settings/OneOnOneSection.test.ts`, `src/tests/lib/features/rail-shell/RailNoteList.test.ts`, `src/tests/lib/features/rail-shell/rail-registry.store.test.ts`, `src/tests/lib/core/settings/settings-copy.test.ts`, `src/tests/lib/architecture/layer-rules.test.ts`: exit 0, 7 files, 210 tests passed.
- `pnpm vitest run src/tests/scripts/sync-wiki-docs.test.ts` (reads `help/documentation`): exit 0, 7 passed.
- Tailwind compile probe of the new row-ring and `focus-visible:outline-none` classes (repo `tailwindcss@4.3.5`): selectors generated as intended.
- `git diff main...HEAD --check`: clean. No e2e spec references My people, so `focus-visible:outline-none` on the open button breaks no browser test. No layer-baseline or composition-root change; `plugins/` importing `core/settings/settings-panel.store` is an allowed direction.

The test verdict rests on the seven vitest files and the wiki-docs test listed above.

## Findings

1. nit, `src/lib/plugins/one-on-one/MyPeopleSection.svelte:51`: the row ring triggers on `has-[[data-my-people-open]:focus-visible]` instead of the Issue's literal `has-[button:focus-visible]`. The narrowing is justified by "The small New 1:1 button keeps one indicator of its own" (with the literal selector a focused New 1:1 would draw both the row ring and its UA outline), it uses the same nested-bracket form as `SettingItem.svelte:37`, it compiles correctly, and it is recorded in `discovery.md`. No change needed; deliver should mention it in the squash body. Not seen in a real browser.
2. nit, `src/lib/core/settings/sections/OneOnOneSection.svelte:23`: the property name `_one_on_one_every` is hard-coded because `core/` may not import `ONE_ON_ONE_EVERY_PROPERTY` from `plugins/`; the test (`OneOnOneSection.test.ts:49`) also asserts the literal, so a rename of the constant would leave this sentence stale without a failing test. Fix (optional): in the test, import `ONE_ON_ONE_EVERY_PROPERTY` from `#lib/plugins/one-on-one/one-on-one.logic.js` and assert `toContain(ONE_ON_ONE_EVERY_PROPERTY)`.
3. nit, `src/lib/core/settings/sections/OneOnOneSection.svelte:23`: the `|| 'the work people folder'` fallback for an empty folder setting is untested. Fix (optional): one assertion after `updateOneOnOne({ workPeopleFolder: '' })`.
4. nit, `src/lib/plugins/one-on-one/MyPeopleSection.svelte:64-67`: the hidden "Overdue" text sits between the buttons, so a screen-reader user moving with Tab hears only "Ana" and "New 1:1"; the overdue state is announced only in browse mode. This meets the Issue's wording; if it matters later, put the "Overdue" `sr-only` span inside the open button instead.

## Resolution

1. Kept as is (no change requested): the row ring stays on `has-[[data-my-people-open]:focus-visible]` so New 1:1 keeps a single focus indicator; named in the squash body.
2. Fixed: `OneOnOneSection.test.ts` imports `ONE_ON_ONE_EVERY_PROPERTY` and asserts the intro contains it, so renaming the constant fails the test while the sentence still hard-codes the old name.
3. Fixed: `OneOnOneSection.test.ts` asserts the "the work people folder" fallback after `updateOneOnOne({ workPeopleFolder: '' })`.
4. Fixed: the `sr-only` "Overdue" moved inside the `[data-my-people-open]` button (`MyPeopleSection.svelte`), so Tab focus announces it; the icon stays outside as decoration. `MyPeopleSection.test.ts` asserts the hidden text sits inside the open button (failed before the move).
