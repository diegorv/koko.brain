# Ledger: claude-session-history

This file is the source of truth for the progress of the [claude-session-history](spec.md) Issues. Read it before working on any of them. It is written only by `/relay-lite:run`, through `relay ledger`: never edit it by hand.

## Continue

```text
/relay-lite:run claude-session-history
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
| 01 | [A resume whose session is gone keeps the chat and starts a new session](issues/01-gone-session-starts-over.md) | none | done | issue/01-gone-session-starts-over (893431088) | 2026-11-16 |
| 02 | [Panel chats are saved in the vault, and the last one comes back](issues/02-save-and-restore-last-chat.md) | 01 | done | issue/02-save-and-restore-last-chat (746874e52) | 2026-11-16 |
| 03 | [A history list reopens and deletes older chats](issues/03-chat-history-list.md) | 02 | in-progress | | |

## Log

- 2026-11-15 23:09 — ledger created (3 Issues)
- 2026-11-15 23:09 — 01 — start — launched by /relay-lite:run — b1ce31701
- 2026-11-16 01:22 — 01 — deliver — Review round 1 APPROVED (2 nits not changed); merged onto mvp-claude at 893431088; cargo 1559 passed, vitest 17111 passed — 893431088
- 2026-11-16 01:22 — 02 — start — launched by /relay-lite:run — d4f8540bf
- 2026-11-16 02:18 — 02 — deliver — Round 1 CHANGES_REQUESTED, fix round, round 2 APPROVED; merged onto mvp-claude at 746874e52; vitest 17167 passed — 746874e52
- 2026-11-16 02:26 — 03 — start — launched by /relay-lite:run — fd2262e96
