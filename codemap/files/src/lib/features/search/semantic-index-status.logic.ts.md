# file card src/lib/features/search/semantic-index-status.logic.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/search/semantic-index-status.logic.ts ' codemap/files
file src/lib/features/search/semantic-index-status.logic.ts logic L52 module src/lib/features/search in1 t1
## imports
imp src/lib/features/search/semantic-index-status.logic.ts:1 -> src/lib/contracts/index.ts type:SemanticFileStatus
imp src/lib/features/search/semantic-index-status.logic.ts:3 -> src/lib/contracts/index.ts type:SemanticFileStatus
## imported-by
imp src/lib/features/search/SemanticIndexStatus.svelte:13 -> src/lib/features/search/semantic-index-status.logic.ts toVaultRelativePath,isMarkdownPath,resolveStatusLabel,type:SemanticFileStatus
## reach
in2 src/lib/features/search/semantic-index-status.logic.ts 1 files in 1 modules: src/lib/app(1)
out2 src/lib/features/search/semantic-index-status.logic.ts 52 files in 1 modules: src/lib/contracts(52)
## tests
test src/tests/lib/features/search/semantic-index-status.logic.test.ts imports src/lib/features/search/semantic-index-status.logic.ts mirror
## symbols
sym src/lib/features/search/semantic-index-status.logic.ts:3 reexport SemanticFileStatus = dto:SemanticFileStatus L1
sym src/lib/features/search/semantic-index-status.logic.ts:6 type IndexStatusLabelKind L7 | Resolved label kind shown in the status bar for the current markdown tab.
sym src/lib/features/search/semantic-index-status.logic.ts:15 interface IndexStatusLabel L4 | Visible label data resolved from a file status snapshot.
sym src/lib/features/search/semantic-index-status.logic.ts:27 fn toVaultRelativePath(absPath: string | null | undefined, vaultPath: string | null | undefined): string | null L6 | Converts an absolute tab path into the vault-relative path expected by `get_semantic_file_status`.
by src/lib/features/search/semantic-index-status.logic.ts:toVaultRelativePath <- src/lib/features/search/SemanticIndexStatus.svelte:32 in $effect@29 call
sym src/lib/features/search/semantic-index-status.logic.ts:35 fn isMarkdownPath(path: string | null | undefined): boolean L4 | Returns true when the path points at a markdown file.
by src/lib/features/search/semantic-index-status.logic.ts:isMarkdownPath <- src/lib/features/search/SemanticIndexStatus.svelte:38 in $effect@29 call
sym src/lib/features/search/semantic-index-status.logic.ts:44 fn resolveStatusLabel(status: SemanticFileStatus | null): IndexStatusLabel | null L9 | Maps a status snapshot to the label shown in the status bar.
by src/lib/features/search/semantic-index-status.logic.ts:resolveStatusLabel <- src/lib/features/search/SemanticIndexStatus.svelte:55 in label=$derived call
