# Ledger: ux-quick-wins

This file is the source of truth for the progress of the ux-quick-wins Issues. Read it before working on any of them. It is written only by `/relay-lite:run`, through `relay ledger`: never edit it by hand.

## Continue

```text
/relay-lite:run ux-quick-wins
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
| 01 | [Renaming a kanban lane keeps its settings; new lanes get unique names](issues/01-renaming-kanban-lane-keeps-settings-new.md) | none | todo | | |
| 02 | [Kanban keyboard shortcuts act only on the card you see; the sort menu is the themed Select](issues/02-kanban-keyboard-shortcuts-act-only-card.md) | 01 | todo | | |
| 03 | [QueryJS tables: Prev and Next work, tables scroll, buttons show focus](issues/03-queryjs-tables-prev-next-work-tables.md) | none | in-progress | | |
| 04 | [Canvas file and link cards: a plain click selects, an open button opens, previews skip frontmatter](issues/04-canvas-file-link-cards-plain-click.md) | none | todo | | |
| 05 | [Kanban filter clears, resets per board, and a tag click filters](issues/05-kanban-filter-clears-resets-per-board.md) | 02 | todo | | |
| 06 | [Canvas surfaces and overlays draw from theme tokens](issues/06-canvas-surfaces-overlays-draw-theme-tokens.md) | 04 | todo | | |
| 07 | [Quick Capture says what it does and shows Saving (copy and state only)](issues/07-quick-capture-copy-saving-state.md) | none | todo | | |
| 08 | [Live-preview widgets show failure and progress](issues/08-livepreview-widgets-show-failure-progress.md) | 03 | todo | | |
| 09 | [Collection table: readable names, visible sort order, sticky header](issues/09-collection-table-readable-names-visible-sort.md) | none | todo | | |
| 10 | [Kanban cards: no empty date row, clamped preview, growing editor](issues/10-kanban-cards-no-empty-date-row.md) | 05 | todo | | |
| 11 | [Kanban lanes: visible add row, empty and filtered counts, collapsed rail](issues/11-kanban-lanes-visible-add-row-empty.md) | 05, 10 | todo | | |
| 12 | [Kanban list, table and archive: named checks, clean cells, restore feedback](issues/12-kanban-list-table-archive-named-checks.md) | 05, 11 | todo | | |
| 13 | [Callouts, headings and the meta-bind number field read cleanly](issues/13-callouts-headings-metabind-number-field-read.md) | 08 | todo | | |
| 14 | [Inline collection block: readable table, built-in names, other-views hint](issues/14-inline-collection-block-readable-table-builtin.md) | 09, 13 | todo | | |
| 15 | [Filter and Sort panels: visible conjunction and named remove buttons](issues/15-filter-sort-conjunction-names.md) | none | todo | | |
| 16 | [Canvas handles show on selected nodes; image cards get 8 handles and real loading and error states](issues/16-canvas-handles-show-selected-nodes-image.md) | 06 | todo | | |
| 17 | [The canvas context menu and pickers work from the keyboard and show Mac shortcut glyphs](issues/17-canvas-context-menu-pickers-work-keyboard.md) | 06 | todo | | |
| 18 | [Note action bar: Mac glyph tooltips, and the width toggle says when it cannot work](issues/18-note-action-bar-mac-glyph-tooltips.md) | 17 | todo | | |
| 19 | [Toasts follow the theme; Copy block link confirms](issues/19-toasts-follow-theme-copy-block-link.md) | none | todo | | |
| 20 | [Keyboard focus shows at full strength; spinners and pulses respect Reduce motion](issues/20-keyboard-focus-shows-at-full-strength.md) | none | todo | | |
| 21 | [Settings number fields write only valid values and clamp on commit](issues/21-settings-number-fields-write-only-valid.md) | none | todo | | |
| 22 | [Settings switches: dependents disable while their parent is off, and a switch that failed to start turns back off](issues/22-settings-switches-dependents-disable-while-parent.md) | none | todo | | |
| 23 | [File History says what it compares and when something failed](issues/23-file-history-compares-something-failed.md) | 20 | todo | | |
| 24 | [Calendar events say what you can do; the new-event form opens without an error](issues/24-calendar-events-say-you-can-do.md) | none | todo | | |
| 25 | [Calendar time grid shows what is now and what is hidden](issues/25-calendar-time-grid-shows-now-hidden.md) | 24 | todo | | |
| 26 | [Calendar month grid reads at a glance](issues/26-calendar-month-grid-reads-at-glance.md) | 24, 25 | todo | | |
| 27 | [The Tasks toolbar and list say what they do](issues/27-tasks-toolbar-list-say-they-do.md) | none | todo | | |
| 28 | [The Days mini month works narrow and by screen reader](issues/28-days-mini-month-works-narrow-by.md) | 26 | todo | | |
| 29 | [The template picker names the template and what Enter will do](issues/29-template-picker-names-template-enter-will.md) | none | todo | | |
| 30 | [The type name dialog stays open while it saves](issues/30-type-name-dialog-stays-open-while.md) | none | todo | | |
| 31 | [Auto Organize section: honest copy, archive-off hint, save-failure toast, excluded folders with feedback, named controls](issues/31-auto-organize-section-honest-copy-archiveoff.md) | 21 | todo | | |
| 32 | [Auto Organize rule row: stable property rows, template variables, named controls, Off state, focus on what you just added](issues/32-auto-organize-rule-row-stable-property.md) | 15, 31 | todo | | |
| 33 | [Auto Organize property rows: verb mode labels, errors tied to their fields, the legacy icon only where set](issues/33-auto-organize-property-rows-verb-mode.md) | 32 | todo | | |
| 34 | [The rule filter reads "When" with one "Add condition"](issues/34-rule-filter-reads-one-add-condition.md) | 15, 33 | todo | | |
| 35 | [Appearance settings: theme rows ignore keys from their buttons, one catalog error with its reason, Install and apply, a theme editor that confirms discards and restores the theme on close](issues/35-appearance-settings-theme-rows-ignore-keys.md) | none | todo | | |
| 36 | [Periodic Notes and 1:1: live path examples and missing-template marks](issues/36-periodic-notes-11-live-path-examples.md) | 22 | todo | | |
| 37 | [Mods: each mod says what it does; the run view shows status and progress clearly](issues/37-mods-each-mod-run-view-shows.md) | none | todo | | |
| 38 | [Settings: text you can select, the Todoist root row fits, the update button says it downloads](issues/38-settings-text-you-can-select-todoist.md) | none | todo | | |
| 39 | [Readable text on coloured fills and faded text in the note list and search](issues/39-readable-chips-faded-text.md) | 12 | todo | | |
| 40 | [Default theme: a darker tab strip with a visible tab hover, bold and italic off the link blue](issues/40-default-theme-darker-tab-strip-visible.md) | 20, 39 | todo | | |
| 41 | [Word count and graph stats read correctly for 0 and 1; graph mode buttons show their state](issues/41-word-count-graph-stats-read-correctly.md) | none | todo | | |
| 42 | [Kanban cards move between lanes from the card menu](issues/42-kanban-cards-move-between-lanes-card.md) | 10, 11, 12 | todo | | |
| 43 | [New canvas text cards open ready to type and cascade; Enter or F2 edits a selected card](issues/43-new-canvas-text-cards-open-ready.md) | 06, 16 | todo | | |
| 44 | [Sort order can be changed from the keyboard](issues/44-sort-keyboard-reorder.md) | 15 | todo | | |
| 45 | [Quick Capture keeps the draft until it is written, with Discard and a short hold](issues/45-quick-capture-draft-discard.md) | 07 | todo | | |
| 46 | [Frontmatter reads as metadata in source mode](issues/46-frontmatter-reads-as-metadata-source-mode.md) | none | todo | | |
| 47 | [Calendars count undated notes; view tabs show their type](issues/47-calendars-count-undated-notes-view-tabs.md) | 09, 14 | todo | | |

## Log

- 2026-11-18 13:30 — ledger created (47 Issues)
- 2026-11-18 13:34 — 03 — start — launched by /relay-lite:run — e69c32d7f
