# Code Audit + Freeze Investigation — Rust File Watcher / VaultIndex / TS Flow

Mirrors the plan at `~/.claude/plans/cria-uma-branch-nova-sunny-piglet.md`. Each task = one commit.

## Tier 0 — Freeze investigation (BLOCKS everything else)

- [x] **0.1** Add freeze-probe heartbeat (`[HB]` every 250ms) + LP-TRACE entry/exit on every live-preview plugin via `profileStart(label)` + `[VAULT-CMD]` enter/exit traces around every Tauri vault command via a Drop-based `CmdTrace` guard. Tests: heartbeat lifecycle (5 cases) + profiling labelled trace contract (11 cases).
- [ ] **0.2** USER ACTION: reproduce on the work macbook with the new build. Send the resulting log. Blocks 0.3.
- [ ] **0.3** Root-cause fix based on 0.2 narrowing. Candidate causes: heading+wikilink decoration loop (a), watcher self-save loop on path mismatch (b), meta-bind LRU cache miss on porge frontmatter (c), ONNX+watcher lock contention (d), heading regex catastrophic backtracking (e).
- [ ] **0.4** Regression test for the freeze scenario (synthetic note with porge's characteristics: heading-with-wikilinks, frontmatter-with-quoted-wikilink, hyphen-prefix filename, truncated last line).

## Tier 1 — Validated bugs

- [ ] **1** `fix(index): retroactive backlinks when new entry resolves prior unresolved wikilinks (audit #1)`. Touch `src-tauri/src/vault/index.rs::update_entry`. Add Tier 3 #10 test FIRST (will fail, motivating fix).
- [ ] **2** `perf(watcher): filter notify events to Create/Modify/Remove only (audit #2)`. Touch `src-tauri/src/vault/watcher.rs:192-203`.
- [ ] **3** `feat(commands): validate path is under vault root in mutating commands (audit #3)`. Touch `src-tauri/src/commands/vault.rs` (4 commands). Add Tier 3 #13 test FIRST (will fail, motivating fix).
- [ ] **4** `feat(commands): MAX_NOTE_SIZE limit on update_note_in_index (audit #4)`. Touch `src-tauri/src/commands/vault.rs`.
- [ ] **5** `fix(watcher): canonicalize vault_path at start_watcher_inner (audit #5)`. Touch `src-tauri/src/vault/watcher.rs:184-188`.
- [ ] **6** `fix(fs): case-insensitive markdown extension match (audit #6)`. Touch `src-tauri/src/utils/fs.rs:116`.

## Tier 2 — Validated minor concerns

- [ ] **7** `fix(watcher): drop old bridge thread before installing new watcher (audit #7)`. Touch `src-tauri/src/vault/watcher.rs:225-248`.
- [ ] **8** `fix(commands): log+skip disk read failures in get_tasks_in_section_v2 (audit #8)`. Touch `src-tauri/src/commands/vault.rs:471`.
- [ ] **9** (optional) `perf(vault): re-verify unlinked status in Phase 3 (audit #9)`. Acceptable race; document or fix.

## Tier 3 — Test coverage gaps (run failing tests first)

- [ ] **10** `test(index): retroactive backlinks scenario (motivates audit #1)`. New test in `vault_index_test.rs`. Expected: FAIL today.
- [ ] **11** `test(watcher): atomic save pattern (write tmp + rename)`. New test in `vault_watcher_test.rs`.
- [ ] **12** `test(watcher): 100-file burst within debounce window`. New test in `vault_watcher_test.rs`.
- [ ] **13** `test(commands): path traversal rejection (motivates audit #3)`. New test in `tests/commands/vault_test.rs`. Expected: FAIL today.
- [ ] **14** `test(index): concurrent update_entry from multiple threads`. New test in `vault_index_test.rs`.
- [ ] **15** `test(commands): command-level coverage for *_v2 read commands`. 4 new tests in `tests/commands/vault_test.rs`.

## Tier 4 — Cleanups

- [ ] **16** `chore(tasks): delete dead extractTasks (Phase 11.5 follow-up, audit #16)`. Touch `src/lib/features/tasks/tasks.logic.ts` + tests.
- [ ] **17** (optional) `perf(queryjs): memoize get_all_vault_entries_v2 by vaultIndexVersion (audit #17)`.

## Wrap-up

- [ ] Move this file to `tasks/done/` once all unchecked items are committed.
- [ ] Open PR titled `audit: freeze fix + Rust vault audit findings`. Body lists each commit by tier.

## Notes

- **Verification per commit (CLAUDE.md rule 6)**: Rust = `cargo test --manifest-path src-tauri/Cargo.toml`; TS = `pnpm check && pnpm vitest run`; both = all three.
- **Reverse-tracing traps**: when removing or refactoring code, follow the trace-before-remove ritual in CLAUDE.md.
- **Path canonicalization** (Tier 1 #5) may interact with the freeze (Tier 0); verify during 0.3 root-cause work.
- **Out of scope**: Phase 10 git-hash cache, Phase 11.1-11.4 three-tier change detection, Phase 11.8 perf comparison numbers, Phase 9.4-9.8 (FTS via watcher, git conflict checks).
