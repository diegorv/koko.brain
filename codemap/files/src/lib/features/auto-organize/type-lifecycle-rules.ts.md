# file card src/lib/features/auto-organize/type-lifecycle-rules.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/auto-organize/type-lifecycle-rules.ts ' codemap/files
file src/lib/features/auto-organize/type-lifecycle-rules.ts other L62 module src/lib/features/auto-organize in1 t1
## imports
imp src/lib/features/auto-organize/type-lifecycle-rules.ts:1 -> src/lib/features/type-definitions/type-definitions.logic.ts type:TypeMetadata
imp src/lib/features/auto-organize/type-lifecycle-rules.ts:2 -> src/lib/features/auto-organize/auto-organize.types.ts type:AutoOrganizeRule
## imported-by
imp src/lib/features/auto-organize/auto-organize.service.ts:43 -> src/lib/features/auto-organize/type-lifecycle-rules.ts generateLifecycleRules
## reach
in2 src/lib/features/auto-organize/type-lifecycle-rules.ts 2 files in 2 modules: src/lib/app(1) src/lib/features/auto-organize(1)
out2 src/lib/features/auto-organize/type-lifecycle-rules.ts 5 files in 5 modules: src/lib/core/filesystem(1) src/lib/core/frontmatter(1) src/lib/features/collection(1) src/lib/features/file-icons(1) src/lib/types(1)
## tests
test src/tests/lib/features/auto-organize/type-lifecycle-rules.test.ts imports src/lib/features/auto-organize/type-lifecycle-rules.ts mirror
## symbols
sym src/lib/features/auto-organize/type-lifecycle-rules.ts:22 fn generateLifecycleRules(typeMetadataMap: Map<string, TypeMetadata>): Array<AutoOrganizeRule & { expression: string }> L41 | Generates auto-organize rules from type definitions that have `archiveTo` configured.
by src/lib/features/auto-organize/type-lifecycle-rules.ts:generateLifecycleRules <- src/lib/features/auto-organize/auto-organize.service.ts:296 in evaluateAndMove call
