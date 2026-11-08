# Ledger: mods-observability

This file is the source of truth for the progress of the mods-observability Issues. Read it before working on any of them. It is written only by `/relay-lite:run`, through `relay ledger`: never edit it by hand.

## Continue

```text
/relay-lite:run mods-observability
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
| 01 | [Trace host-managed mod execution in the local session log](issues/01-host-execution-trace.md) | none | done | issue/01-host-execution-trace (e320268f4) | 2026-11-07 |
| 02 | [Preserve run.log messages locally with explicit consent](issues/02-opt-in-run-log-persistence.md) | 01 | done | issue/02-opt-in-run-log-persistence (eea4ae3cd) | 2026-11-07 |
| 03 | [Record content-free outcomes of host-provided mod dialogs](issues/03-content-free-dialog-outcomes.md) | none | done | issue/03-content-free-dialog-outcomes (882ccb2eb) | 2026-11-07 |

## Log

- 2026-11-07 20:13 — ledger created (4 Issues)
- 2026-11-07 20:17 — 01 — start — launched by /relay-lite:run — 0b3eb4a03
- 2026-11-07 20:17 — 03 — start — launched by /relay-lite:run — 163a3517b
- 2026-11-07 20:42 — 01 — deliver — Review round 1 APPROVED by Claude, no findings or fixes; full frontend suite passed: 577 files, 13956 tests, 54 skipped, 1 todo; typecheck, 735 targeted tests and 15 mods E2E tests passed. Sync clean, merge merged; worktree and branch removed. Post-review diff contains only Issue bookkeeping. Native WKWebView session-file delivery remains unverified. — e320268f4
- 2026-11-07 20:45 — 02 — start — launched by /relay-lite:run — e2f9cfcc7
- 2026-11-07 20:48 — 03 — deliver — Merged content-free dialog lifecycle diagnostics. Claude review round 1 APPROVED with a minor store/service separation finding; delivery moved diagnostics into the host service and added a state-only regression; Claude round 2 APPROVED with no remaining findings. Full suite: 577 files, 13965 passed, 0 failed, 54 skipped, 1 todo; targeted: 639 passed; pnpm check: 0 errors/warnings. Sync rebased, merge merged; worktree and branch removed. Mods E2E, production build and native webview not verified. — 882ccb2eb
- 2026-11-07 21:09 — 02 — deliver — Round 1 APPROVED by Claude with no findings or fixes. Full frontend suite passed: 577 files, 13975 tests, 0 failed, 54 skipped, 1 todo; pnpm check, 1377 targeted tests and 24 affected browser tests passed. Sync rebased, merge merged; worktree and branch removed. Verified post-review diff has no changes outside Issue bookkeeping. Native WKWebView unverified; persistence is best-effort and opting out does not erase existing messages. — eea4ae3cd
- 2026-11-08 12:00 — ledger updated (moved 1 open Issues to .scratch/open-itens: 04→231)
