# 21: Settings number fields write only valid values and clamp on commit

**Origin:** design review 2026-11-17, proposal P54 (`.scratch/design-review/review.md`), prototype `.scratch/design-review/prototypes/settings-auto-organize.html` (section `P54`), research `.scratch/ux-quick-wins/research/verdict-settings-a.md` and `breakdown.md` (old ticket 02). Absorbs open-itens 201 (`.scratch/open-itens/issues/201-retention-days-debounce-delay-accept-typed-values.md`, already marked wontfix with a pointer here).

**What to build:**

1. **Editor fields** (font size 8-32, line height 1-3, paragraph spacing 0-2, content width 0 or 400-2000): `oninput` writes only a finite value inside the field's range; any other typed value writes nothing. `onchange` clamps with the existing `clampFontSize`, `clampLineHeight`, `clampParagraphSpacing` and `clampContentWidth`, writes the result and sets the field to the stored value (`e.currentTarget.value`, because Svelte skips the DOM write when the bound value did not change). An empty or non-numeric commit writes nothing and restores the field. Handlers at `src/lib/core/settings/sections/EditorSection.svelte:98-104`, `:119-125`, `:140-146`, `:163-169`.
2. **Auto Organize debounce** (500-30000 ms, shown in seconds): same rule. `oninput` today clamps and writes on every keystroke (`src/lib/features/auto-organize/AutoOrganizeSection.svelte:134-138`); it gets the in-range check, plus an `onchange` that clamps with the local `clampDebounce` (`:29-31`). Touch the debounce block only.
3. **Retention days** (1-365): no write on input at all, because the value feeds `cleanup_history` at vault open and deletes snapshots (`src/lib/app/lifecycle/app-lifecycle.service.ts:296-298`). `onchange` clamps to 1-365, writes and restores the field on an empty commit. Today clearing the field persists 1 (`src/lib/core/settings/sections/FileHistorySection.svelte:38-41`), so the next vault open keeps one day of snapshots.
4. **Live typing note.** Editor fields keep their live preview, but a two-digit font size now previews only once the typed value is in range: typing `2` then `4` writes nothing for `2` (below 8) and 24 for `24`. This is the intended contract. `min`, `max`, `step` and copy stay unchanged.
5. No edit to `settings.logic.ts` or `SettingsPanel.svelte` (both are changed on the mvp-claude branch): the `clamp*` exports are reused read-only and the range checks stay local to each section.

Not in this ticket: `HeadingTypographyEditor.svelte`, `OneOnOneSection.svelte` and `EventCalendarSection.svelte` number fields (not in P54's evidence); help docs (`help/documentation/19-settings.md` is changed on mvp-claude).

**Size:** S.

**Blocked by:** none

**Status:** resolved

**Gate:** `pnpm check` + `pnpm vitest run`

- [x] Failing test first (real `settingsStore`, in `src/tests/lib/core/settings/EditorSection.test.ts`): from the stored font size, typing `''` or `'1'` leaves the store unchanged; typing `'14'` stores 14; committing `'999'` stores 32 and shows `32`; committing `''` keeps the store and restores the field. Content width: typing `'5'` leaves the store, committing it stores 400; `0` and `800` store. Line height and paragraph spacing follow the same pattern with their bounds.
- [x] Failing test first, new `src/tests/lib/core/settings/FileHistorySection.test.ts`: retention days from 7: typing `''`, `'1'` or `'30'` leaves 7; committing `'30'` stores 30; committing `'400'` stores 365 and shows `365`; committing `''` keeps 30.
- [x] Failing test first, `src/tests/lib/features/auto-organize/AutoOrganizeSection.test.ts`: debounce from 3000: typing `''` or `'0'` leaves 3000; `'2'` stores 2000; `'45'` leaves 2000 and committing it stores 30000.
- [x] `EditorSection.test.ts:84-130` (the "raw while typing is deliberate" assertions: 999, 1, 9, 50 and 9 stored before the commit) are rewritten to the new contract on purpose; say in the commit that the review approved the change. The commit-clamp assertions and the heading typography tests (`:132-155`) stay unchanged.
- [x] No test mocks `settingsStore` or `settings.logic.ts`; only the Tauri font-list call stays mocked, as in `EditorSection.test.ts:8-10`.
- [x] Frontend gate: `pnpm check` and `pnpm vitest run` pass.

## Original proposal

- **P54.** Number fields apply unclamped values on every keystroke. Clearing a field writes 0 (font size 0, or no width limit), and the debounce field snaps while typing. Write on input only when the value is finite and in range, and clamp on change. Move the debounce clamp to change. Validation: revise (Retention days writes on commit only, because it feeds `cleanup_history`).
- **open-itens 201.** Retention days and Debounce delay accept typed values and clamp on commit. Same scope; its "no other number field changes" criterion is not carried, because this ticket also covers the Editor fields.

## Problem

Clearing Retention days to type a new number persists 1 at once, and `cleanup_history` at the next vault open then deletes snapshots older than one day. Clearing Font size writes 0, so the editor jumps while the person types. The Debounce field snaps to 500 ms the moment it is emptied, so typing `30` ends as `130`.

## Evidence

Checked at `085b23c5d`.

- `src/lib/core/settings/sections/EditorSection.svelte:98-100,119-121,140-142,163-165`: `oninput` writes `Number(inputValue(e))` with no range check; the `onchange` clamps already exist at `:101-104,:122-125,:143-146,:166-169`.
- `src/lib/features/auto-organize/AutoOrganizeSection.svelte:134-138`: clamps and writes on input, no `onchange`. `src/lib/core/settings/sections/FileHistorySection.svelte:38-41`: same for retention days.
- `src/lib/app/lifecycle/app-lifecycle.service.ts:296-298`: `cleanup_history` receives `settingsStore.history.retentionDays`.
- `src/lib/core/settings/settings.logic.ts:67-90`: `clampFontSize`, `clampLineHeight`, `clampContentWidth`, `clampParagraphSpacing` exist and are exported.
- `src/tests/lib/core/settings/EditorSection.test.ts:84-130`: raw-while-typing assertions. No `FileHistorySection.test.ts` exists.

## Sequence with

Ticket 31 edits the rest of `AutoOrganizeSection.svelte` and `AutoOrganizeSection.test.ts` (it is blocked by this ticket, so the debounce block lands first). Ticket 22 edits other settings sections and their tests; no shared file.

## Comments

- 2026-11-18, triage: ready-for-agent. Decided by the owner: the order and grouping. Defaults (not individually answered): this ticket had no owner question in the old breakdown.
- 2026-11-18, delivered from `issue/21-settings-number-fields-write-only-valid`: editor number fields (font size, content width, line height, paragraph spacing), file history retention days and auto-organize debounce write only in-range values while typing and clamp on commit; blank or partial input restores the field. Review fix: the content width clamp test starts from a stored 800. Tests: `pnpm check` exit 0; full suite at 876b47043: 660 files, 17620 passed, 56 skipped, 1 todo, exit 0. Reviews: round 1 APPROVED, round 2 APPROVED.
