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
| 01 | [Close the relay-lite deliver-phase review gap](issues/01-review-deliver-phase-fixes.md) | none | done | issue/01-review-deliver-phase-fixes (2e295cf4) | 2026-11-01 |
| 02 | [Block fix: commits that change app code without a test](issues/02-fix-commits-require-a-test.md) | none | done | issue/02-fix-commits-require-a-test (0949995e) | 2026-11-01 |
| 03 | [ADR-0034 allows $derived in stores; fix ADR and CLAUDE.md drift](issues/03-adr-0034-derived-in-stores-and-doc-drift.md) | 01 | todo | | |
| 04 | [Import-graph extractor and layer-rule ratchet test](issues/04-layer-rule-ratchet-test.md) | none | done | issue/04-layer-rule-ratchet-test (0f9f960c) | 2026-11-01 |
| 05 | [Feature-cycle ratchet](issues/05-feature-cycle-ratchet.md) | 04 | done | issue/05-feature-cycle-ratchet (3e2bdfb7) | 2026-11-01 |
| 06 | [Make the pure logic set actually pure and guard it with a test](issues/06-pure-logic-guard.md) | 04 | done | issue/06-pure-logic-guard (f6446658) | 2026-11-01 |
| 07 | [Fix-rate report script and rewrite-behind-interface triggers](issues/07-stability-metric-and-rewrite-triggers.md) | none | todo | | |
| 08 | [Generate TS bindings for every IPC DTO with ts-rs, with a CI freshness check](issues/08-ts-rs-generated-ipc-types.md) | none | in-progress | | |
| 09 | [Replace the hand-written TS mirrors with the generated types](issues/09-replace-hand-written-ipc-mirrors.md) | 08 | todo | | |
| 10 | [Typed CommandMap, a call() wrapper, a parity test, and the core migration](issues/10-typed-command-map-and-call.md) | 09 | todo | | |
| 11 | [Event-name registry in Rust and TS, with a typed on() wrapper](issues/11-event-name-registry.md) | 08, 10, 26 | todo | | |
| 12 | [Type the E2E mock against CommandMap and cover every invoked command](issues/12-type-the-e2e-ipc-mock.md) | 10, 11, 36 | todo | | |
| 13 | [Clippy clean-up, then a CI gate](issues/13-clippy-clean-then-gate.md) | none | done | issue/13-clippy-clean-then-gate (75c7c10c) | 2026-11-01 |
| 14 | [Model test for the Calendar write queue, overlay and tombstones](issues/14-calendar-write-queue-model-test.md) | none | in-progress | | |
| 15 | [One pointer-gesture guard and one focus-return rule for the Calendar](issues/15-calendar-single-gesture-guard.md) | none | todo | | |
| 16 | [Live-preview invariants harness over a markdown corpus](issues/16-live-preview-invariants-harness.md) | none | done | issue/16-live-preview-invariants-harness (8f8523a7) | 2026-11-01 |
| 17 | [Pin the view-lens seed/latch logic and note writes](issues/17-pin-rail-lens-latch-before-classic-removal.md) | none | done | issue/17-pin-rail-lens-latch-before-classic-removal (8484df17) | 2026-11-01 |
| 18 | [Versioned KBAPI v1 contract (typed contract, kb.version, surface snapshot)](issues/18-kbapi-v1-contract.md) | none | todo | | |
| 19 | [Run every help/ QueryJS example through the widget's runner against fixture vaults](issues/19-run-help-queryjs-examples-as-contract-tests.md) | none | todo | | |
| 20 | [Move shared pure logic and settings types below the features](issues/20-move-shared-pure-logic-below-features.md) | 04, 05, 06 | in-progress | | |
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
| 35 | [The macOS fonts CI job runs zero tests](issues/35-fix-macos-fonts-ci-filter.md) | none | done | issue/35-fix-macos-fonts-ci-filter (15519540) | 2026-11-01 |
| 36 | [The E2E mock returns null for scan_vault_v2_cached](issues/36-e2e-mock-scan-vault-v2-cached.md) | none | done | issue/36-e2e-mock-scan-vault-v2-cached (868896ae) | 2026-11-01 |
| 37 | [Migrate the remaining invoke sites to call()](issues/37-migrate-remaining-invoke-sites-to-call.md) | 10 | todo | | |
| 38 | [page._type and the relationship keys disappear after an edit and return after a rebuild](issues/38-type-disappears-after-edit.md) | none | done | issue/38-type-disappears-after-edit (06cd5f35) | 2026-11-01 |
| 39 | [relationship keys differ between edit and rebuild for unquoted wikilinks in a list](issues/39-relationship-parity-unquoted-wikilinks.md) | none | done | issue/39-relationship-parity-unquoted-wikilinks (7c46f6bf) | 2026-11-01 |
| 40 | [The macOS CI guard checks the tests it means, per binary](issues/40-macos-ci-guard-per-target-counts.md) | none | todo | | |
| 41 | [An anchored wikilink empties the parsed frontmatter](issues/41-anchored-wikilink-empties-frontmatter.md) | none | done | issue/41-anchored-wikilink-empties-frontmatter (ecd8c482) | 2026-11-01 |
| 42 | [Meta-bind inline writers drop the frontmatter when it does not parse](issues/42-meta-bind-writers-parse-guard.md) | none | done | issue/42-meta-bind-writers-parse-guard (bf114d0b) | 2026-11-01 |
| 43 | [Bound the alias-resolution pass in the frontmatter parse](issues/43-bound-the-alias-resolution-pass.md) | none | done | issue/43-bound-the-alias-resolution-pass (7006c723) | 2026-11-01 |
| 44 | [Leaving a meta-bind number or date input clears a value it cannot show](issues/44-meta-bind-input-sanitized-value-wipe.md) | none | done | issue/44-meta-bind-input-sanitized-value-wipe (ac22d458) | 2026-11-01 |

## Leftovers

## Log

- 2026-11-01 08:55 — ledger created (38 Issues)
- 2026-11-01 08:57 — 34 — start — launched by /relay-lite:run — ff4bae3d
- 2026-11-01 09:05 — 34 — deliver — merged as one squash commit; switchVault saves dirty tabs before the calendar drain and the path change (deep links too); 1 review round APPROVED (claude), 1 minor finding fixed as a comment; full suite 9013 passed, build ok — 98a9c580
- 2026-11-01 09:05 — 38 — start — launched by /relay-lite:run — 273edb27
- 2026-11-01 09:22 — 35 — start — launched by /relay-lite:run — 06cd5f35
- 2026-11-01 09:22 — 38 — deliver — merged as one squash commit; the TS edit path now injects _type and the relationship keys like project_note_record; 1 review round APPROVED (claude), 2 findings fixed with tests, 2 deferred to Issue 39; full suite 9071 passed, cargo 1141 passed, build ok — 06cd5f35
- 2026-11-01 09:25 — ledger updated (added 39)
- 2026-11-01 09:27 — 01 — start — launched by /relay-lite:run — bc51afd1
- 2026-11-01 09:31 — 35 — deliver — merged as one squash commit; the macOS CI job runs the fonts lib tests and the macOS-gated integration tests, and fails on a zero-test filter; 1 review round APPROVED (claude), 3 findings fixed, 1 nit kept; full suite 9071 passed, actionlint ok; the real macOS CI run is not verified yet — 15519540
- 2026-11-01 09:34 — ledger updated (added 40)
- 2026-11-01 09:36 — 01 — deliver — merged as one squash commit; CLAUDE.md Implementation process records option (B), a post-delivery adversarial review of deliver-phase source fixes, anchored on the review file; round 1 CHANGES_REQUESTED, round 2 APPROVED (claude); full suite 9071 passed, build ok; second criterion waits for the next source-changing delivery — 2e295cf4
- 2026-11-01 09:36 — 02 — start — launched by /relay-lite:run — dbb6786b
- 2026-11-01 09:38 — 13 — start — launched by /relay-lite:run — 1f83f5db
- 2026-11-01 09:38 — 36 — start — launched by /relay-lite:run — 1f83f5db
- 2026-11-01 10:00 — 02 — deliver — merged as one squash commit; commit-msg hook, range check script and commit-policy CI workflow block fix: commits that change app code (.svelte included) without a test or a Test-Exempt trailer; round 1 CHANGES_REQUESTED, round 2 APPROVED (claude); nothing after the last review, so no post-delivery review; full suite 9106 passed, build ok; commit-policy.yml not yet run on Actions — 0949995e
- 2026-11-01 10:00 — 04 — start — launched by /relay-lite:run — 61f960c7
- 2026-11-01 10:04 — 36 — deliver — merged as one squash commit; the E2E mock answers scan_vault_v2_cached with a real CachedScanResult and a fixture fails specs on unknown mock commands; 1 review round APPROVED (claude), 1 nit fixed in the mock (test code, no post-delivery review); full suite 9106 passed, build ok, reviewer E2E 290 passed before the nit fix — 868896ae
- 2026-11-01 10:04 — 17 — start — launched by /relay-lite:run — 73aae4eb
- 2026-11-01 10:14 — 13 — deliver — merged as one squash commit; clippy clean with -D warnings, clippy step added to the CI rust job; round 1 CHANGES_REQUESTED, round 2 APPROVED (claude); nothing after the last review; vitest 9106 passed, cargo 1141 passed, build ok — 75c7c10c
- 2026-11-01 10:17 — 04 — deliver — merged as one squash commit; scripts/import-graph.mjs extracts src/lib imports and a ratchet test enforces the ADR-0003 layer rules against a 58-entry shrink-only baseline; 1 review round APPROVED (claude), 3 findings fixed, 2 rejected; full suite 9135 passed, build ok — 0f9f960c
- 2026-11-01 10:18 — 39 — start — launched by /relay-lite:run — 852397e3
- 2026-11-01 10:20 — 17 — deliver — workflow merge hit conflict 3 times (main kept moving); the main session reran deliver sync (only a .scratch commit came in) and deliver merge; latch logic in a pure .logic.ts, the two lost TypeNoteList cases ported, raw writeTextFile ratchet; 1 review round APPROVED (claude), fix was tests only; full suite 9156 passed, build ok — 8484df17
- 2026-11-01 10:37 — 39 — deliver — merged as one squash commit; unquoted [[X]] list items and a bare type: now project the same on the edit path and on rebuild; 1 review round APPROVED (claude), 3 findings fixed (parseFrontmatterProperties moved to parseDocument, needs a post-delivery review); vitest 9154 passed, cargo 1141 passed, build ok — 7c46f6bf
- 2026-11-01 10:40 — ledger updated (added 41)
- 2026-11-01 10:49 — 41 — start — launched by /relay-lite:run — 0bb147a6
- 2026-11-01 11:08 — 41 — deliver — merged as one squash commit; aliases resolve before the unquoted-wikilink fold, so an anchored wikilink no longer empties the frontmatter; YAML warnings logged again; panel edits refuse to drop keys on a failed parse; 1 review round APPROVED (claude), 2 fixes, 1 finding filed as Issue 42; vitest 9179 passed, cargo 1141 passed, build ok — ecd8c482
- 2026-11-01 11:08 — ledger updated (added 42)
- 2026-11-01 11:21 — 05 — start — launched by /relay-lite:run — 6c816db7
- 2026-11-01 11:21 — 42 — start — launched by /relay-lite:run — 6c816db7
- 2026-11-01 11:32 — 42 — deliver — merged as one squash commit; meta-bind inline writers refuse to rewrite frontmatter that does not parse, reset the control and toast once; 1 review round APPROVED (claude), 4 findings fixed in source (post-delivery review needed); full suite 9200 passed, build ok — bf114d0b
- 2026-11-01 11:34 — ledger updated (added 43)
- 2026-11-01 11:54 — 05 — deliver — merged as one squash commit; features->features pair baseline, Tarjan SCC ratchet that fails on any new cycle, try/catch around the import-graph CLI guard; round 1 CHANGES_REQUESTED, round 2 APPROVED (claude); nothing after the last review; full suite 9221 passed, build ok — 3e2bdfb7
- 2026-11-01 11:54 — ledger updated (added 44)
- 2026-11-01 11:54 — 43 — start — launched by /relay-lite:run — fc80f272
- 2026-11-01 11:54 — 14 — start — launched by /relay-lite:run — fc80f272
- 2026-11-01 11:54 — 16 — start — launched by /relay-lite:run — fc80f272
- 2026-11-01 12:13 — 43 — deliver — merged as one squash commit; one anchor map per parse and a copy budget bound the alias pass, over-budget notes parse to [] as before Issue 41; round 1 CHANGES_REQUESTED, round 2 APPROVED (claude); nothing after the last review; full suite 9250 passed, build ok — 7006c723
- 2026-11-01 12:13 — 06 — start — launched by /relay-lite:run — f096bc12
- 2026-11-01 12:19 — 16 — deliver — merged as one squash commit; live-preview invariants harness runs the help/ markdown corpus through the editor and checks crashes, console errors, drag flags and listener leaks; 1 review round APPROVED (claude), fixes were tests only; full suite 9276 passed, build ok — 8f8523a7
- 2026-11-01 12:19 — 44 — start — launched by /relay-lite:run — bd16f11f
- 2026-11-01 12:25 — 06 — deliver — merged as one squash commit; properties.logic logs through a diagnostics sink wired in the app layout, the other impure logic files cleaned, a test forbids framework and SvelteKit imports in the pure logic set; 1 review round APPROVED (claude), fixes were tests and an ADR line; full suite 9284 passed, build ok — f6446658
- 2026-11-01 12:30 — 44 — deliver — merged as one squash commit; a number or date value the input cannot hold renders as a text input with the raw value, and leaving the field never writes; 1 review round APPROVED (claude), fixes were comments and a test; full suite 9306 passed, build ok; WKWebView check left to the owner — ac22d458
- 2026-11-01 12:38 — 20 — start — launched by /relay-lite:run — fc7e0cc9
- 2026-11-01 12:38 — 08 — start — launched by /relay-lite:run — fc7e0cc9
