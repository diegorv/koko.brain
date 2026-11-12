# Ledger: open-itens

This file is the source of truth for the progress of the open-itens Issues. Read it before working on any of them. It is written only by `/relay-lite:run`, through `relay ledger`: never edit it by hand.

## Continue

```text
/relay-lite:run open-itens
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
| 001 | [The caret and selection follow their text when a frontmatter toggle, property edit, link rewrite or external reload rewrites the open note](issues/001-caret-selection-follow-their-text-when-frontmatter.md) | none | done | issue/001-caret-selection-follow-their-text-when-frontmatter (13291dfa0) | 2026-11-10 |
| 002 | [Keyboard edits next to the hidden frontmatter never change its fences](issues/002-keyboard-edits-next-hidden-frontmatter-never-change.md) | none | todo | | |
| 003 | [Closing the main window never leaves a windowless app: Quick Capture, deep links and a Dock click keep working](issues/003-closing-main-window-never-leaves-windowless-app.md) | none | todo | | |
| 004 | [A canvas edit closed inside the debounce window reaches its .canvas file](issues/004-canvas-edit-closed-renamed-inside-debounce-window.md) | 015 | todo | | |
| 005 | [Setting a folder icon never stacks a second frontmatter block](issues/005-empty-frontmatter-block-matched-writers-never-stack.md) | none | todo | | |
| 006 | [A kanban card or lane title being edited is saved into its own board when the tab changes, and never into another tab](issues/006-kanban-card-lane-title-being-edited-saved.md) | 004 | todo | | |
| 007 | [Paste, cut and copy inside a meta-bind number or date input act on the input, not the note](issues/007-paste-cut-copy-inside-meta-bind-number.md) | none | todo | | |
| 008 | [A Properties panel commit that changes nothing does not arm the skip flag](issues/008-properties-panel-commit-that-changes-nothing-does.md) | none | todo | | |
| 009 | [Tab rename and delete keep `_rail_view` in sync](issues/009-rail-view-follows-tab-rename.md) | none | todo | | |
| 010 | [Filters report unknown methods](issues/010-filters-report-unknown-methods.md) | none | todo | | |
| 011 | [Edit view saves only what the user changed](issues/011-save-only-what-changed.md) | 009 | todo | | |
| 012 | [Tab-strip menu acts on the right tab, and Delete asks first](issues/012-tab-menu-right-tab-and-delete-confirm.md) | 009 | todo | | |
| 013 | [The Filter panel cannot write an empty or unparseable filter](issues/013-filter-panel-safe-writes.md) | 012, 010 | todo | | |
| 014 | [Backlinks and Outgoing links always show the open note's own links, also after returning to a note seen at the same index version](issues/014-backlinks-outgoing-links-always-show-open-note.md) | none | todo | | |
| 015 | [Closing a tab with unsaved text saves it and closes; a prompt appears only when that save fails](issues/015-closing-tab-unsaved-text-saves-closes-prompt.md) | none | done | issue/015-closing-tab-unsaved-text-saves-closes-prompt (da26b0dcd) | 2026-11-12 |
| 016 | [File History keeps a snapshot of the pre-save bytes, and retention never deletes a note's last snapshot](issues/016-file-history-keeps-snapshot-pre-save-bytes.md) | 015 | todo | | |
| 017 | [An external change to an open note is never overwritten by the next autosave or calendar write](issues/017-external-change-open-note-never-overwritten-next.md) | none | todo | | |
| 018 | [A note deleted or renamed outside the app is closed or marked orphaned, never recreated by the next autosave](issues/018-note-deleted-renamed-outside-app-closed-marked.md) | 017 | todo | | |
| 019 | [Every tab write checks the disk first, so an external change is never overwritten without a copy](issues/019-every-tab-write-checks-disk-first-so.md) | 017 | todo | | |
| 020 | [A failed tree refresh still fans out the burst, and scan_vault skips an unreadable subfolder](issues/020-watcher-events-keep-fts5-semantic-rust-indexes.md) | none | todo | | |
| 021 | [Guarded, status-preserving toggle](issues/021-guarded-status-preserving-toggle.md) | none | done | issue/021-guarded-status-preserving-toggle (fc8741157) | 2026-11-09 |
| 022 | [An empty --- --- frontmatter block from outside the app is matched, and writers never stack a second block](issues/022-empty-frontmatter-block-from-outside-app-matched.md) | 005 | todo | | |
| 023 | [File History Restore writes the snapshot into the note shown in the dialog, never into whichever tab is active](issues/023-file-history-restore-writes-snapshot-into-note.md) | none | todo | | |
| 024 | [A meta-bind button stops its remaining actions when an open action fails](issues/024-meta-bind-button-stops-remaining-actions-when.md) | none | todo | | |
| 025 | [A meta-bind button's updateMetadata always writes the button's own note, also after an open or createNote action](issues/025-meta-bind-button-s-updatemetadata-always-writes.md) | 024 | todo | | |
| 026 | [Clearing a canvas node's color or a link node's title is saved to the .canvas file](issues/026-clearing-canvas-node-s-color-link-node.md) | none | todo | | |
| 027 | [An unparseable .canvas opens in an error state and is never overwritten by canvas edits](issues/027-unparseable-canvas-opens-error-state-never-overwritten.md) | 004, 026 | todo | | |
| 028 | [Duplicate saves the note's unsaved typing before copying it](issues/028-duplicate-saves-note-s-unsaved-typing-before.md) | none | todo | | |
| 029 | [Duplicate never overwrites a sibling whose name differs only in case (APFS)](issues/029-duplicate-never-overwrites-sibling-whose-name-differs.md) | 028 | todo | | |
| 030 | [A session whose settings.json was never loaded never writes it and never purges File History at the default retention](issues/030-session-whose-settings-json-was-never-loaded.md) | none | done | issue/030-session-whose-settings-json-was-never-loaded (721ef3a5c) | 2026-11-12 |
| 031 | [Auto-move rules: a failed load is never saved over the file](issues/031-auto-move-rules-todoist-sent-list-failed.md) | 030 | todo | | |
| 032 | [Keep uncaught mod errors out of Sentry](issues/032-mod-errors-out-of-sentry.md) | none | todo | | |
| 033 | [The privacy scanner stops skipping every line that contains a URL, and PRIVACY.md matches the code](issues/033-privacy-scanner-skips-every-url.md) | none | todo | | |
| 034 | [Sentry events carry an environment, the test button stops claiming delivery, and the copy says what is sent](issues/034-sentry-environment-test-button-and-copy.md) | none | todo | | |
| 035 | [Rust panic events carry the panic location (file:line)](issues/035-rust-panic-location-in-message.md) | 034 | todo | | |
| 036 | [Settings > File History > Automatic snapshots takes effect on the next save, with no vault reopen](issues/036-settings-file-history-automatic-snapshots-takes-effect.md) | none | todo | | |
| 037 | [update_semantic_file has no queue: bursts pile up, repeat work and embed deleted notes](issues/037-update-semantic-file-queue.md) | none | todo | | |
| 038 | [Canvas image nodes load their image: the main capability grants fs:allow-read-file on the vault roots](issues/038-canvas-image-nodes-load-their-image-main.md) | none | todo | | |
| 039 | [Canvas file nodes added in the app load their note, and file nodes resolve both absolute and vault-relative paths](issues/039-canvas-file-image-nodes-store-vault-relative.md) | 004 | todo | | |
| 040 | [Kanban drag-and-drop puts a card or lane exactly where the drop indicator shows](issues/040-kanban-drag-drop-puts-card-lane-exactly.md) | 006 | todo | | |
| 041 | [DataArray sort and sortBy keep the items that have the key in order and group the items without it at one end](issues/041-dataarray-sort-sortby-keep-items-that-have.md) | none | todo | | |
| 042 | [Enter in the quick switcher creates the note when nothing matches](issues/042-enter-quick-switcher-creates-note-when-nothing.md) | none | todo | | |
| 043 | [Lens lists follow the user's own rename, trash, duplicate and create at once, not after the 2 to 10 s index throttle](issues/043-lens-lists-follow-user-s-own-rename.md) | 028 | todo | | |
| 044 | [File History follows a note through rename, move, auto-move and suffixed restore](issues/044-file-history-follows-note-through-rename-move.md) | none | todo | | |
| 045 | [Text search with tag: or path: returns every note that matches the words and the operators, and tag: matches nested tags](issues/045-text-search-tag-path-returns-every-note.md) | none | todo | | |
| 046 | [Outgoing links marks a row as broken only when its target is missing: same-note heading links and embeds of existing files are not red](issues/046-outgoing-links-marks-row-broken-only-when.md) | 014 | todo | | |
| 047 | [Numeric <, <=, > and >= filters never match a note that lacks the property](issues/047-numeric-filters-never-match-note-that-lacks.md) | 068 | todo | | |
| 048 | [Kanban lane actions never turn a raw --- into the archive separator, and restore to a missing lane keeps the card](issues/048-kanban-lane-actions-never-turn-raw-into.md) | none | todo | | |
| 049 | [Renaming a kanban lane keeps its card limit, auto-complete and collapsed state](issues/049-renaming-kanban-lane-keeps-card-limit-auto.md) | 048 | todo | | |
| 050 | [Canvas file nodes preview the note without its YAML frontmatter](issues/050-canvas-file-nodes-preview-note-without-yaml.md) | none | todo | | |
| 051 | [Canvas Duplicate places the copy next to the node's current position and size](issues/051-canvas-duplicate-places-copy-next-node-s.md) | none | todo | | |
| 052 | [Renaming a note updates [[links]] in kanban cards](issues/052-renaming-moving-note-updates-links-kanban-cards.md) | none | todo | | |
| 053 | [A QueryJS block run in the seconds after a save shows the saved data once the index catches up, and never keeps a pre-save result](issues/053-queryjs-block-run-seconds-after-save-shows.md) | none | todo | | |
| 054 | [Auto Move evaluates and moves only Markdown notes: kanban boards, canvases and other files stay where they are](issues/054-auto-move-evaluates-moves-only-markdown-notes.md) | none | todo | | |
| 055 | [HTML link paste keeps bracketed link text and table cells intact](issues/055-html-link-paste-keeps-bracketed-link-text.md) | none | todo | | |
| 056 | [Cmd+click on a reference link or an email autolink opens its target, and a link with no openable URL is not sent to the opener](issues/056-cmd-click-reference-link-email-autolink-opens.md) | none | todo | | |
| 057 | [Clearing the search box while a search is still running shows the empty-query hint, not a stuck Searching...](issues/057-clearing-search-box-while-search-still-running.md) | none | todo | | |
| 058 | [A formula that calls an unknown function cannot be confirmed and shows why](issues/058-formula-that-calls-unknown-function-cannot-confirmed.md) | none | todo | | |
| 059 | [New File from Template says the name is taken instead of silently opening the existing note](issues/059-new-file-from-template-says-name-taken.md) | none | todo | | |
| 060 | [A kb.table, kb.ui.table or kb.list cell holding an array or DataArray of links renders each link as a clickable link](issues/060-kb-table-kb-ui-table-kb-list.md) | none | todo | | |
| 061 | [A task checkbox in live preview reacts only to the primary button](issues/061-live-preview-controls-change-only-text-user.md) | none | todo | | |
| 062 | [Rendered table cells show links, line breaks and escaped pipes as formatted content](issues/062-rendered-table-cells-show-links-highlight-underscore.md) | none | in-progress | | |
| 063 | [Standard markdown images with a vault-relative path load from the vault](issues/063-standard-markdown-images-vault-relative-path-load.md) | none | todo | | |
| 064 | [Wikilink autocomplete inserts a non-markdown file with its extension, so ![[photo.png]] embeds the image](issues/064-wikilink-autocomplete-inserts-non-markdown-file-extension.md) | none | todo | | |
| 065 | [A calendar day with more than three notes lets the user reach every note](issues/065-calendar-day-more-than-three-notes-lets.md) | none | todo | | |
| 066 | [The status bar note count follows notes created, imported and deleted during the session](issues/066-status-bar-note-count-follows-notes-created.md) | none | todo | | |
| 067 | [Columns and sort keys resolve like expressions](issues/067-columns-resolve-like-expressions.md) | 010 | todo | | |
| 068 | [DESC sort lists notes without a value last](issues/068-desc-sort-nulls-last.md) | none | todo | | |
| 069 | [Small `.view` tab write feedback](issues/069-editor-write-feedback.md) | 013 | todo | | |
| 070 | [Change icon on a broken .view says why nothing changed](issues/070-view-writers-refresh-and-fail-loudly.md) | none | todo | | |
| 071 | [.view toolbar and icon writes keep the file's YAML comments](issues/071-view-toolbar-icon-writes-keep-file-s.md) | none | todo | | |
| 072 | [Todoist sync failures are visible and read the HTTP status](issues/072-todoist-sync-errors-visible.md) | none | wontfix | | |
| 073 | [Todoist send: full project lists, refresh, the default label and recurring due dates](issues/073-todoist-project-lists-page-and-refresh.md) | none | wontfix | | |
| 076 | [Note writes are atomic: a failed write never leaves the note empty or truncated](issues/076-note-writes-are-atomic-failed-write-never.md) | none | todo | | |
| 077 | [Rename link rewrite skips links inside code blocks and updates self links](issues/077-rename-link-rewrite-skips-links-inside-code.md) | none | todo | | |
| 078 | [Deep-link names resolve safely: .md is added unless the name ends in a real extension, name=. stays inside the vault, and overwrite never replaces .kokobrain files](issues/078-deep-link-names-resolve-safely-md-added.md) | none | todo | | |
| 079 | [An Auto Move rule edit made just before Settings closes or changes section is still written to auto-move-rules.json](issues/079-auto-move-rule-edit-made-just-before.md) | 031 | todo | | |
| 080 | [A failure after the disk op still reports a completed rename as done and re-keys the index](issues/080-failure-after-disk-op-still-reports-completed.md) | none | todo | | |
| 081 | [A note with an unquoted wikilink value (up: [[Home]]) accepts property, lifecycle, icon and meta-bind writes](issues/081-note-unquoted-wikilink-value-up-home-accepts.md) | none | todo | | |
| 082 | [A failed Auto Move tells the user which note did not move and why](issues/082-failed-auto-move-tells-user-which-note.md) | 031, 233 | todo | | |
| 083 | [A vault picked outside the two allowed folders is refused with a message naming them, never half-working](issues/083-vault-picked-outside-two-allowed-folders-refused.md) | none | todo | | |
| 084 | [A note whose live-preview widget throws on every render stays editable and in sync with its tab](issues/084-note-whose-live-preview-widget-throws-every.md) | none | todo | | |
| 085 | [read_files_batch only reads inside the vault that is actually open](issues/085-read-files-batch-only-reads-inside-vault.md) | none | todo | | |
| 086 | [QueryJS pager clicks keep the widget rendered; wikilinks in inline code and media tags in code render as text](issues/086-queryjs-pager-clicks-keep-widget-rendered-wikilinks.md) | none | todo | | |
| 087 | [The local graph center follows every way the graph tab gets focus, and hints when the center note is gone](issues/087-local-graph-center-follows-every-way-graph.md) | none | todo | | |
| 088 | [A watcher rescan (dropped FSEvents) reloads open tabs before the next save](issues/088-watcher-rescan-dropped-fsevents-reloads-open-tabs.md) | none | todo | | |
| 089 | [Keystrokes typed during link rewrite, type rename or watcher reload writes are kept](issues/089-keystrokes-typed-during-link-rewrite-type-rename.md) | none | todo | | |
| 090 | [Dock Quit, logout and shutdown run the exit flush before the app ends](issues/090-dock-quit-logout-shutdown-run-exit-flush.md) | none | todo | | |
| 091 | [Deep-link prepend goes below the frontmatter, and non-silent new keeps <% %> in the sent text](issues/091-deep-link-prepend-goes-below-frontmatter-non.md) | none | todo | | |
| 092 | [An unreadable or corrupt trash manifest is backed up, never replaced by a partial list, and trash writers never orphan trashed items](issues/092-unreadable-corrupt-trash-manifest-backed-up-never.md) | none | todo | | |
| 093 | [Type rename reports partial failure and also updates _type values with a trailing comment](issues/093-type-rename-reports-partial-failure-also-updates.md) | none | todo | | |
| 094 | [Non-UTF-8 files open read-only or as binary, never written back with U+FFFD](issues/094-non-utf-8-files-open-read-only.md) | none | todo | | |
| 095 | [CRLF notes keep their CRLF line endings after an edit](issues/095-crlf-notes-keep-their-crlf-line-endings.md) | none | todo | | |
| 096 | [Root unarchive writes vault/x.md, auto-move refuses .. segments, and a case or NFC variant of a path reuses the open tab](issues/096-root-unarchive-writes-vault-x-md-auto.md) | none | todo | | |
| 097 | [The quick-capture dedupe anchor advances only after the frontend accepts the capture](issues/097-quick-capture-dedupe-anchor-advances-only-after.md) | none | todo | | |
| 098 | [Collection link() cells never navigate the app webview and drop unsafe schemes](issues/098-collection-link-cells-never-navigate-app-webview.md) | none | todo | | |
| 099 | [Deep-link prepend and append, daily capture and the closed-note frontmatter rewrite snapshot a note with an empty history first](issues/099-deep-link-prepend-append-daily-capture-closed.md) | 016 | todo | | |
| 100 | [Renaming or moving a note updates the file nodes that point at it in canvases](issues/100-renaming-moving-note-updates-file-nodes-that.md) | 039, 004, 052 | todo | | |
| 101 | [File History restores into a board view or a closed tab by path](issues/101-file-history-restores-into-board-view-closed.md) | 023 | todo | | |
| 102 | [A tree refresh failure after a successful rename still reports it as done](issues/102-tree-refresh-failure-after-successful-rename-still.md) | 080 | todo | | |
| 103 | [Note-writing commands refuse paths outside the open vault](issues/103-note-writing-commands-refuse-paths-outside-open.md) | 085 | todo | | |
| 104 | [Vault-root commands (scan, index builds, watcher, model init) only accept the open vault](issues/104-vault-root-commands-scan-index-builds-watcher.md) | 103 | todo | | |
| 105 | [Minor write races are closed: autosave during rename, retry-chain stacking, create vs restore, superseded init, calendar rollback, the properties skip flag](issues/105-minor-write-races-are-closed-autosave-during.md) | none | todo | | |
| 106 | [Watcher events keep FTS5 and semantic rows current, and a read error is not treated as a delete](issues/106-watcher-events-keep-fts5-semantic-rows-current.md) | 020 | todo | | |
| 107 | [A semantic update still embedding when its note is deleted leaves no chunks for the trashed note](issues/107-semantic-update-still-embedding-when-note-deleted.md) | none | todo | | |
| 114 | [Task writes reach search and the QueryJS cache](issues/114-task-writes-reach-search.md) | 021 | done | issue/114-task-writes-reach-search (108a60047) | 2026-11-09 |
| 127 | [A Todoist send is never silently forgotten](issues/127-todoist-send-never-forgotten.md) | none | wontfix | | |
| 128 | [Todoist link survives edits, and reworded tasks show "possibly sent"](issues/128-todoist-identity-and-possibly-sent.md) | none | wontfix | | |
| 130 | [Todoist links follow renames, and unmatched entries are listed](issues/130-todoist-renames-and-unlinked.md) | none | wontfix | | |
| 131 | [Section layout and live Filters preview](issues/131-sections-and-live-preview.md) | 011, 250 | todo | | |
| 132 | [Edit view opens from anywhere, hidden views included](issues/132-edit-view-from-anywhere.md) | 131 | todo | | |
| 133 | [Sort & limit section](issues/133-sort-and-limit-section.md) | 132 | todo | | |
| 134 | [Display section](issues/134-display-section.md) | 133 | todo | | |
| 135 | [Behavior section](issues/135-behavior-section.md) | 134 | todo | | |
| 136 | [Rail view switcher for multi-view files](issues/136-rail-view-switcher.md) | 013 | todo | | |
| 137 | [Rule line names the limit and the sort source](issues/137-rule-line-limit-and-sort.md) | 136 | todo | | |
| 138 | [Calendars say how many notes have no date](issues/138-calendar-undated-count.md) | 012, 067, 069 | todo | | |
| 139 | [Properties panel matches the table's columns](issues/139-properties-panel-matches-columns.md) | 138, 069 | todo | | |
| 140 | [`.view` tab keyboard and labels](issues/140-view-tab-keyboard-and-labels.md) | 139 | todo | | |
| 141 | [The rail and the editor run the file's filter; bad shapes are errors](issues/141-run-the-files-filter.md) | 068, 013, 136, 137, 140 | todo | | |
| 142 | [New here infers the type from a compound `&&` filter](issues/142-new-here-type-from-compound-filter.md) | 141 | todo | | |
| 143 | [Inline blocks choose a view and navigate months](issues/143-inline-block-view-and-month-nav.md) | 067, 138 | todo | | |
| 144 | [A `.view` checker for agents](issues/144-view-checker-for-agents.md) | 010 | todo | | |
| 145 | [Opt-in local usage counters: storage, IPC and the Settings toggle](issues/145-usage-counts-storage-and-toggle.md) | none | todo | | |
| 146 | [Record usage from the command palette, shortcuts, rail and Settings](issues/146-usage-recorder-and-seams.md) | 145 | todo | | |
| 147 | [The Usage stats page shows what I use most and what I never use](issues/147-usage-stats-view.md) | 145, 146 | todo | | |
| 148 | [Usage stats count which kinds of files I open and Quick Capture saves](issues/148-usage-count-file-opens-by-type.md) | 146 | todo | | |
| 149 | [Usage stats count table and meta-bind interactions inside notes](issues/149-usage-count-tables-and-meta-bind.md) | 148 | todo | | |
| 150 | [`ctx.http.fetch`, with an MCP Streamable HTTP example mod](issues/150-ctx-http-and-mcp-example.md) | none | todo | | |
| 151 | [Kanban date proximity has one token-based map, and done cards drop it](issues/151-kanban-date-proximity-has-one-token-based.md) | none | done | issue/151-kanban-date-proximity-has-one-token-based (07ec74a68) | 2026-11-12 |
| 152 | [A tag may start with a digit and may carry emoji, as in Obsidian](issues/152-tag-may-start-digit-may-carry-emoji.md) | 040, 151, 048 | todo | | |
| 153 | [The tab strip shows overflow and hides the .md extension](issues/153-tab-strip-shows-overflow-hides-md-extension.md) | none | todo | | |
| 154 | [Inline title: show the file name as an editable title above the note](issues/154-inline-title.md) | none | todo | | |
| 155 | [Leaving the theme editor any way other than Save puts the active theme back on the app](issues/155-leaving-theme-editor-any-way-other-than.md) | none | todo | | |
| 156 | [The relationship picker navigates with arrow keys](issues/156-relationship-picker-navigates-arrow-keys.md) | none | todo | | |
| 157 | [Settings > Update keeps the download progress and Restart to update across closing Settings or changing section, and a second check cannot start a second download](issues/157-settings-update-keeps-download-progress-restart-update.md) | none | todo | | |
| 158 | [An image embed with a WIDTHxHEIGHT size (300x200) applies both the width and the height](issues/158-image-png-300x200-applies-both-width-height.md) | none | todo | | |
| 159 | [The Tags view keeps its list and expanded tags on screen while it refreshes](issues/159-tags-view-keeps-list-expanded-tags-screen.md) | none | todo | | |
| 160 | [A tag click lists the notes with that tag even when Semantic or Hybrid was the selected search mode](issues/160-tag-click-lists-notes-that-tag-even.md) | none | todo | | |
| 161 | [Fuzzy search finds a close spelling wherever it sits in the vocabulary, not only among the first 500 words with the same first letter](issues/161-fuzzy-search-finds-close-spelling-wherever-sits.md) | none | todo | | |
| 162 | [file.inlinks lists the notes that link to a note whose name contains a dot](issues/162-file-inlinks-lists-notes-that-link-note.md) | none | todo | | |
| 163 | [Vault open creates every missing placeholder template, including the parent folders periodic-note/ and quick-capture/](issues/163-vault-open-creates-every-missing-placeholder-template.md) | none | todo | | |
| 164 | [Quick Switcher Create with a folder path (Projects/Idea) creates the note in that folder, and a failed create says why](issues/164-quick-switcher-create-folder-path-projects-idea.md) | none | todo | | |
| 165 | [Dragging a node in the graph moves that node; dragging the background pans](issues/165-dragging-node-graph-moves-that-node-dragging.md) | none | todo | | |
| 166 | [Switching the graph Arrows toggle redraws the graph at once, also after the layout has settled](issues/166-switching-graph-arrows-toggle-redraws-graph-once.md) | none | todo | | |
| 167 | [Pasting an HTML table keeps the links in its cells](issues/167-pasting-html-table-keeps-links-cells.md) | 055 | todo | | |
| 168 | [A block embed `![[Note#^id]]` shows only the line whose trailing block ID is `id`](issues/168-block-embed-finds-only-its-own-trailing.md) | none | todo | | |
| 169 | [File icons read frontmatter only through Rust](issues/169-file-icons-read-frontmatter-only-through-rust.md) | none | todo | | |
| 170 | [File icon saves that cannot happen tell the user, and clicking the current icon writes nothing](issues/170-file-icon-saves-that-cannot-happen-tell.md) | 169 | todo | | |
| 171 | [`$$` block math right under a paragraph or callout line renders as math](issues/171-live-preview-render-gaps-are-decided-one.md) | none | todo | | |
| 172 | [Bump @sentry/browser](issues/172-sentry-sdk-bumps.md) | none | todo | | |
| 173 | [Mac serves the app](issues/173-mac-serves-the-app.md) | none | todo | | |
| 174 | [Browser shows the vault tree](issues/174-browser-shows-the-vault-tree.md) | 173 | todo | | |
| 175 | [Paths stay inside the vault](issues/175-paths-stay-inside-the-vault.md) | 174 | todo | | |
| 176 | [Reach it from iPad and iPhone over the tailnet](issues/176-reach-it-from-ipad-and-iphone.md) | 175 | todo | | |
| 177 | [Open and read a note](issues/177-open-and-read-a-note.md) | 174 | todo | | |
| 178 | [Images and embeds load](issues/178-images-and-embeds-load.md) | 175, 177 | todo | | |
| 179 | [Mac changes show up in the browser](issues/179-mac-changes-show-up-in-the-browser.md) | 177 | todo | | |
| 180 | [Edit and save from the browser](issues/180-edit-and-save-from-the-browser.md) | 175, 179 | todo | | |
| 181 | [Browser activity shows up in the Mac log](issues/181-browser-activity-in-the-mac-log.md) | none | todo | | |
| 182 | [The browser warns before closing with unsaved edits, stops refused calls and Sentry, and explains a 403](issues/182-browser-warns-before-closing-and-stops-boot-noise.md) | none | todo | | |
| 183 | [Vault, search, history and files command logic lives in domain modules outside commands/](issues/183-vault-search-history-files-command-logic-lives.md) | none | todo | | |
| 184 | [A Cargo workspace with a kokobrain-core crate exists](issues/184-cargo-workspace-kokobrain-core-crate-exists.md) | 183 | todo | | |
| 185 | [Core tests live in the core crate, with no re-export shim](issues/185-core-tests-live-core-crate-no-re.md) | 184 | todo | | |
| 186 | [The editor engine lives in packages/editor](issues/186-editor-engine-lives-packages-editor.md) | none | todo | | |
| 187 | [Release builds upload JS source maps so Sentry stack traces are readable](issues/187-js-source-maps-for-sentry.md) | 033, 172 | todo | | |
| 188 | [A repeating error does not burn the Sentry quota](issues/188-sentry-repeated-error-volume.md) | 034 | todo | | |
| 189 | [Rust panics in Sentry show function names (deferred)](issues/189-rust-panic-symbolication.md) | 187, 035 | todo | | |
| 190 | [Spike: can the app run `claude -p` jobs?](issues/190-spike-claude-cli-from-app.md) | none | todo | | |
| 191 | [Rust agent runner (`mods_run_agent`)](issues/191-agent-runs.md) | none | todo | | |
| 192 | [`ctx.agents.run` and the agent setting in Labs](issues/192-ctx-agents-run.md) | 191 | todo | | |
| 193 | [Example mod: idea to PRD and Issues](issues/193-example-idea-to-prd-mod.md) | 192 | todo | | |
| 194 | [The Default theme drops its Catppuccin preview overrides](issues/194-default-theme-drops-catppuccin-preview-overrides.md) | none | todo | | |
| 195 | [Canvas nodes, edges and grid draw from theme tokens, so they show on light themes](issues/195-canvas-nodes-edges-grid-draw-from-theme.md) | none | todo | | |
| 196 | [Canvas menus, pickers and edge labels use theme tokens](issues/196-canvas-menus-pickers-edge-labels-use-theme.md) | 195 | todo | | |
| 197 | [Kanban cards drop the empty date row until hover or focus, and the date trigger stays keyboard reachable](issues/197-kanban-cards-drop-empty-date-row-until.md) | 151 | todo | | |
| 198 | [Status colors use theme tokens, and a test forbids raw palette classes](issues/198-status-colors-use-theme-tokens-test-forbids.md) | 151 | done | issue/198-status-colors-use-theme-tokens-test-forbids (1198d8e7b) | 2026-11-12 |
| 199 | [Opening Settings moves focus into the drawer, and closing returns it](issues/199-opening-settings-moves-focus-into-drawer-closing.md) | none | todo | | |
| 200 | [Settings is modal: a scrim closes it on outside click and Tab stays inside](issues/200-settings-modal-scrim-closes-outside-click-tab.md) | 199 | todo | | |
| 201 | [Retention days and Debounce delay accept typed values and clamp on commit](issues/201-retention-days-debounce-delay-accept-typed-values.md) | none | todo | | |
| 202 | [Help text that belongs to a settings row sits inside that row through a SettingItem hint prop](issues/202-help-text-that-belongs-settings-row-sits.md) | none | todo | | |
| 203 | [Settings groups render as cards with dividers](issues/203-settings-groups-render-cards-dividers.md) | none | todo | | |
| 204 | [EmptyState, InlineAlert and Badge primitives exist](issues/204-emptystate-inlinealert-badge-primitives-exist.md) | none | todo | | |
| 205 | [Sidebar panels and settings use the empty and error primitives](issues/205-sidebar-panels-settings-use-empty-error-primitives.md) | 204 | todo | | |
| 206 | [Graph, collection and kanban views show real empty and error states](issues/206-graph-collection-kanban-views-show-real-empty.md) | 087, 204 | todo | | |
| 207 | [Chrome icon buttons share sizes and use shadcn tooltips](issues/207-chrome-icon-buttons-share-sizes-use-shadcn.md) | none | todo | | |
| 208 | [Graph controls and the event dialog use shadcn Select, Switch and Checkbox](issues/208-graph-controls-event-dialog-use-shadcn-select.md) | none | todo | | |
| 209 | [Search results and link rows reserve a gutter for their hover actions](issues/209-search-results-link-rows-reserve-gutter-their.md) | none | todo | | |
| 210 | [NoteInfo and the Relationships heading follow the right sidebar section recipe](issues/210-noteinfo-relationships-heading-follow-sidebar-section.md) | none | todo | | |
| 211 | [Editor tables use the full content width, with hover controls overlaid and the gap below the table kept](issues/211-editor-tables-use-full-content-width-hover.md) | none | todo | | |
| 212 | [The Tags view explains when the rare-tag filter hides everything](issues/212-tags-view-explains-when-rare-tag-filter.md) | none | todo | | |
| 213 | [Word count and graph stats read correctly for zero and one](issues/213-word-count-graph-stats-read-correctly-zero.md) | none | todo | | |
| 214 | [Hovering the open note keeps its fill, and the kanban lane grip appears on lane hover](issues/214-hovering-open-note-keeps-fill-kanban-lane.md) | none | todo | | |
| 215 | [The collection table reads as a table](issues/215-collection-table-reads-table.md) | none | todo | | |
| 216 | [Collection table headers read as names and stay visible while the table scrolls](issues/216-collection-table-headers-read-names-stay-visible.md) | 215 | todo | | |
| 217 | [The New event dialog shows "Enter a title." only after the title was touched](issues/217-new-event-dialog-shows-enter-title-only.md) | none | todo | | |
| 218 | [The command palette shows dense one-line rows with key hints](issues/218-command-palette-shows-dense-one-line-rows.md) | none | todo | | |
| 219 | [A click in the audio player wrapper's padding moves the cursor like a click next to the widget](issues/219-click-audio-player-wrapper-s-padding-moves.md) | none | todo | | |
| 220 | [The Search panel stops repeating the index status the status bar already shows](issues/220-search-panel-stops-repeating-index-status-status.md) | none | todo | | |
| 221 | [Every language the code-block dropdown and the guide offer is syntax-highlighted](issues/221-every-language-code-block-dropdown-guide-offer.md) | none | todo | | |
| 222 | [PowerShell, Dockerfile, Elixir, Haskell and Scala code blocks are syntax-highlighted](issues/222-powershell-dockerfile-elixir-haskell-scala-code-blocks.md) | 221 | todo | | |
| 223 | [The Markdown guide's Quick Reference shows block math in the three-line $$ form the editor renders](issues/223-markdown-guide-s-quick-reference-shows-block.md) | none | todo | | |
| 224 | [The auto-move example's steps move the notes as written: edit then save, the right default delay, rules loaded after copying the file](issues/224-auto-move-example-s-steps-move-notes.md) | none | todo | | |
| 225 | [The personal-week kanban example uses the valid sortMode "checked", and the docs say the sort is per board](issues/225-personal-week-kanban-example-uses-valid-sortmode.md) | none | todo | | |
| 226 | [The Periodic Notes help shows format examples that escape literal words with [ ]](issues/226-periodic-notes-help-shows-format-examples-that.md) | none | todo | | |
| 228 | [Help docs speak of views, and their examples work](issues/228-help-docs-speak-of-views.md) | 067, 142 | todo | | |
| 229 | [Say plainly that the Todoist token lives in the vault](issues/229-todoist-token-out-of-vault.md) | none | done | issue/229-todoist-token-out-of-vault (8ab6672fa) | 2026-11-09 |
| 230 | [Linear-calendar bars line up with their day columns](issues/230-linear-calendar-bar-geometry.md) | none | todo | | |
| 231 | [Separate verbose renderer diagnostics from ordinary file logs](issues/231-opt-in-renderer-diagnostics.md) | none | todo | | |
| 232 | [Future: icon colors customizable in Settings > Appearance](issues/232-future-custom-icon-colors.md) | none | todo | | |
| 233 | [An Auto Organize move into a folder that already has the name lands the note as `<name> 2`](issues/233-auto-organize-move-collision-numbers-the-note.md) | none | todo | | |
| 249 | [Rendered table cells show highlight, underscore emphasis and bold italic](issues/249-table-cells-render-highlight-underscore-emphasis-bold-italic.md) | 062 | todo | | |
| 250 | [Views say how many notes their filter could not evaluate](issues/250-views-count-notes-filter-could-not-evaluate.md) | 010 | todo | | |
| 251 | [The code-block language switch keeps the rest of the fence info string](issues/251-code-block-language-switch-keeps-info-string.md) | none | todo | | |
| 252 | [TSV paste leaves code, frontmatter and tab-indented lines alone](issues/252-tsv-paste-leaves-code-and-indented-lines.md) | none | todo | | |
| 253 | [Canvas image nodes added in the app store vault-relative paths, and image nodes resolve both absolute and vault-relative ones](issues/253-canvas-image-nodes-store-vault-relative-paths.md) | 038 | todo | | |

## Log

- 2026-11-08 18:43 — ledger created (232 Issues)
- 2026-11-09 15:47 — 021 — start — launched by /relay-lite:run — 5395b50e9
- 2026-11-09 16:08 — 021 — deliver — round 1 APPROVED by claude, fix round (line-zero stale test, update_result doc comment + regenerated ToggleTaskResult.ts), round 2 APPROVED by claude with no findings; full suite passed (vitest 583 files, 14195 tests; cargo 39 binaries) — fc8741157
- 2026-11-09 21:08 — 114 — start — launched by /relay-lite:run — cacfb7f7c
- 2026-11-09 21:18 — 114 — deliver — round 1 APPROVED by claude with one minor (no test of consumer-before-invalidation order), fixed with a probe test; round 2 APPROVED by claude with no findings; full suite passed (585 files, 14296 tests) — 108a60047
- 2026-11-09 21:47 — 229 — start — launched by /relay-lite:run — ca684abbe
- 2026-11-09 21:54 — 229 — deliver — round 1 APPROVED by claude, two optional nits rejected with reasons (ADR cross-reference kept, settings table fact out of scope); full suite passed (591 files, 14373 tests) — 8ab6672fa
- 2026-11-10 04:50 — ledger updated (title of 006, 006, 031, 129; link of 006, 006; blocked by of 006, 006, 129)
- 2026-11-10 04:50 — ledger updated (title of 006, 006; link of 006, 006; blocked by of 006, 006, 073, 127, 128, 130; wontfix 072, 073, 127, 128, 130)
- 2026-11-10 19:20 — 001 — start — launched by /relay-lite:run — bb259e72c
- 2026-11-10 19:29 — 001 — deliver — review APPROVED round 1 (claude), no fix round; full suite 606 files / 14900 tests passed; squash merged and pushed — 13291dfa0
- 2026-11-11 11:59 — ledger updated (added 233; title of 006, 006; link of 006, 006; blocked by of 006, 006, 082)
- 2026-11-12 02:54 — ledger updated (added 234, 235, 236, 237, 238, 239, 240, 241; title of 006, 006, 108, 109, 111, 112, 113, 122; link of 006, 006; blocked by of 006, 006, 109, 110, 111, 112, 113, 115, 120, 122; wontfix 227)
- 2026-11-12 07:38 — ledger updated (added 242, 243; title of 006, 006, 108, 110, 234, 239; link of 006, 006; blocked by of 006, 006, 109, 110, 115, 120, 129, 198, 235, 236, 237; wontfix 120, 235, 237)
- 2026-11-12 10:08 — ledger updated (added 244, 245, 246, 247; title of 006, 006, 115, 116, 122, 123, 124; link of 006, 006; blocked by of 006, 006, 074, 115, 116, 117, 121, 122, 123, 125, 126, 129, 243)
- 2026-11-12 10:09 — ledger updated (moved to tasks-view-ux: 074, 075, 108, 109, 110, 111, 112, 113, 115, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125, 126, 129, 227, 234, 235, 236, 237, 238, 239, 240, 241, 242, 243, 244, 245, 246, 247)
- 2026-11-12 10:09 — ledger updated (title of 006, 006; link of 006, 006; blocked by of 006, 006, 198)
- 2026-11-12 10:15 — 030 — start — launched by /relay-lite:run — dee42c0bf
- 2026-11-12 10:30 — 030 — deliver — round 1 CHANGES_REQUESTED by claude (fix: Tailwind no longer scans .scratch, which broke pnpm build; JSDoc note; one minor rejected), round 2 APPROVED by claude; full suite 614 files / 15574 tests passed; squash merged and pushed — 721ef3a5c
- 2026-11-12 11:54 — 151 — start — launched by /relay-lite:run (unblocks 198) — c8431c668
- 2026-11-12 12:04 — 151 — deliver — round 1 APPROVED by claude with no findings, no fix round; full suite 618 files / 15766 tests passed; squash merged and pushed — 07ec74a68
- 2026-11-12 12:04 — 198 — start — launched by /relay-lite:run (151 done, tasks-view-ux 236 done) — 0e4af6695
- 2026-11-12 12:14 — 198 — deliver — round 1 APPROVED by claude (fix round: palette test asserts the ui exclusion; diff contrast deferred to the owner's by-eye check), deliver re-review APPROVED by claude; full suite 618 files / 15771 tests passed; colors not checked by eye; squash merged and pushed — 1198d8e7b
- 2026-11-12 14:57 — ledger updated (added 249, 250, 251, 252, 253; title of 004, 006, 006, 010, 039, 043, 061, 062, 070; link of 006, 006; blocked by of 004, 006, 006, 012, 015, 039, 043, 047, 068, 131)
- 2026-11-12 15:07 — 015 — start — launched by /relay-lite:run (bug queue rank 1) — f79da7588
- 2026-11-12 15:10 — 062 — start — launched by /relay-lite:run (bug queue rank 2, part a) — ac7582dbe
- 2026-11-12 15:18 — 015 — deliver — round 1 APPROVED by claude with a fix round (e2e comment), deliver re-review APPROVED by claude; full suite 623 files / 16061 tests passed; targeted e2e 12 passed, tabs.spec.ts:42 fails the same on main; squash merged and pushed — da26b0dcd
