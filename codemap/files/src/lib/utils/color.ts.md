# file card src/lib/utils/color.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/utils/color.ts ' codemap/files
sections: imported-by, reach, tests, symbols, locals, calls
file src/lib/utils/color.ts other L244 module src/lib/utils in9 t21
## imported-by
imp src/lib/core/markdown-editor/extensions/live-preview/widgets/mermaid-widget.ts:2 -> src/lib/utils/color.ts isDarkColor
imp src/lib/core/settings/sections/ThemePreview.svelte:2 -> src/lib/utils/color.ts isDarkColor
imp src/lib/core/settings/theme-builder.logic.ts:2 -> src/lib/utils/color.ts ensureContrast,flatten,mixColors
imp src/lib/core/settings/theme-surfaces.logic.ts:1 -> src/lib/utils/color.ts ensureContrastOn,mixColors,shiftLightness,tint
imp src/lib/core/settings/theme.logic.ts:11 -> src/lib/utils/color.ts isDarkColor
imp src/lib/core/settings/theme.service.ts:1 -> src/lib/utils/color.ts isDarkColor
imp src/lib/features/collection/linear-calendar.logic.ts:1 -> src/lib/utils/color.ts labelColors
imp src/lib/features/rail-shell/rail-items.logic.ts:2 -> src/lib/utils/color.ts ensureContrastOn,labelColors,tint
imp src/lib/plugins/graph-view/graph-view.logic.ts:3 -> src/lib/utils/color.ts mixColors
## reach
in2 src/lib/utils/color.ts 28 files in 12 modules: src/lib/core/settings(7) src/lib/app(4) src/lib/features/rail-shell(4) src/lib/plugins/graph-view(3) src/lib/features/collection(2) +7 modules: q impact src/lib/utils/color.ts --depth 2
out2 src/lib/utils/color.ts 0 files in 0 modules: -
## tests
test src/tests/lib/utils/color-presets.test.ts imports src/lib/utils/color.ts mirror
test src/tests/lib/utils/color.test.ts imports src/lib/utils/color.ts mirror
test src/tests/lib/architecture/muted-text-alpha.test.ts imports src/lib/utils/color.ts
test src/tests/lib/components/ui/button/button.test.ts imports src/lib/utils/color.ts
test src/tests/lib/core/markdown-editor/extensions/composition-aware-bracket-matching.test.ts imports src/lib/utils/color.ts
test src/tests/lib/core/settings/settings.service.test.ts imports src/lib/utils/color.ts
test src/tests/lib/core/settings/theme-builder.logic.test.ts imports src/lib/utils/color.ts
test src/tests/lib/core/settings/theme-surfaces.logic.test.ts imports src/lib/utils/color.ts
test src/tests/lib/core/settings/theme.logic.test.ts imports src/lib/utils/color.ts
test src/tests/lib/features/collection/linear-calendar-logic.test.ts imports src/lib/utils/color.ts
test src/tests/lib/features/file-icons/file-icons.logic.test.ts imports src/lib/utils/color.ts
test src/tests/lib/features/note-list/NoteRow.test.ts imports src/lib/utils/color.ts
test src/tests/lib/features/properties/PropertyField.test.ts imports src/lib/utils/color.ts
test src/tests/lib/features/quick-switcher/QuickSwitcher.test.ts imports src/lib/utils/color.ts
test src/tests/lib/features/rail-shell/FilesNavigator.test.ts imports src/lib/utils/color.ts
test src/tests/lib/features/rail-shell/Rail.test.ts imports src/lib/utils/color.ts
test src/tests/lib/features/rail-shell/TypesNavigator.test.ts imports src/lib/utils/color.ts
test src/tests/lib/features/rail-shell/rail-items.logic.test.ts imports src/lib/utils/color.ts
test src/tests/lib/features/tags/TagItem.test.ts imports src/lib/utils/color.ts
test src/tests/lib/plugins/graph-view/graph-view.logic.test.ts imports src/lib/utils/color.ts
test src/tests/lib/plugins/queryjs/kb-ui.test.ts imports src/lib/utils/color.ts
## symbols
sym src/lib/utils/color.ts:48 fn flatten(color: string, base: string): string | null L7 | Composites `color` (alpha honored) over the opaque `base` into a 6-digit hex; null when either is unparseable.
by src/lib/utils/color.ts:flatten <- src/lib/core/settings/theme-builder.logic.ts:166 in withReadableContrast call +1
sym src/lib/utils/color.ts:61 fn tint(color: string, share: number, base: string): string | null L7 | Composites `color` at `share` of its own alpha over the opaque `base` into a 6-digit hex: what Tailwind's `bg-x/25` or `color-mix(in oklch, x 18%, transparent)…
by src/lib/utils/color.ts:tint <- src/lib/core/settings/theme-surfaces.logic.ts:43 in themeTint call
by src/lib/utils/color.ts:tint <- src/lib/features/rail-shell/rail-items.logic.ts:186 in railIconColor call
sym src/lib/utils/color.ts:84 fn isDarkColor(color: string): boolean | null L4 | True when a background color is dark (WCAG relative luminance below 0.2), false when light, null when the value is not a hex, rgb() or oklch() color.
by src/lib/utils/color.ts:isDarkColor <- src/lib/core/markdown-editor/extensions/live-preview/widgets/mermaid-widget.ts:17 in currentMermaidTheme call
by src/lib/utils/color.ts:isDarkColor <- src/lib/core/settings/sections/ThemePreview.svelte:15 in dark=$derived call
by src/lib/utils/color.ts:isDarkColor <- src/lib/core/settings/theme.logic.ts:41 in elevationVars call
by src/lib/utils/color.ts:isDarkColor <- src/lib/core/settings/theme.service.ts:32 in applyMode call
sym src/lib/utils/color.ts:94 fn contrastRatio(a: string, b: string): number | null L8 | WCAG contrast ratio of foreground `a` on background `b`, with a translucent `a` composited over `b` (`b`'s own alpha is ignored; flatten it first).
sym src/lib/utils/color.ts:140 fn ensureContrast(fg: string, bg: string, min: number): string L20 | Returns `fg` moved in OKLab toward white or black by the smallest 1% step that reaches `min` contrast on `bg`, keeping its hue family and any 8-digit alpha suf…
by src/lib/utils/color.ts:ensureContrast <- src/lib/core/settings/theme-builder.logic.ts:168 in withReadableContrast call +3
sym src/lib/utils/color.ts:167 fn ensureContrastOn(fg: string, bgs: string[], min: number): string L9 | `ensureContrast` against several backgrounds at once (a row and its hover or selected tint): lifts `fg` until it reaches `min` on each of `bgs`.
by src/lib/utils/color.ts:ensureContrastOn <- src/lib/core/settings/theme-surfaces.logic.ts:78 in readableOn call
by src/lib/utils/color.ts:ensureContrastOn <- src/lib/features/rail-shell/rail-items.logic.ts:188 in railIconColor call
sym src/lib/utils/color.ts:182 fn shiftLightness(color: string, delta: number): string | null L6 | Moves a color's OKLab lightness by `delta` (-1 to 1) keeping a and b, the TS twin of CSS `oklch(from x calc(l + delta) c h)`, as a 6-digit hex clamped to the s…
by src/lib/utils/color.ts:shiftLightness <- src/lib/core/settings/theme-surfaces.logic.ts:23 in themeSurface call +1
sym src/lib/utils/color.ts:193 fn mixColors(a: string, b: string, t = 0.5): string | null L8 | OKLab mix of two colors as a 6-digit hex (alpha ignored): `t` is the share of `b`, 0.5 (the midpoint) by default.
by src/lib/utils/color.ts:mixColors <- src/lib/core/settings/theme-builder.logic.ts:224 in buildTheme call
by src/lib/utils/color.ts:mixColors <- src/lib/core/settings/theme-surfaces.logic.ts:23 in themeSurface call +1
by src/lib/utils/color.ts:mixColors <- src/lib/plugins/graph-view/graph-view.logic.ts:287 in graphPalette call +4
sym src/lib/utils/color.ts:206 fn colorDistance(a: string, b: string): number | null L8 | Perceptual distance between two colors: the Euclidean OKLab distance scaled by 100 (black to white is 100), alpha ignored.
sym src/lib/utils/color.ts:239 fn labelColors(color: string): { fill: string; text: '#000000' | '#ffffff' } | null L6 | Fill and text for a label drawn on `color` (a badge, an event bar).
by src/lib/utils/color.ts:labelColors <- src/lib/features/collection/linear-calendar.logic.ts:305 in barColors call
by src/lib/utils/color.ts:labelColors <- src/lib/features/rail-shell/rail-items.logic.ts:239 in railBadgeColors call
## locals
local src/lib/utils/color.ts:8 fn clamp01(v: number) L1
local src/lib/utils/color.ts:14 fn parseRgba(color: string): [number, number, number, number] | null L21
local src/lib/utils/color.ts:37 fn parseRgb(color: string): [number, number, number] | null L4
local src/lib/utils/color.ts:43 fn toHex(rgb: number[]): string L3
local src/lib/utils/color.ts:70 fn toLinear(c: number): number L4
local src/lib/utils/color.ts:76 fn luminance([r, g, b]: [number, number, number]): number L3
local src/lib/utils/color.ts:104 fn toOklab([r, g, b]: number[]): number[] L10
local src/lib/utils/color.ts:116 fn oklabToHex([L, A, B]: number[]): string L17
local src/lib/utils/color.ts:219 fn apcaLuminance([r, g, b]: [number, number, number]): number L4
local src/lib/utils/color.ts:225 fn apcaContrast(text: [number, number, number], bg: [number, number, number]): number L6
## calls
call src/lib/utils/color.ts:24 in parseRgba -> src/lib/utils/color.ts:clamp01 call +1
call src/lib/utils/color.ts:29 in parseRgba -> src/lib/utils/color.ts:oklabToHex call
call src/lib/utils/color.ts:29 in parseRgba -> src/lib/utils/color.ts:parseRgba call
call src/lib/utils/color.ts:38 in parseRgb -> src/lib/utils/color.ts:parseRgba call
call src/lib/utils/color.ts:49 in flatten -> src/lib/utils/color.ts:parseRgba call
call src/lib/utils/color.ts:50 in flatten -> src/lib/utils/color.ts:parseRgb call
call src/lib/utils/color.ts:53 in flatten -> src/lib/utils/color.ts:toHex call
call src/lib/utils/color.ts:62 in tint -> src/lib/utils/color.ts:parseRgba call
call src/lib/utils/color.ts:63 in tint -> src/lib/utils/color.ts:parseRgb call
call src/lib/utils/color.ts:66 in tint -> src/lib/utils/color.ts:toHex call
call src/lib/utils/color.ts:77 in luminance -> src/lib/utils/color.ts:toLinear call +2
call src/lib/utils/color.ts:85 in isDarkColor -> src/lib/utils/color.ts:parseRgb call
call src/lib/utils/color.ts:86 in isDarkColor -> src/lib/utils/color.ts:luminance call
call src/lib/utils/color.ts:95 in contrastRatio -> src/lib/utils/color.ts:flatten call
call src/lib/utils/color.ts:96 in contrastRatio -> src/lib/utils/color.ts:parseRgb call +1
call src/lib/utils/color.ts:99 in contrastRatio -> src/lib/utils/color.ts:luminance call +1
call src/lib/utils/color.ts:141 in ensureContrast -> src/lib/utils/color.ts:contrastRatio call +3
call src/lib/utils/color.ts:142 in ensureContrast -> src/lib/utils/color.ts:parseRgb call +1
call src/lib/utils/color.ts:146 in ensureContrast -> src/lib/utils/color.ts:toLinear ref
call src/lib/utils/color.ts:146 in ensureContrast -> src/lib/utils/color.ts:toOklab call +2
call src/lib/utils/color.ts:150 in ensureContrast -> src/lib/utils/color.ts:luminance call +1
call src/lib/utils/color.ts:155 in ensureContrast -> src/lib/utils/color.ts:oklabToHex call
call src/lib/utils/color.ts:171 in ensureContrastOn -> src/lib/utils/color.ts:ensureContrast call
call src/lib/utils/color.ts:183 in shiftLightness -> src/lib/utils/color.ts:parseRgb call
call src/lib/utils/color.ts:185 in shiftLightness -> src/lib/utils/color.ts:toLinear ref
call src/lib/utils/color.ts:185 in shiftLightness -> src/lib/utils/color.ts:toOklab call
call src/lib/utils/color.ts:186 in shiftLightness -> src/lib/utils/color.ts:oklabToHex call
call src/lib/utils/color.ts:194 in mixColors -> src/lib/utils/color.ts:parseRgb call +1
call src/lib/utils/color.ts:197 in mixColors -> src/lib/utils/color.ts:toLinear ref +1
call src/lib/utils/color.ts:197 in mixColors -> src/lib/utils/color.ts:toOklab call +1
call src/lib/utils/color.ts:199 in mixColors -> src/lib/utils/color.ts:oklabToHex call
call src/lib/utils/color.ts:207 in colorDistance -> src/lib/utils/color.ts:parseRgb call +1
call src/lib/utils/color.ts:210 in colorDistance -> src/lib/utils/color.ts:toLinear ref +1
call src/lib/utils/color.ts:210 in colorDistance -> src/lib/utils/color.ts:toOklab call +1
call src/lib/utils/color.ts:226 in apcaContrast -> src/lib/utils/color.ts:apcaLuminance call +1
call src/lib/utils/color.ts:240 in labelColors -> src/lib/utils/color.ts:parseRgb call
call src/lib/utils/color.ts:242 in labelColors -> src/lib/utils/color.ts:apcaContrast call +1
call src/lib/utils/color.ts:243 in labelColors -> src/lib/utils/color.ts:ensureContrast call
