# Ledger: claude-code-integration

This file is the source of truth for the progress of the claude-code-integration Issues. Read it before working on any of them. It is written only by `/relay-lite:run`, through `relay ledger`: never edit it by hand.

## Continue

```text
/relay-lite:run claude-code-integration
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
| 01 | [Detect the `claude` binary and show its status in Settings](issues/01-claude-binary-detection.md) | none | done | issue/01-claude-binary-detection (69a180e69) | 2026-11-14 |
| 02 | [Rust turn runner: spawn, NDJSON to events, cancel](issues/02-rust-turn-runner.md) | 01 | done | issue/02-rust-turn-runner (d7a921df5) | 2026-11-14 |
| 03 | [Agent panel: chat, note context, slash commands](issues/03-claude-chat-panel.md) | 02 | done | issue/03-claude-chat-panel (6f72a4e17) | 2026-11-14 |
| 04 | [Claude Code settings per machine, not in the vault](issues/04-claude-settings-per-machine.md) | 01 | wontfix | | |
| 05 | [Run `claude` with the login shell's environment](issues/05-login-shell-env-for-claude.md) | 02 | done | issue/05-login-shell-env-for-claude (3cd72c8c6) | 2026-11-14 |
| 06 | [Remote images in Claude replies can leak data](issues/06-remote-images-in-replies.md) | 03 | wontfix | | |
| 07 | [Cancel misses a child forked during `killpg`](issues/07-cancel-misses-a-child-forked-during-killpg.md) | 05 | done | issue/07-cancel-misses-a-child-forked-during-killpg (e1b69f51e) | 2026-11-15 |
| 08 | [Replace the hand-written stream-json fixture with a real capture](issues/08-real-stream-json-fixture.md) | 03 | done | issue/08-real-stream-json-fixture (46213233d) | 2026-11-15 |
| 09 | [A run started before a vault switch leaks into the new vault's chat](issues/09-stale-run-after-vault-switch.md) | 03 | todo | | |
| 10 | [The status check finds `claude` the way a turn does](issues/10-status-uses-turn-env.md) | 05 | done | issue/10-status-uses-turn-env (95945e00a) | 2026-11-15 |
| 11 | [Quitting the app cancels running turns](issues/11-cancel-turns-on-app-exit.md) | 07 | in-progress | | |
| 12 | [Panel follows the reply, keeps focus, and handles IME and slash-menu keys](issues/12-panel-scroll-focus-keys.md) | 10 | todo | | |
| 13 | [Stream and chat keep the session, the error cause and retried text right](issues/13-stream-session-errors-retries.md) | 12 | todo | | |

## Log

- 2026-11-14 21:17 — ledger created (3 Issues)
- 2026-11-14 21:17 — 01 — start — launched by /relay-lite:run — a8e1f1c68
- 2026-11-14 21:21 — 01 — start — launched by /relay-lite:run on mvp-claude — 2f1efc8d6
- 2026-11-14 21:37 — ledger updated (added 04; blocked by of 02)
- 2026-11-14 21:49 — 01 — deliver — merged on mvp-claude; review CHANGES_REQUESTED then APPROVED x2; fixes: cancel on first-enable notice resets switch, timeout doc, settings help section, shell_from_env with test; full suite 639 files / 16958 tests passed — 69a180e69
- 2026-11-14 21:50 — ledger updated (blocked by of 02; wontfix 04)
- 2026-11-14 21:50 — 02 — start — launched by /relay-lite:run on mvp-claude — a1f5680b0
- 2026-11-14 21:56 — ledger updated (added 05)
- 2026-11-14 22:23 — 02 — deliver — merged on mvp-claude; review APPROVED x2; fix: Done still sent when a leftover process keeps stderr open (stderr drain timeout); open nit: stderr tail dropped on drain timeout; cargo 1507 passed, clippy clean, vitest 639 files / 16960 tests passed — d7a921df5
- 2026-11-14 22:24 — 03 — start — launched by /relay-lite:run on mvp-claude (parallel with 05) — fc71eaee4
- 2026-11-14 22:24 — 05 — start — launched by /relay-lite:run on mvp-claude (parallel with 03) — fc71eaee4
- 2026-11-14 22:36 — ledger updated (added 06)
- 2026-11-14 22:43 — 03 — deliver — blocked: criterion on prompts starting with - needs an owner decision (-- in build_args, Rust, outside Files src/,e2e/; or escape/refuse in panel); rest of the Issue built and committed in the worktree — 239e66c39
- 2026-11-14 23:23 — 05 — deliver — merged on mvp-claude; review APPROVED x2; fixes: capture session killed after a clean shell exit, lingering-shell test, capturing flag so Check again is not dropped; cancel race moved to Issue 07 (needs-triage); cargo 1536 passed, clippy clean, vitest 639 files / 16960 tests passed — 3cd72c8c6
- 2026-11-14 23:23 — ledger updated (added 07)
- 2026-11-14 23:23 — 03 — start — retry by /relay-lite:run on mvp-claude after owner decision (-- in build_args) — 520912c50
- 2026-11-14 23:47 — 03 — deliver — merged on mvp-claude; review APPROVED x2; prompt after -- in build_args (Rust tests); fixes: chat closes on vault switch, turn stays running until Done, chip radius; open: stale run id after vault switch (minor), longer closing fence (nit); vitest 643 files / 17069 tests passed; cargo targeted only — 6f72a4e17
- 2026-11-14 23:47 — ledger updated (added 08, 09)
- 2026-11-15 06:08 — 07 — start — launched by /relay-lite:run — 4efafbf6a
- 2026-11-15 06:32 — 07 — deliver — review round 1 APPROVED (claude), 1 minor + 2 nits accepted with no code change; vitest 17069 passed, cargo test 1538 passed; squash merged on mvp-claude — e1b69f51e
- 2026-11-15 06:32 — 08 — start — launched by /relay-lite:run — ac15f70a6
- 2026-11-15 06:50 — 08 — deliver — review round 1 APPROVED, round 2 APPROVED (claude); real capture as fixture; vitest 17069 passed, cargo test 1540 passed; squash merged on mvp-claude — 46213233d
- 2026-11-15 08:09 — ledger updated (added 10, 11, 12, 13)
- 2026-11-15 08:09 — 10 — start — launched by /relay-lite:run — a367628a1
- 2026-11-15 08:34 — 10 — deliver — review round 1 APPROVED, round 2 APPROVED (claude); fix bba7bd950 shows checking state in Settings; vitest 17078 passed; squash merged on mvp-claude — 95945e00a
- 2026-11-15 08:34 — 11 — start — launched by /relay-lite:run — ec181e01b
- 2026-11-15 08:48 — 11 — deliver — blocked: disk full (284 MiB free), full suite could not run; review round 1 APPROVED; worktree kept at 44e8a8f45 — 8ae2affd2
- 2026-11-15 09:04 — 11 — start — deliver finished by hand by the main session after freeing disk — 9509904c8
