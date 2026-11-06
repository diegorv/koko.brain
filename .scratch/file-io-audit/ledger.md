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
| 02 | [Task toggle and deep-link writes save the open dirty tab before writing from disk](issues/02-task-toggle-overwrites-dirty-tab.md) | none | done | issue/02-task-toggle-overwrites-dirty-tab (b4f126bf) | 2026-11-02 |
| 04 | [Silent deep-link new overwrites an existing note, with empty content when none is given](issues/04-deep-link-silent-new-overwrites-note.md) | none | done | issue/04-deep-link-silent-new-overwrites-note (9f5e4dd2) | 2026-11-02 |
| 05 | [Delete saves dirty tabs first and closes them only after the Trash move succeeds](issues/05-delete-closes-dirty-tabs-unsaved.md) | none | done | issue/05-delete-closes-dirty-tabs-unsaved (f1b3cde9) | 2026-11-02 |
| 06 | [A vault switch asks before discarding tabs that failed to save](issues/06-vault-switch-after-failed-save.md) | none | done | issue/06-vault-switch-after-failed-save (3461afa1) | 2026-11-02 |
| 07 | [Note writes truncate in place: a failed write can leave the note empty](issues/07-non-atomic-note-writes.md) | none | wontfix | | |
| 08 | [An external change to an open note is overwritten by the next autosave or calendar write](issues/08-external-change-overwritten.md) | none | wontfix | | |
| 09 | [A watcher rescan (dropped FSEvents) never reloads open tabs, so the next save overwrites the external change](issues/09-fsevents-rescan-ignored.md) | none | wontfix | | |
| 10 | [A settings load failure writes defaults over settings.json and purges File History at the 7-day default](issues/10-settings-load-failure-defaults.md) | none | wontfix | | |
| 11 | [Trash writers rebuild the manifest from a stale or empty store, orphaning trashed items](issues/11-trash-manifest-stale-rebuild.md) | none | wontfix | | |
| 12 | [File History Restore writes the snapshot into the active tab, not the note in the dialog](issues/12-file-history-restore-wrong-tab.md) | none | wontfix | | |
| 13 | [No snapshot of the pre-save bytes, and retention deletes a note's last snapshot](issues/13-file-history-no-baseline.md) | none | wontfix | | |
| 14 | [Undo history survives a tab switch, so Cmd+Z can insert another note's text](issues/14-undo-history-across-notes.md) | 46 | done | https://github.com/diegorv/koko.brain/pull/233 (fe51c2ad) | 2026-11-02 |
| 15 | [An unparseable .canvas opens empty and the first edit overwrites the original](issues/15-canvas-unparseable-overwritten.md) | none | wontfix | | |
| 16 | [Kanban board actions delete unmodeled lines; CRLF boards and boards with frontmatter lose lanes](issues/16-kanban-lossy-reserialize.md) | none | done | issue/16-kanban-lossy-reserialize (89636f7c) | 2026-11-02 |
| 17 | [Properties panel and meta-bind edits drop YAML comments, nested maps, duplicate keys and anchors](issues/17-frontmatter-lossy-rewrite.md) | none | done | issue/17-frontmatter-lossy-rewrite (40ef2752) | 2026-11-02 |
| 18 | [Every frontmatter rewrite re-spells numbers (01234 to 1234, 1.10 to 1.1)](issues/18-frontmatter-number-respelling.md) | 17 | done | issue/18-frontmatter-number-respelling (e588dda0) | 2026-11-02 |
| 19 | [Duplicate overwrites a sibling whose name differs only in case (APFS)](issues/19-duplicate-case-insensitive-overwrite.md) | none | wontfix | | |
| 20 | [Composer shows Saved and clears its text when the main window drops the capture](issues/20-composer-clears-dropped-capture.md) | none | done | | |
| 22 | [A note deleted or renamed outside the app is recreated by the next autosave](issues/22-external-delete-resurrected.md) | none | wontfix | | |
| 23 | [File History is lost on rename, move, auto-move and suffixed restore](issues/23-file-history-keyed-by-path.md) | none | wontfix | | |
| 24 | [A stale Tasks list can tick the wrong task line (line-number only key)](issues/24-stale-task-list-wrong-line.md) | none | wontfix | | |
| 25 | [Deep-link overwrite can replace .kokobrain files, and name=. writes outside the vault](issues/25-deep-link-path-safety.md) | none | wontfix | | |
| 26 | [A deep link to another vault is dropped by teardownVault](issues/26-cross-vault-deep-link-dropped.md) | none | wontfix | | |
| 27 | [Rename link rewrite edits links inside code blocks and misses path-qualified, extension and self links](issues/27-link-rewrite-scope.md) | none | wontfix | | |
| 28 | [Watcher and folder renames leave FTS5, semantic and Rust indexes stale](issues/28-watcher-index-staleness.md) | none | wontfix | | |
| 29 | [Meta-bind toggle, number and select write quoted strings](issues/29-meta-bind-value-types.md) | none | done | | |
| 30 | [An empty --- --- frontmatter block is not matched; writers stack a second block](issues/30-empty-frontmatter-block.md) | none | wontfix | | |
| 31 | [Non-UTF-8 notes are written back with U+FFFD, losing the original bytes](issues/31-non-utf8-rewrite.md) | none | wontfix | | |
| 32 | [Unparseable app JSON/YAML (auto-move rules, todoist, .view) is overwritten; .view comments dropped](issues/32-app-json-corrupt-overwrite.md) | none | wontfix | | |
| 33 | [Keystrokes typed during link rewrite, calendar delete or type rename writes are lost](issues/33-keystrokes-lost-during-async-writes.md) | none | wontfix | | |
| 34 | [Type rename reports success on partial failure and misses _type values with a trailing comment](issues/34-type-rename-partial-failure.md) | none | wontfix | | |
| 35 | [A failure after the disk op reports a completed rename or delete as failed and skips index re-key](issues/35-path-change-post-disk-failure.md) | none | wontfix | | |
| 36 | [Root unarchive writes vault//x.md, canvas double-prefixes picked paths, auto-move accepts ..](issues/36-path-normalization.md) | none | wontfix | | |
| 37 | [A vault outside the two fs-scope folders half-works](issues/37-vault-outside-allowed-folders.md) | none | wontfix | | |
| 38 | [Quick-capture dedupe anchor advances before the frontend accepts the capture](issues/38-quick-capture-dedupe-anchor.md) | none | wontfix | | |
| 39 | [An in-flight semantic update for vault A commits into vault B after a switch](issues/39-semantic-cross-vault-commit.md) | none | wontfix | | |
| 40 | [QueryJS blocks run with full IPC and fs access and auto-run on first open](issues/40-queryjs-unsandboxed.md) | none | wontfix | | |
| 41 | [Minor write races: autosave during rename, unserialized same-path saves, create vs restore, superseded init, calendar edge cases](issues/41-minor-write-races.md) | none | wontfix | | |
| 42 | [CRLF notes are rewritten with LF after any edit](issues/42-crlf-to-lf-rewrite.md) | none | wontfix | | |
| 43 | [A case-only rename is refused as already exists](issues/43-case-only-rename-refused.md) | none | wontfix | | |
| 44 | [Dock Quit, logout and shutdown end the app without the exit flush](issues/44-dock-quit-logout-skip-save.md) | none | wontfix | | |
| 45 | [Table +row / +col rewrite the whole table and lose cells, backslashes and container prefixes](issues/45-table-add-buttons-rewrite-loses-bytes.md) | none | done | issue/45-table-add-buttons-rewrite-loses-bytes (a6e3ca46) | 2026-11-02 |
| 46 | [A widget that throws during a tab switch leaves `isTabSwitching` stuck and silently turns off saving](issues/46-widget-throw-leaves-suppress-flags-stuck.md) | none | done | issue/46-widget-throw-leaves-suppress-flags-stuck (fa403fed) | 2026-11-02 |
| 47 | [Backspace, Delete, Tab and Enter inside a meta-bind control edit the note at the editor's cursor](issues/47-meta-bind-keys-edit-note.md) | none | done | issue/47-meta-bind-keys-edit-note (a7cdfafe) | 2026-11-02 |
| 48 | [A meta-bind button that opens or creates a note before updateMetadata writes the metadata into the opened note](issues/48-meta-bind-button-writes-opened-note.md) | none | wontfix | | |
| 49 | [A canvas-to-canvas tab switch reuses one CanvasInner: the last edit is dropped and Cmd+Z writes canvas 1 into canvas 2](issues/49-canvas-switch-reuses-instance.md) | none | wontfix | | |
| 50 | [Quick Capture clipboard screenshots live only in the OS temp dir, so the image is broken at once and lost on purge](issues/50-quick-capture-shot-temp-only.md) | none | done | issue/50-quick-capture-shot-temp-only (120d9def) | 2026-11-02 |
| 51 | [An empty inline footnote `^[]` off the cursor line crashes the footnote plugin for the rest of the session](issues/51-empty-inline-footnote-kills-footnote-plugin.md) | none | done | | |
| 52 | [Live-preview controls rewrite note text the user did not ask to change](issues/52-live-preview-unrequested-rewrites.md) | none | wontfix | | |
| 53 | [Deep-link prepend detaches the frontmatter, and non-silent new rewrites `<% %>` in the sent text](issues/53-deep-link-content-fidelity.md) | none | wontfix | | |
| 54 | [A semantic update still embedding when its note is deleted leaves chunks for the trashed note](issues/54-semantic-update-after-delete.md) | none | wontfix | | |
| 55 | [A widget that throws on every render leaves its tab showing the previous note and drops typing](issues/55-persistent-widget-throw-desyncs-tab.md) | none | wontfix | | |
| 56 | [Kanban lane actions can turn a raw `---` into the archive separator; restore to a missing lane drops the card](issues/56-kanban-lane-actions-archive-pattern.md) | none | wontfix | | |
| 57 | [Enter, Backspace and other keys in a meta-bind select inside a table cell edit the note at the editor's cursor](issues/57-table-meta-bind-select-keys-edit-note.md) | none | done | issue/57-table-meta-bind-select-keys-edit-note (67060aea) | 2026-11-02 |

## Log

- 2026-11-02 06:35 — ledger created (41 Issues)
- 2026-11-02 06:35 — ledger updated (title of 04, 07, 08, 09, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43)
- 2026-11-02 06:36 — 01 — start — launched by /relay-lite:run — 7b82f6f6
- 2026-11-02 08:04 — 01 — deliver — squash-merged as 020af809: quit and restart to update run prepareForExit, body autosave has a 10 s max wait; reviews APPROVED x2; suite and cargo test green; Dock Quit and logout left to Issue 44; owner checks Cmd+Q by hand — 020af809
- 2026-11-02 08:05 — ledger updated (added 44)
- 2026-11-02 08:05 — 02 — start — launched by /relay-lite:run — 510ecfc5
- 2026-11-02 08:17 — 02 — deliver — squash-merged as b4f126bf: task toggle and deep-link writes save the dirty tab first and abort on a failed save; reviews APPROVED x2; full suite green — b4f126bf
- 2026-11-02 08:45 — ledger updated (added 45, 46, 47, 48, 49, 50, 51, 52, 53; blocked by of 18)
- 2026-11-02 08:46 — 05 — start — launched by /relay-lite:run — d39378c9
- 2026-11-02 09:02 — 05 — deliver — merged f1b3cde9: save dirty tabs before delete, re-add on failed Trash move; review APPROVED (2 findings: comment fixed, semantic leftover filed as Issue 54), suite 9886 passed — f1b3cde9
- 2026-11-02 09:02 — 06 — start — launched by /relay-lite:run — d4d34060
- 2026-11-02 09:14 — 06 — deliver — merged 3461afa1: vault switch asks before dropping tabs that failed to save, cancel clears the pending deep-link action; review APPROVED (2 nits fixed), suite 9893 passed — 3461afa1
- 2026-11-02 09:35 — ledger updated (added 54)
- 2026-11-02 09:53 — 17 — start — launched by /relay-lite:run — c4a5ae8b
- 2026-11-02 10:14 — 17 — deliver — merged 40ef2752: panel, meta-bind and capture refuse lossy frontmatter rewrites with a toast; reviews APPROVED x2 (fix round: one toast, refused field reverts); suite 9925 passed — 40ef2752
- 2026-11-02 10:14 — 04 — start — launched by /relay-lite:run — 211feccb
- 2026-11-02 10:22 — 04 — deliver — merged 9f5e4dd2: silent new on an existing note writes nothing and shows an info toast; reviews APPROVED x2 (fix round: no-write assertions, docs row); suite 9931 passed — 9f5e4dd2
- 2026-11-02 11:05 — 46 — start — launched by /relay-lite:run — a4445a3e
- 2026-11-02 11:09 — ledger updated (blocked by of 14)
- 2026-11-02 11:21 — 46 — deliver — merged fa403fed: replaceDoc catches a widget throw, rebuilds the view and resets the flags; ImageWidget guards decodeURIComponent; reviews APPROVED x2 (persistent-throw desync filed as Issue 55); suite 9937 passed — fa403fed
- 2026-11-02 11:21 — ledger updated (added 55)
- 2026-11-02 11:21 — 16 — start — launched by /relay-lite:run — 8cbb149a
- 2026-11-02 11:48 — 16 — deliver — merged 89636f7c: kanban round trip keeps unmodeled lines, CRLF, frontmatter, malformed settings, single-line cards; R1 CHANGES_REQUESTED (5 fixed), R2 and R3 APPROVED; suite 9978 passed — 89636f7c
- 2026-11-02 14:26 — 47 — start — launched by /relay-lite:run — c83f24ef
- 2026-11-02 14:42 — 47 — deliver — merged a7cdfafe: meta-bind input, toggle, select and code-block widgets ignore key/input/composition events from form controls; R1 APPROVED (3 findings: 2 fixed, table-cell select split to Issue 57), R2 APPROVED; suite 10012 passed — a7cdfafe
- 2026-11-02 14:42 — 45 — start — launched by /relay-lite:run — 6851f7f1
- 2026-11-02 14:55 — 45 — deliver — merged a6e3ca46: +row/+col point-insert the new row or cell, keeping cells, backslashes, aliases and callout/list prefixes; R1 APPROVED (3 fixed: prefix-aware delimiterAlignments, list +col test, escape tests), R2 APPROVED; suite 10029 passed — a6e3ca46
- 2026-11-02 14:56 — 14 — start — launched by /relay-lite:run (pr delivery for a 3-reviewer pass before merge) — 619f76ec
- 2026-11-02 14:56 — 18 — start — launched by /relay-lite:run — 95e68609
- 2026-11-02 15:30 — 14 — deliver — PR https://github.com/diegorv/koko.brain/pull/233; R1 CHANGES_REQUESTED fixed (rename only when recorded, undo maps through each changed region of an external sync, too-large sync language test), R2 APPROVED, R3 APPROVED (nit: always-true assertion at test:259 not acted on); held for a 3-reviewer pass before merge — 7b43cb51
- 2026-11-02 19:10 — 14 — merged — PR #233 squash-merged as fe51c2ad after a 3-reviewer opus pass; review fixes 09cfb4c7 (stale rename records, CRLF normalization, cursor clamp) and E2E scroll fix efeabb2e; 17/17 checks green — fe51c2ad
- 2026-11-02 20:00 — 18 — deliver — merged e588dda0: a rewrite keeps the source spelling of unchanged number and boolean scalars (0042, 1.0, 9.90, True, 0x1F, 1e3); Issue 17 refusals kept; R1 APPROVED (3 fixed: ADR-0029 amendment, NaN via Object.is, exact toggle test), R2 APPROVED; suite 10043 passed — e588dda0
- 2026-11-02 20:01 — 50 — start — launched by /relay-lite:run — 57542c32
- 2026-11-02 20:20 — 50 — deliver — merged 120d9def (finished by hand after deliver refused on another session's unpushed docs commit): clipboard shots are copied from temp into the capture note's folder and embedded with a vault-relative ![[...]]; R1 APPROVED (3 fixed, 1 rejected), R2 APPROVED; suite 10096 passed, cargo 1219 passed — 120d9def
- 2026-11-02 21:05 — ledger updated (added 56, 57)
- 2026-11-02 21:05 — 57 — start — launched by /relay-lite:run — d9d7000c
- 2026-11-02 21:14 — 57 — deliver — merged 67060aea: TableWidget.ignoreEvent returns isFormControlInputEvent, so keys in a table-cell meta-bind select stay in the select; R1 APPROVED (nit fixed: Mod-z test), R2 APPROVED; suite 10103 passed — 67060aea
- 2026-11-06 00:31 — 07, 08, 09, 10, 11, 12, 13, 15, 19, 22, 23, 24, 25, 26, 27, 28, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 48, 49, 52, 53, 54, 55, 56 set to wontfix by hand: migrated to .scratch/audit-2026-11-05/ by the pre-use audit (each Issue file names its new number); 20, 29, 51 set to done by hand: the audit found them fixed by later work (each Issue file says by which commit); the CLI has no transition from todo to wontfix or done
