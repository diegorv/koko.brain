# ux-quick-wins

The design review of 2026-11-17 (`.scratch/design-review/review.md`, prototypes listed by `.scratch/design-review/index.html`) has 173 proposals in 12 groups. Four groups are ticketed elsewhere (`.scratch/finders-ux`, `.scratch/shell-sidebars-ux`). This folder takes the other eight groups (kanban, editor, collection and QueryJS, feedback and primitives, canvas, calendar and Tasks, settings and Auto Organize, colour and contrast; 119 proposals) and keeps only the small, low-risk UX polish that can ship soon.

Each proposal was classified against the code at `085b23c5d` by a scout (`research/scout-<slice>.md`) and an adversarial verdict (`research/verdict-<slice>.md`), combined in `research/breakdown.md` (old numbering) and checked by `research/coverage-check.md`. 103 proposals have a quick part; 16 are deferred whole (see `research/breakdown.md` "Deferred").

## Owner decisions (2026-11-18)

- Order by importance: daily surfaces first (editor, kanban, tables and QueryJS, canvas, Quick Capture), then by problem type (broken flow, wrong feedback, keyboard and a11y, visual). Risky or large work goes last.
- 01 (renaming a kanban lane silently resets its settings) is promoted to the top as a grave data bug.
- 42 to 46 write data through existing write paths. They stay tickets at the end and run only when the owner names them.
- Old ticket 47 (Undo for deleted Auto Organize rules and themes) is deferred.
- Every other question ships with its recommended default; each ticket's Comments name the defaults it uses.
- Open-itens 059 (New File from Template refuses a taken name) is the opposite design of 29 and stays open until the owner picks one.

## Tickets

| NN | Ticket | Size | Blocked by |
|----|--------|------|------------|
| | **Data bug promoted to the top** | | |
| 01 | [Renaming a kanban lane keeps its settings; new lanes get unique names](issues/01-renaming-kanban-lane-keeps-settings-new.md) | S | none |
| | **A. Daily surfaces, broken flows** | | |
| 02 | [Kanban keyboard shortcuts act only on the card you see; the sort menu is the themed Select](issues/02-kanban-keyboard-shortcuts-act-only-card.md) | S | 01 |
| 03 | [QueryJS tables: Prev and Next work, tables scroll, buttons show focus](issues/03-queryjs-tables-prev-next-work-tables.md) | S | none |
| 04 | [Canvas file and link cards: a plain click selects, an open button opens, previews skip frontmatter](issues/04-canvas-file-link-cards-plain-click.md) | M | none |
| 05 | [Kanban filter clears, resets per board, and a tag click filters](issues/05-kanban-filter-clears-resets-per-board.md) | S | 02 |
| 06 | [Canvas surfaces and overlays draw from theme tokens](issues/06-canvas-surfaces-overlays-draw-theme-tokens.md) | M | 04 |
| 07 | [Quick Capture says what it does and shows Saving (copy and state only)](issues/07-quick-capture-copy-saving-state.md) | S | none |
| 08 | [Live-preview widgets show failure and progress](issues/08-livepreview-widgets-show-failure-progress.md) | M | 03 |
| 09 | [Collection table: readable names, visible sort order, sticky header](issues/09-collection-table-readable-names-visible-sort.md) | M | none |
| | **B. Daily surfaces, usability** | | |
| 10 | [Kanban cards: no empty date row, clamped preview, growing editor](issues/10-kanban-cards-no-empty-date-row.md) | S | 05 |
| 11 | [Kanban lanes: visible add row, empty and filtered counts, collapsed rail](issues/11-kanban-lanes-visible-add-row-empty.md) | M | 05, 10 |
| 12 | [Kanban list, table and archive: named checks, clean cells, restore feedback](issues/12-kanban-list-table-archive-named-checks.md) | S | 05, 11 |
| 13 | [Callouts, headings and the meta-bind number field read cleanly](issues/13-callouts-headings-metabind-number-field-read.md) | S | 08 |
| 14 | [Inline collection block: readable table, built-in names, other-views hint](issues/14-inline-collection-block-readable-table-builtin.md) | S | 09, 13 |
| 15 | [Filter and Sort panels: visible conjunction and named remove buttons](issues/15-filter-sort-conjunction-names.md) | S | none |
| 16 | [Canvas handles show on selected nodes; image cards get 8 handles and real loading and error states](issues/16-canvas-handles-show-selected-nodes-image.md) | S | 06 |
| 17 | [The canvas context menu and pickers work from the keyboard and show Mac shortcut glyphs](issues/17-canvas-context-menu-pickers-work-keyboard.md) | S | 06 |
| 18 | [Note action bar: Mac glyph tooltips, and the width toggle says when it cannot work](issues/18-note-action-bar-mac-glyph-tooltips.md) | S | 17 |
| 19 | [Toasts follow the theme; Copy block link confirms](issues/19-toasts-follow-theme-copy-block-link.md) | S | none |
| 20 | [Keyboard focus shows at full strength; spinners and pulses respect Reduce motion](issues/20-keyboard-focus-shows-at-full-strength.md) | S | none |
| | **C. Less frequent areas** | | |
| 21 | [Settings number fields write only valid values and clamp on commit](issues/21-settings-number-fields-write-only-valid.md) | S | none |
| 22 | [Settings switches: dependents disable while their parent is off, and a switch that failed to start turns back off](issues/22-settings-switches-dependents-disable-while-parent.md) | S | none |
| 23 | [File History says what it compares and when something failed](issues/23-file-history-compares-something-failed.md) | M | 20 |
| 24 | [Calendar events say what you can do; the new-event form opens without an error](issues/24-calendar-events-say-you-can-do.md) | M | none |
| 25 | [Calendar time grid shows what is now and what is hidden](issues/25-calendar-time-grid-shows-now-hidden.md) | S | 24 |
| 26 | [Calendar month grid reads at a glance](issues/26-calendar-month-grid-reads-at-glance.md) | M | 24, 25 |
| 27 | [The Tasks toolbar and list say what they do](issues/27-tasks-toolbar-list-say-they-do.md) | M | none |
| 28 | [The Days mini month works narrow and by screen reader](issues/28-days-mini-month-works-narrow-by.md) | M | 26 |
| 29 | [The template picker names the template and what Enter will do](issues/29-template-picker-names-template-enter-will.md) | S | none |
| 30 | [The type name dialog stays open while it saves](issues/30-type-name-dialog-stays-open-while.md) | S | none |
| 31 | [Auto Organize section: honest copy, archive-off hint, save-failure toast, excluded folders with feedback, named controls](issues/31-auto-organize-section-honest-copy-archiveoff.md) | M | 21 |
| 32 | [Auto Organize rule row: stable property rows, template variables, named controls, Off state, focus on what you just added](issues/32-auto-organize-rule-row-stable-property.md) | M | 15, 31 |
| 33 | [Auto Organize property rows: verb mode labels, errors tied to their fields, the legacy icon only where set](issues/33-auto-organize-property-rows-verb-mode.md) | S | 32 |
| 34 | [The rule filter reads "When" with one "Add condition"](issues/34-rule-filter-reads-one-add-condition.md) | S | 15, 33 |
| 35 | [Appearance settings: theme rows ignore keys from their buttons, one catalog error with its reason, Install and apply, a theme editor that confirms discards and restores the theme on close](issues/35-appearance-settings-theme-rows-ignore-keys.md) | M | none |
| 36 | [Periodic Notes and 1:1: live path examples and missing-template marks](issues/36-periodic-notes-11-live-path-examples.md) | S | 22 |
| 37 | [Mods: each mod says what it does; the run view shows status and progress clearly](issues/37-mods-each-mod-run-view-shows.md) | S | none |
| 38 | [Settings: text you can select, the Todoist root row fits, the update button says it downloads](issues/38-settings-text-you-can-select-todoist.md) | S | none |
| | **D. Visual** | | |
| 39 | [Readable text on coloured fills and faded text in the note list and search](issues/39-readable-chips-faded-text.md) | M | 12 |
| 40 | [Default theme: a darker tab strip with a visible tab hover, bold and italic off the link blue](issues/40-default-theme-darker-tab-strip-visible.md) | S | 20, 39 |
| 41 | [Word count and graph stats read correctly for 0 and 1; graph mode buttons show their state](issues/41-word-count-graph-stats-read-correctly.md) | S | none |
| | **E. Risky: they write data, run only when the owner names them** | | |
| 42 | [Kanban cards move between lanes from the card menu](issues/42-kanban-cards-move-between-lanes-card.md) | S | 10, 11, 12 |
| 43 | [New canvas text cards open ready to type and cascade; Enter or F2 edits a selected card](issues/43-new-canvas-text-cards-open-ready.md) | S | 06, 16 |
| 44 | [Sort order can be changed from the keyboard](issues/44-sort-keyboard-reorder.md) | S | 15 |
| 45 | [Quick Capture keeps the draft until it is written, with Discard and a short hold](issues/45-quick-capture-draft-discard.md) | S | 07 |
| 46 | [Frontmatter reads as metadata in source mode](issues/46-frontmatter-reads-as-metadata-source-mode.md) | S | none |
| | **Waits on another feature** | | |
| 47 | [Calendars count undated notes; view tabs show their type](issues/47-calendars-count-undated-notes-view-tabs.md) | S | 09, 14 |

A "Blocked by" edge means the later ticket uses code the earlier one adds or edits the same file. 34, 39 and 47 also wait on shell-sidebars-ux Issues named in their "External dependency" section: do not launch them before those are done. "Size: M" tickets carry a split point.

## Replaced open-itens Issues

`.scratch/open-itens` is abandoned. Marked wontfix with a pointer: 049 (01), 050 (04), 195 and 196 (06), 197 (10), 213 (41), 201 (21), 217 (24), 155 (35).

## Not in this folder

The 16 deferred proposals (P41 P42 P141 P21 P93 P175 P07 P128 P51 P52 P67 P79 P125 P26 P27 P85) and the larger remainders of the quick-part proposals are listed in `research/breakdown.md` "Deferred". P174 (two unused `Separator` imports) went into `.scratch/shell-sidebars-ux/issues/06`.
