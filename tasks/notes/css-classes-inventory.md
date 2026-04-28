# CSS Classes Inventory — 8 Inline Plugins (Phase 0)

Authoritative inventory of every CSS class name emitted by the 8 inline plugins being retired in Phases 3–10. **Names must be preserved verbatim** by the new pipeline — external themes reference these classes directly, so renaming any of them is a breaking change.

Source: `src/lib/core/markdown-editor/extensions/live-preview/plugins/{markdown-style,heading,blockquote,link,simple-widget,inline-marks,inline-comment,block-reference}-plugin.ts` plus their imports from `../styles.ts`.

## Class table

### Inline mark visibility (animated via `styles.ts:37-61`)

| Class | Hidden state | Visible state | Emitted by |
|-------|--------------|---------------|------------|
| `cm-formatting-inline` | `max-width: 0; opacity: 0` (transition) | — | `inline-marks-plugin`, `link-plugin` |
| `cm-formatting-inline-visible` | — | `max-width: 4ch; opacity: 1` | `inline-marks-plugin`, `link-plugin` (cursor reveal) |
| `cm-formatting-block` | `font-size: 0.01em; opacity: 0` (transition) | — | `heading-plugin`, `blockquote-plugin` |
| `cm-formatting-block-visible` | — | `font-size: 1em; opacity: 0.6` | `heading-plugin`, `blockquote-plugin` (cursor reveal) |

### Single-shot mark replacements (CSS-only, no widget)

| Class | Effect | Emitted by |
|-------|--------|------------|
| `cm-formatting-hr` | `font-size: 0; width: 0` — hides `---`, `***`, `___` text | `simple-widget-plugin` (`Decoration.mark`) |
| `cm-lp-hr-line` | `border-bottom: 1px solid var(--lp-hr-border); line-height: 0.5em` | `simple-widget-plugin` (`Decoration.line`) |
| `cm-formatting-task-marker` | `font-size: 0` — hides `-` before checkbox | `simple-widget-plugin` |
| `cm-formatting-ul-marker` | `font-size: 0` + `::before { content: "•  " }` | `simple-widget-plugin` |
| `cm-formatting-hard-break` | `font-size: 0` + `::after { content: "↵" }` | `simple-widget-plugin` |

### Content styling (semantic)

| Class | Effect | Emitted by | Source declaration |
|-------|--------|------------|--------------------|
| `cm-lp-bold` | `font-weight: bold` | `markdown-style-plugin` (via `boldTextDeco`) | `styles.ts:4` |
| `cm-lp-italic` | `font-style: italic` | `markdown-style-plugin` (via `italicTextDeco`) | `styles.ts:5` |
| `cm-lp-strikethrough` | `text-decoration: line-through` | `markdown-style-plugin` (via `strikethroughTextDeco`) | `styles.ts:7` |
| `cm-lp-code` | mono + bg + padding + radius | `markdown-style-plugin` (via `inlineCodeTextDeco`) | `styles.ts:8` |
| `cm-lp-highlight` | bg + radius | `markdown-style-plugin` (via `highlightTextDeco`) | `styles.ts:10` |
| `cm-lp-link` | color + underline + cursor | `link-plugin` (via `linkTextDeco`) | `styles.ts:3` |
| `cm-lp-link-ref-def` | `opacity: 0.5; font-size: 0.85em` | `link-plugin` (`Decoration.mark`) | `styles.ts:108` |
| `cm-lp-wikilink` | color + underline (alternative) + cursor | `link-plugin` (via `wikilinkTextDeco`) | `styles.ts:9` |
| `cm-lp-block-ref` | `opacity: 0.5; color: var(--lp-comment)` | `block-reference-plugin` (`Decoration.mark`) | `styles.ts:623` |
| `cm-lp-block-ref-hidden` | `display: none` | `block-reference-plugin` (composes with above) | `styles.ts:627` |
| `cm-lp-inline-comment` | `opacity: 0.5; color: var(--lp-comment)` | `inline-comment-plugin` (`Decoration.mark`) | `styles.ts:630` |
| `cm-lp-inline-comment-hidden` | `display: none` | `inline-comment-plugin` (composes with above) | `styles.ts:634` |

### Block / line styling

| Class | Effect | Emitted by | Source declaration |
|-------|--------|------------|--------------------|
| `cm-lp-h1` | `font-size: var(--heading-h1-font-size, 2.058em)` + weight + color | `heading-plugin` (via `headingLineDeco[1]`) | `styles.ts:130, 24` |
| `cm-lp-h2` | `font-size: var(--heading-h2-font-size, 1.618em)` + weight + color | `heading-plugin` (via `headingLineDeco[2]`) | `styles.ts:137, 25` |
| `cm-lp-h3` | `font-size: var(--heading-h3-font-size, 1.272em)` + weight + color | `heading-plugin` (via `headingLineDeco[3]`) | `styles.ts:144, 26` |
| `cm-lp-h4` | `font-size: var(--heading-h4-font-size, 1em)` + weight + color | `heading-plugin` (via `headingLineDeco[4]`) | `styles.ts:151, 27` |
| `cm-lp-h5` | `font-size: var(--heading-h5-font-size, 1em)` + weight + color | `heading-plugin` (via `headingLineDeco[5]`) | `styles.ts:158, 28` |
| `cm-lp-h6` | `font-size: var(--heading-h6-font-size, 1em)` + weight + color | `heading-plugin` (via `headingLineDeco[6]`) | `styles.ts:165, 29` |
| `cm-lp-blockquote` | left border + padding 8px + bg | `blockquote-plugin` (via `blockquoteLineDeco`, depth 1) | `styles.ts:6, 180` |
| `cm-lp-blockquote-2` | left border + padding 16px + bg-2 | `blockquote-plugin` (`blockquoteDepthDeco[2]`) | `blockquote-plugin.ts:21, styles.ts:185` |
| `cm-lp-blockquote-3` | left border + padding 24px + bg-3 | `blockquote-plugin` (`blockquoteDepthDeco[3]`) | `blockquote-plugin.ts:22, styles.ts:190` |

## Class composition rules to preserve

1. **Cursor reveal ALWAYS uses two classes**: the hidden one + a `*-visible` modifier composed in the same `Decoration.mark` `class` string (e.g., `'cm-formatting-inline cm-formatting-inline-visible'`). The new pipeline must emit both classes the same way — themes target them as a pair.
2. **`cm-formatting-block` and `cm-formatting-block-visible` are reused by both heading and blockquote** — handlers in the new pipeline must emit identical strings.
3. **`cm-lp-block-ref-hidden` and `cm-lp-inline-comment-hidden` compose with their non-hidden siblings** — they're always emitted together as `'cm-lp-X cm-lp-X-hidden'`. Preserve this composition.

## Decoration constants worth reusing (instead of re-emitting strings)

These exports already exist in `src/lib/core/markdown-editor/extensions/live-preview/styles.ts` and the new pipeline should import them rather than redefine:

```ts
linkTextDeco                  // styles.ts:3   cm-lp-link
boldTextDeco                  // styles.ts:4   cm-lp-bold
italicTextDeco                // styles.ts:5   cm-lp-italic
blockquoteLineDeco            // styles.ts:6   cm-lp-blockquote
strikethroughTextDeco         // styles.ts:7   cm-lp-strikethrough
inlineCodeTextDeco            // styles.ts:8   cm-lp-code
wikilinkTextDeco              // styles.ts:9   cm-lp-wikilink
highlightTextDeco             // styles.ts:10  cm-lp-highlight
hiddenLineDeco                // styles.ts:14  cm-lp-hidden-line
headingLineDeco[1..6]         // styles.ts:24-31  cm-lp-h1..h6
```

## Out-of-scope classes (block widgets, **not** retired in this refactor)

Listed for reference only — these are emitted by `frontmatter-field`, `code-block-field`, `table-field`, `callout-field`, `collection-block-field`, `meta-bind-button-field`, `mermaid-field`, `block-math-field`, `image-plugin`, `audio-plugin`, `video-plugin`, `wikilink-embed-plugin`, `meta-bind-input-plugin`, `footnote-plugin`, `queryjs-block-field`. They survive the refactor unchanged:

- `cm-lp-frontmatter*` (frontmatter widget — many sub-classes for inputs, tags, rows, etc.)
- `cm-lp-codeblock*` (code-block widget container, header, lang label, copy button, syntax tokens)
- `cm-lp-table*` (markdown table widget)
- `cm-lp-callout*` (callout container, title, fold chevron)
- `cm-lp-collection*` (collection block widget — table/calendar/linear-calendar variants)
- `cm-lp-mermaid*` (mermaid diagram container + header + diagram + error)
- `cm-lp-math-inline`, `cm-lp-math-block`, `cm-lp-math-error` (KaTeX containers)
- `cm-lp-meta-bind-*` (button, select, input variants — primary/destructive/plain/default + error)
- `cm-lp-image-wrapper`, `cm-lp-image`, `cm-lp-audio-wrapper`, `cm-lp-audio`, `cm-lp-video-wrapper`, `cm-lp-video`
- `cm-lp-embed*` (wikilink embed container)
- `cm-lp-footnote-ref`, `cm-lp-footnote-def-marker`
- `cm-lp-qjs-*` (queryjs block, error, loading, link, list, table, tasklist)
- `cm-lp-task-checkbox` (interactive checkbox widget — Phase 8 reuses the existing `TaskCheckboxWidget`)
- `cm-lp-ol-marker`, `cm-lp-ul-marker`, `cm-lp-hard-break` (widget-rendered list/break decorations distinct from the `cm-formatting-*` mark classes above)
- `cm-lp-hr` (deprecated wrapper class — `cm-lp-hr-line` is the live one)

## Verification

To re-grep at any later phase:

```bash
# Per-plugin literal `class: '...'` strings:
grep -rEh "class: '[^']+'" \
  src/lib/core/markdown-editor/extensions/live-preview/plugins/{markdown-style,heading,blockquote,link,simple-widget,inline-marks,inline-comment,block-reference}-plugin.ts

# Decoration constants imported from styles.ts:
grep -E "from '\.\./styles'" \
  src/lib/core/markdown-editor/extensions/live-preview/plugins/*.ts

# All baseTheme rule selectors (definitive list):
grep -nE "'\.cm-(formatting|lp)-" src/lib/core/markdown-editor/extensions/live-preview/styles.ts
```

The first command ran against `main` at the start of Phase 0; the table above is the result.
