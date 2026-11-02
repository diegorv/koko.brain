# 04: Open and read a note

**What to build:** In the browser, opening a note from the tree shows it in the editor with live preview, exactly as on the desktop: frontmatter, callouts, tables, task lists, wikilinks. Following a wikilink opens the target note. The rail shell works: its navigators (files, types, note list) and the neighbourhood lenses (backlinks, outgoing, belongs-to, has-many, related-to) list their contents. Images are 05; editing is 07.

**Blocked by:** 02

**Status:** ready-for-agent

**Gate:** Both (Rust + frontend).

- [ ] The bridge stand-in serves the read side of the fs plugin over the WebSocket: read text file, exists, read dir, stat, all through the containment from 02. `exists` rejects on a transport error and never resolves `false` because the connection failed
- [ ] The Read commands the editor, the rail shell and the link panels use are classified Read and work over the WebSocket
- [ ] Device-local answers in the stand-in for plugins that make no sense remotely: dialogs become in-app dialogs, the opener opens URLs with `window.open`, window plugin calls are no-ops, clipboard uses `navigator.clipboard`
- [ ] Test with an in-process fake host: a note read round-trips its content, a missing note surfaces an error (never empty content)
- [ ] Manual check, recorded here: in Mac Safari and on the iPad, open a note with frontmatter, a callout, a table and tasks; it renders like the desktop; a wikilink opens its target; each rail navigator and each lens lists the expected notes

## Notes

- On touch devices following a link may still need the desktop gesture (Cmd/Ctrl click); tap-to-follow is a later touch-UI ticket. Record what happens on the iPad.
- Owner priorities 1 (view) and 4 (rail shell), read side.
