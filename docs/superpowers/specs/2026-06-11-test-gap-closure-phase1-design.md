# Test Gap Closure - Phase 1 (Design)

Approved 2026-06-11. Source: full-codebase audit at `.scratch/audit-2026-06-10/findings.md` (405 test gaps across 279 unique files; 102 confirmed findings).

## Goal

Close the high-value test gaps found by the 2026-06-10 audit: every `.service.ts`, `.store.svelte.ts`, `.logic.ts` and Rust source file flagged with missing or partial coverage gets tests that satisfy `docs/TESTING.md`. Confirmed bugs that would make a correct test fail are fixed inline with their regression test (TDD), one commit each.

## Scope

**In (Phase 1, 76 unique files):**
- 48 frontend files: services (46 gap entries), stores (8), logic (18)
- 28 Rust files (commands, db, search, semantic, vault, utils, quick_capture)
- Extensions to existing test files where the audit flagged partial gaps

**Out (later phases, each with its own plan and user gate):**
- Phase 2: CodeMirror extensions/handlers/widgets (126 gaps, plain `.ts`)
- Phase 3: Svelte components (168 gaps) - requires an infra decision first (no component-test setup exists today; options: vitest-browser-svelte / @testing-library/svelte vs Playwright E2E coverage)
- Performance/architecture findings from the audit (sync `scan_vault_v2` commands, `vault-index-updated` listener without coalescing, search fallback reading the whole vault). These do not block functional tests and are already covered by existing plans: `tasks/todo/performance-architecture-refactor.md` and `tasks/todo/perf-persistent-vault-index.md`.
- Semantic paths that require a real ONNX model fixture (embedder inference, end-to-end `search_semantic`). Tested up to the boundary (chunker, filtering, repos with in-memory SQLite); the exclusion is documented per task.

## Decisions

1. **Phased by value.** Phase 1 = services/stores/logic/Rust (infra ready, highest value per test). User chose this over all-at-once.
2. **Bug-blocked gaps: fix + regression test together.** When a correct test would fail today because of a confirmed audit finding, the task writes the failing test first, applies the minimal fix, and commits both together. Applies only to functional defects, never to perf/architecture findings.
3. **Execution: parallel batches + commit per batch.** Test-only batches are written by parallel agents (new/extended test files in disjoint modules, no collisions). Each batch is reviewed, the full relevant suite runs (`pnpm check` + `pnpm vitest run` and/or `cargo test`), then one commit per batch in `docs/COMMITS.md` format. Bug-fix tasks run sequentially, one commit each, after the batches.

## Definition of done (per test file)

Per `docs/TESTING.md`: happy path + empty/null input + error path; mock only Tauri APIs / side-effect services / DOM services; never mock stores or `.logic.ts`; assert real store state and computed getters (never `.toHaveBeenCalled()` as sole assertion); every store getter covered. Rust: integration tests in `src-tauri/tests/` or inline `#[cfg(test)]`, following existing patterns.

## Work breakdown

**8 parallel test-only batches:** F1 core (12 files), F2 features-a (12), F3 features-b (8), F4 plugins+utils (8), R1 rust-commands (9), R2 rust-db-search (3), R3 rust-semantic (3), R4 rust-vault-utils-qc (10). Exact file lists live in the plan file.

**11 sequential bug-fix tasks (TDD, one commit each):**
- B1 `properties.service.ts` - upsert/updateProperty must canonicalize keys (2 findings)
- B2 `editor.service.ts` - resetEditor() must cancel both auto-save timers
- B3 `app-lifecycle.service.ts` - teardownVault must invoke `shutdown_semantic` (HIGH finding: stale cross-vault semantic results)
- B4 `type-sidebar.logic.ts` - unreachable condition in matchesSelection
- B5 `deep-link.service.ts` - serialize action dispatch (TOCTOU append/prepend) + registerDeepLinkListener tests
- B6 `watcher-handler.service.ts` - relative-path fallback passes absolute paths into vault-relative-keyed FTS/semantic commands
- B7 `db/semantic_repo.rs` - stop silently dropping errors (get_chunk_hashes_for_path, delete_orphaned_mtimes)
- B8 `vault/index.rs` - remove_entry missing promoted path in affected set
- B9 `semantic/embedder.rs` - mean pooling tensor shape panic (feasibility-gated: only if unit-testable without model fixture)
- B10 `commands/vault.rs` - atomic writes (temp+rename) in create_note and propagate_type_rename
- B11 `commands/semantic.rs` - embedding bytes deserialization must reject malformed data instead of truncating

**Deferred findings touching Phase 1 files (listed, not fixed here):** toggle_task_status TOCTOU (needs a locking strategy decision), create_note exists-check TOCTOU (same), saveDirtyTabs unbounded retry (intended-behavior question), dead IPC surface in lib.rs (cleanup question). These stay in the audit report as backlog; `tasks/todo/bug-hunt-fixes.md` already tracks the earlier bug-hunt backlog separately.

## Success criteria

- Every Phase 1 file has a test file with the TESTING.md triad, or a documented exclusion (ONNX boundary).
- All 11 bug-fix tasks committed with regression test proving the fix (red -> green).
- Full suite green at every commit: `pnpm check`, `pnpm vitest run`, `cargo test --manifest-path src-tauri/Cargo.toml`.
- Plan tracked in `tasks/todo/test-gap-closure-phase1.md`, checkboxes updated per commit.
