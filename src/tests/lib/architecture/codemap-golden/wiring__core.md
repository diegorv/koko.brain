# wiring core: registries and facets defined in core, who registers and who fires
cols: reg <id> sink <loc> | stores <binding> <mutation> | doc <text> · reg <id> facet <loc> · reg <id> read-by <loc> <name> · reg <id> fired-by <loc> in <fn> <- <loc> in <fn> · reg <id> registered-at <loc> in <fn> args=<text> -> <callbacks> · reg <id> invoked-at <loc> in <fn> · grep: grep -rF -- 'reg <id> ' codemap/wiring
reg src/lib/core/notes/hooks.ts:addSaveObserver sink src/lib/core/notes/hooks.ts:3 | stores observers push | doc Registers an after-save observer.
reg src/lib/core/notes/hooks.ts:addSaveObserver read-by src/lib/core/notes/hooks.ts:10 notifySaved
reg src/lib/core/notes/hooks.ts:addSaveObserver fired-by src/lib/core/notes/notes.service.ts:10 in writeNote <- src/lib/core/notes/notes.service.ts:14 in saveNote
reg src/lib/core/notes/hooks.ts:addSaveObserver registered-at src/lib/features/tags/tags.service.ts:8 in registerTagsHook args=onSaved -> src/lib/features/tags/tags.service.ts:onSaved
reg src/lib/core/notes/hooks.ts:addSaveObserver invoked-at src/lib/app/boot.ts:5 in boot
