# file card src/lib/core/settings/theme-surfaces.logic.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/settings/theme-surfaces.logic.ts ' codemap/files
file src/lib/core/settings/theme-surfaces.logic.ts logic L80 module src/lib/core/settings in8 t9
## imports
imp src/lib/core/settings/theme-surfaces.logic.ts:1 -> src/lib/utils/color.ts ensureContrastOn,mixColors,shiftLightness,tint
## imported-by
imp src/lib/features/file-icons/file-icons.logic.ts:6 -> src/lib/core/settings/theme-surfaces.logic.ts readableOn,type:AppliedThemeColors
imp src/lib/features/note-list/NoteRow.svelte:10 -> src/lib/core/settings/theme-surfaces.logic.ts readableOn,rowSurfaces
imp src/lib/features/properties/PropertyField.svelte:14 -> src/lib/core/settings/theme-surfaces.logic.ts readableOn,themeSurface
imp src/lib/features/quick-switcher/QuickSwitcher.svelte:13 -> src/lib/core/settings/theme-surfaces.logic.ts themeSurface
imp src/lib/features/rail-shell/FilesNavigator.svelte:28 -> src/lib/core/settings/theme-surfaces.logic.ts readableOn,rowSurfaces
imp src/lib/features/rail-shell/Rail.svelte:21 -> src/lib/core/settings/theme-surfaces.logic.ts resolveThemeColor,themeSurface
imp src/lib/features/rail-shell/TypesNavigator.svelte:26 -> src/lib/core/settings/theme-surfaces.logic.ts readableOn,rowSurfaces
imp src/lib/features/tags/TagColorDot.svelte:4 -> src/lib/core/settings/theme-surfaces.logic.ts readableOn,themeSurface
## reach
in2 src/lib/core/settings/theme-surfaces.logic.ts 14 files in 9 modules: src/lib/app(3) src/lib/features/file-icons(3) src/lib/features/properties(2) src/lib/features/auto-organize(1) src/lib/features/rail-shell(1) +4 modules: q impact src/lib/core/settings/theme-surfaces.logic.ts --depth 2
out2 src/lib/core/settings/theme-surfaces.logic.ts 0 files in 0 modules: -
## tests
test src/tests/lib/core/settings/theme-surfaces.logic.test.ts imports src/lib/core/settings/theme-surfaces.logic.ts mirror
test src/tests/lib/features/note-list/NoteRow.test.ts imports src/lib/core/settings/theme-surfaces.logic.ts
test src/tests/lib/features/properties/PropertyField.test.ts imports src/lib/core/settings/theme-surfaces.logic.ts
test src/tests/lib/features/quick-switcher/QuickSwitcher.test.ts imports src/lib/core/settings/theme-surfaces.logic.ts
test src/tests/lib/features/rail-shell/FilesNavigator.test.ts imports src/lib/core/settings/theme-surfaces.logic.ts
test src/tests/lib/features/rail-shell/Rail.test.ts imports src/lib/core/settings/theme-surfaces.logic.ts
test src/tests/lib/features/rail-shell/TypesNavigator.test.ts imports src/lib/core/settings/theme-surfaces.logic.ts
test src/tests/lib/features/rail-shell/rail-items.logic.test.ts imports src/lib/core/settings/theme-surfaces.logic.ts
test src/tests/lib/features/tags/TagItem.test.ts imports src/lib/core/settings/theme-surfaces.logic.ts
## symbols
sym src/lib/core/settings/theme-surfaces.logic.ts:4 interface AppliedThemeColors L6 | The applied theme as `appliedThemeStore` exposes it: its CSS variables and its mode.
by src/lib/core/settings/theme-surfaces.logic.ts:AppliedThemeColors <- src/lib/features/file-icons/file-icons.logic.ts:6 in (module) import
sym src/lib/core/settings/theme-surfaces.logic.ts:19 fn themeSurface(theme: AppliedThemeColors, name: string): string | null L16 | The color of a surface under the applied theme: the column tones app.css derives from `--file-explorer-bg` (`rail-bg`, `nav-bg`, `list-bg`, the `:root` and `.d…
by src/lib/core/settings/theme-surfaces.logic.ts:themeSurface <- src/lib/features/properties/PropertyField.svelte:174 in (markup) markup
by src/lib/core/settings/theme-surfaces.logic.ts:themeSurface <- src/lib/features/quick-switcher/QuickSwitcher.svelte:34 in rowBgs=$derived call +1
by src/lib/core/settings/theme-surfaces.logic.ts:themeSurface <- src/lib/features/rail-shell/Rail.svelte:169 in railBg=$derived call
by src/lib/core/settings/theme-surfaces.logic.ts:themeSurface <- src/lib/features/tags/TagColorDot.svelte:18 in shown=$derived call +1
sym src/lib/core/settings/theme-surfaces.logic.ts:40 fn themeTint(theme: AppliedThemeColors, color: string, share: number, surface: string): string | null L5 | The theme color `--<color>` at `share` over the surface `name`, as Tailwind's `bg-<color>/25` paints it there (a selected or hovered row).
sym src/lib/core/settings/theme-surfaces.logic.ts:51 fn rowSurfaces(theme: AppliedThemeColors, column: string, tint: string): (string | null)[] L3 | The surfaces a row's colored icon or title sits on: the `column` and the hover (10%) and selected (25%) tints of `tint` its rows paint (`hover:bg-<tint>/10`, `…
by src/lib/core/settings/theme-surfaces.logic.ts:rowSurfaces <- src/lib/features/note-list/NoteRow.svelte:51 in rowBgs=$derived call
by src/lib/core/settings/theme-surfaces.logic.ts:rowSurfaces <- src/lib/features/rail-shell/FilesNavigator.svelte:347 in rowBgs=$derived call
by src/lib/core/settings/theme-surfaces.logic.ts:rowSurfaces <- src/lib/features/rail-shell/TypesNavigator.svelte:81 in rowBgs=$derived call
sym src/lib/core/settings/theme-surfaces.logic.ts:56 fn resolveThemeColor(theme: AppliedThemeColors, color: string): string | undefined L4 | `color` with a `var(--x)` replaced by the theme's value of `--x` (undefined when it has none); any other color as is.
by src/lib/core/settings/theme-surfaces.logic.ts:resolveThemeColor <- src/lib/features/rail-shell/Rail.svelte:173 in onRail call
sym src/lib/core/settings/theme-surfaces.logic.ts:68 fn readableOn(theme: AppliedThemeColors, color: string | undefined, surfaces: (string | null)[], min: number): string | undefined L13 | `color` lifted to `min` contrast on every one of `surfaces` (`ensureContrastOn`), for a fixed or user-chosen hue drawn as text (4.5) or a meaningful icon (3).
by src/lib/core/settings/theme-surfaces.logic.ts:readableOn <- src/lib/features/file-icons/file-icons.logic.ts:244 in readableIconColor call
by src/lib/core/settings/theme-surfaces.logic.ts:readableOn <- src/lib/features/note-list/NoteRow.svelte:54 in titleColor=$derived call
by src/lib/core/settings/theme-surfaces.logic.ts:readableOn <- src/lib/features/properties/PropertyField.svelte:174 in (markup) markup
by src/lib/core/settings/theme-surfaces.logic.ts:readableOn <- src/lib/features/rail-shell/FilesNavigator.svelte:510 in (markup) markup
by src/lib/core/settings/theme-surfaces.logic.ts:readableOn <- src/lib/features/rail-shell/TypesNavigator.svelte:83 in titleColorOf call
by src/lib/core/settings/theme-surfaces.logic.ts:readableOn <- src/lib/features/tags/TagColorDot.svelte:18 in shown=$derived call
## calls
call src/lib/core/settings/theme-surfaces.logic.ts:23 in themeSurface -> src/lib/utils/color.ts:mixColors call +1
call src/lib/core/settings/theme-surfaces.logic.ts:23 in themeSurface -> src/lib/utils/color.ts:shiftLightness call +1
call src/lib/core/settings/theme-surfaces.logic.ts:42 in themeTint -> src/lib/core/settings/theme-surfaces.logic.ts:themeSurface call
call src/lib/core/settings/theme-surfaces.logic.ts:43 in themeTint -> src/lib/utils/color.ts:tint call
call src/lib/core/settings/theme-surfaces.logic.ts:52 in rowSurfaces -> src/lib/core/settings/theme-surfaces.logic.ts:themeSurface call
call src/lib/core/settings/theme-surfaces.logic.ts:52 in rowSurfaces -> src/lib/core/settings/theme-surfaces.logic.ts:themeTint call +1
call src/lib/core/settings/theme-surfaces.logic.ts:75 in readableOn -> src/lib/core/settings/theme-surfaces.logic.ts:resolveThemeColor call
call src/lib/core/settings/theme-surfaces.logic.ts:78 in readableOn -> src/lib/utils/color.ts:ensureContrastOn call
