# Issue 02 discovery

## Files that change
- `src-tauri/src/commands/vault.rs:606-656` - `get_tasks_in_section_v2` (sync, holds the read guard, reads all N notes). Doc comment at :606-613 is stale.
- `src/lib/features/tasks/tasks.service.ts:48-71` - `buildTaskIndex` (no sequence guard). Doc at :75-82 (`updateSectionTagFilter`) says "on the app main thread".
- Tests: `src-tauri/tests/commands/vault_test.rs` (Rust), `src/tests/lib/features/tasks/tasks.service.test.ts` (TS).

## Plan
1. Extract two pure pub fns in `commands/vault.rs`:
   - `section_task_candidates(entries) -> Vec<SectionTaskCandidate { path, modified_at }>`: the prefilter, skips entries with `tasks.is_empty()`. Runs under a brief read guard; clones only K paths.
   - `tasks_in_section(candidates, tag, read: FnMut(&str) -> io::Result<String>) -> Vec<FileTaskGroup>`: the read + `extract_tasks_from_section` loop and the sort, read errors logged and skipped as today. Logs K once.
   Literal "tasks_in_section(entries, tag, read)" from the Issue is split in two because item 2 forbids reading under the guard and cloning whole `NoteEntry`s is the cost the unlinked-mentions comment (vault.rs:535-542) warns against. Tests call the pair together.
2. Command becomes `pub async fn`, `Result` return already present: phase 1 candidates under `state.read()`, phase 2 `tokio::task::spawn_blocking(move || tasks_in_section(c, &tag, fs::read_to_string))`. Prior art: `get_unlinked_mentions_v2` (vault.rs:543-575), same join-error mapping.
3. `buildTaskIndex`: module-level `let taskIndexRequest = 0`; each call takes `++taskIndexRequest`, and after the await only the latest writes `fileTaskGroups` and clears `isLoading`.

## Tests (prior art)
- Rust: `vault_test.rs` builds entries with `NoteEntry::from_content` and tempdir files. New: (a) A has `## Todo #to-list` + task, B no tasks -> recording `read` sees only A (fails before: no fn). (b) parity: fixture vault (task in section, task outside section, no-task note, fenced task, nested heading) -> result equals the unfiltered loop (read every entry, `extract_tasks_from_section`, same sort).
- TS: `tasks.service.test.ts` mocks `invoke`; new test with two deferred promises, first resolves last, store holds the second result and `isLoading` is false at the end.

## Risks
- Prefilter relies on `entry.tasks` matching disk: a file edited on disk but not yet re-indexed could be skipped. Same staleness window the index already has; the watcher re-indexes.
- Stale guard: a superseded call leaves `isLoading` to the newer one; an error in the newer one still clears it in `finally`.
- `resetTasks` does not bump the sequence: an in-flight result can land after a vault reset. Pre-existing, not in scope.

## Defaults taken
- K logged via `debug_log("VAULT-V2", ...)` (no-op unless debug mode), once per call.
- No existing Rust test targets this command directly; the `cargo test` suite as a whole must stay green.
