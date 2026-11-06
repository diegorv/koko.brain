# 01: Reject unsafe `_color` and `_title_color` values before they reach a style

**What to build:** a value in `_color` or `_title_color` that is not a color must never reach an inline style. Today a note or `.view` file from someone else's vault can add its own CSS declarations to the app's UI.

**The problem:**

- **Source:** `extractIconColorsFromParsedFrontmatter` (`src/lib/features/file-icons/file-icons.logic.ts:161`) only trims the value. `extractIconColorsFromFrontmatter` and `extractViewIcon` go through it. The Rust side (`src-tauri/src/vault/aliases.rs`, `parsing.rs`) passes the string through.
- **`_color` sinks:** `iconColorCss` (`file-icons.logic.ts:210`) returns any value that is not a palette name as it is. It reaches `IconRenderer.svelte:24` and `:34` (`style={`color: ${cssColor}`}`) and `Rail.svelte:122` and `:242` (`style:--rail-c`). `AutoMoveRuleRow.svelte:148` passes `rule.icon?.color` to `IconRenderer`, a value from settings that does not go through the extractor.
- **`_title_color` sinks:** it skips `iconColorCss` altogether. It reaches `style:color` at `NoteRow.svelte:84`, `TypesNavigator.svelte:293` and `:423`, and `FilesNavigator.svelte:485`. `EditorView.svelte:66` hands it to `EditorTabs` as `tabTitleColor`; trace how `EditorTabs` applies it.
- **Why `style:` does not protect it:** Svelte's `set_style` applies the first render as text through `dom.style.cssText` (`node_modules/svelte/src/internal/client/dom/elements/style.js`, `to_style`), and only later updates go through `setProperty`.
- **Impact:** with `_color: "red; background-image: url(https://example.com/x)"`, the extra declaration would apply. The CSP in `src-tauri/tauri.conf.json` allows `img-src https:`, so opening a vault could send a request to an outside server, exposing the IP address, and could change how the UI looks. It cannot run script: `script-src` is unaffected.

The sinks above were found by reading the code. The injection was not reproduced in the WebView, so the first failing test is what confirms it.

**The fix:**

- Add a pure `isSafeCssColor(value: string): boolean` to `file-icons.logic.ts`. It accepts:
  - hex colors of 3, 4, 6 or 8 digits;
  - a bare identifier, letters only (named colors, palette names, `transparent`, `currentColor`);
  - a color function (`rgb`, `rgba`, `hsl`, `hsla`, `hwb`, `lab`, `lch`, `oklab`, `oklch`) whose arguments hold only digits, spaces, `.`, `,`, `%`, `/`, `+`, `-` and the keyword `none`;
  - `var(--name)`, with a name of letters, digits, `-` and `_`.
- Everything else is rejected: `;`, `url(`, `{`, `}`, `/*`, a quote, a backslash.
- Use a grammar and not `CSS.supports`: `.logic.ts` files stay free of DOM globals, and the check must behave the same in tests.
- `extractIconColorsFromParsedFrontmatter` drops a rejected value, as if the field were absent. That covers `_title_color`, and a dropped `_color` lets the type's color show through in `resolveIconForPath`.
- `iconColorCss` returns undefined for a rejected value, which covers the settings path and any caller holding an older value. `Rail.svelte` then falls back to `RAIL_PIN_COLOR`.

**Blocked by:** none

**Status:** needs-triage

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`.

- [ ] A failing test was written first and seen failing: `IconRenderer` rendered with `red; background-image: url(https://example.com/x)` shows no `background-image` in its style. Do the same for `Rail` with a pinned note carrying that `_color`, and for one `_title_color` sink, each rendered through the real store.
- [ ] `isSafeCssColor`, accepted: `#abc`, `#abcd`, `#aabbcc`, `#aabbccdd`, `red`, `green`, `transparent`, `currentColor`, `rgb(1, 2, 3)`, `rgb(1 2 3 / 50%)`, `hsl(120 50% 50%)`, `oklch(0.7 0.1 200 / 0.5)`, `oklch(none 0.1 200)`, `var(--type-green)`.
- [ ] `isSafeCssColor`, rejected: an empty string, `red; color: blue`, `red;`, `url(https://example.com/x)`, `rgb(1,2,3); top:0`, `rgb(url(x))`, `var(--a);b:c`, `#12`, `#ggg`, `red /* x */`, `expression(1)`, a value with a quote, a backslash, or a brace.
- [ ] `extractIconColorsFromParsedFrontmatter`, `extractIconColorsFromFrontmatter` and `extractViewIcon` drop an unsafe `_color` and `_title_color`, and keep a safe one.
- [ ] `resolveIconForPath`: a note with an unsafe `_color` under a type that has a color gets the type's color.
- [ ] `iconColorCss`: a palette name still gives `var(--type-green)`, a hex passes through, an unsafe value gives undefined.
- [ ] The colors the icon picker writes (`IconPicker.svelte`) all pass `isSafeCssColor`, tested against the picker's own list.
- [ ] Every remaining `_title_color` and `_color` sink was traced, including `EditorTabs`, and the result is listed in the Issue's comment.

## Notes

- **Found by:** the automated commit security review on the rail work of `.scratch/rail-styles/issues/01-labeled-rail-default.md`. The `IconRenderer` sink was already on main before it; that Issue added the `Rail` sink.
- **Trust model:** a vault can come from someone else, so its frontmatter is untrusted input. Mods (`.scratch/vault-mods`) are a separate, opt-in trust decision and are out of scope here.
- **Out of scope:** tightening the CSP's `img-src https:`. Remote images in notes may depend on it; that would be its own Issue.
- **Size:** S.

## Comments
