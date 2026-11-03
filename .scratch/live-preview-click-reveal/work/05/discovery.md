# Discovery: Issue 05 (note embed header opens the note)

No `spec.md` for this feature; `report.md` section 3 is the source. Same shape as Issue 04 (`work/04`): a widget element follows a link itself through `followWikilinkInfo`.

## Files
- `src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:618` `WikilinkNoteEmbedWidget.toDOM`: the header (`.cm-lp-embed-header`, line ~636) gets a `mousedown` listener. Primary button only (right click and macOS Ctrl+click keep the context menu, same guard as the table cell link at ~299); `preventDefault` + `stopPropagation` (CLAUDE.md Live Preview rule 11), then `followWikilinkInfo(view, { target, heading, blockId })`. That covers existing note (`host.openLink` with the anchor), missing note (`host.createNote`), and a same-note `![[#heading]]` (cursor jump).
- `e2e/specs/live-preview/click-reveal/wikilink-note-embed.spec.ts`: drop `test.fail()` and its comment.

## Why the capture handler does not interfere
`MarkdownEditor.svelte` `handleEditorClick` -> `resolveWikilinkClickPosition` (`wikilink-click-target.ts`): the header is not a `.cm-lp-wikilink`, so a plain click returns `null` and reaches the header listener. A Cmd/Ctrl click maps by coords to the `![[...]]` line and opens the same note there; same result.

## Tests (prior art: `src/tests/lib/core/markdown-editor/editor-host.test.ts` "a table-cell wikilink ..." and "a note embed resolves ...")
- Header mousedown on an existing note embed calls `host.openLink('/vault/Note.md', { heading, blockId })`. Fails first.
- Missing note goes to `host.createNote`.
- The mousedown does not propagate to a parent listener and is `defaultPrevented`.
- A right-button mousedown navigates nowhere.

## Risks / defaults
- The embed stays rendered: the widget is not touched, and the stopped mousedown never reaches CodeMirror, so the cursor does not move onto the embed line.
- Only the header navigates; the body keeps today's behavior (not in the Issue).
