# file card src/lib/features/deep-link/deep-link.types.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/deep-link/deep-link.types.ts ' codemap/files
file src/lib/features/deep-link/deep-link.types.ts types L175 module src/lib/features/deep-link in5 t0
## imported-by
imp src/lib/app/deep-link-actions.ts:22 -> src/lib/features/deep-link/deep-link.types.ts type:CaptureAction,type:DailyAction
imp src/lib/features/deep-link/deep-link.logic.ts:8 -> src/lib/features/deep-link/deep-link.types.ts type:DeepLinkActionType,type:OpenAction,type:NewAction,type:SearchAction,type:DailyAction,type:CaptureAction,type:CaptureKind,type:CaptureNoteAction,type:CaptureClipAction,type:CaptureLinkAction,type:CaptureShotAction,type:CaptureFileAction,type:ParseResult
imp src/lib/features/deep-link/deep-link.service.ts:17 -> src/lib/features/deep-link/deep-link.types.ts type:DeepLinkAction,type:NewAction
imp src/lib/features/deep-link/deep-link.store.svelte.ts:1 -> src/lib/features/deep-link/deep-link.types.ts type:DeepLinkAction
imp src/lib/plugins/quick-capture/quick-capture.service.ts:6 -> src/lib/features/deep-link/deep-link.types.ts type:CaptureAction,type:CaptureKind
## reach
in2 src/lib/features/deep-link/deep-link.types.ts 4 files in 3 modules: src/lib/app(2) src/lib/features/note-action-bar(1) src/routes(1)
out2 src/lib/features/deep-link/deep-link.types.ts 0 files in 0 modules: -
## tests
test src/tests/lib/features/deep-link/deep-link.logic.test.ts imports-type src/lib/features/deep-link/deep-link.types.ts
test src/tests/lib/features/deep-link/deep-link.service.test.ts imports-type src/lib/features/deep-link/deep-link.types.ts
test src/tests/lib/features/deep-link/deep-link.store.test.ts imports-type src/lib/features/deep-link/deep-link.types.ts
## symbols
sym src/lib/features/deep-link/deep-link.types.ts:2 type DeepLinkActionType L1 | All supported deep-link URI actions
by src/lib/features/deep-link/deep-link.types.ts:DeepLinkActionType <- src/lib/features/deep-link/deep-link.logic.ts:9 in (module) import
sym src/lib/features/deep-link/deep-link.types.ts:12 interface OpenAction L7 | kokobrain://open?vault=X&file=Y&path=Z — open a vault and/or file
by src/lib/features/deep-link/deep-link.types.ts:OpenAction <- src/lib/features/deep-link/deep-link.logic.ts:10 in (module) import
sym src/lib/features/deep-link/deep-link.types.ts:21 interface NewAction L19 | kokobrain://new?vault=X&name=Y&content=Z&silent=true&append=true — create a new note
by src/lib/features/deep-link/deep-link.types.ts:NewAction <- src/lib/features/deep-link/deep-link.logic.ts:11 in (module) import
by src/lib/features/deep-link/deep-link.types.ts:NewAction <- src/lib/features/deep-link/deep-link.service.ts:17 in (module) import
sym src/lib/features/deep-link/deep-link.types.ts:42 interface SearchAction L5 | kokobrain://search?vault=X&query=Y — open search with a query
by src/lib/features/deep-link/deep-link.types.ts:SearchAction <- src/lib/features/deep-link/deep-link.logic.ts:12 in (module) import
sym src/lib/features/deep-link/deep-link.types.ts:49 interface DailyAction L11 | kokobrain://daily?vault=X — open or create today's daily note
by src/lib/features/deep-link/deep-link.types.ts:DailyAction <- src/lib/app/deep-link-actions.ts:22 in (module) import
by src/lib/features/deep-link/deep-link.types.ts:DailyAction <- src/lib/features/deep-link/deep-link.logic.ts:13 in (module) import
sym src/lib/features/deep-link/deep-link.types.ts:72 type CaptureKind L1 | Capture kinds in the v2 capture schema.
by src/lib/features/deep-link/deep-link.types.ts:CaptureKind <- src/lib/features/deep-link/deep-link.logic.ts:15 in (module) import
by src/lib/features/deep-link/deep-link.types.ts:CaptureKind <- src/lib/plugins/quick-capture/quick-capture.service.ts:6 in (module) import
sym src/lib/features/deep-link/deep-link.types.ts:95 interface CaptureNoteAction L5 | kokobrain://capture?v=2&kind=note&vault=X&text=Y — capture a free-form note
by src/lib/features/deep-link/deep-link.types.ts:CaptureNoteAction <- src/lib/features/deep-link/deep-link.logic.ts:16 in (module) import
sym src/lib/features/deep-link/deep-link.types.ts:102 interface CaptureClipAction L5 | kokobrain://capture?v=2&kind=clip&vault=X&text=Y&source_url=Z — capture highlighted text from a page
by src/lib/features/deep-link/deep-link.types.ts:CaptureClipAction <- src/lib/features/deep-link/deep-link.logic.ts:17 in (module) import
sym src/lib/features/deep-link/deep-link.types.ts:109 interface CaptureLinkAction L7 | kokobrain://capture?v=2&kind=link&vault=X&url=Y&title=Z — capture a canonical link
by src/lib/features/deep-link/deep-link.types.ts:CaptureLinkAction <- src/lib/features/deep-link/deep-link.logic.ts:18 in (module) import
sym src/lib/features/deep-link/deep-link.types.ts:125 interface CaptureShotAction L14 | kokobrain://capture?v=2&kind=shot&vault=X&path=/abs/path.png&mime=image/png — capture a screenshot file path.
by src/lib/features/deep-link/deep-link.types.ts:CaptureShotAction <- src/lib/features/deep-link/deep-link.logic.ts:19 in (module) import
sym src/lib/features/deep-link/deep-link.types.ts:145 interface CaptureFileAction L9 | kokobrain://capture?v=2&kind=file&vault=X&path=/abs/path&mime=...&original_name=notes.pdf — capture an arbitrary local file path.
by src/lib/features/deep-link/deep-link.types.ts:CaptureFileAction <- src/lib/features/deep-link/deep-link.logic.ts:20 in (module) import
sym src/lib/features/deep-link/deep-link.types.ts:162 type CaptureAction L6 | Discriminated union of v2 capture actions, branched by `kind`.
by src/lib/features/deep-link/deep-link.types.ts:CaptureAction <- src/lib/app/deep-link-actions.ts:22 in (module) import
by src/lib/features/deep-link/deep-link.types.ts:CaptureAction <- src/lib/features/deep-link/deep-link.logic.ts:14 in (module) import
by src/lib/features/deep-link/deep-link.types.ts:CaptureAction <- src/lib/plugins/quick-capture/quick-capture.service.ts:6 in (module) import
sym src/lib/features/deep-link/deep-link.types.ts:170 type DeepLinkAction L1 | Discriminated union of all deep-link actions
by src/lib/features/deep-link/deep-link.types.ts:DeepLinkAction <- src/lib/features/deep-link/deep-link.service.ts:17 in (module) import
by src/lib/features/deep-link/deep-link.types.ts:DeepLinkAction <- src/lib/features/deep-link/deep-link.store.svelte.ts:1 in (module) import
sym src/lib/features/deep-link/deep-link.types.ts:173 type ParseResult L3 | Result of parsing a deep-link URI — either a valid action or an error
by src/lib/features/deep-link/deep-link.types.ts:ParseResult <- src/lib/features/deep-link/deep-link.logic.ts:21 in (module) import
