# 07: Borders, inputs, switches, checkboxes and focus rings reach 3:1

**Origin:** color audit 2026-11-19 (`.scratch/color-audit/report.md`, cause D). Each finding below has its fg, bg, worst theme, measured ratio and validator fix in `.scratch/color-audit/research/workflow-result.json` (search by `file:line`); notes in `research/scout-*.md` and `research/validation-*.md`; resolved tokens of all 28 themes in `research/theme-tokens.json`.

**What to build:**

Meaningful non-text UI is under 3:1 on most themes: input and select borders, the off-state switch track (high), unchecked task checkboxes (high, 19 themes), focus rings at 50% alpha, the scrollbar thumb, outline buttons, selected states shown only by a faint fill.

1. **Builder tokens** (`theme-builder.logic.ts`): `input` (from `borderStrong`), `switchUncheckedBg`, `taskBorder` (from `faintFg`), `ring` and `hrBorder` reach 3:1 against the surfaces they sit on (`inputBg`, `settingItemBg`, `editorBg`, `popover`). Add these as 3:1 pairs. `border` stays a quiet divider unless it is the only edge of a control.
2. **Focus rings**: `ring-ring/50` with `outline-none` on rail, navigator and note rows (`Rail.svelte:382`, `FilesNavigator.svelte:348`) and the shared ui components become full `ring-ring`. Check with ux-quick-wins Issue 20 (resolved: "keyboard focus shows at full strength") which sites it already covered; do only the rest.
3. **Controls**: input and select (`components/ui/input/input.svelte:28,43`, `FilterRow.svelte:102`, `SearchPanel.svelte:334`, `TasksView.svelte:955`), switch (`switch.svelte:18`), outline buttons (`button.svelte:13`), scrollbar thumb (`scroll-area-scrollbar.svelte:29`), live-preview checkbox (`styles.ts:234`).
4. **Selected states**: Settings active section (`SettingsPanel.svelte:137`), note list toolbar on/off (`RailNoteList.svelte:974`), Todoist log filter pill, kanban wikilink suggestion row, mod run progress, update progress track, linear-calendar legend swatches, kanban colour swatches (`KanbanCard.svelte:311`), selected event ring, today markers that use hue only (`EventMonthGrid.svelte:115`), days navigator dots on the selected day (`CalendarGrid.svelte:68`): each gets a cue at 3:1.
5. **Editor**: blockquote bar (`styles.ts:219`) and the native selection background (`editor-theme.ts:58`).

Not in this ticket: graph view controls (Issue 11), canvas (Issue 09).

**Size:** L. Split point: items 1 and 3 (tokens and shared controls) first, items 2, 4 and 5 second.

**Blocked by:** none

**Status:** resolved

**Gate:** pnpm check + pnpm vitest run, plus bash scripts/e2e.sh <spec> only when a selector or E2E surface changes.

- [x] Failing test first, `theme-builder.logic.test.ts` over `BUILTIN_THEMES` and the hard palettes fixture: `input` on `inputBg`, `switchUncheckedBg` on `settingItemBg`, `taskBorder` on `editorBg`, `ring` on `background` and `popover` at 3:1. Fails today.
- [x] A source scan: no `ring-ring/` alpha in `src/lib` outside an allow-list with reasons.
- [x] Component tests for the switch off state and the Settings active section cue.
- [x] Snapshot updated on purpose; frontend gate passes.

## Sequence with

- Runs before 05 and 06 (owner order, 2026-11-19); the old "Blocked by 06" only kept builder edits serial. It adds its 3:1 pairs to `READABILITY_PAIRS` on its own; 05 and 06 rebase over it and keep them. The hard palettes fixture (`src/tests/fixtures/`) may not exist yet: create it here as Issue 05 describes.

## Findings covered

| Finding | Sev | Measured (worst) |
|---|---|---|
| `core/markdown-editor/extensions/live-preview/styles.ts:234` Unchecked task checkbox border is below 3:1 on 19 of 28 themes | high | --lp-task-border against editor-bg: 19/28 below 3:1 and 13/28 below 2:1. 1.50:1 on Zettlr Bielefeld Light, 1.61:1 on Twilight Violet, 1.69:1 on Lav... |
| `core/markdown-editor/extensions/live-preview/styles.ts:219` Blockquote left bar nearly invisible on Shimmering Focus themes | low | 1.34:1 on both Shimmering Focus themes, 2.79:1 on KokoBrain Default, and at least 3.28:1 elsewhere. |
| `core/markdown-editor/setup/editor-theme.ts:58` Native selection background is too close to colored text on some themes | low | Native selection (no drawSelection) flattened over editor-bg. editor-fg: 1/28 fail (3.35:1 on Zettlr Berlin Dark). lp-link and wikilink: 21/28 belo... |
| `features/collection/CollectionLinearCalendarView.svelte:132` Linear-calendar legend swatches vanish against the card | low | Swatch fill (barColors().fill) against --card is 1.25 to 1.53 on all 15 light themes (Lavender Haze 1.25 worst) and at least 2.62 on dark themes. 1... |
| `features/collection/toolbar/FilterRow.svelte:102` Toolbar input and select borders (--input) are nearly invisible against the popover | medium | --input border vs --popover: 1.06 Sakura, 1.24 KokoBrain Default, 1.49 Graphite Violet, 1.51 Lavender Haze, 1.67 Zettlr light x5, 1.81 Zettlr dark ... |
| `features/event-calendar/EventMonthGrid.svelte:115` Today is marked by hue only in the event calendar month grid, day headers and week strip | low | primary vs editor-fg (the neighbouring day numbers) is under 3:1 on 26/28 themes: Zettlr Bordeaux Dark 1.08, Deep Ocean 1.22, SF Dark 1.32 |
| `features/rail-shell/Rail.svelte:382` Focus ring ring-ring/50 on rail, navigator and note rows is under 3:1 on most themes | medium | ring at 50% fails 3:1 on 24/28 themes (all light, 9 dark) on rail, nav, list and tab-bar: 1.80 on Zettlr Bielefeld Light rail, KokoBrain Default 2.... |
| `features/rail-shell/RailNoteList.svelte:974` Note list toolbar on/off state is shown only by a text-color change under 3:1 between states | low | tab-text-active against tab-text-inactive is 1.25 (Shimmering Focus Dark) to 2.74 on all 28 themes. KokoBrain Default 1.45, Lavender Haze 1.64. Eac... |
| `plugins/mods/ModActionPicker.svelte:126` Mod run progress fill vs track under 3:1 on three dark themes | low | primary fill vs muted track over popover 2.58 Zettlr Frankfurt Dark, 2.60 Karl-Marx-Stadt Dark, 2.96 Berlin Dark |
| `app/SettingsPanel.svelte:137` Settings sidebar active section has almost no background cue (hover-bg ~ sidebar-bg), only font-medium | medium | settings-hover-bg vs settings-sidebar-bg 1.00 Shimmering Focus Light (both #eff0f5), 1.04 Willemstad Dark, 1.06 Cool Mist and Willemstad Light, 1.0... |
| `components/ui/scroll-area/scroll-area-scrollbar.svelte:29` Custom scrollbar thumb is a 30% muted-foreground tint, far under 3:1 on every surface | low | muted-fg at 30% vs surface 1.44 Zettlr Bielefeld Light (list-bg), 1.46 Sakura (popover), 1.64 KokoBrain Default, 1.49 Lavender Haze; at 50% (hover)... |
| `features/rail-shell/FilesNavigator.svelte:348` Focus indicator is only a 50% alpha ring (ring-ring/50) with outline-none on rows, icon buttons, tabs and live-preview buttons | medium | ring/50 vs surface: rail 24/28 under 3:1 (Zettlr Bielefeld Light 1.80, Willemstad Dark 1.93), editor 24/28 (KokoBrain Default 2.52, Lavender Haze 2... |
| `features/search/SearchPanel.svelte:334` Search panel field and other border-border fields have no visible boundary | medium | file-explorer-border vs list-bg 28/28 under 3:1 (KokoBrain Default 1.02, Twilight Violet 1.10, best 2.07 Zettlr KMS Dark); field fill bg-background... |
| `features/event-calendar/EventBlock.svelte:79` Selected event ring is under 3:1 against the editor surface | low | ring-2 ring-primary/70 against editor-bg is under 3:1 on 10 themes: Bielefeld Light 2.69, Shimmering Focus Light 2.75, Willemstad Dark 2.75, Berlin... |
| `components/ui/input/input.svelte:28` Input and Select borders are indistinguishable from the surface they sit on | medium | border-input against setting-item-bg: Sakura 1.06, Lavender Haze 1.08, KokoBrain Default 1.09, Tolaria Light 1.31, Twilight Violet 1.38. Against po... |
| `plugins/kanban/KanbanCard.svelte:311` Card and tag colour swatches in the context menu fail 3:1 on light themes (colour is the only label) | low | COLOR_PRESET_TEXT swatch fill against popover: yellow 1.47 Sakura and 1.79-1.92 on the other 14 light themes; green 1.86-2.43, orange 1.96-2.55 and... |
| `plugins/kanban/KanbanWikilinkSuggestions.svelte:85` Selected wikilink suggestion row is indistinguishable from the list on Zettlr dark themes | medium | bg-accent against bg-popover: 1.00 on the 5 Zettlr dark themes (accent #282832 == popover), 1.01 Willemstad Dark, 1.06 Sakura, 1.12 Tolaria Light, ... |
| `core/settings/sections/UpdateSection.svelte:291` Update download progress track is invisible and fill drops under 3:1 on some themes | low | bg-muted track vs setting-item-bg is under 3 on 28/28 (1.00 Shimmering Focus Light, 1.09 KokoBrain Default, 2.07 Zettlr dark max). The primary fill... |
| `components/ui/button/button.svelte:13` Outline buttons and Select triggers have no visible edge on a Settings row | low | Outline border (border in light, input under .dark) vs setting-item-bg is under 3 on 28/28: 1.06 Sakura, 1.08 Lavender Haze, 1.09 KokoBrain Default... |
| `core/settings/theme-builder.logic.ts:273` Editor task checkbox: unchecked border nearly invisible on 19 themes | high | lp-task-border vs editor-bg is under 3 on 19/28: 1.50 Zettlr Bielefeld Light, 1.61 Sakura and Twilight Violet, 1.67 Zettlr light, 1.69 Lavender Haz... |
| `features/tasks/TasksView.svelte:955` Tasks filter box border is nearly invisible | low | The --border edge of the filter input vs editor-bg is under 3 on 28/28: 1.09 KokoBrain Default, 1.22 Tolaria Light, 1.34 Lavender Haze, best 1.86 W... |
| `components/ui/input/input.svelte:43` Form control boundaries (input border, checkbox) are far below 3:1 | medium | Input border (border-input = borderStrong) vs setting-item-bg is under 3:1 on 26/28 themes (1.06 Sakura, 1.08 Lavender Haze, 1.09 KokoBrain Default... |
| `components/ui/switch/switch.svelte:18` Off-state switch track is nearly invisible against Settings rows | high | The off track (switch-unchecked-bg = borderStrong) vs setting-item-bg is under 3:1 on 26/28 themes (1.06 Sakura, 1.12 Lavender Haze, 1.74 KokoBrain... |
| `features/todoist-sync/TodoistSyncLogDialog.svelte:39` Sync log filter: selected pill shown only by a secondary fill invisible on popover | low | 1.00:1 Willemstad Dark, 1.02 Graphite Violet, 1.04 Deep Ocean and Ink Night, 1.24 KokoBrain Default, 1.51 Lavender Haze, best 1.81 Zettlr dark |

## Comments

- 2026-11-19, triage: ready-for-agent. Decided by the owner: builder lifts tokens for every theme (WCAG + APCA), user themes are corrected by the builder and the editor warns, rail icons keep their hue and are darkened per theme (ADR-0033 amendment), Issues run through relay one at a time, the themes repo is fixed with version bumps.
- 2026-11-19, deliver (branch issue/07-non-text-boundaries-focus-states): theme builder lifts control edges, switch off track, task/hr/blockquote borders and the focus ring to 3:1; every focus ring at full strength (source scan guards it); 3:1 cues for settings active section, note list toggles, filter pills, calendar selected/today, swatches and progress tracks; editor selection text color. Fix round: `input` also paired on `fileExplorerBg` and `editorBg`, legacy round-trip asserts ring and blockquote. Tests: pnpm check 0 errors; full suite at d3d509d57 exit 0 (684 files, 18263 passed, 56 skipped). Review round 1 APPROVED (3 findings: 1 fixed, 2 noted/partly fixed), round 2 APPROVED (no findings).
