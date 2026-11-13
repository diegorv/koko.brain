# Issue 01 discovery

No `spec.md` exists for this feature; the Issue is the spec.

## Files that change

- NEW `src/lib/utils/font-stacks.ts`: `MONO_FONT_STACK`, `APP_SANS_FONT_STACK`, `quoteFontFamily(value)`, `editorFontFamily(value)`. In `utils/` because both `core/` (editor) and `plugins/queryjs` read it; no state, no imports.
- `src/lib/core/markdown-editor/highlight-styles.ts:34` monospace tag reads `MONO_FONT_STACK`.
- `src/lib/core/markdown-editor/extensions/live-preview/styles.ts:237,285,309,779,817,855` read `MONO_FONT_STACK`.
- `src/lib/plugins/queryjs/kb-ui.ts:740,837` read `APP_SANS_FONT_STACK`.
- `src/lib/core/markdown-editor/setup/editor-theme.ts:25` emits `editorFontFamily(fontFamily)` (quoted single name or the list as typed, then the app sans stack).
- `src/lib/core/settings/sections/EditorSection.svelte:71` `class="font-[{font}]"` becomes `style:font-family={quoteFontFamily(font)}`. `selectFont` (`:29`) still stores the raw name: quoting happens at emit time in the theme, so a typed name and a picked one take the same path.
- `static/fonts/*.ttf` (4 files) deleted. Grep for file names and `FiraCode` / `Nerd` / `Symbols` / `/fonts/` over src, src-tauri/src, tauri.conf.json, scripts, e2e, static: no hits.

## Plan (test-first)

1. `font-stacks.ts` + `src/tests/lib/utils/font-stacks.test.ts` (table: plain, digits, quotes, comma list, empty, already quoted, generic keyword). Also asserts `APP_SANS_FONT_STACK` equals the `body` font-family in `src/app.css` (CSS cannot import TS, so the test keeps the mirror in sync).
2. Editor theme: `editor-theme.test.ts` asserts the emitted `font-family` (plain name, `Font Awesome 6 Free`, typed list) via the StyleModule rules, same as the existing `padding-bottom` probe.
3. Shared stacks in live-preview, highlight style, QueryJS: new `live-preview/styles.test.ts` reads `livePreviewStyles` rules; `highlight-styles.test.ts` and `kb-ui.test.ts` (heatmapCalendar, yearlyCalendar) get one assertion each.
4. Font picker: `EditorSection.test.ts` mocks `list_system_fonts` to return a name, opens the popover, asserts the item's inline `font-family`.
5. Delete `static/fonts/`.

## Defaults taken

- `quoteFontFamily`: trims; empty -> empty; contains a comma -> as written; already wrapped in matching quotes -> as written; a CSS generic keyword (`serif`, `sans-serif`, `monospace`, `system-ui`, `ui-*`, ...) stays unquoted (quoting it would turn it into a family name); otherwise wrap in `"` with `\` and `"` escaped.
- Empty user value emits just the app sans stack.
- `src/app.css:352` stays the CSS source; the TS constant mirrors it, guarded by the test above.

## Risks

- jsdom must render bits-ui Popover content for the picker test; if not, assert on the Command item through an open-by-default prop.
- The `MonoLisa, monospace` rules gain `ui-monospace, SFMono-Regular, Menlo` before `monospace`: on a machine without MonoLisa, code changes from Courier to SF Mono/Menlo. Intended by the Issue.
