# File I/O audit

Read-only audit of how notes are read, written, renamed and deleted across the TypeScript frontend and the Rust backend, verified at c4bfee07.

## Method

1. Map and review: 22 haiku scouts mapped one slice each, 10 opus reviewers hunted bugs per risk theme, 10 opus verifiers tried to refute them. Output: 101 claims (`raw/`).
2. Deep dive: the claims were regrouped into 20 groups and handed, without the earlier verdicts, to 10 opus and 10 haiku refute-first verifiers. TypeScript claims needed a vitest repro that fails on the bug assertion (`repro/`, run from a worktree). Native and Rust claims are confirmed by trace only, with fetched upstream source.
3. The repro suite was re-run by the main session: 96 tests, 88 fail on their bug assertion, 8 pass (controls plus the refuted claim). The P0 and the main P1 code paths were re-read by hand.

The repro tests live under `.scratch/` so they do not run in the suite (vitest includes only `src/tests/**`). Imports assume `src/tests/repro/<group>/`.

## Priority scale

- P0: permanent loss of note content in normal use, nothing to recover from.
- P1: loss recoverable only with effort or in a less common but realistic path; silent corruption of note bytes; loss of history or trash entries.
- P2: stale state, path-safety and security hardening, low-impact app-file loss.
- P3: minor races, cosmetic, hardening without a realistic trigger.

## Issues

| # | Priority | Severity | Issue |
|---|---|---|---|
| 01 | P0 | data-loss | [Quit, Dock Quit, logout and Restart to update run the same save flush as closing the window](issues/01-quit-skips-save-on-close.md) |
| 02 | P1 | data-loss | [Task toggle and deep-link writes save the open dirty tab before writing from disk](issues/02-task-toggle-overwrites-dirty-tab.md) |
| 03 | P1 | data-loss | merged into [02](issues/02-task-toggle-overwrites-dirty-tab.md) |
| 04 | P1 | data-loss | [Silent deep-link new overwrites an existing note, with empty content when none is given](issues/04-deep-link-silent-new-overwrites-note.md) |
| 05 | P1 | data-loss | [Delete saves dirty tabs first and closes them only after the Trash move succeeds](issues/05-delete-closes-dirty-tabs-unsaved.md) |
| 06 | P1 | data-loss | [A vault switch asks before discarding tabs that failed to save](issues/06-vault-switch-after-failed-save.md) |
| 07 | P1 | data-loss | [Note writes truncate in place: a failed write can leave the note empty](issues/07-non-atomic-note-writes.md) |
| 08 | P1 | data-loss | [An external change to an open note is overwritten by the next autosave or calendar write](issues/08-external-change-overwritten.md) |
| 09 | P1 | data-loss | [A watcher rescan (dropped FSEvents) never reloads open tabs, so the next save overwrites the external change](issues/09-fsevents-rescan-ignored.md) |
| 10 | P1 | data-loss | [A settings load failure writes defaults over settings.json and purges File History at the 7-day default](issues/10-settings-load-failure-defaults.md) |
| 11 | P1 | data-loss | [Trash writers rebuild the manifest from a stale or empty store, orphaning trashed items](issues/11-trash-manifest-stale-rebuild.md) |
| 12 | P1 | corruption | [File History Restore writes the snapshot into the active tab, not the note in the dialog](issues/12-file-history-restore-wrong-tab.md) |
| 13 | P1 | data-loss | [No snapshot of the pre-save bytes, and retention deletes a note's last snapshot](issues/13-file-history-no-baseline.md) |
| 14 | P1 | corruption | [Undo history survives a tab switch, so Cmd+Z can insert another note's text](issues/14-undo-history-across-notes.md) |
| 15 | P1 | data-loss | [An unparseable .canvas opens empty and the first edit overwrites the original](issues/15-canvas-unparseable-overwritten.md) |
| 16 | P1 | data-loss | [Kanban board actions delete unmodeled lines; CRLF boards and boards with frontmatter lose lanes](issues/16-kanban-lossy-reserialize.md) |
| 17 | P1 | data-loss | [Properties panel and meta-bind edits drop YAML comments, nested maps, duplicate keys and anchors](issues/17-frontmatter-lossy-rewrite.md) |
| 18 | P1 | corruption | [Every frontmatter rewrite re-spells numbers (01234 to 1234, 1.10 to 1.1)](issues/18-frontmatter-number-respelling.md) |
| 19 | P1 | data-loss | [Duplicate overwrites a sibling whose name differs only in case (APFS)](issues/19-duplicate-case-insensitive-overwrite.md) |
| 20 | P1 | data-loss | [Composer shows Saved and clears its text when the main window drops the capture](issues/20-composer-clears-dropped-capture.md) |
| 21 | P2 | data-loss | merged into [01](issues/01-quit-skips-save-on-close.md) |
| 22 | P2 | corruption | [A note deleted or renamed outside the app is recreated by the next autosave](issues/22-external-delete-resurrected.md) |
| 23 | P2 | stale-state | [File History is lost on rename, move, auto-move and suffixed restore](issues/23-file-history-keyed-by-path.md) |
| 24 | P2 | corruption | [A stale Tasks list can tick the wrong task line (line-number only key)](issues/24-stale-task-list-wrong-line.md) |
| 25 | P2 | security | [Deep-link overwrite can replace .kokobrain files, and name=. writes outside the vault](issues/25-deep-link-path-safety.md) |
| 26 | P2 | data-loss | [A deep link to another vault is dropped by teardownVault](issues/26-cross-vault-deep-link-dropped.md) |
| 27 | P2 | corruption | [Rename link rewrite edits links inside code blocks and misses path-qualified, extension and self links](issues/27-link-rewrite-scope.md) |
| 28 | P2 | stale-state | [Watcher and folder renames leave FTS5, semantic and Rust indexes stale](issues/28-watcher-index-staleness.md) |
| 29 | P2 | corruption | [Meta-bind toggle, number and select write quoted strings](issues/29-meta-bind-value-types.md) |
| 30 | P2 | corruption | [An empty --- --- frontmatter block is not matched; writers stack a second block](issues/30-empty-frontmatter-block.md) |
| 31 | P2 | corruption | [Non-UTF-8 notes are written back with U+FFFD, losing the original bytes](issues/31-non-utf8-rewrite.md) |
| 32 | P2 | corruption | [Unparseable app JSON/YAML (auto-move rules, todoist, .view) is overwritten; .view comments dropped](issues/32-app-json-corrupt-overwrite.md) |
| 33 | P2 | data-loss | [Keystrokes typed during link rewrite, calendar delete or type rename writes are lost](issues/33-keystrokes-lost-during-async-writes.md) |
| 34 | P2 | stale-state | [Type rename reports success on partial failure and misses _type values with a trailing comment](issues/34-type-rename-partial-failure.md) |
| 35 | P2 | stale-state | [A failure after the disk op reports a completed rename or delete as failed and skips index re-key](issues/35-path-change-post-disk-failure.md) |
| 36 | P2 | stale-state | [Root unarchive writes vault//x.md, canvas double-prefixes picked paths, auto-move accepts ..](issues/36-path-normalization.md) |
| 37 | P2 | stale-state | [A vault outside the two fs-scope folders half-works](issues/37-vault-outside-allowed-folders.md) |
| 38 | P2 | minor | [Quick-capture dedupe anchor advances before the frontend accepts the capture](issues/38-quick-capture-dedupe-anchor.md) |
| 39 | P2 | stale-state | [An in-flight semantic update for vault A commits into vault B after a switch](issues/39-semantic-cross-vault-commit.md) |
| 40 | P2 | security | [QueryJS blocks run with full IPC and fs access and auto-run on first open](issues/40-queryjs-unsandboxed.md) |
| 41 | P3 | stale-state | [Minor write races: autosave during rename, unserialized same-path saves, create vs restore, superseded init, calendar edge cases](issues/41-minor-write-races.md) |
| 42 | P3 | corruption | [CRLF notes are rewritten with LF after any edit](issues/42-crlf-to-lf-rewrite.md) |
| 43 | P3 | minor | [A case-only rename is refused as already exists](issues/43-case-only-rename-refused.md) |
| 44 | P1 | data-loss | [Dock Quit, logout and shutdown end the app without the exit flush](issues/44-dock-quit-logout-skip-save.md) |
| 45 | P0 | data-loss | [Table +row / +col rewrite the whole table and lose cells, backslashes and container prefixes](issues/45-table-add-buttons-rewrite-loses-bytes.md) |
| 46 | P0 | data-loss | [A widget that throws during a tab switch leaves `isTabSwitching` stuck and silently turns off saving](issues/46-widget-throw-leaves-suppress-flags-stuck.md) |
| 47 | P1 | corruption | [Backspace, Delete, Tab and Enter inside a meta-bind control edit the note at the editor's cursor](issues/47-meta-bind-keys-edit-note.md) |
| 48 | P1 | corruption | [A meta-bind button that opens or creates a note before updateMetadata writes the metadata into the opened note](issues/48-meta-bind-button-writes-opened-note.md) |
| 49 | P1 | data-loss | [A canvas-to-canvas tab switch reuses one CanvasInner: the last edit is dropped and Cmd+Z writes canvas 1 into canvas 2](issues/49-canvas-switch-reuses-instance.md) |
| 50 | P1 | data-loss | [Quick Capture clipboard screenshots live only in the OS temp dir, so the image is broken at once and lost on purge](issues/50-quick-capture-shot-temp-only.md) |
| 51 | P2 | crash | [An empty inline footnote `^[]` off the cursor line crashes the footnote plugin for the rest of the session](issues/51-empty-inline-footnote-kills-footnote-plugin.md) |
| 52 | P2 | corruption | [Live-preview controls rewrite note text the user did not ask to change](issues/52-live-preview-unrequested-rewrites.md) |
| 53 | P2 | corruption | [Deep-link prepend detaches the frontmatter, and non-silent new rewrites `<% %>` in the sent text](issues/53-deep-link-content-fidelity.md) |

## Cross-reference with the editor-data-safety audit

A second audit of the editor (`.scratch/editor-data-safety/audit-2026-11-02.md`) was mapped onto these Issues in `.scratch/editor-data-safety/xref-file-io-audit.md`. Issues 05, 06, 07, 09, 13, 15, 16, 17, 18, 26, 28, 31, 34, 36, 40 and 41 gained variants, fixes and criteria in a section "Audit evidence (editor-data-safety, 2026-11-02)"; 45-53 are new. Its repro tests are under `.scratch/editor-data-safety/repro/`. Where an Issue had no checklist before, the new criteria cover only that amendment, and triage writes the rest.

## Refuted

- Canvas onDestroy flush writes canvas JSON into the newly active tab (claims feature-writers-1). Svelte 5 (installed 5.57.2) returns pre-change signal values inside teardown (old_values), so editorStore.updateContent called from onDestroy targets the canvas tab that was active before the switch. Residual (unclaimed, P3): the guard is implicit, not app code. On closing a canvas within 300 ms of a node-text edit, the pending edit goes into the removed tab object and is lost without a prompt (the tab was not dirty yet). On a canvas -> canvas switch, the effect cleanup cancels the timer but leaves pendingPersist true, dropping A's last <300 ms edit.
