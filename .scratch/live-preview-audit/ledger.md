# Ledger: live-preview-audit

This file is the source of truth for the progress of the live-preview-audit Issues. Read it before working on any of them. It is written only by `/relay-lite:run`, through `relay ledger`: never edit it by hand.

## Continue

```text
/relay-lite:run live-preview-audit
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
| 01 | [Table widget drops empty cells: +col looks dead and an empty corner cell shifts the columns](issues/01-table-empty-cells-dropped.md) | none | done | issue/01-table-empty-cells-dropped (11b08ff7) | 2026-11-02 |
| 02 | [Clicking a row, pill or bar in an embedded collection block shows its raw YAML instead of opening the note](issues/02-collection-click-reveals-source.md) | none | done | issue/02-collection-click-reveals-source (cd9527ee) | 2026-11-02 |
| 03 | [meta-bind-button, mermaid, queryjs and collection blocks inside a callout, blockquote or list item render as raw source](issues/03-special-fences-in-containers.md) | none | done | issue/03-special-fences-in-containers (6f1aea01) | 2026-11-02 |
| 04 | [04 (postponed by the owner): queryjs pager clicks reveal source; wikilinks in inline code and media tags in code render as widgets](issues/04-queryjs-pager-and-cosmetic-render-gaps.md) | none | wontfix | | |
| 05 | [05 (postponed by the owner): Live-preview render gaps that need an owner decision or a repro first](issues/05-render-gaps-needing-a-decision.md) | none | wontfix | | |
| 06 | [E2E case for clicking a row in an embedded collection block](issues/06-collection-row-click-e2e.md) | 02 | done | test/collection-row-click-e2e (a06cc54f) | 2026-11-03 |
| 07 | [a plain code block inside a callout, blockquote or list item shows only its last line](issues/07-plain-code-block-in-container-shows-last-line.md) | 03 | done | issue/07-plain-code-block-in-container-shows-last-line (6ba92695) | 2026-11-03 |

## Log

- 2026-11-02 22:23 — ledger created (4 Issues)
- 2026-11-02 22:23 — 01 — start — launched by /relay-lite:run — 8458806e
- 2026-11-02 22:28 — ledger updated (added 05; title of 04)
- 2026-11-02 22:29 — ledger updated (title of 05)
- 2026-11-02 22:31 — ledger updated (title of 04)
- 2026-11-02 22:36 — 01 — deliver — merged 11b08ff7: table rows split on unescaped pipes outside wikilinks and code spans, empty cells kept as '', rows normalized to the delimiter row's column count; R1 APPROVED (2 fixed: cross-cell code span JSDoc+test, unclosed [[ test), R2 APPROVED; suite 10171 passed — 11b08ff7
- 2026-11-02 22:37 — 02 — start — launched by /relay-lite:run — 9a1cab86
- 2026-11-02 22:47 — 02 — deliver — merged cd9527ee: collection block rows, calendar pills and linear bars stop mousedown, so a click opens the note and the widget stays drawn; R1 APPROVED (E2E row-click case filed as Issue 06, preventDefault nit no change); suite 10193 passed — cd9527ee
- 2026-11-02 22:47 — ledger updated (added 06)
- 2026-11-02 22:47 — 03 — start — launched by /relay-lite:run — 0e6bfeac
- 2026-11-02 23:07 — 03 — deliver — merged 6f1aea01: special fences (meta-bind-button, mermaid, queryjs, collection) found from the parsed info string, container prefix stripped, so they render in callouts, quotes and lists; R1 APPROVED (3 fixed: over-indented fences rejected, blank bodies kept; tab-in-content left with reason), R2 APPROVED (nit: tab after a list marker counts as 1 column); suite 10228 passed — 6f1aea01
- 2026-11-02 23:07 — ledger updated (added 07)
- 2026-11-03 05:51 — 07 — start — launched by /relay-lite:run — f0c58582
- 2026-11-03 06:05 — 07 — deliver — merged 6ba92695: findAllFencedCodeBlocks joins the per-line CodeText of a fence in a quote, callout or list item, so the code block widget and its copy button get every line without the prefix; R1 APPROVED (fix round: content built only when read), R2 APPROVED; suite 10304 passed — 6ba92695
- 2026-11-03 06:09 — 06 — start — done by hand in the main session (test-only) — a06cc54f
- 2026-11-03 06:09 — 06 — deliver — a06cc54f: E2E row click opens the note and the block stays rendered; fails with the mousedown guard disabled, passes with it (spec 3/3) — a06cc54f
- 2026-11-06 00:31 — 04, 05 set to wontfix by hand: migrated to .scratch/audit-2026-11-05/ by the pre-use audit (each Issue file names its new number); the CLI has no transition from todo to wontfix or done
