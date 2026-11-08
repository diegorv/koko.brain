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
| 03 | [ADR-0034 allows $derived in stores; fix ADR and CLAUDE.md drift](issues/03-adr-0034-derived-in-stores-and-doc-drift.md) | 01 | done | issue/03-adr-0034-derived-in-stores-and-doc-drift (1b1c3b8d) | 2026-11-01 |
| 04 | [Import-graph extractor and layer-rule ratchet test](issues/04-layer-rule-ratchet-test.md) | none | done | issue/04-layer-rule-ratchet-test (0f9f960c) | 2026-11-01 |
| 05 | [Feature-cycle ratchet](issues/05-feature-cycle-ratchet.md) | 04 | done | issue/05-feature-cycle-ratchet (3e2bdfb7) | 2026-11-01 |
| 06 | [Make the pure logic set actually pure and guard it with a test](issues/06-pure-logic-guard.md) | 04 | done | issue/06-pure-logic-guard (f6446658) | 2026-11-01 |
| 07 | [Fix-rate report script and rewrite-behind-interface triggers](issues/07-stability-metric-and-rewrite-triggers.md) | none | done | issue/07-stability-metric-and-rewrite-triggers (925510f6) | 2026-11-01 |
| 08 | [Generate TS bindings for every IPC DTO with ts-rs, with a CI freshness check](issues/08-ts-rs-generated-ipc-types.md) | none | done | issue/08-ts-rs-generated-ipc-types (77eb0748) | 2026-11-01 |
| 09 | [Replace the hand-written TS mirrors with the generated types](issues/09-replace-hand-written-ipc-mirrors.md) | 08 | done | issue/09-replace-hand-written-ipc-mirrors (9ca9bc33) | 2026-11-01 |
| 10 | [Typed CommandMap, a call() wrapper, a parity test, and the core migration](issues/10-typed-command-map-and-call.md) | 09 | done | issue/10-typed-command-map-and-call (13e29cb1) | 2026-11-01 |
| 11 | [Event-name registry in Rust and TS, with a typed on() wrapper](issues/11-event-name-registry.md) | 08, 10, 26 | done | issue/11-event-name-registry (7af00157) | 2026-11-01 |
| 12 | [Type the E2E mock against CommandMap and cover every invoked command](issues/12-type-the-e2e-ipc-mock.md) | 10, 11, 36 | done | issue/12-type-the-e2e-ipc-mock (f65ede4f) | 2026-11-01 |
| 13 | [Clippy clean-up, then a CI gate](issues/13-clippy-clean-then-gate.md) | none | done | issue/13-clippy-clean-then-gate (75c7c10c) | 2026-11-01 |
| 14 | [Model test for the Calendar write queue, overlay and tombstones](issues/14-calendar-write-queue-model-test.md) | none | done | issue/14-calendar-write-queue-model-test (104d7471) | 2026-11-01 |
| 15 | [One pointer-gesture guard and one focus-return rule for the Calendar](issues/15-calendar-single-gesture-guard.md) | none | done | issue/15-calendar-single-gesture-guard (9ebd1a45) | 2026-11-01 |
| 16 | [Live-preview invariants harness over a markdown corpus](issues/16-live-preview-invariants-harness.md) | none | done | issue/16-live-preview-invariants-harness (8f8523a7) | 2026-11-01 |
| 17 | [Pin the view-lens seed/latch logic and note writes](issues/17-pin-rail-lens-latch-before-classic-removal.md) | none | done | issue/17-pin-rail-lens-latch-before-classic-removal (8484df17) | 2026-11-01 |
| 18 | [Versioned KBAPI v1 contract (typed contract, kb.version, surface snapshot)](issues/18-kbapi-v1-contract.md) | none | done | issue/18-kbapi-v1-contract (a55d38fe) | 2026-11-01 |
| 19 | [Run every help/ QueryJS example through the widget's runner against fixture vaults](issues/19-run-help-queryjs-examples-as-contract-tests.md) | none | done | issue/19-run-help-queryjs-examples-as-contract-tests (be6f1cdc) | 2026-11-01 |
| 20 | [Move shared pure logic and settings types below the features](issues/20-move-shared-pure-logic-below-features.md) | 04, 05, 06 | done | issue/20-move-shared-pure-logic-below-features (be9381ee) | 2026-11-01 |
| 21 | [App-lifetime ports for core's remaining service-level reaches](issues/21-app-lifetime-ports-for-core.md) | 20, 34 | done | issue/21-app-lifetime-ports-for-core (87d79b92) | 2026-11-01 |
| 22 | [Create the src/lib/app/ composition root](issues/22-app-composition-root.md) | 04, 21 | done | issue/22-app-composition-root (e83855ba) | 2026-11-01 |
| 23 | [Break the properties / type-definitions / file-icons cycle](issues/23-break-properties-type-definitions-cycle.md) | 05, 21, 22 | done | issue/23-break-properties-type-definitions-cycle (127d985f) | 2026-11-01 |
| 24 | [Firewall NoteEntryV2/NoteRecordV2 from the KBPage shape](issues/24-kbapi-firewall-from-rust-dtos.md) | 09, 18 | done | issue/24-kbapi-firewall-from-rust-dtos (153940a6) | 2026-11-01 |
| 25 | [25 (wontfix unless 22 is too big): Plugin registry pilot](issues/25-plugin-registry-pilot-one-on-one.md) | 22 | wontfix | | |
| 26 | [Make logger and watcher Tauri-free (single crate)](issues/26-rust-logger-and-watcher-tauri-free.md) | none | done | issue/26-rust-logger-and-watcher-tauri-free (c24b4ae8) | 2026-11-01 |
| 27 | [Make semantic build and model downloads testable without an AppHandle](issues/27-move-semantic-orchestration-out-of-commands.md) | none | done | issue/27-move-semantic-orchestration-out-of-commands (ab17a24b) | 2026-11-01 |
| 28 | [28 (deferred until a second Rust consumer exists): Move vault/search/history/files command logic out of commands/](issues/28-move-command-logic-into-domain-modules.md) | none | wontfix | | |
| 29 | [29 (deferred until a second Rust consumer exists): Create the Cargo workspace and the kokobrain-core crate](issues/29-cargo-workspace-and-core-crate.md) | 26, 27, 28 | wontfix | | |
| 30 | [30 (deferred, follows 29): Move core tests into the core crate and drop the re-export shim](issues/30-move-core-tests-into-core-crate.md) | 29 | wontfix | | |
| 31 | [EditorHost facet and profiling port for core/markdown-editor](issues/31-editor-host-facet.md) | 20, 22, 23 | done | issue/31-editor-host-facet (5bcbf6c0) | 2026-11-01 |
| 32 | [Fenced block renderer registry; queryjs and collection widgets leave the editor](issues/32-fenced-block-renderer-registry.md) | 31 | done | issue/32-fenced-block-renderer-registry (26eef1f1) | 2026-11-01 |
| 33 | [33 (deferred until a second consumer exists): Move the editor engine into packages/editor](issues/33-editor-package-deferred.md) | 32 | wontfix | | |
| 34 | [Save dirty tabs before the vault switches, so the last save keeps its history snapshot and search row](issues/34-save-dirty-tabs-before-vault-switch.md) | none | done | issue/34-save-dirty-tabs-before-vault-switch (98a9c580) | 2026-11-01 |
| 35 | [The macOS fonts CI job runs zero tests](issues/35-fix-macos-fonts-ci-filter.md) | none | done | issue/35-fix-macos-fonts-ci-filter (15519540) | 2026-11-01 |
| 36 | [The E2E mock returns null for scan_vault_v2_cached](issues/36-e2e-mock-scan-vault-v2-cached.md) | none | done | issue/36-e2e-mock-scan-vault-v2-cached (868896ae) | 2026-11-01 |
| 37 | [Migrate the remaining invoke sites to call()](issues/37-migrate-remaining-invoke-sites-to-call.md) | 10 | done | issue/37-migrate-remaining-invoke-sites-to-call (9103981e) | 2026-11-01 |
| 38 | [page._type and the relationship keys disappear after an edit and return after a rebuild](issues/38-type-disappears-after-edit.md) | none | done | issue/38-type-disappears-after-edit (06cd5f35) | 2026-11-01 |
| 39 | [relationship keys differ between edit and rebuild for unquoted wikilinks in a list](issues/39-relationship-parity-unquoted-wikilinks.md) | none | done | issue/39-relationship-parity-unquoted-wikilinks (7c46f6bf) | 2026-11-01 |
| 40 | [The macOS CI guard checks the tests it means, per binary](issues/40-macos-ci-guard-per-target-counts.md) | none | done | issue/40-macos-ci-guard-per-target-counts (b096c415) | 2026-11-01 |
| 41 | [An anchored wikilink empties the parsed frontmatter](issues/41-anchored-wikilink-empties-frontmatter.md) | none | done | issue/41-anchored-wikilink-empties-frontmatter (ecd8c482) | 2026-11-01 |
| 42 | [Meta-bind inline writers drop the frontmatter when it does not parse](issues/42-meta-bind-writers-parse-guard.md) | none | done | issue/42-meta-bind-writers-parse-guard (bf114d0b) | 2026-11-01 |
| 43 | [Bound the alias-resolution pass in the frontmatter parse](issues/43-bound-the-alias-resolution-pass.md) | none | done | issue/43-bound-the-alias-resolution-pass (7006c723) | 2026-11-01 |
| 44 | [Leaving a meta-bind number or date input clears a value it cannot show](issues/44-meta-bind-input-sanitized-value-wipe.md) | none | done | issue/44-meta-bind-input-sanitized-value-wipe (ac22d458) | 2026-11-01 |
| 45 | [A write or outside rename during the Calendar's own rename tail clobbers or hides the note](issues/45-calendar-own-rename-tail-race.md) | none | done | issue/45-calendar-own-rename-tail-race (4fafb1cc) | 2026-11-01 |
| 46 | [`ownPathChanges` is keyed by path, so an outside rename onto that path during the Calendar's delete is skipped](issues/46-calendar-own-path-changes-keyed-by-path.md) | none | done | issue/46-calendar-own-path-changes-keyed-by-path (145c2107) | 2026-11-01 |
| 47 | [A write on a created note that reaches the snapshot before `showCreated` is overwritten by the draft](issues/47-calendar-write-before-created-note-shown.md) | none | done | issue/47-calendar-write-before-created-note-shown (0fd98395) | 2026-11-01 |
| 48 | [Cmd+Z while a drag's write is in flight is refused and dropped](issues/48-calendar-undo-during-in-flight-drag.md) | none | done | issue/48-calendar-undo-during-in-flight-drag (1754f195) | 2026-11-01 |
| 49 | [An outside delete racing a Calendar restore leaves a tombstone over the restored note for two bumps](issues/49-calendar-outside-delete-races-restore.md) | none | done | issue/49-calendar-outside-delete-races-restore (81e0db02) | 2026-11-01 |
| 50 | [Amend ADR-0015 for the debug()/error() frontend logging idiom](issues/50-adr-0015-amend-frontend-logging-idiom.md) | none | done | issue/50-adr-0015-amend-frontend-logging-idiom (0bc2a43e) | 2026-11-01 |
| 51 | [TRIADA scripts render a page link as "[object Object]"](issues/51-triada-span-renders-object-object.md) | none | done | issue/51-triada-span-renders-object-object (e8e225b3) | 2026-11-01 |
| 52 | [help/ QueryJS examples render their empty state for lack of matching data](issues/52-queryjs-examples-missing-data-and-tag-mismatch.md) | none | done | issue/52-queryjs-examples-missing-data-and-tag-mismatch (85a8fd57) | 2026-11-01 |
| 53 | [Field docs on the Rust structs behind the generated IPC types](issues/53-rust-field-docs-for-generated-ipc-types.md) | none | done | issue/53-rust-field-docs-for-generated-ipc-types (7b064432) | 2026-11-01 |
| 54 | [An in-flight view parse can re-insert a stale entry after a rename or delete](issues/54-view-parse-cache-stale-insert-after-rename.md) | none | done | issue/54-view-parse-cache-stale-insert-after-rename (fd83dc30) | 2026-11-01 |
| 55 | [The alias-budget tests flake on a wall-clock bound](issues/55-alias-budget-tests-flake-on-wall-clock.md) | none | done | issue/55-alias-budget-tests-flake-on-wall-clock (4271d6a3) | 2026-11-01 |
| 56 | [A failed calendar field write drops the overlay an earlier move left on the same note](issues/56-calendar-failed-write-drops-earlier-overlay.md) | none | done | issue/56-calendar-failed-write-drops-earlier-overlay (fa98648e) | 2026-11-01 |
| 57 | [Derive the palette shortcut labels and reserved keys from the keybinding registrations](issues/57-derive-palette-shortcut-labels.md) | none | done | issue/57-derive-palette-shortcut-labels (cc9ce9ba) | 2026-11-01 |
| 58 | [An outside rename onto a path while the calendar's delete of it is in its tail leaves a tombstone over the renamed-in note](issues/58-calendar-delete-tail-outside-rename-onto-path.md) | 49 | done | issue/58-calendar-delete-tail-outside-rename-onto-path (d03a2713) | 2026-11-01 |
| 59 | [A calendar field write that lands after an outside delete recreates the note under the delete tombstone](issues/59-calendar-field-write-after-outside-delete.md) | 49 | done | issue/59-calendar-field-write-after-outside-delete (8d61bbe2) | 2026-11-01 |
| 60 | [An outside create on a path that holds a calendar rename's `from` tombstone stays hidden for two bumps](issues/60-calendar-outside-create-on-rename-tombstone.md) | 49 | done | issue/60-calendar-outside-create-on-rename-tombstone (eb7934f8) | 2026-11-01 |
| 61 | [An outside rename of a duplicate whose title is written in its frontmatter turns its overlay title into the new filename](issues/61-calendar-outside-rename-of-titled-duplicate.md) | 49 | done | issue/61-calendar-outside-rename-of-titled-duplicate (19a9f42e) | 2026-11-01 |
| 62 | [The event registry checks miss consts outside the `pub const *_EVENT: &str` form, and nothing keeps `listen` behind `on()`](issues/62-event-registry-guards-emit-and-listen-sites.md) | none | done | issue/62-event-registry-guards-emit-and-listen-sites (9f0058b7) | 2026-11-01 |
| 63 | [An older view read that resolves last overwrites the cache entry a newer read stored](issues/63-view-parse-cache-out-of-order-insert.md) | none | done | issue/63-view-parse-cache-out-of-order-insert (f23f95e2) | 2026-11-01 |
| 64 | [A failed calendar delete drops the overlay an earlier move left on the same note](issues/64-calendar-failed-delete-drops-earlier-overlay.md) | none | done | issue/64-calendar-failed-delete-drops-earlier-overlay (7fc4613a) | 2026-11-01 |
| 65 | [A single-note change re-reads and re-parses the whole vault twice on the main thread](issues/65-incremental-vault-index-refresh.md) | none | done | issue/65-incremental-vault-index-refresh (98ec341b) | 2026-11-01 |
| 66 | [Clear the six remaining layer violations outside utils/](issues/66-clear-remaining-layer-violations.md) | none | done | issue/66-clear-remaining-layer-violations (6edd5ee6) | 2026-11-01 |
| 67 | [E2E specs for deep links, copy-block-link and collection blocks](issues/67-e2e-specs-deep-link-copy-block-link-collection.md) | none | done | issue/67-e2e-specs-deep-link-copy-block-link-collection (71f031d5) | 2026-11-01 |
| 68 | [CodeQL alerts 145 and 146: a script-block regex in import-graph and the comment strip in tag extraction](issues/68-codeql-alerts-145-146.md) | none | done | issue/68-codeql-alerts-145-146 (4692b8dc) | 2026-11-01 |
| 69 | [E2E is red on main: five event-calendar specs emit `vault-index-updated` in the pre-Issue-65 shape](issues/69-e2e-specs-old-vault-index-updated-shape.md) | none | done | issue/69-e2e-specs-old-vault-index-updated-shape (9f5ec760) | 2026-11-01 |

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
- 2026-11-01 12:39 — 14 — deliver — workflow merge failed (local main had 3 unpushed docs commits); the main session pushed them, reran deliver sync and merge; in-memory calendar vault fixture plus a seeded model test of the write queue, overlay and tombstones (catches reverted abeec4ee at seed 150); 1 review round APPROVED (claude), fixes were tests only; 5 races filed as Issues 45-49; full suite 9296 passed, build ok — 104d7471
- 2026-11-01 12:39 — ledger updated (added 45, 46, 47, 48, 49)
- 2026-11-01 12:39 — 03 — start — launched by /relay-lite:run — 5d87b637
- 2026-11-01 12:56 — 03 — deliver — merged as one squash commit; ADR-0034 records that module-level $derived stays fresh under vitest (getters stay because Svelte forbids exporting derived state), ADR 0005 superseded, CLAUDE.md and ADR 0014/0016 drift fixed, a vitest probe pins the behaviour; 1 review round APPROVED (claude), fixes were docs and comments; Issue 50 filed; full suite 9304 passed, build ok — 1b1c3b8d
- 2026-11-01 12:56 — ledger updated (added 50)
- 2026-11-01 12:56 — 40 — start — launched by /relay-lite:run — 16afb4e2
- 2026-11-01 13:01 — 08 — deliver — merged as one squash commit; ts-rs generates TS bindings for the IPC DTOs with a CI freshness check and serde pins in ipc_contracts_test.rs; 1 review round APPROVED (claude), fix was one CLAUDE.md line; vitest 9304 passed, cargo 1190 passed, build ok; the CI freshness step has not run on Actions yet — 77eb0748
- 2026-11-01 13:05 — 20 — deliver — workflow blocked on a CLAUDE.md rebase conflict with Issue 03; the main session resolved it, rebased onto 08, regenerated two ts-rs bindings whose JSDoc moved, ran check, vitest 9304 passed, build ok, cargo 1190 passed, and merged; shared pure logic (wikilink resolution, file entries, folder-notes, tag extraction, settings types) moved below the features; 1 review round APPROVED (claude) — be9381ee
- 2026-11-01 13:05 — 15 — start — launched by /relay-lite:run — a22544d1
- 2026-11-01 13:05 — 18 — start — launched by /relay-lite:run — a22544d1
- 2026-11-01 13:08 — 40 — deliver — merged as one squash commit; the macOS CI step fails on any 0-test binary and pins the 3 macOS-gated semantic_qos tests by count; 1 review round APPROVED (claude), 2 fixes in the step script (post-delivery review needed); full suite 9304 passed, actionlint and shellcheck ok; the real macOS Actions run is not verified yet — b096c415
- 2026-11-01 13:21 — 15 — deliver — merged as one squash commit; one pointer-gesture guard and one focus-return rule for the calendar grid, day drag and popover; 1 review round APPROVED (claude), fixes were a comment and a test; full suite 9368 passed, build ok; E2E not run — 9ebd1a45
- 2026-11-01 13:30 — 18 — deliver — merged as one squash commit; typed KBAPI v1 contract (kb-api.v1.ts), kb.version, a surface snapshot test and the version policy; round 1 CHANGES_REQUESTED, round 2 APPROVED (claude), deliver fixes were a compile-time type check and an ADR line; full suite 9378 passed, build ok — a55d38fe
- 2026-11-01 13:30 — 19 — start — launched by /relay-lite:run — b273f907
- 2026-11-01 13:55 — 19 — deliver — merged as one squash commit; every help/ QueryJS example runs through the widget's runner against fixture vaults as a contract test; round 1 CHANGES_REQUESTED, round 2 APPROVED (claude), deliver changed docs only; Issues 51 and 52 filed; full suite 9517 passed, build ok — be6f1cdc
- 2026-11-01 13:55 — ledger updated (added 51, 52)
- 2026-11-01 14:01 — 09 — start — launched by /relay-lite:run — ceb1c1ad
- 2026-11-01 14:01 — 45 — start — launched by /relay-lite:run — ceb1c1ad
- 2026-11-01 14:01 — 51 — start — launched by /relay-lite:run — ceb1c1ad
- 2026-11-01 14:07 — 51 — deliver — merged as one squash commit; KBAPI renders page links passed to span/header as links instead of [object Object]; 1 review round APPROVED (claude), fix was a test only; full suite 9518 passed, build ok — e8e225b3
- 2026-11-01 14:07 — 52 — start — launched by /relay-lite:run — bd7723d1
- 2026-11-01 14:17 — 09 — deliver — merged as one squash commit; the hand-written TS mirrors are replaced by the ts-rs types behind a src/lib/contracts barrel, with a mirror ratchet test; 1 review round APPROVED (claude), fixes were tests, the e2e mock and a comment; field docs and the NoteRecord rename filed as Issue 53; full suite 9526 passed, build ok; E2E not run — 9ca9bc33
- 2026-11-01 14:17 — ledger updated (added 53)
- 2026-11-01 14:17 — 21 — start — launched by /relay-lite:run — a7882cfb
- 2026-11-01 14:21 — 52 — deliver — merged as one squash commit; help/ QueryJS examples get matching fixture data and tags, so their contract snapshots show real results instead of empty states; 1 review round APPROVED (claude), fixes were help examples and the test; full suite 9526 passed, build ok — 85a8fd57
- 2026-11-01 14:21 — 50 — start — launched by /relay-lite:run — 8cf7c621
- 2026-11-01 14:24 — 45 — deliver — merged as one squash commit; calendar note writes queue behind the calendar's own rename and the new path's queue is joined first; model test reproduces the race; round 1 CHANGES_REQUESTED, round 2 APPROVED (claude); nothing after the last review; full suite 9528 passed, build ok — 4fafb1cc
- 2026-11-01 14:24 — 46 — start — launched by /relay-lite:run — cc52b167
- 2026-11-01 14:28 — 50 — deliver — merged as one squash commit; ADR-0015 amended for the debug()/error() frontend logging idiom with its README row; 1 review round APPROVED (claude), docs only; full suite 9528 passed, build ok — 0bc2a43e
- 2026-11-01 14:33 — 26 — start — launched by /relay-lite:run — d91ab48b
- 2026-11-01 14:36 — 46 — deliver — merged as one squash commit; the calendar's own path changes are keyed to the change, not the path, so an outside rename onto that path is no longer skipped; 1 review round APPROVED (claude), deliver refactored writeEvent/renameAndWrite (post-delivery review needed); full suite 9529 passed, build ok — 145c2107
- 2026-11-01 14:36 — 24 — start — launched by /relay-lite:run — 100c1207
- 2026-11-01 14:52 — 26 — deliver — merged as one squash commit; logger sink and watcher core no longer depend on Tauri (wiring in commands/watcher.rs), the watcher bridge-thread join race is fixed, and a tauri-free ratchet test guards the core folders; 1 review round APPROVED (claude), fixes were an ADR amendment and the test regex; vitest 9529 passed, cargo 1195 passed, build ok; not run in tauri dev — c24b4ae8
- 2026-11-01 14:52 — 47 — start — launched by /relay-lite:run — 5934ffce
- 2026-11-01 15:00 — 24 — deliver — merged as one squash commit; KBPage is built from KBPageV1 only, with tests that fail when a Rust DTO field leaks into the script-visible shape and a list of the Rust/TS parser differences; round 1 CHANGES_REQUESTED, round 2 APPROVED (claude); nothing after the last review; full suite 9542 passed, build ok — 153940a6
- 2026-11-01 15:00 — 27 — start — launched by /relay-lite:run — 131dbc8a
- 2026-11-01 15:05 — 21 — deliver — merged as one squash commit; app-lifetime ports in src/lib/app/boot.ts replace core's remaining service-level reaches into features (content invalidation, write barrier, path-change evictions); 1 review round APPROVED (claude), fixes were comments and CLAUDE.md; full suite 9573 passed, build ok; E2E not run — 87d79b92
- 2026-11-01 15:06 — 10 — start — launched by /relay-lite:run — 22aed1ce
- 2026-11-01 15:09 — ledger updated (added 54)
- 2026-11-01 15:12 — 47 — deliver — merged as one squash commit; the planned path of a created event note is held until the calendar shows it, so an early write is no longer overwritten by the draft; 1 review round APPROVED (claude), fix released the hold in a finally (post-delivery review needed); full suite 9578 passed, build ok — 0fd98395
- 2026-11-01 15:16 — 48 — start — launched by /relay-lite:run — 09a386c4
- 2026-11-01 15:24 — 27 — deliver — merged as one squash commit; semantic build and model downloads take an on_progress callback, so the build is testable without an AppHandle; 1 review round APPROVED (claude), fix was a test only; vitest 9578 passed (one unrelated timing flake, filed as Issue 55), cargo 1200 passed, build ok — ab17a24b
- 2026-11-01 15:24 — ledger updated (added 55)
- 2026-11-01 15:25 — 53 — start — launched by /relay-lite:run — cca2390e
- 2026-11-01 15:28 — 10 — deliver — merged as one squash commit; typed CommandMap and call() wrapper, Rust/TS IPC parity test, core migrated off raw invoke with a guard test; 1 review round APPROVED (claude), fix was a test only; full suite 9594 passed, build ok (one load timeout in queryjs-globals.test.ts, added to Issue 55) — 13e29cb1
- 2026-11-01 15:28 — 22 — start — launched by /relay-lite:run — 68fde3d1
- 2026-11-01 15:34 — 48 — deliver — merged as one squash commit; an undo during an in-flight drag write waits for it instead of being refused; also pins Issue 47's try/finally hold release with a test; 1 review round APPROVED (claude), fixes were a test and a JSDoc line; finding 1 filed as Issue 56; full suite 9598 passed, build ok — 1754f195
- 2026-11-01 15:34 — ledger updated (added 56)
- 2026-11-01 15:34 — 49 — start — launched by /relay-lite:run — 24b16297
- 2026-11-01 16:01 — 22 — deliver — merged as one squash commit; src/lib/app composition root owns the wiring files, palette plugin commands and derived shortcuts, the watcher goes through notifyContentInvalidated; 1 review round APPROVED (claude), fixes were a test mock and a script comment; full suite 9606 passed, build ok, E2E 290 passed; CLAUDE.md paths and the shortcut-label follow-up left to the owner — e83855ba
- 2026-11-01 16:04 — 53 — deliver — workflow stopped on load-induced test timeouts; the main session rebased onto Issue 22, re-ran check (after clearing a stale svelte-check cache), vitest 9606 passed and build ok, ticked and merged; Rust field docs restored on the generated IPC types and the TS NoteRecord renamed to PropertyIndexRecord; 1 review round APPROVED (claude); CLAUDE.md:301 still says NoteRecord (owner) — 7b064432
- 2026-11-01 16:04 — 49 — deliver — build stopped: criterion 3 cannot hold as written; with the restore fix and one end bump, model seeds 40, 127, 166 and 252 still fail on four unfiled races (outside rename onto a path during the calendar's delete, a field write after an outside delete recreating the note under the tombstone, an outside create on a rename-from tombstone, an outside rename of a duplicate with a written title); criteria 1 and 2 are committed on the kept branch; see work/49/discovery.md in the worktree — 095af711
- 2026-11-01 16:04 — ledger updated (added 57)
- 2026-11-01 16:10 — ledger updated (added 58, 59, 60, 61)
- 2026-11-01 16:14 — 23 — start — launched by /relay-lite:run — 065eb7e3
- 2026-11-01 16:47 — 23 — deliver — merged after 2 Claude review rounds (CHANGES_REQUESTED, then APPROVED); full suite and 290 E2E pass; criterion 4 left unticked (reviewer did not run E2E) — 127d985f
- 2026-11-01 16:47 — 49 — start — launched by /relay-lite:run — 58472e62
- 2026-11-01 17:03 — 49 — deliver — merged after 2 Claude review rounds (CHANGES_REQUESTED, then APPROVED); restore checks the note is on disk before tombstoning an outside delete; full suite green on the second run (NoteActionBar delete test flaked once) — 81e0db02
- 2026-11-01 17:03 — 11 — start — launched by /relay-lite:run — 5ece8be5
- 2026-11-01 17:18 — 11 — deliver — merged after 1 Claude review round (APPROVED, 5 nits: 4 fixed, 1 rejected as out of scope); full suite and cargo test pass — 7af00157
- 2026-11-01 17:20 — ledger updated (added 62)
- 2026-11-01 18:14 — 55 — start — launched by /relay-lite:run — 458972c2
- 2026-11-01 18:17 — 56 — start — launched by /relay-lite:run (parallel lane B) — 826eb78c
- 2026-11-01 18:17 — 54 — start — launched by /relay-lite:run (parallel lane C) — 826eb78c
- 2026-11-01 18:27 — 54 — deliver — merged after 2 Claude review rounds (both APPROVED); the cache skips a read whose path was evicted mid-read; full suite passes; round 1 finding 1 (per-path read sequence) left for a follow-up Issue — fd83dc30
- 2026-11-01 18:28 — ledger updated (added 63)
- 2026-11-01 18:28 — 62 — start — launched by /relay-lite:run (parallel lane C) — 9aa72026
- 2026-11-01 18:32 — 56 — deliver — approved, not delivered: full suite failed twice after the rebase on load-induced timeouts (queryjs-contract, queryjs-globals, properties alias budget, invariants-harness: the Issue 55 tests) at load 31-46; the 4 files pass alone; worktree kept, rebased at adbc6a52 — b02d6b53
- 2026-11-01 18:45 — 55 — deliver — merged after 2 Claude review rounds (CHANGES_REQUESTED, then APPROVED); alias-budget cases count alias-pass steps instead of a 2 s bound; queryjs-globals, queryjs-contract and invariants-harness get 30 s timeouts; full suite passes after the rebase — 4271d6a3
- 2026-11-01 18:48 — 56 — deliver — finished by the main session after Issue 55 landed: rebased, full gate passed (9632 tests, build ok), merged; the review follow-up is Issue 64 (renumbered from a colliding 63) — fa98648e
- 2026-11-01 18:48 — ledger updated (added 64)
- 2026-11-01 18:48 — 37 — start — launched by /relay-lite:run (parallel lane A) — 642f61b9
- 2026-11-01 18:48 — 58 — start — launched by /relay-lite:run (parallel lane B) — 642f61b9
- 2026-11-01 18:54 — 62 — deliver — merged after 2 Claude review rounds (both APPROVED, 3 nits on forms not in the tree left unfixed); emit sites checked against the events.rs const set; listen import allowed only in contracts/ipc.ts; full suite passes after the rebase — 9f0058b7
- 2026-11-01 18:55 — 57 — start — launched by /relay-lite:run (parallel lane C) — 575e03cc
- 2026-11-01 19:02 — 37 — deliver — merged after 2 Claude review rounds (both APPROVED; 2 nits fixed); features, plugins and routes call() through contracts/ipc.ts; a guard fails on a new raw invoke import; full suite passes after the rebase — 9103981e
- 2026-11-01 19:02 — 12 — start — launched by /relay-lite:run (parallel lane A) — 7ce8e04e
- 2026-11-01 19:07 — 58 — deliver — merged after 2 Claude review rounds (CHANGES_REQUESTED, then APPROVED); the calendar delete tombstone drops under an outside rename onto its path; seed 40 passes with one end bump; full suite passes after the rebase — d03a2713
- 2026-11-01 19:08 — 60 — start — launched by /relay-lite:run (parallel lane B) — 6fb36cb7
- 2026-11-01 19:13 — 60 — deliver — cancelled by the owner during build to cut machine load; worktree kept with the discovery commit and an uncommitted partial implementation (4 event-calendar files) — 1a59e0e1
- 2026-11-01 19:16 — 57 — deliver — merged after 2 Claude review rounds (both APPROVED); palette shortcut labels and RESERVED_KEYBINDINGS come from the keybinding registrations; shortcutFor throws on an unbound shortcut; full suite passes after two rebases — cc9ce9ba
- 2026-11-01 19:17 — 60 — start — relaunched by /relay-lite:run on the kept branch (retry after the owner's cancel) — 79152097
- 2026-11-01 19:30 — 60 — deliver — merged after 2 Claude review rounds (both APPROVED); a calendar rename tombstone always records the note states, so an outside create at the old path shows after one bump; full suite passes — eb7934f8
- 2026-11-01 19:30 — 61 — start — launched by /relay-lite:run (lane B) — be86885c
- 2026-11-01 19:38 — 12 — deliver — merged after 2 Claude review rounds (both APPROVED); the E2E IPC mock is typed exhaustively against CommandMap and an unknown invoke fails any spec; unit suite passes after the rebase; only the rail-shell E2E spec was run — f65ede4f
- 2026-11-01 19:39 — 31 — start — launched by /relay-lite:run (lane A) — dddccf04
- 2026-11-01 19:52 — 61 — deliver — merged after 3 Claude review rounds (CHANGES_REQUESTED, APPROVED, APPROVED); followRename tells a written title from a filename one by a titled flag; full suite passes after the rebase — 19a9f42e
- 2026-11-01 20:19 — 31 — deliver — merged after 2 Claude review rounds (both APPROVED); editorHost facet and profiling port for core/markdown-editor; full suite passes after the rebase; the E2E criterion is unticked (E2E not run by the workflow) — 5bcbf6c0
- 2026-11-01 20:45 — 32 — start — launched by /relay-lite:run (lane A) — 1a4dc2a3
- 2026-11-01 20:45 — 63 — start — launched by /relay-lite:run (lane B) — 1a4dc2a3
- 2026-11-01 20:52 — 63 — deliver — merged after 1 Claude review round (APPROVED, no findings); an older view read resolving last no longer overwrites the newer cache entry; full suite passes — f23f95e2
- 2026-11-01 20:53 — 64 — start — launched by /relay-lite:run (lane B) — 589183f5
- 2026-11-01 21:02 — 64 — deliver — approved in 1 Claude review round; deliver merge failed on 9 unpushed local main commits (perf/nav-stall-probe merge); the main session pushed them at the owner's request, rebased, ran the full gate (9740 tests, build ok) and merged — 7fc4613a
- 2026-11-01 21:02 — ledger updated (added 65)
- 2026-11-01 21:02 — 59 — start — launched by /relay-lite:run (lane B) — 27d1fe33
- 2026-11-01 21:11 — 32 — deliver — merged after 2 Claude review rounds (both APPROVED; 2 minor findings fixed); queryjs and collection widgets leave the editor through a fenced block renderer registry; layer baseline down to 9; full suite passes after the rebase — 26eef1f1
- 2026-11-01 21:19 — ledger updated (added 66)
- 2026-11-01 21:19 — 65 — start — launched by /relay-lite:run (lane A) — 3dd2fb6b
- 2026-11-01 21:22 — 59 — deliver — merged after 2 Claude review rounds (both APPROVED; 2 findings fixed, 1 rejected); the frontmatter writer opens closed notes with create:false, so a calendar write after an outside delete is refused as missing; full suite passes after the rebase — 8d61bbe2
- 2026-11-01 21:22 — 66 — start — launched by /relay-lite:run (lane B) — 19f30832
- 2026-11-01 21:40 — 66 — deliver — merged after 2 Claude review rounds (both APPROVED; doc fixes applied); layer baseline holds only the three utils/ edges; full suite passes; the E2E criterion is unticked (E2E not run by the workflow) — 6edd5ee6
- 2026-11-01 21:40 — 07 — start — launched by /relay-lite:run (lane B) — def767e5
- 2026-11-01 21:47 — ledger updated (added 67)
- 2026-11-01 21:51 — ledger updated (added 68)
- 2026-11-01 21:53 — 65 — deliver — merged after 2 Claude review rounds (both APPROVED); vault indexes patched per note from an IndexDelta payload instead of a whole-vault re-read; full suite passes after two rebases; deliver skipped cargo, the main session ran it on main (1206 passed, bindings unchanged); the in-app Heartbeat measurement (criterion 4) is left for the owner — 98ec341b
- 2026-11-01 21:53 — 67 — start — launched by /relay-lite:run (lane A) — 7befa99d
- 2026-11-01 21:57 — 07 — deliver — merged after 2 Claude review rounds (both APPROVED; 3 findings fixed); scripts/fix-feat-ratio.mjs and docs/HOTSPOTS.md with the rewrite triggers; full suite passes after two rebases — 925510f6
- 2026-11-01 21:57 — 68 — start — launched by /relay-lite:run (lane B) — dc8cfe5e
- 2026-11-01 22:06 — 68 — deliver — merged after 2 Claude review rounds (CHANGES_REQUESTED, then APPROVED); import-graph SCRIPT_RE matches </script >, <SCRIPT> and closing tags with attributes; tag-extraction and parsing.rs unchanged; full suite passes; alert 146 left for the owner to dismiss — 4692b8dc
- 2026-11-01 22:20 — 67 — deliver — merged after 1 Claude review round (APPROVED); deep-link, copy-block-link and collection-block E2E specs; full suite passes; the full E2E criterion is unticked: since Issue 65 five event-calendar specs emit vault-index-updated in the old shape and fail (Issue 69) — 71f031d5
- 2026-11-01 22:21 — ledger updated (added 69)
- 2026-11-01 22:21 — 69 — start — launched by /relay-lite:run (main E2E red) — 8b1ea979
- 2026-11-01 22:34 — 69 — deliver — merged after 2 Claude review rounds (both APPROVED); event-calendar specs emit a typed full UpdateResult via e2e.vaultIndex.rescanResult(); tsconfig includes e2e so pnpm check types spec payloads; full suite passes; the workflow ran a targeted E2E subset (58 passed) — 9f5ec760
- 2026-11-06 00:31 — 28, 29, 30, 33 set to wontfix by hand: migrated to .scratch/audit-2026-11-05/ by the pre-use audit (each Issue file names its new number); the CLI has no transition from todo to wontfix or done
