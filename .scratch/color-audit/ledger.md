# Ledger: color-audit

This file is the source of truth for the progress of the color-audit Issues. Read it before working on any of them. It is written only by `/relay-lite:run`, through `relay ledger`: never edit it by hand.

## Continue

```text
/relay-lite:run color-audit
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
| 01 | [Faded text and icons use full-strength tokens](issues/01-faded-text-icons-full-strength-tokens.md) | none | in-progress | | |
| 02 | [Rail, tag and icon palettes stay visible on every theme](issues/02-rail-tag-icon-palettes-follow-theme.md) | none | in-progress | | |
| 03 | [Accent and status text on its own tint: rows, search, menus](issues/03-accent-text-own-tint-rows-search-menus.md) | none | todo | | |
| 04 | [Accent and status text on its own tint: kanban, collection functions, file history](issues/04-accent-text-own-tint-kanban-collection-diff.md) | 03 | todo | | |
| 05 | [Theme builder keeps text readable on every surface it derives, by WCAG and APCA](issues/05-theme-builder-text-every-surface-apca.md) | none | todo | | |
| 06 | [Editor text on tinted surfaces: callouts, blockquote, highlight, code, collection](issues/06-theme-builder-editor-tinted-surfaces.md) | 05, 07 | todo | | |
| 07 | [Borders, inputs, switches, checkboxes and focus rings reach 3:1](issues/07-non-text-boundaries-focus-states.md) | none | todo | | |
| 08 | [Live-preview and QueryJS dimmed text stays readable](issues/08-live-preview-queryjs-dimmed-text.md) | 06 | todo | | |
| 09 | [Canvas text, edges, groups and presets read on light themes](issues/09-canvas-readable-on-light-themes.md) | none | todo | | |
| 10 | [QueryJS charts, heatmaps and mermaid follow the theme](issues/10-queryjs-charts-mermaid-follow-theme.md) | 08 | todo | | |
| 11 | [Graph view labels, edges and controls read on every theme](issues/11-graph-view-follows-theme.md) | 07 | todo | | |
| 12 | [User, edited and imported themes are corrected and the editor warns](issues/12-user-themes-readability-checks.md) | 07 | todo | | |
| 13 | [Themes repo: Zettlr hover and selected surfaces, and a contrast CI](issues/13-themes-repo-zettlr-palettes-contrast-ci.md) | 07 | todo | | |

## Log

- 2026-11-19 16:09 — ledger created (13 Issues)
- 2026-11-19 16:09 — 01 — start — launched by /relay-lite:run — 7bfdaddb8
- 2026-11-19 16:12 — ledger updated (blocked by of 06, 07)
- 2026-11-19 16:13 — 02 — start — launched by /relay-lite:run (parallel with 01, owner approved) — 586718cc1
