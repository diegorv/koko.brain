# Scout 06: cross-window data paths for composer autocomplete

Read-only research at HEAD 130d6b8f7. Nothing was edited, built or tested. Items I could not confirm in code or library source are marked UNVERIFIED.

## 1. Key finding: the vault data already lives in a process-global Rust state

- `VaultIndexState` (an `RwLock<VaultIndex>`) is Tauri managed state, registered once for the whole process: `src-tauri/src/lib.rs:319`, type at `src-tauri/src/vault/mod.rs:26`. Any webview can reach it through a command, not only `main`.
- The two commands the editor host already uses for tags and aliases are plain `State<VaultIndexState>` readers with no window or vault-path argument:
  - `get_all_tags_v2` (`src-tauri/src/commands/vault.rs:637-646`), contract `src/lib/contracts/commands.ts:103`.
  - `get_all_vault_entries_v2` (`vault.rs:562-573`), contract `commands.ts:95`.
- The app host just wraps them: `listTags()` -> `get_all_tags_v2` (`src/lib/app/editor-host.ts:96-111, 195-197`), and `listLinkCandidates` -> file tree + `getVaultEntries()` (`editor-host.ts:128-133`, `src/lib/core/vault/vault-entries.service.ts:20-43`).
- Consequence: the composer needs no data relay for the index-backed part. It can `call('get_all_tags_v2')` and `call('get_all_vault_entries_v2')` itself, exactly as the main window does. The relay and snapshot options (b), (c) exist only to avoid touching Rust or capabilities, and they cost more than they save.

### Are app commands callable from the composer today?

- The composer already invokes `dismiss_composer` and `submit_composer_capture` (`src/routes/composer/+page.svelte:77, 102`) with only `core:default`, `core:window:allow-hide`, `core:window:allow-set-focus` granted (`src-tauri/capabilities/composer.json:6-10`).
- `build.rs` ends in plain `tauri_build::build()` (`src-tauri/build.rs`, last statement of `main`), with no `AppManifest` listing commands, and there is no `src-tauri/permissions/` dir (verified by `ls`). So app commands carry no per-command permission, and any window in a capability can invoke them.
- Inference: `get_all_tags_v2` and `get_all_vault_entries_v2` would also work from the composer with no capability change. UNVERIFIED against Tauri docs (not fetched; I am inferring from the composer already working). The `description` in `composer.json:4` says "no other IPC", which is intent, not enforcement. Update that text if option (a) is chosen.
- CSP `connect-src ipc: http://ipc.localhost` (`src-tauri/tauri.conf.json`, security block) covers every window; nothing window-specific.

## 2. What the editor completion needs, mapped to cross-window data

| Need | Editor source | Available from Rust to the composer? |
|---|---|---|
| Tag names + counts | `listTags()` (`editor-host.ts:195`) over `get_all_tags_v2` | Yes, `get_all_tags_v2`. Payload includes `filePaths` per tag (`src-tauri/src/vault/task.rs:160-168`), unused by completion. |
| File names for `[[` | `listLinkCandidates(...).files` from `fsStore.fileTree` flattened, minus `.view` (`editor-host.ts:78-85, 129`) | Only partly. The file tree is a main-window store. The index holds `.md`/`.markdown`/`.view` only (`vault.rs:317`, `src-tauri/src/vault/index.rs:95`). A non-Markdown link target (`[[photo.png]]`) is in the tree but not in the index. UNVERIFIED how many users link such files. |
| Aliases | `notes` = `getVaultEntries()` filtered by `isLinkTargetFile` (`editor-host.ts:131`); only read when query is non-empty (`wikilink/completion.ts:56`) | Yes, `get_all_vault_entries_v2`. |
| `resolveLink` / `readNote` for `[[Note#heading` and `[[Note#^block` | tree resolution cache + `readTextFile` (`editor-host.ts:124-137`; used at `wikilink/completion.ts:14-23, 121-130`) | Not without more work. `readTextFile` needs `plugin-fs` permission the composer lacks (`composer.json`). The Rust alternative `read_files_batch` needs a `vaultPath` arg (`commands.ts:155`), and the composer does not know the vault path. `resolveWikilinkCached` takes an optional `vaultRoot` (`wikilink-resolution.logic.ts:128`). No existing command returns the vault path (`db/mod.rs` exposes only `is_open()`, `:105`). See open questions. |

Fields the wikilink completion actually reads from a `NoteEntryV2`: `path` and `frontmatter.aliases|alias` only (`wikilink/completion.ts:26-34, 80-86`). Tags need `name` and `count` only (`editor-host.ts:102`).

## 3. The three options

### (a) Composer calls Rust commands directly

Variant a1: reuse `get_all_tags_v2` + `get_all_vault_entries_v2` as they are.
- Code to write: composer-side only. A small `EditorHost` for the composer built as `{ ...NOOP_HOST, listTags, listLinkCandidates }` (`NOOP_HOST` at `src/lib/core/markdown-editor/editor-host.ts:76-87`), mapping entries to `{ name, nameWithoutExt, path }` for `files`. Zero edits to editor files, zero Rust edits, zero contract edits. The `.logic.ts` helpers (`matchFilesForWikilink`, `rankTags`, `detectTagContext`) are pure and import only `utils/` and a type (`wikilink/completion.logic.ts:1-3`, `tag/completion.logic.ts:1`).
- Latency: one IPC per fetch, in-process, no window hop. The main window already pays this per index version (`vault-entries.service.ts:20-23`), so it is a proven path. Round trip is sub-ms to a few ms for the call itself; serialization cost scales with vault size. UNVERIFIED in numbers: no measurement in the repo that I found for composer-sized calls.
- Payload size: `get_all_vault_entries_v2` returns the full `NoteEntry` per note: frontmatter map, outgoing links, tags, tasks, headings, a snippet up to 280 bytes (`src-tauri/src/vault/entry.rs:24, 145-190`). It scales with the whole vault and carries far more than completion needs. `get_all_tags_v2` carries every tag's absolute `filePaths` (`task.rs:160-168`). Real byte counts UNVERIFIED (not measured).
- Staleness: reads the live index, so it is as fresh as the Rust index. No TS-side throttle applies, unlike the main window's version memo, which refreshes about 2 s after an isolated event and at most every 10 s during bursts (`vault-entries.service.ts:7-18`, `docs/agents/indexing-watcher-rules.md` rule 12). The composer reads the index directly, so it would be at least as fresh as the editor's memo.
- Main window hidden or destroyed: works. Nothing in the read path touches the main webview. This is the only option that survives the destroyed-window case from `.scratch/open-itens/issues/003-closing-main-window-never-leaves-windowless-app.md:5` (red button destroys the window, hidden composer keeps the process alive; hotkeys still fire because `dispatch_shortcut` gates only on `db::is_open()`, `src-tauri/src/lib.rs:45`). Caveat: the index only changes when something writes to it. Rust applies watcher events to the index through the main window's TS handler (`indexing-watcher-rules.md` rule 4), so with the main window gone the index freezes at its last state. Reads still succeed and return the stale-but-valid vault.
- Cache needed: no `vaultStore.vaultIndexVersion` in the composer. Simplest key: refetch on each `qc:open-composer` (`src/routes/composer/+page.svelte:178`, emitted at `quick_capture/commands.rs:406`), optionally also on `vault-index-updated` (`events.ts:17, 33`, app-wide broadcast; payload `UpdateResult`). Refetch-per-summon keeps staleness to "since the last summon".

Variant a2: add one lean Rust command, for example `list_completion_data`, returning `{ tags: [{name,count}], notes: [{path, aliases}] }`.
- Code to write: a Rust command in `commands/vault.rs` reading `VaultIndex` (pattern at `vault.rs:562-573`, `lookup_all_tags` at `index.rs:1039`); registration in `generate_handler!` (`lib.rs:~347-351`); a `CommandMap` entry plus a `COMMAND_ARGS` entry (`commands.ts:45, 258`); a `#[ts(export)]` DTO that regenerates `src/lib/contracts/generated/` (CLAUDE.md rule 6, an IPC DTO change is "Both" so all three test commands run). The parity test fails on any mismatch (`src/tests/lib/contracts/ipc-parity.test.ts`, with a command-count floor `MIN_COMMANDS = 57` at `:26`, so adding a command needs no floor edit, only a lower floor when removing). Rust tests live in `src-tauri/tests/`.
- Wins: payload drops to names and aliases (bytes per note instead of KB). Can also fold in non-Markdown file names if the command scans the tree, which a1 cannot. Risk: new Rust surface in the vault command module; it is read-only and does not touch any write path.
- Does not change editor behavior in either variant, since nothing in `src/lib/core/markdown-editor/` is edited.

### (b) Request/response relay through the main window

- Pattern to copy: `submit_composer_capture` emits `qc:capture-detected` with a `composerRequestId` (`quick_capture/commands.rs:468-486`); the main window handles it and calls `report_composer_capture_result` (`quick-capture.service.ts:91-98`), which re-emits `qc:composer-capture-result` (`commands.rs:504-515`); the composer waits on it with a 3000 ms timeout (`+page.svelte:10, 59-69, 188-190`).
- Code to write: a Rust request command + event const (`src-tauri/src/events.rs`, mirrored in `src/lib/contracts/events.ts:16-26` and checked by `events-parity.test.ts`), a Rust result command + DTO, an `EventMap` entry, a main-window listener that calls `appEditorHost.listTags()` / `listLinkCandidates()` (`editor-host.ts:123, 195`) and reports back, plus the composer's request IDs and timeouts. This is the most code of the three, on both sides.
- Latency: two event hops plus the main-window work, per keystroke or per cache fill. Typed events go through the webview event bus; each hop is async. Per-keystroke use is not viable; it would need a cache and still adds a round trip at the first `#`.
- Payload: only what the handler chooses to send, so it can be lean. Its advantage over a1 is that the main window already has the file tree (all link targets, including non-Markdown) and the throttled entries memo.
- Staleness: same as the main window's memo (up to about 10 s during bursts), plus it uses the editor host verbatim, so tag and link results equal the editor's.
- Main window hidden: the listener lives in the main webview (`src/routes/(app)/+layout.svelte:59-63` registers the quick-capture listener there). A hidden but alive webview still runs; the 003 comment says WebKit may suspend a hidden view after about 5 minutes and proposes `backgroundThrottling: disabled` (`003...md:53`). I found no `backgroundThrottling` setting in `src-tauri/tauri.conf.json` or `src-tauri/src` (grep empty). UNVERIFIED whether a suspended webview still delivers events promptly. Behavior when suspended is unknown, and it would surface as autocomplete that silently stops working until a timeout.
- Main window destroyed (003 as it stands today): no listener, every request times out. This is exactly the failure the composer already shows for saves ("Save not confirmed", `+page.svelte:216`; `003...md:5`). For autocomplete it degrades to "no suggestions", but a new feature should not inherit that known bug.

### (c) Main window pushes a snapshot on `qc:open-composer`

- Mechanism: main window listens to the app-wide `qc:open-composer` (emitted via `handle.emit`, `commands.rs:406`, so all windows get it), builds `{tags, files, aliases}` from the editor host, and sends it to the composer (a Rust relay command in the style of `report_composer_capture_result`, or a JS `emit`; JS `emit` from the main window needs `core:event` permission: UNVERIFIED if `core:default` covers it, the repo's convention is a Rust relay command).
- Code to write: a main-window listener (it has no existing hook for this event), a Rust relay command plus event const plus DTO, a composer-side listener and in-memory store. Contract edits as in (b).
- Latency: no round trip while typing; the data arrives some tens of ms after summon. There is a race: the user can type `#` before the snapshot lands, and the first completion gets nothing (or must wait). Show happens on the main thread, then emit (`commands.rs:395-407`); the snapshot comes after the main window handles the event and builds the payload.
- Payload: the whole vault's tag list and link targets pushed on every summon, even when the user never types `#` or `[[`. Large vaults pay a serialization and copy per summon. This is the worst option on payload.
- Staleness: bounded by "state at last summon", the same as a1 with refetch-per-summon, plus the main-window memo lag.
- Main window hidden or destroyed: same failure modes as (b); with a destroyed window there is no pusher, so the composer never gets data.

## 4. Comparison

| | Rust edits | Contract/events edits | Works with main destroyed | Payload | Complexity |
|---|---|---|---|---|---|
| a1 reuse existing commands | none | none | yes (index may be frozen) | heavy (full entries, tag `filePaths`) | lowest |
| a2 new lean command | 1 command + DTO | 1 command, DTO, `COMMAND_ARGS` | yes | lean | low-medium |
| b relay | 2 commands + event + DTO | events + commands | no | lean | highest |
| c snapshot push | 1 relay + event + DTO | events + commands | no | whole vault per summon | medium |

Recommendation from this scout's topic: (a). Start with a1 if a payload measurement shows it is acceptable, move to a2 if not. Do not build (b) or (c).

## 5. Reuse opportunities (zero editor edits)

- `NOOP_HOST` (`editor-host.ts:76-87`) is exported, so a composer host is `{ ...NOOP_HOST, listTags, listLinkCandidates }` plus optionally `resolveLink` / `readNote`. `editorHost` is a `Facet` installed with `editorHost.of(host)` (`editor-host.ts:94-97`), so the completion sources `tagCompletionSource` and `wikilinkCompletionSource` (`tag/completion.ts:15`, `wikilink/completion.ts:45`) read whichever host the composer installs.
- `VaultTag` and `LinkCandidates` types are exported from `editor-host.ts:14-27`.
- `vault-entries.service.ts` is not reusable as is: it imports `vaultStore` (`vault-entries.service.ts:4`), which the composer window does not have loaded. The composer needs its own small fetch.
- The `.logic.ts` files import only `utils/` and `type` imports, so the composer bundle can use them without pulling stores (`wikilink/completion.logic.ts:1-3`, `tag/completion.logic.ts:1`). `wikilink/completion.ts` itself imports `../live-preview/core/profiling` for `reportError` (`:5`), which pulls an editor-internal module into the composer bundle. UNVERIFIED how heavy that module's import graph is.

## 6. Risks

- Non-Markdown link targets: the editor offers every non-`.view` file in the tree (`editor-host.ts:80`); the index lacks them (`vault.rs:317`). With a1/a2-from-index, `[[` in the composer would not offer images or PDFs. That is a behavior difference from "behaving like the main markdown editor"; call it out to the owner, or add a Rust tree listing.
- Stale vault index during a vault switch: `editor-host.ts:98-99` guards with `vaultStore.indexReady` because Rust still holds the previous vault's index until the new one is built. The composer has no `indexReady`. The composer only opens when a vault DB is open (`lib.rs:45`), but the DB can open before the index rebuild finishes. UNVERIFIED whether Rust exposes an index-ready flag; the window is small and the effect is a stale suggestion list.
- Payload cost of a1 on large vaults: every summon (or every index event if the composer listens to `vault-index-updated`) copies all entries. Mitigate with fetch-on-first-trigger (lazy: only on the first `#` or `[[`) plus a TTL, not on summon.
- The composer window is long-lived and hidden between uses (`lib.rs:135-153`), so an in-memory cache never resets by itself. Invalidate on `qc:open-composer` or on `vault-index-updated`.
- `docs/adr/0028-quick-capture-merge-into-kokobrain.md:68` lists this feature as out of scope with the stated precondition "IPC exposing vault entries to the composer webview". Option (a) satisfies that condition with zero new IPC (a1); the ADR needs an amendment, not a new decision.
- Rust DTO change rules (a2): ts-rs output regenerated by `cargo test`; stale committed bindings fail CI (CLAUDE.md Quick Reference rule 6). Cargo builds are throttled to 1 at a time per the owner's memory.
- `get_all_tags_v2` and `get_all_vault_entries_v2` hold a shared read lock for the clone (`vault.rs:567-572`, `:642-645`). Calling them per keystroke from a second window adds contention with writers. Cache them.

## 7. Open questions

1. Heading and block-id completion (`[[Note#`, `[[Note#^`) needs `resolveLink` and `readNote` (`wikilink/completion.ts:14-23`). The composer has neither the vault path nor fs permission. Options: a new Rust command returning a note's text by index path (UNVERIFIED that `read_files_batch` can run without a vault path), or add `core` fs read permission scoped to the vault (broad, against composer.json's intent), or defer heading and block modes. Owner decision needed on whether "behaving like the editor" includes them.
2. Should non-Markdown files appear in `[[` suggestions? If yes, a1 and a2-from-index are not enough, and a Rust file listing is needed.
3. Is payload measurement available for the owner's real vault (`get_all_vault_entries_v2` byte size)? Not found in the repo. A measurement decides a1 versus a2.
4. Does the owner want the composer to survive a destroyed main window (issue 003 is parked as `needs-info`, `003...md:11`)? Option (a) is independent of it; (b) and (c) are not.
5. Tauri confirmation that app commands without `AppManifest` are open to every capability window: worth a one-line check in the Tauri 2 docs before relying on a1.
