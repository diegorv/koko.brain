VERDICT: APPROVED

Reviewed `git diff main...HEAD` (251c2d40, 0dd5fe7a, 0417033c) in the worktree. No `.scratch/ui-responsiveness/spec.md` exists; the Issue file and ADR-0025 (Rust VaultIndex) were the references.

## Acceptance criteria

- [met] Failing first: move the loop into `tasks_in_section(entries, tag, read)` with an injected `read`. Note A has a `## Todo #to-list` task, note B has none. Assert `read` is called only for A — `src-tauri/src/commands/vault.rs:622` (`section_task_candidates`) + `:639` (`tasks_in_section(candidates, section_tag, read)`); test `vault_test.rs:958` records every `read` and asserts `reads == [a]`. Probe: replacing the prefilter with `.filter(|_e| true)` makes exactly this test fail (`cargo test --test commands_test tasks_in_section`: 1 failed, 3 passed), restored after. The split into two functions (candidates under the guard, reads outside it) diverges from the literal one-function signature but is what item 2 requires; the tests call the pair.
- [met] Parity test: on a fixture vault the result equals the unfiltered loop — `vault_test.rs:998` builds six notes (section tasks, tasks outside the section, no tasks, fenced task, nested heading, prefix tag) and for `#to-list`, `to-list`, `#missing` compares `tasks_in_section` against a loop that reads every entry and runs `extract_tasks_from_section`; passes. Independently checked the exactness claim: `NoteEntry.tasks = extract_tasks(content)` (`vault/entry.rs`, `from_content_full`) and `extract_tasks_from_section` (`parsing.rs`) share the `split('\n')`, fence logic and `parse_task_line`, adding only a heading gate, so section tasks are a subset.
- [met] Failing first: two overlapping `buildTaskIndex` calls where the first resolves last; the newer result wins — `tasks.service.test.ts:104` (older resolves last, newer result kept) and `:123` (older resolves first, store untouched and still loading). With `tasks.service.ts` restored to main both tests fail (2 failed, 21 passed); with the branch file both pass.
- [met] Existing Rust tests for the command stay green — no prior test targeted the command directly; `cargo test --manifest-path src-tauri/Cargo.toml` exit 0, 1223 passed, 0 failed (includes `vault_task_test.rs` for `extract_tasks_from_section`). No change under `src/lib/contracts/generated/`.
- [met] Not verified by the agent: K for the owner's vault (the gain is about N/K; the bench's 14-22x was an assumed task share, not a measurement) — correctly left unmeasured (build report says so); the per-call K log at `vault.rs:644-647` gives the owner the number (needs Debug mode on, see finding 2).

## Checks run by the reviewer

- `pnpm check`: 0 errors, 0 warnings.
- `pnpm vitest run src/tests/lib/features/tasks/ src/tests/lib/contracts/ipc.test.ts src/tests/lib/app/lifecycle/`: 13 files, 284 passed, exit 0. The test verdict rests on these files plus the Rust suite.
- `cargo test --manifest-path src-tauri/Cargo.toml`: exit 0, 1223 passed (the new `commands::vault_test::tasks_in_section_*` four included).
- `cargo clippy --all-targets --locked -- -D warnings` (the CI gate): exit 0.
- Full `pnpm vitest run` and `pnpm build` not run: deliver's.
- Worktree clean after the probes; no layer-baseline or composition-root change.

Code read: the async command copies `(path, modified_at)` under a scoped read guard that drops before the `.await`, reads in `tokio::task::spawn_blocking`, returns `Result` (required for borrowed `State`), and maps the join error the same way as `get_unlinked_mentions_v2`. The sequence guard skips both the store write and the `isLoading` clear for a superseded call; a newer call that throws still clears `isLoading` in `finally`.

## Findings

1. minor — `src/lib/features/tasks/tasks.service.ts:199` (`resetTasks`): the reset does not advance `latestTaskIndexRequest`, so a section scan from the previous vault that lands after `teardownVault` still writes its groups into the reset store. This race was there before, but the window is wider now that the Rust command no longer runs serialized on the main thread. It heals itself: the next mount or version bump refetches. Fix in a follow-up: `latestTaskIndexRequest++` in `resetTasks`, and add a test where a call started before the reset resolves after it and the store stays empty.
2. nit — `src-tauri/src/commands/vault.rs:644-647`: K is logged through `debug_log`, which does nothing unless Debug mode is on. That matches `CmdTrace`, but the owner has to turn Debug mode on to measure K for the last criterion. No change needed; worth a line in the delivery note.
3. nit — `src/lib/features/tasks/tasks.service.ts:80`: a superseded call that rejects still goes through `error()` and so reaches Sentry, even though its result would have been thrown away. The old code did the same. Optional: report only when `request === latestTaskIndexRequest`.
4. nit — `src-tauri/tests/commands/vault_test.rs:948-1027`: the new tests are indented with tabs (the project rule) while the rest of the file uses 4 spaces, and several lines run past 100 columns. No fmt gate exists, so nothing fails. Leave as is or wrap the long lines.

## Resolution

1. Fixed. `resetTasks` advances `latestTaskIndexRequest`, so a call in flight across a vault teardown drops its result. Test: `tasks.service.test.ts` "drops a call that resolves after resetTasks" (failed before the fix).
2. No change, as the finding says. The delivery note mentions that measuring K needs Debug mode on.
3. Fixed. The catch reports to `error()` only when `request === latestTaskIndexRequest`. Test: "reports only the error of the latest call" (failed before the fix).
4. Rejected. Tabs are the project rule (CLAUDE.md), no fmt gate exists, and rewrapping test lines changes no behavior; left as is.
