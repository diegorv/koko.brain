# Discovery: Issue 06, editor text on tinted surfaces

No `spec.md`; the Issue, `report.md` and `research/workflow-result.json` are the spec. Builder/test pattern of `work/05` and `work/07`; gate set `BUILTIN_THEMES` + `HARD_PALETTE_THEMES` + `HARD_DARK_PALETTE_THEMES`. Line numbers in the Issue predate Issue 05 (app.css moved ~25 lines). Measured on the gate set after Issue 05 (probe, not committed).

## Files that change
- `core/settings/theme-builder.logic.ts:102` `ReadabilityPair` gains a 7th element `share`: the bg token drawn at that share over `base` (`tint`), for the callout tint `color-mix(in srgb, var(--callout-note) 7%, transparent)` (`styles.ts:97,484`). `flattenedSurface` honors it; the pair loop re-measures when the bg is derived from the token itself (`callout.note` on its own tint).
- `READABILITY_PAIRS` (`:120`) new: `syntax.quote` on `blockquoteBg`/`Bg2`/`Bg3` and the callout tint; every `callout.*` on the callout tint at 4.5 (label at full strength, item 1); `collectionError` on `collectionBg` and `codeblockBg` (QueryJS, widget and Mermaid errors); `collectionNull`, `collectionEmpty`, `preview.link`, `preview.wikilink` on `collectionBg`; `collectionTableAlt` on `collectionBg` at 1.05 (zebra no-op on KokoBrain Default, Lavender Haze, Twilight Violet); `editorFg` on `syntax.activeLineGutter`. Raised: `syntax.meta` 3 -> 4.5, `olMarker` 3 -> 4.5. `readableCore:438` lifts `meta` to 4.5 so `wikilink.bracket` stays the same color.
- Highlight (item 3): `withReadableContrast` lowers the alpha of `preview.highlightBg` (1/255 steps) until `editorFg`, `strong`, `emphasis`, `syntax.link`, `preview.link`, `preview.wikilink` read on it over `editorBg` and `fileExplorerFg` over `fileExplorerBg` and `editorBg` (search snippet marks), 4.5 + Lc 45. A background lift, not a pair: a pair would move body text. `readabilityFailures` reports `preview.highlightBg` when it moves. New `withAlpha(color, a)` in `utils/color.ts` (8-digit hex).
- `live-preview/styles.ts:520-535` type label opacity .85 -> none; `:503` fold chevron (editor-fg) .6 -> .75.
- `setup/editor-theme.ts:66` `.cm-activeLineGutter` text `var(--editor-fg)`.
- `src/app.css`: `--lp-codeblock-lang`/`-copy` `color-mix(in oklab, var(--muted-foreground) 70%, var(--editor-fg))` (Lavender 4.32 -> 5.38, Tolaria 4.29 -> 5.55); `--lp-syntax-punctuation` editor-fg 65% -> 80% (Bielefeld 3.47 -> 4.91); event fg 30% -> 20% and bg 25% -> 20% (Bielefeld 4.06 -> 4.6+); `[data-search-result] mark` `color: var(--file-explorer-fg)`.

## Tests
- Failing first, `theme-builder.logic.test.ts` new describe over the gate set: callout labels and `syntax.quote` on the callout tint, quote on `blockquoteBg3`, highlight texts on `highlightBg`, `collectionError/Null/Empty` on `collectionBg`, `meta` on `editorBg` at 4.5 + Lc 45; `collectionTableAlt` flattened differs from `collectionBg`. "holds for every pair" learns `share`. `readabilityFailures`: a user highlight that fails is reported and lowered.
- `color.test.ts` (`withAlpha`), `styles.test.ts` (label opacity, fold opacity measured: editor-fg at .75 over the tint >= 3:1), `editor-theme.test.ts` (gutter color).
- New `src/tests/lib/editor-tint-mixes.test.ts` (pattern `tint-text-tokens.test.ts`): parses each changed app.css mix and resolves it with `mixColors` per theme: code header label and copy (+ copy hover fill), punctuation and comment on `codeblockBg`, event pills, snippet mark over the list surfaces. Also locks the tag pill (`styles.ts:276`) and meta-bind primary/destructive hover labels, unchanged.
- `theme-snapshot` `-u` on purpose.

## Defaults taken
- Callout hues lifted as tokens (label and border stay one color), pairs only, so `ui.type*` keep their 3:1 core lift; the type-palette test that equates `typeYellow` with `callout.warning` is updated if it diverges.
- Collection placeholders reach 4.5 through the pair (no new derivation).
- Tag pill, Run button and meta-bind hovers already pass on the gate set after Issue 05 (Tolaria Light hover 3.87 -> 6.19): tests only, mixes unchanged.
- QueryJS error-details opacity (`styles.ts:947`) is Issue 08's.

## Risks
- Callout borders and labels darken on light themes; highlight gets fainter on the default theme (links need it). Snapshot moves on both built-ins.

## Build decisions
- Highlight: fading alone would erase it on themes whose text sits at its floor on the editor (Twilight Violet faded to 0). The fade runs first and stops at `HIGHLIGHT_FLOOR`, OKLab distance 6 from the editor (WCAG luminance cannot measure a yellow on a light editor, 1.00:1); `HIGHLIGHT_TEXT` pairs then lift only the text that still fails. Default theme: `#fbbf2444` -> `#fbbf2418`, links `#60a5fa` -> `#67a9fb`. Tolaria Light's own highlight (distance 3.2) is under the floor and stays as typed.
- `readabilityFailures` reports a faded highlight under `preview.highlightBg`, `bgKey` naming the text it hid (the primary-label pattern of Issue 05).
- Zebra pair at 1.05:1 moves the alt token's color (alpha kept): KokoBrain Default `#1e1e2e44` -> `#0d0d1744`.
- `CALLOUT_TINT` is exported so `styles.test.ts` ties the CSS 7% to the builder share.
- The type-palette test now pins `typeYellow` to the core yellow; `coreFromColors`' round-trip palette uses callout hues that already pass on the tint.
