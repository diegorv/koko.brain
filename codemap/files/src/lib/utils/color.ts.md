# file card src/lib/utils/color.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/utils/color.ts ' codemap/files
file src/lib/utils/color.ts other L159 module src/lib/utils in7 t6
## imported-by
imp src/lib/core/markdown-editor/extensions/live-preview/widgets/mermaid-widget.ts:2 -> src/lib/utils/color.ts isDarkColor
imp src/lib/core/settings/sections/ThemePreview.svelte:2 -> src/lib/utils/color.ts isDarkColor
imp src/lib/core/settings/theme-builder.logic.ts:2 -> src/lib/utils/color.ts ensureContrast,flatten,mixColors
imp src/lib/core/settings/theme.logic.ts:11 -> src/lib/utils/color.ts isDarkColor
imp src/lib/core/settings/theme.service.ts:1 -> src/lib/utils/color.ts isDarkColor
imp src/lib/features/collection/linear-calendar.logic.ts:1 -> src/lib/utils/color.ts contrastRatio
imp src/lib/plugins/graph-view/graph-view.logic.ts:3 -> src/lib/utils/color.ts mixColors
## reach
in2 src/lib/utils/color.ts 17 files in 7 modules: src/lib/core/settings(7) src/lib/plugins/graph-view(3) src/lib/features/collection(2) src/routes(2) src/lib/app(1) +2 modules: q impact src/lib/utils/color.ts --depth 2
out2 src/lib/utils/color.ts 0 files in 0 modules: -
## tests
test src/tests/lib/utils/color.test.ts imports src/lib/utils/color.ts mirror
test src/tests/lib/core/settings/settings.service.test.ts imports src/lib/utils/color.ts
test src/tests/lib/core/settings/theme-builder.logic.test.ts imports src/lib/utils/color.ts
test src/tests/lib/core/settings/theme.logic.test.ts imports src/lib/utils/color.ts
test src/tests/lib/features/collection/linear-calendar-logic.test.ts imports src/lib/utils/color.ts
test src/tests/lib/plugins/graph-view/graph-view.logic.test.ts imports src/lib/utils/color.ts
## symbols
sym src/lib/utils/color.ts:48 fn flatten(color: string, base: string): string | null L7 | Composites `color` (alpha honored) over the opaque `base` into a 6-digit hex; null when either is unparseable.
by src/lib/utils/color.ts:flatten <- src/lib/core/settings/theme-builder.logic.ts:166 in withReadableContrast call +1
sym src/lib/utils/color.ts:71 fn isDarkColor(color: string): boolean | null L4 | True when a background color is dark (WCAG relative luminance below 0.2), false when light, null when the value is not a hex, rgb() or oklch() color.
by src/lib/utils/color.ts:isDarkColor <- src/lib/core/markdown-editor/extensions/live-preview/widgets/mermaid-widget.ts:17 in currentMermaidTheme call
by src/lib/utils/color.ts:isDarkColor <- src/lib/core/settings/sections/ThemePreview.svelte:15 in dark=$derived call
by src/lib/utils/color.ts:isDarkColor <- src/lib/core/settings/theme.logic.ts:41 in elevationVars call
by src/lib/utils/color.ts:isDarkColor <- src/lib/core/settings/theme.service.ts:31 in applyMode call
sym src/lib/utils/color.ts:81 fn contrastRatio(a: string, b: string): number | null L8 | WCAG contrast ratio of foreground `a` on background `b`, with a translucent `a` composited over `b` (`b`'s own alpha is ignored; flatten it first).
by src/lib/utils/color.ts:contrastRatio <- src/lib/features/collection/linear-calendar.logic.ts:305 in barTextColor call +1
sym src/lib/utils/color.ts:127 fn ensureContrast(fg: string, bg: string, min: number): string L20 | Returns `fg` moved in OKLab toward white or black by the smallest 1% step that reaches `min` contrast on `bg`, keeping its hue family and any 8-digit alpha suf…
by src/lib/utils/color.ts:ensureContrast <- src/lib/core/settings/theme-builder.logic.ts:168 in withReadableContrast call +3
sym src/lib/utils/color.ts:152 fn mixColors(a: string, b: string, t = 0.5): string | null L8 | OKLab mix of two colors as a 6-digit hex (alpha ignored): `t` is the share of `b`, 0.5 (the midpoint) by default.
by src/lib/utils/color.ts:mixColors <- src/lib/core/settings/theme-builder.logic.ts:224 in buildTheme call
by src/lib/utils/color.ts:mixColors <- src/lib/plugins/graph-view/graph-view.logic.ts:210 in graphPalette call +4
## locals
local src/lib/utils/color.ts:8 fn clamp01(v: number) L1
local src/lib/utils/color.ts:14 fn parseRgba(color: string): [number, number, number, number] | null L21
local src/lib/utils/color.ts:37 fn parseRgb(color: string): [number, number, number] | null L4
local src/lib/utils/color.ts:43 fn toHex(rgb: number[]): string L3
local src/lib/utils/color.ts:57 fn toLinear(c: number): number L4
local src/lib/utils/color.ts:63 fn luminance([r, g, b]: [number, number, number]): number L3
local src/lib/utils/color.ts:91 fn toOklab([r, g, b]: number[]): number[] L10
local src/lib/utils/color.ts:103 fn oklabToHex([L, A, B]: number[]): string L17
## calls
call src/lib/utils/color.ts:24 in parseRgba -> src/lib/utils/color.ts:clamp01 call +1
call src/lib/utils/color.ts:29 in parseRgba -> src/lib/utils/color.ts:oklabToHex call
call src/lib/utils/color.ts:29 in parseRgba -> src/lib/utils/color.ts:parseRgba call
call src/lib/utils/color.ts:38 in parseRgb -> src/lib/utils/color.ts:parseRgba call
call src/lib/utils/color.ts:49 in flatten -> src/lib/utils/color.ts:parseRgba call
call src/lib/utils/color.ts:50 in flatten -> src/lib/utils/color.ts:parseRgb call
call src/lib/utils/color.ts:53 in flatten -> src/lib/utils/color.ts:toHex call
call src/lib/utils/color.ts:64 in luminance -> src/lib/utils/color.ts:toLinear call +2
call src/lib/utils/color.ts:72 in isDarkColor -> src/lib/utils/color.ts:parseRgb call
call src/lib/utils/color.ts:73 in isDarkColor -> src/lib/utils/color.ts:luminance call
call src/lib/utils/color.ts:82 in contrastRatio -> src/lib/utils/color.ts:flatten call
call src/lib/utils/color.ts:83 in contrastRatio -> src/lib/utils/color.ts:parseRgb call +1
call src/lib/utils/color.ts:86 in contrastRatio -> src/lib/utils/color.ts:luminance call +1
call src/lib/utils/color.ts:128 in ensureContrast -> src/lib/utils/color.ts:contrastRatio call +3
call src/lib/utils/color.ts:129 in ensureContrast -> src/lib/utils/color.ts:parseRgb call +1
call src/lib/utils/color.ts:133 in ensureContrast -> src/lib/utils/color.ts:toLinear ref
call src/lib/utils/color.ts:133 in ensureContrast -> src/lib/utils/color.ts:toOklab call +2
call src/lib/utils/color.ts:137 in ensureContrast -> src/lib/utils/color.ts:luminance call +1
call src/lib/utils/color.ts:142 in ensureContrast -> src/lib/utils/color.ts:oklabToHex call
call src/lib/utils/color.ts:153 in mixColors -> src/lib/utils/color.ts:parseRgb call +1
call src/lib/utils/color.ts:156 in mixColors -> src/lib/utils/color.ts:toLinear ref +1
call src/lib/utils/color.ts:156 in mixColors -> src/lib/utils/color.ts:toOklab call +1
call src/lib/utils/color.ts:158 in mixColors -> src/lib/utils/color.ts:oklabToHex call
