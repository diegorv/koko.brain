---
summary: "Service that copies a wikilink or embed for the block under the editor cursor, adding a block ID when needed."
---

## Responsibility

Owns the side-effecting copy block link and copy block embed actions: reads the editor view and active tab path, appends a block id to the end of the cursor line when the block has none, and writes the wikilink text to the clipboard. Pure parsing, ID generation and link text building live in src/lib/core/markdown-editor/copy-block-link, not here. It has no store, IPC, listener or component, and does not own the shortcut, palette entry or context-menu wiring.

## Key files

- `src/lib/features/copy-block-link/copy-block-link.service.ts`: The only file: copyBlockLink(view, embed), copyBlockLinkToClipboard(view) and copyBlockEmbedToClipboard(view).
- `src/lib/core/markdown-editor/copy-block-link/copy-block-link.logic.ts`: Pure logic the service uses: detectBlockElement, generateBlockId, buildWikilinkText, getNoteName.
- `src/lib/app/editor-host.ts`: Passes the two clipboard functions to the markdown editor as block link actions (copyLink, copyEmbed).
- `src/lib/app/commands.ts`: Palette commands that call the service with the editor view.

## State

- No owned state. Side effects: a block id suffix is dispatched into the editor document, and the clipboard is written through navigator.clipboard.
- Reads editorStore.activeTabPath (read only).

## Collaborators

- `src/lib/core/markdown-editor`: Pure link logic; the editor extensions and MarkdownEditor.svelte call the service through the BlockLinkActions passed in by the app.
- `src/lib/core/editor`: editorStore.activeTabPath names the note.
- `src/lib/app`: editor-host and commands call the service.
- `src/lib/utils`: error() logs clipboard failures.

## Gotchas

- Link format and ID rules belong in core/markdown-editor/copy-block-link. Clipboard and editor mutation belong in the service.
- Headings are copied without changing the document. For blocks and list items, the edit appending the id is dispatched before the clipboard write, so a clipboard failure still leaves the id in the note.
- Clipboard failures are logged and toasted, not rethrown. The palette commands and the editor keymap do not await the returned promise.
- An empty line or missing active tab path returns early with no clipboard write and no message.
