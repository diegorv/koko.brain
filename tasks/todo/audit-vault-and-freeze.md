# Code Audit + Freeze Investigation — Rust File Watcher / VaultIndex / TS Flow

Mirrors the plan at `~/.claude/plans/cria-uma-branch-nova-sunny-piglet.md`. Each task = one commit.

## Tier 0 — Freeze investigation (BLOCKS root-cause fix)

- [x] **0.1** Add freeze-probe heartbeat (`[HB]` every 250ms) + LP-TRACE entry/exit on every live-preview plugin via `profileStart(label)` + `[VAULT-CMD]` enter/exit traces around every Tauri vault command via a Drop-based `CmdTrace` guard. Tests: heartbeat lifecycle (5 cases) + profiling labelled trace contract (11 cases). Commit `bad8063c`.
- [ ] **0.2** USER ACTION: reproduce on the work macbook with the new build (`pnpm tauri dev` or production build). Send the resulting log. **Blocks 0.3 + 0.4.**
- [ ] **0.3** Root-cause fix based on 0.2 narrowing. Candidate causes: heading+wikilink decoration loop (a), watcher self-save loop on path mismatch (b), meta-bind LRU cache miss on porge frontmatter (c), ONNX+watcher lock contention (d), heading regex catastrophic backtracking (e).
- [ ] **0.4** Regression test for the freeze scenario.

## Tier 1 — Validated bugs

- [x] **1** `fix(index): retroactive backlinks when new entry resolves prior unresolved wikilinks`. 5 new tests (4 happy paths + 1 negative regression guard). Commit `113a6b84`.
- [x] **2** `perf(watcher): filter notify events to mutating kinds (Create/Modify/Remove)`. New `is_index_relevant_event_kind` helper + 9 unit tests. Commit `f7d9633f`.
- [ ] **3** `feat(commands): validate path is under vault root in mutating commands`. **DEFERRED** — defense-in-depth, not exploitable in current single-process desktop threat model. Full impl needs `vault_root` tracked in managed state + 4-command validator. Suggest tackling alongside Tier 1 #5 (path canonicalization) since both touch the path-normalization invariant.
- [x] **4** `feat(commands): MAX_NOTE_SIZE limit on update_note_in_index`. 100 MB ceiling + 5 unit tests on the size-check helper. Commit `67f1a50b`.
- [ ] **5** `fix(watcher): canonicalize vault_path at start_watcher_inner`. **DEFERRED** — empirical Apple Silicon firmlink behaviour needs verification (was non-blocking when reading the freeze logs, vault paths in 14-06-33.log all use `/Users/...` consistently). Not implicated in the freeze.
- [x] **6** `fix(fs): case-insensitive markdown extension match`. New `is_markdown_filename` helper + 7 unit + integration tests. Commit `774afc70`.

## Tier 2 — Validated minor concerns

- [x] **7** `fix(watcher): drop old bridge thread before installing new watcher`. Lock-acquire-first ordering + explicit `drop(old)`. Commit `5c35cdc3`.
- [x] **8** `fix(commands): log+skip disk read failures in get_tasks_in_section_v2`. Match-arm with `debug_log` + `continue`. Commit `93d66f04`.
- [ ] **9** (optional) `perf(vault): re-verify unlinked status in Phase 3`. **NOT DONE** — accepted race per plan; fixing would be over-engineering.

## Tier 3 — Test coverage gaps

- [x] **10** `test(index): retroactive backlinks scenario` — 5 cases (happy, full-path, negative, case-insensitive, multi-source). Shipped as part of commit `113a6b84` (paired with the fix).
- [ ] **11** `test(watcher): atomic save pattern (write tmp + rename)`. **NOT DONE** — tractable follow-up.
- [ ] **12** `test(watcher): 100-file burst within debounce window`. **NOT DONE** — tractable follow-up.
- [ ] **13** `test(commands): path traversal rejection`. **NOT DONE** — depends on Tier 1 #3 implementation.
- [ ] **14** `test(index): concurrent update_entry from multiple threads`. **NOT DONE** — tractable follow-up.
- [ ] **15** `test(commands): command-level coverage for *_v2 read commands`. **NOT DONE** — tractable follow-up.

## Tier 4 — Cleanups

- [x] **16** `chore(tasks): delete dead extractTasks (Phase 11.5 follow-up)`. ~280 lines of TS source + tests removed. Commit `1511292a`.
- [ ] **17** (optional) `perf(queryjs): memoize get_all_vault_entries_v2 by vaultIndexVersion`. **NOT DONE** — secondary optimisation.

## Wrap-up

- [ ] Open PR titled `audit: freeze probes + Rust vault audit findings`. Body lists each commit by tier.
- [ ] Move this file to `tasks/done/` once the user has reproduced + 0.3 ships.

## Notes

- **Verification** (CLAUDE.md rule 6): every commit ran `cargo test --manifest-path src-tauri/Cargo.toml` AND/OR `pnpm check && pnpm vitest run`. Final state: 673 Rust tests passing, 5442 TS tests passing, 0 type errors.
- **Trace-before-remove** ritual followed for the dead `extractTasks` removal.
- **Freeze investigation** is in the user's hands now: build the branch, run on the work macbook, open the porge note, send the new log.
- **Out of scope** (per plan): Phase 10 git-hash cache, Phase 11.1-11.4 three-tier change detection, Phase 11.8 perf comparison numbers, Phase 9.4-9.8 (FTS via watcher, git conflict checks).
