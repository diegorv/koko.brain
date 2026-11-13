VERDICT: APPROVED

## Acceptance criteria

- [met] The parity test comes first: the set of `pub const *_EVENT: &str` values equals Object.values(EVENT_NAMES), and src-tauri/src has no match for the multiline regex `\.emit\(\s*"`. It fails on today's tree (6 sites: lib.rs:266 on one line, logger.rs:52 and semantic.rs:422/447/584/729 split across lines) — `src/tests/lib/contracts/events-parity.test.ts` lands in 71903400, before the Rust move (e2b6e348). It compares the set of `pub const \w+_EVENT: &str = "..."` values across `src-tauri/src` with `Object.values(EVENT_NAMES)`, with a floor of 7 and a duplicates check, and asserts `/\.emit\(\s*"/g` finds nothing (JS `\s` matches newlines, so it is multiline). I probed both regexes against `git archive main src-tauri/src`: 4 consts and 2 literal emits (`lib.rs:259`, `lib.rs:275`), so it is red on main. The Issue's "6 sites" count is out of date because the semantic.rs literals had already been folded into a private const, and the logger emit had moved into the lib.rs closure (Issue 26). On the branch, all 7 consts are in `src-tauri/src/events.rs` and the test passes.
- [met] Type test: `on('vault-index-updated', (p) => p.version)` compiles, and `on('vault-index-update', ...)` is `@ts-expect-error` — `src/tests/lib/contracts/ipc.test.ts` 'types the payload from EventMap and rejects unknown names' has both lines, plus `@ts-expect-error` on `(p) => p.version` for `vault-files-changed`, and `expectTypeOf` pins for `menu:settings` (null) and `qc:open-composer` (string). `pnpm check` exits 0. To show the typecheck covers `src/tests` and that the expect-errors are real, I added a temporary file under `src/tests` with `on('vault-index-update', ...)`, `on('vault-index-updated', p => p.paths)` and `on('menu:settings', (p: string) => p)`. `pnpm check` reported 3 errors, and I deleted the file.
- [met] If the QC enum is done: a Rust test pins each kind's JSON against today's json! output — Not applicable. The 2026-11-01 owner triage moved the optional quick-capture enum to its own Issue, and the diff leaves `json!` alone (`EventMap['qc:capture-detected']` is `unknown`, and `quick-capture.service.ts` narrows it).

## Checks run by the reviewer

- `pnpm check`: exit 0, 0 errors, 0 warnings.
- Targeted vitest (`./node_modules/.bin/vitest run`), exit 0, 17 files, 277 tests passed: `src/tests/lib/contracts/*` (events-parity, ipc, ipc-parity, commands), `src/tests/lib/architecture/*` (layer-rules, core-ipc, ipc-mirrors, ...), `src/tests/lib/app/tauri-listeners.service.test.ts`, `src/tests/lib/core/filesystem/fs.watcher.test.ts`, `src/tests/lib/features/search/search.service.test.ts`, `src/tests/lib/utils/debug.test.ts`, `src/tests/lib/plugins/quick-capture/*`. My test verdict rests on these files.
- `cargo test --manifest-path src-tauri/Cargo.toml`: exit 0, 1200 passed, 0 failed. Afterwards the worktree was clean, so the ts-rs bindings did not change.
- Full suite (`pnpm vitest run && pnpm build`): not run. Deliver runs it.
- Payload types checked against the emit sites: every `VAULT_INDEX_UPDATED_EVENT` emit in `commands/vault.rs` (319, 406, 719, 863, 907, 1011, 1351) sends an `UpdateResult`. `QC_OPEN_COMPOSER_EVENT` sends `""` (`quick_capture/commands.rs:294`) and `MENU_SETTINGS_EVENT` sends `()` (`lib.rs:276`), which serializes to `null`. No `listen(` call is left in `src/lib` or `src/routes` outside `contracts/ipc.ts`. No layer-baseline entry or composition root was added, and `BASELINE_SIZE` is unchanged.
- `src/routes/composer/+page.svelte` has no unit test. Its change is a mechanical swap from `listen` to `on`, and the handler ignores the payload.

## Findings

1. nit — src-tauri/src/vault/mod.rs:26 — Removing the const left a blank line at EOF (`git diff main...HEAD --check` flags it). Fix: drop the trailing empty line.
2. nit — src/tests/lib/contracts/events-parity.test.ts:32 — The const scan covers all of `src-tauri/src`, so a future `pub const FOO_EVENT` declared outside `events.rs` would still pass, and nothing enforces the "single home" the Issue describes. Fix (optional): require every match to come from `events.rs`.
3. nit — src/tests/lib/contracts/events-parity.test.ts:41 — The literal-emit regex only catches `.emit(`. A literal passed to `.emit_to(` or `.emit_filter(` would bypass the registry. None exist today. Fix (optional): widen it to `/\.emit(?:_to|_filter)?\(\s*(?:[^,]+,\s*)?"/` or similar.
4. nit — src/lib/contracts/ipc.ts:33 — Nothing stops new code from calling raw `listen('...')`, the way `core-ipc.test.ts` does for `invoke`. The Issue does not ask for such a guard. Fix (optional, could be its own Issue): an architecture test that allows `listen` imports only in `contracts/ipc.ts`.
5. nit — src-tauri/src/commands/watcher.rs:1-2 — The `use crate::events` import comes after `use crate::utils`, out of alphabetical order (the same in `lib.rs:20`, between `quick_capture` imports). Cosmetic, and rustfmt is not gated.

## Resolution

1. Fixed: dropped the trailing blank line in `src-tauri/src/vault/mod.rs`; `git diff main...HEAD --check` is clean.
2. Fixed: `events-parity.test.ts` now records the file of every `pub const *_EVENT` match and asserts none comes from outside `events.rs`.
3. Fixed: the literal check now covers every Tauri 2.12 `Emitter` method (`emit`, `emit_str`, `emit_filter`, `emit_str_filter` with the event first; `emit_to`, `emit_str_to` with the event after the target). Probed against literal and const forms of each: literals match, const event names do not, including `emit_to("main", EV, p)`.
4. Rejected for this Issue: a guard that allows `listen` only in `contracts/ipc.ts` is outside the Issue's acceptance criteria and the reviewer marks it as its own Issue. Left for the main session to file.
5. Fixed: `use crate::events` / `use events::{...}` moved into alphabetical position in `commands/watcher.rs` and `lib.rs`.

Checks after the fixes: `pnpm check` exit 0 (0 errors); `pnpm vitest run src/tests/lib/contracts/events-parity.test.ts` exit 0 (2 passed); `cargo test --manifest-path src-tauri/Cargo.toml` exit 0 (1200 passed, 0 failed), no binding changes.
