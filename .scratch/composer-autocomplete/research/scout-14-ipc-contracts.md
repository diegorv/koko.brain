# Scout 14: IPC contracts (adding a command or event)

Read-only research at HEAD 130d6b8f7. No source edited, no test or build run. Library facts about Tauri ACL come from scout 05 (it read the cargo registry sources) and are marked "per scout 05" where I did not re-read them.

## Short answer

1. The composer needs no new IPC to get data. `get_all_tags_v2` and `get_all_vault_entries_v2` are zero-arg, read-only, already typed in the contract, and already callable from the composer webview (F1, F9). The composer route already imports `call` and `on` (`src/routes/composer/+page.svelte:4-5`).
2. A new command is a "Both" change (Rust + frontend) and touches 7 to 9 files, one of which is easy to miss: the E2E mock map (`e2e/mocks/tauri-core.ts`), because `pnpm check` type-checks `e2e/` (F6).
3. A new event is only needed if the composer must learn about index changes. It does not: `vault-index-updated` is already broadcast to every window (F8).
4. None of this touches an editor file. The only hazard for the editor is reusing, not changing, `getAliasesFromEntry`, which is private in `wikilink/completion.ts:27` (F10).

## Findings

### F1. The contract has four hand-maintained mirrors plus generated output

- `src/lib/contracts/commands.ts:45-236`: `CommandMap`, one `{ args; result }` entry per command. Header comment `:1-5` says it mirrors `generate_handler![...]` in `src-tauri/src/lib.rs`.
- `src/lib/contracts/commands.ts:258-331`: `COMMAND_ARGS` runtime manifest, camelCase arg names, `?` suffix on Rust `Option` params (example `todoist_read_log: ['vaultPath', 'limit?']` at `:271`). It ends with `as const satisfies { [K in keyof CommandMap]: readonly ArgKey<K>[] }` (`:331`), so a `CommandMap` key missing from `COMMAND_ARGS`, or an arg name not in `ArgKey`, fails `pnpm check`.
- `src/lib/contracts/ipc.ts:21-27`: `call(cmd, ...args)` is a typed `invoke`. A zero-arg command is called with exactly one argument to `invoke` (`:7-9`, `:26`). `call` needs no edit for a new command.
- `src/lib/contracts/index.ts:6-57`: hand-written barrel, one `export type` line per generated type. ts-rs writes no index (`index.ts:1-4`).
- `src/lib/contracts/generated/`: ts-rs output, never edited by hand; 51 files plus `serde_json/JsonValue.ts` today.
- `src/lib/contracts/events.ts:16-26` `EVENT_NAMES`, `:32-57` `EventMap`.

### F2. Exact files a new read-only command touches

For a command such as `composer_list_tags` returning an existing type or a primitive vec:

| # | File | Edit |
|---|------|------|
| 1 | `src-tauri/src/commands/vault.rs` (next to `get_all_tags_v2`, `:637-646`) or `src-tauri/src/quick_capture/commands.rs` | the `#[tauri::command] pub fn` |
| 2 | `src-tauri/src/lib.rs:325-398` | one line in `generate_handler![...]` |
| 3 | `src/lib/contracts/commands.ts:45-236` | `CommandMap` entry |
| 4 | `src/lib/contracts/commands.ts:258-331` | `COMMAND_ARGS` entry |
| 5 | `e2e/mocks/tauri-core.ts:472-565` | a handler in `HANDLERS` (F6) |
| 6 | a Rust test (F7) | |
| 7 | a frontend caller + test (F7) | |

Extra files only when the command returns a NEW struct (F3):

| # | File | Edit |
|---|------|------|
| 8 | the Rust struct | `#[derive(Serialize, ts_rs::TS)]`, `#[ts(export)]`, `#[serde(rename_all = "camelCase")]` |
| 9 | `src/lib/contracts/generated/<Name>.ts` | produced by `cargo test` from the repo root, committed |
| 10 | `src/lib/contracts/index.ts` | one `export type { Name } from './generated/Name.js'` line |
| 11 | `src/lib/contracts/commands.ts:7-39` | add the name to the `import type {...} from './index.js'` list |

No capability, `build.rs`, CSP or `tauri.conf.json` edit (F9).

Docs follow-up (not enforced per command): `docs/architecture/modules/src-tauri/src/commands.md` and `docs/architecture/modules/src-tauri/src/quick_capture.md:11,35` describe the command lists in prose; `docs/architecture/modules/src/lib/contracts.md` documents the gotchas. The architecture test only requires a doc per module folder and no stale key file (`src/tests/lib/architecture/architecture-map.test.ts:380-382`); it also requires more than 80% of registered commands to have a frontend caller (`:385-391`), which a command the composer calls satisfies.

### F3. The parity test constrains how the Rust signature must be written

`src/tests/lib/contracts/ipc-parity.test.ts` parses Rust source with regexes, so the signature shape matters:

- Registry: it reads `generate_handler![...]` from `lib.rs` (`:85-90`), maps `quick_capture::commands::x` to `src-tauri/src/quick_capture/commands.rs` (`:93-97`), and finds the fn with `#[tauri::command[^\]]*]\s*pub\s+(?:async\s+)?fn <name>` (`:98-102`). So `#[tauri::command]` must be directly followed by `pub fn`, with no second attribute or doc comment between them (doc comments go above the attribute, as every existing command does). The fn must be `pub` and defined in the file the path names.
- Injected params skipped: `AppHandle`, `State`, `Webview` (`:27`, `:112`). `tauri::State<'_, VaultIndexState>` is skipped.
- Arg types allowed: `String`, `bool`, `u8`, `i64`, `u32`, `u64`, `usize`, `f32`, `()` (`:30-40`), `Vec<..>`, `Option<..>`, and the bare name of a generated type (`:137-147`). Anything else throws `unmapped Rust type` (so `i32`, `f64`, `HashMap`, tuples and path-qualified type names such as `crate::x::Foo` fail). Import the DTO and write its bare name.
- `Option<T>` param becomes an optional arg (`T | null` for a result) (`:113`, `:141`); the TS entry must use `?` and `COMMAND_ARGS` the `?` suffix.
- `Result<T, String>` is unwrapped to `T` (`:119`).
- Comparison is on normalized text (`:154`), so `string[]` must be written exactly as `Vec<String>` maps (`rustToTs`, `:140`).
- Floors: `MIN_COMMANDS = 57` (`:24`); `lib.rs` lists 72 today (`lib.rs:326-397`). A new command needs no floor change; only a removal would.
- Three assertions must hold: names equal (`:209-211`), arg names and optionality equal (`:213-222`), arg and result types equal (`:224-249`).

### F4. ts-rs export rules

- Version `ts-rs = "=12.0.1"` with feature `serde-json-impl` (`src-tauri/Cargo.toml:38`).
- The env that drives it is in the ROOT `.cargo/config.toml` (not `src-tauri/.cargo/`, which only holds `audit.toml`): `TS_RS_EXPORT_DIR = src/lib/contracts/generated` with `relative = true`, `TS_RS_LARGE_INT = "number"`, `TS_RS_IMPORT_EXTENSION = "js"` (`.cargo/config.toml`, the `[env]` block). `docs/DEV-ENVIRONMENT.md:64-70` says to run cargo from the checkout root, because cargo reads config from the cwd and not from `--manifest-path`.
- `#[ts(export)]` makes `cargo test` write `<Name>.ts`. Doc comments on the struct and fields are emitted as JSDoc, so changing a doc comment also changes the committed binding (`CLAUDE.md` rule 6, IPC DTO line). Example output: `src/lib/contracts/generated/ComposerCaptureResult.ts`.
- Existing DTO pattern for a small struct: `src-tauri/src/quick_capture/commands.rs:490-499` (`Serialize, Clone, Debug, PartialEq, ts_rs::TS`, `#[ts(export)]`, `#[serde(rename_all = "camelCase")]`).
- `Option<T>` fields: ts-rs emits `T | null` unless the field has `#[ts(optional)]` plus `skip_serializing_if` (examples `src-tauri/src/vault/task.rs:38`, `src-tauri/src/commands/history.rs:22`). `src-tauri/tests/ipc_contracts_test.rs:59-71` pins that for `FileNode` and `TaskMetadata`.
- CI regenerates and diffs: `.github/workflows/ci.yml:118-132` runs `rm -rf src/lib/contracts/generated`, `cargo test`, then fails if `git status --porcelain -- src/lib/contracts/generated` is non-empty. A stale or missing binding fails the Rust job. The Rust path filter includes `src/lib/contracts/generated/**` (`ci.yml:55`).
- `ipc-mirrors.test.ts` (`src/tests/lib/architecture/ipc-mirrors.test.ts:12-45`) forbids any file under `src/lib` outside `contracts/` from declaring `interface X` or `type X =` under a generated name, `<Generated>V2`, or a renamed mirror. A hand-written composer type must not reuse a generated name (a re-export is allowed).
- `contracts.md` also says the same barrel check fails while `index.ts` misses a generated type (`docs/architecture/modules/src/lib/contracts.md`, Gotchas).

### F5. Event registry rules (only if a new event is wanted)

- Rust registry `src-tauri/src/events.rs:6-38`: one `pub const X_EVENT: &str = "..."` per event; 9 today.
- Edits for a new event: (1) the const in `events.rs`, (2) `EVENT_NAMES` in `events.ts:16-26` keyed by the const name minus `_EVENT`, (3) `EventMap` in `events.ts:32-57`, (4) an emit site that names the const, (5) a payload type in `index.ts` if it is a new `#[ts(export)]` struct.
- `src/tests/lib/contracts/events-parity.test.ts` enforces: the value sets of `events.rs` and `EVENT_NAMES` are equal (`:116-123`); every const in `events.rs` is a `&str` the parser read (`:120`); values are unique (`:121`); `MIN_EVENTS = 7` (`:21`, currently 9); every `emit`, `emit_to`, `emit_str`, `emit_filter` call names a registry const (`:125-127`, regexes `:46-59`), so a string literal or a const declared outside `events.rs` fails; a binding that shadows a registry name outside `events.rs` also fails.
- `src/tests/lib/contracts/ipc.test.ts:174-177` asserts `keyof EventMap` equals `EventName`, so `EventMap` and `EVENT_NAMES` must change together.
- Targeting: `app.emit` broadcasts to every window (`quick_capture/commands.rs:359,406,484,510`; `commands/vault.rs:373` and the other `VAULT_INDEX_UPDATED_EVENT` sites). `app.emit_to(MAIN_WINDOW_LABEL, ...)` targets one window (`lib.rs:168`) and the parity test accepts that shape (`events-parity.test.ts:138,141`). `COMPOSER_WINDOW_LABEL` exists at `quick_capture/commands.rs:31`.
- Frontend listening must go through `on()` (`ipc.ts:84-89`). Raw `listen` outside `ipc.ts` is forbidden by `src/tests/lib/architecture/event-listen.test.ts` (per `contracts.md` Gotchas; I did not open the test). The composer already uses `on` (`composer/+page.svelte:5`, `:177-193` per scout 05).

### F6. Hidden extra file: the E2E mock map

- `e2e/mocks/tauri-core.ts:470` declares `type Handlers = { [K in keyof CommandMap]: (args: CommandArgs<K>) => CommandResult<K> }` and `:472` `const HANDLERS: Handlers = {...}`. Every `CommandMap` key must have a handler, and the compile-time guard at `:571-577` relies on that.
- `tsconfig.json` includes `e2e` (`"include": ["src", "vite.config.js", "e2e"]`, `tsconfig.json:23`), so adding a command to `CommandMap` without a handler fails `pnpm check`.
- Quick-capture commands use `handleQuickCaptureNoop` (`tauri-core.ts:459-465`, `:556-561`); a read command should return `[]` or the existing tags/entries handler result (`get_all_tags_v2: handleGetAllTagsV2` at `:491`). Handler return types must match `CommandResult<K>`.
- Not in the first scan of the earlier scouts' listing, so worth stating: the parity test does not cover e2e, only `pnpm check` does.

### F7. Tests a new command needs (project rules)

- Contract tests need no edit: `ipc-parity.test.ts` and `ipc.test.ts` are generic over the maps and iterate every key. A compile-time check `COMMAND_ARGS` lists every arg key sits at `ipc.test.ts:113-119`.
- Rust: `core_tauri_free_test.rs:9,23-24` forbids `tauri::`, `AppHandle`, `Emitter` in `vault/`, `db/`, `search/`, `semantic/`, `utils/`. So pure projection logic belongs in `src-tauri/src/vault/` (for example a `VaultIndex` method beside `lookup_all_tags`, `vault/index.rs:1039-1065`), and the command in `commands/` or `quick_capture/` is a thin wrapper that takes `tauri::State<'_, VaultIndexState>` (`VaultIndexState = RwLock<VaultIndex>`, `vault/mod.rs:26`) and calls `.read()` with the `lock poisoned` message used by the siblings (`commands/vault.rs:563-573`, `:637-646`).
- Existing Rust test locations for that kind of code: `src-tauri/tests/vault_index_test.rs:1103-1124` (tag aggregates and camelCase keys), `src-tauri/tests/commands/vault_test.rs:655-700` (wire-shape tests), `src-tauri/tests/ipc_contracts_test.rs` (ts-rs shape assertions via `T::export_to_string(&Config::from_env())`, `:39-41`). Tests call `_inner` fns or index methods directly; none constructs a `tauri::State`.
- `CmdTrace` is private to `commands/vault.rs:33-55`. A command placed in `quick_capture/commands.rs` has no trace line; one placed in `commands/vault.rs` gets `CmdTrace::new("<name>")` like its neighbours (`:566`, `:640`) and is tracked by the invoke-queue report in `ipc.ts:35-39`.
- Frontend: the composer page test mocks the `ipc.js` boundary (`src/tests/routes/composer-page.test.ts:5-9`: `call` and `on` are `vi.fn`), which matches "mock only Tauri APIs".
- Gate for such a change per `CLAUDE.md` rule 6 ("Both"): `cargo test --manifest-path src-tauri/Cargo.toml` + `pnpm check` + `pnpm vitest run`, cargo from the repo root, one cargo at a time. A new `#[ts(export)]` struct also needs the generated file committed.

### F8. The composer can already observe index changes

- `vault-index-updated` (`events.rs:7`, `EventMap` `events.ts:33-34`, payload `UpdateResult`) is emitted with `app.emit` at ten sites in `commands/vault.rs` (for example `:373`, `:465`, `:757`, `:1752`), so it reaches the composer window with no new event.
- The composer already has `core:event:default` (listen/emit) through `core:default` (`src-tauri/capabilities/composer.json:7`, per scout 05 `F1`), so `on('vault-index-updated', ...)` needs no capability change.
- It cannot reproduce the main window's `vaultStore.indexReady` guard (`src/lib/app/editor-host.ts:96-99`). A composer-side refetch on `vault-index-updated` plus on `qc:open-composer` (`events.rs:34`) is the contract-only substitute. Whether that is fresh enough is scout 11's topic.

### F9. Why no capability or ACL edit is needed (per scout 05, partly re-checked)

- `src-tauri/build.rs:23` calls `tauri_build::build()` with no app manifest, so app commands are not ACL-gated (scout 05 F2 read `tauri-build-2.7.4/src/lib.rs:634-636` and `tauri-2.12.5/src/webview/mod.rs:2077-2101`; I did not re-read them).
- Repo-side evidence I did verify: `composer.json:7-9` lists only `core:default`, `core:window:allow-hide`, `core:window:allow-set-focus`, yet the composer invokes `dismiss_composer` and `submit_composer_capture` (`composer/+page.svelte:77,102`). No capability names them.
- Consequence: the `description` in `composer.json:4` ("no other IPC") is inaccurate for custom commands. A new command is reachable from the composer, and so is everything else in `generate_handler!` (including writers such as `create_note`, `rename_note`, `confirm_exit`). A new read-only command adds no new exposure class, but nothing enforces "read-only" either.
- `fs` plugin commands are the exception: the composer has no `fs:*` permission (`composer.json`), so `readTextFile` (the editor host's `readNote`, `src/lib/app/editor-host.ts:135-137`) would be denied there. Heading and block completion in `wikilink/completion.ts:14-21` rely on `readNote` through `host.resolveLink`, so they cannot work in the composer without a new note-reading command (not asked for; scope is tags and `[[` file names).

### F10. What a purpose-built command would duplicate

- Tag side: `EditorHost.listTags()` returns `VaultTag { name, count }` (`src/lib/core/markdown-editor/editor-host.ts:18-24,75`). The app host builds it by calling `get_all_tags_v2` and dropping `filePaths` (`src/lib/app/editor-host.ts:96-111`, the `.map(({ name, count }) => ({ name, count }))` at `:103`). `TagAggregate` carries `filePaths` for every tag (`generated/TagAggregate.ts`), so for a big vault the existing command ships every path of every tagged note to a popover that discards them. A slim command would return `Vec<{name, count}>`; that is a new `#[ts(export)]` struct (`VaultTag` is hand-written TS in the editor, not generated, so a new generated name must not collide with `VaultTag` in `src/lib` per F4's `ipc-mirrors` rule: `VaultTag` is not a generated name today, but a generated `VaultTag` would make `editor-host.ts:19` a forbidden mirror declaration and fail `ipc-mirrors.test.ts`, which would force an editor-file edit). Pick a different Rust struct name (for example `ComposerTag`).
- Link side: the editor takes `files` from the main window's file tree (`editor-host.ts:129`, per scout 05 F4) and `notes` (alias source) from `get_all_vault_entries_v2`. The alias reader `getAliasesFromEntry` is a private function in an editor file (`wikilink/completion.ts:27-35`); reading `aliases` / `alias` from `entry.frontmatter`. A Rust command that returns `{path, title, aliases}` would reimplement that rule in Rust and could drift from the editor. Returning `NoteEntry[]` unchanged (`get_all_vault_entries_v2`) lets the composer feed the same `NoteEntryV2` shape to the editor's own code with no duplicated rule.
- `files` includes non-markdown files from the tree (`file-entries.logic.ts:14-30`, all non-directory nodes); `NoteEntry` only has indexed notes. Parity with the editor for images and attachments would need `scan_vault` (`CommandMap` `commands.ts:76`, args `path`, `sortBy`), which needs the vault path. No existing command returns the open vault path to the composer (grep of `CommandMap` shows none). UNVERIFIED whether any path source reaches the composer (scout 06 covers cross-window data).

### F11. What not to change

- `src/lib/core/markdown-editor/**` needs no edit for any of the IPC work above. `ipc-mirrors.test.ts` and the barrel are outside the editor.
- No editor file imports the contracts barrel for these commands beyond what exists; adding a command or DTO does not change the editor bundle.

## Reuse opportunities

- Option A (zero new IPC): call `get_all_tags_v2` and `get_all_vault_entries_v2` from the composer with the existing `call`. No Rust, no `commands.ts`, no `index.ts`, no generated, no e2e mock edit (both already have e2e handlers, `tauri-core.ts:491` for tags; the entries handler exists for the main window). Frontend-only change plus tests.
- Option B (slim tags only): one new command + a new small DTO. Touches the 11 files in F2 minus the entries ones. Saves the `filePaths` payload. Costs one generated file, one barrel line, one e2e handler, Rust test.
- Option C (slim candidates): a command returning `{ path, title, aliases }`. Reimplements the alias rule (F10), so it is the one most likely to drift from the editor. Not recommended under the "reuse the editor's code" constraint.
- Existing `ComposerCaptureResult` (`generated/ComposerCaptureResult.ts`) and `qc:composer-capture-result` are a ready pattern for a tiny DTO + event if one is ever needed.

## Risks

1. Forgetting `e2e/mocks/tauri-core.ts` makes `pnpm check` fail (F6). Forgetting `index.ts` or the committed generated file fails `ipc-mirrors`/CI (F4).
2. Placing `#[tauri::command]` followed by another attribute or doc comment breaks the parity regex (F3).
3. Using an unsupported Rust type (`i32`, `f64`, tuple, `HashMap`, path-qualified name) in the signature throws in the parity test (F3).
4. Running cargo from a different root writes bindings into that root (F4, `DEV-ENVIRONMENT.md:66-70`).
5. Naming a new generated struct `VaultTag` or any name a `src/lib` file already declares forces an edit in an editor file (F10).
6. A "read-only" command is not enforceable: all commands are reachable from the composer (F9). Do not claim ACL protection in comments or docs.
7. `get_all_vault_entries_v2` clones every entry with tasks, snippets and frontmatter (`commands/vault.rs:562-573`); payload size is scout 15's topic.
8. Global `VaultIndexState` may hold the previous vault's index while a new vault loads (`src/lib/app/editor-host.ts:96-99`); the composer has no `indexReady` signal (F8).

## Open questions

1. Is a slim tags payload worth a new DTO and 6 extra edits, or is Option A enough? (Needs a measured vault size; scout 15.)
2. Does the composer need heading and block completion? It cannot read notes without a new command (F9). The task scope says tags and wikilinks only; I assumed `[[` file-name and alias completion, not `#heading` or `#^block`.
3. Where does the composer learn the vault path, if `scan_vault` is wanted for non-markdown link targets? (F10, UNVERIFIED.)
4. Should the new command, if any, live in `commands/vault.rs` (gets `CmdTrace`, sits beside `get_all_tags_v2`) or `quick_capture/commands.rs` (next to the other composer commands, and the module doc says quick capture owns composer commands, `docs/architecture/modules/src-tauri/src/quick_capture.md:7`)? Both satisfy the parity parser.
5. `src/tests/lib/architecture/event-listen.test.ts` content was not opened; the raw-`listen` ban is taken from `contracts.md`.
