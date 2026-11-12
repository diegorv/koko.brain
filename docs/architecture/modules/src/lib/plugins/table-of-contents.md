---
summary: "Right-sidebar table of contents: parses ATX headings of the active markdown note and navigates to them."
---

## Responsibility

Builds and shows the heading outline of the active markdown note in the right sidebar. It extracts ATX headings (skipping fenced code blocks), keeps them in an in-memory store, tracks the note path the section is expanded on and jumps to a heading with openNoteAt using the heading's character offset. It does not own note content, the sidebar visibility flags in settingsStore.layout or the note action bar button that opens it.

## Key files

- `src/lib/plugins/table-of-contents/toc.logic.ts`: Pure heading extraction (extractTocHeadings) and markdown chrome stripping (stripHeadingChrome).
- `src/lib/plugins/table-of-contents/toc.service.ts`: rebuildToc parses content into the store. showTableOfContents turns on the right sidebar and TOC flag and records the expanded path.
- `src/lib/plugins/table-of-contents/toc.store.svelte.ts`: Module-level $state for headings and expandedPath, exposed through tocStore getters.
- `src/lib/plugins/table-of-contents/TableOfContentsPanel.svelte`: Sidebar section UI: expansion tied to the active tab, rebuild effect, heading buttons and empty states.
- `src/lib/plugins/table-of-contents/toc.types.ts`: TocHeading shape (level, text, line, pos).

## State

- tocStore.headings: in-memory headings of the active buffer.
- tocStore.expandedPath: the note path the section is open on, or null.
- Sidebar visibility and the TOC section flag live in settingsStore.layout (core/settings), not here.

## Collaborators

- `src/lib/core/markdown-editor`: HEADING_RE from extensions/wikilink/navigation.logic.ts defines what counts as a heading.
- `src/lib/core/settings`: updateLayout sets rightSidebarVisible and tableOfContentsVisible.
- `src/lib/core/editor`: editorStore supplies the active tab path, content and fileType. open-note-at.service.ts provides openNoteAt for heading clicks.
- `src/lib/core/layout`: SidebarSection.svelte is the collapsible wrapper the panel renders in.
- `src/lib/components/ui`: Separator is imported by the panel (unused in its markup).
- `src/lib/app`: AppShell.svelte mounts TableOfContentsPanel in the right sidebar when tableOfContentsVisible is true. EditorView.svelte passes showTableOfContents to NoteActionBar as the onShowTableOfContents prop.
- `src/lib/features/note-action-bar`: NoteActionBar receives showTableOfContents through its onShowTableOfContents callback prop and does not import this folder.

## Gotchas

- Heading detection is delegated to HEADING_RE in core/markdown-editor, so changing that regex changes the outline.
- Fence handling toggles only on a line starting with ``` or ~~~. Indented fences are not handled (extractTocHeadings JSDoc).
- Headings are rebuilt only while the section is expanded. A manual collapse leaves the last headings in tocStore until the section is expanded again; a tab switch while expanded resets them.
- While the section is open, every content change re-parses the whole document, because the rebuild effect reads editorStore.activeTabContent.
- expandedPath is keyed by note path. A tab switch collapses the section through the panel effect, and onDestroy clears it. The state lives in the store so NoteActionBar can open the section while the sidebar is hidden.
- Each heading's pos is the sum of the preceding line lengths plus one per line split on newline. It is the keyed-each key and the offset passed to openNoteAt.
- The Not available state for non-markdown tabs is decided from editorStore.activeTab.fileType, not from tocStore.
- TableOfContentsPanel.svelte imports Separator but does not use it in its markup.
