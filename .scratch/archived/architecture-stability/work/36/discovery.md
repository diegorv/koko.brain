# Issue 36 discovery

No `spec.md` for architecture-stability; no ADR applies (E2E mock + Playwright fixture only, no `src/` change).

## Files that change

- `e2e/mocks/tauri-core.ts:77-79,330`: add `handleScanVaultV2Cached` next to `handleScanVaultV2`. It runs
  `vaultIndex.rebuildAll()`, emits `vault-index-updated` (`{ changed: true, affected: [], version }`, as
  Rust `emit_index_updated` at `src-tauri/src/commands/vault.rs:1317` does after `scan_vault_v2_cached`)
  and returns `{ source: 'full_scan', entryCount: getAll().length, loadMs: 0, filesReread: 0 }` (the
  shape `backlinks.service.ts:24-29` reads; the mock has no snapshot, so `full_scan` is the honest source).
- `e2e/fixtures/console-guard.ts` (new): `test = base.extend` with an `auto: true` fixture that records
  `page.on('console')` messages and, after `use()`, fails the spec on any `[e2e mock] Unknown invoke
  command: <cmd>` warning whose `<cmd>` is not in `ALLOWED_UNKNOWN_COMMANDS`, or any message containing
  `scan_vault_v2_cached failed`. `ALLOWED_UNKNOWN_COMMANDS` maps command name -> reason (Issue 12 removes them).
- `e2e/fixtures/test-vault.ts:18`, `e2e/fixtures/live-preview.ts:1`: extend from the guard's `test`
  instead of `@playwright/test`, so every spec that imports either fixture gets it.
- `e2e/specs/queryjs-basic.spec.ts:1`, `e2e/specs/folder-notes.spec.ts:1`: the only two specs that build
  `test` from `@playwright/test` directly; switch their `base` import to the guard.

## Plan (test-first)

1. Add the guard + wiring, no handler. Run one vault spec via `bash scripts/e2e.sh <spec>`: it must fail
   on `scan_vault_v2_cached failed` / unknown command (AC 1). Commit.
2. Run the full E2E suite once with the guard to list every other unknown command; allowlist each by
   name with a reason. Commit.
3. Add the handler; the same spec passes; full E2E suite passes (AC 2). Commit.

## Prior art

`e2e/fixtures/test-vault.ts` `base.extend` pattern; Playwright `auto: true` fixtures.

## Risks / defaults

- Emitting `vault-index-updated` at vault open bumps `vaultIndexVersion` once more than today; that is
  the real app's behavior, so a spec that breaks on it was relying on the mock being wrong.
- `scripts/e2e.sh` kills whatever holds port 1421: check it is free before each run.
- Guard matches console text substrings; `console.warn` args are joined by Playwright's `msg.text()`.
