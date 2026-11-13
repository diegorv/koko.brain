---
summary: "CodeMirror markdown editor: components, extension stack, the app host seam, completions and per-tab view state."
---

## Responsibility

Owns the CodeMirror 6 markdown editor: the MarkdownEditor and EditorTabs components, the extension stack built in setup/, and the editor-side pieces that do not depend on Tauri: wikilink, tag and date completion, callout and source-mode decorations, the lezer syntax additions, the pure copy-block-link logic, the undo-preserving document diff, wikilink click targeting, and per-tab view state kept in memory. It reaches the app only through the EditorHost interface (editor-host.ts), which src/lib/app/editor-host.ts implements. It does not own the live-preview decorations (extensions/live-preview, its own module), tab and document state (core/editor), or the copy-block-link side effects (features/copy-block-link).

## Key files

- `src/lib/core/markdown-editor/MarkdownEditor.svelte`: Editor component: creates the EditorView and its compartments, takes the host, fenced block renderers and block-link actions as props, handles tab switches, external content sync, the context menu and document change reporting.
- `src/lib/core/markdown-editor/editor-host.ts`: EditorHost interface, the editorHost facet, BlockLinkActions and NOOP_HOST: the seam between the editor and the app.
- `src/lib/core/markdown-editor/setup/editor-extensions.ts`: createExtensions, sourceModeExtensions, editorModeEffects and COPY_BLOCK_LINK_SHORTCUT.
- `src/lib/core/markdown-editor/tab-view-state.ts`: Module-level maps for per-tab scroll and cursor state, background EditorState snapshots and pending tab renames.
- `src/lib/core/markdown-editor/doc-diff.logic.ts`: docDiff: turns a whole-document change into minimal replaced ranges so undo and selection survive external edits.
- `src/lib/core/markdown-editor/highlight-styles.ts`: markdownLanguage with lazy code-language loading and the highlight styles.
- `src/lib/app/editor-host.ts`: Outside this folder: the app implementation of EditorHost and the list of fenced block renderers.

## State

- tab-view-state.ts module-level maps, in memory only: scroll and cursor state per tab path, CodeMirror EditorState snapshots for background tabs, and pending renames
- Component-local state in MarkdownEditor.svelte and EditorTabs.svelte; there is no .svelte.ts store in this folder
- Per-editor compartments and facets created in MarkdownEditor.svelte and setup/editor-extensions.ts, including the editorHost facet, the fenced block renderer facet and the source-mode, theme, language and highlight compartments

## Collaborators

- `src/lib/app`: EditorView.svelte mounts the components and passes the host, renderers and block-link actions. editor-host.ts implements EditorHost with the fs plugin, asset URLs, link resolution, note creation and tag listing through get_all_tags_v2. commands.ts reads COPY_BLOCK_LINK_SHORTCUT.
- `src/lib/core/editor`: Reads editorStore for tabs, active tab, live-preview flag, pending scroll and external content signal. MarkdownEditor calls onContentChange and EditorTabs calls switchTab, closeTab and togglePinTab. editor.service.ts clears tab view state through tab-view-state.ts.
- `src/lib/core/settings`: Reads settingsStore for decorator kill switches, fonts, heading typography and content width, appliedThemeStore for the dark flag, and calls applyHeadingTypography.
- `src/lib/core/filesystem`: Uses getLanguageForFile and isBinaryFile from fs.logic.ts, the FileEntry type from file-entries.logic.ts and getNoteName from wikilink-resolution.logic.ts. link-updater.service.ts calls renameTabViewState.
- `src/lib/core/frontmatter`: Live-preview widgets and plugins parse and rebuild frontmatter through properties.logic.ts.
- `src/lib/features`: copy-block-link performs the clipboard side effects using the pure logic here, and todoist-sync uses docDiff for minimal edits.
- `src/lib/plugins`: The table-of-contents logic imports HEADING_RE and the kanban wikilink suggestions import completion logic from here.
- `src/lib/utils`: Uses keybinding helpers, platform helpers, fuzzy-match, sanitize-url and the debug helpers.

## Subfolders

- `src/lib/core/markdown-editor/setup`: Builds the CodeMirror extension array, the source-mode-only set, the live-preview and source switch effects, and the editor theme.
- `src/lib/core/markdown-editor/copy-block-link`: Pure logic for copy block link: block detection on a line, block ID generation and wikilink text.
- `src/lib/core/markdown-editor/extensions`: Editor extensions outside live preview: completion sources, source-mode decorations, lezer syntax additions and composition-aware bracket matching.
- `src/lib/core/markdown-editor/extensions/callout`: Source-mode callout header decoration, header parsing and the callout color table.
- `src/lib/core/markdown-editor/extensions/date-shortcut`: Completion source for the today, tomorrow and yesterday tokens.
- `src/lib/core/markdown-editor/extensions/lezer`: Lezer markdown config additions for highlight syntax and inline and block math.
- `src/lib/core/markdown-editor/extensions/tag`: Completion source for #tags, fed by EditorHost.listTags and ranked with fuzzy matching.
- `src/lib/core/markdown-editor/extensions/wikilink`: Wikilink completion in file, heading and block-id modes, the source-mode wikilink decoration and heading and block navigation helpers.
- `src/lib/core/markdown-editor/extensions/live-preview`: The live-preview layer. Documented as its own module.

## Gotchas

- EditorHost may be called only from event handlers, toDOM and completion sources, never from StateField compute or update or from a decoration build. The first resolveLink after the file tree changes builds an index over all notes.
- The editorHost facet is static and the host is installed once at mount, outside every compartment. A later change to the host, renderers or blockLinks props is not applied.
- sourceModeExtensions are source-only. The wikilink and callout decorations and the heading size styling are owned by live preview in live mode, so installing both would style text twice.
- Only one autocompletion() extension may be installed. createExtensions passes the wikilink, date-shortcut and tag sources in one override list, because a second autocompletion() throws a config merge conflict.
- The Mod-d binding is filtered out of the search keymap so the app's Favorite shortcut wins.
- The copy block link shortcut is bound in the editor keymap, not globally, so it works only with a focused editor. The command palette shows the shortcut from the same COPY_BLOCK_LINK_SHORTCUT constant.
- composition-aware-bracket-matching.ts replaces bracketMatching() because of a WebKit dead-key composition bug described in its header. Reinstating bracketMatching() needs a WebKit check.
- A background EditorState in tab-view-state.ts is valid only for the MarkdownEditor instance that saved it, so that instance clears them on destroy. A tab path change counts as a rename only when it is listed in pendingRenames.
- docDiff returns null when the documents differ by more than a bounded number of line edits. MarkdownEditor then falls back to a whole-document replace and undo mapping is lost for that sync.
- This folder calls no app Tauri command and listens to no event. The only direct plugin call is the clipboard plugin in MarkdownEditor.svelte. Everything else goes through the EditorHost.
