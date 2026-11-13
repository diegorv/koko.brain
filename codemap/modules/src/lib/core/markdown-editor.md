# module card src/lib/core/markdown-editor
cols: module <path> <layer> files <n> in-modules <n> out-modules <n> pub <public>/<exports> ipc <called>/<served> card ~<k>k · dep <from> -> <to> <file pairs> · in2/out2 <module> <n> modules: <module>(<via>) · entry <file> ext-in<n> <importers> · file … · sym … · grep: grep -rF -- '-> src/lib/core/markdown-editor ' codemap/modules
sections: neighbors, entry files, files, public, effects, debt
module src/lib/core/markdown-editor core files 108 in-modules 10 out-modules 7 pub 29/353 ipc 0/0 card ~8.3k
## neighbors
dep src/lib/app -> src/lib/core/markdown-editor 10
dep src/lib/core/editor -> src/lib/core/markdown-editor 1
dep src/lib/core/filesystem -> src/lib/core/markdown-editor 1
dep src/lib/core/settings -> src/lib/core/markdown-editor 1
dep src/lib/features/collection -> src/lib/core/markdown-editor 1
dep src/lib/features/copy-block-link -> src/lib/core/markdown-editor 1
dep src/lib/features/todoist-sync -> src/lib/core/markdown-editor 1
dep src/lib/plugins/kanban -> src/lib/core/markdown-editor 2
dep src/lib/plugins/queryjs -> src/lib/core/markdown-editor 2
dep src/lib/plugins/table-of-contents -> src/lib/core/markdown-editor 1
dep src/lib/core/markdown-editor -> src/lib/components 2
dep src/lib/core/markdown-editor -> src/lib/core/editor 7
dep src/lib/core/markdown-editor -> src/lib/core/filesystem 6
dep src/lib/core/markdown-editor -> src/lib/core/frontmatter 5
dep src/lib/core/markdown-editor -> src/lib/core/settings 4
dep src/lib/core/markdown-editor -> src/lib/types 2
dep src/lib/core/markdown-editor -> src/lib/utils 22
in2 src/lib/core/markdown-editor 22 modules: src/lib/features/event-calendar(5) src/lib/features/rail-shell(4) src/lib/core/vault(2) src/lib/features/backlinks(2) src/lib/features/canvas(2) +17 modules
out2 src/lib/core/markdown-editor 1 modules: src/lib/contracts(4)
## entry files
entry src/lib/core/markdown-editor/extensions/live-preview/core/fenced-block-renderers.ts ext-in3 src/lib/app/editor-host.ts src/lib/features/collection/collection-block-widget.ts src/lib/plugins/queryjs/queryjs-block-widget.ts
entry src/lib/core/markdown-editor/extensions/live-preview/core/profiling.ts ext-in2 src/lib/app/boot.ts src/lib/plugins/queryjs/queryjs-block-widget.ts
entry src/lib/core/markdown-editor/extensions/wikilink/navigation.logic.ts ext-in2 src/lib/app/editor-host.ts src/lib/plugins/table-of-contents/toc.logic.ts
entry src/lib/core/markdown-editor/tab-view-state.ts ext-in2 src/lib/core/editor/editor.service.ts src/lib/core/filesystem/link-updater.service.ts
entry src/lib/core/markdown-editor/EditorTabs.svelte ext-in1 src/lib/app/EditorView.svelte
entry src/lib/core/markdown-editor/MarkdownEditor.svelte ext-in1 src/lib/app/EditorView.svelte
entry src/lib/core/markdown-editor/copy-block-link/copy-block-link.logic.ts ext-in1 src/lib/features/copy-block-link/copy-block-link.service.ts
entry src/lib/core/markdown-editor/doc-diff.logic.ts ext-in1 src/lib/features/todoist-sync/note-writer.service.ts
entry src/lib/core/markdown-editor/editor-host.ts ext-in1 src/lib/app/editor-host.ts
entry src/lib/core/markdown-editor/extensions/live-preview/core/decorator-names.ts ext-in1 src/lib/core/settings/sections/TroubleshootingSection.svelte
entry src/lib/core/markdown-editor/extensions/live-preview/embed-resolver.logic.ts ext-in1 src/lib/plugins/kanban/kanban.service.ts
entry src/lib/core/markdown-editor/extensions/live-preview/widgets/math-widget.ts ext-in1 src/lib/app/lifecycle/app-lifecycle.service.ts
entry src/lib/core/markdown-editor/extensions/live-preview/widgets/mermaid-widget.ts ext-in1 src/lib/app/lifecycle/app-lifecycle.service.ts
entry src/lib/core/markdown-editor/extensions/live-preview/wikilink-navigation.ts ext-in1 src/lib/app/editor-host.ts
entry src/lib/core/markdown-editor/extensions/wikilink/completion.logic.ts ext-in1 src/lib/plugins/kanban/KanbanWikilinkSuggestions.svelte
entry src/lib/core/markdown-editor/setup/editor-extensions.ts ext-in1 src/lib/app/commands.ts
## files
file src/lib/core/markdown-editor/EditorTabs.svelte component L119 module src/lib/core/markdown-editor in1 t1
file src/lib/core/markdown-editor/MarkdownEditor.svelte component L762 module src/lib/core/markdown-editor in1 t3
file src/lib/core/markdown-editor/copy-block-link/copy-block-link.logic.ts logic L92 module src/lib/core/markdown-editor in1 t1
file src/lib/core/markdown-editor/doc-diff.logic.ts logic L157 module src/lib/core/markdown-editor in2 t1
file src/lib/core/markdown-editor/editor-host.ts other L107 module src/lib/core/markdown-editor in9 t15
file src/lib/core/markdown-editor/extensions/callout/callout.logic.ts logic L77 module src/lib/core/markdown-editor in3 t1
file src/lib/core/markdown-editor/extensions/callout/callout.ts other L55 module src/lib/core/markdown-editor in1 t0
file src/lib/core/markdown-editor/extensions/callout/index.ts other L1 module src/lib/core/markdown-editor in1 t0
file src/lib/core/markdown-editor/extensions/composition-aware-bracket-matching.ts other L168 module src/lib/core/markdown-editor in1 t1
file src/lib/core/markdown-editor/extensions/date-shortcut/completion.logic.ts logic L46 module src/lib/core/markdown-editor in1 t1
file src/lib/core/markdown-editor/extensions/date-shortcut/completion.ts other L35 module src/lib/core/markdown-editor in1 t0
file src/lib/core/markdown-editor/extensions/lezer/highlight-extension.ts other L44 module src/lib/core/markdown-editor in1 t2
file src/lib/core/markdown-editor/extensions/lezer/math-extension.ts other L115 module src/lib/core/markdown-editor in1 t3
file src/lib/core/markdown-editor/extensions/live-preview/click-handler.ts other L70 module src/lib/core/markdown-editor in1 t1
file src/lib/core/markdown-editor/extensions/live-preview/code-highlight.logic.ts logic L47 module src/lib/core/markdown-editor in1 t1
file src/lib/core/markdown-editor/extensions/live-preview/core/block-band-click.ts other L203 module src/lib/core/markdown-editor in2 t1
file src/lib/core/markdown-editor/extensions/live-preview/core/block-decorator.ts other L91 module src/lib/core/markdown-editor in11 t1
file src/lib/core/markdown-editor/extensions/live-preview/core/check-update-action.ts other L61 module src/lib/core/markdown-editor in6 t2
file src/lib/core/markdown-editor/extensions/live-preview/core/decorator-names.ts other L108 module src/lib/core/markdown-editor in4 t2 | The live-preview decorator kill-switch vocabulary — every name the Troubleshooting section renders a switch for, split by what installs it.
file src/lib/core/markdown-editor/extensions/live-preview/core/effects.ts other L42 module src/lib/core/markdown-editor in6 t8
file src/lib/core/markdown-editor/extensions/live-preview/core/expanded-ranges.ts other L16 module src/lib/core/markdown-editor in5 t1
file src/lib/core/markdown-editor/extensions/live-preview/core/fenced-block-renderers.ts other L43 module src/lib/core/markdown-editor in7 t11
file src/lib/core/markdown-editor/extensions/live-preview/core/form-control-events.ts other L32 module src/lib/core/markdown-editor in2 t1
file src/lib/core/markdown-editor/extensions/live-preview/core/frontmatter-slice.ts other L19 module src/lib/core/markdown-editor in3 t1
file src/lib/core/markdown-editor/extensions/live-preview/core/get-all-lines.ts other L10 module src/lib/core/markdown-editor in4 t1
file src/lib/core/markdown-editor/extensions/live-preview/core/hide-lines.ts other L20 module src/lib/core/markdown-editor in11 t1
file src/lib/core/markdown-editor/extensions/live-preview/core/is-inside-block-context.ts other L21 module src/lib/core/markdown-editor in6 t1
file src/lib/core/markdown-editor/extensions/live-preview/core/mouse-selecting.ts other L56 module src/lib/core/markdown-editor in4 t8
file src/lib/core/markdown-editor/extensions/live-preview/core/profiling.ts other L73 module src/lib/core/markdown-editor in15 t3
file src/lib/core/markdown-editor/extensions/live-preview/core/reveal.ts other L77 module src/lib/core/markdown-editor in17 t4
file src/lib/core/markdown-editor/extensions/live-preview/core/scroll-debounce-plugin.ts other L48 module src/lib/core/markdown-editor in1 t0
file src/lib/core/markdown-editor/extensions/live-preview/embed-resolver.logic.ts logic L75 module src/lib/core/markdown-editor in2 t1
file src/lib/core/markdown-editor/extensions/live-preview/handlers/paste-html-link-handler.ts other L46 module src/lib/core/markdown-editor in1 t0
file src/lib/core/markdown-editor/extensions/live-preview/handlers/paste-html-link.logic.ts logic L112 module src/lib/core/markdown-editor in1 t1 | Pure converter: clipboard HTML with `<a href>` anchors → plain text with markdown links.
file src/lib/core/markdown-editor/extensions/live-preview/handlers/paste-tsv-handler.ts other L41 module src/lib/core/markdown-editor in1 t0
file src/lib/core/markdown-editor/extensions/live-preview/handlers/paste-tsv.logic.ts logic L152 module src/lib/core/markdown-editor in1 t2 | Pure parser: TSV / Excel-clipboard text → markdown table.
file src/lib/core/markdown-editor/extensions/live-preview/index.ts other L1 module src/lib/core/markdown-editor in2 t1
file src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/autolink-handlers.ts other L49 module src/lib/core/markdown-editor in1 t1
file src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/block-reference-handler.ts other L25 module src/lib/core/markdown-editor in1 t1
file src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/blockquote-handler.ts other L50 module src/lib/core/markdown-editor in1 t1
file src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/heading-handler.ts other L63 module src/lib/core/markdown-editor in1 t1
file src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/highlight-handler.ts other L19 module src/lib/core/markdown-editor in1 t2
file src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/inline-comment-handler.ts other L27 module src/lib/core/markdown-editor in1 t1
file src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/mark-handlers.ts other L51 module src/lib/core/markdown-editor in1 t1
file src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/markdown-link-handlers.ts other L70 module src/lib/core/markdown-editor in1 t1
file src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/simple-widget-handlers.ts other L132 module src/lib/core/markdown-editor in1 t2
file src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/tag-handler.ts other L51 module src/lib/core/markdown-editor in1 t1
file src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/wikilink-handler.ts other L46 module src/lib/core/markdown-editor in1 t1
file src/lib/core/markdown-editor/extensions/live-preview/inline/inline-extensions.ts other L104 module src/lib/core/markdown-editor in1 t2
file src/lib/core/markdown-editor/extensions/live-preview/inline/inline-formatting-plugin.ts other L208 module src/lib/core/markdown-editor in12 t13
file src/lib/core/markdown-editor/extensions/live-preview/inline/markdown-highlight-style.ts other L28 module src/lib/core/markdown-editor in1 t1
file src/lib/core/markdown-editor/extensions/live-preview/live-preview.ts other L111 module src/lib/core/markdown-editor in1 t16
file src/lib/core/markdown-editor/extensions/live-preview/meta-bind-button.logic.ts logic L200 module src/lib/core/markdown-editor in2 t1
file src/lib/core/markdown-editor/extensions/live-preview/parsers/block-reference.ts other L26 module src/lib/core/markdown-editor in1 t7
file src/lib/core/markdown-editor/extensions/live-preview/parsers/blockquote.ts other L71 module src/lib/core/markdown-editor in1 t7
file src/lib/core/markdown-editor/extensions/live-preview/parsers/callout.ts other L109 module src/lib/core/markdown-editor in2 t4
file src/lib/core/markdown-editor/extensions/live-preview/parsers/collection-block.ts other L27 module src/lib/core/markdown-editor in1 t2
file src/lib/core/markdown-editor/extensions/live-preview/parsers/comment.ts other L72 module src/lib/core/markdown-editor in2 t11
file src/lib/core/markdown-editor/extensions/live-preview/parsers/fenced-code-block.ts other L199 module src/lib/core/markdown-editor in6 t2
file src/lib/core/markdown-editor/extensions/live-preview/parsers/footnote.ts other L109 module src/lib/core/markdown-editor in1 t13
file src/lib/core/markdown-editor/extensions/live-preview/parsers/frontmatter.ts other L32 module src/lib/core/markdown-editor in2 t2
file src/lib/core/markdown-editor/extensions/live-preview/parsers/inline-markdown.ts other L100 module src/lib/core/markdown-editor in1 t1
file src/lib/core/markdown-editor/extensions/live-preview/parsers/link.ts other L111 module src/lib/core/markdown-editor in2 t2
file src/lib/core/markdown-editor/extensions/live-preview/parsers/math.ts other L66 module src/lib/core/markdown-editor in1 t2
file src/lib/core/markdown-editor/extensions/live-preview/parsers/media.ts other L92 module src/lib/core/markdown-editor in3 t1
file src/lib/core/markdown-editor/extensions/live-preview/parsers/mermaid.ts other L27 module src/lib/core/markdown-editor in1 t2
file src/lib/core/markdown-editor/extensions/live-preview/parsers/meta-bind-button.ts other L27 module src/lib/core/markdown-editor in1 t2
file src/lib/core/markdown-editor/extensions/live-preview/parsers/meta-bind-input.ts other L106 module src/lib/core/markdown-editor in2 t3
file src/lib/core/markdown-editor/extensions/live-preview/parsers/queryjs-block.ts other L27 module src/lib/core/markdown-editor in1 t1
file src/lib/core/markdown-editor/extensions/live-preview/parsers/table.ts other L172 module src/lib/core/markdown-editor in2 t4
file src/lib/core/markdown-editor/extensions/live-preview/parsers/wikilink-embed.ts other L72 module src/lib/core/markdown-editor in1 t8
file src/lib/core/markdown-editor/extensions/live-preview/plugins/audio-plugin.ts other L56 module src/lib/core/markdown-editor in1 t2
file src/lib/core/markdown-editor/extensions/live-preview/plugins/block-comment-field.ts other L56 module src/lib/core/markdown-editor in1 t2
file src/lib/core/markdown-editor/extensions/live-preview/plugins/block-math-field.ts other L46 module src/lib/core/markdown-editor in1 t2
file src/lib/core/markdown-editor/extensions/live-preview/plugins/callout-field.ts other L271 module src/lib/core/markdown-editor in1 t3
file src/lib/core/markdown-editor/extensions/live-preview/plugins/code-block-field.ts other L112 module src/lib/core/markdown-editor in1 t4
file src/lib/core/markdown-editor/extensions/live-preview/plugins/collection-block-field.ts other L51 module src/lib/core/markdown-editor in1 t3
file src/lib/core/markdown-editor/extensions/live-preview/plugins/footnote-plugin.ts other L100 module src/lib/core/markdown-editor in1 t2
file src/lib/core/markdown-editor/extensions/live-preview/plugins/frontmatter-field.ts other L213 module src/lib/core/markdown-editor in1 t3
file src/lib/core/markdown-editor/extensions/live-preview/plugins/image-plugin.ts other L167 module src/lib/core/markdown-editor in1 t3
file src/lib/core/markdown-editor/extensions/live-preview/plugins/mermaid-field.ts other L49 module src/lib/core/markdown-editor in1 t3
file src/lib/core/markdown-editor/extensions/live-preview/plugins/meta-bind-button-field.ts other L49 module src/lib/core/markdown-editor in1 t2
file src/lib/core/markdown-editor/extensions/live-preview/plugins/meta-bind-input-plugin.ts other L93 module src/lib/core/markdown-editor in1 t3
file src/lib/core/markdown-editor/extensions/live-preview/plugins/queryjs-block-field.ts other L73 module src/lib/core/markdown-editor in1 t3
file src/lib/core/markdown-editor/extensions/live-preview/plugins/table-field.ts other L69 module src/lib/core/markdown-editor in1 t4
file src/lib/core/markdown-editor/extensions/live-preview/plugins/video-plugin.ts other L56 module src/lib/core/markdown-editor in1 t2
file src/lib/core/markdown-editor/extensions/live-preview/plugins/wikilink-embed-plugin.ts other L98 module src/lib/core/markdown-editor in1 t2
file src/lib/core/markdown-editor/extensions/live-preview/styles.ts other L1006 module src/lib/core/markdown-editor in16 t6
file src/lib/core/markdown-editor/extensions/live-preview/widgets.ts other L1127 module src/lib/core/markdown-editor in8 t15
file src/lib/core/markdown-editor/extensions/live-preview/widgets/code-block-widget.ts other L183 module src/lib/core/markdown-editor in1 t1
file src/lib/core/markdown-editor/extensions/live-preview/widgets/math-widget.ts other L77 module src/lib/core/markdown-editor in3 t1
file src/lib/core/markdown-editor/extensions/live-preview/widgets/mermaid-widget.ts other L136 module src/lib/core/markdown-editor in2 t2
file src/lib/core/markdown-editor/extensions/live-preview/widgets/meta-bind-button-widget.ts other L143 module src/lib/core/markdown-editor in1 t4
file src/lib/core/markdown-editor/extensions/live-preview/wikilink-navigation.ts other L66 module src/lib/core/markdown-editor in4 t3
file src/lib/core/markdown-editor/extensions/tag/completion.logic.ts logic L102 module src/lib/core/markdown-editor in1 t1
file src/lib/core/markdown-editor/extensions/tag/completion.ts other L41 module src/lib/core/markdown-editor in1 t2
file src/lib/core/markdown-editor/extensions/wikilink/completion.logic.ts logic L114 module src/lib/core/markdown-editor in2 t1
file src/lib/core/markdown-editor/extensions/wikilink/completion.ts other L229 module src/lib/core/markdown-editor in1 t2
file src/lib/core/markdown-editor/extensions/wikilink/decoration.logic.ts logic L128 module src/lib/core/markdown-editor in6 t14
file src/lib/core/markdown-editor/extensions/wikilink/decoration.ts other L92 module src/lib/core/markdown-editor in1 t1
file src/lib/core/markdown-editor/extensions/wikilink/index.ts other L5 module src/lib/core/markdown-editor in2 t0
file src/lib/core/markdown-editor/extensions/wikilink/navigation.logic.ts logic L54 module src/lib/core/markdown-editor in5 t1
file src/lib/core/markdown-editor/highlight-styles.ts other L134 module src/lib/core/markdown-editor in2 t10
file src/lib/core/markdown-editor/setup/editor-extensions.ts other L195 module src/lib/core/markdown-editor in3 t3
file src/lib/core/markdown-editor/setup/editor-theme.ts other L93 module src/lib/core/markdown-editor in2 t1
file src/lib/core/markdown-editor/setup/index.ts other L2 module src/lib/core/markdown-editor in1 t0
file src/lib/core/markdown-editor/tab-view-state.ts other L111 module src/lib/core/markdown-editor in3 t2 | Per-tab view state (scroll position, cursor) preserved across tab switches AND across MarkdownEditor component remounts (e.g. when switching to a non-markdown …
file src/lib/core/markdown-editor/wikilink-click-target.ts other L81 module src/lib/core/markdown-editor in3 t2
## public
sym src/lib/core/markdown-editor/EditorTabs.svelte:1 component EditorTabs props:tabIcon,tabTitleColor L119
sym src/lib/core/markdown-editor/MarkdownEditor.svelte:1 component MarkdownEditor props:host,renderers,blockLinks L762
sym src/lib/core/markdown-editor/copy-block-link/copy-block-link.logic.ts:34 fn detectBlockElement(lineText: string): DetectedBlockElement L20 | Detects the type of markdown element on a given line.
sym src/lib/core/markdown-editor/copy-block-link/copy-block-link.logic.ts:59 fn generateBlockId(): string L6 | Generates a random 6-character alphanumeric block ID.
sym src/lib/core/markdown-editor/copy-block-link/copy-block-link.logic.ts:71 fn buildWikilinkText(noteName: string, element: DetectedBlockElement, blockId: string | null, embed: boolean): string L16 | Builds a wikilink string for the given element.
sym src/lib/core/markdown-editor/doc-diff.logic.ts:27 fn docDiff(prev: string, next: string): DocChange[] | null L27 | The changes that turn `prev` into `next`: one per changed region (a run of changed lines, trimmed to its differing characters), ordered, with positions in `pre…
sym src/lib/core/markdown-editor/editor-host.ts:7 interface LinkAnchor L4 | The `#heading` or `#^block-id` part of a wikilink; both null for a plain link.
sym src/lib/core/markdown-editor/editor-host.ts:19 interface VaultTag L6 | A tag the vault uses, as tag completion offers it.
sym src/lib/core/markdown-editor/editor-host.ts:44 interface EditorHost L33 | Everything the markdown editor needs from the app: link resolution, note reads, asset URLs, navigation, note creation, the vault's tags and the tag search.
sym src/lib/core/markdown-editor/editor-host.ts:79 interface BlockLinkActions L6 | Copy Block Link and Copy block embed for the block at the cursor; the app supplies them.
sym src/lib/core/markdown-editor/extensions/live-preview/core/decorator-names.ts:63 const DECORATOR_NAMES L5 | Every kill-switch name, in Troubleshooting display order.
sym src/lib/core/markdown-editor/extensions/live-preview/core/decorator-names.ts:85 const DECORATOR_LABELS: Record<DecoratorName, string> L24 | What each kill-switch is called in Troubleshooting.
sym src/lib/core/markdown-editor/extensions/live-preview/core/fenced-block-renderers.ts:15 interface FencedBlockRenderer L13 | Renders one kind of fenced block (`` ```queryjs ``, `` ```collection ``) as a widget.
sym src/lib/core/markdown-editor/extensions/live-preview/core/profiling.ts:20 fn configureProfiling(next: ProfilingPort): () => void L6 | Installs the app's profiling toggle and log writer.
sym src/lib/core/markdown-editor/extensions/live-preview/core/profiling.ts:51 fn profileStart(label?: string): number L5 | Starts a profiling measurement for a live preview decoration plugin.
sym src/lib/core/markdown-editor/extensions/live-preview/core/profiling.ts:66 fn profileEnd(label: string, start: number, threshold: number = 0.5): void L8 | Ends a profiling measurement and logs the result if it exceeds the threshold.
sym src/lib/core/markdown-editor/extensions/live-preview/embed-resolver.logic.ts:54 fn stripFrontmatter(content: string): string L9 | Strips YAML frontmatter from content if present
sym src/lib/core/markdown-editor/extensions/live-preview/widgets/math-widget.ts:13 fn clearMathCache(): void L3 | Drops all cached renders.
sym src/lib/core/markdown-editor/extensions/live-preview/widgets/mermaid-widget.ts:50 fn clearMermaidCache(): void L3 | Drops all cached renders.
sym src/lib/core/markdown-editor/extensions/live-preview/wikilink-navigation.ts:17 fn followWikilink(host: EditorHost, target: string, anchor?: LinkAnchor): Promise<void> L6 | Follows a wikilink target through the host: opens the note it resolves to, or creates it (a periodic note when the name matches a periodic format).
sym src/lib/core/markdown-editor/extensions/wikilink/completion.logic.ts:26 fn detectWikilinkContext(docText: string, pos: number): WikilinkMatch | null L47 | Detects whether the cursor is inside a `[[...]]` wikilink and determines the completion mode (file, heading, or blockId).
sym src/lib/core/markdown-editor/extensions/wikilink/completion.logic.ts:75 fn matchFilesForWikilink(query: string, files: readonly FileEntry[]): FileEntry[] L16 | Matches files by fuzzy-matching the query against file names
sym src/lib/core/markdown-editor/extensions/wikilink/navigation.logic.ts:6 const HEADING_RE L1 | Regex matching any ATX heading: `# Title`, `## Title`, etc. Tolerates a trailing carriage return so headings are still matched when callers split CRLF (Windows…
sym src/lib/core/markdown-editor/extensions/wikilink/navigation.logic.ts:21 fn findHeadingPosition(content: string, headingName: string): number | null L14 | Finds the document position of a heading by name.
sym src/lib/core/markdown-editor/extensions/wikilink/navigation.logic.ts:41 fn findBlockIdPosition(content: string, blockId: string): number | null L14 | Finds the document position of a block identified by `^block-id`.
sym src/lib/core/markdown-editor/setup/editor-extensions.ts:37 const COPY_BLOCK_LINK_SHORTCUT L1 | Copy Block Link (Cmd+Shift+L).
sym src/lib/core/markdown-editor/tab-view-state.ts:81 fn deleteTabViewState(path: string): void L4 | Removes saved view and editor state for a tab (e.g. when the tab is closed)
sym src/lib/core/markdown-editor/tab-view-state.ts:87 fn renameTabViewState(oldPath: string, newPath: string): void L8 | Moves a tab's saved view and editor state to its new path after a rename or move
sym src/lib/core/markdown-editor/tab-view-state.ts:107 fn clearAllTabViewStates(): void L5 | Clears all saved view and editor states (e.g. on vault switch)
## effects
fx-count dom.blur 1
fx-count dom.change 3
fx-count dom.click 1
fx-count dom.input 1
fx-count dom.keydown 1
fx-count dom.mousedown 17
fx-count dom.mouseup 1
fx-count dom.scroll 1
fx-count svelte.$effect 9
fx-count tauri-clipboard-manager.readText 1
fx-count timer.requestAnimationFrame 6
fx-count timer.setTimeout 2
## debt
-
