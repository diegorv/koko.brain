VERDICT: APPROVED

## Acceptance criteria

- [met] Failing test first, in src/tests/lib/architecture/fs-capabilities.test.ts (new file, same pattern as the default.json read in src/tests/lib/core/settings/theme-catalog.service.test.ts:139-150): read src-tauri/tauri.conf.json and src-tauri/capabilities/default.json; for every vault root in the fs:allow-read-text-file scope ($DOCUMENT/kokobrain-vaults/**, $HOME/kokobrain-vaults/**), assert app.security.assetProtocol.scope contains the same glob. It fails today for $HOME/kokobrain-vaults/**. — The new file reads both JSON files (fs-capabilities.test.ts:26-46) and asserts that every `fs:allow-read-text-file` glob is covered by an asset-scope glob (:68-76). I confirmed red myself: with main's tauri.conf.json checked out over the worktree copy, the test failed with uncovered `["$HOME/kokobrain-vaults/**", "$HOME/kokobrain-vaults/**/.kokobrain/**"]` (exit 1). With the branch's file restored it passes, 2/2 (exit 0). The test checks coverage instead of literal containment. That deviation is justified: `$DOCUMENT/kokobrain-vaults/**` is not in the asset scope literally (`$DOCUMENT/**` covers it), so a literal check would also fail for the Documents root, and the criterion says the test fails today only for the HOME root.
- [not met] An image embedded in a note of a vault at ~/kokobrain-vaults/<name> renders in live preview (manual check in the app, since the scope is enforced by Tauri at fetch time). — Manual in-app check, not done by this run. The config is consistent with it: `$HOME/kokobrain-vaults/**` and `$HOME/kokobrain-vaults/**/.kokobrain/**` are now in app.security.assetProtocol.scope (src-tauri/tauri.conf.json:35-36).
- [not met] A screenshot captured by Quick Capture into such a vault renders in the note it was embedded in. — Manual in-app check, not done. The same new scope entries cover it.
- [not met] Images in a vault under ~/Documents/kokobrain-vaults still render. — Manual in-app check, not done. No existing scope entry was removed or changed (the diff only adds two lines), so `$DOCUMENT/**` and `$DOCUMENT/**/.kokobrain/**` still apply.
- [not met] Both gates: cargo test --manifest-path src-tauri/Cargo.toml, then pnpm check and pnpm vitest run. — `pnpm check`: exit 0, 0 errors, 0 warnings (221 files). Targeted vitest (fs-capabilities.test.ts): exit 0, 2 passed. The full vitest suite is deliver's to run. `cargo test` could not run: `cargo fetch` failed with exit 101 (`static.crates.io ... transferred 0 bytes`, sentry-types 0.49.5), which matches the build report's network failure. See finding 1.

## Findings

1. minor, src-tauri/tauri.conf.json:35-36: `cargo test` has not run on this branch because crates.io is unreachable from this machine (I reproduced it with `cargo fetch`, exit 101). The Rust code is unchanged, but `generate_context!` embeds and validates tauri.conf.json at compile time. Fix: deliver (or the owner, once the network is back) runs `cargo test --manifest-path src-tauri/Cargo.toml` from the worktree root before merging. The JSON is valid (the vitest test parses it), and adding strings to the `scope` array keeps it schema-valid, so a failure is unlikely.
2. nit, src/tests/lib/architecture/fs-capabilities.test.ts:52-60: `globMatches` handles only literal and `**` segments, so a future asset-scope glob with `*`, `?` or `[...]` would count as a literal and the test would report a false "uncovered". This fails safe (a false red, never a false green). No change needed now; extend the matcher if such a glob is ever added.
3. nit, .scratch/audit-2026-11-05/issues/10-images-notes-display-vault-under-kokobrain-vaults.md: the three manual in-app checks (marked not met above) are still open for the owner. Fix: the owner runs them in the app after delivery. Tauri enforces the scope at fetch time, so no unit test can cover them.

## Other checks

- Scope: the diff touches only tauri.conf.json (two added scope entries), the new test, the help README's file:// list (which mirrors the asset scope, so the new root belongs there) and the workflow's own discovery.md. No existing entry was narrowed, matching the Issue's 2026-11-06 note and the plan review. No scope creep.
- The test's dot-segment rule matches `requireLiteralLeadingDot` in node_modules/@tauri-apps/cli/config.schema.json:1399-1400 ("Defaults to `true` on Unix systems"). The asset scope and the fs scope use the same FsScope shape, so modelling it is correct for both.
- No layer-baseline or composition-root change. The test file uses tabs. No other test reads tauri.conf.json, the asset scope or the README list (searched src/tests, e2e, src-tauri/tests).
- The test verdict rests on: src/tests/lib/architecture/fs-capabilities.test.ts, run green on the branch and red against main's tauri.conf.json. The diff changes no other code with test files.

## Resolution

1. Fixed (verification, no code change). `cargo fetch` still stalled on static.crates.io, but curl reached it, so the eight missing crates (rusqlite 0.41.1, sentry* 0.49.5) were downloaded with curl, checked against the Cargo.lock sha256 checksums (all matched) and placed in the local cargo cache. `cargo test --offline --manifest-path src-tauri/Cargo.toml` from the worktree root then passed: 1314 passed, 0 failed, exit 0. No ts-rs binding changed.
2. Rejected, as the finding itself says: the matcher fails safe and no current glob uses `*`, `?` or `[...]`.
3. Left for the owner: the three manual in-app checks need the running app; no test can cover the asset-protocol fetch.
