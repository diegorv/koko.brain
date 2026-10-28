# 14: E2E vault-index mock matches Rust for isA and index-updated emits

**What to build:** the E2E Tauri mocks index event notes the way Rust does. Every mock vault entry carries `isA` derived from `_type` or `type`, so E2E specs can find events at all. `create_note`, `update_note_in_index`, `remove_note_from_index` and a new `rename_note` handler emit `vault-index-updated` under the same conditions as the Rust commands, so every `vaultIndexVersion` consumer refreshes in E2E the way it does in the app. Because this changes the shared harness for every spec, it lands as an isolated commit gated by the full E2E suite (D16, Risks 8).

**Plan reference:** Task 13 in `.scratch/calendar-feature/plan-2026-10-28.md` (lines 326-338). The plan task is the full spec (files, line anchors, test cases); this ticket is the definition of done.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

**Touches:**
- `e2e/mocks/vault-index.ts` (modify)
- `e2e/mocks/tauri-core.ts` (modify)

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build` + the full `bash scripts/e2e.sh` (no spec arguments)

- [ ] `buildEntry` in `e2e/mocks/vault-index.ts` sets `isA` mirroring `extract_is_a` (`src-tauri/src/vault/entry.rs:356-363`): it reads `_type` or bare `type` (no key canonicalization), requires a non-empty string, and uppercases the first character
- [ ] The `virtualFS.subscribe` hooks record each computed `UpdateResultV2` in an exported `lastHookResult` map keyed by path: `onWrite` records `update(path)`, `onRemove` records `remove(path)`, and `onRename` records `remove(old)` under `old` and `update(new)` under `new`
- [ ] `handleCreateNote` takes and discards the hook result, then always emits `vault-index-updated` with `{ changed: true, affected: [path], version: vaultIndex.version }`, matching Rust `create_note` (`src-tauri/src/commands/vault.rs:848`)
- [ ] `handleUpdateNoteInIndex` uses the hook result for that path (else `vaultIndex.update`) and emits only when `changed` (`vault.rs:307`); `handleRemoveNoteFromIndex` does the same with `remove` (`vault.rs:891`)
- [ ] `HANDLERS` gains a `rename_note` handler that uses the `onRename` removal result for `from` and emits `{ changed: true, affected: [from, to], version }` when that removal changed (`vault.rs:982-996`); `rename_note` no longer falls through to the unknown-command warning
- [ ] Every emit goes through `window.__e2e.events.emit`, as `handleToggleTaskStatus` does
- [ ] The change lands as an isolated commit touching only `e2e/mocks/vault-index.ts` and `e2e/mocks/tauri-core.ts` (Risks 8), so reverting it restores the old mocks (Rollback)
- [ ] The full `bash scripts/e2e.sh` suite passes, and the commit body records why it ran: every save, create, delete and rename in every spec now runs the listener refresh (`tauri-listeners.service.ts:121-138`), and the per-task "never the full suite" rule (`docs/TESTING.md:148`) is about per-task core edits
- [ ] Gate green; one commit in the full CLAUDE.md format (Context, Problem, Solution, Behavior, Files with line ranges)

## Comments

- 2026-10-28 12:04 — discovery — plan in work/14/discovery.md: isA, hook-result map, four emitting handlers incl. new rename_note — fce4801d
- 2026-10-28 12:07 — implement — isA + hook-result map + emitting create/update/remove/rename_note in the two mocks; pnpm check 0 errors, E2E file-operations/file-explorer/tasks-view 10 passed; full E2E left to deliver — 5d3063d7
- 2026-10-28 12:11 — review — VERDICT: APPROVED; all review-checkable criteria met, 3 low non-blocking findings (size-only change detection, unconsumed rename-target hook entries, onPopulate keeps hook map); full gate + full E2E pending for deliver — cbe644d0
