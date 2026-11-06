# 01: Inline title: show the file name as an editable title above the note

**Status:** ready-for-agent

Priority: P3 (a new note starts as `Untitled` and renaming it means leaving the editor; nothing is broken)

**What to build:** A large title above the text of a Markdown note, showing the file name without its extension. Editing it renames the file. It is display only: nothing is written into the `.md`, and document positions do not change. Creating a note puts the cursor in the title with `Untitled` selected, so the first thing typed names the note.

## Owner decisions (2026-11-06)

- **Display, not content.** The title is the file name shown by the editor. Writing a `# Name` heading into the file was rejected: it would add a second copy of the name to keep in sync after every rename.
- **Periodic notes show no title at all**, of any period type (daily, weekly, monthly, quarterly, yearly), and reserve no space for it. A generated name such as `_journal-day-06-11-2026` above the note makes a mess of it.
- **Notes that already start with `# Title` show both.** No detection and no hiding.
- **A setting turns the title off.** On by default.

## Acceptance

- A Markdown note shows its file name without the extension above the text, and the title scrolls with the text.
- The saved file is byte-identical with the title on or off, and a cursor at document position 0 is still the start of the file.
- Enter or blur renames the file. Enter also moves the cursor to the start of the note's text. Escape restores the name without renaming.
- An empty or unchanged title renames nothing and shows the current name again.
- An illegal or taken name toasts the reason, as the note list's inline rename does, and the title shows the current name again.
- A rename from the title keeps the tab open on the new path with its unsaved content and cursor intact.
- The title follows the active tab when switching tabs, and follows a rename made elsewhere (note list, another title).
- Each path that creates a blank note focuses the title with the whole name selected: `src/lib/app/commands.ts:130`, `src/lib/features/rail-shell/FilesNavigator.svelte:84`, and both branches of `src/lib/features/rail-shell/new-note.service.ts:28,33`. Opening an existing note does not take focus from the editor.
- A periodic note shows no title and no empty gap, in the same render as its text, with no flash when switching to it from a note that has one.
- With the setting off, no note shows a title and new notes focus the editor as they do today.
- Canvas, Kanban, `.view`, PDF and image tabs are unchanged.
- Scroll and clicks stay correct with the title present: each tab restores its saved scroll position, a scroll to a block or heading anchor lands with its target visible, and a click on the text places the cursor where clicked, also after scrolling a long note.

**Blocked by:** none

**Gate:** `pnpm check` + `pnpm vitest run`, plus `bash scripts/e2e.sh e2e/specs/editor.spec.ts e2e/specs/rail-shell.spec.ts`. Add E2E coverage in a real browser for the rename and the new-note focus: jsdom does no layout, so it cannot prove scroll or click positions.

**Source:** src/lib/core/markdown-editor/MarkdownEditor.svelte:414,533-535,726, src/lib/app/EditorView.svelte:92, src/lib/app/editor-host.ts:33,54-59, src/lib/core/markdown-editor/editor-host.ts:44, src/lib/core/filesystem/fs.service.ts:280-299, src/lib/features/type-definitions/type-note-list.logic.ts:23-33, src/lib/plugins/periodic-notes/periodic-notes.logic.ts:206, src/lib/features/note-list/NoteRowMenu.svelte:120-133

## Notes

- **Start with the placement, test first.** This is the risky part, and no option has been tried. The editor's container is `absolute inset-0` and `.cm-scroller` does the scrolling, so a title that scrolls with the text has to live inside that scroller. CodeMirror needs its own scroller to virtualize, so an outer scroller around the editor is out. Prove scroll restore and click positions on a long note in a real browser before building the rest. A block widget at position 0 is the fallback to weigh, and it has to follow `docs/agents/live-preview-rules.md`, since it adds a decoration at the same line as the frontmatter block.
- **One editor across tabs.** The session logs show tab switches replacing the document (`docReplace`) in one `EditorView`, so the title has to read the active tab's path. The scroll code at `MarkdownEditor.svelte:414,533-535` saves and restores `scrollTop` per tab, and those values now include the title's height.
- **Layers.** `core/markdown-editor` must not import from `features/` or `plugins/`, and `layer-rules.test.ts` fails on a new violation. `buildRenameFileName` is in `features/type-definitions` and `detectPeriodicNoteType` is in `plugins/periodic-notes`. `app/editor-host.ts` already imports the latter and is the existing seam through `EditorHost`.
- **Periodic detection.** `detectPeriodicNoteType` takes a vault-relative target without `.md` and returns the period type, so an absolute tab path has to be converted first. `app/editor-host.ts:54-59` shows the settings it needs.
- **Blur commits a rename**, which is what the note list's input does. The closing-menu focus bug fixed in `context-menu-content.svelte` came from that pattern: anything that takes focus just after the title gets it would end the rename. Test the new-note focus against whatever closes as the note opens (menu, dialog).
- **Not checked:** whether wikilinks to the note are rewritten on rename (this Issue uses `renameItem`, so it behaves as the note list does), and how the title should look on narrow panes.
