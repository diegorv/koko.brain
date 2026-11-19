# Discovery: Issue 07, non-text boundaries and focus states at 3:1

No `spec.md`; the Issue, `report.md` and `research/` (scout 19) are the spec. Gate set as in `work/02`-`04`: `BUILTIN_THEMES` + `src/tests/fixtures/hard-palette-themes.fixture.ts` (already exists, Issue 02).

## Files that change
- Builder `core/settings/theme-builder.logic.ts:105-155` `READABILITY_PAIRS`, 3:1: `ui.input` on `inputBg`, `settingItemBg`, `popover`; `ui.switchUncheckedBg` on `settingItemBg`; `preview.taskBorder` and `preview.hrBorder` and `preview.blockquoteBorder` on `editorBg`; `ui.ring` on `background`, `popover`, `editorBg`. `readableCore:186` also lifts `primary` to 3:1 on the four core surfaces, so `ring` (= primary) and every primary-derived token stay one color. `border` untouched.
- Focus (item 2): every `ring-ring/50` in `src/lib` (38 sites, list in `grep -rno 'ring-ring/[0-9]*' src/lib`) becomes `ring-ring`; shared `input.svelte:29,44`, `select-trigger.svelte:22`, `switch.svelte:18` also go `ring-[3px]` -> `ring-2` like Issue 20's Button. `scroll-area.svelte:32` viewport: inset `outline-ring` 2px instead of `ring-ring/10` + `outline-ring/50`. Live-preview buttons `styles.ts:775,981,1066`: `var(--ring)` box-shadow, 2px. Issue 20 (ux-quick-wins) covered only Button, dialog close and the app.css base outline.
- Controls (item 3): `switch.svelte:18` drop the shadowed `data-[state=unchecked]:bg-input`; `button.svelte:13` outline variant `border-input` in both modes; `scroll-area-scrollbar.svelte:29` thumb `bg-input hover:bg-muted-foreground`; `SearchPanel.svelte:334` and `TasksView.svelte:955` fields `border-input`; `FilterRow.svelte:102`, `input.svelte`, `styles.ts:234` are fixed by the token lift.
- Selected states (item 4): `SettingsPanel.svelte:137` active row gets an inset 2px `--ring` bar (`data-settings-active-bar`); `RailNoteList.svelte:974` filter on state `bg-file-explorer-accent` + a dot in `ring`; `TodoistSyncLogDialog.svelte:39` selected pill `outline` variant with `border-ring`; `KanbanWikilinkSuggestions.svelte:85` selected row inset ring bar; `ModActionPicker.svelte:118` and `UpdateSection.svelte:291` track gets a `border-input` edge; `CollectionLinearCalendarView.svelte:132` and `KanbanCard.svelte:311` swatches get a `border-input` edge; `EventBlock.svelte:79` `ring-primary` full; today in `EventMonthGrid.svelte:115`, `EventDayHeaders.svelte:43`, `EventWeekStrip.svelte:52` gets `font-semibold` + `ring-1 ring-primary` (navigator pattern, `CalendarGrid.svelte:59`). `CalendarGrid.svelte:68` dots already done by Issue 01.
- Editor (item 5): blockquote bar by the pair above; `editor-theme.ts:58` native selection also sets `color: var(--editor-fg)` so colored text keeps 4.5 on the tint.

## Tests
- `theme-builder.logic.test.ts`: new describe, the Issue's pairs (plus hr, blockquote) over `BUILTIN_THEMES` + `HARD_PALETTE_THEMES`; fails today (switch on Lavender Haze 1.12, task border on Bielefeld 1.50).
- `focus-ring-styles.test.ts`: scan of `src/lib` for `ring-ring/N` and `var(--ring) N%`, allow-list `{ file, reason }` whose entries must still match.
- New `src/tests/lib/components/ui/switch/switch.test.ts` (mount pattern of `dialog-content.test.ts`): off state carries `bg-switch-unchecked-bg` only, and that token is 3:1 on `settingItemBg` on the gate set. `SettingsPanel.test.ts`: active row has the bar, inactive rows do not; ring vs `settingsSidebarBg` 3:1.
- `button.test.ts` (outline edge), `editor-theme` and live-preview style tests where they pin the ring string, theme snapshot `-u` on purpose.

## Defaults taken
- `hrBorder` and `blockquoteBorder` paired at 3:1 as the Issue lists them; `border`/`divider` stay quiet.
- Selection: Zettlr Berlin Dark editor-fg on its selection (3.35) is a catalog palette, Issue 13.
- No E2E selector changes; `e2e/specs/focus-ring.spec.ts` now expects the full ring color, so that spec runs with the gate.

## Risks
- Lifted `input` darkens every `border-input` edge and the hr rule; full-strength focus rings are more visible (intended). Issues 05/06 rebase over the new pairs.

## Build decisions
- `switch.svelte`: `data-[state=unchecked]:bg-input` left in place: `cn` (tailwind-merge) already drops it for `bg-switch-unchecked-bg`; `switch.test.ts` pins the single off fill.
- Feature-site rings keep their `ring-[3px]` width; only the alpha went. Shared Input, Select, Switch match the Button's `ring-2`.
- Outline Button and Select trigger also drop `dark:bg-input/30` fills: the lifted `input` is an edge color and would grey them on dark themes.
- Settings bar and note list dots use `bg-primary` (lifted to 3:1 on the core surfaces); the Settings test measures it on the sidebar and the active row fill.
- Swatches use `border border-input` (the kanban selected state already owns `ring-2`). Progress tracks: `ring-1 ring-inset ring-input`, no fill.
- `FilterRow.svelte:102` and `styles.ts:234` needed no edit: their tokens are lifted.
