# Ledger: audit-2026-11-05

This file is the source of truth for the progress of the audit-2026-11-05 Issues. Read it before working on any of them. **Update it every time something is done**: the row status, the Branch / PR column, and one line in the Log.

## Continue

```text
/relay-lite:run audit-2026-11-05
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

**Branch / PR**: in `merge` delivery `issue/NN-slug (<short sha>)`, the branch HEAD before deliver's ledger commit (after any rebase), never the final `base` HEAD (it names a commit of the branch, which never reaches the remote and which the body of the Issue's squash commit lists); in `pr` delivery the PR URL while `in-review`, then `<PR URL> (<short merge sha>)` once `/relay-lite:run` finds it merged; cleared when it finds the PR closed and sets the row back to `todo` (the URL stays in the `pr closed` Log line). **Merged**: always a date (YYYY-MM-DD); in `merge` delivery the date deliver wrote the row, before the squash commit; in `pr` delivery the date `/relay-lite:run` recorded the merge. Both cells stay empty on a row `/relay-lite:ledger` created as `done` from an Issue file already `Status: resolved`.

| # | Issue | Blocked by | Status | Branch / PR | Merged |
|---|---|---|---|---|---|
| 01 | [The caret and selection follow their text when a frontmatter toggle, property edit, link rewrite or external reload rewrites the open note](issues/01-caret-selection-follow-their-text-when-frontmatter.md) | none | todo | | |
| 02 | [Keyboard edits next to the hidden frontmatter never change its fences](issues/02-keyboard-edits-next-hidden-frontmatter-never-change.md) | none | todo | | |
| 03 | [Quick Capture writes page titles, app ids and URLs into template frontmatter as valid YAML](issues/03-quick-capture-writes-page-titles-app-ids.md) | none | todo | | |
| 04 | [Closing the main window never leaves a windowless app: Quick Capture, deep links and a Dock click keep working](issues/04-closing-main-window-never-leaves-windowless-app.md) | none | todo | | |
| 05 | [Live-preview controls change only the text the user asked to change: fence attributes, task markers and tab-indented pastes stay intact](issues/05-live-preview-controls-change-only-text-user.md) | none | todo | | |
| 06 | [A canvas edit closed or renamed inside the debounce window reaches its .canvas file](issues/06-canvas-edit-closed-renamed-inside-debounce-window.md) | none | todo | | |
| 07 | [An empty --- --- frontmatter block is matched, and writers never stack a second block](issues/07-empty-frontmatter-block-matched-writers-never-stack.md) | none | todo | | |
| 08 | [File History keeps a snapshot of the pre-save bytes, and retention never deletes a note's last snapshot](issues/08-file-history-keeps-snapshot-pre-save-bytes.md) | none | todo | | |
| 09 | [A kanban card or lane title being edited is saved into its own board when the tab changes, and never into another tab](issues/09-kanban-card-lane-title-being-edited-saved.md) | 06 | todo | | |
| 10 | [Images in notes display for a vault under ~/kokobrain-vaults: the asset-protocol scope adds that root and keeps the folders the README documents](issues/10-images-notes-display-vault-under-kokobrain-vaults.md) | none | todo | | |
| 11 | [Rendered table cells show links, highlight, underscore emphasis, line breaks and escaped pipes as formatted content](issues/11-rendered-table-cells-show-links-highlight-underscore.md) | none | todo | | |
| 12 | [Backlinks and Outgoing links always show the open note's own links, also after returning to a note seen at the same index version](issues/12-backlinks-outgoing-links-always-show-open-note.md) | none | todo | | |
| 13 | [Closing a tab with unsaved text saves it and closes; a prompt appears only when that save fails](issues/13-closing-tab-unsaved-text-saves-closes-prompt.md) | none | todo | | |
| 14 | [Canvas image nodes load their image: the main capability grants fs:allow-read-file on the vault roots](issues/14-canvas-image-nodes-load-their-image-main.md) | none | todo | | |
| 15 | [Canvas file and image nodes store vault-relative paths and resolve both absolute and vault-relative ones](issues/15-canvas-file-image-nodes-store-vault-relative.md) | none | todo | | |
| 16 | [Kanban drag-and-drop puts a card or lane exactly where the drop indicator shows](issues/16-kanban-drag-drop-puts-card-lane-exactly.md) | none | todo | | |
| 17 | [DataArray sort and sortBy keep the items that have the key in order and group the items without it at one end](issues/17-dataarray-sort-sortby-keep-items-that-have.md) | none | todo | | |
| 18 | [Standard markdown images with a vault-relative path load from the vault](issues/18-standard-markdown-images-vault-relative-path-load.md) | 10 | todo | | |
| 19 | [Wikilink autocomplete inserts a non-markdown file with its extension, so ![[photo.png]] embeds the image](issues/19-wikilink-autocomplete-inserts-non-markdown-file-extension.md) | none | todo | | |
| 20 | [Enter in the quick switcher creates the note when nothing matches](issues/20-enter-quick-switcher-creates-note-when-nothing.md) | none | todo | | |
| 21 | [Lens lists follow the user's own rename, move, delete, duplicate and create at once, not after the 2 to 10 s index throttle](issues/21-lens-lists-follow-user-s-own-rename.md) | none | todo | | |
| 22 | [A note-list inline rename that the file name rules refuse says why, like the folder rename does](issues/22-note-list-inline-rename-that-file-name.md) | none | todo | | |
| 23 | [File History follows a note through rename, move, auto-move and suffixed restore](issues/23-file-history-follows-note-through-rename-move.md) | none | todo | | |
| 24 | [A text search shows only its own results: a query with no hits says No results found, even right after a tag click](issues/24-text-search-shows-only-own-results-query.md) | none | todo | | |
| 25 | [Text search with tag: or path: returns every note that matches the words and the operators, and tag: matches nested tags](issues/25-text-search-tag-path-returns-every-note.md) | none | todo | | |
| 26 | [Outgoing links marks a row as broken only when its target is missing: same-note heading links and embeds of existing files are not red](issues/26-outgoing-links-marks-row-broken-only-when.md) | none | todo | | |
| 27 | [Numeric <, <=, > and >= filters never match a note that lacks the property](issues/27-numeric-filters-never-match-note-that-lacks.md) | none | todo | | |
| 28 | [Renaming a kanban lane keeps its card limit, auto-complete and collapsed state](issues/28-renaming-kanban-lane-keeps-card-limit-auto.md) | none | todo | | |
| 29 | [Canvas file nodes preview the note without its YAML frontmatter](issues/29-canvas-file-nodes-preview-note-without-yaml.md) | none | todo | | |
| 30 | [Canvas Duplicate places the copy next to the node's current position and size](issues/30-canvas-duplicate-places-copy-next-node-s.md) | none | todo | | |
| 31 | [Renaming or moving a note updates [[links]] in kanban cards and file nodes in canvases](issues/31-renaming-moving-note-updates-links-kanban-cards.md) | 15 | todo | | |
| 32 | [A QueryJS block run in the seconds after a save shows the saved data once the index catches up, and never keeps a pre-save result](issues/32-queryjs-block-run-seconds-after-save-shows.md) | none | todo | | |
| 33 | [kb.pages('"folder"') returns the notes in that folder and its subfolders only](issues/33-kb-pages-folder-returns-notes-that-folder.md) | none | todo | | |
| 34 | [The Tasks view treats only done and cancelled tasks as completed: [/], [!], [?] and [>] tasks stay listed under Hide completed](issues/34-tasks-view-treats-only-done-cancelled-tasks.md) | none | todo | | |
| 35 | [The Tasks view keeps its list and scroll position on screen while it refreshes after a toggle or an index update](issues/35-tasks-view-keeps-list-scroll-position-screen.md) | none | todo | | |
| 36 | [Auto Move evaluates and moves only Markdown notes: kanban boards, canvases and other files stay where they are](issues/36-auto-move-evaluates-moves-only-markdown-notes.md) | none | todo | | |
| 37 | [Leaving the theme editor any way other than Save puts the active theme back on the app](issues/37-leaving-theme-editor-any-way-other-than.md) | none | todo | | |
| 38 | [The relationship picker navigates with arrow keys](issues/38-relationship-picker-navigates-arrow-keys.md) | none | todo | | |
| 39 | [Settings > Update keeps the download progress and Restart to update across closing Settings or changing section, and a second check cannot start a second download](issues/39-settings-update-keeps-download-progress-restart-update.md) | none | todo | | |
| 40 | [Paste, cut and copy inside a meta-bind number or date input act on the input, not the note](issues/40-paste-cut-copy-inside-meta-bind-number.md) | none | todo | | |
| 41 | [HTML link paste keeps bracketed link text and table cells intact](issues/41-html-link-paste-keeps-bracketed-link-text.md) | none | todo | | |
| 42 | [An image embed with a WIDTHxHEIGHT size (300x200) applies both the width and the height](issues/42-image-png-300x200-applies-both-width-height.md) | none | todo | | |
| 43 | [Cmd+click on a reference link or an email autolink opens its target, and a link with no openable URL is not sent to the opener](issues/43-cmd-click-reference-link-email-autolink-opens.md) | none | todo | | |
| 44 | [Copy Block Link reuses only a real trailing block ID; a line ending in [[Note#^id]] or x^2 gets a new ID](issues/44-copy-block-link-reuses-only-real-trailing.md) | none | todo | | |
| 45 | [Backlinks and Outgoing links show a load error with Retry, not an empty message](issues/45-backlinks-outgoing-links-show-load-error-retry.md) | 12 | todo | | |
| 46 | [Settings > File History > Automatic snapshots takes effect on the next save, with no vault reopen](issues/46-settings-file-history-automatic-snapshots-takes-effect.md) | none | todo | | |
| 47 | [The Tags view keeps its list and expanded tags on screen while it refreshes](issues/47-tags-view-keeps-list-expanded-tags-screen.md) | none | todo | | |
| 48 | [Clearing the search box while a search is still running shows the empty-query hint, not a stuck Searching...](issues/48-clearing-search-box-while-search-still-running.md) | none | todo | | |
| 49 | [A tag click lists the notes with that tag even when Semantic or Hybrid was the selected search mode](issues/49-tag-click-lists-notes-that-tag-even.md) | none | todo | | |
| 50 | [Fuzzy search finds a close spelling wherever it sits in the vocabulary, not only among the first 500 words with the same first letter](issues/50-fuzzy-search-finds-close-spelling-wherever-sits.md) | none | todo | | |
| 51 | [A formula that calls an unknown function cannot be confirmed and shows why](issues/51-formula-that-calls-unknown-function-cannot-confirmed.md) | none | todo | | |
| 52 | [Clearing a canvas node's color or a link node's title is saved to the .canvas file](issues/52-clearing-canvas-node-s-color-link-node.md) | none | todo | | |
| 53 | [file.inlinks lists the notes that link to a note whose name contains a dot](issues/53-file-inlinks-lists-notes-that-link-note.md) | none | todo | | |
| 54 | [Vault open creates every missing placeholder template, including the parent folders periodic-note/ and quick-capture/](issues/54-vault-open-creates-every-missing-placeholder-template.md) | none | todo | | |
| 55 | [Todoist sync tells the user when it could not reach Todoist or the token was rejected](issues/55-todoist-sync-tells-user-when-could-not.md) | none | todo | | |
| 56 | [New File from Template says the name is taken instead of silently opening the existing note](issues/56-new-file-from-template-says-name-taken.md) | none | todo | | |
| 57 | [Quick Switcher Create with a folder path (Projects/Idea) creates the note in that folder, and a failed create says why](issues/57-quick-switcher-create-folder-path-projects-idea.md) | none | todo | | |
| 58 | [Dragging a node in the graph moves that node; dragging the background pans](issues/58-dragging-node-graph-moves-that-node-dragging.md) | none | todo | | |
| 59 | [Switching the graph Arrows toggle redraws the graph at once, also after the layout has settled](issues/59-switching-graph-arrows-toggle-redraws-graph-once.md) | none | todo | | |
| 60 | [Live preview paints no active-line background; source mode keeps it](issues/60-live-preview-paints-no-active-line-background.md) | none | todo | | |
| 61 | [Editor tables use the full content width, with hover controls overlaid and the gap below the table kept](issues/61-editor-tables-use-full-content-width-hover.md) | none | todo | | |
| 62 | [The status bar note count follows notes created, imported and deleted during the session](issues/62-status-bar-note-count-follows-notes-created.md) | none | todo | | |
| 63 | [The Tags view explains when the rare-tag filter hides everything](issues/63-tags-view-explains-when-rare-tag-filter.md) | none | todo | | |
| 64 | [Word count and graph stats read correctly for zero and one](issues/64-word-count-graph-stats-read-correctly-zero.md) | none | todo | | |
| 65 | [Hovering the open note keeps its fill, and the kanban lane grip appears on lane hover](issues/65-hovering-open-note-keeps-fill-kanban-lane.md) | none | todo | | |
| 66 | [The collection table reads as a table](issues/66-collection-table-reads-table.md) | none | todo | | |
| 67 | [The first semantic or hybrid search after a one-file index update does not reload the whole search cache](issues/67-first-semantic-hybrid-search-after-one-file.md) | none | todo | | |
| 68 | [Kanban date proximity has one token-based map, and done cards drop it](issues/68-kanban-date-proximity-has-one-token-based.md) | none | todo | | |
| 69 | [The New event dialog shows "Enter a title." only after the title was touched](issues/69-new-event-dialog-shows-enter-title-only.md) | none | todo | | |
| 70 | [The command palette shows dense one-line rows with key hints](issues/70-command-palette-shows-dense-one-line-rows.md) | none | todo | | |
| 71 | [Opening Settings moves focus into the drawer, and closing returns it](issues/71-opening-settings-moves-focus-into-drawer-closing.md) | none | todo | | |
| 72 | [A click in the audio player wrapper's padding moves the cursor like a click next to the widget](issues/72-click-audio-player-wrapper-s-padding-moves.md) | none | todo | | |
| 73 | [Every language the code-block dropdown and the guide offer is syntax-highlighted](issues/73-every-language-code-block-dropdown-guide-offer.md) | none | todo | | |
| 74 | [The Markdown guide's Quick Reference shows block math in the three-line $$ form the editor renders](issues/74-markdown-guide-s-quick-reference-shows-block.md) | none | todo | | |
| 75 | [The auto-move example's steps move the notes as written: edit then save, the right default delay, rules loaded after copying the file](issues/75-auto-move-example-s-steps-move-notes.md) | none | todo | | |
| 76 | [The personal-week kanban example uses the valid sortMode "checked", and the docs say the sort is per board](issues/76-personal-week-kanban-example-uses-valid-sortmode.md) | none | todo | | |
| 77 | [The Periodic Notes help shows format examples that escape literal words with [ ]](issues/77-periodic-notes-help-shows-format-examples-that.md) | none | todo | | |
| 78 | [The Tasks help says the default view lists only tasks under a #to-list heading, and that the date filter uses the note's modification date](issues/78-tasks-help-says-default-view-lists-only.md) | none | todo | | |
| 79 | [A calendar day with more than three notes lets the user reach every note](issues/79-calendar-day-more-than-three-notes-lets.md) | none | todo | | |
| 80 | [A kb.table, kb.ui.table or kb.list cell holding an array or DataArray of links renders each link as a clickable link](issues/80-kb-table-kb-ui-table-kb-list.md) | none | todo | | |
| 81 | [The Search panel stops repeating the index status the status bar already shows](issues/81-search-panel-stops-repeating-index-status-status.md) | none | todo | | |
| 82 | [Retention days and Debounce delay accept typed values and clamp on commit](issues/82-retention-days-debounce-delay-accept-typed-values.md) | none | todo | | |
| 83 | [Kanban cards drop the empty date row until hover or focus, and the date trigger stays keyboard reachable](issues/83-kanban-cards-drop-empty-date-row-until.md) | 68 | todo | | |
| 84 | [Status colors use theme tokens, and a test forbids raw palette classes](issues/84-status-colors-use-theme-tokens-test-forbids.md) | 68 | todo | | |
| 85 | [Canvas nodes, edges and grid draw from theme tokens, so they show on light themes](issues/85-canvas-nodes-edges-grid-draw-from-theme.md) | none | todo | | |
| 86 | [Canvas menus, pickers and edge labels use theme tokens](issues/86-canvas-menus-pickers-edge-labels-use-theme.md) | 85 | todo | | |
| 87 | [Toasts and the editor's CodeMirror base follow the theme mode](issues/87-toasts-editor-s-codemirror-base-follow-theme.md) | none | todo | | |
| 88 | [The graph view paints with the active theme's colors](issues/88-graph-view-paints-active-theme-s-colors.md) | none | todo | | |
| 89 | [Settings is modal: a scrim closes it on outside click and Tab stays inside](issues/89-settings-modal-scrim-closes-outside-click-tab.md) | 71 | todo | | |
| 90 | [Help text that belongs to a settings row sits inside that row through a SettingItem hint prop](issues/90-help-text-that-belongs-settings-row-sits.md) | none | todo | | |
| 91 | [Graph controls and the event dialog use shadcn Select, Switch and Checkbox](issues/91-graph-controls-event-dialog-use-shadcn-select.md) | none | todo | | |
| 92 | [Search results and link rows reserve a gutter for their hover actions](issues/92-search-results-link-rows-reserve-gutter-their.md) | none | todo | | |
| 93 | [The Default theme drops its Catppuccin preview overrides](issues/93-default-theme-drops-catppuccin-preview-overrides.md) | none | todo | | |
| 94 | [Right sidebar sections share one header recipe and one left edge](issues/94-right-sidebar-sections-share-one-header-recipe.md) | none | todo | | |
| 95 | [Chrome icon buttons share sizes and use shadcn tooltips](issues/95-chrome-icon-buttons-share-sizes-use-shadcn.md) | none | todo | | |
| 96 | [Settings groups render as cards with dividers](issues/96-settings-groups-render-cards-dividers.md) | none | todo | | |
| 97 | [.view toolbar and icon writes keep the file's YAML comments](issues/97-view-toolbar-icon-writes-keep-file-s.md) | none | todo | | |
| 98 | [An external change to an open note is never overwritten by the next autosave or calendar write](issues/98-external-change-open-note-never-overwritten-next.md) | none | todo | | |
| 99 | [A note deleted or renamed outside the app is closed or marked orphaned, never recreated by the next autosave](issues/99-note-deleted-renamed-outside-app-closed-marked.md) | none | todo | | |
| 100 | [A watcher rescan (dropped FSEvents) reloads open tabs before the next save](issues/100-watcher-rescan-dropped-fsevents-reloads-open-tabs.md) | none | todo | | |
| 101 | [An unparseable .canvas opens in an error state and is never overwritten by canvas edits](issues/101-unparseable-canvas-opens-error-state-never-overwritten.md) | none | todo | | |
| 102 | [File History Restore writes the snapshot into the note shown in the dialog, never into whichever tab is active](issues/102-file-history-restore-writes-snapshot-into-note.md) | none | todo | | |
| 103 | [A meta-bind button stops its remaining actions when an open action fails](issues/103-meta-bind-button-stops-remaining-actions-when.md) | none | todo | | |
| 104 | [A meta-bind button's updateMetadata always writes the button's own note, also after an open or createNote action](issues/104-meta-bind-button-s-updatemetadata-always-writes.md) | 103 | todo | | |
| 105 | [Keystrokes typed during link rewrite, type rename or watcher reload writes are kept](issues/105-keystrokes-typed-during-link-rewrite-type-rename.md) | none | todo | | |
| 106 | [Dock Quit, logout and shutdown run the exit flush before the app ends](issues/106-dock-quit-logout-shutdown-run-exit-flush.md) | none | todo | | |
| 107 | [Note writes are atomic: a failed write never leaves the note empty or truncated](issues/107-note-writes-are-atomic-failed-write-never.md) | none | todo | | |
| 108 | [Rename link rewrite skips links inside code blocks and updates self links](issues/108-rename-link-rewrite-skips-links-inside-code.md) | none | todo | | |
| 109 | [Root unarchive writes vault/x.md, auto-move refuses .. segments, and a case or NFC variant of a path reuses the open tab](issues/109-root-unarchive-writes-vault-x-md-auto.md) | none | todo | | |
| 110 | [Deep-link names resolve safely: .md is added unless the name ends in a real extension, name=. stays inside the vault, and overwrite never replaces .kokobrain files](issues/110-deep-link-names-resolve-safely-md-added.md) | none | todo | | |
| 111 | [Deep-link prepend goes below the frontmatter, and non-silent new keeps <% %> in the sent text](issues/111-deep-link-prepend-goes-below-frontmatter-non.md) | none | todo | | |
| 112 | [Duplicate saves the note's unsaved typing before copying it](issues/112-duplicate-saves-note-s-unsaved-typing-before.md) | none | todo | | |
| 113 | [Duplicate never overwrites a sibling whose name differs only in case (APFS)](issues/113-duplicate-never-overwrites-sibling-whose-name-differs.md) | none | todo | | |
| 114 | [An unreadable or corrupt trash manifest is backed up, never replaced by a partial list, and trash writers never orphan trashed items](issues/114-unreadable-corrupt-trash-manifest-backed-up-never.md) | none | todo | | |
| 115 | [A session whose settings.json was never loaded never writes it and never purges File History at the default retention](issues/115-session-whose-settings-json-was-never-loaded.md) | none | todo | | |
| 116 | [Auto-move rules and the Todoist sent list: a failed load is never saved over the file](issues/116-auto-move-rules-todoist-sent-list-failed.md) | 115 | todo | | |
| 117 | [An Auto Move rule edit made just before Settings closes or changes section is still written to auto-move-rules.json](issues/117-auto-move-rule-edit-made-just-before.md) | 116 | todo | | |
| 118 | [Type rename reports partial failure and also updates _type values with a trailing comment](issues/118-type-rename-reports-partial-failure-also-updates.md) | none | todo | | |
| 119 | [Non-UTF-8 files open read-only or as binary, never written back with U+FFFD](issues/119-non-utf-8-files-open-read-only.md) | none | todo | | |
| 120 | [CRLF notes keep their CRLF line endings after an edit](issues/120-crlf-notes-keep-their-crlf-line-endings.md) | none | todo | | |
| 121 | [Minor write races are closed: autosave during rename, retry-chain stacking, create vs restore, superseded init, calendar rollback, the properties skip flag](issues/121-minor-write-races-are-closed-autosave-during.md) | none | todo | | |
| 122 | [A stale Tasks list never ticks the wrong task line on a clean tab or after an external edit](issues/122-stale-tasks-list-never-ticks-wrong-task.md) | none | todo | | |
| 123 | [Kanban lane actions never turn a raw --- into the archive separator, and restore to a missing lane keeps the card](issues/123-kanban-lane-actions-never-turn-raw-into.md) | none | todo | | |
| 124 | [Watcher events keep FTS5, semantic and Rust indexes current, and a read error is not treated as a delete](issues/124-watcher-events-keep-fts5-semantic-rust-indexes.md) | none | todo | | |
| 125 | [A semantic update still embedding when its note is deleted leaves no chunks for the trashed note](issues/125-semantic-update-still-embedding-when-note-deleted.md) | none | todo | | |
| 126 | [A failure after the disk op still reports a completed rename as done and re-keys the index](issues/126-failure-after-disk-op-still-reports-completed.md) | none | todo | | |
| 127 | [A note with an unquoted wikilink value (up: [[Home]]) accepts property, lifecycle, icon and meta-bind writes](issues/127-note-unquoted-wikilink-value-up-home-accepts.md) | none | todo | | |
| 128 | [A failed Auto Move tells the user which note did not move and why](issues/128-failed-auto-move-tells-user-which-note.md) | none | todo | | |
| 129 | [A vault picked outside the two allowed folders is refused or warned about, never half-working](issues/129-vault-picked-outside-two-allowed-folders-refused.md) | none | todo | | |
| 130 | [The quick-capture dedupe anchor advances only after the frontend accepts the capture](issues/130-quick-capture-dedupe-anchor-advances-only-after.md) | none | todo | | |
| 131 | [A note whose live-preview widget throws on every render stays editable and in sync with its tab](issues/131-note-whose-live-preview-widget-throws-every.md) | none | todo | | |
| 132 | [Collection link() cells never navigate the app webview and drop unsafe schemes](issues/132-collection-link-cells-never-navigate-app-webview.md) | none | todo | | |
| 133 | [QueryJS blocks written by a deep link or capture do not auto-run until the user trusts them](issues/133-queryjs-blocks-written-deep-link-capture-do.md) | none | todo | | |
| 134 | [read_files_batch only reads inside the vault that is actually open](issues/134-read-files-batch-only-reads-inside-vault.md) | none | todo | | |
| 135 | [Note-writing commands refuse paths outside the open vault](issues/135-note-writing-commands-refuse-paths-outside-open.md) | 134 | todo | | |
| 136 | [Vault-root commands (scan, index builds, watcher, model init) only accept the open vault](issues/136-vault-root-commands-scan-index-builds-watcher.md) | 135 | todo | | |
| 137 | [File icons read frontmatter only through Rust](issues/137-file-icons-read-frontmatter-only-through-rust.md) | none | todo | | |
| 138 | [File icon saves that cannot happen tell the user, and clicking the current icon writes nothing](issues/138-file-icon-saves-that-cannot-happen-tell.md) | 137 | todo | | |
| 139 | [QueryJS pager clicks keep the widget rendered; wikilinks in inline code and media tags in code render as text](issues/139-queryjs-pager-clicks-keep-widget-rendered-wikilinks.md) | none | todo | | |
| 140 | [Live-preview render gaps are decided one by one: meta-bind options with ], math right under a paragraph or callout, and the others listed](issues/140-live-preview-render-gaps-are-decided-one.md) | none | todo | | |
| 141 | [The local graph center follows every way the graph tab gets focus, and hints when the center note is gone](issues/141-local-graph-center-follows-every-way-graph.md) | none | todo | | |
| 142 | [A tag may start with a digit and may carry emoji, as in Obsidian](issues/142-tag-may-start-digit-may-carry-emoji.md) | none | todo | | |
| 143 | [Typing # in the editor suggests the vault's existing tags](issues/143-typing-editor-suggests-vault-s-existing-tags.md) | none | todo | | |
| 144 | [The tab strip shows overflow and hides the .md extension](issues/144-tab-strip-shows-overflow-hides-md-extension.md) | none | todo | | |
| 145 | [EmptyState, InlineAlert and Badge primitives exist](issues/145-emptystate-inlinealert-badge-primitives-exist.md) | none | todo | | |
| 146 | [Sidebar panels and settings use the empty and error primitives](issues/146-sidebar-panels-settings-use-empty-error-primitives.md) | 145 | todo | | |
| 147 | [Graph, collection and kanban views show real empty and error states](issues/147-graph-collection-kanban-views-show-real-empty.md) | 145 | todo | | |
| 148 | [Vault, search, history and files command logic lives in domain modules outside commands/](issues/148-vault-search-history-files-command-logic-lives.md) | none | todo | | |
| 149 | [A Cargo workspace with a kokobrain-core crate exists](issues/149-cargo-workspace-kokobrain-core-crate-exists.md) | 148 | todo | | |
| 150 | [Core tests live in the core crate, with no re-export shim](issues/150-core-tests-live-core-crate-no-re.md) | 149 | todo | | |
| 151 | [The editor engine lives in packages/editor](issues/151-editor-engine-lives-packages-editor.md) | none | todo | | |

## Leftovers

## Log

- 2026-11-06 00:31 — ledger created (151 Issues)
