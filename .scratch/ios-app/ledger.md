# Ledger: ios-app

This file is the source of truth for the progress of the ios-app Issues. Read it before working on any of them. It is written only by `/relay-lite:run`, through `relay ledger`: never edit it by hand.

## Continue

```text
/relay-lite:run ios-app
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
| 01 | [Mac serves the app](issues/01-mac-serves-the-app.md) | none | done | issue/01-mac-serves-the-app (10bf5c36) | 2026-11-02 |
| 02 | [Browser shows the vault tree](issues/02-browser-shows-the-vault-tree.md) | 01 | done | issue/02-browser-shows-the-vault-tree (9301d05f) | 2026-11-02 |
| 03 | [Paths stay inside the vault](issues/03-paths-stay-inside-the-vault.md) | 02 | done | issue/03-paths-stay-inside-the-vault (419c7909) | 2026-11-02 |
| 04 | [Reach it from iPad and iPhone over the tailnet](issues/04-reach-it-from-ipad-and-iphone.md) | 03 | todo | | |
| 05 | [Open and read a note](issues/05-open-and-read-a-note.md) | 02 | todo | | |
| 06 | [Images and embeds load](issues/06-images-and-embeds-load.md) | 03, 05 | todo | | |
| 07 | [Mac changes show up in the browser](issues/07-mac-changes-show-up-in-the-browser.md) | 05 | todo | | |
| 08 | [Edit and save from the browser](issues/08-edit-and-save-from-the-browser.md) | 03, 07 | todo | | |

## Log

- 2026-11-02 06:14 — ledger created (8 Issues)
- 2026-11-02 08:40 — 01 — start — launched by /relay-lite:run — 840d1e55
- 2026-11-02 09:19 — 01 — deliver — merged as 10bf5c36; review CHANGES_REQUESTED then APPROVED twice; fixes: wildcard-port in-use detection via socket2 (no listen), async commands, placeholder docs; teardown stop deferred to 02; vitest 9872 pass + build OK, cargo 1226 pass — 10bf5c36
- 2026-11-02 09:35 — 02 — start — launched by /relay-lite:run — ca98d415
- 2026-11-02 10:20 — 02 — deliver — merged as 9301d05f; review CHANGES_REQUESTED then APPROVED; fixes: path rules and settings redaction for any spelling, server stop ends ws sessions, welcome timeout and proto check, cold start via real session, std-server deviation doc; vitest 9907 pass (1 flaky NoteActionBar on first run) + build OK — 9301d05f
- 2026-11-02 11:00 — 03 — start — launched by /relay-lite:run — 996613ad
- 2026-11-02 11:27 — 03 — deliver — merged as 419c7909; review APPROVED, deliver fixes re-reviewed APPROVED; fixes: missing/null path args refused, vault root required for virtual calls, test labels, fs_path_rule comment; check-then-use race deferred to 08; vitest 10010 pass + build OK, cargo 1283 pass — 419c7909
