# file card src/lib/features/event-calendar/event-calendar-event.logic.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/event-calendar/event-calendar-event.logic.ts ' codemap/files
sections: imports, imported-by, reach, tests, symbols, locals, calls
file src/lib/features/event-calendar/event-calendar-event.logic.ts logic L507 module src/lib/features/event-calendar in10 t4 | Schema of event notes: how a Rust `VaultIndex` entry of the configured event type becomes a calendar event or a Needs-attention issue, what a calendar write pu…
## imports
imp src/lib/features/event-calendar/event-calendar-event.logic.ts:12 -> src/lib/core/settings/settings.types.ts type:EventCalendarSettings
imp src/lib/features/event-calendar/event-calendar-event.logic.ts:13 -> src/lib/types/vault-v2.types.ts type:NoteEntryV2
imp src/lib/features/event-calendar/event-calendar-event.logic.ts:14 -> src/lib/core/frontmatter/properties.types.ts type:Property
imp src/lib/features/event-calendar/event-calendar-event.logic.ts:15 -> src/lib/core/settings/settings.logic.ts EVENT_CALENDAR_COLORS
imp src/lib/features/event-calendar/event-calendar-event.logic.ts:16 -> src/lib/core/frontmatter/properties.logic.ts extractBody,parseFrontmatterProperties,rebuildContent
imp src/lib/features/event-calendar/event-calendar-event.logic.ts:17 -> src/lib/features/type-definitions/type-sidebar.logic.ts excludeSystemFolder
imp src/lib/features/event-calendar/event-calendar-event.logic.ts:18 -> src/lib/features/event-calendar/event-calendar-dates.logic.ts addDays,formatTime,isValidDayKey,parseTimeStrict
imp src/lib/features/event-calendar/event-calendar-event.logic.ts:19 -> src/lib/features/event-calendar/event-calendar.types.ts type:EventColor,type:EventDraft,type:EventIssue,type:EventIssueReason,type:EventNote,type:EventPatch,type:EventProjection,type:EventState,type:PendingWrite
## imported-by
imp src/lib/features/event-calendar/EventAllDayLane.svelte:4 -> src/lib/features/event-calendar/event-calendar-event.logic.ts eventColorStyle
imp src/lib/features/event-calendar/EventBlock.svelte:3 -> src/lib/features/event-calendar/event-calendar-event.logic.ts eventColorStyle,type:PendingEventNote
imp src/lib/features/event-calendar/EventCalendarSection.svelte:21 -> src/lib/features/event-calendar/event-calendar-event.logic.ts resolveEventTypeName
imp src/lib/features/event-calendar/EventDialog.svelte:10 -> src/lib/features/event-calendar/event-calendar-event.logic.ts eventState
imp src/lib/features/event-calendar/EventMonthGrid.svelte:6 -> src/lib/features/event-calendar/event-calendar-event.logic.ts eventColorStyle
imp src/lib/features/event-calendar/EventTimeGrid.svelte:27 -> src/lib/features/event-calendar/event-calendar-event.logic.ts type:PendingEventNote
imp src/lib/features/event-calendar/event-calendar-form.logic.ts:13 -> src/lib/features/event-calendar/event-calendar-event.logic.ts eventFileBase
imp src/lib/features/event-calendar/event-calendar-history.logic.ts:12 -> src/lib/features/event-calendar/event-calendar-event.logic.ts sameEventState
imp src/lib/features/event-calendar/event-calendar.service.ts:35 -> src/lib/features/event-calendar/event-calendar-event.logic.ts applyEventDraft,applyEventFields,eventFileBase,eventState,eventsFromEntries,prunePending,resolveEventTypeName,sameEventState
imp src/lib/features/event-calendar/event-calendar.store.svelte.ts:14 -> src/lib/features/event-calendar/event-calendar-event.logic.ts eventState,isActionableIssue,mergePending,prunePending,sameEventState,type:PendingEventNote
## reach
in2 src/lib/features/event-calendar/event-calendar-event.logic.ts 13 files in 4 modules: src/lib/features/event-calendar(6) src/lib/app(5) src/lib/features/rail-shell(1) src/lib/plugins/calendar(1)
out2 src/lib/features/event-calendar/event-calendar-event.logic.ts 10 files in 7 modules: src/lib/core/filesystem(2) src/lib/features/collection(2) src/lib/utils(2) src/lib/contracts(1) src/lib/core/settings(1) +2 modules
## tests
test src/tests/lib/features/event-calendar/event-calendar-event.logic.test.ts imports src/lib/features/event-calendar/event-calendar-event.logic.ts mirror
test src/tests/lib/features/event-calendar/event-calendar-form.logic.test.ts imports src/lib/features/event-calendar/event-calendar-event.logic.ts
test src/tests/lib/features/event-calendar/event-calendar.model.test.ts imports src/lib/features/event-calendar/event-calendar-event.logic.ts
test src/tests/lib/features/event-calendar/event-calendar.service.test.ts imports src/lib/features/event-calendar/event-calendar-event.logic.ts
## symbols
sym src/lib/features/event-calendar/event-calendar-event.logic.ts:59 type EventDefaults L1 | The settings an event projection falls back to for absent keys.
sym src/lib/features/event-calendar/event-calendar-event.logic.ts:62 interface EventProjectionOptions L12 | Options of eventsFromEntries.
sym src/lib/features/event-calendar/event-calendar-event.logic.ts:76 type EventTime L1 | Result of reading one time field.
sym src/lib/features/event-calendar/event-calendar-event.logic.ts:79 type EntryProjection L1 | Result of projecting one entry: an event or an issue.
sym src/lib/features/event-calendar/event-calendar-event.logic.ts:82 type PendingEventNote L4 | An event as the calendar shows it after the pending overlay.
by src/lib/features/event-calendar/event-calendar-event.logic.ts:PendingEventNote <- src/lib/features/event-calendar/EventBlock.svelte:3 in (script) import
by src/lib/features/event-calendar/event-calendar-event.logic.ts:PendingEventNote <- src/lib/features/event-calendar/EventTimeGrid.svelte:27 in (script) import
by src/lib/features/event-calendar/event-calendar-event.logic.ts:PendingEventNote <- src/lib/features/event-calendar/event-calendar.store.svelte.ts:14 in (module) import
sym src/lib/features/event-calendar/event-calendar-event.logic.ts:99 fn isEventEntry(entry: NoteEntryV2, typeName: string): boolean L5 | Whether an entry is a note of the configured event type.
sym src/lib/features/event-calendar/event-calendar-event.logic.ts:111 fn parseEventTime(value: unknown): EventTime L11 | Reads a `start` or `end` value.
sym src/lib/features/event-calendar/event-calendar-event.logic.ts:150 fn entryToEvent(entry: NoteEntryV2, defaults: EventDefaults): EntryProjection L76 | Projects one event-typed entry.
sym src/lib/features/event-calendar/event-calendar-event.logic.ts:232 fn isActionableIssue(reason: EventIssueReason): boolean L3 | Whether an issue counts toward the Needs-attention badge (D26).
by src/lib/features/event-calendar/event-calendar-event.logic.ts:isActionableIssue <- src/lib/features/event-calendar/event-calendar.store.svelte.ts:63 in recompute call +1
sym src/lib/features/event-calendar/event-calendar-event.logic.ts:244 fn eventsFromEntries(entries: NoteEntryV2[], options: EventProjectionOptions): EventProjection L18 | Projects the vault index onto the calendar (D26 read scope).
by src/lib/features/event-calendar/event-calendar-event.logic.ts:eventsFromEntries <- src/lib/features/event-calendar/event-calendar.service.ts:88 in loadEvents call +1
sym src/lib/features/event-calendar/event-calendar-event.logic.ts:270 fn eventFileBase(title: string): string L4 | Sanitized filename base for a typed title (D6).
by src/lib/features/event-calendar/event-calendar-event.logic.ts:eventFileBase <- src/lib/features/event-calendar/event-calendar-form.logic.ts:208 in planTitleChange call
by src/lib/features/event-calendar/event-calendar-event.logic.ts:eventFileBase <- src/lib/features/event-calendar/event-calendar.service.ts:940 in createNow call +1
sym src/lib/features/event-calendar/event-calendar-event.logic.ts:280 fn formatEventTime(minutes: number): string L3 | Formats minutes from midnight as the `HH:mm` text a note stores.
sym src/lib/features/event-calendar/event-calendar-event.logic.ts:309 fn applyEventFields(properties: Property[], patch: EventPatch): Property[] L22 | Applies a calendar patch to a note's properties.
by src/lib/features/event-calendar/event-calendar-event.logic.ts:applyEventFields <- src/lib/features/event-calendar/event-calendar.service.ts:759 in renameAndWrite call +1
sym src/lib/features/event-calendar/event-calendar-event.logic.ts:344 fn applyEventDraft(baseContent: string, draft: EventDraft, fileBase: string, typeName: string): string L20 | Merges a draft onto a base note (the Event type template or the inline `_type` template).
by src/lib/features/event-calendar/event-calendar-event.logic.ts:applyEventDraft <- src/lib/features/event-calendar/event-calendar.service.ts:946 in createNow call
sym src/lib/features/event-calendar/event-calendar-event.logic.ts:370 fn eventState(event: EventNote): EventState L12 | The calendar-visible state of an event, the undo precondition.
by src/lib/features/event-calendar/event-calendar-event.logic.ts:eventState <- src/lib/features/event-calendar/EventDialog.svelte:60 in opened=$derived call
by src/lib/features/event-calendar/event-calendar-event.logic.ts:eventState <- src/lib/features/event-calendar/event-calendar.service.ts:688 in writeEvent call +7
by src/lib/features/event-calendar/event-calendar-event.logic.ts:eventState <- src/lib/features/event-calendar/event-calendar.store.svelte.ts:219 in eventCalendarStore.remapPath call
sym src/lib/features/event-calendar/event-calendar-event.logic.ts:400 const EVENT_STATE_KEYS: readonly (keyof EventState)[] L1 | The keys of `EVENT_STATE_KEY_SET`, in declaration order.
sym src/lib/features/event-calendar/event-calendar-event.logic.ts:407 fn sameEventState(a: EventState, b: EventState): boolean L3 | Whether two event states are equal field by field.
by src/lib/features/event-calendar/event-calendar-event.logic.ts:sameEventState <- src/lib/features/event-calendar/event-calendar-history.logic.ts:44 in pushOp call
by src/lib/features/event-calendar/event-calendar-event.logic.ts:sameEventState <- src/lib/features/event-calendar/event-calendar.service.ts:1273 in applyNoteOp call +1
by src/lib/features/event-calendar/event-calendar-event.logic.ts:sameEventState <- src/lib/features/event-calendar/event-calendar.store.svelte.ts:220 in eventCalendarStore.remapPath call
sym src/lib/features/event-calendar/event-calendar-event.logic.ts:418 fn resolveEventTypeName(typeNames: readonly string[], configured: string): string L4 | Resolves the configured event type to the casing an existing type uses, for the exact-key lookup of `createTypedNote`.
by src/lib/features/event-calendar/event-calendar-event.logic.ts:resolveEventTypeName <- src/lib/features/event-calendar/EventCalendarSection.svelte:50 in eventType=$derived call
by src/lib/features/event-calendar/event-calendar-event.logic.ts:resolveEventTypeName <- src/lib/features/event-calendar/event-calendar.service.ts:933 in createNow call
sym src/lib/features/event-calendar/event-calendar-event.logic.ts:428 fn eventColorStyle(color: EventColor): string L3 | Inline style for an event chip.
by src/lib/features/event-calendar/event-calendar-event.logic.ts:eventColorStyle <- src/lib/features/event-calendar/EventAllDayLane.svelte:81 in (markup) markup
by src/lib/features/event-calendar/event-calendar-event.logic.ts:eventColorStyle <- src/lib/features/event-calendar/EventBlock.svelte:46 in style=$derived call
by src/lib/features/event-calendar/event-calendar-event.logic.ts:eventColorStyle <- src/lib/features/event-calendar/EventMonthGrid.svelte:129 in (markup) markup
sym src/lib/features/event-calendar/event-calendar-event.logic.ts:444 fn mergePending(snapshot: EventNote[], pending: PendingWrite[]): PendingEventNote[] L37 | Overlays pending writes on the projected snapshot.
by src/lib/features/event-calendar/event-calendar-event.logic.ts:mergePending <- src/lib/features/event-calendar/event-calendar.store.svelte.ts:59 in recompute call
sym src/lib/features/event-calendar/event-calendar-event.logic.ts:497 fn prunePending(pending: PendingWrite[], snapshot: EventNote[], version: number): PendingWrite[] L11 | Drops the pending writes the index has caught up with.
by src/lib/features/event-calendar/event-calendar-event.logic.ts:prunePending <- src/lib/features/event-calendar/event-calendar.service.ts:229 in lookupCalendarEvent call
by src/lib/features/event-calendar/event-calendar-event.logic.ts:prunePending <- src/lib/features/event-calendar/event-calendar.store.svelte.ts:120 in eventCalendarStore.setSnapshot call
## locals
local src/lib/features/event-calendar/event-calendar-event.logic.ts:88 fn isAbsent(value: unknown): boolean L3
local src/lib/features/event-calendar/event-calendar-event.logic.ts:128 fn eventTitle(entry: NoteEntryV2): string L3
local src/lib/features/event-calendar/event-calendar-event.logic.ts:133 fn hasWrittenTitle(entry: NoteEntryV2): boolean L4
local src/lib/features/event-calendar/event-calendar-event.logic.ts:285 fn setProperty(properties: Property[], key: string, value: Property['value'], type: Property['type']): Property[] L6
local src/lib/features/event-calendar/event-calendar-event.logic.ts:293 fn deleteProperty(properties: Property[], key: string): Property[] L3
## calls
call src/lib/features/event-calendar/event-calendar-event.logic.ts:112 in parseEventTime -> src/lib/features/event-calendar/event-calendar-event.logic.ts:isAbsent call
call src/lib/features/event-calendar/event-calendar-event.logic.ts:114 in parseEventTime -> src/lib/features/event-calendar/event-calendar-dates.logic.ts:parseTimeStrict call
call src/lib/features/event-calendar/event-calendar-event.logic.ts:129 in eventTitle -> src/lib/features/event-calendar/event-calendar-event.logic.ts:hasWrittenTitle call
call src/lib/features/event-calendar/event-calendar-event.logic.ts:152 in entryToEvent -> src/lib/features/event-calendar/event-calendar-event.logic.ts:eventTitle call
call src/lib/features/event-calendar/event-calendar-event.logic.ts:166 in entryToEvent -> src/lib/features/event-calendar/event-calendar-event.logic.ts:isAbsent call +2
call src/lib/features/event-calendar/event-calendar-event.logic.ts:167 in entryToEvent -> src/lib/features/event-calendar/event-calendar-dates.logic.ts:isValidDayKey call +1
call src/lib/features/event-calendar/event-calendar-event.logic.ts:174 in entryToEvent -> src/lib/features/event-calendar/event-calendar-event.logic.ts:parseEventTime call +1
call src/lib/features/event-calendar/event-calendar-event.logic.ts:196 in entryToEvent -> src/lib/features/event-calendar/event-calendar-dates.logic.ts:addDays call
call src/lib/features/event-calendar/event-calendar-event.logic.ts:213 in entryToEvent -> src/lib/features/event-calendar/event-calendar-event.logic.ts:hasWrittenTitle call
call src/lib/features/event-calendar/event-calendar-event.logic.ts:246 in eventsFromEntries -> src/lib/features/type-definitions/type-sidebar.logic.ts:excludeSystemFolder call
call src/lib/features/event-calendar/event-calendar-event.logic.ts:247 in eventsFromEntries -> src/lib/features/event-calendar/event-calendar-event.logic.ts:isEventEntry call
call src/lib/features/event-calendar/event-calendar-event.logic.ts:252 in eventsFromEntries -> src/lib/features/event-calendar/event-calendar-event.logic.ts:entryToEvent call +1
call src/lib/features/event-calendar/event-calendar-event.logic.ts:281 in formatEventTime -> src/lib/features/event-calendar/event-calendar-dates.logic.ts:formatTime call
call src/lib/features/event-calendar/event-calendar-event.logic.ts:311 in applyEventFields -> src/lib/features/event-calendar/event-calendar-event.logic.ts:setProperty call +6
call src/lib/features/event-calendar/event-calendar-event.logic.ts:313 in applyEventFields -> src/lib/features/event-calendar/event-calendar-event.logic.ts:deleteProperty call +4
call src/lib/features/event-calendar/event-calendar-event.logic.ts:319 in applyEventFields -> src/lib/features/event-calendar/event-calendar-event.logic.ts:formatEventTime call +1
call src/lib/features/event-calendar/event-calendar-event.logic.ts:345 in applyEventDraft -> src/lib/core/frontmatter/properties.logic.ts:parseFrontmatterProperties call
call src/lib/features/event-calendar/event-calendar-event.logic.ts:349 in applyEventDraft -> src/lib/features/event-calendar/event-calendar-event.logic.ts:applyEventFields call
call src/lib/features/event-calendar/event-calendar-event.logic.ts:358 in applyEventDraft -> src/lib/core/frontmatter/properties.logic.ts:extractBody call
call src/lib/features/event-calendar/event-calendar-event.logic.ts:362 in applyEventDraft -> src/lib/core/frontmatter/properties.logic.ts:rebuildContent call
call src/lib/features/event-calendar/event-calendar-event.logic.ts:502 in prunePending -> src/lib/features/event-calendar/event-calendar-event.logic.ts:eventState call +3
call src/lib/features/event-calendar/event-calendar-event.logic.ts:502 in prunePending -> src/lib/features/event-calendar/event-calendar-event.logic.ts:sameEventState call +2
