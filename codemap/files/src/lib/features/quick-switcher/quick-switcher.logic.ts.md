# file card src/lib/features/quick-switcher/quick-switcher.logic.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/features/quick-switcher/quick-switcher.logic.ts ' codemap/files
file src/lib/features/quick-switcher/quick-switcher.logic.ts logic L67 module src/lib/features/quick-switcher in1 t1
## imported-by
imp src/lib/features/quick-switcher/QuickSwitcher.svelte:27 -> src/lib/features/quick-switcher/quick-switcher.logic.ts createTargetLabel,matchSegments,parseCreatePath
## reach
in2 src/lib/features/quick-switcher/quick-switcher.logic.ts 1 files in 1 modules: src/lib/app(1)
out2 src/lib/features/quick-switcher/quick-switcher.logic.ts 0 files in 0 modules: -
## tests
test src/tests/lib/features/quick-switcher/quick-switcher.logic.test.ts imports src/lib/features/quick-switcher/quick-switcher.logic.ts mirror
## symbols
sym src/lib/features/quick-switcher/quick-switcher.logic.ts:2 type CreatePath L11 | Where a Quick Switcher "Create" puts its note, or why it refuses the query.
sym src/lib/features/quick-switcher/quick-switcher.logic.ts:22 fn parseCreatePath(query: string): CreatePath L15 | Splits a Quick Switcher query into the target folder and the note name: the last `/` segment is the note (`.md` appended unless present), the segments before i…
by src/lib/features/quick-switcher/quick-switcher.logic.ts:parseCreatePath <- src/lib/features/quick-switcher/QuickSwitcher.svelte:33 in createPath=$derived call +1
sym src/lib/features/quick-switcher/quick-switcher.logic.ts:39 fn createTargetLabel(folder: string): string L3 | The Create row's target: "in <folder>", or "in vault root" for `''`.
by src/lib/features/quick-switcher/quick-switcher.logic.ts:createTargetLabel <- src/lib/features/quick-switcher/QuickSwitcher.svelte:195 in (markup) markup
sym src/lib/features/quick-switcher/quick-switcher.logic.ts:44 interface MatchSegment L6 | A run of a row's name, matched by the query or not.
sym src/lib/features/quick-switcher/quick-switcher.logic.ts:57 fn matchSegments(text: string, positions: number[]): MatchSegment[] L11 | Splits `text` into runs of matched and unmatched characters, so a row highlights each run with one element.
by src/lib/features/quick-switcher/quick-switcher.logic.ts:matchSegments <- src/lib/features/quick-switcher/QuickSwitcher.svelte:142 in (markup) markup
