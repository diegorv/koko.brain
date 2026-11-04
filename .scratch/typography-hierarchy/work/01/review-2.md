VERDICT: APPROVED

## Previous findings

| # | Finding | Status | Evidence |
|---|---------|--------|----------|
| 1 | nit, `font-stacks.ts:43`: `/^(["']).*\1$/` passes `"Foo" "Bar"` through unchanged (invalid CSS) | resolved | `d3bc51b0` replaces it with `/^"(?:[^"\\]|\\.)*"$|^'(?:[^'\\]|\\.)*'$/` (`font-stacks.ts:43`). Traced: `"Foo" "Bar"` cannot match (the second `"` is unescaped inside), so it is escaped into `"\"Foo\" \"Bar\""`, one valid family name; `"Font Awesome 6 Free"` and `'Font Awesome 6 Free'` still match and pass through; `"Foo\"` (trailing escaped quote) does not match and is escaped. New table row in `font-stacks.test.ts:36` asserts the escaped output; the existing already-quoted rows are unchanged. |

## Acceptance criteria re-checked

- [met] A single family name is quoted before it reaches CSS. `selectFont` (`EditorSection.svelte:29`) stores the CoreText name raw, and an unquoted name with a digit-led word or a symbol (`Font Awesome 6 Free`) is an invalid `font-family`, so CodeMirror drops the declaration and the editor silently uses the body font. The quoting lives in a pure function with a test table: plain name, name with digits, name with quotes, comma list, empty string. — `quoteFontFamily` stays pure; the fix only narrows the already-quoted branch. The test table keeps every earlier row (plain, digits, inner quotes, comma list, empty) and adds the two-strings row; `font-stacks.test.ts` passes.
- [met] The editor font is applied with a fallback: `editor-theme.ts:25` emits the user's `fontFamily` followed by the app sans stack, so the default `iA Writer Duo S` (`settings.store.svelte.ts:74`, not bundled) falls back to the system sans instead of the WebView default font. A value the user typed as a list (contains a comma) is kept as written and still gets the fallback appended. — `editorFontFamily` (`font-stacks.ts:53-56`) is untouched and calls `quoteFontFamily`; the comma check runs before the changed regex, so lists are unaffected. `editor-theme.test.ts` passes.
- [met] The font picker previews each font: the item at `EditorSection.svelte:71` uses an inline `style:font-family` with the quoted name instead of `class="font-[{font}]"` (Tailwind v4 builds classes by scanning source, so a runtime class produces no CSS, and a name with spaces splits into several class tokens). — `EditorSection.svelte:72` is the other `quoteFontFamily` consumer; picker names are bare CoreText names, so the narrowed branch changes nothing there. `EditorSection.test.ts` passes.

## Findings

None open or new. The fix is two lines in `font-stacks.ts` plus one test row; no other source changed, no test weakened or deleted, no scope creep.

## Checks run by the reviewer

- `pnpm check`: exit 0, 213 files, 0 errors, 0 warnings.
- `pnpm vitest run src/tests/lib/utils/font-stacks.test.ts src/tests/lib/core/markdown-editor/setup/ src/tests/lib/core/settings/`: exit 0, 28 files, 602 tests passed (covers `font-stacks.test.ts`, `editor-theme.test.ts`, `EditorSection.test.ts`).
- Not run: the full suite and `pnpm build` (deliver's gate). Real WebKit rendering not verified (jsdom only).
