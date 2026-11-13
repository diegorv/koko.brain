# file card src/lib/utils/note-date.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/utils/note-date.ts ' codemap/files
file src/lib/utils/note-date.ts other L57 module src/lib/utils in3 t1
## imported-by
imp src/lib/features/rail-shell/lens.logic.ts:16 -> src/lib/utils/note-date.ts noteDateKey,parseDateKey
imp src/lib/plugins/calendar/day-lens.logic.ts:2 -> src/lib/utils/note-date.ts parseDateKey
imp src/lib/plugins/one-on-one/one-on-one.logic.ts:7 -> src/lib/utils/note-date.ts parseDateKey
## reach
in2 src/lib/utils/note-date.ts 22 files in 5 modules: src/lib/features/rail-shell(11) src/lib/app(4) src/lib/plugins/one-on-one(4) src/lib/plugins/calendar(2) src/lib/features/search(1)
out2 src/lib/utils/note-date.ts 0 files in 0 modules: -
## tests
test src/tests/lib/utils/note-date.test.ts imports src/lib/utils/note-date.ts mirror
## symbols
sym src/lib/utils/note-date.ts:7 interface NoteDateSources L8 | The sources a note's day can come from.
sym src/lib/utils/note-date.ts:31 fn parseDateKey(value: unknown): string | null L14 | Parses a frontmatter date value into a 'YYYY-MM-DD' key in local time.
by src/lib/utils/note-date.ts:parseDateKey <- src/lib/features/rail-shell/lens.logic.ts:81 in todayLensDay call
by src/lib/utils/note-date.ts:parseDateKey <- src/lib/plugins/calendar/day-lens.logic.ts:20 in parseRailDay call
by src/lib/utils/note-date.ts:parseDateKey <- src/lib/plugins/one-on-one/one-on-one.logic.ts:161 in buildMyPeople call
sym src/lib/utils/note-date.ts:51 fn noteDateKey({ date, created, diskCreatedAt }: NoteDateSources): string | null L7 | The day a note belongs to (the PRD's "note date"): frontmatter `date`, else frontmatter `created`, else the disk creation time.
by src/lib/utils/note-date.ts:noteDateKey <- src/lib/features/rail-shell/lens.logic.ts:264 in entryNoteDate call
## calls
call src/lib/utils/note-date.ts:53 in noteDateKey -> src/lib/utils/note-date.ts:parseDateKey call +1
