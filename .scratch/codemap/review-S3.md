# Review S3: rust.mjs, IPC, events, DTOs, cross-language lines

Scope: uncommitted diff on `feat/codemap` (`scripts/codemap/rust.mjs` new, `render.mjs`, `ts.mjs`, `codemap.test.ts`), spec section 15 steps 5 and 6, tests 15 to 22 and 30.

Checks run:
- `pnpm vitest run src/tests/lib/architecture/codemap.test.ts`: 93 passed.
- `pnpm check`: 0 errors.
- Real-repo probes in `/tmp/codemap-review-S3/` (`probe.mjs` loads every `src-tauri/src` and `src-tauri/tests` file plus the TS tree, then runs one check script).
- Matches the spec on the real repo: 72 handlers = 72 `CommandMap` = 72 `cmd` items, no `!` flags; callers `-` exactly for `capture_clipboard_now`, `open_composer`, `scan_vault_v2`; 116 production `call` sites (an independent regex count also gives 116 in 44 files); 9 events, each with at least one emit and one listen; `lib.rs:289` multi-line `emit_to` counted; 51 DTOs, none `!no-ts`; `UpdatePlan::is_noop` at `update_plan.rs:31`; `VaultIndex::update_entry` callers at `commands/vault.rs:343` and `:1340` (`lexical-method`); `vault.rs:370` `update_note_in_index` -> `update_note_in_index_inner` `call`; no `debug.rs -> commands/mod.rs` edge; 19 Rust disk writes, including `utils/fs.rs:27 rust-fs.write in write_atomic`; 30 file docs; brace depth balanced in every file's code text; every item, local, call, emit and fx line points at a line containing its name.
- Determinism: `analyzeRust`, `rustEmits`, `joinCommands`, `joinEvents` and `joinDtos` give identical JSON when every input Map and array is reversed. No `localeCompare`, `Date` or `os.` in `scripts/codemap/`.
- Style: tabs only, JSDoc on every new export, no narration, no em dashes.

## Findings

1. **major: union types in `args`/`result`/`payload` break the ` | ` field separator of `ipc/*`.**
   Evidence: `scripts/codemap/render.mjs` `ipcLine` (the `args … -> …` field) inserts `c.contract.result` as is; `field()` is applied only to `doc`. Probe `pipe.mjs` on the real repo finds 7 fields instead of 6 in:
   `ipc ipc:rename_note | args from,to -> UpdateResult | null | rust src-tauri/src/commands/vault.rs:1392 …`, and the same for `ipc:read_mod_data` (`number[] | null`) and `ipc:check_for_update_on_channel` (`UpdateMetadata | null`). Spec section 6 says ` | ` is the field separator in these files, and test 32 forbids `|` outside the separators and the `| doc` suffix. A reader splitting on ` | ` reads `null` as a field. `eventLine` `payload` and any `args` type reference have the same hole.
   Fix: run every copied type text (`args`, `result`, `payload`) through `field()`, or render unions without spaces, and add a fixture member `result: X | null` to the IPC join test that asserts the exact line.

2. **major: every `generate_handler!` entry is a `lexical` call of its command, so all 72 command cards get a `by … <- src-tauri/src/lib.rs:<n> in run lexical` line and the graph gets 72 call edges `run -> cmd`.**
   Evidence: `rust.mjs:795-806` (inline paths) adds a `row` for every bare top-module path in `lib.rs` that names an item. It does not check for a following `(` and does not skip the `generate_handler![…]` range. Probe `lib.mjs`: `users.get('src-tauri/src/commands/vault.rs:get_all_tags_v2')` = `[{file: lib.rs, line: 351, enclosing: run, kind: lexical}]`; "cmds with lib.rs by 72". F8 already records this site as `reg`. F18 assumes a `cmd` has no `use` importer and shows TS callers so it does not read as unused. As implemented, `q callers ipc-cmd-fn`, `q impact` and `q sink --up` (test 48: `rust-fs.write` -> `cmd` -> TS caller) also climb into `lib.rs:run`.
   Fix: blank the `generate_handler![…]` bracket range in the body used for call scans (keep the inline-path edge), or count an inline path as a call only when `(` or `::<ident>(` follows. Add a test asserting that a handler entry makes no `calls` row and no `by` line.

3. **major: DTO `used-by` leaves out files that re-export the DTO, so it misses the barrel and alias consumers the spec names.**
   Evidence: `rust.mjs` `joinDtos` (around lines 1097-1111) counts only `resolved` binding rows. `export type { … } from` statements produce no rows: probe `dto2.mjs` gives 0 resolved rows for `src/lib/types/vault-v2.types.ts`, which re-exports `TagAggregate as TagAggregateV2` (line 32). The real line is `dto dto:TagAggregate | … | used-by src/lib/contracts(1) | …` (only `commands.ts`). Spec section 6 gives `used-by src/lib/contracts(2) src/lib/types(1)`, and F10 says "through `contracts/index.ts` and aliases (`TagAggregate as TagAggregateV2`)". The fixture in the DTO test re-exports with `export *` only, so the test cannot catch this.
   Fix: also count, per DTO, the non-generated files whose re-export statements resolve to `dto:<Name>` (from the F3 re-export table), and extend test 18 with an `export type { X as XV2 } from '#lib/contracts/index.js'` file under `src/lib/types` that must appear in `used-by`.

4. **minor: cfg-gated twin fns give duplicate Rust symbol IDs.**
   Evidence: probe `render.mjs` "DUPITEM": `src-tauri/src/lib.rs` `apply_move_to_active_space`; `src-tauri/src/quick_capture/source.rs` `record_prev_frontmost`, `activate_prev_app`, `frontmost_bundle_id`, `bundle_id_for_pid`, `browser_active_tab_chrome`, `safari_active_tab`; `src-tauri/src/utils/fs.rs` `keep_created_time` (each appears twice under `#[cfg(target_os…)]` / `#[cfg(not(…))]`). `namesOf` (`rust.mjs:669-674`) keeps the last one and `enclosingAt` the first, so `by`/`call` target the second definition while enclosing names the first. Two `sym` lines with one ID will break the "no duplicates" placement check (test 42 style) and the CLI's exact lookup.
   Fix: keep one item per ID (the first by line) and mark it (for example `+cfg 1`), or add the cfg predicate to the second item. Add a lexer test with two cfg-gated `pub fn f`.

5. **minor: enclosing names inside trait-impl fns are not model IDs.**
   Evidence: `extractRustFile` pushes trait-impl fns into `fns` (`rust.mjs:541`) but not into items or locals. Probe: 5 calls print enclosing names with no symbol: `commands/vault.rs:CmdTrace::drop`, `quick_capture/clipboard.rs:SystemClipboard::default`, `SystemClipboard::read`, `semantic/qos.rs:UtilityQosGuard::drop`, `UtilityQosThreadManager::create`. Section 4 reads `in <name>` as `<file>:<name>`, so `q calls src-tauri/src/semantic/qos.rs:UtilityQosGuard::drop` cannot resolve.
   Fix: either emit trait-impl fns as `local` lines (`Type::name`), so the ID exists, or print the impl's type (`in UtilityQosGuard`) or `(module)`, and list the choice as a blind spot.

6. **minor: `thread::spawn(` through `use std::thread` is missed, while bare `thread::sleep(` is matched.**
   Evidence: `rust.mjs:903` needs `std::thread::spawn` written out, but `rust.mjs:901` accepts `thread::sleep` with any prefix. Production miss: `src-tauri/src/vault/watcher.rs:287` `let bridge = thread::spawn(move || {` (the file has `use std::thread::{self, JoinHandle};` at line 29). Spec F15 lists the written-out form only, so this is a spec gap, but the asymmetry hides the watcher bridge thread from `effects/spawn.md`.
   Fix: accept `thread::spawn(` when `std::thread` is imported as `thread` (the same import check already used for `fs`), and add the case to test 30.

7. **minor: a plain `//` comment between the `///` run and the attributes drops the doc.**
   Evidence: `docAbove` (`rust.mjs:516-524`) breaks on any line above the statement start that is not a doc line. Real items with no doc for this reason: `commands/vault.rs:956` `write_task_text` (a `cmd`, whose 7-line `///` doc is followed by `// The camelCase args are the IPC contract …` and then `#[allow]`/`#[tauri::command]`), and `db/semantic_repo.rs:99` `insert_chunk`. F12 says "contiguous `///` run above, skipping attribute runs". A strict reading agrees with the code, but the doc is lost on a command card.
   Fix: skip plain `//` comment lines (blank in `code`, not blank in `text`) the same way as attributes, and add a fixture.

8. **minor: glob imports bring the target's private fns into scope, do not yield to the file's own items, and count `fn name(` definitions as calls.**
   Evidence: `rust.mjs:751` copies every name of `namesOf(target)`, locals included. The items regex at `:779` has no `(?<!\bfn\s+)` guard. Probe `glob2.mjs` (`b.rs`: `use crate::a::*; fn helper() {} pub fn go() { helper(); }`, with a private `helper` in `a.rs`) gives `b.rs:2 in helper -> a.rs:helper lexical` (the definition itself), plus `b.rs:3 -> a.rs:helper lexical` alongside `b.rs:3 -> b.rs:helper call`. Today production has no glob `use`; the two integration tests (`history_test.rs:6`, `todoist_state_test.rs:6`) do.
   Fix: for globs, take only `items` (pub), skip names the file defines itself, and add the `fn ` lookbehind to the imported-name regex.

9. **minor: test gaps; these tests pass on broken code.**
   - F16 uniqueness: no fixture defines an underscore method name twice, so deleting `fnCounts.get(name) === 1` (`rust.mjs:722`) keeps test 21 green.
   - `claimed` (`rust.mjs:812, 829`): no fixture has `self.some_name(` with an underscore unique method, so a `self.x_y(` double row (`call` plus `lexical-method`) is untested.
   - Test 16: no `src/routes` key site, and no case where `<a>.rs` is missing and `<a>/mod.rs` holds the command (the fixture only has `a/b/mod.rs` with no `a/b.rs`, so the "`.rs` exists but lacks the fn, then stop" branch at `rust.mjs:1022` is not exercised).
   - Test 17: no emit through a qualified `events::X_EVENT` or a `use crate::events::X_EVENT;` single-line import.
   Fix: add these fixtures.

10. **minor: smaller extraction edge cases.**
    - `pub fn r#type()` is read as name `r` (`ITEM_RE` at `rust.mjs:362`).
    - `pub(self) fn` becomes an item of kind `fn(self)` although it is private.
    - `pub(in crate::a) fn` becomes kind `fn(in)`.
    None occurs in the repo today (probe `edge.mjs`; grep finds no `pub(in`/`pub(self)`).
    Fix: accept `r#` in `ITEM_RE`, treat `pub(self)` as a local, and print `(in <path>)` or `(crate)`.

11. **minor: spec counts and a JSDoc are stale.**
    - Spec F15 says 54 `rust-db.execute` sites. The implementation finds 45, which is correct: probe `db.mjs` shows the other 9 (`db/schema.rs:319-401`, `db/semantic_repo.rs:799, 832`) are inside `#[cfg(test)]` modules. Update the spec number so stage 9 does not chase it.
    - `blankRange` JSDoc (`rust.mjs:121`) says "`text` with every character … replaced", but the function mutates `chars` in place and returns nothing. Reword it.

Not checked: card assembly and caps (the 12-line `ipc-call`/`ev` cap per Rust card, the `more` hints on real cards) belong to stage 9 and were not exercised. Spec test 40 line pointers were checked for Rust items, calls, emits and fx only, not for TS `call`/`on` sites.

## Resolution

1. fixed: `ipcLine` runs `args` and `result`, `eventLine` runs `payload` through `field()`, so `X | null` prints `X / null`; the IPC fixture has `result: UpdateResult | null` and the events fixture `number | null`, both asserted as exact lines.
2. fixed: `analyzeRust` blanks the `generate_handler![…]` list of `lib.rs` for every call scan and skips inline-path rows inside it, keeping the edge; new test asserts the edge exists and there are no call rows and no `by` users for the handler entries (real repo: 0 commands with a `lib.rs` `by`, 83 `lib.rs` edges kept).
3. fixed: new `resolveReexports` in `ts.mjs` resolves named `export { X as Y } from` entries through F3 and `export * from` a generated file to `dto:<T>`; `joinDtos` takes these rows and counts them in `used-by`. Test 18 fixture now has a named barrel and an alias file under `src/lib/types` (real repo: `dto:TagAggregate` used-by `commands.ts`, `index.ts`, `types/vault-v2.types.ts`).
4. fixed: `extractRustFile` keeps the first definition of a name (an item before a local); new test with cfg-gated `pub fn` twins, private twins and a pub/private pair. Rejected the `+cfg` mark: no consumer needs it, and the first definition carries the doc in every real case (real repo: 0 duplicate IDs).
5. fixed: trait impl fns are `local` lines named `Type::name`, so every enclosing name is a model ID; new test with `impl Drop for Guard` (real repo: 0 call rows with an enclosing that is not an ID). Spec F12 and test 19 updated.
6. fixed: `thread::spawn(` counts when `std::thread` is imported as `thread`; `use crate::thread` does not. Added to test 30 (real repo: `vault/watcher.rs:287` now listed). Spec F15 updated.
7. fixed: `docAbove` skips plain `//` comment lines (blank in code, not blank in text); new fixture (real repo: `write_task_text` has its doc). Spec F12 updated.
8. fixed: a glob takes only the target's pub items and skips names the file defines; the imported-name regex has the `fn ` lookbehind; new test covering all three.
9. fixed: fixtures added for a twice-defined underscore method (`dup_name`, no `lexical-method`), `self.update_entry(` (one `call` row, no `lexical-method`), a `src/routes` key site, `x/y.rs` without the fn next to `x/y/mod.rs` with it (`!no-rust-fn`), and emits through `crate::events::Y_EVENT` and `use crate::events::X_EVENT;`. The first two and the emit cases already passed on the code; they now guard it.
10. fixed: `ITEM_RE` keeps `r#` names, `pub(self)` is a local, `pub(in path)` is kind `(crate)`; new test.
11. fixed: spec F15 and section 2 give 45 db sites (and 4 spawns, after item 6); `blankRange` JSDoc says it mutates `chars` in place.
