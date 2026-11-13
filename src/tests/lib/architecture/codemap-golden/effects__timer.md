# effects timer: one fx line per site, by sink, file, line
cols: fx <loc> <sink> [<arg>] in <enclosing> · grep: grep -F -- ' <sink> ' codemap/effects/timer.md
fx src/lib/core/notes/notes.service.ts:22 timer-wrap.debounce args=() => void loadTags(), 300 as scheduleLoad in scheduleLoad
fx src/lib/core/notes/notes.service.ts:24 timer.setTimeout delay=0 in flushLater
fx src/lib/utils/debounce.ts:6 timer.setTimeout delay=delay in debounce
