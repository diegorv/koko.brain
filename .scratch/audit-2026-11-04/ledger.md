# Ledger: audit-2026-11-04

This file is the source of truth for the progress of the audit-2026-11-04 Issues. Read it before working on any of them. It is written only by `/relay-lite:run`, through `relay ledger`: never edit it by hand.

## Continue

```text
/relay-lite:run audit-2026-11-04
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
| 01 | [Canvas edits persist to the canvas's own tab, never to the tab active after a switch or close](issues/01-canvas-persist-to-own-tab.md) | none | in-progress | | |
| 02 | [Unreadable or corrupt trash manifest must not be replaced by a partial list](issues/02-trash-manifest-unreadable.md) | none | todo | | |
| 03 | [Do not overwrite settings.json that was never loaded (read error or failed backup)](issues/03-settings-guard-unloaded-file.md) | none | todo | | |
| 04 | [Rename rewrites path-qualified and .md wikilinks](issues/04-rewrite-path-qualified-links.md) | none | todo | | |
| 05 | [read_files_batch only reads inside the vault that is actually open](issues/05-open-vault-root-read-batch.md) | none | todo | | |
| 06 | [An empty inline footnote ^[] does not crash the footnote live-preview plugin](issues/06-footnote-empty-inline-crash.md) | none | todo | | |
| 07 | [Local graph centers on the note that was active before the graph tab opened](issues/07-graph-local-mode-center.md) | none | todo | | |
| 08 | [Collection link() cells never navigate the app webview and drop unsafe schemes](issues/08-collection-link-safe-open.md) | none | todo | | |
| 09 | [An FTS build from the previous vault does not write its stats into the new vault's search store](issues/09-fts-build-stale-stats.md) | none | wontfix | | |
| 10 | [A meta-bind button stops its remaining actions when an open action fails](issues/10-metabind-open-failure-stops-actions.md) | none | todo | | |
| 11 | [Folder rename/move keeps its notes in text and semantic search](issues/11-rekey-search-on-path-change.md) | none | in-progress | | |
| 12 | [Composer reports saved only after the capture note is written, and keeps the text on failure](issues/12-composer-keep-text-until-written.md) | none | todo | | |
| 13 | [Unparseable .canvas opens in an error state and is never overwritten by canvas edits](issues/13-canvas-refuse-write-on-unparseable.md) | 01 | todo | | |
| 14 | [Auto-move rules and Todoist sent list: a failed load must not be saved over the file](issues/14-aux-json-load-failure-guard.md) | 03 | todo | | |
| 15 | [Rename rewrites only links that resolve to the renamed note, and keeps them resolving to it](issues/15-resolution-aware-link-rewrite.md) | 04 | todo | | |
| 16 | [Note-writing commands refuse paths outside the open vault](issues/16-confine-note-writes.md) | 05 | todo | | |
| 17 | [Canvas file and image nodes resolve both absolute and vault-relative paths](issues/17-canvas-node-path-resolution.md) | 13 | todo | | |
| 18 | [Vault-root commands (scan, index builds, watcher, model init) only accept the open vault](issues/18-confine-vault-root-commands.md) | 16 | todo | | |
| 19 | [Semantic and FTS builds cannot write into a vault opened after they started](issues/19-index-builds-pinned-to-vault.md) | 05, 18 | wontfix | | |

## Log

- 2026-11-04 22:54 — ledger created (19 Issues)
- 2026-11-04 22:55 — 11 — start — launched by /relay-lite:run — 01e590ca2
- 2026-11-04 22:58 — 01 — start — launched by /relay-lite:run — f06b07a3c
