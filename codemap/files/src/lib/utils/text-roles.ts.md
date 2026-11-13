# file card src/lib/utils/text-roles.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/utils/text-roles.ts ' codemap/files
file src/lib/utils/text-roles.ts other L6 module src/lib/utils in1 t1
## imported-by
imp src/lib/utils.ts:4 -> src/lib/utils/text-roles.ts TEXT_ROLES
## reach
in2 src/lib/utils/text-roles.ts 54 files in 1 modules: src/lib/components(54)
out2 src/lib/utils/text-roles.ts 0 files in 0 modules: -
## tests
test src/tests/lib/utils/text-roles.test.ts imports src/lib/utils/text-roles.ts mirror
## symbols
sym src/lib/utils/text-roles.ts:6 const TEXT_ROLES L1 | Named font sizes of the app chrome, defined as `--text-<role>` in the `@theme` block of `src/app.css` (which holds the values and their meaning).
by src/lib/utils/text-roles.ts:TEXT_ROLES <- src/lib/utils.ts:8 in twMerge ref
