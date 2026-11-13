VERDICT: APPROVED

## Previous findings

| # | Severity | Status | Evidence |
|---|----------|--------|----------|
| 1 | minor | resolved | `e2e/mocks/vault-index.ts:174-185` now keeps the open marker (`fence: string \| null`), opens on `^[ \t]*(```\|~~~)`, closes only on the same marker and skips every marker line, which is line for line what `extract_tasks_and_headings` does with `detect_code_fence` (`src-tauri/src/vault/parsing.rs:1684-1693`, `:1716-1731`: trims only spaces and tabs, `continue`s on any marker line). New fixture case "a tilde fence closes only on a tilde fence" (`~~~`, `# x`, a ``` line, `- [ ] fenced`, `~~~`, `# After`, a task) pins both the tilde open and the "a different marker does not close" rule; it runs and passes in both `task-headings-parity.test.ts` and `vault_task_headings_parity_test.rs` in my runs. Without the fix the mock would toggle off on the ``` line and record `fenced`, so the case would fail on the old mock. |
| 2 | nit | resolved | `discovery.md` now says the no-tag fallback returns tasks with `heading: Some(n)` and no `task_headings`. No code change, as the finding allowed. |
| 3 | nit | resolved | `src/tests/e2e/task-headings-parity.test.ts:36` is renamed "omits taskHeadings for a note without tasks"; the assertion is unchanged. |

## Acceptance criteria re-checked

- [met] Parity: a fixture `src/tests/fixtures/task-headings-parity.fixture.json` (note text plus expected JSON, the convention of `natural-sort-parity.fixture.json`, loaded in Rust with `include_str!` as `src-tauri/tests/vault_natural_sort_parity_test.rs:11` does) is read by the Rust test and by a new `src/tests/e2e/task-headings-parity.test.ts` that runs the e2e mock parser over it, so the e2e mock cannot drift. `parseTasks` is module-private in `e2e/mocks/vault-index.ts:150`; export it, or drive it through the exported `vaultIndex.update` (`:566`). `src/tests/e2e/tauri-fs.test.ts` already imports `e2e/mocks` under vitest; import the mock the same way (Issues 242 and 122 put their mock tests in the same folder). — The fix adds one case to the shared fixture; `pnpm vitest run src/tests/e2e/task-headings-parity.test.ts --reporter=verbose` exit 0, 7 tests including the tilde case; `cargo test --test vault_task_headings_parity_test` exit 0. The fence rule the round-1 review said was unpinned is now pinned on both sides.

## Checks run by the re-reviewer

- `pnpm check`: exit 0, 0 errors, 0 warnings.
- `pnpm vitest run src/tests/e2e/`: exit 0, 3 files, 21 tests (parity, `vault-index-tasks.test.ts`, `tauri-fs.test.ts`).
- `cargo test --manifest-path src-tauri/Cargo.toml --test vault_task_headings_parity_test --test vault_task_test`: exit 0; `git status --short` empty afterwards (bindings fresh).
- Regression scan: the mock change also stops the mock from parsing tasks inside `~~~` blocks, which matches Rust; no e2e spec or e2e mock test uses `~~~` (`grep -rln '~~~' e2e src/tests/e2e` finds only the mock itself). No test weakened or deleted; the fix touches no file outside the e2e mock, its test, the fixture and the Issue's own `.scratch` records.
- Not run (deliver's): full `pnpm vitest run`, `bash scripts/e2e.sh`.

## Findings

None open or new.
