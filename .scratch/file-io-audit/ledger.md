# Ledger: file-io-audit

This file is the source of truth for the progress of the file-io-audit Issues. Read it before working on any of them. It is written only by `/relay-lite:run`, through `relay ledger`: never edit it by hand.

## Continue

```text
/relay-lite:run file-io-audit
```

Add Issue numbers to force them; `--all` runs every available Issue in sequence; `--all --parallel` runs the ones that touch different files at the same time.

## Process

The `relay-lite:workflow` workflow, one worktree per Issue at `<repo>.worktrees/issue-NN-slug`: build (discovery + implement), review (Claude or Codex), fix and re-review while changes are requested, deliver. Only deliver runs the full suite. Formats: relay-lite's `docs/format.md`.

## Statuses

| Status | Meaning |
|---|---|
| `todo` | Not started. |
| `in-progress` | Set by `/relay-lite:run` on `base` before it launches the Issue; still there after a run means it was interrupted (the worktree and branch may exist). `/relay-lite:run` asks what to do about it only when run with no Issue numbers (`--all` too), or when it is one of the named Issues or in the "Blocked by" of one; skip records nothing (no status change, no Log line, no commit), so the question comes back on the next such run. |
| `blocked` | Nothing was delivered: the build refused the Issue or returned nothing, the suite failing, a review or re-review that returned nothing, a re-review that still requests changes, a rebase conflict in source files, a failed push. The reason is in the Log; the worktree is kept. `/relay-lite:run` asks what to do about it only when run with no Issue numbers (`--all` too), or when it is one of the named Issues or in the "Blocked by" of one; skip records nothing (no status change, no Log line, no commit), so the question comes back on the next such run. |
| `in-review` | `pr` delivery: the PR is open, not merged yet; its URL is in Branch / PR. The next run checks it and sets `done` or `todo`. relay-lite does not delete the remote branch `issue/NN-slug` when the PR is merged or closed (GitHub does on merge if the repository auto-deletes head branches); after a close, delete it or renumber the Issue before the Issue runs again, or its push is rejected. |
| `done` | Delivered, and the Issue file says `Status: resolved`. |
| `wontfix` | Closed without work. |

## Next up

An Issue can start when its status is `todo` and every Issue in its "Blocked by" is `done`. Among those, take the lowest number.

## Issues

**Branch / PR**: in `merge` delivery `issue/NN-slug (<short sha>)`, the short sha of the Issue's squash commit on `base` (the `sha` deliver returns), written by `/relay-lite:run` in its `done` commit; in `pr` delivery the PR URL while `in-review`, then `<PR URL> (<short merge sha>)` once `/relay-lite:run` finds it merged; cleared when it finds the PR closed and sets the row back to `todo` (the URL stays in the `pr closed` Log line). **Merged**: always a date (YYYY-MM-DD); in `merge` delivery the date `/relay-lite:run` wrote the row, after the squash commit; in `pr` delivery the date `/relay-lite:run` recorded the merge. Both cells stay empty on a row `/relay-lite:ledger` created as `done` from an Issue file already `Status: resolved`.

| # | Issue | Blocked by | Status | Branch / PR | Merged |
|---|---|---|---|---|---|
| 01 | [Quit, Dock Quit, logout and Restart to update run the same save flush as closing the window](issues/01-quit-skips-save-on-close.md) | none | done | issue/01-quit-skips-save-on-close (020af809) | 2026-11-02 |
| 02 | [Task toggle and deep-link writes save the open dirty tab before writing from disk](issues/02-task-toggle-overwrites-dirty-tab.md) | none | todo | | |
| 04 | [Silent deep-link new overwrites an existing note, with empty content when none is given](issues/04-deep-link-silent-new-overwrites-note.md) | none | todo | | |
| 05 | [Delete saves dirty tabs first and closes them only after the Trash move succeeds](issues/05-delete-closes-dirty-tabs-unsaved.md) | none | todo | | |
| 06 | [A vault switch asks before discarding tabs that failed to save](issues/06-vault-switch-after-failed-save.md) | none | todo | | |
| 07 | [Note writes truncate in place: a failed write can leave the note empty](issues/07-non-atomic-note-writes.md) | none | todo | | |
| 08 | [An external change to an open note is overwritten by the next autosave or calendar write](issues/08-external-change-overwritten.md) | none | todo | | |
| 09 | [A watcher rescan (dropped FSEvents) never reloads open tabs, so the next save overwrites the external change](issues/09-fsevents-rescan-ignored.md) | none | todo | | |
| 10 | [A settings load failure writes defaults over settings.json and purges File History at the 7-day default](issues/10-settings-load-failure-defaults.md) | none | todo | | |
| 11 | [Trash writers rebuild the manifest from a stale or empty store, orphaning trashed items](issues/11-trash-manifest-stale-rebuild.md) | none | todo | | |
| 12 | [File History Restore writes the snapshot into the active tab, not the note in the dialog](issues/12-file-history-restore-wrong-tab.md) | none | todo | | |
| 13 | [No snapshot of the pre-save bytes, and retention deletes a note's last snapshot](issues/13-file-history-no-baseline.md) | none | todo | | |
| 14 | [Undo history survives a tab switch, so Cmd+Z can insert another note's text](issues/14-undo-history-across-notes.md) | none | todo | | |
| 15 | [An unparseable .canvas opens empty and the first edit overwrites the original](issues/15-canvas-unparseable-overwritten.md) | none | todo | | |
| 16 | [Kanban board actions delete unmodeled lines; CRLF boards and boards with frontmatter lose lanes](issues/16-kanban-lossy-reserialize.md) | none | todo | | |
| 17 | [Properties panel and meta-bind edits drop YAML comments, nested maps, duplicate keys and anchors](issues/17-frontmatter-lossy-rewrite.md) | none | todo | | |
| 18 | [Every frontmatter rewrite re-spells numbers (01234 to 1234, 1.10 to 1.1)](issues/18-frontmatter-number-respelling.md) | none | todo | | |
| 19 | [Duplicate overwrites a sibling whose name differs only in case (APFS)](issues/19-duplicate-case-insensitive-overwrite.md) | none | todo | | |
| 20 | [Composer shows Saved and clears its text when the main window drops the capture](issues/20-composer-clears-dropped-capture.md) | none | todo | | |
| 22 | [A note deleted or renamed outside the app is recreated by the next autosave](issues/22-external-delete-resurrected.md) | none | todo | | |
| 23 | [File History is lost on rename, move, auto-move and suffixed restore](issues/23-file-history-keyed-by-path.md) | none | todo | | |
| 24 | [A stale Tasks list can tick the wrong task line (line-number only key)](issues/24-stale-task-list-wrong-line.md) | none | todo | | |
| 25 | [Deep-link overwrite can replace .kokobrain files, and name=. writes outside the vault](issues/25-deep-link-path-safety.md) | none | todo | | |
| 26 | [A deep link to another vault is dropped by teardownVault](issues/26-cross-vault-deep-link-dropped.md) | none | todo | | |
| 27 | [Rename link rewrite edits links inside code blocks and misses path-qualified, extension and self links](issues/27-link-rewrite-scope.md) | none | todo | | |
| 28 | [Watcher and folder renames leave FTS5, semantic and Rust indexes stale](issues/28-watcher-index-staleness.md) | none | todo | | |
| 29 | [Meta-bind toggle, number and select write quoted strings](issues/29-meta-bind-value-types.md) | none | todo | | |
| 30 | [An empty --- --- frontmatter block is not matched; writers stack a second block](issues/30-empty-frontmatter-block.md) | none | todo | | |
| 31 | [Non-UTF-8 notes are written back with U+FFFD, losing the original bytes](issues/31-non-utf8-rewrite.md) | none | todo | | |
| 32 | [Unparseable app JSON/YAML (auto-move rules, todoist, .view) is overwritten; .view comments dropped](issues/32-app-json-corrupt-overwrite.md) | none | todo | | |
| 33 | [Keystrokes typed during link rewrite, calendar delete or type rename writes are lost](issues/33-keystrokes-lost-during-async-writes.md) | none | todo | | |
| 34 | [Type rename reports success on partial failure and misses _type values with a trailing comment](issues/34-type-rename-partial-failure.md) | none | todo | | |
| 35 | [A failure after the disk op reports a completed rename or delete as failed and skips index re-key](issues/35-path-change-post-disk-failure.md) | none | todo | | |
| 36 | [Root unarchive writes vault//x.md, canvas double-prefixes picked paths, auto-move accepts ..](issues/36-path-normalization.md) | none | todo | | |
| 37 | [A vault outside the two fs-scope folders half-works](issues/37-vault-outside-allowed-folders.md) | none | todo | | |
| 38 | [Quick-capture dedupe anchor advances before the frontend accepts the capture](issues/38-quick-capture-dedupe-anchor.md) | none | todo | | |
| 39 | [An in-flight semantic update for vault A commits into vault B after a switch](issues/39-semantic-cross-vault-commit.md) | none | todo | | |
| 40 | [QueryJS blocks run with full IPC and fs access and auto-run on first open](issues/40-queryjs-unsandboxed.md) | none | todo | | |
| 41 | [Minor write races: autosave during rename, unserialized same-path saves, create vs restore, superseded init, calendar edge cases](issues/41-minor-write-races.md) | none | todo | | |
| 42 | [CRLF notes are rewritten with LF after any edit](issues/42-crlf-to-lf-rewrite.md) | none | todo | | |
| 43 | [A case-only rename is refused as already exists](issues/43-case-only-rename-refused.md) | none | todo | | |
| 44 | [Dock Quit, logout and shutdown end the app without the exit flush](issues/44-dock-quit-logout-skip-save.md) | none | todo | | |

## Log

- 2026-11-02 06:35 — ledger created (41 Issues)
- 2026-11-02 06:35 — ledger updated (title of 04, 07, 08, 09, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43)
- 2026-11-02 06:36 — 01 — start — launched by /relay-lite:run — 7b82f6f6
- 2026-11-02 08:04 — 01 — deliver — squash-merged as 020af809: quit and restart to update run prepareForExit, body autosave has a 10 s max wait; reviews APPROVED x2; suite and cargo test green; Dock Quit and logout left to Issue 44; owner checks Cmd+Q by hand — 020af809
- 2026-11-02 08:05 — ledger updated (added 44)
