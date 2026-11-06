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
| 01 | [Canvas edits persist to the canvas's own tab, never to the tab active after a switch or close](issues/01-canvas-persist-to-own-tab.md) | none | done | issue/01-canvas-persist-to-own-tab (f37acb402) | 2026-11-05 |
| 02 | [Unreadable or corrupt trash manifest must not be replaced by a partial list](issues/02-trash-manifest-unreadable.md) | none | wontfix | | |
| 03 | [Do not overwrite settings.json that was never loaded (read error or failed backup)](issues/03-settings-guard-unloaded-file.md) | none | wontfix | | |
| 04 | [Rename rewrites path-qualified and .md wikilinks](issues/04-rewrite-path-qualified-links.md) | none | done | issue/04-rewrite-path-qualified-links (99bffdf66) | 2026-11-04 |
| 05 | [read_files_batch only reads inside the vault that is actually open](issues/05-open-vault-root-read-batch.md) | none | wontfix | | |
| 06 | [An empty inline footnote ^[] does not crash the footnote live-preview plugin](issues/06-footnote-empty-inline-crash.md) | none | done | issue/06-footnote-empty-inline-crash (1ad0306a5) | 2026-11-05 |
| 07 | [Local graph centers on the note that was active before the graph tab opened](issues/07-graph-local-mode-center.md) | none | done | issue/07-graph-local-mode-center (59b824233) | 2026-11-05 |
| 08 | [Collection link() cells never navigate the app webview and drop unsafe schemes](issues/08-collection-link-safe-open.md) | none | wontfix | | |
| 09 | [An FTS build from the previous vault does not write its stats into the new vault's search store](issues/09-fts-build-stale-stats.md) | none | wontfix | | |
| 10 | [A meta-bind button stops its remaining actions when an open action fails](issues/10-metabind-open-failure-stops-actions.md) | none | wontfix | | |
| 11 | [Folder rename/move keeps its notes in text and semantic search](issues/11-rekey-search-on-path-change.md) | none | done | issue/11-rekey-search-on-path-change (fc37b1370) | 2026-11-05 |
| 12 | [Composer reports saved only after the capture note is written, and keeps the text on failure](issues/12-composer-keep-text-until-written.md) | none | done | issue/12-composer-keep-text-until-written (0a1c22a73) | 2026-11-05 |
| 13 | [Unparseable .canvas opens in an error state and is never overwritten by canvas edits](issues/13-canvas-refuse-write-on-unparseable.md) | 01 | wontfix | | |
| 14 | [Auto-move rules and Todoist sent list: a failed load must not be saved over the file](issues/14-aux-json-load-failure-guard.md) | 03 | wontfix | | |
| 15 | [Rename rewrites only links that resolve to the renamed note, and keeps them resolving to it](issues/15-resolution-aware-link-rewrite.md) | 04 | done | issue/15-resolution-aware-link-rewrite (fdf1479c2) | 2026-11-05 |
| 16 | [Note-writing commands refuse paths outside the open vault](issues/16-confine-note-writes.md) | 05 | wontfix | | |
| 17 | [Canvas file and image nodes resolve both absolute and vault-relative paths](issues/17-canvas-node-path-resolution.md) | 13 | wontfix | | |
| 18 | [Vault-root commands (scan, index builds, watcher, model init) only accept the open vault](issues/18-confine-vault-root-commands.md) | 16 | wontfix | | |
| 19 | [Semantic and FTS builds cannot write into a vault opened after they started](issues/19-index-builds-pinned-to-vault.md) | 05, 18 | wontfix | | |
| 20 | [A root note renamed into a nested note's stem keeps its links](issues/20-root-note-rename-link-form.md) | none | todo | | |
| 21 | [Local graph center follows every way the graph tab gets focus, and hints when the center note is gone](issues/21-graph-center-follows-every-focus.md) | none | wontfix | | |
| 22 | [A canvas edit closed or renamed inside the debounce window reaches the .canvas file](issues/22-canvas-flush-on-close-and-rename.md) | none | wontfix | | |

## Log

- 2026-11-04 22:54 — ledger created (19 Issues)
- 2026-11-04 22:55 — 11 — start — launched by /relay-lite:run — 01e590ca2
- 2026-11-04 22:58 — 01 — start — launched by /relay-lite:run — f06b07a3c
- 2026-11-04 23:11 — 01 — deliver — blocked in discovery: switch/close flush does not reproduce on main (Svelte 5.57.2 teardown reads pre-flush activeIndex); canvas A->B drop does reproduce; owner to choose re-scope (see work/01/discovery.md) — cf727c679
- 2026-11-04 23:11 — 04 — start — launched by /relay-lite:run — 79bd6ebca
- 2026-11-04 23:45 — 04 — deliver — merged: replaceWikilinks keeps path prefix and .md/.markdown extension on rename; review APPROVED x2 (claude); full suite green after rebase — 99bffdf66
- 2026-11-04 23:45 — 06 — start — launched by /relay-lite:run — 539c4384b
- 2026-11-05 00:03 — 06 — deliver — blocked: review APPROVED, full suite killed at the 600s limit under load (RailSection timeouts, unrelated); worktree kept — cdb07b93d
- 2026-11-05 00:30 — 11 — deliver — blocked: review APPROVED x2, cargo + full suite green after 1st rebase; main moved, 2nd clean rebase then suite failed twice on load timeouts in untouched files; worktree kept, rebased — cebcd08e7
- 2026-11-05 00:32 — 11 — deliver — merged by main session: folder rename/move re-keys FTS5 and semantic rows Rust-side; review APPROVED x2; gate green after 1st rebase, later clean rebases merged without rerun (load timeouts only) — fc37b1370
- 2026-11-05 00:32 — 06 — deliver — merged by main session: empty inline ^[] skips the empty mark; review APPROVED; suite failures were load timeouts verified alone; clean rebase — 1ad0306a5
- 2026-11-05 00:32 — 07 — start — launched by /relay-lite:run — dc07a5186
- 2026-11-05 00:32 — 15 — start — launched by /relay-lite:run — dc07a5186
- 2026-11-05 00:48 — 07 — deliver — merged: local graph keeps the note active before the graph tab as center; openGraphTab no-op when already active; review APPROVED x2; findings 2-3 deferred to a follow-up — 59b824233
- 2026-11-05 00:49 — ledger updated (added 20)
- 2026-11-05 00:59 — ledger updated (added 21; title of 20; link of 20)
- 2026-11-05 01:00 — 15 — deliver — merged: rename rewrites only links that resolve to the renamed note; review APPROVED x2 (doc comments + pin test fixed); full suite green after rebase; root-note limit filed as Issue 20 — fdf1479c2
- 2026-11-05 05:05 — 01 — start — launched by /relay-lite:run — e1be4139a
- 2026-11-05 05:05 — 12 — start — launched by /relay-lite:run — e1be4139a
- 2026-11-05 05:37 — 01 — deliver — blocked: review APPROVED, fixes committed after review (CanvasInner deriveds removed, describe timeout 20s); full suite unfinished at return; needs re-review then deliver; follow-up Issue 22 on branch — 76554863c
- 2026-11-05 05:43 — 12 — deliver — blocked: review APPROVED, fixes after review (text typed during save, stale results) need re-review; suite exit 1 on queryjs-contract, MarkdownEditor, event-calendar.model (load-sensitive, outside diff) — f072da694
- 2026-11-05 05:52 — 01 — deliver — merged by main session: keyed CanvasView + path-scoped writer + flush from own data; review APPROVED x2 (round 2 opus re-review); full suite 497 files green; clean rebase; Issue 22 filed — f37acb402
- 2026-11-05 05:52 — ledger updated (added 22)
- 2026-11-05 06:11 — 12 — deliver — merged by main session: composer waits for the written-note ack, keeps text and draft; round 2 opus found a duplicate capture during the flash, fixed test-first; round 3 APPROVED; cargo 1285 + full suite green; clean rebase — 0a1c22a73
- 2026-11-06 00:31 — 02, 03, 05, 08, 10, 13, 14, 16, 17, 18, 21, 22 set to wontfix by hand: migrated to .scratch/audit-2026-11-05/ by the pre-use audit (each Issue file names its new number); the CLI has no transition from todo to wontfix or done
