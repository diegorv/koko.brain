# 177: Open and read a note

**Origin:** `ios-app` Issue 05, moved here on 2026-11-08. Its PRD, raw evidence and closed siblings stay in `.scratch/archived/ios-app/`. Bare Issue numbers in the text below use that feature's numbering; `priority-2026-11-08.md` in this folder maps them to the numbers here.

**What to build:** In the browser, opening a note from the tree shows it in the editor with live preview, exactly as on the desktop: frontmatter, callouts, tables, task lists, wikilinks. Following a wikilink opens the target note. The rail shell works: its navigators (files, types, note list) and the neighbourhood lenses (backlinks, outgoing, belongs-to, has-many, related-to) list their contents. Images are 06; editing is 08.

**Blocked by:** 174

**Status:** ready-for-agent

**Branch:** `feature/ios-poc` only. Run from its worktree; this work never lands on `main`.

**Gate:** Both (Rust + frontend).

- [ ] The Read commands the editor, the rail shell and the link panels use are classified Read and work over the WebSocket
- [ ] Device-local answers in the stand-in for plugins that make no sense remotely: dialogs become in-app dialogs, the opener opens URLs with `window.open`, window plugin calls are no-ops, clipboard uses `navigator.clipboard`
- [ ] Test with an in-process fake host: a note read round-trips its content; a missing note surfaces an error, never empty content
- [ ] Test: opening a note, then a wikilink target, then a rail lens, through the fake host, renders the expected text (assert on rendered content, not only on calls)

## Owner check (not an acceptance criterion; recorded here after delivery)

In Mac Safari (and on the iPad once 04 is merged): a note with frontmatter, a callout, a table and tasks renders like the desktop; a wikilink opens its target; each rail navigator and each lens lists the expected notes. On touch, following a link may still need the desktop gesture (Cmd/Ctrl click); record what happens.

## Notes

- Owner priorities 1 (view) and 4 (rail shell), read side.
