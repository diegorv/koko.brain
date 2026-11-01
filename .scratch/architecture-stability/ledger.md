# Ledger: architecture-stability

This file is the source of truth for the progress of the architecture-stability Issues. Read it before working on any of them. It is written only by `/relay-lite:run`, through `relay ledger`: never edit it by hand.

## Continue

```text
/relay-lite:run architecture-stability
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
| 01 | [Close the relay-lite deliver-phase review gap](issues/01-review-deliver-phase-fixes.md) | none | todo | | |
| 02 | [Block fix: commits that change app code without a test](issues/02-fix-commits-require-a-test.md) | none | todo | | |
| 03 | [ADR-0034 allows $derived in stores; fix ADR and CLAUDE.md drift](issues/03-adr-0034-derived-in-stores-and-doc-drift.md) | 01 | todo | | |
| 04 | [Import-graph extractor and layer-rule ratchet test](issues/04-layer-rule-ratchet-test.md) | none | todo | | |
| 05 | [Feature-cycle ratchet](issues/05-feature-cycle-ratchet.md) | 04 | todo | | |
| 06 | [Make the pure logic set actually pure and guard it with a test](issues/06-pure-logic-guard.md) | 04 | todo | | |
| 07 | [Fix-rate report script and rewrite-behind-interface triggers](issues/07-stability-metric-and-rewrite-triggers.md) | none | todo | | |
| 08 | [Generate TS bindings for every IPC DTO with ts-rs, with a CI freshness check](issues/08-ts-rs-generated-ipc-types.md) | none | todo | | |
| 09 | [Replace the hand-written TS mirrors with the generated types](issues/09-replace-hand-written-ipc-mirrors.md) | 08 | todo | | |
| 10 | [Typed CommandMap, a call() wrapper, a parity test, and the core migration](issues/10-typed-command-map-and-call.md) | 09 | todo | | |
| 11 | [Event-name registry in Rust and TS, with a typed on() wrapper](issues/11-event-name-registry.md) | 08, 10, 26 | todo | | |
| 12 | [Type the E2E mock against CommandMap and cover every invoked command](issues/12-type-the-e2e-ipc-mock.md) | 10, 11, 36 | todo | | |
| 13 | [Clippy clean-up, then a CI gate](issues/13-clippy-clean-then-gate.md) | none | todo | | |
| 14 | [Model test for the Calendar write queue, overlay and tombstones](issues/14-calendar-write-queue-model-test.md) | none | todo | | |
| 15 | [One pointer-gesture guard and one focus-return rule for the Calendar](issues/15-calendar-single-gesture-guard.md) | none | todo | | |
| 16 | [Live-preview invariants harness over a markdown corpus](issues/16-live-preview-invariants-harness.md) | none | todo | | |
| 17 | [Pin the view-lens seed/latch logic and note writes](issues/17-pin-rail-lens-latch-before-classic-removal.md) | none | todo | | |
| 18 | [Versioned KBAPI v1 contract (typed contract, kb.version, surface snapshot)](issues/18-kbapi-v1-contract.md) | none | todo | | |
| 19 | [Run every help/ QueryJS example through the widget's runner against fixture vaults](issues/19-run-help-queryjs-examples-as-contract-tests.md) | none | todo | | |
| 20 | [Move shared pure logic and settings types below the features](issues/20-move-shared-pure-logic-below-features.md) | 04, 05, 06 | todo | | |
| 21 | [App-lifetime ports for core's remaining service-level reaches](issues/21-app-lifetime-ports-for-core.md) | 20, 34 | todo | | |
| 22 | [Create the src/lib/app/ composition root](issues/22-app-composition-root.md) | 04, 21 | todo | | |
| 23 | [Break the properties / type-definitions / file-icons cycle](issues/23-break-properties-type-definitions-cycle.md) | 05, 21, 22 | todo | | |
| 24 | [Firewall NoteEntryV2/NoteRecordV2 from the KBPage shape](issues/24-kbapi-firewall-from-rust-dtos.md) | 09, 18 | todo | | |
| 25 | [25 (wontfix unless 22 is too big): Plugin registry pilot](issues/25-plugin-registry-pilot-one-on-one.md) | 22 | wontfix | | |
| 26 | [Make logger and watcher Tauri-free (single crate)](issues/26-rust-logger-and-watcher-tauri-free.md) | none | todo | | |
| 27 | [Make semantic build and model downloads testable without an AppHandle](issues/27-move-semantic-orchestration-out-of-commands.md) | none | todo | | |
| 28 | [28 (deferred until a second Rust consumer exists): Move vault/search/history/files command logic out of commands/](issues/28-move-command-logic-into-domain-modules.md) | none | todo | | |
| 29 | [29 (deferred until a second Rust consumer exists): Create the Cargo workspace and the kokobrain-core crate](issues/29-cargo-workspace-and-core-crate.md) | 26, 27, 28 | todo | | |
| 30 | [30 (deferred, follows 29): Move core tests into the core crate and drop the re-export shim](issues/30-move-core-tests-into-core-crate.md) | 29 | todo | | |
| 31 | [EditorHost facet and profiling port for core/markdown-editor](issues/31-editor-host-facet.md) | 20, 22, 23 | todo | | |
| 32 | [Fenced block renderer registry; queryjs and collection widgets leave the editor](issues/32-fenced-block-renderer-registry.md) | 31 | todo | | |
| 33 | [33 (deferred until a second consumer exists): Move the editor engine into packages/editor](issues/33-editor-package-deferred.md) | 32 | todo | | |
| 34 | [Save dirty tabs before the vault switches, so the last save keeps its history snapshot and search row](issues/34-save-dirty-tabs-before-vault-switch.md) | none | done | issue/34-save-dirty-tabs-before-vault-switch (98a9c580) | 2026-11-01 |
| 35 | [The macOS fonts CI job runs zero tests](issues/35-fix-macos-fonts-ci-filter.md) | none | in-progress | | |
| 36 | [The E2E mock returns null for scan_vault_v2_cached](issues/36-e2e-mock-scan-vault-v2-cached.md) | none | todo | | |
| 37 | [Migrate the remaining invoke sites to call()](issues/37-migrate-remaining-invoke-sites-to-call.md) | 10 | todo | | |
| 38 | [page._type and the relationship keys disappear after an edit and return after a rebuild](issues/38-type-disappears-after-edit.md) | none | done | issue/38-type-disappears-after-edit (06cd5f35) | 2026-11-01 |
| 39 | [relationship keys differ between edit and rebuild for unquoted wikilinks in a list](issues/39-relationship-parity-unquoted-wikilinks.md) | none | todo | | |

## Leftovers

## Log

- 2026-11-01 08:55 — ledger created (38 Issues)
- 2026-11-01 08:57 — 34 — start — launched by /relay-lite:run — ff4bae3d
- 2026-11-01 09:05 — 34 — deliver — merged as one squash commit; switchVault saves dirty tabs before the calendar drain and the path change (deep links too); 1 review round APPROVED (claude), 1 minor finding fixed as a comment; full suite 9013 passed, build ok — 98a9c580
- 2026-11-01 09:05 — 38 — start — launched by /relay-lite:run — 273edb27
- 2026-11-01 09:22 — 35 — start — launched by /relay-lite:run — 06cd5f35
- 2026-11-01 09:22 — 38 — deliver — merged as one squash commit; the TS edit path now injects _type and the relationship keys like project_note_record; 1 review round APPROVED (claude), 2 findings fixed with tests, 2 deferred to Issue 39; full suite 9071 passed, cargo 1141 passed, build ok — 06cd5f35
- 2026-11-01 09:25 — ledger updated (added 39)
