# Ledger: ux-polish

This file is the source of truth for the progress of the ux-polish Issues. Read it before working on any of them. It is written only by `/relay-lite:run`, through `relay ledger`: never edit it by hand.

## Continue

```text
/relay-lite:run ux-polish
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
| 01 | [Quick Capture keeps the typed text when the save fails](issues/01-quick-capture-keeps-text-on-failed-save.md) | none | todo | | |
| 02 | [Retention days and Debounce delay accept typed values and clamp on commit](issues/02-settings-number-fields-clamp-on-change.md) | none | todo | | |
| 03 | [Enter in the quick switcher creates the note when nothing matches](issues/03-quick-switcher-enter-creates-on-no-match.md) | none | todo | | |
| 04 | [Right-clicking inside a selection in the editor keeps it](issues/04-editor-right-click-keeps-selection.md) | none | todo | | |
| 05 | [The editor context menu offers Cut, Copy, Paste and Select all](issues/05-editor-context-menu-clipboard-items.md) | 04 | todo | | |
| 06 | [Backlinks and Outgoing links show a load error with Retry, not an empty message](issues/06-link-panels-show-load-error.md) | none | todo | | |
| 07 | [The active editor tab scrolls into view, and all tabs share one height](issues/07-active-tab-scrolls-into-view.md) | none | todo | | |
| 08 | [Theme color fixes: calendar grid, meta-bind focus, Lavender H1 and a success token](issues/08-theme-color-fixes.md) | none | done | issue/08-theme-color-fixes (4940d7ffc) | 2026-11-04 |
| 10 | [The Settings drawer ends at the status bar instead of covering it](issues/10-settings-drawer-above-status-bar.md) | none | todo | | |
| 11 | [The New event dialog shows "Enter a title." only after the title was touched](issues/11-event-title-error-after-touch.md) | none | todo | | |
| 12 | [Word count and graph stats read correctly for zero and one](issues/12-word-count-and-graph-stats-counts.md) | none | todo | | |
| 13 | [The Tags view explains when the rare-tag filter hides everything](issues/13-tags-filtered-empty-state.md) | none | todo | | |
| 14 | [The Search panel stops repeating the index status the status bar already shows](issues/14-search-panel-drops-duplicate-index-status.md) | none | todo | | |
| 15 | [Hovering the open note keeps its fill, and the kanban lane grip appears on lane hover](issues/15-hover-keeps-active-row-and-lane-grip.md) | none | todo | | |
| 16 | [The radius ladder gains `xs` and runtime variables, held by a radius ratchet](issues/16-radius-ladder-xs-and-runtime-variables.md) | none | in-progress | | |
| 17 | [Left-sidebar list rows use the same 8px corner as the rail and right sidebar](issues/17-sidebar-row-radius.md) | 16 | todo | | |
| 18 | [Bare `rounded` becomes `rounded-xs` everywhere, with no pixel change](issues/18-bare-rounded-to-rounded-xs.md) | 16, 17 | todo | | |
| 19 | [Floating surfaces lift: theme-aware shadow, ring and scrim tokens](issues/19-elevation-shadow-ring-scrim-tokens.md) | none | in-progress | | |
| 20 | [Lavender Haze menus and popovers sit above the page instead of matching content blocks](issues/20-lavender-popover-surface.md) | 19 | todo | | |
| 21 | [Default theme overlays sit one step above the editor, and dialogs share the popover surface](issues/21-default-popover-and-dialog-surface.md) | 19, 20 | todo | | |
| 22 | [Live-preview blocks, controls and chips use the radius ladder](issues/22-live-preview-widget-radius.md) | 16 | todo | | |
| 23 | [Editor autocomplete, tooltips and the callout type menu look like the app's menus](issues/23-editor-overlay-chrome-on-menu-tokens.md) | 16, 19, 22 | todo | | |
| 24 | [Settings text fields use the shadcn Input, and heading weight uses the shadcn Select](issues/24-settings-text-fields-use-shadcn-input-and-select.md) | none | todo | | |
| 25 | [Setting rows size the control column by its content, with a stacked layout for wide values](issues/25-setting-item-content-sized-control-column.md) | 24 | todo | | |
| 26 | [Help text that belongs to a settings row sits inside that row](issues/26-setting-item-hint-prop.md) | 25 | todo | | |
| 27 | [Settings actions use the shadcn Button, and theme card actions show on keyboard focus](issues/27-settings-buttons-use-shadcn-button.md) | 25 | todo | | |
| 28 | [Settings drawer sits above the status bar, with one header band, a real close button and a distinct selected nav item](issues/28-settings-drawer-chrome.md) | 10 | todo | | |
| 29 | [Opening Settings moves focus into the drawer, and closing returns it](issues/29-settings-drawer-focus-move-and-return.md) | 28 | todo | | |
| 30 | [Settings is modal: a scrim closes it on outside click and Tab stays inside (assumes owner decision)](issues/30-settings-drawer-modal-scrim.md) | 29 | todo | | |
| 31 | [Troubleshooting shows readable decorator names under one group, with copy that matches what the switches do](issues/31-troubleshooting-readable-decorator-labels.md) | none | todo | | |
| 32 | [Both inbox badges live on the Rail page, build info shows once, and Sentry moves to Advanced (assumes owner decision)](issues/32-settings-ia-badges-build-info-sentry.md) | 25 | todo | | |
| 33 | [Settings copy drops library names, model IDs and em dashes, and labels use sentence case](issues/33-settings-copy-pass.md) | 26, 27 | todo | | |
| 34 | [Overlays fade and zoom in and out (tw-animate-css)](issues/34-overlay-motion-on.md) | none | blocked | | |
| 35 | [Overlays and the Settings drawer stop animating when the OS asks for reduced motion](issues/35-reduced-motion-overlays-and-settings.md) | 34 | todo | | |
| 36 | [Focus falls back to the theme ring color, and dialogs do not draw a focus box around themselves](issues/36-focus-fallback-and-dialog-outline.md) | none | todo | | |
| 37 | [Chrome buttons and rows show the app's focus-visible ring](issues/37-chrome-focus-visible-ring.md) | 36 | todo | | |
| 38 | [Native confirmation dialogs name the action instead of Yes and No](issues/38-confirm-verb-labels.md) | none | todo | | |
| 39 | [The active theme, not the macOS appearance, decides dark mode](issues/39-theme-drives-dark-mode.md) | none | todo | | |
| 40 | [Toasts and the editor's CodeMirror base follow the theme mode](issues/40-toasts-and-editor-follow-theme-mode.md) | 39 | todo | | |
| 41 | [The theme contrast guard reads oklch, so Default's muted sidebar text reaches 4.5:1](issues/41-contrast-guard-reads-oklch.md) | none | todo | | |
| 43 | [Canvas nodes, edges and grid draw from theme tokens, so they show on light themes](issues/43-canvas-surface-theme-tokens.md) | none | todo | | |
| 44 | [Canvas menus, pickers and edge labels use theme tokens](issues/44-canvas-overlay-theme-tokens.md) | 43 | todo | | |
| 45 | [The graph view paints with the active theme's colors](issues/45-graph-view-theme-palette.md) | 39 | todo | | |
| 47 | [Kanban date proximity has one token-based map, and done cards drop it](issues/47-kanban-proximity-token-map.md) | none | todo | | |
| 48 | [Status colors use theme tokens, and a test forbids raw palette classes](issues/48-status-colors-use-tokens.md) | 08, 47 | todo | | |
| 49 | [The note action bar drops duplicated controls and folds rare actions into More](issues/49-note-action-bar-trim.md) | none | todo | | |
| 50 | [Second-row toolbars share one height and divider, and only the first pane keeps the traffic-light inset](issues/50-pane-toolbar-band.md) | none | todo | | |
| 51 | [The note list header keeps its title readable](issues/51-note-list-header-readable.md) | 50 | todo | | |
| 52 | [Right sidebar sections share one header recipe and one left edge](issues/52-right-sidebar-sections.md) | none | todo | | |
| 53 | [The right sidebar hides on kanban, canvas and view tabs](issues/53-right-sidebar-non-note-tabs.md) | none | todo | | |
| 54 | [The tab strip shows overflow and hides the .md extension](issues/54-tab-strip-overflow.md) | 07 | todo | | |
| 55 | [Live preview draws no active-line slab above the note title](issues/55-no-active-line-slab.md) | none | todo | | |
| 56 | [The command palette shows dense one-line rows with key hints](issues/56-command-palette-density.md) | none | todo | | |
| 57 | [Menu items share one anatomy](issues/57-menu-item-anatomy.md) | none | todo | | |
| 58 | [Dialogs share one anatomy: visible title, built-in close, bounded height](issues/58-dialog-anatomy.md) | 36 | todo | | |
| 59 | [EmptyState, InlineAlert and Badge primitives exist](issues/59-empty-error-badge-primitives.md) | none | todo | | |
| 60 | [Sidebar panels and settings use the empty and error primitives](issues/60-panels-use-empty-error-primitives.md) | 59 | todo | | |
| 61 | [Graph, canvas, collection and kanban views show real empty and error states](issues/61-views-empty-error-states.md) | 59 | todo | | |
| 62 | [The collection table reads as a table](issues/62-collection-table-readable.md) | none | todo | | |
| 63 | [Kanban cards drop the empty date row until hover or focus](issues/63-kanban-card-quiet.md) | 47 | todo | | |
| 64 | [Each theme uses one heading hue ramp](issues/64-heading-hue-ramp.md) | 08 | todo | | |
| 65 | [Editor tables no longer reserve width for hover controls](issues/65-editor-table-width.md) | none | todo | | |
| 66 | [Chrome icon buttons share sizes and use shadcn tooltips](issues/66-chrome-icon-buttons.md) | 37 | todo | | |
| 67 | [Hover-only controls also appear on keyboard focus](issues/67-hover-controls-on-focus.md) | 37 | todo | | |
| 68 | [Relationship and kanban wikilink pickers navigate with arrow keys](issues/68-pickers-arrow-keys.md) | none | todo | | |
| 69 | [Graph controls and the event dialog use shadcn Select, Switch and Checkbox](issues/69-native-controls-to-shadcn.md) | none | todo | | |
| 70 | [Settings groups render as cards with dividers](issues/70-settings-grouped-cards.md) | 25 | todo | | |
| 71 | [Search results and link rows reserve a gutter for their hover actions](issues/71-hover-action-gutter.md) | none | todo | | |
| 72 | [The Default theme drops its Catppuccin preview overrides](issues/72-default-theme-drop-preview-overrides.md) | 41 | todo | | |

## Log

- 2026-11-04 18:40 — ledger created (69 Issues)
- 2026-11-04 18:41 — 08 — start — launched by /relay-lite:run — 3d80b731b
- 2026-11-04 18:53 — 16 — start — launched by /relay-lite:run — 9791226e5
- 2026-11-04 18:53 — 34 — start — launched by /relay-lite:run — 9791226e5
- 2026-11-04 19:06 — 08 — deliver — merged after 2 APPROVED rounds (claude); full suite 11669 passed; 2 manual two-theme checks left for owner — 4940d7ffc
- 2026-11-04 19:06 — 19 — start — launched by /relay-lite:run — 957efd66e
- 2026-11-04 19:15 — 34 — deliver — blocked: pnpm cannot reach the npm registry (error 23 / ECONNRESET) so pnpm add tw-animate-css failed; curl and npm reach it — 677ad897d
