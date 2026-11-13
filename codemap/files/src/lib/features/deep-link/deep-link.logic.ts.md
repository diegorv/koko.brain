# file card src/lib/features/deep-link/deep-link.logic.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/deep-link/deep-link.logic.ts ' codemap/files
file src/lib/features/deep-link/deep-link.logic.ts logic L455 module src/lib/features/deep-link in3 t4
## imports
imp src/lib/features/deep-link/deep-link.logic.ts:1 -> src/lib/core/frontmatter/properties.logic.ts parseFrontmatterProperties,extractBody,rebuildContent
imp src/lib/features/deep-link/deep-link.logic.ts:6 -> src/lib/core/frontmatter/properties.types.ts type:Property
imp src/lib/features/deep-link/deep-link.logic.ts:7 -> src/lib/utils/path.ts vaultRelativeKey
imp src/lib/features/deep-link/deep-link.logic.ts:8 -> src/lib/features/deep-link/deep-link.types.ts type:DeepLinkActionType,type:OpenAction,type:NewAction,type:SearchAction,type:DailyAction,type:CaptureAction,type:CaptureKind,type:CaptureNoteAction,type:CaptureClipAction,type:CaptureLinkAction,type:CaptureShotAction,type:CaptureFileAction,type:ParseResult
imp src/lib/features/deep-link/deep-link.logic.ts:318 -> src/lib/utils/path.ts resolveFilePath
## imported-by
imp src/lib/app/deep-link-actions.ts:16 -> src/lib/features/deep-link/deep-link.logic.ts injectTagsIntoContent,injectTitleIntoContent,renderCaptureBody
imp src/lib/features/deep-link/deep-link.service.ts:16 -> src/lib/features/deep-link/deep-link.logic.ts parseDeepLinkUri,resolveFilePath
imp src/lib/features/note-action-bar/note-action-bar.service.ts:8 -> src/lib/features/deep-link/deep-link.logic.ts buildOpenNoteDeepLink
## reach
in2 src/lib/features/deep-link/deep-link.logic.ts 5 files in 4 modules: src/lib/app(2) src/lib/features/note-action-bar(1) src/lib/plugins/quick-capture(1) src/routes(1)
out2 src/lib/features/deep-link/deep-link.logic.ts 1 files in 1 modules: src/lib/utils(1)
## tests
test src/tests/lib/features/deep-link/deep-link.logic.test.ts imports src/lib/features/deep-link/deep-link.logic.ts mirror
test src/tests/lib/features/deep-link/deep-link-silent-new-overwrites.test.ts imports src/lib/features/deep-link/deep-link.logic.ts
test src/tests/lib/features/note-action-bar/NoteActionBar.test.ts imports src/lib/features/deep-link/deep-link.logic.ts
test src/tests/lib/features/note-action-bar/note-action-bar.service.test.ts imports src/lib/features/deep-link/deep-link.logic.ts
## symbols
sym src/lib/features/deep-link/deep-link.logic.ts:44 fn parseDeepLinkUri(uri: string): ParseResult L92 | Parses a `kokobrain://` URI string into a typed deep-link action.
by src/lib/features/deep-link/deep-link.logic.ts:parseDeepLinkUri <- src/lib/features/deep-link/deep-link.service.ts:124 in handleDeepLinkUrl call
sym src/lib/features/deep-link/deep-link.logic.ts:256 fn renderCaptureBody(action: CaptureAction): string L26 | Renders the markdown body for a v2 capture action.
by src/lib/features/deep-link/deep-link.logic.ts:renderCaptureBody <- src/lib/app/deep-link-actions.ts:165 in executeCaptureAction call
sym src/lib/features/deep-link/deep-link.logic.ts:318 reexport resolveFilePath = src/lib/utils/path.ts:resolveFilePath L1
sym src/lib/features/deep-link/deep-link.logic.ts:328 fn buildOpenNoteDeepLink(vaultName: string, vaultPath: string, notePath: string): string | null L5 | Builds the `kokobrain://open` link that opens `notePath` in the vault named `vaultName` (the inverse of the `open` branch of `parseDeepLinkUri`).
by src/lib/features/deep-link/deep-link.logic.ts:buildOpenNoteDeepLink <- src/lib/features/note-action-bar/note-action-bar.service.ts:60 in copyNoteDeepLink call
sym src/lib/features/deep-link/deep-link.logic.ts:385 fn injectTitleIntoContent(content: string, title: string): string L22 | Injects a `title` property into content's YAML frontmatter.
by src/lib/features/deep-link/deep-link.logic.ts:injectTitleIntoContent <- src/lib/app/deep-link-actions.ts:207 in executeCaptureAction call
sym src/lib/features/deep-link/deep-link.logic.ts:419 fn injectTagsIntoContent(content: string, tags: string[]): string L37 | Injects tags into content's YAML frontmatter.
by src/lib/features/deep-link/deep-link.logic.ts:injectTagsIntoContent <- src/lib/app/deep-link-actions.ts:208 in executeCaptureAction call
## locals
local src/lib/features/deep-link/deep-link.logic.ts:141 fn parseCaptureAction(vault: string, params: URLSearchParams): ParseResult L101
local src/lib/features/deep-link/deep-link.logic.ts:289 fn toFileUrl(path: string): string L4
local src/lib/features/deep-link/deep-link.logic.ts:299 fn pathBasename(path: string): string L5
local src/lib/features/deep-link/deep-link.logic.ts:309 fn buildSourceFooter(sourceUrl: string | undefined, sourceTitle: string | undefined): string | null L8
local src/lib/features/deep-link/deep-link.logic.ts:338 fn parseBooleanParam(value: string | null): boolean | undefined L4
local src/lib/features/deep-link/deep-link.logic.ts:347 fn parseOptionalParam(value: string | null): string | undefined L4
local src/lib/features/deep-link/deep-link.logic.ts:356 fn parseTitleParam(value: string | null): string | undefined L5
local src/lib/features/deep-link/deep-link.logic.ts:366 fn parseTagsParam(value: string | null): string[] | undefined L5
## calls
call src/lib/features/deep-link/deep-link.logic.ts:95 in parseDeepLinkUri -> src/lib/features/deep-link/deep-link.logic.ts:parseBooleanParam call +7
call src/lib/features/deep-link/deep-link.logic.ts:133 in parseDeepLinkUri -> src/lib/features/deep-link/deep-link.logic.ts:parseCaptureAction call
call src/lib/features/deep-link/deep-link.logic.ts:162 in parseCaptureAction -> src/lib/features/deep-link/deep-link.logic.ts:parseTagsParam call
call src/lib/features/deep-link/deep-link.logic.ts:163 in parseCaptureAction -> src/lib/features/deep-link/deep-link.logic.ts:parseOptionalParam call +6
call src/lib/features/deep-link/deep-link.logic.ts:203 in parseCaptureAction -> src/lib/features/deep-link/deep-link.logic.ts:parseTitleParam call
call src/lib/features/deep-link/deep-link.logic.ts:260 in renderCaptureBody -> src/lib/features/deep-link/deep-link.logic.ts:buildSourceFooter call +1
call src/lib/features/deep-link/deep-link.logic.ts:273 in renderCaptureBody -> src/lib/features/deep-link/deep-link.logic.ts:pathBasename call +1
call src/lib/features/deep-link/deep-link.logic.ts:274 in renderCaptureBody -> src/lib/features/deep-link/deep-link.logic.ts:toFileUrl call +1
call src/lib/features/deep-link/deep-link.logic.ts:329 in buildOpenNoteDeepLink -> src/lib/utils/path.ts:vaultRelativeKey call
call src/lib/features/deep-link/deep-link.logic.ts:389 in injectTitleIntoContent -> src/lib/core/frontmatter/properties.logic.ts:parseFrontmatterProperties call
call src/lib/features/deep-link/deep-link.logic.ts:390 in injectTitleIntoContent -> src/lib/core/frontmatter/properties.logic.ts:extractBody call
call src/lib/features/deep-link/deep-link.logic.ts:398 in injectTitleIntoContent -> src/lib/core/frontmatter/properties.logic.ts:rebuildContent call +1
call src/lib/features/deep-link/deep-link.logic.ts:422 in injectTagsIntoContent -> src/lib/core/frontmatter/properties.logic.ts:parseFrontmatterProperties call
call src/lib/features/deep-link/deep-link.logic.ts:423 in injectTagsIntoContent -> src/lib/core/frontmatter/properties.logic.ts:extractBody call
call src/lib/features/deep-link/deep-link.logic.ts:438 in injectTagsIntoContent -> src/lib/core/frontmatter/properties.logic.ts:rebuildContent call +2
