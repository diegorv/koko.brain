# 34: Type rename reports success on partial failure and misses _type values with a trailing comment

Status: needs-triage

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
