VERDICT: APPROVED

Re-review, round 2, of the fixes after `eecfc82f` (`f5cfc13d`, `50b369cd`, `16b113d8`, `85d2a3b7`, `cd349d7c`).

## Previous findings

| # | Severity | Status | Evidence |
|---|----------|--------|----------|
| 1 | major (process) | still open, handled at merge | `/Users/diegorv/Dev/pet-projects/koko/brain/.claude/worktrees/ios-poc/src/lib/core/editor/note-write.port.ts` is still untracked in the main checkout (`git status --short` there shows `?? src/lib/core/editor/note-write.port.ts`). `diff` against the branch file shows only two comment hunks (lines 6-7 and 11), no code difference. It is not part of the branch diff and cannot be fixed on the branch. The failure is visible and recoverable: git refuses the merge, it does not overwrite. I re-file it below as a minor merge step, not a code defect. |
| 2 | minor | resolved | `editor.service.ts:48` `conflictedPaths` is now a `Map<path, content shown for>`. `saveDirtyTabs` (`:228-233`) toasts again only for a conflicted, dirty tab whose content differs from the one last shown, and still keeps it out of the save list (`:236`) and out of the retry decision (`:242`). `writeTab` stores the refused content (`:214`). `delete`/`clear` sites (`:55`, `:98`, `:207`, `:476`) work unchanged on a Map. Test "typing into a conflicted tab shows the conflict message again, once per autosave, without saving" covers new typing, no-typing quiet, and undo-to-clean then retype, and asserts a single write. A persistent indicator is still a possible follow-up, as the fix report says. |
| 3 | minor | resolved | `auto-move.service.ts:173-178` returns on `isRemoteBrowser()` before the `mkdir`. Test "observer in the browser creates no folder and moves nothing" asserts `mkdir`, `moveItem` and `setIconForPath` are not called, and resets `setRemoteBrowser(false)` in `finally`. `features/` importing `core/platform` is allowed. |
| 4 | nit | resolved | `dispatch.rs:217-232` parses plugin-fs's `options` header. That matches plugin-fs 2's `writeTextFile` (`headers.options = JSON.stringify(options)`, absent when `undefined`, so `unwrap_or(Null)` is right), and the stand-in forwards headers (`tauri-bridge-stand-in.ts:141-142`). `append: true` is refused, `createNew: true` goes through `create_new` (O_EXCL), and `create: false` passes `create_missing = false` to `write_checked`, which refuses a missing file with a non-conflict error (`write.rs:90-101`). This is the behaviour `frontmatter-write.service.ts:151-153` relies on. Tests: `create_false_does_not_recreate_a_missing_note`, `an_append_write_is_refused`, `create_new_refuses_an_existing_note`. The `.kokobrain` drop still runs before the options parse. |
| 5 | nit | rejection stands | Truncate-in-place matches plugin-fs's own write, so it is not a regression. The fix step's point holds: a temp file plus rename changes the file's identity (inode, hard links, xattrs, creation date). That needs its own decision, so it belongs in a separate Issue. |

The 7th commit (`cd349d7c`, `raw-write-ratchet.test.ts:29`) moves the allowlist entry from `editor.service.ts` to `core/editor/note-write.port.ts` and keeps one site. `grep` confirms that the only raw `writeTextFile` is `note-write.port.ts:12` and that `editor.service.ts` has none, so the ratchet is not loosened.

## Acceptance criteria re-checked

- [met] The host accepts a write when the SHA-256 of the disk text, decoded the way the frontend decodes it (UTF-8 with replacement, BOM stripped), equals the SHA-256 of the base, or equals the SHA-256 of the new content (a retry of a write that already landed). Otherwise it refuses with a conflict. A write to an existing file with no base is refused — `write_checked` keeps its hash comparison. The only change is the `create_missing` argument, which affects only a missing file with no base. `remote_write_test` passes 17/17, including `a_write_on_the_base_lands`, `a_retry_after_a_landed_write_is_accepted` and `a_write_to_an_existing_file_with_no_base_is_refused`.
- [met] A conflict is its own error type, defined where both `core/` and `app/` can import it (`contracts/` or `utils/`). The editor shows "This note changed on the Mac. Your text is kept; reload the note to see the Mac version", keeps the tab dirty, and stops the 5 s autosave retry for that tab until the note is reloaded (today a failed save shows a generic toast and retries every 5 s forever) — the conflicted path is still excluded from saving and from the retry (`editor.service.ts:236,242`). The new re-toast shows the same `NOTE_CONFLICT_MESSAGE` and writes nothing (the new test asserts `writes` has length 1). The existing conflict, reload, close/reopen and "another write error still retries" tests pass.
- [met] Rust tests: stale write refused with no change on disk; retry after a landed write accepted; existing-file write with no base refused; write outside the vault refused (03) — the call sites were updated for the new parameter, and `remote_write_test` passes (17).
- [met] Browser writes open the target without following a final symlink (`O_NOFOLLOW`, or `openat` from the canonical parent), so a link swapped in after the 03 containment check cannot redirect the write; a Rust test swaps the target for a link after the check and the write is refused with no change outside the vault — `a_link_swapped_in_after_the_check_does_not_redirect_the_write` now passes `create_missing = true` (the permissive case) and still asserts that both writes are refused and the secret is unchanged. The new `createNew` route uses `create_new`, which is O_EXCL and does not follow a final link.

## Checks I ran

- `pnpm check`: 0 errors, 0 warnings.
- `pnpm vitest run src/tests/lib/core/editor/ src/tests/lib/features/auto-move/ src/tests/lib/raw-write-ratchet.test.ts src/tests/lib/app/remote/ src/tests/lib/core/frontmatter/`: 32 files, 879 tests, all passing.
- `cargo test --test remote_write_test --test remote_ws_test`: 17 and 28 passing.
- Not run, left to deliver: the full `pnpm vitest run && pnpm build`, the full `cargo test`, clippy and E2E.
- No `layer-baseline.json` entry, no `BASELINE_SIZE` change, no composition root, and no ts-rs DTO change. No test was weakened or deleted: the ratchet entry moved and its count stayed at 1.

## Findings

1. minor (merge step, carried over from round 1 #1) — `/Users/diegorv/Dev/pet-projects/koko/brain/.claude/worktrees/ios-poc/src/lib/core/editor/note-write.port.ts` (untracked, main checkout). Fix: right before the merge, delete it from the main checkout (`rm` that one path). It differs from the branch file only in comments, so nothing is lost. Otherwise the merge stops with "untracked working tree files would be overwritten".
2. nit — `src/lib/core/editor/editor.service.ts:228-233`. With the 10 s `maxWait`, continuous typing into a conflicted tab re-shows the toast about every 10 s. That is intended ("once per autosave burst") and harmless, but a persistent tab or status-bar marker would be quieter. Follow-up only.
