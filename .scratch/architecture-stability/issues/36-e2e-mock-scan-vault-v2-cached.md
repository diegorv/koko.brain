# 36: The E2E mock returns null for scan_vault_v2_cached

**What to build:** `e2e/mocks/tauri-core.ts:380-385` returns `null` for any command it does not know, and `scan_vault_v2_cached` is one of them. In `backlinks.service.ts:101-103`, `ok = true` is set before `result.source` throws a TypeError. The catch only logs, so every E2E vault open logs `scan_vault_v2_cached failed: TypeError` and attempts a Sentry capture. No toast appears and the index is still marked ready, so no spec has caught it.

Fix:
- Add a `scan_vault_v2_cached` handler that returns a real `CachedScanResult` (entries from the mock index, `source` set to a valid value).
- Add a Playwright fixture that fails a spec on any `[e2e mock] Unknown invoke command` warning or `scan_vault_v2_cached failed` console message. Allowlist any other unknown commands this surfaces, by name, with a reason; issue 12 removes them.

**Blocked by:** none

**Status:** ready-for-agent

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build` + `bash scripts/e2e.sh` (never while another session's E2E run holds port 1421)

**Source:** e2e/mocks/tauri-core.ts:321-385, e2e/mocks/vault-index.ts, src/lib/features/backlinks/backlinks.service.ts:95-110, src/lib/core/app-lifecycle/app-lifecycle.service.ts:300-336

- [ ] Before the handler exists, a spec using the new fixture fails on the console message
- [ ] With the handler in place, the full E2E suite passes with the fixture active
- [ ] The allowlist names each remaining unknown command

## Notes

- **Size:** S.
