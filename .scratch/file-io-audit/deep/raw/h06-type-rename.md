# Deep dive h06-type-rename (raw)

Worktree: /Users/diegorv/Dev/pet-projects/koko/brain/.claude/worktrees/file-io-repro
Claims: rust-writes-5, feature-writers-15 (from .scratch/file-io-audit/deep/items/h06-type-rename.md)

## Bugs

### B1. Rust propagate_type_rename skips members silently and reports success (covers rust-writes-5)

- Verdict: CONFIRMED_BY_TRACE. Severity: stale-state. Priority: P2.
- Root cause: src-tauri/src/commands/vault.rs:356-376. A member whose read_to_string or write_atomic fails is logged with debug_log and `continue`d. `rewrite_type_in_frontmatter` returning None (line 367-369) also continues silently, with no log. The command returns `Ok(updated)` (vault.rs ~423).
- Frontend: src/lib/features/type-definitions/type-definitions.service.ts:226 awaits `call('propagate_type_rename', ...)` and discards the count. The only toast is in the catch at 227-231, which runs only when the IPC throws.
- Write guard confirmed: src-tauri/src/utils/fs.rs:20-23 refuses read-only targets (`metadata.permissions().readonly()`), so a read-only member is skipped as the claim says.
- Existing coverage: src-tauri/tests/vault_type_rename_test.rs `continues_past_write_failures_and_counts_only_successes` asserts the skip and count=1 by design. So the partial result is intended on the Rust side. The TS side never surfaces it. No TS test covers the partial count.
- Reachability: narrow. Needs a member .md without write bits (chmod 0444 or similar), or a member indexed but already gone/moved inside the ~500 ms watcher window. Default settings, no extra action. Note content is untouched; only the type label stays stale.
- Recoverable: content intact. The old type has no definition afterwards, so the rename dialog cannot reach it; the user must edit `_type` by hand.
- Refutation attempts: the claim's "moved since indexing" case is real (read fails, entry stays indexed; test skips_files_deleted_from_disk_but_still_indexed) but narrow. No guard found that would make the TS side report the count.
- Test: none written. A TS test would need an invented expected count; the Rust side cannot be run here (cargo banned).

### B2. Trailing YAML comment on a `_type:` line: indexed as the type but never rewritten, silently (new; no claim id)

- Verdict: CONFIRMED_BY_TEST for the TS rewrite (same comparison as Rust). Rust side CONFIRMED_BY_TRACE. Severity: stale-state. Priority: P2 (uncommon trigger).
- Index side: src-tauri/src/vault/parsing.rs `parse_frontmatter` -> `parse_yaml_block` -> yaml-rust2 events. Fetched yaml-rust2 scanner.rs (raw.githubusercontent.com/Ethiraric/yaml-rust2/master/src/scanner.rs, not pinned to the lock version; Cargo.toml requires 0.13): a plain scalar ends at a blank followed by `#`. So `_type: Project # note` indexes as is_a "Project" (entry.rs extract_is_a).
- Rewrite side: parsing.rs:127-152 `rewrite_type_line` takes the raw value `Project # note`, strips quotes (none), compares `normalize_type_casing` to "Project", fails, returns None. parsing.rs:117-119 then returns None, and the note is skipped with no log at all. The TS copy at type-definitions.logic.ts:180-210 has the same behavior.
- Consequence: the note stays `_type: Project # note` after the rename, is indexed as Project, and drops out of the renamed type with no message.
- Reachability: needs a hand-written inline comment after the type value. Uncommon, realistic for hand-edited YAML.
- Repro: src/tests/repro/h06-type-rename/trailing-comment-type-value.test.ts. Fails: `expected null to be '---\n_type: Initiative\n---\n\nbody'`.

### B3. Keystroke typed in the active member tab during the rename's per-tab write is lost (covers feature-writers-15)

- Verdict: CONFIRMED_BY_TEST. Severity: data-loss (a few keystrokes). Priority: P3.
- Mechanism: type-definitions.service.ts:215-220 reads `tab.content` (via rewriteTypeInFrontmatter) before `await writeTextFile`, then calls `syncExternalContentToEditor(tab.path, updated, true, 'none')`. editor.service.ts:76-82 calls `updateTabContentByPath`, which sets content and savedContent to the pre-await rewritten text (editor.store.svelte.ts:130-136), and bumps the external signal so MarkdownEditor.svelte:311-337 replaces the CM doc. Keystrokes reach the store via onContentChange -> updateContent (editor.store.svelte.ts:84-88) during the await and are overwritten.
- Line anchors match the claim (218 is the writeTextFile line; 130-136 is updateTabContentByPath).
- Reachability: the window is one writeTextFile round trip per tab preceding the active one (ms). The rename runs from the modal TypeNameDialog (TypesNavigator.svelte:368), so typing into the editor in that window is unlikely.
- Recoverable: partly, probably via Ctrl+Z. The replace uses addToHistory(false); undo after a full-doc replace was not verified.
- Repro: src/tests/repro/h06-type-rename/keystroke-during-type-rename-write.test.ts. Fails: `expected '---\n_type: Initiative\n---\n\nhello' to contain '!'`.

### B4. A failing open-member tab write aborts the whole propagation after the definition was already renamed (new; no claim id)

- Verdict: CONFIRMED_BY_TRACE. Severity: stale-state. Priority: P2 (rare trigger).
- Mechanism: type-definitions.service.ts:209 renames the definition first (renameItem). The per-tab loop at 215-225 writes each rewritten open member. If one writeTextFile throws (e.g. an open member that is read-only, EACCES), the catch at 227-231 returns before `call('propagate_type_rename')` at 226. Every non-open member keeps `_type: Project`.
- Loud: a toast is shown ("Type renamed, but updating member notes failed..."). No retry path: the definition now carries the new name, so renameType(oldName, ...) cannot be re-run from the UI. Selection is also left on the old name (233-236 skipped).
- Reachability: needs an open member whose write fails. Rare.
- Recoverable: content intact; manual edit of the stale `_type` values.

## Claim verdicts

- rust-writes-5 -> B1 (CONFIRMED_BY_TRACE, P2). Claim's line anchors are right (vault.rs:356-376, :423, utils/fs.rs:20-23, type-definitions.service.ts:224-230 is the toast area, actually 226-231). Severity framing is accurate: stale-state, no content loss. The "moved since indexing" path exists but is narrow.
- feature-writers-15 -> B3 (CONFIRMED_BY_TEST, P3). Claim is accurate; the minor severity is right.

## Not checked

- Rust was not built or run (cargo banned). B1 and B2 Rust behavior is from tracing plus the existing Rust unit tests. Check that src-tauri/tests/vault_type_rename_test.rs passes at HEAD.
- yaml-rust2 comment rule was read from the master branch on GitHub, not the 0.13 release in Cargo.lock.
- Undo after the doc replace in B3 was not exercised.
- Symlink member notes: write_atomic renames over the symlink path, replacing the link with a regular file. Seen in passing, not in any claim, not verified.
- Stray `<file>.md.tmp-<pid>-<seq>` files are left in the vault when `std::fs::write` fails mid-write (utils/fs.rs:24-28 returns before cleanup). Seen in passing, not in any claim, not verified.

## Files created

- src/tests/repro/h06-type-rename/keystroke-during-type-rename-write.test.ts
- src/tests/repro/h06-type-rename/trailing-comment-type-value.test.ts
- /Users/diegorv/Dev/pet-projects/koko/brain/.scratch/file-io-audit/deep/raw/h06-type-rename.md
