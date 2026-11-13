# file card src/lib/features/event-calendar/EventForm.svelte
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/event-calendar/EventForm.svelte ' codemap/files
file src/lib/features/event-calendar/EventForm.svelte component L190 module src/lib/features/event-calendar in1 t0
## imports
imp src/lib/features/event-calendar/EventForm.svelte:3 -> src/lib/components/ui/button/index.ts Button
imp src/lib/features/event-calendar/EventForm.svelte:4 -> src/lib/components/ui/input/index.ts Input
imp src/lib/features/event-calendar/EventForm.svelte:5 -> src/lib/components/ui/switch/index.ts Switch
imp src/lib/features/event-calendar/EventForm.svelte:6 -> src/lib/features/event-calendar/event-calendar-dates.logic.ts timeInputValue
imp src/lib/features/event-calendar/EventForm.svelte:7 -> src/lib/features/event-calendar/event-calendar-form.logic.ts applyEndChange,applyStartChange,toggleAllDay,validateDraft,type:EventFormDraft
imp src/lib/features/event-calendar/EventForm.svelte:14 -> src/lib/features/event-calendar/event-calendar.service.ts eventErrorMessage
imp src/lib/features/event-calendar/EventForm.svelte:15 -> src/lib/features/event-calendar/EventColorSwatches.svelte default
## imported-by
imp src/lib/features/event-calendar/EventDialog.svelte:22 -> src/lib/features/event-calendar/EventForm.svelte default
## reach
in2 src/lib/features/event-calendar/EventForm.svelte 1 files in 1 modules: src/lib/features/event-calendar(1)
out2 src/lib/features/event-calendar/EventForm.svelte 33 files in 12 modules: src/lib/features/event-calendar(9) src/lib/components(3) src/lib/core/editor(3) src/lib/core/filesystem(3) src/lib/core/settings(3) +7 modules
## symbols
sym src/lib/features/event-calendar/EventForm.svelte:1 component EventForm props:initial,onsubmit,oncancel,actions,withNotes= L190
by src/lib/features/event-calendar/EventForm.svelte:default <- src/lib/features/event-calendar/EventDialog.svelte:199 in (markup) mount +1
## locals
local src/lib/features/event-calendar/EventForm.svelte:43 fn inputValue(e: Event): string L3
local src/lib/features/event-calendar/EventForm.svelte:47 fn handleSubmit(e: SubmitEvent) L13
## mounts
mount src/lib/features/event-calendar/EventForm.svelte:65 Input -> src/lib/components/ui/input/input.svelte
mount src/lib/features/event-calendar/EventForm.svelte:86 Input -> src/lib/components/ui/input/input.svelte
mount src/lib/features/event-calendar/EventForm.svelte:102 Switch -> src/lib/components/ui/switch/switch.svelte
mount src/lib/features/event-calendar/EventForm.svelte:117 Input -> src/lib/components/ui/input/input.svelte
mount src/lib/features/event-calendar/EventForm.svelte:130 Input -> src/lib/components/ui/input/input.svelte
mount src/lib/features/event-calendar/EventForm.svelte:151 Input -> src/lib/components/ui/input/input.svelte
mount src/lib/features/event-calendar/EventForm.svelte:161 EventColorSwatches -> src/lib/features/event-calendar/EventColorSwatches.svelte
mount src/lib/features/event-calendar/EventForm.svelte:186 Button -> src/lib/components/ui/button/button.svelte
mount src/lib/features/event-calendar/EventForm.svelte:187 Button -> src/lib/components/ui/button/button.svelte
## mounted-at
mount src/lib/features/event-calendar/EventDialog.svelte:199 EventForm -> src/lib/features/event-calendar/EventForm.svelte
mount src/lib/features/event-calendar/EventDialog.svelte:208 EventForm -> src/lib/features/event-calendar/EventForm.svelte
## calls
call src/lib/features/event-calendar/EventForm.svelte:38 in errors=$derived -> src/lib/features/event-calendar/event-calendar-form.logic.ts:validateDraft call
call src/lib/features/event-calendar/EventForm.svelte:55 in handleSubmit -> src/lib/features/event-calendar/event-calendar.service.ts:eventErrorMessage call
call src/lib/features/event-calendar/EventForm.svelte:62 in (markup) -> src/lib/features/event-calendar/EventForm.svelte:handleSubmit markup
call src/lib/features/event-calendar/EventForm.svelte:68 in (markup) -> src/lib/features/event-calendar/EventForm.svelte:inputValue markup +4
call src/lib/features/event-calendar/EventForm.svelte:106 in (markup) -> src/lib/features/event-calendar/event-calendar-form.logic.ts:toggleAllDay markup
call src/lib/features/event-calendar/EventForm.svelte:121 in (markup) -> src/lib/features/event-calendar/event-calendar-dates.logic.ts:timeInputValue markup +1
call src/lib/features/event-calendar/EventForm.svelte:123 in (markup) -> src/lib/features/event-calendar/event-calendar-form.logic.ts:applyStartChange markup
call src/lib/features/event-calendar/EventForm.svelte:136 in (markup) -> src/lib/features/event-calendar/event-calendar-form.logic.ts:applyEndChange markup
