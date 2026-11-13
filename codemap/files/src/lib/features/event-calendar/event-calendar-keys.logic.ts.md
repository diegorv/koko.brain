# file card src/lib/features/event-calendar/event-calendar-keys.logic.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/event-calendar/event-calendar-keys.logic.ts ' codemap/files
file src/lib/features/event-calendar/event-calendar-keys.logic.ts logic L123 module src/lib/features/event-calendar in3 t2 | Keyboard shortcuts of the Calendar tab, a port of `calender-app-design/src/components/shell/keyboard-shortcuts.tsx` scoped to the view.
## imports
imp src/lib/features/event-calendar/event-calendar-keys.logic.ts:8 -> src/lib/features/event-calendar/event-calendar.types.ts type:CalendarViewMode
## imported-by
imp src/lib/app/global-keybindings.ts:11 -> src/lib/features/event-calendar/event-calendar-keys.logic.ts isTypingTarget
imp src/lib/features/event-calendar/EventCalendarView.svelte:26 -> src/lib/features/event-calendar/event-calendar-keys.logic.ts isTypingTarget,resolveCalendarKey
imp src/lib/features/event-calendar/EventShortcutsDialog.svelte:4 -> src/lib/features/event-calendar/event-calendar-keys.logic.ts CALENDAR_SHORTCUTS
## reach
in2 src/lib/features/event-calendar/event-calendar-keys.logic.ts 3 files in 2 modules: src/lib/app(2) src/routes(1)
out2 src/lib/features/event-calendar/event-calendar-keys.logic.ts 1 files in 1 modules: src/lib/core/settings(1)
## tests
test src/tests/lib/features/event-calendar/event-calendar-keys.logic.test.ts imports src/lib/features/event-calendar/event-calendar-keys.logic.ts mirror
test src/tests/lib/features/event-calendar/EventCalendarView.test.ts imports src/lib/features/event-calendar/event-calendar-keys.logic.ts
## symbols
sym src/lib/features/event-calendar/event-calendar-keys.logic.ts:11 type CalendarKeyAction L10 | What a key press asks the Calendar view to do.
sym src/lib/features/event-calendar/event-calendar-keys.logic.ts:23 interface CalendarKeyState L14 | What the view knows about a key press beyond the key itself.
sym src/lib/features/event-calendar/event-calendar-keys.logic.ts:39 type CalendarKeyEvent L1 | The key and modifier fields of a keyboard event that `resolveCalendarKey` reads.
sym src/lib/features/event-calendar/event-calendar-keys.logic.ts:42 interface CalendarShortcut L8 | One row of the shortcuts help: the keys that trigger one action.
sym src/lib/features/event-calendar/event-calendar-keys.logic.ts:57 const CALENDAR_SHORTCUTS: readonly CalendarShortcut[] L11 | The shortcuts `resolveCalendarKey` handles, in the order the help dialog lists them.
by src/lib/features/event-calendar/event-calendar-keys.logic.ts:CALENDAR_SHORTCUTS <- src/lib/features/event-calendar/EventShortcutsDialog.svelte:19 in (markup) markup
sym src/lib/features/event-calendar/event-calendar-keys.logic.ts:80 fn isTypingTarget(el: EventTarget | null): boolean L6 | Whether a key landing on `el` is typing: an input, textarea or select, or a contenteditable element.
by src/lib/features/event-calendar/event-calendar-keys.logic.ts:isTypingTarget <- src/lib/app/global-keybindings.ts:43 in registerSlashSearchKeybinding call
by src/lib/features/event-calendar/event-calendar-keys.logic.ts:isTypingTarget <- src/lib/features/event-calendar/EventCalendarView.svelte:51 in handleKeydown call
sym src/lib/features/event-calendar/event-calendar-keys.logic.ts:99 fn resolveCalendarKey(e: CalendarKeyEvent, state: CalendarKeyState): CalendarKeyAction | null L25 | Maps a key press in the Calendar view to an action.
by src/lib/features/event-calendar/event-calendar-keys.logic.ts:resolveCalendarKey <- src/lib/features/event-calendar/EventCalendarView.svelte:50 in handleKeydown call
