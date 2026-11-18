# Lens review: typography, color, dark mode and density

Scope: cross-app patterns only. Area reviews already cover the local cases (callout styling, meta-bind controls, kanban dual color systems, toast theming, control-boundary contrast, error-text contrast, token hygiene for `text-[11px]`). Each finding below is a pattern that spans several areas, with every offender cited.

Evidence: code read under `src/`, contrast computed with the WCAG 2.x formula from the literal theme values in `src/lib/core/settings/theme.logic.ts` (the builder lifts some of them, noted where it matters), and the screenshots in `.scratch/design-review/screens/` (1440x900, test vault at 15px MonoLisa, `contentWidth` 0). Screenshot pixel samples are color-managed, so hues are quoted from code, not from pixels.

## Clear

### 1. The note measure swings from about 25 to over 140 characters, and the width toggle does nothing on default settings
Category: layout-density. Effort: S.

- Default `contentWidth: 0` (no limit) in `settings.store.svelte.ts:84`; the setting is in pixels (`settings.types.ts:158-159`, Settings > Editor "Maximum content width in pixels (0 = no limit)", settings-editor-light.png).
- `.cm-content` padding is `clamp(24px, 5vw, 80px)` on each side and `maxWidth` only applies when `contentWidth > 0` (`setup/editor-theme.ts:39-45`).
- Measured from screenshots at 15px MonoLisa: about 50 characters per line at 1440 with three columns open (editor-live-preview-light.png, text 658 to 1118 px), about 25 at 1024 (narrow-1024x700-editor-light.png, "This plan ties together the"), and roughly 140 when the side columns are collapsed at 1440. Comfortable reading is 60 to 75.
- `effectiveContentWidth` returns `wideNotes ? 0 : contentWidth` (`settings.logic.ts:83-85`). With `contentWidth` 0 both branches return 0, so the action-bar "Use the full note width" toggle (`NoteActionBar.svelte:92-97`, `note-action-bar.service.ts:15-17`) flips a flag and changes nothing on screen.
- A pixel width does not scale with the font size: 700 px is 61 characters at 19px iA Writer Duo and 80 at 15px MonoLisa.

Proposal: express the measure in `ch` (Settings: "Line length", default 72 characters, slider 50 to 120, plus "No limit"), apply it as `max-width` on `.cm-content` so it follows font size, and make the side padding shrink toward 24px when the column is narrower than the measure plus padding (container query on the editor pane, not `vw`). With a default measure in place the wide-notes toggle becomes meaningful; until then hide it when the measure is "No limit".

Impact: every note the owner reads or writes; today the line length depends on which panes happen to be open.

### 2. One accent color does seven jobs, and emphasis shares the link hue
Category: color-theming. Effort: M.

`buildTheme` routes the single `primary` into: focus ring (`ring`), selected rows (`fileExplorerPrimary`), right-sidebar panel titles (`rightSidebarPrimary`), wikilinks and their targets, task checkbox fill and hover, ordered-list markers, footnotes and embed headers (`theme-builder.logic.ts:232-283`). Components add more on top:
- Panel titles in accent: `SidebarSection.svelte:46`, `NoteInfo.svelte:44`, `TagsView.svelte:51`.
- Active note row: `bg-primary/25` plus `text-primary` title (`NoteRow.svelte:70`, `:89`); type chip `text-primary/80` on `bg-primary/10` (`NoteRow.svelte:103`, `:114`, `:124`).
- Mini calendar: primary means weekend, today and selected at once (`plugins/calendar/CalendarGrid.svelte:56-59`).
- Lavender Haze sets `heading: '#6848A8'` and `primary: '#6848A8'` (`theme.logic.ts:236`, `:247`): headings and the accent are the same color, and wikilinks are `#7848B8` (`:303`), so in the light theme a heading, a link, a tag, a selected row and a section title are all one purple (editor-live-preview-light.png).
- `strong` and `emphasis` both derive from `inlineFg` (`theme-builder.logic.ts:262`). In KokoBrain Default `inlineFg` is `#93c5fd` and `linkFg` is `#60a5fa` (`theme.logic.ts:136-138`): bold text and Markdown links are both light blue, told apart only by underline (editor-live-preview-dark.png, bold "roadmap" next to the "the roadmap" link).

Proposal: give each role its own token and reserve the accent for "interactive or selected":
- Panel and section titles use foreground, not accent.
- Headings get their own ramp derived from foreground with a hue shift, never equal to primary. The builder can refuse `heading == primary` with a ΔE check.
- Bold and italic default to `editorFg` and carry meaning only through weight and style. A theme may still color them, but the builder keeps that color at a ΔE distance from `link` and `wikilink`.
- Weekends in the mini calendar use muted text. Primary stays for selected, and today gets an outline.

Impact: in the editor a link is the only colored, underlined thing, so a link is recognisable at a glance. In the chrome, purple again means "you are here".

## Moderate

### 3. "Selected" has eight visual treatments
Category: consistency. Effort: M.

- Rail item: 18% tint of the item's own hue, which is different per item (`Rail.svelte:359-361`): orange for Today, teal for Files, blue for Inbox.
- Folder row: `bg-file-explorer-primary/25` plus primary text (`FilesNavigator.svelte:293-298`).
- Note row: `bg-primary/25` plus primary title (`NoteRow.svelte:70`, `:89`).
- Kanban view switch: `bg-primary/10 text-primary` (`KanbanView.svelte:465`).
- Collection view tabs: `bg-primary/15 text-foreground font-medium` (`CollectionView.svelte:535`).
- Calendar D/W/M: `bg-muted text-foreground` (`EventCalendarHeader.svelte:116-117`).
- Search Text/Semantic/Hybrid: `bg-background shadow-sm` (`SearchPanel.svelte:88`).
- Theme editor tabs: 2px primary underline (`ThemeEditor.svelte:176-180`). Todoist log filter: `secondary` button (`TodoistSyncLogDialog.svelte:39`).
- landing-today-light.png shows an orange-tinted Today next to a lavender note row. files-note-list-light.png shows teal Files, a lavender folder and a lavender note: three "current" colors at once.

Proposal: two tokens. `--selected-bg` with `--selected-fg` mark the current item in a list, with the same fill everywhere and a neutral foreground. `--segment-active` is a raised surface for segmented controls. Rail items keep their hue on the icon only, and the active row uses `--selected-bg`. Build the segmented control once (foundation review #7 already asks for the primitive) and make it carry this token.

Impact: the owner moves between rail, folder, list, Kanban, Tasks and Calendar all day, so one "you are here" signal is learned once.

### 4. Faded text undoes the contrast lift
Category: accessibility. Effort: S.

`READABILITY_PAIRS` lifts muted text to 4.5:1 (`theme-builder.logic.ts:105-150`), and then 28 class strings in 21 files fade it again with an alpha suffix. Computed against the editor background:
- `text-muted-foreground/60` is 2.5:1 (Lavender) and 2.4:1 (Default), for example the results count in `CollectionView.svelte:587`.
- `/40` is 1.8:1, used for out-of-month days in `CalendarGrid.svelte:58` and `CollectionCalendarView.svelte:144`.
- `text-file-explorer-fg/60` on search snippets (`SearchResult.svelte:166`).
- Property values `!text-right-sidebar-fg/70` (`PropertyField.svelte:131`, `:139`). The value, which is the data, reads lighter than full-strength text.
- The note row type chip `text-[11px] text-primary/80` on `bg-primary/10` is 3.6:1 at 11px in Lavender (`NoteRow.svelte:103`).
- Placeholders `/50` and `/30` (`TasksView.svelte:921`, `PropertyField.svelte:191`, three more).
- Icon-only and decorative cases (`KanbanDatePicker.svelte:67`, `:79`; `FormulaRow.svelte:81`, `:87`; `PropertiesPanel.svelte:134`, `:141`; `SortPanel.svelte:90`) are less severe but follow the same pattern.

Proposal: add a third text tier, `--faint-fg`, which the palette already has as `faintFg`. Lift it to 3:1 for placeholders, disabled items and out-of-range days. Replace every `text-*/NN` on text with `muted` or `faint`. Add a lint test, next to the layer-rules test, that fails a new `text-(foreground|muted-foreground|*-fg|primary)/NN`.

Impact: the 11-12px metadata the owner scans most (counts, chips, snippets, property values) becomes readable in both themes.

### 5. Date urgency means five different things
Category: consistency. Effort: M.

- Kanban: overdue gets a red badge and a 4px red bar, today gets the warning color, tomorrow orange and upcoming blue (`kanban.logic.ts:712-719`). The date is ISO "2026-11-12" (kanban-board-dark.png).
- Tasks: overdue turns only the 12px calendar icon red, and the label stays foreground (`TasksView.svelte:872-874`). The date is "Nov 12" (tasks-all-open-dark.png).
- 1:1 people: overdue uses `text-warning`, yellow and not red (`MyPeopleSection.svelte:58`).
- Editor and event calendar: no overdue treatment at all. The editor prints the raw `📅 2026-11-05` (landing-today-light.png, "Overdue follow-up"). No "overdue" exists in `features/event-calendar/` or `live-preview/styles.ts`.
- Properties: "01/12/2026", which is ambiguous between D/M and M/D (editor-live-preview-light.png; review-properties #14).

Proposal: one pure `dateTone(date, today)` in `utils/` (Kanban's `getDateProximity` already is that) and one `DateChip` with a single format ("Today", "Tomorrow", "Nov 12", plus the year only when it differs). Overdue is always destructive with an alert glyph, so it is not color-only. Today uses warning, and anything later is neutral. Use it in Tasks, Kanban, 1:1, calendar task chips and, as a live-preview decoration, on the `📅` date in the editor.

Impact: overdue work looks the same wherever it appears. Today the owner reads it as red in Kanban, yellow in 1:1 and as nothing at all in the daily note.

### 6. Pane titles use four styles, and Properties nests two levels of the same uppercase label
Category: typography. Effort: S.

- `text-title` foreground: `TasksView.svelte:906`, `RailNoteList.svelte:723`.
- `text-title text-tab-text-active`: `FilesNavigator.svelte:309`, `TypesNavigator.svelte:221`.
- `text-title text-right-sidebar-primary` (accent): `SidebarSection.svelte:46`, `NoteInfo.svelte:44`.
- `text-sm font-semibold text-primary` (14px accent): `TagsView.svelte:51`.
- `text-base font-semibold` (16px): `EventCalendarHeader.svelte:38`.
- No title at all: Kanban and Collection toolbars (`KanbanView.svelte:462`, `CollectionView.svelte` pane-toolbar).
- `app.css:133-142` documents `section-label` as "The one uppercase section label inside a panel". Properties uses it for "Relationships" and again for each child "Belongs To / Related To / Has Many" (`PropertiesView.svelte:245`, `:250`). That gives two hierarchy levels drawn identically (right-sidebar-default-light.png), with Title Case labels in source (`PropertiesView.svelte:54`).

Proposal: one `PaneTitle` (15/600, foreground). A view toolbar with no title shows the file name in it. In Properties, keep "Relationships" as the section label and render the three children as 13px sentence-case row labels ("Belongs to").

Impact: the same level of chrome looks the same in every view, and accent color is freed for state (finding 2).

### 7. One 40px toolbar band holds controls at five heights
Category: layout-density. Effort: M.

`pane-toolbar` fixes the band at h-10 (`app.css:151-153`), but the controls inside it vary:
- About 20px Collection view tabs (`CollectionView.svelte:535`, `text-xs py-0.5`).
- About 22px Kanban view switch and native select (`KanbanView.svelte:465`, `:489`, `:501`).
- 24px Tasks search and Display (`TasksView.svelte:921` and the next control).
- 28px note action bar and Tags (`NoteActionBar.svelte:115-116` `size-7`, `TagsView.svelte` `p-1.5`).
- 32px Calendar "Today" and arrows (`EventCalendarHeader.svelte` `Button size="sm"` and `icon-sm`), next to a 22px D/W/M switch in the same header (`:116`).

Text inside is `text-xs` in some controls and `text-row` in others. Compare calendar-week-light.png with kanban-board-light.png.

Proposal: one toolbar control size, 28px high with 12px `text-meta` labels and 16px icons, exposed as a `toolbar` size on Button, IconButton and Input and used by the segmented control. Align every toolbar's first control to the 12px gutter.

Impact: switching between Tasks, Kanban and Calendar tabs no longer changes the scale of the chrome, and hit targets stop dropping to 20px.

### 8. Headings sit closer to the text above than to their own content
Category: typography. Effort: S.

`.cm-lp-h1` to `.cm-lp-h6` set size, weight, line height and color but no space above (`live-preview/styles.ts:171-212`). The only space is the blank line the author typed, which the paragraph spacing applies equally above and below (`editor-theme.ts:47-50`). In editor-live-preview-scrolled-light.png "Code" is about 54px below the last task and about 70px above its code block, and "Metrics" is about 69px below the code block and about 64px above its table. Each heading floats between sections instead of leading its own.

Proposal: `padding-top` on heading lines, scaled by level (about 1.2em for H1-H2, 0.8em for H3, 0.5em for H4-H6), applied as padding and not margin so CodeMirror's height map stays correct. Expose it as one "Space above headings" multiplier next to Heading typography, and reuse the variables in `canvas-markdown.css` so canvas cards keep the same rhythm.

Impact: long notes (meeting notes, project plans) scan by section.

### 9. Dark default: the tab strip is the brightest surface on screen
Category: color-theming. Effort: S.

KokoBrain Default overrides `tabBar: '#5a5c79'` (`theme.logic.ts:155`) over an editor of `#2a2e3d` and a sidebar of `#21222e` (`:119-120`). That makes the top band 2.1:1 lighter than the content it frames, and lighter than any panel. The band is used by the tab strip, the rail strip and the column headers (`Rail.svelte:270`, `AppShell.svelte:256`, `:276`). In every dark screenshot (calendar-week-dark.png, kanban-board-dark.png, tasks-all-open-dark.png) the eye goes to the chrome first, and inactive tab text has to be lifted to clear 4.5:1 on that mid-tone. The builder derives `tabBar` from `sidebarBg` (`theme-builder.logic.ts:238`); only this override breaks the ladder.

Proposal: drop the override so the band follows the elevation ladder (rail darkest, then sidebar, then editor). Mark the active tab with the editor surface joining the content, which the light theme already does. Add a builder check that `tabBar` luminance stays between the rail and editor surfaces.

Impact: in dark mode the content is again the brightest area, which matters for long evening sessions.

### 10. Rail colors are fixed Tailwind hexes outside the theme and the contrast checks
Category: color-theming. Effort: S.

- `RAIL_ITEM_COLORS` is a hard-coded map (`rail-items.logic.ts:123-141`), "the same on every theme", and is not in `READABILITY_PAIRS`.
- On Lavender's sidebar the Favorites star `#eab308` is 1.6:1 and the Files icon `#14b8a6` is 2.0:1, below the 3:1 non-text minimum (the faint star in rail-favorites-light.png).
- The count badge is `text-label text-white` on the item color (`Rail.svelte:374`): Inbox white on `#3b82f6` is 3.7:1 at 11px, and the same badge on Today `#f97316` would be 2.8:1.
- The active row tint is the same hue at 18% (`Rail.svelte:361`), which feeds finding 3.

Proposal: map rail items to the theme's `type-*` hues (`--type-blue`, `--type-orange` and so on), which `READABILITY_PAIRS` already holds to 3:1 on `fileExplorerBg` (`theme-builder.logic.ts:125`). Use `primaryForeground` on `primary` for badges, or a neutral count with no fill. Keep `RAIL_ACTION_COLOR` for mods but run it through `ensureContrast`.

Impact: rail icons are legible in the light theme, and the rail follows installed themes like the rest of the chrome.

## Polish

### 11. Small sizes that bypass the scale or shrink with the editor font
Category: typography. Effort: S.

- Canvas scoped CSS hard-codes `font-size: 11px` in seven components: `CanvasContextMenu.svelte:219`, `:225`, `ImageNode.svelte:89`, `CanvasEdge.svelte:70`, `FileNode.svelte:154`, `CanvasFilePicker.svelte:139`, `LinkNode.svelte:183`, plus `routes/composer/+page.svelte:310`. Foundation #15 counts only the Tailwind `text-[11px]` classes.
- Live-preview chrome is sized in `em` of the editor font: code-block language and copy label 0.7em (`styles.ts:340`, `:346`), mermaid language 0.7em (`:837`), and footnote refs and error lines 0.75em (`:552`, `:771`, `:803`, `:855`, `:872`). At the default 19px that is 13px. The editor font clamp allows 8px (`settings.logic.ts:67-68`), and at 14px these labels drop to 9.8px.

Proposal: use `var(--text-label)` in the canvas styles. For the editor chrome labels, use `max(var(--text-label), 0.7em)` so they never fall below the chrome floor.

### 12. Right-sidebar titles are indented off their own content
Category: layout-density. Effort: S.

`SidebarSection` always reserves a 14px chevron slot, even for a non-collapsible section (`SidebarSection.svelte:41-45`). "Properties" therefore starts at about x=1221 while its property icons and the "Relationships" label start at about x=1208, and the Info header puts an icon in that slot instead (`NoteInfo.svelte:44`). See editor-live-preview-light.png.

Proposal: render the chevron slot only when `collapsible`, or put the chevron to the right, so every title and its rows share one left edge.

### 13. The vault picker is always dark
Category: color-theming. Effort: S.

`app.html:2` ships `class="dark"`. The picker renders before any vault's appearance loads, so it always uses the hand-copied `.dark` fallback block, which foundation #15 found has drifted from the real theme (vault-picker-light.png renders dark). With finding 2 of foundation (light/dark pairing), the picker should follow `prefers-color-scheme` or the last theme used, cached in local storage.

## Not verified

- Real fonts: screenshots use the test vault's MonoLisa fallback at 15px. Character counts in finding 1 for the default iA Writer Duo S at 19px are estimates from its advance width, not measurements.
- Contrast values for literal colors that the builder's final pass may lift (`withReadableContrast`) are quoted only where the token is not in `READABILITY_PAIRS` (rail colors, alpha-faded text) or where the lifted value is the stated core color.
