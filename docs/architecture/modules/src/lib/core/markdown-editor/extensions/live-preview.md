---
summary: "Composes the live-preview extensions and holds their shared decoration machinery, paste handlers, inline pipeline and widgets."
---

## Responsibility

Owns the live-preview layer of the CodeMirror editor: it turns markdown syntax into decorations and decides per range whether the syntax shows as source (lines the selection touches) or as rendered output. live-preview.ts composes the block decorators, the inline pipeline, the residual inline plugins, scroll debounce, the click handler, drag state, block band clicks and the paste handlers, gated by the kill-switch map the caller passes in. core/ holds the shared machinery, handlers/ the editor-level paste handlers, inline/ the unified inline pipeline and its per-construct handlers, and widgets.ts plus widgets/ the WidgetType classes. Parsing lives in parsers/ and block decorators in plugins/, documented as their own modules. It does not own the host that supplies vault access and Tauri calls (src/lib/app/editor-host.ts).

## Key files

- `src/lib/core/markdown-editor/extensions/live-preview/live-preview.ts`: Composition root: livePreviewExtensions maps kill-switch names to extensions through total Records, and livePreview wraps the result in livePreviewCompartment.
- `src/lib/core/markdown-editor/extensions/live-preview/index.ts`: Public barrel.
- `src/lib/core/markdown-editor/extensions/live-preview/core/block-decorator.ts`: blockDecorator factory that all block decorators except frontmatter are built with.
- `src/lib/core/markdown-editor/extensions/live-preview/core/check-update-action.ts`: Stateless update gate and the pure-scroll guard.
- `src/lib/core/markdown-editor/extensions/live-preview/core/reveal.ts`: revealPredicate and the touched-lines helpers behind the update gate.
- `src/lib/core/markdown-editor/extensions/live-preview/core/decorator-names.ts`: Kill-switch vocabulary and DECORATOR_LABELS. Imports nothing by design.
- `src/lib/core/markdown-editor/extensions/live-preview/core/fenced-block-renderers.ts`: Static facet mapping a fence language to a FencedBlockRenderer.
- `src/lib/core/markdown-editor/extensions/live-preview/core/profiling.ts`: Module-level profiling and logging port.
- `src/lib/core/markdown-editor/extensions/live-preview/widgets.ts`: Most WidgetType classes (task checkbox, list markers, image and media, table, embeds, meta-bind controls) and dispatchMetaBindUpdate.
- `src/lib/core/markdown-editor/extensions/live-preview/click-handler.ts`: Modifier-click on a link opens it externally and on a tag pill opens tag search.

## State

- livePreviewCompartment: module-level Compartment. livePreview(false) installs an empty array, turning decorations off.
- calloutFoldState and mouseSelectingField: StateFields installed by livePreviewExtensions
- Profiling port: module-level variable in core/profiling.ts, set by configureProfiling from src/lib/app/boot.ts. It is not a facet, so changing it does not reconfigure the editor.
- Mermaid and math render caches: module-level maps in widgets/mermaid-widget.ts and widgets/math-widget.ts, cleared by clearMermaidCache and clearMathCache
- disabledDecorators is read at compose time from a caller-supplied map. The persisted key is settings.json disabledDecorators and this folder stores nothing itself.

## Collaborators

- `src/lib/core/markdown-editor/extensions/live-preview/plugins`: Block decorators and residual inline plugins that live-preview.ts installs. They use the blockDecorator factory, reveal rule, update gate and widgets from here.
- `src/lib/core/markdown-editor/extensions/live-preview/parsers`: Parsing functions used by widgets.ts, click-handler.ts and the inline handlers.
- `src/lib/core/markdown-editor`: editor-host.ts declares EditorHost and the editorHost facet that widgets, click-handler.ts and wikilink-navigation.ts read for resolveLink, readNote, assetUrl, openExternal, openTagSearch, openLink, createNote and openView. setup/editor-extensions.ts and MarkdownEditor.svelte are the callers.
- `src/lib/core/markdown-editor/extensions/wikilink`: Wikilink parsing and heading and block anchor lookup used by wikilink-navigation.ts and widgets.ts.
- `src/lib/core/frontmatter`: dispatchMetaBindUpdate parses, rebuilds and lossy-checks frontmatter with properties.logic.ts.
- `src/lib/core/filesystem`: isBinaryFile in wikilink-navigation.ts.
- `src/lib/core/settings`: TroubleshootingSection renders the kill switches from decorator-names.ts.
- `src/lib/app`: boot.ts calls configureProfiling, app-lifecycle.service.ts clears the mermaid and math caches on teardown, and editor-host.ts passes the fenced block renderers and calls followWikilink.
- `src/lib/features`: The collection feature defines a FencedBlockRenderer for its fence language, which src/lib/app/editor-host.ts passes to the editor.
- `src/lib/plugins`: The queryjs plugin defines a FencedBlockRenderer (passed in by src/lib/app/editor-host.ts) and uses the profiling helpers; the kanban service imports stripFrontmatter from embed-resolver.logic.ts.
- `src/lib/utils`: Pure helpers for URL sanitizing, SVG sanitizing, color, platform, tag extraction, font stacks and frontmatter aliases.

## Subfolders

- `src/lib/core/markdown-editor/extensions/live-preview/core`: Shared machinery: blockDecorator factory, update gating, reveal rule, mouse drag state, scroll debounce, profiling port, fenced block renderer facet, kill-switch names, form-control event filter, visible-range helpers and band click handling.
- `src/lib/core/markdown-editor/extensions/live-preview/handlers`: Editor-level paste handlers: HTML anchors become markdown links and TSV clipboard text becomes a pipe table. Each has a pure logic file and returns false to fall through.
- `src/lib/core/markdown-editor/extensions/live-preview/inline`: Unified inline pipeline: inline-formatting-plugin.ts walks the syntax tree once and dispatches node and line handlers, inline-extensions.ts lists the production handlers, and handlers/ holds one handler per inline construct.
- `src/lib/core/markdown-editor/extensions/live-preview/widgets`: WidgetType classes for code blocks, math, mermaid diagrams and meta-bind buttons, with the module-level mermaid and math caches. Other widget classes live in widgets.ts.
- `src/lib/core/markdown-editor/extensions/live-preview/parsers`: Pure finders for live-preview constructs. Documented as its own module.
- `src/lib/core/markdown-editor/extensions/live-preview/plugins`: Block decorators and residual inline ViewPlugins. Documented as its own module.

## Gotchas

- Live preview is toggled by the compartment. livePreview(false) installs an empty array, so source mode removes every live-preview decoration.
- Block decorator install order is precedence order, set by BLOCK_DECORATOR_NAMES. Do not reorder it casually.
- Kill-switch names are persisted user data (settings.json disabledDecorators). Renaming one orphans saved toggles, so settingsKey is typed as the closed BlockDecoratorName union and user-facing text lives only in DECORATOR_LABELS.
- decorator-names.ts imports nothing on purpose, so the Troubleshooting settings section does not pull katex, mermaid or DOMPurify into the settings chunk.
- checkUpdateAction reads only the current ViewUpdate and keeps no state. A selection move rebuilds only when the set of touched lines changes, and a reconfigure always rebuilds. Plugins must not keep cursor memory between updates.
- Reveal is suppressed during a mouse drag: revealPredicate returns false while mouseSelectingField is set, and the update gate skips rebuilds until the release.
- Inline handlers read reveal state only through isRevealed and must not re-implement the pipeline's block-context suppression, dedup or update gating. A new inline construct is a handler in inline/handlers/, not a new plugin (docs/LIVE-PREVIEW.md).
- Profiling configuration is module-level, so a settings toggle never reconfigures the editor. profileStart and profileEnd are no-ops until the port is configured.
- Interactive controls inside widgets must stop propagation on mousedown, or CodeMirror moves the cursor onto the widget line, reveals it and destroys the widget (docs/LIVE-PREVIEW.md states the same rule).
- Widgets that hold form controls answer ignoreEvent with isFormControlInputEvent so key, input and composition events from inputs do not reach the editor keymap, while mouse events still do.
- dispatchMetaBindUpdate refuses a write when the frontmatter would be lost on rebuild: it shows an error toast, dispatches nothing and returns false, so each caller must reset its own control.
- fencedBlockRenderers is a static facet and the first renderer for a language wins. A renderer whose widgets snapshot reactive state must supply rebuildOn because the editor does not know the store.
- Widget classes are split between widgets.ts and widgets/. Check both when looking for a widget.
- Wikilink navigation silently ignores any target isBinaryFile reports, so a binary file is never opened as UTF-8.
- Paste handlers run in a fixed order: the HTML link handler first, then the TSV handler. Each returns false to let the next handler or CodeMirror's default take over.
- No Tauri call or event listener lives in this folder. Host actions go through the editorHost facet implemented in src/lib/app/editor-host.ts.
