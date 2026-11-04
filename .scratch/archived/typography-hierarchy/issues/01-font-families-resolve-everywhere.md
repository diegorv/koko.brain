# 01: Font families resolve on every machine and the font picker previews each font

**What to build:** Every font-family the app declares resolves to a sensible face on a machine that lacks the preferred font, and every place that shows code or app text uses one shared stack per role. The editor font the user picks is applied even when its name needs quoting, and the font picker shows each name in its own face. The unused font files stop shipping in the bundle.

**Blocked by:** none

**Status:** resolved

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [x] One module exports the font stacks the app uses: a monospace stack (`MonoLisa, ui-monospace, SFMono-Regular, Menlo, monospace`, the one in `highlight-styles.ts:34`) and an app sans stack (the one in `src/app.css:352`). Every hard-coded stack below reads from it.
- [x] Live-preview monospace rules use the shared stack instead of `MonoLisa, monospace`: `live-preview/styles.ts` `.cm-lp-code` (~237), code block language label (~285), code block `<pre>` (~309), mermaid language label (~779), math error (~817). `styles.ts:855` already uses the long stack and reads from the module too.
- [x] The QueryJS UI sans stack (`plugins/queryjs/kb-ui.ts:740` and `:837`, `-apple-system, ..., Helvetica, Arial, sans-serif`) uses the shared app sans stack, so query output does not render in a third family.
- [x] The editor font is applied with a fallback: `editor-theme.ts:25` emits the user's `fontFamily` followed by the app sans stack, so the default `iA Writer Duo S` (`settings.store.svelte.ts:74`, not bundled) falls back to the system sans instead of the WebView default font. A value the user typed as a list (contains a comma) is kept as written and still gets the fallback appended.
- [x] A single family name is quoted before it reaches CSS. `selectFont` (`EditorSection.svelte:29`) stores the CoreText name raw, and an unquoted name with a digit-led word or a symbol (`Font Awesome 6 Free`) is an invalid `font-family`, so CodeMirror drops the declaration and the editor silently uses the body font. The quoting lives in a pure function with a test table: plain name, name with digits, name with quotes, comma list, empty string.
- [x] The font picker previews each font: the item at `EditorSection.svelte:71` uses an inline `style:font-family` with the quoted name instead of `class="font-[{font}]"` (Tailwind v4 builds classes by scanning source, so a runtime class produces no CSS, and a name with spaces splits into several class tokens).
- [x] The four files in `static/fonts/` (FiraCodeNerdFontMono Bold/Medium/Regular, SymbolsNerdFontMono Regular, about 10 MB) are deleted. Nothing in `src`, `src-tauri`, `scripts`, `e2e` or the theme files references them, and `static/` is copied into `build/`, the Tauri `frontendDist` (`tauri.conf.json:10`). Re-grep by file name and by family name (`FiraCode`, `Nerd`, `Symbols`) before deleting.
- [x] Tests: `editor-theme.test.ts` asserts the emitted `font-family` for a plain name, a name that needs quoting and a typed list; `EditorSection.test.ts` asserts a picker item carries the inline font-family; a test asserts the live-preview and QueryJS rules use the shared stacks.

## Notes

- **Created 2026-11-04** from the owner's typography review, verified by 30 haiku checkers and 5 opus refuters. The owner asked for the font Issues first.
- **Default applied:** the editor fallback is the app sans stack, not a serif or monospace one. Stated to the owner before writing this Issue, no objection.
- **Two rules on one span:** in live preview `tags.monospace` gets both `cm-lp-code` (`markdown-highlight-style.ts:19`) and the `markdownHighlight` class from `highlight-styles.ts:34`. Once both read the same stack the conflict is harmless; do not remove either rule here.
- **Not verified:** which face WebKit uses for an unmatched family (believed Times for sans/serif and Courier for `monospace`). The fix does not depend on it.
- **Out of scope:** font sizes (Issues 02-05).
- **Size:** S.

## Comments

- 2026-11-04, branch `issue/01-font-families-resolve-everywhere`: new `src/lib/utils/font-stacks.ts` (mono + app sans stacks, `quoteFontFamily`); live-preview and QueryJS read the shared stacks; editor font quoted with app sans fallback; font picker previews each font via inline `style:font-family`; unused Nerd Font files removed from `static/fonts/`. Review round 2 fix: `quoteFontFamily` treats only a single quoted string as already quoted. Tests: pnpm check 0 errors; full suite exit=0, 462 files, 10715 passed, 1 skipped, 1 todo, build OK (log `brain.worktrees/test-logs/typography-hierarchy/01-deliver.log`). Reviews: round 1 APPROVED (one nit, fixed), round 2 APPROVED (no findings).
