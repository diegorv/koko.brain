# file card src/lib/features/event-calendar/event-calendar-form.logic.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/event-calendar/event-calendar-form.logic.ts ' codemap/files
file src/lib/features/event-calendar/event-calendar-form.logic.ts logic L224 module src/lib/features/event-calendar in3 t1 | Rules of the event dialog's form: building a draft, keeping start, end and all-day consistent, validation messages, the patch an edit writes, and the rename pl…
## imports
imp src/lib/features/event-calendar/event-calendar-form.logic.ts:10 -> src/lib/core/settings/settings.types.ts type:EventCalendarSettings
imp src/lib/features/event-calendar/event-calendar-form.logic.ts:11 -> src/lib/core/filesystem/fs.logic.ts generateUniqueName
imp src/lib/features/event-calendar/event-calendar-form.logic.ts:12 -> src/lib/features/event-calendar/event-calendar-dates.logic.ts isValidDayKey,parseTimeStrict
imp src/lib/features/event-calendar/event-calendar-form.logic.ts:13 -> src/lib/features/event-calendar/event-calendar-event.logic.ts eventFileBase
imp src/lib/features/event-calendar/event-calendar-form.logic.ts:14 -> src/lib/features/event-calendar/event-calendar-layout.logic.ts MIN_EVENT_MINUTES
imp src/lib/features/event-calendar/event-calendar-form.logic.ts:15 -> src/lib/features/event-calendar/event-calendar.types.ts type:EventDraft,type:EventNote,type:EventPatch,type:EventState
## imported-by
imp src/lib/features/event-calendar/EventDialog.svelte:11 -> src/lib/features/event-calendar/event-calendar-form.logic.ts draftForCreate,draftFromEvent,draftToPatch,type:EventFormDraft
imp src/lib/features/event-calendar/EventForm.svelte:7 -> src/lib/features/event-calendar/event-calendar-form.logic.ts applyEndChange,applyStartChange,toggleAllDay,validateDraft,type:EventFormDraft
imp src/lib/features/event-calendar/event-calendar.service.ts:37 -> src/lib/features/event-calendar/event-calendar-form.logic.ts planTitleChange,type:EventFormPatch
## reach
in2 src/lib/features/event-calendar/event-calendar-form.logic.ts 11 files in 4 modules: src/lib/features/event-calendar(5) src/lib/app(4) src/lib/features/rail-shell(1) src/lib/plugins/calendar(1)
out2 src/lib/features/event-calendar/event-calendar-form.logic.ts 8 files in 6 modules: src/lib/core/frontmatter(2) src/lib/core/settings(2) src/lib/core/filesystem(1) src/lib/features/type-definitions(1) src/lib/types(1) +1 modules
## tests
test src/tests/lib/features/event-calendar/event-calendar-form.logic.test.ts imports src/lib/features/event-calendar/event-calendar-form.logic.ts mirror
## symbols
sym src/lib/features/event-calendar/event-calendar-form.logic.ts:27 type EventFormDraft L4 | The form state of the event dialog.
by src/lib/features/event-calendar/event-calendar-form.logic.ts:EventFormDraft <- src/lib/features/event-calendar/EventDialog.svelte:11 in (script) import
by src/lib/features/event-calendar/event-calendar-form.logic.ts:EventFormDraft <- src/lib/features/event-calendar/EventForm.svelte:12 in (script) import
sym src/lib/features/event-calendar/event-calendar-form.logic.ts:33 interface EventCreatePayload L10 | What opens the create dialog: a day and, optionally, a range or the all-day flag.
sym src/lib/features/event-calendar/event-calendar-form.logic.ts:45 type EventCreateSettings L1 | The settings a new draft reads.
sym src/lib/features/event-calendar/event-calendar-form.logic.ts:48 interface EventFormErrors L8 | Visible validation messages, one per form area; an empty object means valid.
sym src/lib/features/event-calendar/event-calendar-form.logic.ts:58 type EventFormPatch L4 | What an edit writes: the changed fields, plus the trimmed title when it changed.
by src/lib/features/event-calendar/event-calendar-form.logic.ts:EventFormPatch <- src/lib/features/event-calendar/event-calendar.service.ts:37 in (module) import
sym src/lib/features/event-calendar/event-calendar-form.logic.ts:64 interface TitleChangePlan L6 | How a title change lands on disk.
sym src/lib/features/event-calendar/event-calendar-form.logic.ts:77 fn draftFromEvent(event: EventNote): EventFormDraft L13 | Builds the edit draft of an existing event.
by src/lib/features/event-calendar/event-calendar-form.logic.ts:draftFromEvent <- src/lib/features/event-calendar/EventDialog.svelte:60 in opened=$derived call
sym src/lib/features/event-calendar/event-calendar-form.logic.ts:99 fn draftForCreate(payload: EventCreatePayload, settings: EventCreateSettings): EventFormDraft L16 | Builds the draft of a new event.
by src/lib/features/event-calendar/event-calendar-form.logic.ts:draftForCreate <- src/lib/features/event-calendar/EventDialog.svelte:58 in opened=$derived call
sym src/lib/features/event-calendar/event-calendar-form.logic.ts:123 fn applyStartChange(draft: EventFormDraft, value: string): EventFormDraft L5 | Applies a new start from the time input, keeping the duration (at least `MIN_EVENT_MINUTES`) and capping the end at 1440.
by src/lib/features/event-calendar/event-calendar-form.logic.ts:applyStartChange <- src/lib/features/event-calendar/EventForm.svelte:123 in (markup) markup
sym src/lib/features/event-calendar/event-calendar-form.logic.ts:137 fn applyEndChange(draft: EventFormDraft, value: string): EventFormDraft L4 | Applies a new end from the time input.
by src/lib/features/event-calendar/event-calendar-form.logic.ts:applyEndChange <- src/lib/features/event-calendar/EventForm.svelte:136 in (markup) markup
sym src/lib/features/event-calendar/event-calendar-form.logic.ts:149 fn toggleAllDay(draft: EventFormDraft, allDay = !draft.allDay): EventFormDraft L3 | Sets the all-day flag.
by src/lib/features/event-calendar/event-calendar-form.logic.ts:toggleAllDay <- src/lib/features/event-calendar/EventForm.svelte:106 in (markup) markup
sym src/lib/features/event-calendar/event-calendar-form.logic.ts:161 fn validateDraft(draft: EventFormDraft): EventFormErrors L8 | Validates a draft.
by src/lib/features/event-calendar/event-calendar-form.logic.ts:validateDraft <- src/lib/features/event-calendar/EventForm.svelte:38 in errors=$derived call
sym src/lib/features/event-calendar/event-calendar-form.logic.ts:178 fn draftToPatch(draft: EventFormDraft, original: EventState): EventFormPatch L14 | Computes what an edit changes.
by src/lib/features/event-calendar/event-calendar-form.logic.ts:draftToPatch <- src/lib/features/event-calendar/EventDialog.svelte:119 in save call
sym src/lib/features/event-calendar/event-calendar-form.logic.ts:207 fn planTitleChange(currentFileBase: string, newTitle: string, siblingNames: string[]): TitleChangePlan L18 | Plans how a new title lands on disk.
by src/lib/features/event-calendar/event-calendar-form.logic.ts:planTitleChange <- src/lib/features/event-calendar/event-calendar.service.ts:694 in writeEvent call
## calls
call src/lib/features/event-calendar/event-calendar-form.logic.ts:124 in applyStartChange -> src/lib/features/event-calendar/event-calendar-dates.logic.ts:parseTimeStrict call
call src/lib/features/event-calendar/event-calendar-form.logic.ts:138 in applyEndChange -> src/lib/features/event-calendar/event-calendar-dates.logic.ts:parseTimeStrict call
call src/lib/features/event-calendar/event-calendar-form.logic.ts:164 in validateDraft -> src/lib/features/event-calendar/event-calendar-dates.logic.ts:isValidDayKey call
call src/lib/features/event-calendar/event-calendar-form.logic.ts:208 in planTitleChange -> src/lib/features/event-calendar/event-calendar-event.logic.ts:eventFileBase call
call src/lib/features/event-calendar/event-calendar-form.logic.ts:215 in planTitleChange -> src/lib/core/filesystem/fs.logic.ts:generateUniqueName call
