# 118: Type rename reports partial failure and also updates _type values with a trailing comment

**Migrated from:** `.scratch/file-io-audit/issues/34-type-rename-partial-failure.md` (audit 2026-11-05). Priority: corner case (bucket 4-corner). It needs a failed note write during a type rename. The Notes say its original sections still lack the behavior to build.

**Audit check at `5f8003d67`:** still_present (content, low). (a) propagate_type_rename_inner skips failures with debug_log and returns the count (src-tauri/src/commands/vault.rs:392-446). (b) renameType: the open-tab write loop and `await call('propagate_type_rename', ...)` share one try (src/lib/features/type-definitions/type-definitions.service.ts:229-241), the catch returns at :242-246, and the count is discarded. (c) rewrite_type_line compares the raw value, so 'Project # note' returns None (src-tauri/src/vault/parsing.rs:143-147). (d) the new name is written raw (parsing.rs:148-151; rewriteTypeInFrontmatter at type-definitions.logic.ts:210; `_type: ${typeName}` template at type-definitions.service.ts:79); validateTypeName (type-definitions.logic.ts:168) checks only file-name legality. Rust traced, not run.

**Stale in the text below:** Line numbers moved: vault.rs :356-376/~423 is now :392-446; renameItem at type-definitions.service.ts:223, tab loop :229-240, propagate call :241, catch :242-246 (Issue :209, :215-231, :226); resolveTypedNoteTarget template :79 (Issue :73); validateTypeName :168 (Issue :157-166); rewriteTypeInFrontmatter :210 (Issue :194-206). The original sections still need acceptance criteria before the Issue can run.

**Owner decision needed:** When some notes fail during a type rename: keep the rename and list the notes that were not updated (toast plus log), or roll the rename back?

**Status:** needs-info

**Blocked by:** none
Priority: P2
Severity: stale-state
Source: file I/O audit, deep-dive group(s) h06-type-rename (raw reports in .scratch/file-io-audit/deep/raw/), verified at c4bfee07

## Rust propagate_type_rename skips failing members silently and reports success

- Verdict: CONFIRMED_BY_TRACE (deep dive priority P2, severity stale-state)
- Claims covered: rust-writes-5

**How a user hits it.** Narrow. Needs a member .md with no write bits (utils/fs.rs:20-23 refuses it), or a member still indexed after it was moved or deleted inside the ~500 ms watcher window. Default settings, no extra action. The skip is by design on the Rust side (existing Rust test continues_past_write_failures_and_counts_only_successes asserts count=1).

**Recoverable from.** Content intact. Only the type label stays stale. The old type has no definition afterwards, so renameType cannot be re-run for it; the user must edit _type by hand.

**Root cause.** src-tauri/src/commands/vault.rs:356-376 (read/write failure -> debug_log + continue; rewrite None -> continue silently); src-tauri/src/commands/vault.rs ~423 returns Ok(updated); src/lib/features/type-definitions/type-definitions.service.ts:226 discards the count, toast only in catch at 227-231

**Evidence.** vault.rs:359-375 continue on read/write error with debug_log only; vault.rs:367-369 continue on None; type-definitions.service.ts:226 `await call('propagate_type_rename', ...)` with no use of the result; utils/fs.rs:20-23 readonly guard; src-tauri/tests/vault_type_rename_test.rs continues_past_write_failures_and_counts_only_successes. Not run: cargo is banned in this task, so Rust behavior is traced, not executed.

## Trailing YAML comment on a _type line is indexed as the type but never rewritten, silently

- Verdict: CONFIRMED_BY_TEST (deep dive priority P2, severity stale-state)
- Claims covered: 

**How a user hits it.** Uncommon: needs a hand-written inline comment after the type value (e.g. `_type: Project # note`). Silent when it happens; the note drops out of the renamed type with no message. Default settings.

**Recoverable from.** Content intact. Note keeps `_type: Project # note`; user must edit by hand.

**Root cause.** src-tauri/src/vault/parsing.rs:127-152 (rewrite_type_line compares the raw value 'Project # note' to 'Project') and parsing.rs:117-119 (returns None, no log); same comparison in src/lib/features/type-definitions/type-definitions.logic.ts:180-210. Index side: yaml-rust2 ends a plain scalar at blank+'#', so entry.rs extract_is_a yields 'Project'.

**Evidence.** yaml-rust2 scanner.rs (fetched from raw.githubusercontent.com/Ethiraric/yaml-rust2/master/src/scanner.rs, not pinned to Cargo.lock): plain scalar loop breaks on '#' after blanks, so the comment is not part of the scalar. parsing.rs rewrite_type_line: raw_value 'Project # note' is not quoted, normalize_type_casing != 'Project' -> None. Repro run with vitest: rewriteTypeInFrontmatter returns null where the correct output is '---\n_type: Initiative\n---\n\nbody'.

**Repro test.** `.scratch/file-io-audit/repro/src/tests/repro/h06-type-rename/trailing-comment-type-value.test.ts` fails on the bug assertion at c4bfee07. When fixing, move it under `src/tests/` as the red test.

```
FAIL: AssertionError: expected null to be '---\n_type: Initiative\n---\n\nbody' // Object.is equality
```

## Failing open-member tab write aborts propagation after the definition was already renamed

- Verdict: CONFIRMED_BY_TRACE (deep dive priority P2, severity stale-state)
- Claims covered: 

**How a user hits it.** Rare: needs an open member whose writeTextFile throws (e.g. a read-only open member, EACCES). Loud: a toast is shown. Definition rename at type-definitions.service.ts:209 has already happened.

**Recoverable from.** Content intact. Non-open members keep `_type: Project`. No UI retry path because the old name no longer exists as a definition; manual edit needed.

**Root cause.** src/lib/features/type-definitions/type-definitions.service.ts:209 (definition renamed first) and 215-231 (per-tab writes; a throw in the loop goes to the catch at 227-231, which returns before the propagate_type_rename call at 226)

**Evidence.** type-definitions.service.ts:226 is inside the same try as the tab loop; the catch at 227-231 returns before selection and rail updates (232-236). Not run: no test covers a throwing tab write followed by propagation.

## Type rename writes the new name unquoted, so a name with YAML syntax changes or drops the members' type

- Verdict: CONFIRMED_BY_TRACE (editor-data-safety audit priority P2, severity stale-state)
- Claims covered: 

**How a user hits it.** The user renames type 'Book' to 'Book #2', '[Projects]', '#ideas' or '2024'. The type-name validator accepts all of them (validateTypeName, src/lib/features/type-definitions/type-definitions.logic.ts:157-166, checks only file-name legality through getFileNameError, src/lib/core/filesystem/fs.logic.ts:117-124, which forbids control characters and `<>:"/\|?*`). Every member whose `_type` was unquoted is rewritten to `_type: Book #2`, which YAML reads as 'Book' (' #' starts a comment); members are then indexed under 'Book', which has no definition, and drop out of 'Book #2'. `_type: [Projects]` is a flow sequence and `_type: #ideas` is null, and `_type: 2024` is a number, so extract_is_a (src-tauri/src/vault/entry.rs:362-369, `as_str()`) returns None and the members lose their type entirely. A member whose `_type` was single-quoted and a new name with an apostrophe ('Bob's') is written as `'Bob's'`, which does not parse. Silent: the rename reports success.

**Recoverable from.** Content intact. The user must quote `_type` by hand in every member.

**Root cause.** src-tauri/src/vault/parsing.rs:148-151 (rewrite_type_line writes `new_type` raw when the original value was unquoted, and wraps it in the original quote char with no escaping otherwise); src/lib/features/type-definitions/type-definitions.logic.ts:206 (rewriteTypeInFrontmatter, the TS mirror used for open tabs, does the same); src/lib/features/type-definitions/type-definitions.service.ts:73 (resolveTypedNoteTarget writes `_type: ${typeName}` raw into every new note of the type). The matching fix for the trailing-comment section above does not add quoting.

**Fix sketch.** Write the type value as a quoted YAML scalar whenever it is not a safe plain string (double quotes with `\` and `"` escaped is simplest), in rewrite_type_line, rewriteTypeInFrontmatter and resolveTypedNoteTarget alike, keeping the original quote style only when the new name needs no escaping in it. Or reject YAML indicator characters and number, boolean or null look-alikes in validateTypeName; that alone leaves the existing-quote case open.

These criteria cover only the editor-data-safety amendment (2026-11-02). Triage must add criteria for the original sections above before this Issue runs; each section's repro test is its red test.

- [ ] Renaming a type to 'Book #2', to '[Projects]' and to '2024' re-indexes every member (closed note and open tab) under exactly that name; Rust and TS tests cover each
- [ ] A new note created for a type named 'Book #2' is indexed under 'Book #2'
- [ ] A member with `_type: 'Project'` renamed to `Bob's` still parses, with the value `Bob's`

## Audit evidence (editor-data-safety, 2026-11-02)

- Finding F78 (.scratch/editor-data-safety/audit-2026-11-02.md; cross-reference in .scratch/editor-data-safety/xref-file-io-audit.md). No repro test was written for F78 under /Users/diegorv/Dev/pet-projects/koko/brain/.scratch/editor-data-safety/repro/; the first criterion above is the red test to write.
- Verified at the current main: parsing.rs:143-152 (raw value compare, then `None => new_type.to_string()` at :150); type-definitions.logic.ts:194-206 (quote kept, `newType` interpolated raw); type-definitions.service.ts:73; fs.logic.ts:117-124 allows `#`, `[`, `]`, `{`, `&`, `!` and `'`; entry.rs:362-369 accepts only a string `_type`. The quote, number and apostrophe variants are traced from the same lines, not run.

## Comments

- 2026-11-06: migrated from `.scratch/file-io-audit/issues/34-type-rename-partial-failure.md` by audit 2026-11-05, which re-checked it at `5f8003d67`.
