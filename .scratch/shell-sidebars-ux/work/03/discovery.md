# Discovery: Issue 03, My people setup button, "Nd ago", overdue icon, row ring

No `spec.md` exists for shell-sidebars-ux; the Issue is the spec. Same work-folder layout as `work/02`.

## Files that change

- `src/lib/plugins/one-on-one/one-on-one.logic.ts:238-241`: `myPeopleDaysLabel` returns `today` (0), `Nd ago`, `never`.
- `src/lib/plugins/one-on-one/MyPeopleSection.svelte`:
  - `:35-38` empty state: one muted button "Set up 1:1 tracking" inside `[data-my-people-empty]`, `onclick={() => settingsPanelStore.open('one-on-one')}` (precedent `SearchPanel.svelte:190`). `ONE_ON_ONE_EVERY_PROPERTY` import goes away.
  - `:41-46` row wrapper: inset ring on focus of the open button.
  - `:47-56` open button: `focus-visible:outline-none`.
  - `:57-64` days: when `row.overdue`, a `TriangleAlert` (`size-3 text-warning`, `aria-hidden`) and `<span class="sr-only">Overdue</span>` before the days span; its `text-warning`, `data-overdue` and title unchanged.
- `src/lib/core/settings/sections/OneOnOneSection.svelte:20-22`: one muted `<p>` under the heading naming `_one_on_one_every` and `settingsStore.oneOnOne.workPeopleFolder`.
- `help/documentation/09-quick-notes-and-templates.md:112` (labels), `:118` (the Issue's `:121`; setup button + Settings sentence), `:120` mentions the warning icon.
- Tests: `MyPeopleSection.test.ts` (`:109,118,155,173,188` strings, empty-state case `:191-198`, new icon + class cases), `one-on-one.logic.test.ts:517-523`, `OneOnOneSection.test.ts` (new sentence case).

## Plan

1. Failing logic test for the labels, then `myPeopleDaysLabel`; update section string assertions. Commit.
2. Failing section tests (setup button opens Settings via real `settingsPanelStore`, `_reset()` in `beforeEach`; overdue icon + "Overdue" on overdue/never rows only; ring and `focus-visible:outline-none` classes), then the component. Commit.
3. Failing `OneOnOneSection` sentence test, then the sentence. Commit.
4. Help. Commit.

## Prior art

- `MyPeopleSection.test.ts` itself (real stores, `mountSection`, `rowEl`, `days`).
- `SearchPanel.svelte:186-191` link-style button calling `settingsPanelStore.open`.
- `FilesNavigator.svelte:437` ring classes; `SettingItem.svelte:37` nested-bracket `has-[[data-...]]` variant.

## Risks

- Default taken: the row ring is scoped to the open button, `has-[[data-my-people-open]:focus-visible]:...`, not the Issue's literal `has-[button:focus-visible]`. With the literal selector a keyboard-focused New 1:1 would show the row ring plus its own UA outline (two indicators), against "The small New 1:1 button keeps one indicator of its own". Same ring classes, narrower trigger.
- jsdom has no `:focus-visible`; the unit test asserts classes only, as the Issue allows.
- The icon (`data-my-people-overdue`) and the `sr-only` "Overdue" sit just before `[data-my-people-days]`, not inside it, so that span's `textContent` stays the bare label and the existing assertions keep their form. `sr-only` is absolutely positioned, so it takes no flex gap.
- `RailNoteList.test.ts:464-475` checks only that `[data-my-people-empty]` exists; it stays.
