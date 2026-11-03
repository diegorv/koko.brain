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
| 04 | [Reach it from iPad and iPhone over the tailnet](issues/04-reach-it-from-ipad-and-iphone.md) | 03 | done | issue/04-reach-it-from-ipad-and-iphone (b914030f) | 2026-11-02 |
| 05 | [Open and read a note](issues/05-open-and-read-a-note.md) | 02 | done | issue/05-open-and-read-a-note (59088ec5) | 2026-11-02 |
| 06 | [Images and embeds load](issues/06-images-and-embeds-load.md) | 03, 05 | done | issue/06-images-and-embeds-load (7a35a2e5) | 2026-11-02 |
| 07 | [Mac changes show up in the browser](issues/07-mac-changes-show-up-in-the-browser.md) | 05 | done | issue/07-mac-changes-show-up-in-the-browser (6f849744) | 2026-11-02 |
| 08 | [Edit and save from the browser](issues/08-edit-and-save-from-the-browser.md) | 03, 07 | done | issue/08-edit-and-save-from-the-browser (7f5e074c) | 2026-11-02 |
| 09 | [Browser activity shows up in the Mac log](issues/09-browser-activity-in-the-mac-log.md) | none | done | issue/09-browser-activity-in-the-mac-log (920c37bb) | 2026-11-03 |
| 10 | [The browser warns before closing with unsaved edits, stops refused calls and Sentry, and explains a 403](issues/10-browser-warns-before-closing-and-stops-boot-noise.md) | none | todo | | |

## Log

- 2026-11-02 06:14 — ledger created (8 Issues)
- 2026-11-02 08:40 — 01 — start — launched by /relay-lite:run — 840d1e55
- 2026-11-02 09:19 — 01 — deliver — merged as 10bf5c36; review CHANGES_REQUESTED then APPROVED twice; fixes: wildcard-port in-use detection via socket2 (no listen), async commands, placeholder docs; teardown stop deferred to 02; vitest 9872 pass + build OK, cargo 1226 pass — 10bf5c36
- 2026-11-02 09:35 — 02 — start — launched by /relay-lite:run — ca98d415
- 2026-11-02 10:20 — 02 — deliver — merged as 9301d05f; review CHANGES_REQUESTED then APPROVED; fixes: path rules and settings redaction for any spelling, server stop ends ws sessions, welcome timeout and proto check, cold start via real session, std-server deviation doc; vitest 9907 pass (1 flaky NoteActionBar on first run) + build OK — 9301d05f
- 2026-11-02 11:00 — 03 — start — launched by /relay-lite:run — 996613ad
- 2026-11-02 11:27 — 03 — deliver — merged as 419c7909; review APPROVED, deliver fixes re-reviewed APPROVED; fixes: missing/null path args refused, vault root required for virtual calls, test labels, fs_path_rule comment; check-then-use race deferred to 08; vitest 10010 pass + build OK, cargo 1283 pass — 419c7909
- 2026-11-02 14:29 — 05 — start — launched by /relay-lite:run — f09cc13b
- 2026-11-02 15:08 — 05 — deliver — merged as 59088ec5; review APPROVED with 6 findings, 5 fixed and re-reviewed APPROVED (fake host refuses unlisted commands, link-panel read test, buffered pending listen, open_url scheme allowlist, unlinked mentions no-vault test); plain Dialog kept; one nit unfixed (device-local.ts:14 spacing); vitest 10083 pass + build OK, cargo 1285 pass — 59088ec5
- 2026-11-02 15:09 — 04 — start — launched by /relay-lite:run — 388416d8
- 2026-11-02 15:30 — 04 — deliver — merged as b914030f; review APPROVED with findings, deliver fix re-reviewed APPROVED; fixes: inline note when a typed port is replaced, login is case-sensitive in Settings copy; call-timeout session end left to owner check; nit unfixed (port note compares raw text); vitest 10101 pass + build OK; Serve identity headers on non-443 port unverified (owner check) — b914030f
- 2026-11-02 15:33 — 07 — start — launched by /relay-lite:run — 5f279d0b
- 2026-11-02 16:03 — 07 — deliver — merged as 6f849744; review APPROVED with 6 findings, all fixed and re-reviewed APPROVED (EventMap parser reads every key form, reload skips tabs dirtied mid-read, positive control test, toast on failed reconnect refresh, idle session closed, publish skips parse with no subscriber); app:exit-requested never forwarded; vitest 10114 pass + build OK, cargo 1305 pass — 6f849744
- 2026-11-02 16:03 — 06 — start — launched by /relay-lite:run — 99a0762c
- 2026-11-02 16:22 — 06 — deliver — merged as 7a35a2e5; review APPROVED with 4 findings, all fixed and re-reviewed APPROVED (no Range support documented, shared vault_path_rule helper, HEAD reads metadata only and 404s folders, doc rewrap); nit kept (HEAD 200 on unreadable file); vitest 10116 pass + build OK, cargo 1326 pass — 7a35a2e5
- 2026-11-02 16:22 — 08 — start — launched by /relay-lite:run — 5c963e87
- 2026-11-02 16:59 — 08 — deliver — merged as 7f5e074c; review APPROVED, fix round re-reviewed APPROVED (conflict message re-shows on typing, auto-move skips mkdir in browser, write honors plugin-fs options header); temp-file+rename rejected (changes file identity); writes use O_NOFOLLOW; vitest 10140 pass + build OK, cargo 43 binaries ok, clippy clean; E2E not run in deliver — 7f5e074c
- 2026-11-03 10:27 — ledger updated (added 09)
- 2026-11-03 10:29 — 09 — start — launched by /relay-lite:run — b22ebc2e
- 2026-11-03 10:57 — 09 — deliver — merged as 920c37bb; review CHANGES_REQUESTED then APPROVED after the fix round; vitest 10726 pass + build OK; remote_* cargo tests pass; full cargo test and E2E not run by deliver — 920c37bb
- 2026-11-03 11:40 — ledger updated (added 10)
