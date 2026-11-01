VERDICT: APPROVED

# Issue 10 review

Reviewed `git diff main...HEAD` (merge-base 17a6fbb9, HEAD 6c74eedb) in the worktree. No spec.md exists for this feature; the Issue and ADR-0003 (contracts is a leaf layer) are the reference.

## Acceptance criteria

- [met] The parity test comes first. It fails while COMMAND_ARGS is empty, and passes once the keys equal the 57 generate_handler! entries. Renaming a Rust param in a scratch copy makes it fail — Commit 2b5407f1 (test + empty skeleton) precedes 126b52e2. Probe: restoring 2b5407f1's commands.ts makes `ipc-parity.test.ts` fail 3 of 4. At HEAD it passes 4/4, and `src-tauri/src/lib.rs:292-350` lists 57 entries. Probe: renaming `create_folder(path)` to `dir_path` in `commands/vault.rs:871` fails 2 tests. All probes were reverted and the worktree is clean.
- [met] The parity test checks optionality: Rust `Option<T>` params (search_fts, search_semantic, search_hybrid, check_for_update_on_channel) carry `?`, and no other params do — `COMMAND_ARGS` marks `?` only on those four commands (`commands.ts`). The test compares the `name?` lists both ways against the parsed Rust params. Probe: making `get_snapshot_content`'s `snapshot_id` an `Option<i64>` fails the optionality and type tests.
- [met] Type tests: `call('get_tasks_in_section_v2', {})` and `call('scan_vault', { path })` (missing sortBy) are `@ts-expect-error` — `src/tests/lib/contracts/ipc.test.ts:43-53`. tsconfig includes `src`, so `pnpm check` type-checks the tests. Probe: adding `sortBy` to the scan_vault line makes `pnpm check` exit 1 with "Unused '@ts-expect-error' directive" at 47:4.
- [met] No `invoke(` import from `@tauri-apps/api/core` remains in src/lib/core, outside the updater exception — `grep -rn "tauri-apps/api/core" src/lib/core` finds only `UpdateSection.svelte:5` (the `plugin:updater|download_and_install` exception, commented at :170) and two dynamic imports in `live-preview/widgets.ts:165,529`, which take only `convertFileSrc`. `src/tests/lib/architecture/core-ipc.test.ts` guards this.
- [met] A test proves `call('cmd')` reaches `invoke` with exactly one argument — `ipc.test.ts:18-23` asserts that `mock.calls` equals `[['close_vault_db']]` and that the call's length is 1. `ipc.ts:24` branches on `args.length === 0`.
- [met] Changing a Rust command's return type (dry run on a scratch copy) fails the parity test — Probe: changing `get_snapshot_content`'s return type to `Result<u64, String>` (`commands/history.rs:84`) fails "CommandMap arg and result types match the Rust signatures". Reverted.
- [met] The existing vitest invoke mocks still assert `toHaveBeenCalledWith('cmd', {...})` unchanged — The diff adds three test files and modifies no existing test file (`git diff main...HEAD --stat`). The 55 test files that import the touched core modules, plus `src/tests/lib/core/settings` and `src/tests/lib/core/status-bar`, pass: 72 files, 1763 tests.
- [met] The parity test fails loudly if it parses fewer commands than expected — `MIN_COMMANDS = 57` (`ipc-parity.test.ts:24`). It throws when `generate_handler!` or a handler's fn is missing, and throws on unmapped Rust types. Probe: deleting `commands::fonts::list_system_fonts` from lib.rs fails with "expected 56 to be greater than or equal to 57". Reverted.

## Checks run by the reviewer

- `pnpm check`: exit 0, 0 errors, 0 warnings, at HEAD 6c74eedb.
- `vitest run src/tests/lib/contracts src/tests/lib/architecture`: exit 0, 9 files, 80 tests.
- `vitest run` over the 55 test files that import a touched core module (list built by grep over `src/tests`), plus `src/tests/lib/core/settings` and `src/tests/lib/core/status-bar`: exit 0, 72 files, 1763 tests.
- Parity mutation probes: param rename, return-type change, Option toggle, dropped handler entry, the red-commit skeleton. Plus a `@ts-expect-error` probe. Each was reverted, and `git status` is clean.
- The full suite and `pnpm build` were not run. Deliver runs them, and the Issue's gate (`pnpm check` + `pnpm vitest run` + `pnpm build`) is completed there.
- Layer rules: the diff touches neither `layer-baseline.json`, `BASELINE_SIZE` nor the composition roots. `contracts/ipc.ts` imports only a package and `./commands.js`, so it stays a leaf (ADR-0003). `cargo test` is not needed: the diff changes nothing under `src-tauri/`.
- Main moved 5 commits past the merge-base. The only shared file is `src/lib/core/filesystem/fs.service.ts`, and its hunks (the import on line 6, and `renameItem`) do not overlap the branch's. No new `invoke` landed on main.

## Findings

1. minor — `src/tests/lib/architecture/core-ipc.test.ts:20`: `RAW_INVOKE_IMPORT` matches only static named imports. A dynamic `import('@tauri-apps/api/core').then(({ invoke }) => ...)` gets past the guard, and core already uses that form for `convertFileSrc` (`widgets.ts:165,529`). So would `import * as core from '@tauri-apps/api/core'`. Fix: also flag any `@tauri-apps/api/core` import, static or dynamic, whose bindings include `invoke` or which uses a namespace import. Alternatively, ban the bare token `invoke(` in core outside the allowlist.
2. nit — `src/lib/contracts/commands.ts:50,138,140`: the Issue's owner decision (delete `capture_clipboard_now`, `open_composer` and `scan_vault_v2`, or keep them) was settled by default: they are kept with a "Rust-only" JSDoc. That is a reasonable interim, and the CLAUDE.md line was fixed. Fix: deliver should surface it so the owner confirms or files the deletion.
3. nit — `src/tests/lib/contracts/ipc-parity.test.ts`: the Issue names `src/tests/contracts/ipc-parity.test.ts`, but the file lives under `src/tests/lib/contracts/`. That matches docs/TESTING.md (tests mirror `src/lib`) and Issue 09's placement, and discovery.md records it. Fix: none needed; deliver can note the path in the squash message.

## Resolution

1. Fixed. `core-ipc.test.ts` now uses `importsRawInvoke()`, which flags a static named import of `invoke`, a static namespace import, and any dynamic `import('@tauri-apps/api/core')` that is not destructured into bindings free of `invoke` (`const { a } = await import(...)` or `.then(({ a }) => ...)`). Shape tests cover both the flagged and the allowed forms, and the existing `convertFileSrc` dynamic imports in `widgets.ts` still pass. Probe: adding `invoke` to the `widgets.ts:529` destructure fails the guard; reverted.
2. Not changed in code. `capture_clipboard_now`, `open_composer` and `scan_vault_v2` stay in CommandMap with a Rust-only JSDoc; the deliver report surfaces it so the owner confirms or files the deletion.
3. No change. The parity test stays at `src/tests/lib/contracts/ipc-parity.test.ts` (tests mirror `src/lib`, per docs/TESTING.md); the squash message names the path.
