# file card src/lib/plugins/word-count/word-count.logic.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/plugins/word-count/word-count.logic.ts ' codemap/files
file src/lib/plugins/word-count/word-count.logic.ts logic L20 module src/lib/plugins/word-count in1 t1
## imported-by
imp src/lib/plugins/word-count/WordCount.svelte:5 -> src/lib/plugins/word-count/word-count.logic.ts countWords,countCharacters,estimateReadingTime
## reach
in2 src/lib/plugins/word-count/word-count.logic.ts 1 files in 1 modules: src/lib/app(1)
out2 src/lib/plugins/word-count/word-count.logic.ts 0 files in 0 modules: -
## tests
test src/tests/lib/plugins/word-count/word-count.logic.test.ts imports src/lib/plugins/word-count/word-count.logic.ts mirror
## symbols
sym src/lib/plugins/word-count/word-count.logic.ts:4 fn countWords(text: string): number L6 | Counts the number of words in a text string, excluding YAML frontmatter
by src/lib/plugins/word-count/word-count.logic.ts:countWords <- src/lib/plugins/word-count/WordCount.svelte:22 in $effect@17 call
sym src/lib/plugins/word-count/word-count.logic.ts:12 fn countCharacters(text: string): number L4 | Counts the number of characters in a text string, excluding YAML frontmatter
by src/lib/plugins/word-count/word-count.logic.ts:countCharacters <- src/lib/plugins/word-count/WordCount.svelte:23 in $effect@17 call
sym src/lib/plugins/word-count/word-count.logic.ts:18 fn estimateReadingTime(wordCount: number): number L3 | Estimates reading time in minutes based on 200 words per minute
by src/lib/plugins/word-count/word-count.logic.ts:estimateReadingTime <- src/lib/plugins/word-count/WordCount.svelte:24 in $effect@17 call
