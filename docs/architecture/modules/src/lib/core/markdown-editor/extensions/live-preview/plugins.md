---
summary: "Live-preview block decorators and the residual inline ViewPlugins that render markdown constructs in the editor."
---

## Responsibility

Holds the CodeMirror decorators for block-level constructs (frontmatter, code blocks, block comments, tables, callouts, queryjs and collection blocks, meta-bind buttons, mermaid, block math, audio, video) and the residual inline ViewPlugins (images, footnotes, wikilink embeds, meta-bind inputs). Block decorators are built with the blockDecorator factory from core/, and the inline plugins use core helpers such as revealPredicate and checkUpdateAction. It does not own parsing, widgets, styles, the reveal rule, update gating or the kill-switch registry, which live in sibling folders. The inline pipeline for headings, links, tags, wikilinks and similar constructs lives in the sibling inline/ folder.

## Key files

- `src/lib/core/markdown-editor/extensions/live-preview/plugins/mermaid-field.ts`: Smallest complete block decorator and the template for new block constructs.
- `src/lib/core/markdown-editor/extensions/live-preview/plugins/frontmatter-field.ts`: The one block decorator not built with blockDecorator: a StateField that profiles itself, plus frontmatterClick (keeps a press in the hidden frontmatter out of it), frontmatterGuard (keeps keyboard deletions, moves and selections out of it) and frontmatterGutter, with frontmatterEnd as the shared helper.
- `src/lib/core/markdown-editor/extensions/live-preview/plugins/queryjs-block-field.ts`: Block decorator with a gate limiting rebuilds to document edits, selection changes, forced rebuilds and drag release; looks up its renderer in the fencedBlockRenderers facet.
- `src/lib/core/markdown-editor/extensions/live-preview/plugins/callout-field.ts`: Callout decorator using rebuildOn for the fold effect; its type popover writes document text.
- `src/lib/core/markdown-editor/extensions/live-preview/plugins/meta-bind-input-plugin.ts`: Representative residual inline ViewPlugin that reads frontmatter for initial values.
- `src/lib/core/markdown-editor/extensions/live-preview/live-preview.ts`: Composition layer outside this folder that imports every plugin and wires it to a kill-switch name.

## State

- No owned persistent state. Block decorators produce a DecorationSet per EditorView, and the frontmatter StateField keeps its set in editor state.
- Decorator names are persisted user data (settings.json disabledDecorators). The name lists live in core/decorator-names.ts, outside this folder.
- Widget caches live in widgets/ and in feature folders, not here.

## Collaborators

- `src/lib/core/markdown-editor/extensions/live-preview`: Uses the core/ machinery (blockDecorator, revealPredicate, checkUpdateAction, fencedBlockRenderers, effects, profiling, frontmatter-slice), the parsers, widgets, styles and decorator-names. live-preview.ts imports and installs every plugin.
- `src/lib/core/markdown-editor/extensions/live-preview/parsers`: The finders that map source to block or inline ranges.
- `src/lib/core/markdown-editor/extensions/callout`: callout-field.ts uses CALLOUT_COLORS from callout.logic.ts.
- `src/lib/core/frontmatter`: table-field.ts and meta-bind-input-plugin.ts parse frontmatter properties.
- `src/lib/core/markdown-editor/setup`: editor-extensions.ts installs the fencedBlockRenderers facet from the renderers the caller passes in. queryjs and collection blocks depend on it.
- `src/lib/app`: editor-host.ts supplies the queryjs and collection fenced block renderers.

## Gotchas

- Hidden syntax must use the shared hiddenSyntaxDeco replace decoration from styles.ts and never an animated mark, because animated width changes broke CodeMirror's goal-column measurement (docs/LIVE-PREVIEW.md).
- Block decorators built with blockDecorator get the viewport-scroll guard, the checkUpdateAction call and the profiling bracket automatically, so do not hand-write them. frontmatter-field.ts is the one exception.
- A block decorator whose output depends on state other than the document or selection must name it in rebuildOn, because checkUpdateAction returns none for effect-only transactions. callout-field.ts passes the fold effect for this reason.
- queryjs-block-field.ts uses a gate that accepts document edits, selection changes, forceDecorationRebuild and the mouse-drag release. The release must pass the gate because the update gate skips rebuilds during a drag.
- queryjs and collection blocks become widgets only when a renderer for their language is in the fencedBlockRenderers facet. With no renderer the block stays as raw lines.
- settingsKey is typed BlockDecoratorName and is persisted in user settings, so renaming it orphans saved toggles. profileLabel is a separate free string.
- A new block decorator must be registered in BLOCK_DECORATOR_NAMES, in BLOCK_EXTENSIONS in live-preview.ts and as its settingsKey. The total Record types make a partial registration fail pnpm check.
- callout-field.ts writes document text: its type popover dispatches a change, and its mousedown handlers stop propagation so CodeMirror does not move the cursor. This folder is not read-only.
- Block decorators and inline plugins decide what shows as source only through revealPredicate, built once per decoration pass; none reads the selection itself (docs/LIVE-PREVIEW.md).
- No Tauri command or event is used here and no store is imported. Settings reach the editor through live-preview.ts parameters.
