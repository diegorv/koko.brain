# Ledger: shell-sidebars-ux

This file is the source of truth for the progress of the shell-sidebars-ux Issues. Read it before working on any of them. It is written only by `/relay-lite:run`, through `relay ledger`: never edit it by hand.

## Continue

```text
/relay-lite:run shell-sidebars-ux
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
| 01 | [Palette commands toggle each right sidebar panel and open Trash](issues/01-palette-right-panel-toggles-trash.md) | none | done | issue/01-palette-right-panel-toggles-trash (205a3fd9e) | 2026-11-18 |
| 02 | [Calmer status bar: 24px, no pulse, a save slot that does not shift](issues/02-status-bar-calm-save-slot.md) | none | in-progress | | |
| 03 | [My people reads as a feature: setup button, "Nd ago", overdue icon, row ring](issues/03-my-people-setup-ago-overdue.md) | none | todo | | |
| 04 | [A refused property rename reverts and says why; list chips edit in place and an empty list shows "+ Add"](issues/04-property-rename-refusal-list-chips.md) | none | todo | | |
| 05 | [Right sidebar headers stay pinned with a Hide panel menu; Properties collapses and is remembered; Info uses the shared header with short dates](issues/05-right-sidebar-pinned-headers-hide-menu.md) | 01 | todo | | |
| 06 | [Backlinks and Outgoing links stay open, always show the open note's links, and backlink rows show folder and a plain snippet](issues/06-backlinks-outgoing-stay-open-readable-rows.md) | 05 | todo | | |
| 07 | [Outgoing links: only missing targets are broken, two-line rows, a Broken links group whose rows create the note](issues/07-outgoing-broken-links-group.md) | 06 | todo | | |
| 08 | [Table of contents: no decorative chevrons, the current heading follows the editor, and a Go to heading picker](issues/08-toc-current-heading-go-to-heading.md) | none | todo | | |
| 09 | [Relationships: only kinds with links, one Add relationship row, a keyboard picker with recent notes first](issues/09-relationships-add-row-keyboard-picker.md) | none | todo | | |
| 10 | [Untyped notes get a Set type row, Add property asks for a name and a type, and the property icon opens a lossless type menu](issues/10-set-type-typed-add-type-menu.md) | 04 | todo | | |
| 11 | [Property rows stack key over value in a narrow sidebar](issues/11-property-rows-stack-narrow.md) | 04, 10 | todo | | |
| 12 | [The rail note list says why it is empty and what to do next](issues/12-note-list-empty-states-cause.md) | none | todo | | |
| 13 | [Files header gets a "+" menu, and every creator says "New <kind>"](issues/13-files-plus-menu-new-kind.md) | none | todo | | |
| 14 | [Folder-lens rows stop repeating the folder; the Files tree puts system folders last and muted, with direct file counts](issues/14-folder-rows-system-folders-counts.md) | 13 | todo | | |
| 15 | [One note-actions group in the row menu, the More menu and the palette, with a one-click Mark organized on Inbox rows](issues/15-note-actions-group-inbox-organized.md) | 12, 14 | todo | | |
| 16 | [Filters show their count and can be cleared; the .view tab's triggers are named single buttons; an empty table says filters hid its rows](issues/16-filters-count-clear-view-triggers.md) | 12 | todo | | |
| 17 | [Note-list header: one Display popover, a state dot, and "+" visible down to 150 px](issues/17-note-list-display-popover.md) | 16 | todo | | |
| 18 | [Shared roving-list util and arrow keys in Search results](issues/18-roving-list-search-arrows.md) | none | todo | | |
| 19 | [Rail note list: one Tab stop, arrow keys, focus follows removals and rename](issues/19-rail-note-list-keyboard.md) | 12, 15, 18 | todo | | |
| 20 | [Palette "Go to X" lands focus in the note list, and "New note here" becomes a command](issues/20-palette-go-to-focus-new-note-here.md) | 13, 19 | todo | | |
| 21 | [The tab strip shows what is off screen, tabs shrink, and the sidebar toggle stops covering them](issues/21-tab-strip-overflow-shrink.md) | none | todo | | |
| 22 | [Tabs can be dragged to reorder, show their full path on hover, and markdown labels drop .md](issues/22-tab-drag-path-tooltip-no-md.md) | 21 | todo | | |
| 23 | [Tab menu: Close others, Close to the right, and the shared note-actions group](issues/23-tab-menu-close-others-note-actions.md) | 15, 22 | todo | | |
| 24 | [Clickable breadcrumb with type and folder crumbs and no .md, plus Reveal in note list](issues/24-breadcrumb-reveal-in-note-list.md) | none | todo | | |
| 25 | [Kanban, .view and canvas tabs get a title row with their own controls; source mode is per tab](issues/25-view-title-row-per-tab-source.md) | 16 | todo | | |
| 26 | [The empty editor becomes a launch point and drops the empty right sidebar](issues/26-empty-editor-launch-point.md) | none | todo | | |
| 27 | [Zoom shows a chip and is remembered on this machine](issues/27-zoom-chip-remembered.md) | none | todo | | |
| 28 | [Switch vaults from inside a vault: palette commands, Cmd+Shift+O and a File menu](issues/28-switch-vaults-menu.md) | none | todo | | |
| 29 | [The day navigator stops being called Calendar, and Tasks, Graph and Tags get rail entries that open their tab](issues/29-days-rename-rail-entries.md) | none | todo | | |
| 30 | [Direct keys for rail items](issues/30-rail-direct-keys.md) | 29 | todo | | |
| 31 | [Note-list rows open in the active tab and record a per-tab history](issues/31-open-in-active-tab-history.md) | none | todo | | |
| 32 | [Back and Forward: keys, palette, action bar, mouse buttons](issues/32-back-forward.md) | 31 | todo | | |
| 33 | [Links follow in the active tab; the open-link modifier opens a new tab](issues/33-links-follow-active-tab.md) | 06, 07, 31 | todo | | |
| 34 | [One pane-band utility for the ten top-band copies (land last)](issues/34-pane-band-utility.md) | 17, 18, 21, 25, 26, 29 | todo | | |

## Log

- 2026-11-18 02:21 — ledger created (34 Issues)
- 2026-11-18 02:22 — 01 — start — launched by /relay-lite:run — 905af7c93
- 2026-11-18 02:33 — 01 — deliver — two review rounds APPROVED (round 1 findings fixed in help docs); full suite 646 files, 17122 passed; squashed and pushed — 205a3fd9e
- 2026-11-18 02:34 — 02 — start — launched by /relay-lite:run — f5d93bc87
