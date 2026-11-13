# file card src/lib/core/settings/theme-editor.logic.ts
cols: file <path> <role> L<lines> module <module> in<prod importers> t<tests> [t:inline] · imp <importer>:<line> -> <target> <names> · sym <loc> <kind> <name><sig> L<span> | doc · by <id> <- <use loc> in <fn> <kind> [+<n>] · local <loc> fn <name><sig> L<span> · store/mem · mount <loc> <Name> -> <file> · call <loc> in <fn> -> <target> <kind> [+<n>] · fx/reg/ipc-call/ev · grep: grep -rF -- '-> src/lib/core/settings/theme-editor.logic.ts ' codemap/files
file src/lib/core/settings/theme-editor.logic.ts logic L303 module src/lib/core/settings in3 t1
## imports
imp src/lib/core/settings/theme-editor.logic.ts:1 -> src/lib/core/settings/theme.types.ts type:Theme,type:ThemeColors,type:UIColors,type:SyntaxColors,type:PreviewColors,type:WikilinkColors,type:CalloutColors
imp src/lib/core/settings/theme-editor.logic.ts:10 -> src/lib/core/settings/theme.logic.ts DEFAULT_THEME_NAME
imp src/lib/core/settings/theme-editor.logic.ts:11 -> src/lib/core/settings/theme-validation.logic.ts findInvalidThemeToken,withoutRetiredTokens
## imported-by
imp src/lib/core/settings/sections/ThemeColorRow.svelte:3 -> src/lib/core/settings/theme-editor.logic.ts isValidHex,normalizeHex,hexToColorInputValue
imp src/lib/core/settings/sections/ThemeEditor.svelte:6 -> src/lib/core/settings/theme-editor.logic.ts camelCaseToLabel,validateThemeName,serializeThemeForExport,parseThemeFromImport,COLOR_GROUP_ORDER,COLOR_GROUP_LABELS,UI_COLOR_GROUPS,SYNTAX_COLOR_GROUPS,PREVIEW_COLOR_GROUPS,WIKILINK_COLOR_GROUPS,CALLOUT_COLOR_GROUPS,type:ColorGroupKey,type:ColorSubGroup
imp src/lib/features/tags/TagColorPicker.svelte:6 -> src/lib/core/settings/theme-editor.logic.ts hexToColorInputValue
## reach
in2 src/lib/core/settings/theme-editor.logic.ts 2 files in 2 modules: src/lib/core/settings(1) src/lib/features/tags(1)
out2 src/lib/core/settings/theme-editor.logic.ts 3 files in 2 modules: src/lib/core/settings(2) src/lib/utils(1)
## tests
test src/tests/lib/core/settings/theme-editor.logic.test.ts imports src/lib/core/settings/theme-editor.logic.ts mirror
## symbols
sym src/lib/core/settings/theme-editor.logic.ts:18 interface ColorSubGroup L4 | A labeled sub-group of color token keys within a color group
by src/lib/core/settings/theme-editor.logic.ts:ColorSubGroup <- src/lib/core/settings/sections/ThemeEditor.svelte:19 in (script) import
sym src/lib/core/settings/theme-editor.logic.ts:24 type ColorGroupKey L1 | The five top-level color group identifiers
by src/lib/core/settings/theme-editor.logic.ts:ColorGroupKey <- src/lib/core/settings/sections/ThemeEditor.svelte:18 in (script) import
sym src/lib/core/settings/theme-editor.logic.ts:27 const COLOR_GROUP_LABELS: Record<ColorGroupKey, string> L7 | Human-readable labels for each color group tab
by src/lib/core/settings/theme-editor.logic.ts:COLOR_GROUP_LABELS <- src/lib/core/settings/sections/ThemeEditor.svelte:182 in (markup) markup
sym src/lib/core/settings/theme-editor.logic.ts:36 const COLOR_GROUP_ORDER: ColorGroupKey[] L1 | Ordered list of color group keys for tab rendering
by src/lib/core/settings/theme-editor.logic.ts:COLOR_GROUP_ORDER <- src/lib/core/settings/sections/ThemeEditor.svelte:175 in (markup) markup
sym src/lib/core/settings/theme-editor.logic.ts:42 const UI_COLOR_GROUPS: ColorSubGroup<keyof UIColors>[] L50
by src/lib/core/settings/theme-editor.logic.ts:UI_COLOR_GROUPS <- src/lib/core/settings/sections/ThemeEditor.svelte:59 in GROUP_SUB_GROUPS ref
sym src/lib/core/settings/theme-editor.logic.ts:97 const SYNTAX_COLOR_GROUPS: ColorSubGroup<keyof SyntaxColors>[] L22
by src/lib/core/settings/theme-editor.logic.ts:SYNTAX_COLOR_GROUPS <- src/lib/core/settings/sections/ThemeEditor.svelte:60 in GROUP_SUB_GROUPS ref
sym src/lib/core/settings/theme-editor.logic.ts:124 const PREVIEW_COLOR_GROUPS: ColorSubGroup<keyof PreviewColors>[] L47
by src/lib/core/settings/theme-editor.logic.ts:PREVIEW_COLOR_GROUPS <- src/lib/core/settings/sections/ThemeEditor.svelte:61 in GROUP_SUB_GROUPS ref
sym src/lib/core/settings/theme-editor.logic.ts:176 const WIKILINK_COLOR_GROUPS: ColorSubGroup<keyof WikilinkColors>[] L6
by src/lib/core/settings/theme-editor.logic.ts:WIKILINK_COLOR_GROUPS <- src/lib/core/settings/sections/ThemeEditor.svelte:62 in GROUP_SUB_GROUPS ref
sym src/lib/core/settings/theme-editor.logic.ts:183 const CALLOUT_COLOR_GROUPS: ColorSubGroup<keyof CalloutColors>[] L6
by src/lib/core/settings/theme-editor.logic.ts:CALLOUT_COLOR_GROUPS <- src/lib/core/settings/sections/ThemeEditor.svelte:63 in GROUP_SUB_GROUPS ref
sym src/lib/core/settings/theme-editor.logic.ts:198 fn camelCaseToLabel(key: string): string L7 | Converts a camelCase token key to a human-readable label.
by src/lib/core/settings/theme-editor.logic.ts:camelCaseToLabel <- src/lib/core/settings/sections/ThemeEditor.svelte:195 in (markup) markup
sym src/lib/core/settings/theme-editor.logic.ts:214 fn isValidHex(value: string): boolean L3 | Returns true if the string is a valid 3 or 6 character hex color (with or without `#`)
by src/lib/core/settings/theme-editor.logic.ts:isValidHex <- src/lib/core/settings/sections/ThemeColorRow.svelte:30 in handleTextBlur call
sym src/lib/core/settings/theme-editor.logic.ts:219 fn normalizeHex(value: string): string L7 | Normalizes a hex string: ensures `#` prefix, expands 3-char to 6-char, lowercases
by src/lib/core/settings/theme-editor.logic.ts:normalizeHex <- src/lib/core/settings/sections/ThemeColorRow.svelte:31 in handleTextBlur call
sym src/lib/core/settings/theme-editor.logic.ts:231 fn hexToColorInputValue(value: string): string L6 | Converts a color value to a format accepted by `<input type="color">` (`#rrggbb`).
by src/lib/core/settings/theme-editor.logic.ts:hexToColorInputValue <- src/lib/core/settings/sections/ThemeColorRow.svelte:58 in (markup) markup
by src/lib/core/settings/theme-editor.logic.ts:hexToColorInputValue <- src/lib/features/tags/TagColorPicker.svelte:64 in (markup) markup
sym src/lib/core/settings/theme-editor.logic.ts:246 fn validateThemeName(name: string, existingNames: string[]): string | null L13 | Validates a theme name for the editor.
by src/lib/core/settings/theme-editor.logic.ts:validateThemeName <- src/lib/core/settings/sections/ThemeEditor.svelte:81 in handleSave call
sym src/lib/core/settings/theme-editor.logic.ts:265 fn serializeThemeForExport(theme: Theme): string L3 | Serializes a theme to a pretty-printed JSON string for export
by src/lib/core/settings/theme-editor.logic.ts:serializeThemeForExport <- src/lib/core/settings/sections/ThemeEditor.svelte:87 in handleExport call
sym src/lib/core/settings/theme-editor.logic.ts:270 const MAX_THEME_FILE_LENGTH L1 | Largest theme file `parseThemeFromImport` accepts, in characters.
sym src/lib/core/settings/theme-editor.logic.ts:273 type ThemeImportResult L1 | Outcome of `parseThemeFromImport`: the theme, or a message for the user.
sym src/lib/core/settings/theme-editor.logic.ts:281 fn parseThemeFromImport(json: string): ThemeImportResult L23 | Parses an exported theme JSON.
by src/lib/core/settings/theme-editor.logic.ts:parseThemeFromImport <- src/lib/core/settings/sections/ThemeEditor.svelte:107 in handleFileImport call
## calls
call src/lib/core/settings/theme-editor.logic.ts:232 in hexToColorInputValue -> src/lib/core/settings/theme-editor.logic.ts:isValidHex call
call src/lib/core/settings/theme-editor.logic.ts:233 in hexToColorInputValue -> src/lib/core/settings/theme-editor.logic.ts:normalizeHex call
call src/lib/core/settings/theme-editor.logic.ts:298 in parseThemeFromImport -> src/lib/core/settings/theme-validation.logic.ts:findInvalidThemeToken call
call src/lib/core/settings/theme-editor.logic.ts:302 in parseThemeFromImport -> src/lib/core/settings/theme-validation.logic.ts:withoutRetiredTokens call
