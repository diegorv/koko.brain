# 03: My people reads as a feature: setup button, "Nd ago", overdue icon, row ring

**Origin:** design review 2026-11-17, proposal P120 (`.scratch/design-review/review.md`), prototype `.scratch/design-review/prototypes/note-list-rail.html` (section `#p120`), research `.scratch/shell-sidebars-ux/research/verdict-nl-rows-sections.md` and `breakdown.md` (old ticket 08).

**What to build:** in `src/lib/plugins/one-on-one/MyPeopleSection.svelte`, `one-on-one.logic.ts` and `src/lib/core/settings/sections/OneOnOneSection.svelte`:

1. **Setup button.** With nobody tracked, My people shows one muted "Set up 1:1 tracking" button that opens Settings on the one-on-one page (`settingsPanelStore.open('one-on-one')`, precedent `src/lib/features/search/SearchPanel.svelte:190`), instead of naming the property and the folder in the rail (`MyPeopleSection.svelte:35-38`). `data-my-people-empty` stays.
2. **Settings sentence.** The one-on-one Settings page gains one muted sentence at the top: a person in the work people folder is listed in My people when their note sets `_one_on_one_every`.
3. **Labels.** `myPeopleDaysLabel` (`one-on-one.logic.ts:239-241`) returns `today` for 0 days, `Nd ago` otherwise and `never` for none. The hover title (`MyPeopleSection.svelte:59`) stays.
4. **Overdue icon.** Overdue rows (including `never`) get a `TriangleAlert` icon in `text-warning`, `aria-hidden`, plus visually hidden "Overdue" text. `data-overdue` is unchanged.
5. **One focus indicator.** The row wrapper (`:41-46`) gets the inset ring other rail rows use (`has-[button:focus-visible]:ring-2 has-[button:focus-visible]:ring-ring/50 has-[button:focus-visible]:ring-inset`, `src/lib/features/rail-shell/FilesNavigator.svelte:437`) and the open button (`:47-56`) gets `focus-visible:outline-none`. The small New 1:1 button keeps one indicator of its own.
6. **Help.** `help/documentation/09-quick-notes-and-templates.md:112` quotes the new labels; `:121` describes the setup button and the Settings sentence.

Not in this ticket: hiding the section when nobody is tracked (needs a visibility field on `RailTodaySection` and edits to the shared `RailNoteList.svelte`). The review's premise that the rows have no focus style is false at HEAD (`src/app.css:495`, pinned by `e2e/specs/focus-ring.spec.ts:38-58`), so item 5 is only a consistency change.

**Blocked by:** none

**Status:** resolved

**Gate:** `pnpm check` + `pnpm vitest run`

- [x] Failing test first, `src/tests/lib/plugins/one-on-one/MyPeopleSection.test.ts` (real stores): with nobody tracked the text contains neither `_one_on_one_every` nor `Work/_people` (asserted today at `:195-196`) and a "Set up 1:1 tracking" button is inside `[data-my-people-empty]`; clicking it leaves the real `settingsPanelStore` (reset in `beforeEach`) with `isOpen` and `activeSection === 'one-on-one'`.
- [x] Failing test first, `src/tests/lib/core/settings/OneOnOneSection.test.ts`: the page names `_one_on_one_every` and the configured work people folder.
- [x] Failing test first, `src/tests/lib/plugins/one-on-one/one-on-one.logic.test.ts:517-523`: `0` is `today`, `1` is `1d ago`, `15` is `15d ago`, `null` is `never`; the section assertions at `MyPeopleSection.test.ts` `:109`, `:118`, `:155`, `:173`, `:188` follow the new strings.
- [x] Overdue and `never` rows render the icon and "Overdue"; on-time rows neither; the theme-token test (`:129-135`) stays green.
- [x] Class assertions for the row ring and `focus-visible:outline-none` (jsdom has no `:focus-visible`; `focus-ring.spec.ts:74-92` pins the pattern in a browser).
- [x] `RailNoteList.test.ts:464-475` (Loading, then `[data-my-people-empty]`) and the registration test (`:202`) stay green.
- [x] Frontend gate: `pnpm check` and `pnpm vitest run` pass.

## Original proposal

- **P120.** The "My people" section: raw empty state, ambiguous labels, overdue by colour only. The empty state prints "_one_on_one_every" and a folder path; "3d" has no context. Hide the section, or show one muted "Set up 1:1 tracking" line that links to Settings. Label days "3d ago" / "never", add an overdue icon and add focus rings. Validation: revise.

## Problem

An empty My people section prints a property name and a folder path in the Today list, which reads like a bug. A bare "3d" does not say what it counts, and an overdue person is marked by colour alone.

## Evidence

Checked at `ab143a411`.

- `MyPeopleSection.svelte:35-38`: the raw empty text; `:57-64` the days label, `text-warning` only; `:41-46`, `:47-56` row wrapper and open button; `:65-74` New 1:1 button. The file is 77 lines.
- `one-on-one.logic.ts:239-241`: `myPeopleDaysLabel` returns `Nd` or `never`.
- `src/lib/features/rail-shell/FilesNavigator.svelte:435-438` and `src/lib/features/note-list/NoteRow.svelte:70`: the inset ring pattern.
- `OneOnOneSection.svelte:20-24`: heading, then the People group; no sentence about the property.
- `src/app.css:495`: `* { @apply border-border outline-ring/50 }` already draws a UA outline on `:focus-visible`.
- Uses `buildMyPeople` from vault-organization-v2 02 (resolved).

## Sequence with

None on shared lines. Compatible with ticket 19: its roving keys keep the Today sections in the normal tab order. Help `09-quick-notes-and-templates.md` is edited only here.

## Comments

- 2026-11-17, triage: ready-for-agent. Decided by the owner: the consolidated 34-ticket numbering and granularity. Defaults (not individually answered): 03.1 with nobody tracked, show the setup button rather than hiding My people; 03.2 a 1:1 held today reads `today`, not `0d ago`.
- 2026-11-18, deliver (branch `issue/03-my-people-setup-ago-overdue`): My people shows a "Set up 1:1 tracking" button when nobody is tracked, "today"/"Nd ago" labels, an Overdue icon with sr-only text inside the open button, and a row focus ring; the 1:1 settings page explains how people are picked. Review round 1 APPROVED (findings fixed: Overdue text moved into the open button, OneOnOneSection tests pin the property constant and the folder fallback); round 2 APPROVED with no findings. Tests: pnpm check 0 errors; full suite at 816708f2a passed (647 files, 17131 tests).
