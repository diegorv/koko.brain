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
| 01 | [Renaming a kanban lane keeps its settings; new lanes get unique names](issues/01-renaming-kanban-lane-keeps-settings-new.md) | none | done | issue/01-renaming-kanban-lane-keeps-settings-new (0ac92a4d3) | 2026-11-18 |
| 02 | [Kanban keyboard shortcuts act only on the card you see; the sort menu is the themed Select](issues/02-kanban-keyboard-shortcuts-act-only-card.md) | 01 | done | issue/02-kanban-keyboard-shortcuts-act-only-card (4a2b167ad) | 2026-11-18 |
| 03 | [QueryJS tables: Prev and Next work, tables scroll, buttons show focus](issues/03-queryjs-tables-prev-next-work-tables.md) | none | done | issue/03-queryjs-tables-prev-next-work-tables (0c1205f8f) | 2026-11-18 |
| 04 | [Canvas file and link cards: a plain click selects, an open button opens, previews skip frontmatter](issues/04-canvas-file-link-cards-plain-click.md) | none | todo | | |
| 05 | [Kanban filter clears, resets per board, and a tag click filters](issues/05-kanban-filter-clears-resets-per-board.md) | 02 | done | issue/05-kanban-filter-clears-resets-per-board (de36eedfd) | 2026-11-18 |
| 06 | [Canvas surfaces and overlays draw from theme tokens](issues/06-canvas-surfaces-overlays-draw-theme-tokens.md) | 04 | todo | | |
| 07 | [Quick Capture says what it does and shows Saving (copy and state only)](issues/07-quick-capture-copy-saving-state.md) | none | done | issue/07-quick-capture-copy-saving-state (e7eeb2aed) | 2026-11-18 |
| 08 | [Live-preview widgets show failure and progress](issues/08-livepreview-widgets-show-failure-progress.md) | 03 | done | issue/08-livepreview-widgets-show-failure-progress (e118671bf) | 2026-11-18 |
| 09 | [Collection table: readable names, visible sort order, sticky header](issues/09-collection-table-readable-names-visible-sort.md) | none | done | issue/09-collection-table-readable-names-visible-sort (8611869b7) | 2026-11-18 |
| 10 | [Kanban cards: no empty date row, clamped preview, growing editor](issues/10-kanban-cards-no-empty-date-row.md) | 05 | done | issue/10-kanban-cards-no-empty-date-row (5c06e1aa7) | 2026-11-18 |
| 11 | [Kanban lanes: visible add row, empty and filtered counts, collapsed rail](issues/11-kanban-lanes-visible-add-row-empty.md) | 05, 10 | done | issue/11-kanban-lanes-visible-add-row-empty (8191a458c) | 2026-11-18 |
| 12 | [Kanban list, table and archive: named checks, clean cells, restore feedback](issues/12-kanban-list-table-archive-named-checks.md) | 05, 11 | done | issue/12-kanban-list-table-archive-named-checks (00dcb35b4) | 2026-11-18 |
| 13 | [Callouts, headings and the meta-bind number field read cleanly](issues/13-callouts-headings-metabind-number-field-read.md) | 08 | done | issue/13-callouts-headings-metabind-number-field-read (51497add3) | 2026-11-18 |
| 14 | [Inline collection block: readable table, built-in names, other-views hint](issues/14-inline-collection-block-readable-table-builtin.md) | 09, 13 | done | issue/14-inline-collection-block-readable-table-builtin (7bf8332b1) | 2026-11-18 |
| 15 | [Filter and Sort panels: visible conjunction and named remove buttons](issues/15-filter-sort-conjunction-names.md) | none | done | issue/15-filter-sort-conjunction-names (6a3c28e99) | 2026-11-18 |
| 16 | [Canvas handles show on selected nodes; image cards get 8 handles and real loading and error states](issues/16-canvas-handles-show-selected-nodes-image.md) | 06 | todo | | |
| 17 | [The canvas context menu and pickers work from the keyboard and show Mac shortcut glyphs](issues/17-canvas-context-menu-pickers-work-keyboard.md) | 06 | todo | | |
| 18 | [Note action bar: Mac glyph tooltips, and the width toggle says when it cannot work](issues/18-note-action-bar-mac-glyph-tooltips.md) | 17 | todo | | |
| 19 | [Toasts follow the theme; Copy block link confirms](issues/19-toasts-follow-theme-copy-block-link.md) | none | todo | | |
| 20 | [Keyboard focus shows at full strength; spinners and pulses respect Reduce motion](issues/20-keyboard-focus-shows-at-full-strength.md) | none | done | issue/20-keyboard-focus-shows-at-full-strength (70af959e5) | 2026-11-18 |
| 21 | [Settings number fields write only valid values and clamp on commit](issues/21-settings-number-fields-write-only-valid.md) | none | done | issue/21-settings-number-fields-write-only-valid (725b3f677) | 2026-11-18 |
| 22 | [Settings switches: dependents disable while their parent is off, and a switch that failed to start turns back off](issues/22-settings-switches-dependents-disable-while-parent.md) | none | done | issue/22-settings-switches-dependents-disable-while-parent (7adcde4d4) | 2026-11-18 |
| 23 | [File History says what it compares and when something failed](issues/23-file-history-compares-something-failed.md) | 20 | todo | | |
| 24 | [Calendar events say what you can do; the new-event form opens without an error](issues/24-calendar-events-say-you-can-do.md) | none | done | issue/24-calendar-events-say-you-can-do (bd8d1575b) | 2026-11-18 |
| 25 | [Calendar time grid shows what is now and what is hidden](issues/25-calendar-time-grid-shows-now-hidden.md) | 24 | done | issue/25-calendar-time-grid-shows-now-hidden (8856ffdbe) | 2026-11-18 |
| 26 | [Calendar month grid reads at a glance](issues/26-calendar-month-grid-reads-at-glance.md) | 24, 25 | done | issue/26-calendar-month-grid-reads-at-glance (115f190fc) | 2026-11-18 |
| 27 | [The Tasks toolbar and list say what they do](issues/27-tasks-toolbar-list-say-they-do.md) | none | done | issue/27-tasks-toolbar-list-say-they-do (765d89506) | 2026-11-18 |
| 28 | [The Days mini month works narrow and by screen reader](issues/28-days-mini-month-works-narrow-by.md) | 26 | todo | | |
| 29 | [The template picker names the template and what Enter will do](issues/29-template-picker-names-template-enter-will.md) | none | done | issue/29-template-picker-names-template-enter-will (e73578399) | 2026-11-18 |
| 30 | [The type name dialog stays open while it saves](issues/30-type-name-dialog-stays-open-while.md) | none | done | issue/30-type-name-dialog-stays-open-while (b544a38d9) | 2026-11-18 |
| 31 | [Auto Organize section: honest copy, archive-off hint, save-failure toast, excluded folders with feedback, named controls](issues/31-auto-organize-section-honest-copy-archiveoff.md) | 21 | todo | | |
| 32 | [Auto Organize rule row: stable property rows, template variables, named controls, Off state, focus on what you just added](issues/32-auto-organize-rule-row-stable-property.md) | 15, 31 | todo | | |
| 33 | [Auto Organize property rows: verb mode labels, errors tied to their fields, the legacy icon only where set](issues/33-auto-organize-property-rows-verb-mode.md) | 32 | todo | | |
| 34 | [The rule filter reads "When" with one "Add condition"](issues/34-rule-filter-reads-one-add-condition.md) | 15, 33 | todo | | |
| 35 | [Appearance settings: theme rows ignore keys from their buttons, one catalog error with its reason, Install and apply, a theme editor that confirms discards and restores the theme on close](issues/35-appearance-settings-theme-rows-ignore-keys.md) | none | todo | | |
| 36 | [Periodic Notes and 1:1: live path examples and missing-template marks](issues/36-periodic-notes-11-live-path-examples.md) | 22 | done | issue/36-periodic-notes-11-live-path-examples (632893c70) | 2026-11-18 |
| 37 | [Mods: each mod says what it does; the run view shows status and progress clearly](issues/37-mods-each-mod-run-view-shows.md) | none | in-progress | | |
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
- 2026-11-18 13:47 — 03 — deliver — merged after review round 1 APPROVED (claude); one nit rejected, no code changed in deliver; full vitest suite passed (17383 tests) — 0c1205f8f
- 2026-11-18 13:47 — 08 — start — launched by /relay-lite:run — 7566f1272
- 2026-11-18 14:03 — 08 — deliver — merged after review 1 APPROVED with findings, fix round (copy label timer restart, test DOM cleanup), re-review 2 APPROVED (claude); full vitest suite passed (17397 tests); owner eye check criterion still open — e118671bf
- 2026-11-18 14:04 — 13 — start — launched by /relay-lite:run — 1d46dd5d6
- 2026-11-18 14:22 — 13 — deliver — merged after review 1 APPROVED, fix round (meta-bind rule pin, --cm-lp-callout-accent rename for theme-css-contract), re-review 2 APPROVED (claude); full vitest suite passed on second run (17409 tests); owner eye check in WKWebView still open — 51497add3
- 2026-11-18 14:23 — 09 — start — launched by /relay-lite:run — 66030ac65
- 2026-11-18 14:38 — 09 — deliver — merged after review 1 APPROVED, fix round (sortState computed once per header), re-review 2 APPROVED (claude); full vitest suite passed (17440 tests); manual sticky-header check with 60+ rows still open — 8611869b7
- 2026-11-18 14:38 — 14 — start — launched by /relay-lite:run — 1476dbf87
- 2026-11-18 14:53 — 14 — deliver — merged after review 1 APPROVED with findings, fix round (DATE_TEXT matches only a whole date or datetime; selector pin loosening rejected), re-review 2 APPROVED (claude); full vitest suite passed (17456 tests) — 7bf8332b1
- 2026-11-18 14:53 — 07 — start — launched by /relay-lite:run — 72c8352db
- 2026-11-18 15:03 — 07 — deliver — merged after review 1 APPROVED, fix round (late-reject test pins Saving... and default hint after summon; aria-live rejected for later), re-review 2 APPROVED (claude); full vitest suite passed (17462 tests) — e7eeb2aed
- 2026-11-18 15:03 — 29 — start — launched by /relay-lite:run — b98cfbb37
- 2026-11-18 15:15 — 29 — deliver — merged after review 1 APPROVED with findings, fix round (held Backspace stays in naming step, NFC-folded existing-note check; ../ vault escape moved to follow-up Issue 48), re-review 2 APPROVED (claude); full vitest suite passed (17482 tests) — e73578399
- 2026-11-18 15:16 — 30 — start — launched by /relay-lite:run — 2c78821ba
- 2026-11-18 15:27 — 30 — deliver — merged after review 1 CHANGES_REQUESTED, fix round (double-Enter test exercises the busy guard), re-review 2 APPROVED (claude); full vitest suite passed (17491 tests) — b544a38d9
- 2026-11-18 15:28 — 24 — start — launched by /relay-lite:run — 9a3957add
- 2026-11-18 15:53 — 24 — deliver — merged after review 1 APPROVED with findings, fix round (read-only events, reserved title-message row in the event form), re-review 2 APPROVED (claude), one nit accepted as intended; full vitest suite passed (17503 tests), event-calendar E2E passed — bd8d1575b
- 2026-11-18 15:53 — 27 — start — launched by /relay-lite:run — a6d1691de
- 2026-11-18 16:16 — 27 — deliver — merged after review 1 CHANGES_REQUESTED, fix round (note header truncates folder first, context-row left rule test), re-review 2 APPROVED (claude); full vitest suite passed (17511 tests); by-eye check at 420 and 800 px still open — 765d89506
- 2026-11-18 16:16 — 01 — start — launched by /relay-lite:run — d2a981915
- 2026-11-18 16:27 — 01 — deliver — merged after review 1 APPROVED with findings, fix round (renameLane reads only an own settings key), re-review 2 APPROVED (claude); full vitest suite passed (17527 tests) — 0ac92a4d3
- 2026-11-18 16:49 — 02 — start — launched by /relay-lite:run — df325826f
- 2026-11-18 17:03 — 02 — deliver — merged after review 1 APPROVED with 4 findings, fix round (board keys skip collapsed-lane cards, comment and import fixes), re-review 2 APPROVED (claude); full vitest suite passed (17543 tests) — 4a2b167ad
- 2026-11-18 17:03 — 05 — start — launched by /relay-lite:run — c59f1937a
- 2026-11-18 17:17 — 05 — deliver — merged after review 1 APPROVED with findings, fix round (tab-switch test uses a real card edit, help text on filter clearing; swatch keyboard gap left for the radiogroup follow-up), re-review 2 APPROVED (claude); full vitest suite passed (17555 tests) — de36eedfd
- 2026-11-18 17:18 — 10 — start — launched by /relay-lite:run — 457e600eb
- 2026-11-18 17:32 — 10 — deliver — merged after review 1 CHANGES_REQUESTED, fix round, re-review 2 APPROVED (claude); full vitest suite passed (17569 tests) — 5c06e1aa7
- 2026-11-18 17:32 — 11 — start — launched by /relay-lite:run — 58d10c28e
- 2026-11-18 17:46 — 11 — deliver — merged after review 1 APPROVED with minor findings, fix round (lane count sr-only label, rail double-click test), re-review 2 APPROVED (claude); full vitest suite passed (17583 tests) — 8191a458c
- 2026-11-18 17:47 — 12 — start — launched by /relay-lite:run — eab1431e9
- 2026-11-18 17:56 — 12 — deliver — merged after review 1 APPROVED, fix round (help restore toast placeholder; restoreItem guard rejected), re-review 2 APPROVED (claude); full vitest suite passed (17591 tests) — 00dcb35b4
- 2026-11-18 17:57 — 15 — start — launched by /relay-lite:run — c0377cab6
- 2026-11-18 18:06 — 15 — deliver — merged after review 1 APPROVED with 3 nits, fix round (attribute layout, chevron test; w-fit kept), re-review 2 APPROVED (claude); full vitest suite passed (17600 tests) — 6a3c28e99
- 2026-11-18 18:06 — 20 — start — launched by /relay-lite:run — bff7c04b2
- 2026-11-18 18:19 — 20 — deliver — merged after review 1 APPROVED with findings, fix round (test doc comments and E2E pointer), re-review 2 APPROVED (claude); full vitest suite passed (17609 tests) — 70af959e5
- 2026-11-18 18:19 — 21 — start — launched by /relay-lite:run — 66b7cd38d
- 2026-11-18 18:29 — 21 — deliver — merged after review 1 APPROVED, fix round (content-width clamp test starts from a stored 800), re-review 2 APPROVED (claude); full vitest suite passed (17620 tests) — 725b3f677
- 2026-11-18 18:29 — 22 — start — launched by /relay-lite:run — 8a52acc9c
- 2026-11-18 18:40 — 22 — deliver — merged after review 1 APPROVED, fix round (LabsSection stops the mods host before writing the flag off), re-review 2 APPROVED (claude) with one rare-case nit left; full vitest suite passed (17634 tests) — 7adcde4d4
- 2026-11-18 18:40 — 25 — start — launched by /relay-lite:run — 9fa660b19
- 2026-11-18 18:54 — 25 — deliver — merged after review 1 APPROVED with one nit, fix round (scroll test fakes the date), re-review 2 APPROVED (claude); full vitest suite passed (17649 tests) — 8856ffdbe
- 2026-11-18 18:54 — 26 — start — launched by /relay-lite:run — a6ac1d10a
- 2026-11-18 19:15 — 26 — deliver — merged after review 1 APPROVED with 2 findings (left with reasons; light-theme boundary for owner), deliver fix for chrome focus-rule test (focus-within on daily-note button), re-review 2 APPROVED (claude); full vitest suite passed on second run (17658 tests) — 115f190fc
- 2026-11-18 19:15 — 36 — start — launched by /relay-lite:run — 3ae4a44cd
- 2026-11-18 19:27 — 36 — deliver — merged after review 1 APPROVED with findings, fix round (isTemplateMissing JSDoc limits, shared PeriodType, aria-describedby on format and template inputs), re-review 2 APPROVED (claude); full vitest suite passed (17680 tests) — 632893c70
- 2026-11-18 19:27 — 37 — start — launched by /relay-lite:run — 8f1ccf14a
