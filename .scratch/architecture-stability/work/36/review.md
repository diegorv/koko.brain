VERDICT: APPROVED

# Issue 36 review

Reviewed `git diff main...HEAD` (ae0df14c, 510dc437, 11beccdf) in the worktree.

## Acceptance criteria

- [met] Before the handler exists, a spec using the new fixture fails on the console message — reviewer probe: detached checkout of 510dc437 (guard wired, no handler), `bash scripts/e2e.sh e2e/specs/word-count.spec.ts --retries=0` exit=1, "1 failed", the guard error lists `unknown invoke command \`scan_vault_v2_cached\`` and `console message \`scan_vault_v2_cached failed\`: ... TypeError: Cannot read properties of null (reading 'source')` (log /tmp/rv36-e2e-pre.log). Returned to the branch afterwards, worktree clean.
- [met] With the handler in place, the full E2E suite passes with the fixture active — reviewer probe at 11beccdf: `bash scripts/e2e.sh` (whole suite, port 1421 free before the run) exit=0, "290 passed (4.0m)", no retries or flaky entries (log /tmp/rv36-e2e-full.log). Every spec gets the guard: the only `test` builders are e2e/fixtures/test-vault.ts and e2e/fixtures/live-preview.ts (both now extend console-guard) plus folder-notes.spec.ts and queryjs-basic.spec.ts (switched to console-guard); no spec still imports `test` from `@playwright/test`, and no spec opens a second page. The guard is `auto: true`, so it applies without opt-in.
- [met] The allowlist names each remaining unknown command — e2e/fixtures/console-guard.ts:20-28 names `get_semantic_file_status`, `shutdown_semantic`, `remove_from_search_index`, `remove_semantic_file`, each with a reason. The reasons hold: SemanticIndexStatus.svelte:44-50 sets `status = next` and `resolveStatusLabel(null)` renders nothing; app-lifecycle.service.ts:605 and note-change.service.ts:164,172 ignore the result. The pre-handler probe hit `shutdown_semantic` and `get_semantic_file_status`, and the full run passing under the final list shows no other unknown command is reached. All four are listed in Issue 12 (12-type-the-e2e-ipc-mock.md:31-32), which the comment names as the follow-up.

## Other checks

- `pnpm check`: exit=0, 0 errors, 0 warnings (it covers `src` only).
- Changed e2e files typechecked with `tsc --ignoreConfig --strict` over e2e/types/global.d.ts, the three fixtures, the two specs and both mocks: the only error is the pre-existing e2e/mocks/vault-index.ts:230 `Property 'organized' is missing ... 'NoteEntryV2'` (not in this diff, same on main). Out of scope here; Issue 12 (typing the mock) is its natural home.
- Targeted E2E at HEAD: `bash scripts/e2e.sh e2e/specs/folder-notes.spec.ts e2e/specs/queryjs-basic.spec.ts e2e/specs/word-count.spec.ts e2e/specs/file-explorer.spec.ts --retries=0` exit=0, 11 passed.
- Test verdict rests on: e2e/specs/folder-notes.spec.ts, e2e/specs/queryjs-basic.spec.ts, e2e/specs/word-count.spec.ts, e2e/specs/file-explorer.spec.ts, and the full E2E run above. No vitest file covers e2e/, and no `src/` or `src-tauri/` file changed, so no vitest, build or cargo run applies; `pnpm vitest run && pnpm build` is deliver's to run.
- Handler shape matches the consumer: backlinks.service.ts:24-29 reads `source` / `entryCount` / `loadMs` / `filesReread`; the mock returns `source: 'full_scan'`, a valid member of the union, with `entryCount` from the mock index. The `vault-index-updated` emit matches Rust (`scan_vault_v2_cached` calls `emit_index_updated` at src-tauri/src/commands/vault.rs:1111 with `{changed: true, affected: [], version}`, :1317-1322). `rebuildAll` returning the version keeps its one other caller (`handleScanVaultV2`, which ignores it) unchanged.
- Scope: the diff touches only e2e/ plus the discovery note; no source change, no ledger edit.

## Findings

1. nit — e2e/mocks/tauri-core.ts:86: the mock returns `filesReread: 0` with `source: 'full_scan'`, but the real full-scan branch reports `files_reread: entry_count` (src-tauri/src/commands/vault.rs:1191). Only a debug log reads it today, so nothing breaks; fix: return `filesReread: entryCount` (compute the count once) so the mock reports what Rust does for the source it claims.

## Resolution

1. Accepted. Confirmed at src-tauri/src/commands/vault.rs:1191 (`files_reread: entry_count`). e2e/mocks/tauri-core.ts now computes `entryCount` once and returns it as both `entryCount` and `filesReread`.
