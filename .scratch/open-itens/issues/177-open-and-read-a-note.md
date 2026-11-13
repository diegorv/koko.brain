# 177: Open and read a note

**Origin:** `ios-app` Issue 05, moved here on 2026-11-08. Its PRD, raw evidence and closed siblings stay in `.scratch/archived/ios-app/`. Bare Issue numbers in the text below use that feature's numbering; `priority-2026-11-08.md` in this folder maps them to the numbers here.

**What to build:** In the browser, opening a note from the tree shows it in the editor with live preview, exactly as on the desktop: frontmatter, callouts, tables, task lists, wikilinks. Following a wikilink opens the target note. The rail shell works: its navigators (files, types, note list) and the neighbourhood lenses (backlinks, outgoing, belongs-to, has-many, related-to) list their contents. Images are 06; editing is 08.

**Blocked by:** 174

**Status:** resolved

**Branch:** `feature/ios-poc` only. Run from its worktree; this work never lands on `main`.

**Gate:** Both (Rust + frontend).

- [x] The Read commands the editor, the rail shell and the link panels use are classified Read and work over the WebSocket
- [x] Device-local answers in the stand-in for plugins that make no sense remotely: dialogs become in-app dialogs, the opener opens URLs with `window.open`, window plugin calls are no-ops, clipboard uses `navigator.clipboard`
- [x] Test with an in-process fake host: a note read round-trips its content; a missing note surfaces an error, never empty content
- [x] Test: opening a note, then a wikilink target, then a rail lens, through the fake host, renders the expected text (assert on rendered content, not only on calls)

## Owner check (not an acceptance criterion; recorded here after delivery)

In Mac Safari (and on the iPad once 04 is merged): a note with frontmatter, a callout, a table and tasks renders like the desktop; a wikilink opens its target; each rail navigator and each lens lists the expected notes. On touch, following a link may still need the desktop gesture (Cmd/Ctrl click); record what happens.

## Notes

- Owner priorities 1 (view) and 4 (rail shell), read side.

## Comments

- 2026-11-02, `issue/05-open-and-read-a-note` onto `feature/ios-poc`: Read commands for the editor, rail shell and link panels work over the WebSocket (`get_unlinked_mentions_v2` now Read); device-local dialog/opener/window/clipboard answers in the stand-in; full-rescan `vault-index-updated` after the browser scan; fake-host tests for note read and open/link/lens rendering. Review fixes: strict fake host, link-panel dispatch test, pending-listen event buffering, `open_url` scheme check, no-vault refusal case. Tests: `pnpm vitest run && pnpm build` exit 0 (446 files, 10083 passed, 1 skipped, 1 todo); `cargo test` exit 0 (1285 passed). Reviews: round 1 APPROVED, round 2 APPROVED (one whitespace nit in `device-local.ts:14` left as is).
