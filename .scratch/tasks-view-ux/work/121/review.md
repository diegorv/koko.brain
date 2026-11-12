VERDICT: APPROVED

## Acceptance criteria

- [met] Failing check first: delete the two `commands.ts` entries before the Rust registration and run `pnpm vitest run src/tests/lib/contracts/ipc-parity.test.ts`; it fails while Rust still registers the command, and passes once `lib.rs` is edited. Record both runs in the commit body. Removal only: no new behavior test is meaningful. — Commit ce9b07b85 removes the `CommandMap`/`COMMAND_ARGS` entries and the `lib.rs` `generate_handler!` entry together. Its body records the red run (3 of 4 failed with only the commands.ts entries removed) and the green run (4 of 4 after the lib.rs edit), and says "Removal only: no new behavior test is meaningful". The intermediate state was not committed separately, so the red run cannot be replayed from history, but the criterion asks only for it to be recorded. `ipc-parity.test.ts` passes on HEAD (part of the `src/tests/lib/contracts/` run below).
- [met] After the change, `grep -rnE "get_tasks_in_section|tasks_in_section|section_task_candidates|SectionTaskCandidate|extract_tasks_from_section|getTasksInSection|fileTaskGroups|setFileTaskGroups" src src-tauri/src src-tauri/tests e2e docs` prints nothing (explicit directories only: never pass `src-tauri` whole, it holds `target`). `grep -rn "tasks.types.ts::FileTaskGroup" src src-tauri/src` prints nothing. `fromV2` still matches `collection.service.ts` and `kbapi-firewall.test.ts` only. — I ran all three on HEAD. The wide grep and the `tasks.types.ts::FileTaskGroup` grep both exit 1 with no output. `grep -rln fromV2 src src-tauri/src e2e` lists only `src/lib/features/collection/collection.service.ts` and `src/tests/lib/plugins/queryjs/kbapi-firewall.test.ts`.
- [met] `cargo test` and clippy pass. The only Rust tests removed are the ones that call the removed functions; no test outside the list above changed. — `cargo test --manifest-path src-tauri/Cargo.toml`: exit 0, 1452 passed, 0 failed, 13 ignored. `cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets --locked -- -D warnings`: exit 0. The Rust test changes in `git diff main...HEAD -- src-tauri/` are the `index_note` helper and five `tasks_in_section_*` tests in `tests/commands/vault_test.rs`, all of which call `tasks_in_section`/`section_task_candidates`/`extract_tasks_from_section`; the five `extract_tasks_from_section_*` and four `extract_tasks_from_sections_*` inline tests plus the `tags` helper in `parsing.rs`; and the reworded module doc in `vault_task_test.rs`. No other test fn was added, removed or edited. `display_name` was kept in `task.rs` because `index.rs:1077` (`lookup_all_tasks`) still uses it; only the import in `commands/vault.rs` was dropped, and that is correct.
- [met] `ipc-mirrors.test.ts` passes with the synthetic allowlist test, `ipc.test.ts` has the `toggle_task_status` case, and `pnpm check` passes with the typed command map and the e2e `HANDLERS`. — `ipc-mirrors.test.ts:24` is `const ALLOWLIST: string[] = [];`, `findMirrors` takes `allowlist: string[] = ALLOWLIST`, and the self-test passes `src/lib/features/example/example.types.ts -> FileTaskGroup`. It checks both the allowed hit and the non-allowed hit, so the mechanism is still tested. `ipc.test.ts:91-92` has `// @ts-expect-error required args are missing` over `call('toggle_task_status', {})`. `pnpm check`: exit 0, 0 errors, 0 warnings. The targeted vitest run passes.
- [met] The regenerated `src/lib/contracts/generated/FileTaskGroup.ts` is committed. — It changes in e009e7b4a, and it is the only file under `generated/` that the branch changes (`git diff main...HEAD --stat -- src/lib/contracts/generated/`). After my `cargo test` run, `git status --short` is empty, so the committed bindings are fresh.
- [met] The e2e Tasks spec passes. — I ran `bash scripts/e2e.sh e2e/specs/tasks-view.spec.ts` as a probe: exit 0, 14 passed.

## Checks run by this review

- `pnpm check`: exit 0, 0 errors, 0 warnings.
- `pnpm vitest run src/tests/lib/contracts/ src/tests/lib/architecture/ src/tests/lib/features/tasks/`: exit 0, 33 files, 858 tests. This covers `ipc-parity`, `ipc`, `ipc-mirrors`, `layer-rules`, `feature-cycle`, `pure-logic`, `architecture-map`, `tasks.store.test.ts` and `tasks.service.test.ts`.
- `pnpm vitest run src/tests/e2e/`: exit 0, 3 files, 23 tests. These are the remaining tests of the e2e mocks after `vault-index-tasks.test.ts` was deleted.
- `cargo test`: exit 0. `cargo clippy ... -D warnings`: exit 0.
- `bash scripts/e2e.sh e2e/specs/tasks-view.spec.ts`: 14 passed.
- `node scripts/architecture-map.mjs --check`: "63 modules, docs match the code."
- `layer-baseline.json` and `BASELINE_SIZE` are untouched, and no composition root was added.

The test verdict rests on the files above. The full vitest suite is for deliver to run.

## Findings

1. nit — `docs/architecture/modules/src/lib/features/tasks.md:21`: this file is not in the Issue's list. The closing grep covers `docs/`, so editing the lines that name removed items was required. The `State` line, however, was rewritten whole: it drops `dateFilter`, `sectionTag` and `hideCompleted`, and adds `rows`, `query`, `groupBy`, `sort`, `currentRow`, `collapsedGroups` and the derived values. That goes beyond removing `fileTaskGroups`. I checked the new list against the getters in `tasks.store.svelte.ts:87-109` and it is accurate, and the `buildTaskRows` gotcha (`task-query.logic.ts:226,268`) and the `TaskItem, TaskRowRef` key-file line are also accurate. Fix: none needed; noted as mild scope creep.
2. nit — `docs/architecture/modules/src/lib/features/tasks.md:22,28`: lines the branch did not touch are still stale from Issues 244 to 246: `updateSectionTagFilter`, the `IPC:get_all_tasks_v2` collaborator ("buildTaskIndex when no section tag is set"), and others. Fix: refresh them in a follow-up `.scratch` Issue, not here.
3. nit — delivery note: `feature/ios-poc` still dispatches `get_tasks_in_section_v2` (Issue Notes). The delivery comment must name that branch so it follows the removal when it rebases. Nothing to change on this branch.

## Resolution

1. No change: the reviewer checked the rewritten `State` line against `tasks.store.svelte.ts:87-109` and found it accurate.
2. Deferred, no change on this branch: the stale lines (`updateSectionTagFilter`, the `IPC:get_all_tasks_v2` collaborator) come from Issues 244 to 246, not from this removal. The main session files a follow-up `.scratch` Issue to refresh `docs/architecture/modules/src/lib/features/tasks.md`.
3. Done in the delivery comment of the Issue file: it names `feature/ios-poc`, which still dispatches `get_tasks_in_section_v2` and must drop it when it rebases onto main.
