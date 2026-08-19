# Live Preview Plugin Architecture

The live preview system (`core/markdown-editor/extensions/live-preview/`) renders markdown as rich text while editing. It runs two tracks: one decorator per **block** construct, and a single shared pipeline for **inline** constructs - four residual inline ViewPlugins excepted, see the table below.

The decision record behind that split is [`docs/adr/0008-codemirror-live-preview-architecture.md`](adr/0008-codemirror-live-preview-architecture.md). That file is the *why*; this one is the *how*. Change one and check the other.

## File Structure

```
live-preview/
  core/           # Shared machinery: blockDecorator, checkUpdateAction, shouldShowSource, profiling
  inline/         # Unified inline pipeline: HighlightStyle + inlineFormattingPlugin
    handlers/     # One NodeHandler / LineHandler per inline construct
  parsers/        # Parsing functions split out of the decorators (several read the Lezer tree)
  plugins/        # Block decorators + the four residual inline ViewPlugins
  widgets/        # WidgetType implementations for block replacements
  handlers/       # Editor-level paste handlers (HTML link, TSV table)
  styles.ts       # CSS animation classes + all preview styling
  live-preview.ts # Composition layer - assembles every decorator into Extension[]
```

## Three Decorator Tracks

| Track | Covers | Lives in | Iteration | Range |
|-------|--------|----------|-----------|-------|
| **Unified inline pipeline** | Headings, blockquotes, links / autolinks / wikilinks, emphasis + code + strikethrough + highlight marks, escapes, inline comments, block references, simple widgets | `inline/inline-formatting-plugin.ts` + `inline/handlers/` | One `syntaxTree(state).iterate()` walk dispatching `NodeHandler`s by Lezer node name, then a line walk dispatching `LineHandler`s | `expandedVisibleRanges(view)` |
| **Inline ViewPlugins** (4) | `imagePlugin`, `footnotePlugin`, `wikilinkEmbedPlugin`, `metaBindInputPlugin` | `plugins/` | Their own tree or line scan | `expandedVisibleRanges(view)` |
| **Block decorators** (12) | `frontmatter`, `codeBlock`, `blockComment`, `table`, `callout`, `collectionBlock`, `queryjs`, `metaBindButton`, `mermaid`, `blockMath`, `audio`, `video` | `plugins/` | `getAllLines(state)` + a parser, or a Lezer walk | Full document |

Eleven of the twelve block decorators are `blockDecorator()` products from `core/block-decorator.ts`. `frontmatterField` is the exception - see the template section below. `audio-plugin.ts` and `video-plugin.ts` are block decorators despite the `-plugin` suffix.

## Core Utilities

- **`shouldShowSource(state, from, to)`** (`core/should-show-source.ts`) - true if any selection range intersects `[from, to]`. Per-element: only the element under the cursor shows source markdown.
- **`checkUpdateAction(update, lastCursorLine?)`** (`core/check-update-action.ts`) - returns `'rebuild'` | `'skip'` | `'none'`. `'none'` on a pure viewport change (scrolling defers to `scrollDebouncePlugin`), `'skip'` during a mouse drag to prevent flicker. When `lastCursorLine` is supplied, a selection change that keeps the cursor on the same line also returns `'none'` - the second argument is what turns every intra-line cursor move from a full rescan into a no-op. `blockDecorator` makes this call for every one of its products, which is eleven of the twelve block decorators - `frontmatterField` is a `StateField` and never calls it. The inline pipeline and the four inline ViewPlugins make the call themselves.
- **`isInsideBlockContext(node)`** (`core/is-inside-block-context.ts`) - true if the node is, or is nested under, a `FencedCode`, `CodeBlock`, `HTMLBlock`, `CommentBlock`, `BlockMath` or `Frontmatter` node. It checks the node itself before walking up, because regex parsers resolving a position can land *on* the block-context node. Inline decorators must check this to avoid decorating inside code blocks.
- **`expandedVisibleRanges(view, buffer = 2000)`** (`core/expanded-ranges.ts`) - visible ranges grown by `buffer` characters in each direction, so content has decorations ready before it scrolls in.
- **`getAllLines(state)`** (`core/get-all-lines.ts`) - every `Line` in the document, for full-document block scans.
- **`profileStart(label?)` / `profileEnd(label, start)`** (`core/profiling.ts`) - `LP-TRACE` enter/exit plus an `LP-PROFILE` line when the work exceeds the threshold. Both no-op unless `settingsStore.livePreviewProfiling` is on.

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

`Decoration.replace({ widget })` is still correct for **block decorators** that replace entire multi-line blocks with a widget (tables, code blocks, frontmatter, etc.).

## Inline Construct Template (handler)

A new inline construct is a **handler, not a plugin**. Write a `NodeHandler` (matches a Lezer node name) or a `LineHandler` (regex over one line, for syntax with no usable Lezer node) in `inline/handlers/`, then push it into `PRODUCTION_NODE_HANDLERS` or `PRODUCTION_LINE_HANDLERS` in `inline/inline-extensions.ts`.

```typescript
// inline/handlers/my-handler.ts
import { Decoration } from '@codemirror/view';
import type { NodeHandler } from '../inline-formatting-plugin';

export const myHandler: NodeHandler = {
  nodeType: 'MyLezerNode',
  decorate({ node, isTouched, decorations }) {
    const cls = isTouched(node.from, node.to)
      ? 'cm-formatting-inline cm-formatting-inline-visible'
      : 'cm-formatting-inline';
    decorations.push(Decoration.mark({ class: cls }).range(node.from, node.to));
  },
};
```

`decorate` receives `{ node, state, isTouched, decorations, scratch }` (`{ line, state, isTouched, decorations, scratch }` for a `LineHandler`, which also needs a `name`). `isTouched(from, to)` is `shouldShowSource` bound to the current state; `scratch` is a per-build `Map` for deduping across dispatches.

The pipeline already supplies, once, for every handler: the single syntax-tree walk, `isInsideBlockContext` suppression, per-node and per-line dedup, `expandedVisibleRanges`, the viewport-scroll skip, `checkUpdateAction` with `lastCursorLine`, and the `inline-formatting` profile bracket. Do not re-implement any of it in a handler.

## Inline ViewPlugin Template (residual, four only)

`imagePlugin`, `footnotePlugin`, `wikilinkEmbedPlugin` and `metaBindInputPlugin` are the only standalone inline ViewPlugins left. Reach for this shape only when a construct genuinely cannot be a handler.

```typescript
export const myPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    lastCursorLine: number;

    constructor(view: EditorView) {
      this.decorations = buildDecorations(view.state, expandedVisibleRanges(view));
      this.lastCursorLine = view.state.doc.lineAt(view.state.selection.main.head).number;
    }

    update(update: ViewUpdate) {
      if (checkUpdateAction(update, this.lastCursorLine) !== 'rebuild') return;
      this.lastCursorLine = update.state.doc.lineAt(update.state.selection.main.head).number;
      const _t = profileStart('my-plugin');
      this.decorations = buildDecorations(update.view.state, expandedVisibleRanges(update.view));
      profileEnd('my-plugin', _t);
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

Do **not** add the `if (update.viewportChanged && !update.docChanged && !update.selectionSet) return;` guard here. `checkUpdateAction` already returns `'none'` on `viewportChanged`, so these four get the skip for free. Only two places write that line: `blockDecorator`, where it is load-bearing because a `rebuildOn` effect short-circuits `checkUpdateAction` entirely, and `inlineFormattingPlugin`.

## Block Decorator Template

A block decorator is a `compute(state): DecorationSet` full-document scan plus one `blockDecorator()` call. `plugins/mermaid-field.ts` is the smallest complete example.

```typescript
// plugins/my-block-field.ts
export function computeMyBlocks(state: EditorState): DecorationSet {
  const lines = getAllLines(state);
  const builder = new RangeSetBuilder<Decoration>();
  let idx = 0;

  while (idx < lines.length) {
    const result = findMyBlock(lines, idx);
    if (result) {
      const { block, endIdx } = result;

      if (!shouldShowSource(state, block.openFenceFrom, block.closeFenceTo)) {
        builder.add(
          block.openFenceFrom,
          block.openFenceTo,
          Decoration.replace({ widget: new MyWidget(block.source) }),
        );

        // Content lines + closing fence: hide
        for (let i = idx + 1; i <= endIdx; i++) {
          builder.add(lines[i].from, lines[i].from, hiddenLineDeco);
          builder.add(lines[i].from, lines[i].to, Decoration.replace({}));
        }
      }

      idx = endIdx + 1;
    } else {
      idx++;
    }
  }

  return builder.finish();
}

export const myBlockField = blockDecorator({
  settingsKey: 'myBlock',
  profileLabel: 'my-block',
  compute: computeMyBlocks,
});
```

`'myBlock'` has to be a real member of `BLOCK_DECORATOR_NAMES` before this compiles; until it is, `pnpm check` rejects the spec. That failure is the registration contract working, not a broken template - see *Adding a New Construct*.

**The factory supplies these; never hand-write them:**
- the viewport-only-scroll guard (`update.viewportChanged && !update.docChanged && !update.selectionSet`),
- the `lastCursorLine` field and the `checkUpdateAction(update, this.lastCursorLine)` call,
- the `profileStart` / `profileEnd` bracket around `compute`, under `profileLabel`.

**`settingsKey` and `profileLabel` are not interchangeable.** `settingsKey` is typed to the closed `BlockDecoratorName` union from `core/decorator-names.ts` and is persisted user data (`settings.json` → `disabledDecorators`); renaming one orphans every user's saved toggle. `profileLabel` is a free string used only for `LP-PROFILE` / `LP-TRACE`, and the two deliberately diverge in places (`queryjs` vs `queryjs-block`, `codeBlock` vs `code-block`). The factory reads `profileLabel`; `settingsKey` is the type-level declaration that pins the decorator to a kill-switch name, and the gating itself happens in `live-preview.ts` (see *Adding a New Construct*).

**Two optional fields:**
- `rebuildOn: readonly StateEffectType<unknown>[]` - extra effects that force a rebuild. `checkUpdateAction` reports `'none'` for an effect-only transaction, so a decorator whose output depends on custom state must name the effect. `plugins/callout-field.ts` passes `[toggleCalloutFold]`: folding a callout changes no document text and no selection, and the chevron would not redraw without it.
- `gate: (update: ViewUpdate) => boolean` - a narrower filter evaluated right after the viewport guard; return `false` to drop the update entirely. `plugins/queryjs-block-field.ts` uses it to accept only document edits, selection changes and `forceDecorationRebuild`, because its widgets are the expensive ones.

**The `StateField` exception.** `plugins/frontmatter-field.ts` exports `frontmatterField` as a `StateField.define<DecorationSet>`, not a `blockDecorator()` product, and calls `profileStart` / `profileEnd` by hand. It needs no viewport guard at all: a pure scroll dispatches no transaction, so `StateField.update()` never runs for it. It rebuilds on `tr.docChanged` or a `forceDecorationRebuild` effect. Do not copy this shape for a new construct.

## Styling vs. Visibility Separation

Inline formatting is split in two, both halves installed by `inlineExtensions()` in `inline/inline-extensions.ts`:

- **Styling** - `inline/markdown-highlight-style.ts`. A `HighlightStyle.define([])` mapping `tags.strong` / `tags.emphasis` / `tags.strikethrough` / `tags.monospace` to the `cm-lp-bold` / `cm-lp-italic` / `cm-lp-strikethrough` / `cm-lp-code` classes themes already target, wrapped by `inlineHighlightExtension()` (`syntaxHighlighting`). It has no cursor awareness and no rebuild path, which is what makes it cheap.
- **Visibility** - the handlers inside `inlineFormattingPlugin`. Everything that needs cursor reveal (the `*-visible` modifier classes), regex parsing, or block-context suppression lives there.

Disabling `markdownStyle` in Troubleshooting drops both the `HighlightStyle` wrapper and the `highlightHandler`; the other names in `TOGGLEABLE_HANDLERS` drop handler sets only.

## Widget Caching

Widgets with expensive `toDOM()` work must cache, because CodeMirror destroys and recreates widgets as they scroll in and out of the viewport and calls `toDOM()` fresh each time - `eq()` returning `true` does not prevent that. There are **two distinct schemes**, and live-DOM caching is queryjs-only.

| Widget | Cache | Key | Cached value | Teardown clear |
|--------|-------|-----|--------------|----------------|
| `widgets/queryjs-block-widget.ts` | `queryjsSessionStore` (`plugins/queryjs/queryjs-session.store.svelte.ts`) | `jsContent` | The **live container element**, re-attached on hit | `queryjsSessionStore.reset()` |
| `widgets/mermaid-widget.ts` | `mermaidCache: Map<string, string>` | Diagram source | Sanitized SVG markup, stored **after** the render-id strip | `clearMermaidCache()` |
| `widgets/math-widget.ts` | `mathCache: Map<string, string>` | `block:<formula>` / `inline:<formula>` | Sanitized KaTeX HTML | `clearMathCache()` |
| `widgets/collection-block-widget.ts` | `collectionCache: Map<string, CollectionCacheEntry>` | `yamlContent` | Query **data** - `{ version, view, result }`; the DOM is rebuilt per `toDOM()` | `clearCollectionCache()` |

All four clears run from `teardownVault` in `core/app-lifecycle/app-lifecycle.service.ts`.

**Strings and data are the default; live elements are the exception.** Two widgets can exist for identical content - the same diagram twice in one note. CodeMirror builds new lines detached, so handing both the same live node moves it to the last widget and blanks the earlier occurrence. A markup string or a data object cannot be stolen that way, which is why mermaid, math and collection all cache values rather than nodes.

- **math's key MUST carry the mode.** `MathWidget` serves both `$$…$$` blocks (a `<div>`, `displayMode: true`, from `plugins/block-math-field.ts`) and inline `$…$` (a `<span>`, `displayMode: false`, from `inline/handlers/simple-widget-handlers.ts`). KaTeX emits different markup per mode, so a formula-only key would serve block markup to an inline site.
- **collection caches the query, not the render.** Rows, pills and bars carry click listeners, so markup strings would lose them; `renderView()` runs on every `toDOM()` including cache hits. A hit skips the `parseCollectionYaml` parse and `executeQuery` over the property index, and the entry is only reused while its stored `collectionStore.version` still matches.
- **queryjs is the deliberate exception.** `<canvas>` pixel buffers, `<video>` playback state and `<iframe>` content survive re-mount only through DOM identity, so the store holds the element itself. Its `if (cached && !cached.isConnected)` check is a partial mitigation, not a fix: it detects that another on-screen widget currently owns the node and falls through to the normal cache-miss path instead of stealing it, which under `autoRunQueries: 'manual'` is the ▶ Run placeholder rather than an execution. Do not copy this pattern into a new widget without that same reason - see ADR 0010.

**Interactive controls inside a widget must `stopPropagation` on `mousedown`.** Otherwise CodeMirror moves the cursor into the block, `shouldShowSource` turns true, the widget is destroyed, and the click fires on detached DOM.

## Adding a New Construct

### Block construct

1. Parser in `parsers/` if the scan needs one.
2. Widget in `widgets/` if the block is replaced by rich DOM.
3. `plugins/<feature>-field.ts`: a `compute(state): DecorationSet` plus `export const xField = blockDecorator({ settingsKey, profileLabel, compute })`.
4. Register in three places:
   - the name in `BLOCK_DECORATOR_NAMES` (`core/decorator-names.ts`) - installation order there is precedence order, so do not reorder casually;
   - the matching entry in `BLOCK_EXTENSIONS` (`live-preview.ts`);
   - `settingsKey` on the spec.

   `BLOCK_EXTENSIONS` is a total `Record<BlockDecoratorName, Extension>` and `settingsKey` is typed `BlockDecoratorName`, so a half-finished registration fails `pnpm check`. That pair is also what gives the decorator its Troubleshooting kill-switch: `livePreviewExtensions()` installs block decorators by iterating `BLOCK_DECORATOR_NAMES` through `isDisabled()`. A decorator pushed straight into the extension array would bypass `settingsStore.disabledDecorators` and ship with no isolation lever for debugging.
5. CSS in `styles.ts`.
6. Tests: parser tests + a decorator test.

### Inline construct

1. Handler in `inline/handlers/` as a `NodeHandler` or `LineHandler`.
2. Push it into `PRODUCTION_NODE_HANDLERS` or `PRODUCTION_LINE_HANDLERS` in `inline/inline-extensions.ts`.
3. If it needs its own kill-switch, add a name to `INLINE_HANDLER_NAMES` (`core/decorator-names.ts`) and map it in `TOGGLEABLE_HANDLERS`. Handlers absent from that table are always on.
4. CSS in `styles.ts`.
5. Tests: parser tests (if any) + handler tests through `buildInlineDecorations`, which is exported so tests need no `EditorView`.

A whole new inline ViewPlugin is a last resort. It needs a name in `INLINE_PLUGIN_NAMES` and an entry in `INLINE_PLUGIN_EXTENSIONS` (`live-preview.ts`), also a total `Record`.
