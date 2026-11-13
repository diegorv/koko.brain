# file card src/lib/core/settings/heading-typography.logic.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/settings/heading-typography.logic.ts ' codemap/files
file src/lib/core/settings/heading-typography.logic.ts logic L35 module src/lib/core/settings in1 t4
## imports
imp src/lib/core/settings/heading-typography.logic.ts:1 -> src/lib/core/settings/settings.types.ts type:HeadingFontWeight,type:HeadingTypography
## imported-by
imp src/lib/core/settings/settings.service.ts:7 -> src/lib/core/settings/heading-typography.logic.ts headingTypographyToCssVars
## reach
in2 src/lib/core/settings/heading-typography.logic.ts 3 files in 3 modules: src/lib/app(1) src/lib/core/markdown-editor(1) src/lib/core/settings(1)
out2 src/lib/core/settings/heading-typography.logic.ts 2 files in 1 modules: src/lib/core/settings(2)
## tests
test src/tests/lib/core/settings/heading-typography.logic.test.ts imports src/lib/core/settings/heading-typography.logic.ts mirror
test src/tests/lib/core/markdown-editor/heading-fallbacks.test.ts imports src/lib/core/settings/heading-typography.logic.ts
test src/tests/lib/core/settings/settings.service.test.ts imports src/lib/core/settings/heading-typography.logic.ts
test src/tests/lib/features/canvas/canvas-markdown-css.test.ts imports src/lib/core/settings/heading-typography.logic.ts
## symbols
sym src/lib/core/settings/heading-typography.logic.ts:4 const FONT_WEIGHT_MAP: Record<HeadingFontWeight, string> L5 | Maps HeadingFontWeight to CSS font-weight numeric values
sym src/lib/core/settings/heading-typography.logic.ts:23 fn headingTypographyToCssVars(typography: HeadingTypography): Record<string, string> L13 | Converts heading typography settings into a flat map of CSS variable name → value pairs, ready to be set on `document.documentElement.style`.
by src/lib/core/settings/heading-typography.logic.ts:headingTypographyToCssVars <- src/lib/core/settings/settings.service.ts:287 in applyHeadingTypography call
