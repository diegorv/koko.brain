VERDICT: APPROVED

## Acceptance criteria

- [met] `pnpm check` fails when a CommandMap key has no handler or a handler returns the wrong shape (prove it by removing one handler) — `tsconfig.json:23` now includes `e2e/mocks`, and `HANDLERS` at `e2e/mocks/tauri-core.ts:394-397` is `{ [K in keyof CommandMap]: (args: CommandArgs<K>) => CommandResult<K> }`. I ran two probes myself and reverted both (worktree clean after). Probe 1 deleted the `remove_semantic_file:` entry: `pnpm check` exit 1, "Property 'remove_semantic_file' is missing ... but required in type 'Handlers'". Probe 2 dropped the return annotation of `handleBuildSemanticIndex` and returned `{ totalChunks, totalSources }`: exit 1, "Type '() => { totalChunks: number; totalSources: number; }' is not assignable to type '(args: { vaultPath: string; }) => SemanticStats'". No CommandMap result is `void`/`unknown` (`src/lib/contracts/commands.ts`), so no entry escapes the result check. All 12 commands the Issue lists are present, and `search_vault` is gone.
- [met] Issue 36's unknown-command allowlist is empty, so its console fixture fails on any unknown command — `e2e/fixtures/console-guard.ts:21` is `ALLOWED_UNKNOWN_COMMANDS: Record<string, string> = {}`. `violation()` returns a failure for any `[e2e mock] Unknown invoke command:` line whose name is not in the map, and the auto fixture throws at teardown. The only raw `invoke(` left in `src/lib` and `src/routes` is `plugin:updater|download_and_install`. It runs only once `check_for_update_on_channel` reports an update, and the mock returns `null` for that.

## Findings

1. nit — e2e/mocks/tauri-core.ts:394 — AC 1 rests on manual probes. Nothing committed fails when someone loosens `Handlers` back to `Record<string, ...>`. Optional fix: add a small `// @ts-expect-error` assertion in e2e/mocks (for example a `Handlers` value with one key omitted), so `pnpm check` keeps proving exhaustiveness. Not a blocker, because the Issue asks for a probe.
2. nit — e2e/specs/*.spec.ts — the specs and fixtures are still outside the typecheck. For example, `window.__e2e.events.emit('vault-index-updated', {...})` in event-calendar*.spec.ts is not checked against the new EventMap-typed `emit`. The Issue scopes the typecheck to `e2e/mocks` only, so this is a possible follow-up, not a defect here.

## Other checks

- Typecheck: `pnpm check` at HEAD, exit 0, 212 files, 0 errors.
- vitest (my test verdict rests on these): src/tests/scripts/commit-msg-fix-test.test.ts, src/tests/lib/lib-specifier-convention.test.ts, src/tests/help/queryjs-globals.test.ts, src/tests/lib/features/rail-shell/RailNoteList.test.ts and src/tests/lib/contracts/ (ipc-parity and the other contract tests): 8 files, 129/129 passed, exit 0. These are the vitest files that mention tsconfig, the e2e paths or the contracts the mock now imports. The full `pnpm vitest run && pnpm build` is deliver's to run.
- E2E: `bash scripts/e2e.sh e2e/specs/rail-shell.spec.ts e2e/specs/note-action-bar.spec.ts e2e/specs/search.spec.ts --retries=0`: 44 passed, exit 0, no "Unknown invoke" lines. That covers the changed spec plus the two most exposed to the `organized` and search changes. I did not re-run the full E2E suite.
- `organized` fix (e2e/mocks/vault-index.ts:244) matches Rust `src-tauri/src/vault/entry.rs:246-249`: `.and_then(as_bool).unwrap_or(true)`. Rust's test at entry.rs:846 asserts the `true` default. The mock parses frontmatter with `yaml`, so `_organized: false` arrives as a boolean. The rail-shell reseed (`RAIL_FILES`) makes the Inbox assertions match real-app behavior. Before, they passed only because the mock left the field `undefined`.
- `virtualFS.searchVault`, `VaultSearchMatch` and `getFileName` were removed because removing `search_vault` left them unused. `grep` finds no other callers in src/ or e2e/. This is cleanup the change requires, not scope creep.
- `get_semantic_file_status` now returns a non-null "model not loaded" status. That matches CommandMap (a non-nullable `SemanticFileStatus`). `SemanticIndexStatus.svelte:58` renders only when `semanticSearchEnabled` is on.
- No layer-baseline entry, BASELINE_SIZE change or composition root. src-tauri/ is unchanged, so cargo is not needed.

## Resolution

1. Fixed. `e2e/mocks/tauri-core.ts` now carries two `@ts-expect-error` guards after `HANDLERS`: a copy of `HANDLERS` without `remove_semantic_file` assigned to `Handlers`, and a `get_semantic_stats` handler returning a partial `SemanticStats`. Probe: loosening `Handlers` to `Record<string, (args: any) => unknown>` makes `pnpm check` exit 1 with two "Unused '@ts-expect-error' directive" errors; restored, it exits 0.
2. Rejected for this Issue. The Issue scopes the typecheck to `e2e/mocks`; bringing `e2e/specs` and `e2e/fixtures` under `pnpm check` is a separate follow-up.
