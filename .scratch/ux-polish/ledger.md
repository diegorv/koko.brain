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
| 01 | [Quick Capture keeps the typed text when the save fails](issues/01-quick-capture-keeps-text-on-failed-save.md) | none | done | issue/01-quick-capture-keeps-text-on-failed-save (df6b5f190) | 2026-11-04 |
| 02 | [Retention days and Debounce delay accept typed values and clamp on commit](issues/02-settings-number-fields-clamp-on-change.md) | none | todo | | |
| 03 | [Enter in the quick switcher creates the note when nothing matches](issues/03-quick-switcher-enter-creates-on-no-match.md) | none | todo | | |
| 04 | [Right-clicking inside a selection in the editor keeps it](issues/04-editor-right-click-keeps-selection.md) | none | done | issue/04-editor-right-click-keeps-selection (c244691f8) | 2026-11-04 |
| 05 | [The editor context menu offers Cut, Copy, Paste and Select all](issues/05-editor-context-menu-clipboard-items.md) | 04 | done | issue/05-editor-context-menu-clipboard-items (c4258f5bf) | 2026-11-04 |
| 06 | [Backlinks and Outgoing links show a load error with Retry, not an empty message](issues/06-link-panels-show-load-error.md) | none | todo | | |
| 07 | [The active editor tab scrolls into view, and all tabs share one height](issues/07-active-tab-scrolls-into-view.md) | none | done | issue/07-active-tab-scrolls-into-view (552e60f0a) | 2026-11-04 |
| 08 | [Theme color fixes: calendar grid, meta-bind focus, Lavender H1 and a success token](issues/08-theme-color-fixes.md) | none | done | issue/08-theme-color-fixes (4940d7ffc) | 2026-11-04 |
| 10 | [The Settings drawer ends at the status bar instead of covering it](issues/10-settings-drawer-above-status-bar.md) | none | done | issue/10-settings-drawer-above-status-bar (ac69710df) | 2026-11-05 |
| 11 | [The New event dialog shows "Enter a title." only after the title was touched](issues/11-event-title-error-after-touch.md) | none | todo | | |
| 12 | [Word count and graph stats read correctly for zero and one](issues/12-word-count-and-graph-stats-counts.md) | none | todo | | |
| 13 | [The Tags view explains when the rare-tag filter hides everything](issues/13-tags-filtered-empty-state.md) | none | todo | | |
| 14 | [The Search panel stops repeating the index status the status bar already shows](issues/14-search-panel-drops-duplicate-index-status.md) | none | todo | | |
| 15 | [Hovering the open note keeps its fill, and the kanban lane grip appears on lane hover](issues/15-hover-keeps-active-row-and-lane-grip.md) | none | todo | | |
| 16 | [The radius ladder gains `xs` and runtime variables, held by a radius ratchet](issues/16-radius-ladder-xs-and-runtime-variables.md) | none | done | issue/16-radius-ladder-xs-and-runtime-variables (6c0f91811) | 2026-11-04 |
| 17 | [Left-sidebar list rows use the same 8px corner as the rail and right sidebar](issues/17-sidebar-row-radius.md) | 16 | done | issue/17-sidebar-row-radius (47ebda213) | 2026-11-04 |
| 18 | [Bare `rounded` becomes `rounded-xs` everywhere, with no pixel change](issues/18-bare-rounded-to-rounded-xs.md) | 16, 17 | done | issue/18-bare-rounded-to-rounded-xs (48bf52fe9) | 2026-11-04 |
| 19 | [Floating surfaces lift: theme-aware shadow, ring and scrim tokens](issues/19-elevation-shadow-ring-scrim-tokens.md) | none | done | issue/19-elevation-shadow-ring-scrim-tokens (be7002d11) | 2026-11-04 |
| 20 | [Lavender Haze menus and popovers sit above the page instead of matching content blocks](issues/20-lavender-popover-surface.md) | 19 | done | issue/20-lavender-popover-surface (af4601a32) | 2026-11-04 |
| 21 | [Default theme overlays sit one step above the editor, and dialogs share the popover surface](issues/21-default-popover-and-dialog-surface.md) | 19, 20 | done | issue/21-default-popover-and-dialog-surface (d5d68ee4e) | 2026-11-04 |
| 22 | [Live-preview blocks, controls and chips use the radius ladder](issues/22-live-preview-widget-radius.md) | 16 | done | issue/22-live-preview-widget-radius (ecf417e87) | 2026-11-04 |
| 23 | [Editor autocomplete, tooltips and the callout type menu look like the app's menus](issues/23-editor-overlay-chrome-on-menu-tokens.md) | 16, 19, 22 | done | issue/23-editor-overlay-chrome-on-menu-tokens (99519abc4) | 2026-11-05 |
| 24 | [Settings fields use the shadcn Input and Select, and setting rows size the control column by its content](issues/24-settings-text-fields-use-shadcn-input-and-select.md) | none | in-progress | | |
| 25 | [Setting rows size the control column by its content, with a stacked layout for wide values](issues/25-setting-item-content-sized-control-column.md) | 24 | wontfix | | |
| 26 | [Help text that belongs to a settings row sits inside that row](issues/26-setting-item-hint-prop.md) | 24 | todo | | |
| 27 | [Settings actions use the shadcn Button, and theme card actions show on keyboard focus](issues/27-settings-buttons-use-shadcn-button.md) | 24 | todo | | |
| 28 | [Settings drawer sits above the status bar, with one header band, a real close button and a distinct selected nav item](issues/28-settings-drawer-chrome.md) | 10 | done | issue/28-settings-drawer-chrome (c1c126972) | 2026-11-05 |
| 29 | [Opening Settings moves focus into the drawer, and closing returns it](issues/29-settings-drawer-focus-move-and-return.md) | 28 | todo | | |
| 30 | [Settings is modal: a scrim closes it on outside click and Tab stays inside (assumes owner decision)](issues/30-settings-drawer-modal-scrim.md) | 29 | todo | | |
| 31 | [Troubleshooting shows readable decorator names under one group, with copy that matches what the switches do](issues/31-troubleshooting-readable-decorator-labels.md) | none | todo | | |
| 32 | [Both inbox badges live on the Rail page, build info shows once, and Sentry moves to Advanced (assumes owner decision)](issues/32-settings-ia-badges-build-info-sentry.md) | 24 | todo | | |
| 33 | [Settings copy drops library names, model IDs and em dashes, and labels use sentence case](issues/33-settings-copy-pass.md) | 26, 27 | todo | | |
| 34 | [Overlays fade and zoom in and out (tw-animate-css)](issues/34-overlay-motion-on.md) | none | done | issue/34-overlay-motion-on (02b9f6d97) | 2026-11-04 |
| 35 | [Overlays and the Settings drawer stop animating when the OS asks for reduced motion](issues/35-reduced-motion-overlays-and-settings.md) | 34 | wontfix | | |
| 36 | [Focus falls back to the theme ring color, and dialogs do not draw a focus box around themselves](issues/36-focus-fallback-and-dialog-outline.md) | none | done | issue/36-focus-fallback-and-dialog-outline (606c4cd50) | 2026-11-04 |
| 37 | [Chrome buttons and rows show the app's focus-visible ring](issues/37-chrome-focus-visible-ring.md) | 36 | done | issue/37-chrome-focus-visible-ring (56072aa3d) | 2026-11-04 |
| 38 | [Native confirmation dialogs name the action instead of Yes and No](issues/38-confirm-verb-labels.md) | none | done | issue/38-confirm-verb-labels (53e123dbb) | 2026-11-05 |
| 39 | [The active theme, not the macOS appearance, decides dark mode](issues/39-theme-drives-dark-mode.md) | none | done | issue/39-theme-drives-dark-mode (46e619786) | 2026-11-05 |
| 40 | [Toasts and the editor's CodeMirror base follow the theme mode](issues/40-toasts-and-editor-follow-theme-mode.md) | 39 | todo | | |
| 41 | [The theme contrast guard reads oklch, so Default's muted sidebar text reaches 4.5:1](issues/41-contrast-guard-reads-oklch.md) | none | done | issue/41-contrast-guard-reads-oklch (53418bf0b) | 2026-11-04 |
| 43 | [Canvas nodes, edges and grid draw from theme tokens, so they show on light themes](issues/43-canvas-surface-theme-tokens.md) | none | todo | | |
| 44 | [Canvas menus, pickers and edge labels use theme tokens](issues/44-canvas-overlay-theme-tokens.md) | 43 | todo | | |
| 45 | [The graph view paints with the active theme's colors](issues/45-graph-view-theme-palette.md) | 39 | todo | | |
| 47 | [Kanban date proximity has one token-based map, and done cards drop it](issues/47-kanban-proximity-token-map.md) | none | todo | | |
| 48 | [Status colors use theme tokens, and a test forbids raw palette classes](issues/48-status-colors-use-tokens.md) | 08, 47 | todo | | |
| 49 | [The note action bar drops duplicated controls and folds rare actions into More](issues/49-note-action-bar-trim.md) | none | done | issue/49-note-action-bar-trim (d84546016) | 2026-11-04 |
| 50 | [Second-row toolbars share one height and divider, and only the first pane keeps the traffic-light inset](issues/50-pane-toolbar-band.md) | none | done | issue/50-pane-toolbar-band (96e7d186e) | 2026-11-05 |
| 51 | [The note list header keeps its title readable](issues/51-note-list-header-readable.md) | 50 | done | issue/51-note-list-header-readable (0602037aa) | 2026-11-05 |
| 52 | [Right sidebar sections share one header recipe and one left edge](issues/52-right-sidebar-sections.md) | none | todo | | |
| 53 | [The right sidebar hides on kanban, canvas and view tabs](issues/53-right-sidebar-non-note-tabs.md) | none | todo | | |
| 54 | [The tab strip shows overflow and hides the .md extension](issues/54-tab-strip-overflow.md) | 07 | todo | | |
| 55 | [Live preview draws no active-line slab above the note title](issues/55-no-active-line-slab.md) | none | todo | | |
| 56 | [The command palette shows dense one-line rows with key hints](issues/56-command-palette-density.md) | none | todo | | |
| 57 | [Menu items share one anatomy](issues/57-menu-item-anatomy.md) | none | done | issue/57-menu-item-anatomy (9cecce6eb) | 2026-11-05 |
| 58 | [Dialogs share one anatomy: visible title, built-in close, bounded height](issues/58-dialog-anatomy.md) | 36 | done | issue/58-dialog-anatomy (1e021b796) | 2026-11-05 |
| 59 | [EmptyState, InlineAlert and Badge primitives exist](issues/59-empty-error-badge-primitives.md) | none | todo | | |
| 60 | [Sidebar panels and settings use the empty and error primitives](issues/60-panels-use-empty-error-primitives.md) | 59 | todo | | |
| 61 | [Graph, canvas, collection and kanban views show real empty and error states](issues/61-views-empty-error-states.md) | 59 | todo | | |
| 62 | [The collection table reads as a table](issues/62-collection-table-readable.md) | none | todo | | |
| 63 | [Kanban cards drop the empty date row until hover or focus](issues/63-kanban-card-quiet.md) | 47 | todo | | |
| 64 | [Each theme uses one heading hue ramp](issues/64-heading-hue-ramp.md) | 08 | done | issue/64-heading-hue-ramp (a416c87fc) | 2026-11-04 |
| 65 | [Editor tables no longer reserve width for hover controls](issues/65-editor-table-width.md) | none | todo | | |
| 66 | [Chrome icon buttons share sizes and use shadcn tooltips](issues/66-chrome-icon-buttons.md) | 37 | todo | | |
| 67 | [Hover-only controls also appear on keyboard focus](issues/67-hover-controls-on-focus.md) | 37 | done | issue/67-hover-controls-on-focus (22178ce9e) | 2026-11-05 |
| 68 | [Relationship and kanban wikilink pickers navigate with arrow keys](issues/68-pickers-arrow-keys.md) | none | todo | | |
| 69 | [Graph controls and the event dialog use shadcn Select, Switch and Checkbox](issues/69-native-controls-to-shadcn.md) | none | todo | | |
| 70 | [Settings groups render as cards with dividers](issues/70-settings-grouped-cards.md) | 24 | todo | | |
| 71 | [Search results and link rows reserve a gutter for their hover actions](issues/71-hover-action-gutter.md) | none | todo | | |
| 72 | [The Default theme drops its Catppuccin preview overrides](issues/72-default-theme-drop-preview-overrides.md) | 41 | todo | | |
| 73 | [Folder rows in the Files navigator show the focus-visible ring on their buttons](issues/73-files-navigator-folder-focus-ring.md) | none | done | issue/73-files-navigator-folder-focus-ring (eb51cd010) | 2026-11-05 |
| 74 | [The QueryJS help contract test stops timing out its setup under full-suite load](issues/74-queryjs-contract-setup-timeout.md) | none | done | issue/74-queryjs-contract-setup-timeout (8877ccb3a) | 2026-11-05 |
| 75 | [The start screen uses the last applied theme](issues/75-start-screen-uses-last-theme.md) | none | done | fix/startup-theme (7dd276998) | 2026-11-05 |
| 76 | [The icon picker uses the dialog's built-in close button](issues/76-icon-picker-built-in-close.md) | none | done | issue/76-icon-picker-built-in-close (5b459e6ec) | 2026-11-05 |

## Log

- 2026-11-04 18:40 — ledger created (69 Issues)
- 2026-11-04 18:41 — 08 — start — launched by /relay-lite:run — 3d80b731b
- 2026-11-04 18:53 — 16 — start — launched by /relay-lite:run — 9791226e5
- 2026-11-04 18:53 — 34 — start — launched by /relay-lite:run — 9791226e5
- 2026-11-04 19:06 — 08 — deliver — merged after 2 APPROVED rounds (claude); full suite 11669 passed; 2 manual two-theme checks left for owner — 4940d7ffc
- 2026-11-04 19:06 — 19 — start — launched by /relay-lite:run — 957efd66e
- 2026-11-04 19:15 — 34 — deliver — blocked: pnpm cannot reach the npm registry (error 23 / ECONNRESET) so pnpm add tw-animate-css failed; curl and npm reach it — 677ad897d
- 2026-11-04 19:24 — 34 — start — relaunched by /relay-lite:run after the owner allowed pnpm 11 through the firewall — 3b0297efc
- 2026-11-04 19:27 — 16 — deliver — merged after 2 APPROVED rounds (claude); full suite 11682 passed; 2px to 4px rounded-xs on dialog close and IconPicker not checked in app — 6c0f91811
- 2026-11-04 19:27 — 17 — start — launched by /relay-lite:run — 234731c48
- 2026-11-04 19:33 — 19 — deliver — blocked: rebase onto main conflicted in src/app.css after 2 APPROVED rounds; worktree kept — a44ceb067
- 2026-11-04 19:44 — 19 — deliver — main session finished deliver: resolved src/app.css rebase conflict (kept radius and elevation theme blocks), gate green 11687 tests, opus re-review could not refute — be7002d11
- 2026-11-04 19:44 — 22 — start — launched by /relay-lite:run — cb5672a41
- 2026-11-04 19:53 — 34 — deliver — merged after 2 APPROVED rounds (claude); full suite 11687 passed; E2E 6/6 before rebase; not checked in WKWebView — 02b9f6d97
- 2026-11-04 19:53 — 64 — start — launched by /relay-lite:run (owner named it; needs-triage ticket) — 4cc675049
- 2026-11-04 20:13 — 22 — deliver — blocked: post-rebase suite unfinished when deliver returned (vitest passed, build cut off); worktree kept — 47ebda213
- 2026-11-04 20:20 — 17 — deliver — merged after 2 APPROVED rounds (claude); last pre-merge suite had an unrelated queryjs-contract hook timeout; main+17+22 gate green 11710 — 47ebda213
- 2026-11-04 20:20 — 22 — deliver — main session finished deliver: rebased onto 17, gate green 11710 tests and build, after-review [] — ecf417e87
- 2026-11-04 20:20 — 18 — start — launched by /relay-lite:run — 9f6c05213
- 2026-11-04 20:20 — 01 — start — launched by /relay-lite:run — 9f6c05213
- 2026-11-04 20:26 — 64 — deliver — merged after 2 APPROVED rounds (claude); full suite 11711 passed; Lavender ramp nearly flat, left for owner visual check — a416c87fc
- 2026-11-04 20:26 — 20 — start — launched by /relay-lite:run — 11d0b492e
- 2026-11-04 20:40 — 18 — deliver — blocked: NoteActionBar delete-to-trash test fails on main too (not caused by 18); worktree kept — 17e5d7afc
- 2026-11-04 20:45 — 20 — deliver — blocked: NoteActionBar delete-to-trash test red on main (not caused by 20); worktree kept with a comment-only fix needing re-review — a6613decc
- 2026-11-04 20:49 — 18 — start — relaunched after the racy NoteActionBar test was fixed on main (fb53f1927) — 03f3d0022
- 2026-11-04 20:49 — 20 — start — relaunched after the racy NoteActionBar test was fixed on main (fb53f1927) — 03f3d0022
- 2026-11-04 20:53 — 01 — deliver — main session finished deliver after 3 merge conflicts from a moving main; only ledger and a test-only commit came in; suite 11717 green — df6b5f190
- 2026-11-04 20:53 — 04 — start — launched by /relay-lite:run — 3467916da
- 2026-11-04 21:12 — 18 — deliver — merged after 1 APPROVED round (claude), no findings; full suite 11717 passed — 48bf52fe9
- 2026-11-04 21:12 — 36 — start — launched by /relay-lite:run — e3e0fa90c
- 2026-11-04 21:28 — 20 — deliver — merged after 2 APPROVED rounds (claude); full suite 11718 passed; Lavender visual check left for owner — af4601a32
- 2026-11-04 21:28 — 21 — start — launched by /relay-lite:run — 0bc3dae9a
- 2026-11-04 21:38 — 04 — deliver — merged after 1 APPROVED round (claude), 3 nits answered without code change; full suite 11721 passed — c244691f8
- 2026-11-04 21:38 — 05 — start — launched by /relay-lite:run — 1eb160023
- 2026-11-04 21:45 — 36 — deliver — merged after 2 APPROVED rounds (claude); full suite 11721 passed; E2E focus-ring 2/2; WKWebView ring color not checked — 606c4cd50
- 2026-11-04 21:45 — 37 — start — launched by /relay-lite:run — c2a7aa164
- 2026-11-04 21:49 — 21 — deliver — blocked: rebase conflict in dialog-content.svelte with Issue 36 after 2 APPROVED rounds; worktree kept — dbc23e115
- 2026-11-04 21:49 — 07 — start — launched by /relay-lite:run — 9d0253309
- 2026-11-04 22:00 — 21 — deliver — main session finished deliver: resolved dialog-content conflict with 36 (kept outline-none), gate green 11725, opus re-review could not refute — d5d68ee4e
- 2026-11-04 22:17 — 37 — deliver — merged after 1 APPROVED round (claude); full suite 11725 passed; follow-up: FilesNavigator folder row focus ring — 56072aa3d
- 2026-11-04 22:17 — 41 — start — launched by /relay-lite:run — a40b28729
- 2026-11-04 22:28 — 07 — deliver — merged after 2 APPROVED rounds (claude); full suite 11730 passed; E2E tabs 8/8 before rebase — 552e60f0a
- 2026-11-04 22:28 — 49 — start — launched by /relay-lite:run (owner approved the needs-triage ticket) — d3ca7e05b
- 2026-11-04 22:41 — 05 — deliver — merged after 2 APPROVED rounds (claude); cut race fixed with a regression test; full suite 11742 passed — c4258f5bf
- 2026-11-04 22:41 — 10 — start — launched by /relay-lite:run — 0bdcf459e
- 2026-11-04 22:53 — ledger updated (added 73, 74)
- 2026-11-04 22:59 — 41 — deliver — blocked: post-rebase suite unfinished when deliver returned (first run had a MarkdownEditor load flake); worktree kept — 4c5f42150
- 2026-11-04 23:09 — 10 — deliver — blocked: full suite exceeded the step time under load; review fixes (test + app.css comment) need re-review; worktree kept — 72d03281e
- 2026-11-04 23:13 — 49 — deliver — blocked: queryjs-contract beforeAll timeout under load twice; review fixes (help text, comment, spacing) need re-review; worktree kept — 7feea2dcf
- 2026-11-04 23:18 — 41 — deliver — main session finished deliver on a quiet machine: gate green 11752 tests, after-review []; oklch parser hardened in review round 1 — 53418bf0b
- 2026-11-04 23:18 — 10 — start — relaunched for re-review and deliver after a load timeout — c4f2e2ff3
- 2026-11-04 23:18 — 49 — start — relaunched for re-review and deliver after a load timeout — c4f2e2ff3
- 2026-11-04 23:58 — 49 — deliver — merged after 2 APPROVED rounds (claude); full suite 11774 passed; E2E 45 passed; width-driven folding left for owner taste check — d84546016
- 2026-11-04 23:58 — 10 — deliver — blocked: full suite exceeded the step time again under load; re-review APPROVED with no findings — 2b6c77c60
- 2026-11-04 23:59 — 23 — start — launched by /relay-lite:run — 927f6cec0
- 2026-11-05 00:30 — 23 — deliver — blocked: theme-css-contract test, --lp-frontmatter-bg/border emitted but no longer read after the callout popover moved to menu tokens; owner decision needed — 62abb56d1
- 2026-11-05 05:06 — 10 — deliver — main session finished deliver on a quiet machine: gate green 11804 tests, retry review covered the fix commit — ac69710df
- 2026-11-05 05:06 — 23 — start — relaunched after the owner chose to drop frontmatterBg/frontmatterBorder — f062e38ef
- 2026-11-05 05:06 — 38 — start — launched by /relay-lite:run — f062e38ef
- 2026-11-05 05:06 — 28 — start — launched by /relay-lite:run — f062e38ef
- 2026-11-05 05:12 — 73 — start — launched by /relay-lite:run at the owner's request as a fourth workflow — 52f6c5487
- 2026-11-05 05:30 — 28 — deliver — blocked: full suite unfinished when deliver returned; CSS-only nit fix after review needs re-review; worktree kept — 3e25bfdf2
- 2026-11-05 05:31 — 38 — deliver — blocked: full suite unfinished when deliver returned; test-only nit fix after review; worktree kept — 990d6c10c
- 2026-11-05 05:40 — 73 — deliver — blocked: full suite unfinished when deliver returned; E2E-only nit fixes after review; worktree kept — 47466af24
- 2026-11-05 05:59 — 38 — deliver — main session finished deliver: fixed missing .js extensions in the new test, gate green 11818 tests — 53e123dbb
- 2026-11-05 06:09 — 73 — deliver — main session finished deliver: gate green 11818 tests, focus-ring E2E 10 passed — eb51cd010
- 2026-11-05 06:28 — 23 — deliver — main session finished deliver after 3 merge conflicts from a moving main; 2 APPROVED rounds; gate green 11851 tests — 99519abc4
- 2026-11-05 06:28 — 28 — deliver — main session finished deliver: CSS nit fix re-checked by an opus refute review; gate green 11855 tests, settings E2E 5 passed — c1c126972
- 2026-11-05 07:44 — 74 — start — launched by /relay-lite:run — 2b0f08c01
- 2026-11-05 07:45 — 74 — start — relaunched after the owner dropped the five-run load proof — 56e39b5f3
- 2026-11-05 08:03 — 74 — deliver — merged after 2 APPROVED rounds (claude); setup hook timeout 30 s sized from measurement; full suite 11855 passed — 8877ccb3a
- 2026-11-05 09:31 — 50 — start — launched by /relay-lite:run — 27f3e59fc
- 2026-11-05 09:33 — 58 — start — launched by /relay-lite:run — a2bec70d2
- 2026-11-05 09:33 — 67 — start — launched by /relay-lite:run — a2bec70d2
- 2026-11-05 09:39 — 39 — start — launched by /relay-lite:run — c9d7fc1d5
- 2026-11-05 09:56 — 67 — deliver — review APPROVED; not delivered: full-suite gate cut off mid pnpm build (vitest 500/500 green), worktree and branch kept with the fix commit — ae8616221
- 2026-11-05 09:57 — 58 — deliver — review APPROVED; not delivered: full-suite gate still running when the deliver step returned, worktree and branch kept — fc4444fce
- 2026-11-05 10:14 — 50 — deliver — merged: shared pane-toolbar row and first-pane traffic-light inset; reviews APPROVED x2; full suite green after rebase — 96e7d186e
- 2026-11-05 10:14 — 51 — start — launched by /relay-lite:run — ab3ddda28
- 2026-11-05 10:20 — 58 — start — launched by /relay-lite:run (retry) — fbeb04bdf
- 2026-11-05 10:30 — 39 — deliver — merged by the main session after 3 workflow merge conflicts from a moving main; theme decides html.dark and color-scheme via @custom-variant; reviews CHANGES_REQUESTED then APPROVED; full suite green — 46e619786
- 2026-11-05 10:46 — 51 — deliver — merged: note list header title min-w-16 flex-1, Daily note and New here as named icon buttons, count at 4.5:1; reviews APPROVED x2; full suite green after rebase — 0602037aa
- 2026-11-05 10:49 — ledger updated (added 75)
- 2026-11-05 11:00 — 58 — deliver — merged: dialog height cap, File History visible title and built-in close, IconPicker sm:max-w-[550px], popover p-3 default; reviews APPROVED x2; IconPicker close X follow-up deferred — 1e021b796
- 2026-11-05 11:00 — 67 — start — launched by /relay-lite:run (retry) — ac2350d62
- 2026-11-05 11:14 — ledger updated (added 76)
- 2026-11-05 11:20 — 67 — deliver — merged: hover-only controls also show on group-focus-within, no transition-all or hover:scale in chrome; reviews APPROVED x2; full suite green after 2 rebases — 22178ce9e
- 2026-11-05 11:21 — 57 — start — launched by /relay-lite:run — 9a254f375
- 2026-11-05 11:24 — ledger updated (title of 24; blocked by of 70)
- 2026-11-05 11:24 — ledger updated (blocked by of 26, 27, 32)
- 2026-11-05 11:30 — 25 merged into 24 (wontfix, set by hand: the CLI has no transition to wontfix); 26, 27, 32 and 70 now blocked by 24
- 2026-11-05 11:25 — 24 — start — launched by /relay-lite:run (25 merged in) — 8505df553
- 2026-11-05 11:30 — 35 set to wontfix by hand to match its Issue file (Status: wontfix); the CLI has no transition to wontfix
- 2026-11-05 11:33 — 76 — start — launched by /relay-lite:run — e1dca825f
- 2026-11-05 11:47 — 76 — deliver — merged: IconPicker uses the built-in dialog close, header pe-10; review APPROVED, no findings; full suite green first run — 5b459e6ec
- 2026-11-05 12:03 — 57 — deliver — merged: menu icons drop mr-2 (scan test), formatShortcut hints, sentence case, no single-item groups; reviews APPROVED x2; follow-up Issue 77 filed — 9cecce6eb
