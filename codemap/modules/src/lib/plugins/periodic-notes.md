# module card src/lib/plugins/periodic-notes
cols: module <path> <layer> files <n> in-modules <n> out-modules <n> pub <public>/<exports> ipc <called>/<served> card ~<k>k · dep <from> -> <to> <file pairs> · in2/out2 <module> <n> modules: <module>(<via>) · entry <file> ext-in<n> <importers> · file … · sym … · grep: grep -rF -- '-> src/lib/plugins/periodic-notes ' codemap/modules
module src/lib/plugins/periodic-notes plugins files 3 in-modules 5 out-modules 7 pub 10/20 ipc 0/0 card ~1.5k
## neighbors
dep src/lib/app -> src/lib/plugins/periodic-notes 7
dep src/lib/plugins/calendar -> src/lib/plugins/periodic-notes 1
dep src/lib/plugins/mods -> src/lib/plugins/periodic-notes 1
dep src/lib/plugins/one-on-one -> src/lib/plugins/periodic-notes 1
dep src/lib/plugins/quick-capture -> src/lib/plugins/periodic-notes 1
dep src/lib/plugins/periodic-notes -> src/lib/components 2
dep src/lib/plugins/periodic-notes -> src/lib/core/editor 1
dep src/lib/plugins/periodic-notes -> src/lib/core/note-creator 1
dep src/lib/plugins/periodic-notes -> src/lib/core/settings 3
dep src/lib/plugins/periodic-notes -> src/lib/core/vault 1
dep src/lib/plugins/periodic-notes -> src/lib/features/event-calendar 1
dep src/lib/plugins/periodic-notes -> src/lib/utils 2
in2 src/lib/plugins/periodic-notes 1 modules: src/routes(2)
out2 src/lib/plugins/periodic-notes 3 modules: src/lib/core/filesystem(4) src/lib/contracts(2) src/lib/core/markdown-editor(1)
## entry files
entry src/lib/plugins/periodic-notes/periodic-notes.service.ts ext-in7 src/lib/app/commands.ts src/lib/app/deep-link-actions.ts src/lib/app/editor-host.ts src/lib/app/lifecycle/app-lifecycle.service.ts src/lib/app/tauri-listeners.service.ts more importers 2 not shown: src/lib/plugins/calendar(1) src/lib/plugins/mods(1): q importers src/lib/plugins/periodic-notes/periodic-notes.service.ts
entry src/lib/plugins/periodic-notes/periodic-notes.logic.ts ext-in4 src/lib/app/deep-link-actions.ts src/lib/app/editor-host.ts src/lib/plugins/one-on-one/one-on-one.logic.ts src/lib/plugins/quick-capture/note-composer.logic.ts
## files
file src/lib/plugins/periodic-notes/DailyNoteButton.svelte component L23 module src/lib/plugins/periodic-notes in0 t0
file src/lib/plugins/periodic-notes/periodic-notes.logic.ts logic L281 module src/lib/plugins/periodic-notes in5 t4
file src/lib/plugins/periodic-notes/periodic-notes.service.ts service L170 module src/lib/plugins/periodic-notes in8 t9
## public
sym src/lib/plugins/periodic-notes/periodic-notes.logic.ts:10 fn buildPeriodicNotePath(vaultPath: string, folder: string, format: string, date: dayjs.Dayjs): string L13 | Builds the full absolute path for a periodic note given a specific date.
sym src/lib/plugins/periodic-notes/periodic-notes.logic.ts:35 fn buildWikilinkPath(folder: string, format: string, date: dayjs.Dayjs): string L4 | Builds a wikilink-compatible relative path (no vault prefix, no `.md` extension).
sym src/lib/plugins/periodic-notes/periodic-notes.logic.ts:206 fn detectPeriodicNoteType(target: string, settings: PeriodicNotesSettings): { periodType: PeriodType; date: dayjs.Dayjs } | null L25 | Detects whether a wikilink target matches a periodic note pattern.
sym src/lib/plugins/periodic-notes/periodic-notes.service.ts:23 fn dailyNotePath(date: Date = new Date()): string L6 | Absolute path of the daily note of `date`, from Settings > Periodic Notes.
sym src/lib/plugins/periodic-notes/periodic-notes.service.ts:38 fn openOrCreatePeriodicNoteForDate(periodType: PeriodType, date: dayjs.Dayjs): Promise<void> L24 | Opens or creates a periodic note for a specific date.
sym src/lib/plugins/periodic-notes/periodic-notes.service.ts:75 fn openOrCreateDailyNote(): Promise<void> L3 | Opens today's daily note, creating it from a template if it doesn't exist.
sym src/lib/plugins/periodic-notes/periodic-notes.service.ts:83 fn registerCalendarDailyNoteOpener(): () => void L3 | Lets the Calendar's day headers open the daily note of their day.
sym src/lib/plugins/periodic-notes/periodic-notes.service.ts:92 fn autoOpenDailyNote(): Promise<void> L30 | Auto-opens (and optionally pins) today's daily note on vault startup.
sym src/lib/plugins/periodic-notes/periodic-notes.service.ts:129 fn refreshDailyNoteIfDateChanged(): Promise<void> L32 | Refreshes the auto-pinned daily note when the date has changed.
sym src/lib/plugins/periodic-notes/periodic-notes.service.ts:163 fn resetPeriodicNotes(): void L3 | Resets periodic notes module state.
## debt
-
