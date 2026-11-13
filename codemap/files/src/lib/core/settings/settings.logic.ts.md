# file card src/lib/core/settings/settings.logic.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/settings/settings.logic.ts ' codemap/files
file src/lib/core/settings/settings.logic.ts logic L303 module src/lib/core/settings in11 t2
## imports
imp src/lib/core/settings/settings.logic.ts:1 -> src/lib/utils/clamp.ts clamp
imp src/lib/core/settings/settings.logic.ts:2 -> src/lib/core/settings/settings.types.ts type:AppSettings,type:EditorSettings,type:EventCalendarSettings,type:HeadingLevelSettings,type:HeadingTypography,type:LayoutSettings,type:SettingsSection,type:TodoistSettings
## imported-by
imp src/lib/app/SettingsPanel.svelte:99 -> src/lib/core/settings/settings.logic.ts SETTINGS_SECTION_GROUPS
imp src/lib/core/markdown-editor/MarkdownEditor.svelte:27 -> src/lib/core/settings/settings.logic.ts effectiveContentWidth
imp src/lib/core/settings/sections/EditorSection.svelte:10 -> src/lib/core/settings/settings.logic.ts clampFontSize,clampLineHeight,clampContentWidth,clampParagraphSpacing
imp src/lib/core/settings/sections/HeadingTypographyEditor.svelte:5 -> src/lib/core/settings/settings.logic.ts clampHeadingFontSize,clampHeadingLineHeight,clampHeadingLetterSpacing
imp src/lib/core/settings/settings-persistence.svelte.ts:3 -> src/lib/core/settings/settings.logic.ts normalizeSettings
imp src/lib/core/settings/settings.service.ts:6 -> src/lib/core/settings/settings.logic.ts mergeLayout,migrateTypeScale,normalizeSettings
imp src/lib/core/settings/settings.types.ts:1 -> src/lib/core/settings/settings.logic.ts type:EVENT_CALENDAR_COLORS,type:EVENT_CALENDAR_VIEW_MODES,type:TODOIST_SYNC_CONTEXTS
imp src/lib/features/event-calendar/EventCalendarSection.svelte:9 -> src/lib/core/settings/settings.logic.ts clampDayStartHour,clampEventDuration,normalizeEventTypeName,EVENT_CALENDAR_VIEW_MODES
imp src/lib/features/event-calendar/EventColorSwatches.svelte:2 -> src/lib/core/settings/settings.logic.ts EVENT_CALENDAR_COLORS
imp src/lib/features/event-calendar/event-calendar-event.logic.ts:15 -> src/lib/core/settings/settings.logic.ts EVENT_CALENDAR_COLORS
imp src/lib/features/todoist-sync/TodoistSection.svelte:9 -> src/lib/core/settings/settings.logic.ts clampSyncIntervalMinutes
## reach
in2 src/lib/core/settings/settings.logic.ts 29 files in 11 modules: src/lib/features/event-calendar(11) src/lib/core/settings(5) src/lib/app(3) src/lib/plugins/calendar(2) src/lib/plugins/periodic-notes(2) +6 modules: q impact src/lib/core/settings/settings.logic.ts --depth 2
out2 src/lib/core/settings/settings.logic.ts 1 files in 1 modules: src/lib/core/settings(1)
## tests
test src/tests/lib/core/settings/settings.logic.test.ts imports src/lib/core/settings/settings.logic.ts mirror
test src/tests/lib/app/SettingsPanel.test.ts imports src/lib/core/settings/settings.logic.ts
## symbols
sym src/lib/core/settings/settings.logic.ts:17 fn mergeLayout(defaults: LayoutSettings, savedLayout: unknown): LayoutSettings L15 | Merges the `layout` read from settings.json over `defaults`, key by key.
by src/lib/core/settings/settings.logic.ts:mergeLayout <- src/lib/core/settings/settings.service.ts:117 in parseSettings call
sym src/lib/core/settings/settings.logic.ts:48 fn migrateTypeScale(saved: Partial<EditorSettings> | undefined): Partial<EditorSettings> | undefined L17 | Moves an editor block saved before the current type scale onto it, once: the font size becomes the size the body rendered at (`round(size x 1.05)`), and an H4-…
by src/lib/core/settings/settings.logic.ts:migrateTypeScale <- src/lib/core/settings/settings.service.ts:92 in parseSettings call
sym src/lib/core/settings/settings.logic.ts:67 fn clampFontSize(size: number): number L3 | Clamps a font size to the valid range (8–32 px)
by src/lib/core/settings/settings.logic.ts:clampFontSize <- src/lib/core/settings/sections/EditorSection.svelte:102 in (markup) markup
sym src/lib/core/settings/settings.logic.ts:72 fn clampLineHeight(height: number): number L3 | Clamps a line height to the valid range (1.0–3.0)
by src/lib/core/settings/settings.logic.ts:clampLineHeight <- src/lib/core/settings/sections/EditorSection.svelte:123 in (markup) markup
sym src/lib/core/settings/settings.logic.ts:77 fn clampContentWidth(width: number): number L4 | Clamps a content width to the valid range (0 = no limit, or 400–2000 px)
by src/lib/core/settings/settings.logic.ts:clampContentWidth <- src/lib/core/settings/sections/EditorSection.svelte:167 in (markup) markup
sym src/lib/core/settings/settings.logic.ts:83 fn effectiveContentWidth(editor: Pick<EditorSettings, 'contentWidth' | 'wideNotes'>): number L3 | The max width notes are laid out at: 0 (full width) for wide notes, else the configured `contentWidth`
by src/lib/core/settings/settings.logic.ts:effectiveContentWidth <- src/lib/core/markdown-editor/MarkdownEditor.svelte:117 in freshState call +1
sym src/lib/core/settings/settings.logic.ts:88 fn clampParagraphSpacing(spacing: number): number L3 | Clamps a paragraph spacing to the valid range (0–2.0 em)
by src/lib/core/settings/settings.logic.ts:clampParagraphSpacing <- src/lib/core/settings/sections/EditorSection.svelte:144 in (markup) markup
sym src/lib/core/settings/settings.logic.ts:93 fn clampHeadingFontSize(size: number): number L3 | Clamps a heading font size to the valid range (0.5–5.0 em)
by src/lib/core/settings/settings.logic.ts:clampHeadingFontSize <- src/lib/core/settings/sections/HeadingTypographyEditor.svelte:69 in (markup) markup
sym src/lib/core/settings/settings.logic.ts:98 fn clampHeadingLineHeight(height: number): number L3 | Clamps a heading line height to the valid range (1.0–3.0)
by src/lib/core/settings/settings.logic.ts:clampHeadingLineHeight <- src/lib/core/settings/sections/HeadingTypographyEditor.svelte:82 in (markup) markup
sym src/lib/core/settings/settings.logic.ts:103 fn clampHeadingLetterSpacing(spacing: number): number L3 | Clamps a heading letter spacing to the valid range (-0.1 to 0.1 em)
by src/lib/core/settings/settings.logic.ts:clampHeadingLetterSpacing <- src/lib/core/settings/sections/HeadingTypographyEditor.svelte:112 in (markup) markup
sym src/lib/core/settings/settings.logic.ts:108 const EVENT_CALENDAR_COLORS L1 | Event colors the calendar offers; the only runtime copy of this list
by src/lib/core/settings/settings.logic.ts:EVENT_CALENDAR_COLORS <- src/lib/core/settings/settings.types.ts:1 in (module) import
by src/lib/core/settings/settings.logic.ts:EVENT_CALENDAR_COLORS <- src/lib/features/event-calendar/EventColorSwatches.svelte:20 in select member +3
by src/lib/core/settings/settings.logic.ts:EVENT_CALENDAR_COLORS <- src/lib/features/event-calendar/event-calendar-event.logic.ts:203 in entryToEvent ref
sym src/lib/core/settings/settings.logic.ts:111 const EVENT_CALENDAR_VIEW_MODES L1 | Calendar view modes; the only runtime copy of this list
by src/lib/core/settings/settings.logic.ts:EVENT_CALENDAR_VIEW_MODES <- src/lib/core/settings/settings.types.ts:1 in (module) import
by src/lib/core/settings/settings.logic.ts:EVENT_CALENDAR_VIEW_MODES <- src/lib/features/event-calendar/EventCalendarSection.svelte:198 in (markup) markup +1
sym src/lib/core/settings/settings.logic.ts:114 fn clampDayStartHour(hour: number): number L5 | Clamps the calendar's first visible hour to an integer within 0–12 (a non-finite value becomes 0)
by src/lib/core/settings/settings.logic.ts:clampDayStartHour <- src/lib/features/event-calendar/EventCalendarSection.svelte:166 in (markup) markup
sym src/lib/core/settings/settings.logic.ts:121 fn clampEventDuration(minutes: number): number L5 | Rounds a default event duration to a multiple of 15 within 15–480 minutes (a non-finite value becomes 15)
by src/lib/core/settings/settings.logic.ts:clampEventDuration <- src/lib/features/event-calendar/EventCalendarSection.svelte:227 in (markup) markup
sym src/lib/core/settings/settings.logic.ts:131 fn normalizeEventTypeName(name: unknown): string L6 | Trims the type name event notes carry.
by src/lib/core/settings/settings.logic.ts:normalizeEventTypeName <- src/lib/features/event-calendar/EventCalendarSection.svelte:266 in (markup) markup
sym src/lib/core/settings/settings.logic.ts:161 const TODOIST_SYNC_CONTEXTS L1 | Vault contexts of the Todoist sync (design rule 8b); the only runtime copy of this list
by src/lib/core/settings/settings.logic.ts:TODOIST_SYNC_CONTEXTS <- src/lib/core/settings/settings.types.ts:1 in (module) import
sym src/lib/core/settings/settings.logic.ts:168 fn clampSyncIntervalMinutes(minutes: number): number L6 | Rounds the Todoist sync interval to whole minutes, at least 1.
by src/lib/core/settings/settings.logic.ts:clampSyncIntervalMinutes <- src/lib/features/todoist-sync/TodoistSection.svelte:49 in handleIntervalChange call
sym src/lib/core/settings/settings.logic.ts:217 fn normalizeSettings(settings: AppSettings): AppSettings L24 | Returns a copy of `settings` with every clamped numeric field forced back into its valid range.
by src/lib/core/settings/settings.logic.ts:normalizeSettings <- src/lib/core/settings/settings-persistence.svelte.ts:35 in serialize call
by src/lib/core/settings/settings.logic.ts:normalizeSettings <- src/lib/core/settings/settings.service.ts:203 in parseSettings call +1
sym src/lib/core/settings/settings.logic.ts:243 interface SettingsSectionItem L4 | A single navigation item in the settings sidebar
sym src/lib/core/settings/settings.logic.ts:249 interface SettingsSectionGroup L4 | A group of settings sections with an optional header
sym src/lib/core/settings/settings.logic.ts:255 const SETTINGS_SECTION_GROUPS: readonly SettingsSectionGroup[] L49 | Navigation items for the settings sidebar, organized by group
by src/lib/core/settings/settings.logic.ts:SETTINGS_SECTION_GROUPS <- src/lib/app/SettingsPanel.svelte:129 in (markup) markup
## locals
local src/lib/core/settings/settings.logic.ts:143 fn normalizeEventCalendar(calendar: EventCalendarSettings): EventCalendarSettings L16
local src/lib/core/settings/settings.logic.ts:180 fn normalizeTodoist(todoist: TodoistSettings): TodoistSettings L16
local src/lib/core/settings/settings.logic.ts:198 fn normalizeHeadingLevel(level: HeadingLevelSettings): HeadingLevelSettings L8
## calls
call src/lib/core/settings/settings.logic.ts:68 in clampFontSize -> src/lib/utils/clamp.ts:clamp call
call src/lib/core/settings/settings.logic.ts:73 in clampLineHeight -> src/lib/utils/clamp.ts:clamp call
call src/lib/core/settings/settings.logic.ts:79 in clampContentWidth -> src/lib/utils/clamp.ts:clamp call
call src/lib/core/settings/settings.logic.ts:89 in clampParagraphSpacing -> src/lib/utils/clamp.ts:clamp call
call src/lib/core/settings/settings.logic.ts:94 in clampHeadingFontSize -> src/lib/utils/clamp.ts:clamp call
call src/lib/core/settings/settings.logic.ts:99 in clampHeadingLineHeight -> src/lib/utils/clamp.ts:clamp call
call src/lib/core/settings/settings.logic.ts:104 in clampHeadingLetterSpacing -> src/lib/utils/clamp.ts:clamp call
call src/lib/core/settings/settings.logic.ts:117 in clampDayStartHour -> src/lib/utils/clamp.ts:clamp call
call src/lib/core/settings/settings.logic.ts:124 in clampEventDuration -> src/lib/utils/clamp.ts:clamp call
call src/lib/core/settings/settings.logic.ts:148 in normalizeEventCalendar -> src/lib/core/settings/settings.logic.ts:clampDayStartHour call
call src/lib/core/settings/settings.logic.ts:150 in normalizeEventCalendar -> src/lib/core/settings/settings.logic.ts:clampEventDuration call
call src/lib/core/settings/settings.logic.ts:152 in normalizeEventCalendar -> src/lib/core/settings/settings.logic.ts:normalizeEventTypeName call
call src/lib/core/settings/settings.logic.ts:186 in normalizeTodoist -> src/lib/core/settings/settings.logic.ts:clampSyncIntervalMinutes call
call src/lib/core/settings/settings.logic.ts:201 in normalizeHeadingLevel -> src/lib/core/settings/settings.logic.ts:clampHeadingFontSize call
call src/lib/core/settings/settings.logic.ts:202 in normalizeHeadingLevel -> src/lib/core/settings/settings.logic.ts:clampHeadingLineHeight call
call src/lib/core/settings/settings.logic.ts:203 in normalizeHeadingLevel -> src/lib/core/settings/settings.logic.ts:clampHeadingLetterSpacing call
call src/lib/core/settings/settings.logic.ts:224 in normalizeSettings -> src/lib/core/settings/settings.logic.ts:clampFontSize call
call src/lib/core/settings/settings.logic.ts:225 in normalizeSettings -> src/lib/core/settings/settings.logic.ts:clampLineHeight call
call src/lib/core/settings/settings.logic.ts:226 in normalizeSettings -> src/lib/core/settings/settings.logic.ts:clampContentWidth call
call src/lib/core/settings/settings.logic.ts:227 in normalizeSettings -> src/lib/core/settings/settings.logic.ts:clampParagraphSpacing call
call src/lib/core/settings/settings.logic.ts:229 in normalizeSettings -> src/lib/core/settings/settings.logic.ts:normalizeHeadingLevel call +5
call src/lib/core/settings/settings.logic.ts:237 in normalizeSettings -> src/lib/core/settings/settings.logic.ts:normalizeEventCalendar call
call src/lib/core/settings/settings.logic.ts:238 in normalizeSettings -> src/lib/core/settings/settings.logic.ts:normalizeTodoist call
