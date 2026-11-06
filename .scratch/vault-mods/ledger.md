# Ledger: vault-mods

This file is the source of truth for the progress of the [vault-mods](spec.md) Issues. Read it before working on any of them. It is written only by `/relay-lite:run`, through `relay ledger`: never edit it by hand.

## Continue

```text
/relay-lite:run vault-mods
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
| 01 | [Settings > Labs with a per-vault mods toggle](issues/01-labs-mods-toggle.md) | none | done | issue/01-labs-mods-toggle (32a1263c7) | 2026-11-06 |
| 02 | [Discover and load mods from `_system/mods/`](issues/02-load-mods.md) | 01 | done | issue/02-load-mods (97110117b) | 2026-11-06 |
| 03 | [A mod's rail button opens a picker of its actions](issues/03-rail-button-action-picker.md) | 02 | todo | | |
| 04 | [Reload a mod when its files change, without a restart](issues/04-reload-on-save.md) | 05 | todo | | |
| 05 | [An action takes text input and writes a note (`ctx.vault`)](issues/05-ctx-vault-and-input.md) | 03 | todo | | |
| 06 | [Long runs: progress, log, Stop, and a busy rail button](issues/06-run-view-and-stop.md) | 04 | todo | | |
| 07 | [Mod authoring docs, an example mod and the mods ADR](issues/07-docs-example-adr.md) | 06 | todo | | |
| 08 | [`ctx.http.fetch`, with an MCP Streamable HTTP example mod](issues/08-ctx-http-and-mcp-example.md) | 06, 07 | todo | | |
| 09 | [Spike: can the app run `claude -p` jobs?](issues/09-spike-claude-cli-from-app.md) | none | todo | | |
| 10 | [Rust agent runner (`mods_run_agent`)](issues/10-agent-runs.md) | none | todo | | |
| 11 | [Example mod: idea to PRD and Issues](issues/11-example-idea-to-prd-mod.md) | 05, 06, 13 | todo | | |
| 12 | [Keep uncaught mod errors out of Sentry](issues/12-mod-errors-out-of-sentry.md) | 02 | todo | | |
| 13 | [`ctx.agents.run` and the agent setting in Labs](issues/13-ctx-agents-run.md) | 06, 10 | todo | | |

## Log

- 2026-11-06 08:19 — ledger created (13 Issues)
- 2026-11-06 08:20 — 01 — start — launched by /relay-lite:run — 6bbd5f07d
- 2026-11-06 09:02 — 01 — deliver — merged to main as 32a1263c7; review APPROVED x2 (claude); fix round made setEnabled persist-before-state with error toast, rejected code-formatting nit; full suite + build green after rebase — 32a1263c7
- 2026-11-06 09:04 — 02 — start — launched by /relay-lite:run — 2809ede7b
- 2026-11-06 09:40 — 02 — deliver — merged to feature/vault-mods as 97110117b; review APPROVED x2 (claude); fix round kept read-failure cause, isolated dedupe test folder, hello mod asserts it ran only with toggle on; nits 4-5 not changed; check, mods tests, E2E vault-mods (4) and full suite + build green — 97110117b
