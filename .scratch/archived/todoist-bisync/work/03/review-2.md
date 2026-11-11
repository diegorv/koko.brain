VERDICT: APPROVED

Re-review, round 2, of the fix commit `dea5c713c` (`git diff 12d5ebac2..HEAD`) against `.scratch/todoist-bisync/work/03/review.md`.

## Previous findings

| # | Severity | Status | Evidence |
|---|----------|--------|----------|
| 1 | major | resolved | `src-tauri/src/vault/task_lines.rs:160-173`: the locate loop keeps a `HashSet<usize>` of located indexes, and a second edit on the same index returns `Stale(AnchorDuplicated, <second anchor>)` before any line changes. Replacements are iterated before removals, so the subject is the later edit's anchor (`td-2`). `two_edits_whose_anchors_share_one_line_are_stale` covers two removals, two replacements and replace + remove. `two_removals_on_one_shared_line_write_nothing` checks the command half: `Stale`, and the file on disk is byte-identical, so the `td-3` line survives. |
| 2 | minor | resolved | `task_lines.rs:151-154`: a non-empty batch on content containing `\r\n` returns `Stale(CrlfLineEndings, "")` before any split or insert, so neither end nor heading inserts can mix line endings. `any_edit_on_a_crlf_note_is_stale` covers both insert kinds and the empty-batch no-op. `TaskLinesStaleReason.ts` / `TaskLinesStale.ts` are regenerated and fresh. No TS code switches exhaustively on the reason (grep of `src/lib`, `src/tests`, `e2e`), so the new variant breaks no consumer, and `pnpm check` passes. |
| 3 | minor | resolved | `src-tauri/src/commands/vault.rs:928-933`: for a missing note, a blank result returns `Unchanged` with `content: None`, so the wrapper (`closed-note-writer.service.ts:44`) never reaches `createEmptyNote`, and line 53 maps `null` to `''`. `a_missing_note_with_a_batch_of_no_text_is_unchanged_and_not_created` covers the empty batch and an end insert of empty lines, and asserts that the file does not exist. No TS test covers the `null` content, which is noted in the fix report. The mapping is one `??` on a path the other wrapper tests already exercise. |
| 4 | nit | resolved | `docs/agents/indexing-watcher-rules.md:5` now names `write_task_lines` in rule 2. |
| 5 | nit | rejection stands | The review asked for no change, and there was none. |

## Acceptance criteria re-checked

- [met] Rust command, all-or-nothing per file: a batch of `{anchor, expected_line, new_line}` replacements, `{after_heading | end, lines}` inserts and `{anchor, expected_line}` removals. Returns `stale` and writes nothing when an anchor is missing, appears twice, or its line differs; refuses an insert whose anchor already exists in the file. A move within one file is one call. — The shared-line hole (finding 1) is closed and the CRLF case is stale for every edit kind. `vault_task_lines_test` passes all 36 tests, the earlier stale, duplicate and move tests included.
- [met] Missing note: created through `create_note` + `applyNoteChange({ source: 'create' })` so the explorer shows it, then inserted into. — Unchanged for batches that add text (`a_missing_note_with_only_end_inserts_is_missing_and_not_created` and the TS create test still pass). A batch that adds no text no longer creates an empty note (finding 3).
- [met] Gate: Both (`cargo test`, `pnpm check`, `pnpm vitest run`); commit regenerated bindings. — `cargo test --test vault_task_lines_test` exit 0 (36 passed). `cargo test --lib export_bindings` exit 0 (42 passed) and left the worktree clean, so the committed bindings are fresh. `pnpm check` exit 0, 0 errors. The targeted vitest files pass. The full `cargo test` and `pnpm vitest run` are deliver's to run.

## Findings

None open or new.

- Regressions: none found. The new checks run before any mutation, and an empty batch keeps its old no-op path. No test was weakened or deleted: the diff only adds tests.
- Scope: the fix commit touches only the files the three findings name, their tests, the generated bindings and the rule-2 doc line. `layer-baseline.json` is untouched.

## Checks run by this review

- `cargo test --manifest-path src-tauri/Cargo.toml --test vault_task_lines_test`: exit 0, 36 passed.
- `cargo test --manifest-path src-tauri/Cargo.toml --lib export_bindings`: exit 0, 42 passed; `git status` clean afterwards.
- `pnpm check`: exit 0, 0 errors, 0 warnings.
- `pnpm vitest run src/tests/lib/features/todoist-sync src/tests/lib/contracts src/tests/lib/core/filesystem/task-write.service.test.ts`: exit 0, 8 files, 134 tests passed.
