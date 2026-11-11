# Ledger: mods-power

This file is the source of truth for the progress of the mods-power Issues. Read it before working on any of them. It is written only by `/relay-lite:run`, through `relay ledger`: never edit it by hand.

## Continue

```text
/relay-lite:run mods-power
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
| 01 | [Mods write frontmatter through stable `ctx.vault.updateFrontmatter`](issues/01-stable-update-frontmatter.md) | none | done | issue/01-stable-update-frontmatter (bf7299b0f) | 2026-11-11 |
| 02 | [`ctx.onNoteSaved` passes the saved content and can ignore the mod's own writes](issues/02-on-note-saved-own-writes.md) | 01, 06 | done | issue/02-on-note-saved-own-writes (7898fad95) | 2026-11-11 |
| 03 | [An Auto Organize rule passes a text to its mod action](issues/03-rule-action-input.md) | none | done | issue/03-rule-action-input (2ddd34167) | 2026-11-11 |
| 04 | [Mods match notes with the view and rule expression engine (`ctx.query`)](issues/04-expression-engine-for-mods.md) | 02 | done | issue/04-expression-engine-for-mods (136793f37) | 2026-11-11 |
| 05 | [Mods get `ctx.onNoteMoved` for renames and moves](issues/05-note-path-events.md) | 04, 06 | done | issue/05-note-path-events (c3d500fcf) | 2026-11-11 |
| 06 | [Mod callback errors show in the Labs row and in one toast](issues/06-visible-callback-errors.md) | none | done | issue/06-visible-callback-errors (5e2d103ed) | 2026-11-11 |
| 07 | [A mod declares its settings in the manifest and Labs edits them](issues/07-manifest-declared-settings.md) | 06 | todo | | |
| 08 | [Mods get `ctx.onNoteCreated` for new notes](issues/08-on-note-created.md) | 05 | in-progress | | |

## Log

- 2026-11-11 08:27 — ledger created (8 Issues)
- 2026-11-11 08:37 — 01 — start — launched by /relay-lite:run — 6d59dafcd
- 2026-11-11 08:51 — 01 — deliver — merged as bf7299b0f; reviews APPROVED (claude) x2, round-1 nit fixed in help/documentation/mods/04-vault-files.md; full suite passed (611 files, 15384 tests) — bf7299b0f
- 2026-11-11 08:51 — 03 — start — launched by /relay-lite:run — 91efc9644
- 2026-11-11 09:06 — 03 — deliver — merged as 2ddd34167; reviews APPROVED (claude) x2, round-1 finding fixed in AutoOrganizeRuleRow.svelte with a test (c8584b37f); full suite passed (611 files, 15404 tests) — 2ddd34167
- 2026-11-11 09:07 — 06 — start — launched by /relay-lite:run — d15a83160
- 2026-11-11 09:24 — 06 — deliver — merged as 5e2d103ed; review APPROVED (claude), one test nit declined with reason in review.md; full suite passed (611 files, 15419 tests) — 5e2d103ed
- 2026-11-11 09:24 — 02 — start — launched by /relay-lite:run — 8f8601ffd
- 2026-11-11 09:39 — 02 — deliver — merged as 7898fad95; reviews APPROVED (claude) x2 after a fix round; full suite passed (611 files, 15429 tests); pnpm build not run by deliver — 7898fad95
- 2026-11-11 09:40 — 04 — start — launched by /relay-lite:run — a67559950
- 2026-11-11 09:55 — 04 — deliver — merged as 136793f37; reviews APPROVED (claude) x2, round-1 minor finding fixed (JSDoc and docs); full suite passed (612 files, 15450 tests) — 136793f37
- 2026-11-11 09:55 — 05 — start — launched by /relay-lite:run — 80a11fe77
- 2026-11-11 10:14 — 05 — deliver — merged as c3d500fcf; reviews APPROVED (claude) x2, JSDoc rewrap fix in mods-host.service.ts; full suite passed (613 files, 15469 tests) — c3d500fcf
- 2026-11-11 10:15 — 08 — start — launched by /relay-lite:run — d80d84390
