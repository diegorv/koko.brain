# file card src/lib/core/settings/theme.types.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/settings/theme.types.ts ' codemap/files
file src/lib/core/settings/theme.types.ts types L251 module src/lib/core/settings in10 t0
## imports
imp src/lib/core/settings/theme.types.ts:1 -> src/lib/core/settings/theme-package.logic.ts type:ThemePackage
## imported-by
imp src/lib/core/settings/sections/AppearanceSection.svelte:22 -> src/lib/core/settings/theme.types.ts type:Theme
imp src/lib/core/settings/sections/ThemeEditor.svelte:21 -> src/lib/core/settings/theme.types.ts type:Theme,type:ThemeColors
imp src/lib/core/settings/sections/ThemePreview.svelte:3 -> src/lib/core/settings/theme.types.ts type:ThemeColors
imp src/lib/core/settings/settings.store.svelte.ts:2 -> src/lib/core/settings/theme.types.ts type:AppearanceSettings
imp src/lib/core/settings/settings.types.ts:398 -> src/lib/core/settings/theme.types.ts type:AppearanceSettings
imp src/lib/core/settings/theme-builder.logic.ts:1 -> src/lib/core/settings/theme.types.ts type:Theme,type:ThemeColors
imp src/lib/core/settings/theme-editor.logic.ts:1 -> src/lib/core/settings/theme.types.ts type:Theme,type:ThemeColors,type:UIColors,type:SyntaxColors,type:PreviewColors,type:WikilinkColors,type:CalloutColors
imp src/lib/core/settings/theme-package.logic.ts:1 -> src/lib/core/settings/theme.types.ts type:AppearanceSettings,type:Theme,type:ThemeColors
imp src/lib/core/settings/theme.logic.ts:1 -> src/lib/core/settings/theme.types.ts type:Theme,type:ThemeColors,type:UIColors,type:SyntaxColors,type:PreviewColors,type:WikilinkColors,type:CalloutColors,type:AppearanceSettings
imp src/lib/core/settings/theme.service.ts:3 -> src/lib/core/settings/theme.types.ts type:Theme
## reach
in2 src/lib/core/settings/theme.types.ts 103 files in 28 modules: src/lib/core/settings(21) src/lib/features/event-calendar(13) src/lib/features/rail-shell(10) src/lib/app(9) src/lib/features/todoist-sync(5) +23 modules: q impact src/lib/core/settings/theme.types.ts --depth 2
out2 src/lib/core/settings/theme.types.ts 3 files in 1 modules: src/lib/core/settings(3)
## tests
test src/tests/lib/core/settings/ThemePreview.test.ts imports-type src/lib/core/settings/theme.types.ts
test src/tests/lib/core/settings/settings.service.test.ts imports-type src/lib/core/settings/theme.types.ts
test src/tests/lib/core/settings/theme-builder.logic.test.ts imports-type src/lib/core/settings/theme.types.ts
test src/tests/lib/core/settings/theme-editor.logic.test.ts imports-type src/lib/core/settings/theme.types.ts
test src/tests/lib/core/settings/theme-package.logic.test.ts imports-type src/lib/core/settings/theme.types.ts
test src/tests/lib/core/settings/theme.logic.test.ts imports-type src/lib/core/settings/theme.types.ts
test src/tests/lib/core/settings/theme.service.test.ts imports-type src/lib/core/settings/theme.types.ts
## symbols
sym src/lib/core/settings/theme.types.ts:4 interface UIColors L120 | Color tokens for the application UI shell
by src/lib/core/settings/theme.types.ts:UIColors <- src/lib/core/settings/theme-editor.logic.ts:4 in (module) import
by src/lib/core/settings/theme.types.ts:UIColors <- src/lib/core/settings/theme.logic.ts:4 in (module) import
sym src/lib/core/settings/theme.types.ts:126 interface SyntaxColors L21 | Color tokens for CodeMirror syntax highlighting
by src/lib/core/settings/theme.types.ts:SyntaxColors <- src/lib/core/settings/theme-editor.logic.ts:5 in (module) import
by src/lib/core/settings/theme.types.ts:SyntaxColors <- src/lib/core/settings/theme.logic.ts:5 in (module) import
sym src/lib/core/settings/theme.types.ts:149 interface PreviewColors L41 | Color tokens for live preview rendering
by src/lib/core/settings/theme.types.ts:PreviewColors <- src/lib/core/settings/theme-editor.logic.ts:6 in (module) import
by src/lib/core/settings/theme.types.ts:PreviewColors <- src/lib/core/settings/theme.logic.ts:6 in (module) import
sym src/lib/core/settings/theme.types.ts:192 interface WikilinkColors L7 | Color tokens for wikilink decorations
by src/lib/core/settings/theme.types.ts:WikilinkColors <- src/lib/core/settings/theme-editor.logic.ts:7 in (module) import
by src/lib/core/settings/theme.types.ts:WikilinkColors <- src/lib/core/settings/theme.logic.ts:7 in (module) import
sym src/lib/core/settings/theme.types.ts:201 interface CalloutColors L8 | Color tokens for callout types
by src/lib/core/settings/theme.types.ts:CalloutColors <- src/lib/core/settings/theme-editor.logic.ts:8 in (module) import
by src/lib/core/settings/theme.types.ts:CalloutColors <- src/lib/core/settings/theme.logic.ts:8 in (module) import
sym src/lib/core/settings/theme.types.ts:211 interface ThemeColors L7 | Complete set of color tokens for a theme, organized by group
by src/lib/core/settings/theme.types.ts:ThemeColors <- src/lib/core/settings/sections/ThemeEditor.svelte:21 in (script) import
by src/lib/core/settings/theme.types.ts:ThemeColors <- src/lib/core/settings/sections/ThemePreview.svelte:3 in (script) import
by src/lib/core/settings/theme.types.ts:ThemeColors <- src/lib/core/settings/theme-builder.logic.ts:1 in (module) import
by src/lib/core/settings/theme.types.ts:ThemeColors <- src/lib/core/settings/theme-editor.logic.ts:3 in (module) import
by src/lib/core/settings/theme.types.ts:ThemeColors <- src/lib/core/settings/theme-package.logic.ts:1 in (module) import
by src/lib/core/settings/theme.types.ts:ThemeColors <- src/lib/core/settings/theme.logic.ts:3 in (module) import
sym src/lib/core/settings/theme.types.ts:220 interface Theme L6 | A named color theme with all token values
by src/lib/core/settings/theme.types.ts:Theme <- src/lib/core/settings/sections/AppearanceSection.svelte:22 in (script) import
by src/lib/core/settings/theme.types.ts:Theme <- src/lib/core/settings/sections/ThemeEditor.svelte:21 in (script) import
by src/lib/core/settings/theme.types.ts:Theme <- src/lib/core/settings/theme-builder.logic.ts:1 in (module) import
by src/lib/core/settings/theme.types.ts:Theme <- src/lib/core/settings/theme-editor.logic.ts:2 in (module) import
by src/lib/core/settings/theme.types.ts:Theme <- src/lib/core/settings/theme-package.logic.ts:1 in (module) import
by src/lib/core/settings/theme.types.ts:Theme <- src/lib/core/settings/theme.logic.ts:2 in (module) import
by src/lib/core/settings/theme.types.ts:Theme <- src/lib/core/settings/theme.service.ts:3 in (module) import
sym src/lib/core/settings/theme.types.ts:228 interface AppearanceSettings L24 | Settings for theme selection and custom theme storage
by src/lib/core/settings/theme.types.ts:AppearanceSettings <- src/lib/core/settings/settings.store.svelte.ts:2 in (module) import
by src/lib/core/settings/theme.types.ts:AppearanceSettings <- src/lib/core/settings/theme-package.logic.ts:1 in (module) import
by src/lib/core/settings/theme.types.ts:AppearanceSettings <- src/lib/core/settings/theme.logic.ts:9 in (module) import
