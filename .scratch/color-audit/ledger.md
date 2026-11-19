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
| 01 | [Faded text and icons use full-strength tokens](issues/01-faded-text-icons-full-strength-tokens.md) | none | done | issue/01-faded-text-icons-full-strength-tokens (4d99ae1d1) | 2026-11-19 |
| 02 | [Rail, tag and icon palettes stay visible on every theme](issues/02-rail-tag-icon-palettes-follow-theme.md) | none | done | issue/02-rail-tag-icon-palettes-follow-theme (c648cd459) | 2026-11-19 |
| 03 | [Accent and status text on its own tint: rows, search, menus](issues/03-accent-text-own-tint-rows-search-menus.md) | none | done | issue/03-accent-text-own-tint-rows-search-menus (df9a93639) | 2026-11-19 |
| 04 | [Accent and status text on its own tint: kanban, collection functions, file history](issues/04-accent-text-own-tint-kanban-collection-diff.md) | 03 | done | issue/04-accent-text-own-tint-kanban-collection-diff (d2d8f050a) | 2026-11-19 |
| 05 | [Theme builder keeps text readable on every surface it derives, by WCAG and APCA](issues/05-theme-builder-text-every-surface-apca.md) | none | done | issue/05-theme-builder-text-every-surface-apca (251c60180) | 2026-11-19 |
| 06 | [Editor text on tinted surfaces: callouts, blockquote, highlight, code, collection](issues/06-theme-builder-editor-tinted-surfaces.md) | 05, 07 | done | issue/06-theme-builder-editor-tinted-surfaces (a9a361aa3) | 2026-11-19 |
| 07 | [Borders, inputs, switches, checkboxes and focus rings reach 3:1](issues/07-non-text-boundaries-focus-states.md) | none | done | issue/07-non-text-boundaries-focus-states (cc6b30159) | 2026-11-19 |
| 08 | [Live-preview and QueryJS dimmed text stays readable](issues/08-live-preview-queryjs-dimmed-text.md) | 06 | todo | | |
| 09 | [Canvas text, edges, groups and presets read on light themes](issues/09-canvas-readable-on-light-themes.md) | none | todo | | |
| 10 | [QueryJS charts, heatmaps and mermaid follow the theme](issues/10-queryjs-charts-mermaid-follow-theme.md) | 08 | todo | | |
| 11 | [Graph view labels, edges and controls read on every theme](issues/11-graph-view-follows-theme.md) | 07 | todo | | |
| 12 | [User, edited and imported themes are corrected and the editor warns](issues/12-user-themes-readability-checks.md) | 07 | done | issue/12-user-themes-readability-checks (9c8ff9717) | 2026-11-19 |
| 13 | [Themes repo: Zettlr hover and selected surfaces, and a contrast CI](issues/13-themes-repo-zettlr-palettes-contrast-ci.md) | 07 | done | koko.brain-themes eb9f062, bfdd3d8 | 2026-11-19 |
| 14 | [Kanban date badges read on coloured cards](issues/14-kanban-date-badges-coloured-cards.md) | 04 | todo | | |

## Log

- 2026-11-19 16:09 — ledger created (13 Issues)
- 2026-11-19 16:09 — 01 — start — launched by /relay-lite:run — 7bfdaddb8
- 2026-11-19 16:12 — ledger updated (blocked by of 06, 07)
- 2026-11-19 16:13 — 02 — start — launched by /relay-lite:run (parallel with 01, owner approved) — 586718cc1
- 2026-11-19 16:36 — 01 — deliver — merged; review APPROVED (round 1 findings fixed: welcome page icons and paths, read-only lock opacity, guard scans src/routes), round 2 APPROVED; full suite 674 files passed — 4d99ae1d1
- 2026-11-19 16:36 — 03 — start — launched by /relay-lite:run (parallel with 02, owner approved) — b002bcc77
- 2026-11-19 16:46 — 02 — deliver — merged; review APPROVED, fix round, round 2 APPROVED; first full suite failed on a codemap-query line pin, fixed, second full suite 675 files passed — c648cd459
- 2026-11-19 17:02 — 03 — deliver — merged; review APPROVED (1 minor: NoteRow conflict with 02 resolved in deliver, checked by main session; 3 nits deferred); full suite 678 files passed — df9a93639
- 2026-11-19 17:02 — 04 — start — launched by /relay-lite:run — 2e864a02f
- 2026-11-19 17:30 — 04 — deliver — merged; review APPROVED, fix round (color() keeps more preset), round 2 APPROVED with one deferred minor (date badges on coloured cards 4.05-4.50 on Zettlr Bielefeld Light, follow-up 14); full suite 679 files passed — d2d8f050a
- 2026-11-19 17:30 — ledger updated (added 14; title of 14; link of 14; blocked by of 14)
- 2026-11-19 17:30 — 07 — start — launched by /relay-lite:run (owner order: after 04) — 5c9402dd7
- 2026-11-19 18:00 — 07 — deliver — merged; review APPROVED with 3 findings (input pairs on fileExplorerBg/editorBg fixed, per-token lift kept by design, ring/blockquote asserted), round 2 APPROVED; full suite 684 files passed; E2E focus-ring.spec not run — cc6b30159
- 2026-11-19 18:00 — 12 — start — launched by /relay-lite:run (owner order: after 07) — b7ad075e6
- 2026-11-19 18:17 — 13 — deliver — done by hand in the themes repo: Zettlr palettes (eb9f062), palette-design checks in pnpm validate plus 13 themes fixed (bfdd3d8); Themes CI green — 3a8eb75f5
- 2026-11-19 18:29 — 12 — deliver — merged; review APPROVED, fix round, round 2 APPROVED (1 nit); owner to confirm the Default error red #fd746e (typeRed/orange/pink derive from the 4.5 lift); ThemePreview unlifted is a follow-up; full suite 684 files passed — 9c8ff9717
- 2026-11-19 19:30 — 05 — start — launched by /relay-lite:run — e8059fa12
- 2026-11-19 20:05 — 05 — deliver — merged; reviews APPROVED x2 (claude); full suite 684 files passed; 2 minor round-2 findings left for a follow-up — 251c60180
- 2026-11-19 20:05 — 06 — start — launched by /relay-lite:run — a8779035a
- 2026-11-19 20:42 — 06 — deliver — merged; review CHANGES_REQUESTED then APPROVED (claude); full suite 685 files passed — a9a361aa3
