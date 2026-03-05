# Live Preview Plugin Architecture

The live preview system (`core/markdown-editor/extensions/live-preview/`) renders markdown as rich text while editing. It uses a modular architecture where each markdown feature is an independent CodeMirror ViewPlugin.

## File Structure

```
live-preview/
  core/           # Shared utilities (shouldShowSource, checkUpdateAction, etc.)
  parsers/        # Pure parsing functions — no CM6 imports, testable in isolation
  plugins/        # ViewPlugin implementations (one per feature)
  widgets/        # WidgetType implementations for block replacements
  styles.ts       # CSS animation classes + all preview styling
  live-preview.ts # Composition layer — assembles all plugins into Extension[]
```

## Two Plugin Types

| Type | Used for | Iteration | Range |
|------|----------|-----------|-------|
| **Inline ViewPlugin** | Headings, bold/italic, links, etc. | `syntaxTree(state).iterate()` over Lezer AST | `view.visibleRanges` only |
| **Block ViewPlugin** | Code blocks, tables, frontmatter, etc. | `getAllLines(state)` + parser function | Full document |

## Core Utilities (every plugin uses these)

- **`shouldShowSource(state, from, to)`** — Returns true if any cursor/selection intersects `[from, to]`. This is per-element: only the element under the cursor shows source markdown.
- **`checkUpdateAction(update)`** — Returns `'rebuild'` | `'skip'` | `'none'`. Skips during mouse drag to prevent flicker. All plugins use this in `update()`.
- **`isInsideBlockContext(node)`** — Returns true if node is inside `FencedCode`, `CodeBlock`, `HTMLBlock`, or `CommentBlock`. All inline plugins must check this to avoid decorating inside code blocks.

## Critical Rule: `Decoration.mark()` NOT `Decoration.replace()`

**NEVER use `Decoration.replace({})` to hide formatting marks.** It removes elements from the DOM entirely, causing instant pop-in/pop-out with no animation.

**ALWAYS use `Decoration.mark({ class })` with CSS animation classes:**

```typescript
// WRONG — mark disappears instantly, no animation
Decoration.replace({}).range(markFrom, markTo);

// CORRECT — mark stays in DOM, hidden via CSS, smooth transition
const cls = isTouched
  ? 'cm-formatting-inline cm-formatting-inline-visible'
  : 'cm-formatting-inline';
Decoration.mark({ class: cls }).range(markFrom, markTo);
```

Two CSS animation strategies:
- **Inline marks** (`**`, `*`, `~~`, `` ` ``, `==`): `cm-formatting-inline` — hidden via `max-width: 0` + `opacity: 0`
- **Block marks** (`#`, `>`): `cm-formatting-block` — hidden via `font-size: 0.01em` + `opacity: 0`

`Decoration.replace({ widget })` is still correct for **block plugins** that replace entire multi-line blocks with a widget (tables, code blocks, frontmatter, etc.).

## Inline ViewPlugin Template

```typescript
export const myPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.decorations = buildDecorations(view.state, view.visibleRanges);
    }
    update(update: ViewUpdate) {
      if (checkUpdateAction(update) === 'rebuild') {
        this.decorations = buildDecorations(update.view.state, update.view.visibleRanges);
      }
    }
  },
  { decorations: (v) => v.decorations },
);

export function buildDecorations(
  state: EditorState,
  ranges: readonly { from: number; to: number }[],
): DecorationSet {
  const decorations: Range<Decoration>[] = [];
  for (const { from, to } of ranges) {
    syntaxTree(state).iterate({
      from, to,
      enter: (node) => {
        if (node.name !== 'TargetNode') return;
        if (isInsideBlockContext(node)) return false;
        const isTouched = shouldShowSource(state, node.from, node.to);
        // Apply decorations based on isTouched...
      },
    });
  }
  return Decoration.set(decorations, true);
}
```

## Block ViewPlugin Template

```typescript
export function computeMyBlock(state: EditorState): DecorationSet {
  const lines = getAllLines(state);
  const builder = new RangeSetBuilder<Decoration>();
  let idx = 0;
  while (idx < lines.length) {
    const result = findMyBlock(lines, idx);
    if (result) {
      if (!shouldShowSource(state, result.from, result.to)) {
        builder.add(result.from, result.to, Decoration.replace({ widget: new MyWidget(...) }));
      }
      idx = result.endIdx + 1;
    } else { idx++; }
  }
  return builder.finish();
}

export const myBlockField = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) { this.decorations = computeMyBlock(view.state); }
    update(update: ViewUpdate) {
      if (checkUpdateAction(update) === 'rebuild') {
        this.decorations = computeMyBlock(update.state);
      }
    }
  },
  { decorations: (v) => v.decorations },
);
```

## Styling vs. Visibility Separation

Two independent plugins handle inline formatting:
- **`inlineMarksPlugin`** — Mark visibility (show/hide `**`, `*`, etc.). Rebuilds on every selection change.
- **`markdownStylePlugin`** — Content styling (bold weight, italic style, etc.). Rebuilds only on `docChanged`/`viewportChanged` — NOT on selection. More efficient.

## Adding a New Plugin

1. Create parser in `parsers/` if needed (pure function, testable)
2. Create `plugins/<feature>-plugin.ts` using the template above
3. Create widget in `widgets/` if block plugin needs one
4. Add to `livePreviewExtensions()` in `live-preview.ts`
5. Add CSS to `styles.ts`
6. Write tests (parser tests + plugin tests)
