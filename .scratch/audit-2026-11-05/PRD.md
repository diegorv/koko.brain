# Pre-use audit (2026-11-05)

The owner is about to rely on Kokobrain for real. This audit read the whole app by domain, looked for defects a daily user would hit, re-checked every Issue that was still open in `.scratch/`, and folds both into one plan ordered by impact: written content first, then daily use and UI correctness, then polish, corner cases and later work.

## How it was done

- Twelve domains, in three waves, each read from the code, the help pages, the docs and the examples: editor and save pipeline, live preview, file system (Rust side and its frontend integration), UI reactivity, frontmatter and meta-bind, index and search, views and rail, kanban and canvas, calendar and tasks, QueryJS, app shell and settings.
- Per domain: haiku scouts mapped flows, writes, documented promises, example constructs and recent fixes; sonnet hunters looked through two to four lenses (content, UX, spec conformance, lifecycle, reactivity, Rust and IPC); one opus verifier per domain tried to refute every finding and re-checked the open Issues of that domain. Then two opus agents gave a second opinion on the 41 high-impact findings, one opus built the order and one opus reviewed it.
- About 83 haiku, 38 sonnet and 20 opus agents. Everything is from reading code at `5f8003d67`; nothing was run. Line numbers drift: each Issue starts with a failing test, and a failing test that does not fail is a finding to report, not something to patch around.
- Owner priorities applied: editor, live preview, reactivity and file system first; improbable or theoretical corner cases last.
- Owner decisions honored: one vault per session (no vault switching mid-session); a case-only rename being refused is wontfix; overlays keep their motion under reduced motion; a rename need not recompute an open tab's file type.
- The raw results (per-domain findings, refutations, verdicts, the plan and its review) are in `raw/`.

## Owner decisions (2026-11-06)

The owner answered every open decision in a survey on 2026-11-06. Each Issue records its answer as **Owner decision (2026-11-06)**; the answers are also in `raw/owner-answers.json`.

- Now ready-for-agent: 04, 08, 11, 13, 68, 70, 81, 83, 88, 89, 98, 118, 127, 129, 131, 139, 140, 142, 143.
- Still needs-info, deferred by the owner: 148 to 150 (and 161 waits for a naming decision; 121 and 157 need criteria) (architecture work that waits for a second consumer of the code). 141 and 151 moved to the first wave later that day.
- Closed: 34, 35, 55 and 122 (covered by the tasks-view Issues 02, 04, 06 and 20), 67 (the one search-cache reload is accepted) and 133 (the existing autoRunQueries manual setting is used; no code).
- To do by the owner in the app: set Settings > QueryJS auto-run to manual (Issue 133).

## First wave (2026-11-06)

The owner picked the first wave in a survey on 2026-11-06, then revised it after six opus reviewers challenged it (`raw/first-wave-challenge.json`). 83 Issues are in it; each says **First wave:** yes under its Status, and the ones the owner narrowed carry a **Scope (owner, 2026-11-06)** line. Run them in number order with explicit numbers (`/relay-lite:run audit-2026-11-05 NN ...`).

- Added after the challenge: 01, 27, 28 (after 123), 101 (after 06), 152 (split from 121). Issue 24 was merged into 25.
- Moved out after the challenge: 62, 95, 96, 106, 135, 136, 151.
- Narrowed to their cheap part, the rest split into later Issues: 07 (rest in 156), 08 (154), 31 (155), 41 (158), 66 (161), 73 (159), 98 (153), 102 (160), 124 (157), 126 (162). 26 became frontend only after 12; 142 waits for the kanban Issues 16, 68 and 123, and 143 no longer waits for 142.

- [01](issues/01-caret-selection-follow-their-text-when-frontmatter.md) The caret and selection follow their text when a frontmatter toggle, property edit, link rewrite or external reload rewrites the open note
- [02](issues/02-keyboard-edits-next-hidden-frontmatter-never-change.md) Keyboard edits next to the hidden frontmatter never change its fences
- [03](issues/03-quick-capture-writes-page-titles-app-ids.md) Quick Capture writes page titles, app ids and URLs into template frontmatter as valid YAML
- [04](issues/04-closing-main-window-never-leaves-windowless-app.md) Closing the main window never leaves a windowless app: Quick Capture, deep links and a Dock click keep working
- [06](issues/06-canvas-edit-closed-renamed-inside-debounce-window.md) A canvas edit closed or renamed inside the debounce window reaches its .canvas file
- [07](issues/07-empty-frontmatter-block-matched-writers-never-stack.md) Setting a folder icon never stacks a second frontmatter block (narrowed)
- [08](issues/08-file-history-keeps-snapshot-pre-save-bytes.md) File History keeps a snapshot of the pre-save bytes, and retention never deletes a note's last snapshot (narrowed)
- [09](issues/09-kanban-card-lane-title-being-edited-saved.md) A kanban card or lane title being edited is saved into its own board when the tab changes, and never into another tab
- [10](issues/10-images-notes-display-vault-under-kokobrain-vaults.md) Images in notes display for a vault under ~/kokobrain-vaults: the asset-protocol scope adds that root and keeps the folders the README documents
- [12](issues/12-backlinks-outgoing-links-always-show-open-note.md) Backlinks and Outgoing links always show the open note's own links, also after returning to a note seen at the same index version
- [13](issues/13-closing-tab-unsaved-text-saves-closes-prompt.md) Closing a tab with unsaved text saves it and closes; a prompt appears only when that save fails
- [14](issues/14-canvas-image-nodes-load-their-image-main.md) Canvas image nodes load their image: the main capability grants fs:allow-read-file on the vault roots
- [15](issues/15-canvas-file-image-nodes-store-vault-relative.md) Canvas file and image nodes store vault-relative paths and resolve both absolute and vault-relative ones
- [16](issues/16-kanban-drag-drop-puts-card-lane-exactly.md) Kanban drag-and-drop puts a card or lane exactly where the drop indicator shows
- [17](issues/17-dataarray-sort-sortby-keep-items-that-have.md) DataArray sort and sortBy keep the items that have the key in order and group the items without it at one end
- [20](issues/20-enter-quick-switcher-creates-note-when-nothing.md) Enter in the quick switcher creates the note when nothing matches
- [21](issues/21-lens-lists-follow-user-s-own-rename.md) Lens lists follow the user's own rename, move, delete, duplicate and create at once, not after the 2 to 10 s index throttle
- [22](issues/22-note-list-inline-rename-that-file-name.md) A note-list inline rename that the file name rules refuse says why, like the folder rename does
- [25](issues/25-text-search-tag-path-returns-every-note.md) Text search with tag: or path: returns every note that matches the words and the operators, and tag: matches nested tags
- [26](issues/26-outgoing-links-marks-row-broken-only-when.md) Outgoing links marks a row as broken only when its target is missing: same-note heading links and embeds of existing files are not red (narrowed)
- [27](issues/27-numeric-filters-never-match-note-that-lacks.md) Numeric <, <=, > and >= filters never match a note that lacks the property
- [28](issues/28-renaming-kanban-lane-keeps-card-limit-auto.md) Renaming a kanban lane keeps its card limit, auto-complete and collapsed state
- [29](issues/29-canvas-file-nodes-preview-note-without-yaml.md) Canvas file nodes preview the note without its YAML frontmatter
- [31](issues/31-renaming-moving-note-updates-links-kanban-cards.md) Renaming a note updates [[links]] in kanban cards (narrowed)
- [32](issues/32-queryjs-block-run-seconds-after-save-shows.md) A QueryJS block run in the seconds after a save shows the saved data once the index catches up, and never keeps a pre-save result
- [33](issues/33-kb-pages-folder-returns-notes-that-folder.md) kb.pages('"folder"') returns the notes in that folder and its subfolders only
- [36](issues/36-auto-move-evaluates-moves-only-markdown-notes.md) Auto Move evaluates and moves only Markdown notes: kanban boards, canvases and other files stay where they are
- [40](issues/40-paste-cut-copy-inside-meta-bind-number.md) Paste, cut and copy inside a meta-bind number or date input act on the input, not the note
- [41](issues/41-html-link-paste-keeps-bracketed-link-text.md) HTML link paste keeps bracketed link text and table cells intact (narrowed)
- [43](issues/43-cmd-click-reference-link-email-autolink-opens.md) Cmd+click on a reference link or an email autolink opens its target, and a link with no openable URL is not sent to the opener
- [44](issues/44-copy-block-link-reuses-only-real-trailing.md) Copy Block Link reuses only a real trailing block ID; a line ending in [[Note#^id]] or x^2 gets a new ID
- [48](issues/48-clearing-search-box-while-search-still-running.md) Clearing the search box while a search is still running shows the empty-query hint, not a stuck Searching...
- [51](issues/51-formula-that-calls-unknown-function-cannot-confirmed.md) A formula that calls an unknown function cannot be confirmed and shows why
- [52](issues/52-clearing-canvas-node-s-color-link-node.md) Clearing a canvas node's color or a link node's title is saved to the .canvas file
- [56](issues/56-new-file-from-template-says-name-taken.md) New File from Template says the name is taken instead of silently opening the existing note
- [60](issues/60-live-preview-paints-no-active-line-background.md) Live preview paints no active-line background; source mode keeps it
- [64](issues/64-word-count-graph-stats-read-correctly-zero.md) Word count and graph stats read correctly for zero and one
- [66](issues/66-collection-table-reads-table.md) The collection table reads as a table (narrowed)
- [68](issues/68-kanban-date-proximity-has-one-token-based.md) Kanban date proximity has one token-based map, and done cards drop it
- [69](issues/69-new-event-dialog-shows-enter-title-only.md) The New event dialog shows "Enter a title." only after the title was touched
- [70](issues/70-command-palette-shows-dense-one-line-rows.md) The command palette shows dense one-line rows with key hints
- [71](issues/71-opening-settings-moves-focus-into-drawer-closing.md) Opening Settings moves focus into the drawer, and closing returns it
- [73](issues/73-every-language-code-block-dropdown-guide-offer.md) Every language the code-block dropdown and the guide offer is syntax-highlighted (narrowed)
- [75](issues/75-auto-move-example-s-steps-move-notes.md) The auto-move example's steps move the notes as written: edit then save, the right default delay, rules loaded after copying the file
- [77](issues/77-periodic-notes-help-shows-format-examples-that.md) The Periodic Notes help shows format examples that escape literal words with [ ]
- [80](issues/80-kb-table-kb-ui-table-kb-list.md) A kb.table, kb.ui.table or kb.list cell holding an array or DataArray of links renders each link as a clickable link
- [81](issues/81-search-panel-stops-repeating-index-status-status.md) The Search panel stops repeating the index status the status bar already shows
- [82](issues/82-retention-days-debounce-delay-accept-typed-values.md) Retention days and Debounce delay accept typed values and clamp on commit
- [83](issues/83-kanban-cards-drop-empty-date-row-until.md) Kanban cards drop the empty date row until hover or focus, and the date trigger stays keyboard reachable
- [84](issues/84-status-colors-use-theme-tokens-test-forbids.md) Status colors use theme tokens, and a test forbids raw palette classes
- [85](issues/85-canvas-nodes-edges-grid-draw-from-theme.md) Canvas nodes, edges and grid draw from theme tokens, so they show on light themes
- [86](issues/86-canvas-menus-pickers-edge-labels-use-theme.md) Canvas menus, pickers and edge labels use theme tokens
- [87](issues/87-toasts-editor-s-codemirror-base-follow-theme.md) Toasts and the editor's CodeMirror base follow the theme mode
- [88](issues/88-graph-view-paints-active-theme-s-colors.md) The graph view paints with the active theme's colors
- [90](issues/90-help-text-that-belongs-settings-row-sits.md) Help text that belongs to a settings row sits inside that row through a SettingItem hint prop
- [93](issues/93-default-theme-drops-catppuccin-preview-overrides.md) The Default theme drops its Catppuccin preview overrides
- [94](issues/94-right-sidebar-sections-share-one-header-recipe.md) Right sidebar sections share one header recipe and one left edge
- [98](issues/98-external-change-open-note-never-overwritten-next.md) An external change to an open note is never overwritten by the next autosave or calendar write (narrowed)
- [101](issues/101-unparseable-canvas-opens-error-state-never-overwritten.md) An unparseable .canvas opens in an error state and is never overwritten by canvas edits
- [102](issues/102-file-history-restore-writes-snapshot-into-note.md) File History Restore writes the snapshot into the note shown in the dialog, never into whichever tab is active (narrowed)
- [103](issues/103-meta-bind-button-stops-remaining-actions-when.md) A meta-bind button stops its remaining actions when an open action fails
- [104](issues/104-meta-bind-button-s-updatemetadata-always-writes.md) A meta-bind button's updateMetadata always writes the button's own note, also after an open or createNote action
- [108](issues/108-rename-link-rewrite-skips-links-inside-code.md) Rename link rewrite skips links inside code blocks and updates self links
- [110](issues/110-deep-link-names-resolve-safely-md-added.md) Deep-link names resolve safely: .md is added unless the name ends in a real extension, name=. stays inside the vault, and overwrite never replaces .kokobrain files
- [112](issues/112-duplicate-saves-note-s-unsaved-typing-before.md) Duplicate saves the note's unsaved typing before copying it
- [113](issues/113-duplicate-never-overwrites-sibling-whose-name-differs.md) Duplicate never overwrites a sibling whose name differs only in case (APFS)
- [115](issues/115-session-whose-settings-json-was-never-loaded.md) A session whose settings.json was never loaded never writes it and never purges File History at the default retention
- [116](issues/116-auto-move-rules-todoist-sent-list-failed.md) Auto-move rules and the Todoist sent list: a failed load is never saved over the file
- [117](issues/117-auto-move-rule-edit-made-just-before.md) An Auto Move rule edit made just before Settings closes or changes section is still written to auto-move-rules.json
- [123](issues/123-kanban-lane-actions-never-turn-raw-into.md) Kanban lane actions never turn a raw --- into the archive separator, and restore to a missing lane keeps the card
- [124](issues/124-watcher-events-keep-fts5-semantic-rust-indexes.md) A failed tree refresh still fans out the burst, and scan_vault skips an unreadable subfolder (narrowed)
- [126](issues/126-failure-after-disk-op-still-reports-completed.md) A failure after the disk op still reports a completed rename as done and re-keys the index (narrowed)
- [128](issues/128-failed-auto-move-tells-user-which-note.md) A failed Auto Move tells the user which note did not move and why
- [129](issues/129-vault-picked-outside-two-allowed-folders-refused.md) A vault picked outside the two allowed folders is refused with a message naming them, never half-working
- [131](issues/131-note-whose-live-preview-widget-throws-every.md) A note whose live-preview widget throws on every render stays editable and in sync with its tab
- [134](issues/134-read-files-batch-only-reads-inside-vault.md) read_files_batch only reads inside the vault that is actually open
- [139](issues/139-queryjs-pager-clicks-keep-widget-rendered-wikilinks.md) QueryJS pager clicks keep the widget rendered; wikilinks in inline code and media tags in code render as text
- [141](issues/141-local-graph-center-follows-every-way-graph.md) The local graph center follows every way the graph tab gets focus, and hints when the center note is gone
- [142](issues/142-tag-may-start-digit-may-carry-emoji.md) A tag may start with a digit and may carry emoji, as in Obsidian (narrowed)
- [143](issues/143-typing-editor-suggests-vault-s-existing-tags.md) Typing # in the editor suggests the vault's existing tags
- [145](issues/145-emptystate-inlinealert-badge-primitives-exist.md) EmptyState, InlineAlert and Badge primitives exist
- [147](issues/147-graph-collection-kanban-views-show-real-empty.md) Graph, collection and kanban views show real empty and error states
- [152](issues/152-properties-panel-commit-that-changes-nothing-does.md) A Properties panel commit that changes nothing does not arm the skip flag

## Order

Implement in number order. An Issue can start when every Issue in its **Blocked by** line is done. relay-lite turns every non-closed status into `todo`, so `needs-info` Issues look available to it: run `/relay-lite:run audit-2026-11-05 NN ...` with explicit numbers, never `--all`, and launch a `needs-info` Issue only after its decision is in its Notes. Numbers 01 to 151 follow the order below; 34, 35, 45, 55, 67, 122 and 133 were closed after the order was built (see Closed by the audit), so their numbers are missing below.

### Written content at risk

Bugs that lose, corrupt, overwrite or misplace what the user wrote.

- [01](issues/01-caret-selection-follow-their-text-when-frontmatter.md) The caret and selection follow their text when a frontmatter toggle, property edit, link rewrite or external reload rewrites the open note
- [02](issues/02-keyboard-edits-next-hidden-frontmatter-never-change.md) Keyboard edits next to the hidden frontmatter never change its fences
- [03](issues/03-quick-capture-writes-page-titles-app-ids.md) Quick Capture writes page titles, app ids and URLs into template frontmatter as valid YAML
- [04](issues/04-closing-main-window-never-leaves-windowless-app.md) Closing the main window never leaves a windowless app: Quick Capture, deep links and a Dock click keep working
- [05](issues/05-live-preview-controls-change-only-text-user.md) Live-preview controls change only the text the user asked to change: fence attributes, task markers and tab-indented pastes stay intact (from `file-io-audit`)
- [06](issues/06-canvas-edit-closed-renamed-inside-debounce-window.md) A canvas edit closed or renamed inside the debounce window reaches its .canvas file (from `audit-2026-11-04`)
- [07](issues/07-empty-frontmatter-block-matched-writers-never-stack.md) Setting a folder icon never stacks a second frontmatter block (from `file-io-audit`)
- [08](issues/08-file-history-keeps-snapshot-pre-save-bytes.md) File History keeps a snapshot of the pre-save bytes, and retention never deletes a note's last snapshot (from `file-io-audit`)
- [09](issues/09-kanban-card-lane-title-being-edited-saved.md) A kanban card or lane title being edited is saved into its own board when the tab changes, and never into another tab

### Daily use and UI correctness

A daily flow breaks, or the UI shows wrong or stale data, or content is not displayed.

- [10](issues/10-images-notes-display-vault-under-kokobrain-vaults.md) Images in notes display for a vault under ~/kokobrain-vaults: the asset-protocol scope adds that root and keeps the folders the README documents
- [11](issues/11-rendered-table-cells-show-links-highlight-underscore.md) Rendered table cells show links, highlight, underscore emphasis, line breaks and escaped pipes as formatted content
- [12](issues/12-backlinks-outgoing-links-always-show-open-note.md) Backlinks and Outgoing links always show the open note's own links, also after returning to a note seen at the same index version
- [13](issues/13-closing-tab-unsaved-text-saves-closes-prompt.md) Closing a tab with unsaved text saves it and closes; a prompt appears only when that save fails
- [14](issues/14-canvas-image-nodes-load-their-image-main.md) Canvas image nodes load their image: the main capability grants fs:allow-read-file on the vault roots
- [15](issues/15-canvas-file-image-nodes-store-vault-relative.md) Canvas file and image nodes store vault-relative paths and resolve both absolute and vault-relative ones (from `audit-2026-11-04`)
- [16](issues/16-kanban-drag-drop-puts-card-lane-exactly.md) Kanban drag-and-drop puts a card or lane exactly where the drop indicator shows
- [17](issues/17-dataarray-sort-sortby-keep-items-that-have.md) DataArray sort and sortBy keep the items that have the key in order and group the items without it at one end
- [18](issues/18-standard-markdown-images-vault-relative-path-load.md) Standard markdown images with a vault-relative path load from the vault
- [19](issues/19-wikilink-autocomplete-inserts-non-markdown-file-extension.md) Wikilink autocomplete inserts a non-markdown file with its extension, so ![[photo.png]] embeds the image
- [20](issues/20-enter-quick-switcher-creates-note-when-nothing.md) Enter in the quick switcher creates the note when nothing matches (from `ux-polish`)
- [21](issues/21-lens-lists-follow-user-s-own-rename.md) Lens lists follow the user's own rename, move, delete, duplicate and create at once, not after the 2 to 10 s index throttle
- [22](issues/22-note-list-inline-rename-that-file-name.md) A note-list inline rename that the file name rules refuse says why, like the folder rename does
- [23](issues/23-file-history-follows-note-through-rename-move.md) File History follows a note through rename, move, auto-move and suffixed restore (from `file-io-audit`)
- [25](issues/25-text-search-tag-path-returns-every-note.md) Text search with tag: or path: returns every note that matches the words and the operators, and tag: matches nested tags
- [26](issues/26-outgoing-links-marks-row-broken-only-when.md) Outgoing links marks a row as broken only when its target is missing: same-note heading links and embeds of existing files are not red
- [27](issues/27-numeric-filters-never-match-note-that-lacks.md) Numeric <, <=, > and >= filters never match a note that lacks the property
- [28](issues/28-renaming-kanban-lane-keeps-card-limit-auto.md) Renaming a kanban lane keeps its card limit, auto-complete and collapsed state
- [29](issues/29-canvas-file-nodes-preview-note-without-yaml.md) Canvas file nodes preview the note without its YAML frontmatter
- [30](issues/30-canvas-duplicate-places-copy-next-node-s.md) Canvas Duplicate places the copy next to the node's current position and size
- [31](issues/31-renaming-moving-note-updates-links-kanban-cards.md) Renaming a note updates [[links]] in kanban cards
- [32](issues/32-queryjs-block-run-seconds-after-save-shows.md) A QueryJS block run in the seconds after a save shows the saved data once the index catches up, and never keeps a pre-save result
- [33](issues/33-kb-pages-folder-returns-notes-that-folder.md) kb.pages('"folder"') returns the notes in that folder and its subfolders only
- [36](issues/36-auto-move-evaluates-moves-only-markdown-notes.md) Auto Move evaluates and moves only Markdown notes: kanban boards, canvases and other files stay where they are
- [37](issues/37-leaving-theme-editor-any-way-other-than.md) Leaving the theme editor any way other than Save puts the active theme back on the app
- [38](issues/38-relationship-picker-navigates-arrow-keys.md) The relationship picker navigates with arrow keys (from `ux-polish`)
- [39](issues/39-settings-update-keeps-download-progress-restart-update.md) Settings > Update keeps the download progress and Restart to update across closing Settings or changing section, and a second check cannot start a second download
- [40](issues/40-paste-cut-copy-inside-meta-bind-number.md) Paste, cut and copy inside a meta-bind number or date input act on the input, not the note
- [41](issues/41-html-link-paste-keeps-bracketed-link-text.md) HTML link paste keeps bracketed link text and table cells intact
- [42](issues/42-image-png-300x200-applies-both-width-height.md) An image embed with a WIDTHxHEIGHT size (300x200) applies both the width and the height
- [43](issues/43-cmd-click-reference-link-email-autolink-opens.md) Cmd+click on a reference link or an email autolink opens its target, and a link with no openable URL is not sent to the opener
- [44](issues/44-copy-block-link-reuses-only-real-trailing.md) Copy Block Link reuses only a real trailing block ID; a line ending in [[Note#^id]] or x^2 gets a new ID
- [46](issues/46-settings-file-history-automatic-snapshots-takes-effect.md) Settings > File History > Automatic snapshots takes effect on the next save, with no vault reopen
- [47](issues/47-tags-view-keeps-list-expanded-tags-screen.md) The Tags view keeps its list and expanded tags on screen while it refreshes
- [48](issues/48-clearing-search-box-while-search-still-running.md) Clearing the search box while a search is still running shows the empty-query hint, not a stuck Searching...
- [49](issues/49-tag-click-lists-notes-that-tag-even.md) A tag click lists the notes with that tag even when Semantic or Hybrid was the selected search mode
- [50](issues/50-fuzzy-search-finds-close-spelling-wherever-sits.md) Fuzzy search finds a close spelling wherever it sits in the vocabulary, not only among the first 500 words with the same first letter
- [51](issues/51-formula-that-calls-unknown-function-cannot-confirmed.md) A formula that calls an unknown function cannot be confirmed and shows why
- [52](issues/52-clearing-canvas-node-s-color-link-node.md) Clearing a canvas node's color or a link node's title is saved to the .canvas file
- [53](issues/53-file-inlinks-lists-notes-that-link-note.md) file.inlinks lists the notes that link to a note whose name contains a dot
- [54](issues/54-vault-open-creates-every-missing-placeholder-template.md) Vault open creates every missing placeholder template, including the parent folders periodic-note/ and quick-capture/
- [56](issues/56-new-file-from-template-says-name-taken.md) New File from Template says the name is taken instead of silently opening the existing note
- [57](issues/57-quick-switcher-create-folder-path-projects-idea.md) Quick Switcher Create with a folder path (Projects/Idea) creates the note in that folder, and a failed create says why
- [58](issues/58-dragging-node-graph-moves-that-node-dragging.md) Dragging a node in the graph moves that node; dragging the background pans
- [59](issues/59-switching-graph-arrows-toggle-redraws-graph-once.md) Switching the graph Arrows toggle redraws the graph at once, also after the layout has settled

### Polish

Visual, copy and fine-tuning.

- [60](issues/60-live-preview-paints-no-active-line-background.md) Live preview paints no active-line background; source mode keeps it (from `ux-polish`)
- [61](issues/61-editor-tables-use-full-content-width-hover.md) Editor tables use the full content width, with hover controls overlaid and the gap below the table kept (from `ux-polish`)
- [62](issues/62-status-bar-note-count-follows-notes-created.md) The status bar note count follows notes created, imported and deleted during the session
- [63](issues/63-tags-view-explains-when-rare-tag-filter.md) The Tags view explains when the rare-tag filter hides everything (from `ux-polish`)
- [64](issues/64-word-count-graph-stats-read-correctly-zero.md) Word count and graph stats read correctly for zero and one (from `ux-polish`)
- [65](issues/65-hovering-open-note-keeps-fill-kanban-lane.md) Hovering the open note keeps its fill, and the kanban lane grip appears on lane hover (from `ux-polish`)
- [66](issues/66-collection-table-reads-table.md) The collection table reads as a table (from `ux-polish`)
- [68](issues/68-kanban-date-proximity-has-one-token-based.md) Kanban date proximity has one token-based map, and done cards drop it (from `ux-polish`)
- [69](issues/69-new-event-dialog-shows-enter-title-only.md) The New event dialog shows "Enter a title." only after the title was touched (from `ux-polish`)
- [70](issues/70-command-palette-shows-dense-one-line-rows.md) The command palette shows dense one-line rows with key hints (from `ux-polish`)
- [71](issues/71-opening-settings-moves-focus-into-drawer-closing.md) Opening Settings moves focus into the drawer, and closing returns it (from `ux-polish`)
- [72](issues/72-click-audio-player-wrapper-s-padding-moves.md) A click in the audio player wrapper's padding moves the cursor like a click next to the widget (from `live-preview-click-reveal`)
- [73](issues/73-every-language-code-block-dropdown-guide-offer.md) Every language the code-block dropdown and the guide offer is syntax-highlighted
- [74](issues/74-markdown-guide-s-quick-reference-shows-block.md) The Markdown guide's Quick Reference shows block math in the three-line $$ form the editor renders
- [75](issues/75-auto-move-example-s-steps-move-notes.md) The auto-move example's steps move the notes as written: edit then save, the right default delay, rules loaded after copying the file
- [76](issues/76-personal-week-kanban-example-uses-valid-sortmode.md) The personal-week kanban example uses the valid sortMode "checked", and the docs say the sort is per board
- [77](issues/77-periodic-notes-help-shows-format-examples-that.md) The Periodic Notes help shows format examples that escape literal words with [ ]
- [78](issues/78-tasks-help-says-default-view-lists-only.md) The Tasks help says the default view lists only tasks under a #to-list heading, and that the date filter uses the note's modification date
- [79](issues/79-calendar-day-more-than-three-notes-lets.md) A calendar day with more than three notes lets the user reach every note
- [80](issues/80-kb-table-kb-ui-table-kb-list.md) A kb.table, kb.ui.table or kb.list cell holding an array or DataArray of links renders each link as a clickable link
- [81](issues/81-search-panel-stops-repeating-index-status-status.md) The Search panel stops repeating the index status the status bar already shows (from `ux-polish`)
- [82](issues/82-retention-days-debounce-delay-accept-typed-values.md) Retention days and Debounce delay accept typed values and clamp on commit (from `ux-polish`)
- [83](issues/83-kanban-cards-drop-empty-date-row-until.md) Kanban cards drop the empty date row until hover or focus, and the date trigger stays keyboard reachable (from `ux-polish`)
- [84](issues/84-status-colors-use-theme-tokens-test-forbids.md) Status colors use theme tokens, and a test forbids raw palette classes (from `ux-polish`)
- [85](issues/85-canvas-nodes-edges-grid-draw-from-theme.md) Canvas nodes, edges and grid draw from theme tokens, so they show on light themes (from `ux-polish`)
- [86](issues/86-canvas-menus-pickers-edge-labels-use-theme.md) Canvas menus, pickers and edge labels use theme tokens (from `ux-polish`)
- [87](issues/87-toasts-editor-s-codemirror-base-follow-theme.md) Toasts and the editor's CodeMirror base follow the theme mode (from `ux-polish`)
- [88](issues/88-graph-view-paints-active-theme-s-colors.md) The graph view paints with the active theme's colors (from `ux-polish`)
- [89](issues/89-settings-modal-scrim-closes-outside-click-tab.md) Settings is modal: a scrim closes it on outside click and Tab stays inside (from `ux-polish`)
- [90](issues/90-help-text-that-belongs-settings-row-sits.md) Help text that belongs to a settings row sits inside that row through a SettingItem hint prop (from `ux-polish`)
- [91](issues/91-graph-controls-event-dialog-use-shadcn-select.md) Graph controls and the event dialog use shadcn Select, Switch and Checkbox (from `ux-polish`)
- [92](issues/92-search-results-link-rows-reserve-gutter-their.md) Search results and link rows reserve a gutter for their hover actions (from `ux-polish`)
- [93](issues/93-default-theme-drops-catppuccin-preview-overrides.md) The Default theme drops its Catppuccin preview overrides (from `ux-polish`)
- [94](issues/94-right-sidebar-sections-share-one-header-recipe.md) Right sidebar sections share one header recipe and one left edge (from `ux-polish`)
- [95](issues/95-chrome-icon-buttons-share-sizes-use-shadcn.md) Chrome icon buttons share sizes and use shadcn tooltips (from `ux-polish`)
- [96](issues/96-settings-groups-render-cards-dividers.md) Settings groups render as cards with dividers (from `ux-polish`)

### Corner cases

Real defects that need an unusual setup or sequence. Several came from earlier audits and stay valid, but they are not daily risks.

- [97](issues/97-view-toolbar-icon-writes-keep-file-s.md) .view toolbar and icon writes keep the file's YAML comments (from `file-io-audit`)
- [98](issues/98-external-change-open-note-never-overwritten-next.md) An external change to an open note is never overwritten by the next autosave or calendar write (from `file-io-audit`)
- [99](issues/99-note-deleted-renamed-outside-app-closed-marked.md) A note deleted or renamed outside the app is closed or marked orphaned, never recreated by the next autosave (from `file-io-audit`)
- [100](issues/100-watcher-rescan-dropped-fsevents-reloads-open-tabs.md) A watcher rescan (dropped FSEvents) reloads open tabs before the next save (from `file-io-audit`)
- [101](issues/101-unparseable-canvas-opens-error-state-never-overwritten.md) An unparseable .canvas opens in an error state and is never overwritten by canvas edits (from `audit-2026-11-04`)
- [102](issues/102-file-history-restore-writes-snapshot-into-note.md) File History Restore writes the snapshot into the note shown in the dialog, never into whichever tab is active (from `file-io-audit`)
- [103](issues/103-meta-bind-button-stops-remaining-actions-when.md) A meta-bind button stops its remaining actions when an open action fails (from `audit-2026-11-04`)
- [104](issues/104-meta-bind-button-s-updatemetadata-always-writes.md) A meta-bind button's updateMetadata always writes the button's own note, also after an open or createNote action (from `file-io-audit`)
- [105](issues/105-keystrokes-typed-during-link-rewrite-type-rename.md) Keystrokes typed during link rewrite, type rename or watcher reload writes are kept (from `file-io-audit`)
- [106](issues/106-dock-quit-logout-shutdown-run-exit-flush.md) Dock Quit, logout and shutdown run the exit flush before the app ends (from `file-io-audit`)
- [107](issues/107-note-writes-are-atomic-failed-write-never.md) Note writes are atomic: a failed write never leaves the note empty or truncated (from `file-io-audit`)
- [108](issues/108-rename-link-rewrite-skips-links-inside-code.md) Rename link rewrite skips links inside code blocks and updates self links (from `file-io-audit`)
- [109](issues/109-root-unarchive-writes-vault-x-md-auto.md) Root unarchive writes vault/x.md, auto-move refuses .. segments, and a case or NFC variant of a path reuses the open tab (from `file-io-audit`)
- [110](issues/110-deep-link-names-resolve-safely-md-added.md) Deep-link names resolve safely: .md is added unless the name ends in a real extension, name=. stays inside the vault, and overwrite never replaces .kokobrain files (from `file-io-audit`)
- [111](issues/111-deep-link-prepend-goes-below-frontmatter-non.md) Deep-link prepend goes below the frontmatter, and non-silent new keeps <% %> in the sent text (from `file-io-audit`)
- [112](issues/112-duplicate-saves-note-s-unsaved-typing-before.md) Duplicate saves the note's unsaved typing before copying it
- [113](issues/113-duplicate-never-overwrites-sibling-whose-name-differs.md) Duplicate never overwrites a sibling whose name differs only in case (APFS) (from `file-io-audit`)
- [114](issues/114-unreadable-corrupt-trash-manifest-backed-up-never.md) An unreadable or corrupt trash manifest is backed up, never replaced by a partial list, and trash writers never orphan trashed items (from `audit-2026-11-04`)
- [115](issues/115-session-whose-settings-json-was-never-loaded.md) A session whose settings.json was never loaded never writes it and never purges File History at the default retention (from `audit-2026-11-04`)
- [116](issues/116-auto-move-rules-todoist-sent-list-failed.md) Auto-move rules and the Todoist sent list: a failed load is never saved over the file (from `audit-2026-11-04`)
- [117](issues/117-auto-move-rule-edit-made-just-before.md) An Auto Move rule edit made just before Settings closes or changes section is still written to auto-move-rules.json
- [118](issues/118-type-rename-reports-partial-failure-also-updates.md) Type rename reports partial failure and also updates _type values with a trailing comment (from `file-io-audit`)
- [119](issues/119-non-utf-8-files-open-read-only.md) Non-UTF-8 files open read-only or as binary, never written back with U+FFFD (from `file-io-audit`)
- [120](issues/120-crlf-notes-keep-their-crlf-line-endings.md) CRLF notes keep their CRLF line endings after an edit (from `file-io-audit`)
- [121](issues/121-minor-write-races-are-closed-autosave-during.md) Minor write races are closed: autosave during rename, retry-chain stacking, create vs restore, superseded init, calendar rollback, the properties skip flag (from `file-io-audit`)
- [123](issues/123-kanban-lane-actions-never-turn-raw-into.md) Kanban lane actions never turn a raw --- into the archive separator, and restore to a missing lane keeps the card (from `file-io-audit`)
- [124](issues/124-watcher-events-keep-fts5-semantic-rust-indexes.md) A failed tree refresh still fans out the burst, and scan_vault skips an unreadable subfolder (from `file-io-audit`)
- [125](issues/125-semantic-update-still-embedding-when-note-deleted.md) A semantic update still embedding when its note is deleted leaves no chunks for the trashed note (from `file-io-audit`)
- [126](issues/126-failure-after-disk-op-still-reports-completed.md) A failure after the disk op still reports a completed rename as done and re-keys the index (from `file-io-audit`)
- [127](issues/127-note-unquoted-wikilink-value-up-home-accepts.md) A note with an unquoted wikilink value (up: [[Home]]) accepts property, lifecycle, icon and meta-bind writes
- [128](issues/128-failed-auto-move-tells-user-which-note.md) A failed Auto Move tells the user which note did not move and why
- [129](issues/129-vault-picked-outside-two-allowed-folders-refused.md) A vault picked outside the two allowed folders is refused with a message naming them, never half-working (from `file-io-audit`)
- [130](issues/130-quick-capture-dedupe-anchor-advances-only-after.md) The quick-capture dedupe anchor advances only after the frontend accepts the capture (from `file-io-audit`)
- [131](issues/131-note-whose-live-preview-widget-throws-every.md) A note whose live-preview widget throws on every render stays editable and in sync with its tab (from `file-io-audit`)
- [132](issues/132-collection-link-cells-never-navigate-app-webview.md) Collection link() cells never navigate the app webview and drop unsafe schemes (from `audit-2026-11-04`)
- [134](issues/134-read-files-batch-only-reads-inside-vault.md) read_files_batch only reads inside the vault that is actually open (from `audit-2026-11-04`)
- [135](issues/135-note-writing-commands-refuse-paths-outside-open.md) Note-writing commands refuse paths outside the open vault (from `audit-2026-11-04`)
- [136](issues/136-vault-root-commands-scan-index-builds-watcher.md) Vault-root commands (scan, index builds, watcher, model init) only accept the open vault (from `audit-2026-11-04`)

### Later

Refactors, deferred architecture work and new features.

- [137](issues/137-file-icons-read-frontmatter-only-through-rust.md) File icons read frontmatter only through Rust (from `architecture-stability`)
- [138](issues/138-file-icon-saves-that-cannot-happen-tell.md) File icon saves that cannot happen tell the user, and clicking the current icon writes nothing (from `architecture-stability`)
- [139](issues/139-queryjs-pager-clicks-keep-widget-rendered-wikilinks.md) QueryJS pager clicks keep the widget rendered; wikilinks in inline code and media tags in code render as text (from `live-preview-audit`)
- [140](issues/140-live-preview-render-gaps-are-decided-one.md) `$$` block math right under a paragraph or callout line renders as math (from `live-preview-audit`)
- [141](issues/141-local-graph-center-follows-every-way-graph.md) The local graph center follows every way the graph tab gets focus, and hints when the center note is gone (from `audit-2026-11-04`)
- [142](issues/142-tag-may-start-digit-may-carry-emoji.md) A tag may start with a digit and may carry emoji, as in Obsidian (from `tags-obsidian-parity`)
- [143](issues/143-typing-editor-suggests-vault-s-existing-tags.md) Typing # in the editor suggests the vault's existing tags (from `tags-obsidian-parity`)
- [144](issues/144-tab-strip-shows-overflow-hides-md-extension.md) The tab strip shows overflow and hides the .md extension (from `ux-polish`)
- [145](issues/145-emptystate-inlinealert-badge-primitives-exist.md) EmptyState, InlineAlert and Badge primitives exist (from `ux-polish`)
- [146](issues/146-sidebar-panels-settings-use-empty-error-primitives.md) Sidebar panels and settings use the empty and error primitives (from `ux-polish`)
- [147](issues/147-graph-collection-kanban-views-show-real-empty.md) Graph, collection and kanban views show real empty and error states (from `ux-polish`)
- [148](issues/148-vault-search-history-files-command-logic-lives.md) Vault, search, history and files command logic lives in domain modules outside commands/ (needs-info) (from `architecture-stability`)
- [149](issues/149-cargo-workspace-kokobrain-core-crate-exists.md) A Cargo workspace with a kokobrain-core crate exists (needs-info) (from `architecture-stability`)
- [150](issues/150-core-tests-live-core-crate-no-re.md) Core tests live in the core crate, with no re-export shim (needs-info) (from `architecture-stability`)
- [151](issues/151-editor-engine-lives-packages-editor.md) The editor engine lives in packages/editor (from `architecture-stability`)

## Split from first-wave Issues (2026-11-06)

These hold the parts the owner left out of the first wave. Each is blocked by its parent and waits for a later wave.

- [152](issues/152-properties-panel-commit-that-changes-nothing-does.md) A Properties panel commit that changes nothing does not arm the skip flag (first wave)
- [153](issues/153-every-tab-write-checks-disk-first-so.md) Every tab write checks the disk first, so an external change is never overwritten without a copy
- [154](issues/154-deep-link-prepend-append-daily-capture-closed.md) Deep-link prepend and append, daily capture and the closed-note frontmatter rewrite snapshot a note with an empty history first
- [155](issues/155-renaming-moving-note-updates-file-nodes-that.md) Renaming or moving a note updates the file nodes that point at it in canvases
- [156](issues/156-empty-frontmatter-block-from-outside-app-matched.md) An empty --- --- frontmatter block from outside the app is matched, and writers never stack a second block
- [157](issues/157-watcher-events-keep-fts5-semantic-rows-current.md) Watcher events keep FTS5 and semantic rows current, and a read error is not treated as a delete (needs-triage)
- [158](issues/158-pasting-html-table-keeps-links-cells.md) Pasting an HTML table keeps the links in its cells
- [159](issues/159-powershell-dockerfile-elixir-haskell-scala-code-blocks.md) PowerShell, Dockerfile, Elixir, Haskell and Scala code blocks are syntax-highlighted
- [160](issues/160-file-history-restores-into-board-view-closed.md) File History restores into a board view or a closed tab by path
- [161](issues/161-collection-table-headers-read-names-stay-visible.md) Collection table headers read as names and stay visible while the table scrolls (needs-info)
- [162](issues/162-tree-refresh-failure-after-successful-rename-still.md) A tree refresh failure after a successful rename still reports it as done

## Closed by the audit

Open Issues that do not enter the plan, and new findings covered elsewhere. Each origin file says why in its Comments.

- Issue 24: wontfix, merged into Issue 25 by the owner after the first-wave challenge review.
- Issue [34](issues/34-tasks-view-treats-only-done-cancelled-tasks.md): wontfix from the owner's 2026-11-06 survey (the Issue says why).
- Issue [35](issues/35-tasks-view-keeps-list-scroll-position-screen.md): wontfix from the owner's 2026-11-06 survey (the Issue says why).
- Issue [55](issues/55-todoist-sync-tells-user-when-could-not.md): wontfix from the owner's 2026-11-06 survey (the Issue says why).
- Issue [67](issues/67-first-semantic-hybrid-search-after-one-file.md): wontfix from the owner's 2026-11-06 survey (the Issue says why).
- Issue [122](issues/122-stale-tasks-list-never-ticks-wrong-task.md): wontfix from the owner's 2026-11-06 survey (the Issue says why).
- Issue [133](issues/133-queryjs-blocks-written-deep-link-capture-do.md): wontfix from the owner's 2026-11-06 survey (the Issue says why).
- Issue [45](issues/45-backlinks-outgoing-links-show-load-error-retry.md) (from `.scratch/ux-polish/issues/06-link-panels-show-load-error.md`): wontfix after the plan was built. The round-2 second opinion found that the only error the three link commands return is a poisoned VaultIndex lock, which needs an earlier Rust panic, so the Retry state cannot be reached in daily use.
- `.scratch/file-io-audit/issues/51-empty-inline-footnote-kills-footnote-plugin.md`: resolved. Fixed by 1ad0306a5 ('fix: empty inline footnote no longer crashes live preview', audit-2026-11-04 Issue 06). At HEAD, buildFootnoteDecorations in footnote-plugin.ts skips the empty inline case before it pushes a decoration.
- `.scratch/file-io-audit/issues/20-composer-clears-dropped-capture.md`: resolved. Fixed by 0a1c22a73 ('fix: composer keeps text until the capture note is written', audit-2026-11-04 Issue 12). submit_composer_capture now carries a request_id, and the result is reported back (quick_capture/commands.rs:469-490).
- `.scratch/file-io-audit/issues/29-meta-bind-value-types.md`: resolved. Fixed by 575b84f2f ('fix: meta-bind writes typed values and reads alias keys'). The toggle passes cb.checked (widgets.ts:990), number uses Number() (:1063-1067), and select uses typedOptionValue (:784).
- `.scratch/ux-polish/issues/53-right-sidebar-non-note-tabs.md`: resolved. Delivered by 4e382ea1e (hide the right sidebar on canvas, collection and kanban) and 7b71c217f (retire .collection files). hidesRightSidebar at layout.logic.ts:22-27 returns true for canvas, view and kanban.
- `.scratch/file-io-audit/issues/39-semantic-cross-vault-commit.md`: wontfix. Against the owner decision 'one vault per session; vault switching within a session is not a real scenario'. The bug needs an in-flight update for vault A while switching to vault B.
- `.scratch/file-io-audit/issues/26-cross-vault-deep-link-dropped.md`: wontfix. Against the owner decision 'one vault per session'. A deep link to another vault is dropped only because it triggers switchVault -> teardownVault (deep-link.service.ts:161-173), and that vault switch inside a session is not a real scenario.
- `.scratch/file-io-audit/issues/43-case-only-rename-refused.md`: wontfix. Owner decision: 'a case-only rename being refused is wontfix'. renameItem's exists() check at fs.service.ts:284-285 stays as is.
- finding `N-views-03`: wontfix. Covered by `.scratch/view-engine-fixes/issues/07-filter-panel-safe-writes.md`, written in another session while this audit ran (committed in 9bda4aef2).
- finding `N-views-01`: wontfix. Covered by `.scratch/view-engine-fixes/issues/13-properties-panel-matches-columns.md`, written in another session while this audit ran (committed in 9bda4aef2).

## Migration from the old folders

Every Issue that was open in `.scratch/` before the audit is either in this plan or closed above. The ones in the plan were copied here with an audit header (verdict, current line numbers, stale parts of their text) and closed at their origin as `wontfix` with a comment naming the new file, so each is worked in one place. The origin ledgers mark those rows `wontfix` (or `done` for the ones already fixed), by hand, with a Log line: the relay CLI has no transition from `todo` to `wontfix`, the same as in commit 51c0d82aa.

| Old Issue | New |
|---|---|
| `.scratch/file-io-audit/issues/52-live-preview-unrequested-rewrites.md` | 05 |
| `.scratch/audit-2026-11-04/issues/22-canvas-flush-on-close-and-rename.md` | 06 |
| `.scratch/file-io-audit/issues/49-canvas-switch-reuses-instance.md` | 06 |
| `.scratch/file-io-audit/issues/30-empty-frontmatter-block.md` | 07 |
| `.scratch/file-io-audit/issues/13-file-history-no-baseline.md` | 08 |
| `.scratch/audit-2026-11-04/issues/17-canvas-node-path-resolution.md` | 15 |
| `.scratch/ux-polish/issues/03-quick-switcher-enter-creates-on-no-match.md` | 20 |
| `.scratch/file-io-audit/issues/23-file-history-keyed-by-path.md` | 23 |
| `.scratch/ux-polish/issues/68-pickers-arrow-keys.md` | 38 |
| `.scratch/ux-polish/issues/06-link-panels-show-load-error.md` | 45 |
| `.scratch/ux-polish/issues/55-no-active-line-slab.md` | 60 |
| `.scratch/ux-polish/issues/65-editor-table-width.md` | 61 |
| `.scratch/ux-polish/issues/13-tags-filtered-empty-state.md` | 63 |
| `.scratch/ux-polish/issues/12-word-count-and-graph-stats-counts.md` | 64 |
| `.scratch/ux-polish/issues/15-hover-keeps-active-row-and-lane-grip.md` | 65 |
| `.scratch/ux-polish/issues/62-collection-table-readable.md` | 66 |
| `.scratch/ui-responsiveness/issues/26-search-cache-reload-after-index-update.md` | 67 |
| `.scratch/ux-polish/issues/47-kanban-proximity-token-map.md` | 68 |
| `.scratch/ux-polish/issues/11-event-title-error-after-touch.md` | 69 |
| `.scratch/ux-polish/issues/56-command-palette-density.md` | 70 |
| `.scratch/ux-polish/issues/29-settings-drawer-focus-move-and-return.md` | 71 |
| `.scratch/live-preview-click-reveal/issues/12-media-wrapper-padding-click.md` | 72 |
| `.scratch/ux-polish/issues/14-search-panel-drops-duplicate-index-status.md` | 81 |
| `.scratch/ux-polish/issues/02-settings-number-fields-clamp-on-change.md` | 82 |
| `.scratch/ux-polish/issues/63-kanban-card-quiet.md` | 83 |
| `.scratch/ux-polish/issues/48-status-colors-use-tokens.md` | 84 |
| `.scratch/ux-polish/issues/43-canvas-surface-theme-tokens.md` | 85 |
| `.scratch/ux-polish/issues/44-canvas-overlay-theme-tokens.md` | 86 |
| `.scratch/ux-polish/issues/40-toasts-and-editor-follow-theme-mode.md` | 87 |
| `.scratch/ux-polish/issues/45-graph-view-theme-palette.md` | 88 |
| `.scratch/ux-polish/issues/30-settings-drawer-modal-scrim.md` | 89 |
| `.scratch/ux-polish/issues/26-setting-item-hint-prop.md` | 90 |
| `.scratch/ux-polish/issues/69-native-controls-to-shadcn.md` | 91 |
| `.scratch/ux-polish/issues/71-hover-action-gutter.md` | 92 |
| `.scratch/ux-polish/issues/72-default-theme-drop-preview-overrides.md` | 93 |
| `.scratch/ux-polish/issues/52-right-sidebar-sections.md` | 94 |
| `.scratch/ux-polish/issues/66-chrome-icon-buttons.md` | 95 |
| `.scratch/ux-polish/issues/70-settings-grouped-cards.md` | 96 |
| `.scratch/file-io-audit/issues/32-app-json-corrupt-overwrite.md` | 97 |
| `.scratch/file-io-audit/issues/08-external-change-overwritten.md` | 98 |
| `.scratch/file-io-audit/issues/22-external-delete-resurrected.md` | 99 |
| `.scratch/file-io-audit/issues/09-fsevents-rescan-ignored.md` | 100 |
| `.scratch/audit-2026-11-04/issues/13-canvas-refuse-write-on-unparseable.md` | 101 |
| `.scratch/file-io-audit/issues/15-canvas-unparseable-overwritten.md` | 101 |
| `.scratch/file-io-audit/issues/12-file-history-restore-wrong-tab.md` | 102 |
| `.scratch/audit-2026-11-04/issues/10-metabind-open-failure-stops-actions.md` | 103 |
| `.scratch/file-io-audit/issues/48-meta-bind-button-writes-opened-note.md` | 104 |
| `.scratch/file-io-audit/issues/33-keystrokes-lost-during-async-writes.md` | 105 |
| `.scratch/file-io-audit/issues/44-dock-quit-logout-skip-save.md` | 106 |
| `.scratch/file-io-audit/issues/07-non-atomic-note-writes.md` | 107 |
| `.scratch/file-io-audit/issues/27-link-rewrite-scope.md` | 108 |
| `.scratch/file-io-audit/issues/36-path-normalization.md` | 109 |
| `.scratch/file-io-audit/issues/25-deep-link-path-safety.md` | 110 |
| `.scratch/file-io-audit/issues/53-deep-link-content-fidelity.md` | 111 |
| `.scratch/file-io-audit/issues/19-duplicate-case-insensitive-overwrite.md` | 113 |
| `.scratch/audit-2026-11-04/issues/02-trash-manifest-unreadable.md` | 114 |
| `.scratch/file-io-audit/issues/11-trash-manifest-stale-rebuild.md` | 114 |
| `.scratch/audit-2026-11-04/issues/03-settings-guard-unloaded-file.md` | 115 |
| `.scratch/file-io-audit/issues/10-settings-load-failure-defaults.md` | 115 |
| `.scratch/audit-2026-11-04/issues/14-aux-json-load-failure-guard.md` | 116 |
| `.scratch/file-io-audit/issues/34-type-rename-partial-failure.md` | 118 |
| `.scratch/file-io-audit/issues/31-non-utf8-rewrite.md` | 119 |
| `.scratch/file-io-audit/issues/42-crlf-to-lf-rewrite.md` | 120 |
| `.scratch/file-io-audit/issues/41-minor-write-races.md` | 121 |
| `.scratch/file-io-audit/issues/24-stale-task-list-wrong-line.md` | 122 |
| `.scratch/file-io-audit/issues/56-kanban-lane-actions-archive-pattern.md` | 123 |
| `.scratch/file-io-audit/issues/28-watcher-index-staleness.md` | 124 |
| `.scratch/file-io-audit/issues/54-semantic-update-after-delete.md` | 125 |
| `.scratch/file-io-audit/issues/35-path-change-post-disk-failure.md` | 126 |
| `.scratch/file-io-audit/issues/37-vault-outside-allowed-folders.md` | 129 |
| `.scratch/file-io-audit/issues/38-quick-capture-dedupe-anchor.md` | 130 |
| `.scratch/file-io-audit/issues/55-persistent-widget-throw-desyncs-tab.md` | 131 |
| `.scratch/audit-2026-11-04/issues/08-collection-link-safe-open.md` | 132 |
| `.scratch/file-io-audit/issues/40-queryjs-unsandboxed.md` | 133 |
| `.scratch/audit-2026-11-04/issues/05-open-vault-root-read-batch.md` | 134 |
| `.scratch/audit-2026-11-04/issues/16-confine-note-writes.md` | 135 |
| `.scratch/audit-2026-11-04/issues/18-confine-vault-root-commands.md` | 136 |
| `.scratch/architecture-stability/issues/70-icon-index-single-frontmatter-reader.md` | 137 |
| `.scratch/architecture-stability/issues/71-icon-save-edge-cases.md` | 138 |
| `.scratch/live-preview-audit/issues/04-queryjs-pager-and-cosmetic-render-gaps.md` | 139 |
| `.scratch/live-preview-audit/issues/05-render-gaps-needing-a-decision.md` | 140 |
| `.scratch/audit-2026-11-04/issues/21-graph-center-follows-every-focus.md` | 141 |
| `.scratch/tags-obsidian-parity/issues/01-tag-format-matches-obsidian.md` | 142 |
| `.scratch/tags-obsidian-parity/issues/02-tag-autocomplete.md` | 143 |
| `.scratch/ux-polish/issues/54-tab-strip-overflow.md` | 144 |
| `.scratch/ux-polish/issues/59-empty-error-badge-primitives.md` | 145 |
| `.scratch/ux-polish/issues/60-panels-use-empty-error-primitives.md` | 146 |
| `.scratch/ux-polish/issues/61-views-empty-error-states.md` | 147 |
| `.scratch/architecture-stability/issues/28-move-command-logic-into-domain-modules.md` | 148 |
| `.scratch/architecture-stability/issues/29-cargo-workspace-and-core-crate.md` | 149 |
| `.scratch/architecture-stability/issues/30-move-core-tests-into-core-crate.md` | 150 |
| `.scratch/architecture-stability/issues/33-editor-package-deferred.md` | 151 |

## Not covered

- `.scratch/ios-app/`: the iOS proof of concept delivers only onto `feature/ios-poc`; it was left out.
- Folders created while the audit ran (`view-engine-fixes`, `view-editor`, `usage-telemetry`, `vault-mods`, and `tasks-view`, untracked at the time) were not migrated. They were cross-checked by title, by shared source files and by reading the closest Issues: two findings were dropped as covered by `view-engine-fixes` (see Closed), and four Issues here (34, 35, 55, 122) overlapped `tasks-view`; the owner closed them on 2026-11-06 in favor of the tasks-view Issues 02, 04, 06 and 20.
- Nothing was run: no test, build or manual check in the app. Findings that depend on the packaged app (asset protocol scope, fs capability, window close) were confirmed from config and code only.
