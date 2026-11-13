# Validation group 6: scouts 13, 14, 19, 20

Adversarial check at HEAD 130d6b8f7. Read-only: no tests, builds or cargo were run. Every verdict cites the file:line I read myself.

## Verdict summary

| Scout | Verdict | Material errors |
|-------|---------|-----------------|
| 13 layer and architecture rules | Mostly correct | Says the editor sources can run headless from a non-CodeMirror host. They can produce options that way, but the wikilink options can only be applied through `view.dispatch`. A few line refs are off. |
| 14 IPC contracts | Mostly correct | Says there are "ten" emit sites; there are nine. Says heading and block completion always need `readNote`; that holds only for other notes. Its description of what `files` contains is incomplete. The e2e line ref is off. |
| 19 docs and ADR | Mostly correct | Cites the wrong ADR line for 600x240. Reads ADR-0028 as saying the composer "cannot read vault data", which it does not say. Its amendment-order rule ("newest first") does not hold everywhere. |
| 20 history and prior art | History correct, ADR refs wrong | Several ADR-0028 line refs are wrong. It counts 11 EditorHost methods; there are 10. One commit date is off. |

## Scout 13: layer and architecture rules

Confirmed:
- `scanLib` walks only `src/lib` (scripts/import-graph.mjs:29, :249-255). The routes exemption is stated at :153. `locate()` returns `outside` for paths not under `src/lib` (:140-141). `ruleFor` is at :156-172.
- The baseline holds 3 entries, all `utils -> core/settings` (layer-baseline.json:2-4). `BASELINE_SIZE = 3` (layer-rules.test.ts:32). `scanLib(ROOT)` is called at :42. The non-literal `import()` ban is at :61-64. Plugin -> core is the allowed direction (:135-138).
- `PLUGIN_ALLOWLIST` gives quick-capture only `periodic-notes` (import-graph.mjs:47-52).
- `markdown-editor-imports.test.ts:15-23` forbids Tauri, stores, services, features, plugins and utils/debug. It has no `contracts` entry, so a `call()` import placed inside the editor folder would pass this test. It would still contradict the folder doc (docs/architecture/modules/src/lib/core/markdown-editor.md:59).
- Import closures:
  - tag/completion.ts:1-4 imports only autocomplete types, `editor-host`, `profiling` and `./completion.logic`.
  - wikilink/completion.ts:1-12 also imports `wikilink-resolution.logic` (whose only import is type-only from `#lib/contracts/index.js`, wikilink-resolution.logic.ts:1), `fuzzy-match` and a type from `vault-v2.types`.
  - editor-host.ts:1-4 imports `@codemirror/state` plus type-only imports.
  - profiling.ts has no imports. `reportError` is `console.error` plus a no-op port until something configures it (profiling.ts:9-12, :36-39).
- Barrel trap: wikilink/index.ts:2 re-exports `wikilinkDecoration`.
- `NOOP_HOST` is at editor-host.ts:87-98 and the facet at :104-107.
- Kanban precedent: KanbanWikilinkSuggestions.svelte:2-6 imports `detectWikilinkContext` and `matchFilesForWikilink` and reads `fsStore`. The only production consumers of the two sources are setup/editor-extensions.ts:19,21 and the barrel (grep of `src`).
- The composer page imports `call`, `on`, `EVENT_NAMES` and the theme service (+page.svelte:4-6). theme.service.ts:4-5 imports the settings and applied-theme stores.
- architecture-map `validate` checks four things: a module has a doc, the doc has a summary, every named path exists, and there are no orphan docs (scripts/architecture-map.mjs:399-411).
  - Scout 13 left one point UNVERIFIED. It is now verified: `namedPaths` takes every backticked token under `src|src-tauri|docs|scripts|e2e|help/` that has no `<>*{}` characters (architecture-map.mjs:208-217).

Refuted or corrected:
- Section 4 says a headless `EditorState` "could feed the unmodified sources from a non-CodeMirror host". This is only half true.
  - Producing options works: neither source reads `context.view` (tag/completion.ts:14-41, wikilink/completion.ts:43-124).
  - Applying a file or alias option does not work without a view. Each such option's `apply` is a closure that calls `view.dispatch(...)` (wikilink/completion.ts:74-81 and :100-108). The alias insert text `noteName|alias` and the `]]` check exist only inside those closures.
  - Tag options have no `apply` (tag/completion.ts:38), so CodeMirror's default insertion would run, and that also needs a view.
  - Consequence: a textarea host either passes a fake view object to `apply` (brittle) or reimplements the insert. That reimplementation is the very duplication constraint 1 asks to avoid. Mounting a CodeMirror view in the composer is the only way to reuse `completion.ts` fully.
- Line refs (minor):
  - The event-listen test's `SCANNED` is at event-listen.test.ts:13, not :15.
  - The type-only `UnlistenFn` allowance is tested at :107, not :110.
  - The facet reads in wikilink/completion.ts are at :68, :139 and :191, not :43-47.

## Scout 14: IPC contracts

Confirmed:
- `CommandMap` (commands.ts:45) and `COMMAND_ARGS` (:258-331) end in `as const satisfies` (:331). The `todoist_read_log` `limit?` example is at :271.
- `get_all_tags_v2` and `get_all_vault_entries_v2` are zero-arg (commands.ts:95, :103, :280, :284). The Rust side is at commands/vault.rs:563-573 and :638-646 (clone plus sort under a read lock).
- `generate_handler!` starts at lib.rs:325 and lists 72 commands (73 `::` lines minus the macro line). `MIN_COMMANDS = 57` (ipc-parity.test.ts:24). `INJECTED` is at :27.
- The parser regex requires `#[tauri::command...]` immediately followed by `pub fn` (ipc-parity.test.ts:98-102). Unmapped types throw (:137-146).
- ts-rs is pinned `=12.0.1` (src-tauri/Cargo.toml:38). The `[env]` block is in the root `.cargo/config.toml`, and `src-tauri/.cargo/` holds only `audit.toml`.
- CI regenerates the bindings and diffs them (ci.yml:118-132). The rust path filter includes the generated folder (ci.yml:55).
- The e2e `Handlers` type is at tauri-core.ts:470 and the `HANDLERS` map at :472. The compile guards are at :571-576. `tsconfig.json:23` includes `e2e`.
- There are 9 event consts (events.rs:7-38) and `EVENT_NAMES` mirrors them (events.ts:16-26).
- `COMPOSER_WINDOW_LABEL` is at quick_capture/commands.rs:31. The `ComposerCaptureResult` DTO pattern is at :489-499.
- `build.rs:23` is a bare `tauri_build::build()`. composer.json:6-10 grants only `core:default` and two window permissions, yet the page calls `dismiss_composer` and `submit_composer_capture` (+page.svelte:77, :102). So app commands are not gated per window. I did not re-read the Tauri crate source and rely on scout 05 for that.
- The initial index load also broadcasts `vault-index-updated`: `emit_index_updated` (commands/vault.rs:1744-1757) is used by `scan_vault_v2_cached`.
- The `TagAggregate` payload carries `filePaths` (generated/TagAggregate.ts). The app host drops it (app/editor-host.ts:102).
- `core_tauri_free_test.rs:9,24` and `VaultIndexState` (vault/mod.rs:26) match the scout.

Refuted or corrected:
- F8 says "ten sites". There are nine `app.emit(VAULT_INDEX_UPDATED_EVENT, ...)` calls in commands/vault.rs (:373, :465, :757, :873, :982, :1164, :1255, :1406, :1752) and none elsewhere in src-tauri/src.
- F6 places `handleQuickCaptureNoop` at tauri-core.ts:459-465. It is at :453-455. The quick-capture handler rows are at :557-561.
- F9 says "Heading and block completion ... rely on readNote ... cannot work in the composer". That is only half right.
  - `[[#heading` and `[[#^id` against the current text read `state.doc` and never call the host (wikilink/completion.ts:135-137, :187-189).
  - Only `[[Other#...` needs `resolveLink` plus `readNote`. With `resolveLink` returning null, `resolveTargetContent` returns null silently (:16-17), so the composer degrades without console noise.
- F10 says `files` holds "all non-directory nodes". The app host filters `.view` files out with `isLinkTargetFile` (app/editor-host.ts:80; wikilink-resolution.logic.ts:15-20). It also filters the note entries (:131). A composer host must apply the same filter to match the editor.

## Scout 19: docs and ADR

Confirmed:
- Help page 09, line 12, is the composer row (600x240, Cmd+Enter, Esc). The image is at line 17. `help/documentation/` has no `screenshots/` folder (ls).
- FEATURES.md lines 10 and 13. `CONTEXT.md` is absent. docs/agents/domain.md says to proceed silently when it is missing.
- ADR README rules: line 5 and :99-100. The 0028 index row is at :135 with no "(amended)" suffix. The 0015 and 0016 rows (:122-123) carry suffixes.
- ADR-0028 structure: amendment at :9, out-of-scope header at :65, bullet at :68. Lines :47 and :63 are as quoted.
- Module docs: routes.md:7, :15, :19-22, :27-28, :34-37, :46-48 and :50; quick-capture.md:7, :32-38 and :47; quick_capture.md:36-44 and :58; contracts.md:33, :41, :48-50, :62 and :66. All match.
- No doc in `help/` describes `#tag` completion (grep). help/03-editor.md:120 documents "Escape to dismiss" the popup, which conflicts directly with the composer's Esc handler (+page.svelte:162-166).
- Two of scout 19's UNVERIFIED points are now verified:
  - No test reads page 09 (grep of src/tests, e2e and scripts for `09-quick-notes`). settings-copy.test.ts pins only 13-queryjs (:129).
  - No test reads `capabilities/composer.json` (grep of src/tests, src-tauri/tests, src-tauri/src, scripts and e2e).

Refuted or corrected:
- Risk 5 and section 4 cite "ADR line 27 (600x240 popover)". 600x240 is at ADR-0028:31. Line 27 is the clipboard row.
- Section 2 says "the composer webview cannot read vault data itself, ADR-0028 line 47 and 63". The ADR says only that it cannot import or share `vaultStore`. Vault read commands are callable from the composer (scout 14 F9; build.rs:23; the page already calls commands composer.json does not list).
- Section 3 says amendments go "newest first". ADR-0010 lists 2026-11-01 above 2026-11-03 (0010:9, :13, :17, :23), so the order is not uniform. 0002, 0003 and 0004 do put the newest first.
- Root README.md:106 is only a link line. The "Instant capture (...)" text is at help/documentation/README.md:31. Minor.

## Scout 20: history and prior art

Confirmed:
- Every cited commit exists with the subject quoted (git log). The b697ca468 body says "Textarea instead of CodeMirror (autocomplete moves with P2.6)".
- d3b14ae0c adds P5.2 with "Swap textarea -> CodeMirror, port quick-capture/src/lib/wikilink/, add Rust IPC exposing vault entries".
- Plan lines 44, 76, 77, 100 and 122 at `20a8057cf^:tasks/todo/merge-quick-capture.md` match.
- Issue 31 (5bcbf6c0e):
  - The issue file has the facet design (`static`, `combine`) at :4, "outside every compartment ... source mode" at :6, "Host calls stay out of compute" at :8, "Performance trap" at :33 and "15 ADR-0003 violations" at :32.
  - review.md:24 records that Sentry reporting was lost.
- a44f9f3a9 (Issue 143) touched app/editor-host.ts and editor-host.ts. The memo key is at app/editor-host.ts:100 and the `indexReady` guard at :99.
- Composer page refs :14, :34, :137-140, :152, :161-171 and :205-212 match. composer-page.test.ts has 459 lines and queries `textarea` at :60, :139 and :143-144.
- There is no prior composer autocomplete Issue: grep of the `.scratch` dirs finds composer mentions only in the iOS research, and `git log --all --grep=composer` shows no completion work.
- Scout 20 left one point UNVERIFIED. It is now verified: the profiling port stays unconfigured in the composer, so errors go to `console.error` only (profiling.ts:9-12, :36-39).

Refuted or corrected:
- Section 2 cites "docs/adr/0028...:47 ('Out of scope (Phase 5 follow-ups)')". The header is at :65 and the bullet at :68. Line 47 is the `vaultStore` sentence.
- "ADR lines 36 and 63: the composer is a separate webview" is wrong. Line 36 is the Recording/Whisper bullet. The right lines are :47 and :63.
- "ADR 0028:12" names the sibling app. It is at :15.
- Section 3 says the interface has "11 methods". `EditorHost` has 10 (editor-host.ts:44-76): resolveLink, listLinkCandidates, readNote, assetUrl, openLink, openExternal, createNote, openView, openTagSearch, listTags.
- The table dates df6b5f190 (Issue 01) 2026-11-05. git shows 2026-11-04.
- "13 scout reports" in `.scratch/composer-autocomplete/` was stale by the time I checked: research/ now holds 20.

## Gaps the scouts missed (on their topics)

1. **Existing composer tests pin the exact command list and listener order.**
   - composer-page.test.ts:201, :214, :224, :253, :265, :274, :292 and :308 assert `commands()` (every `call` name, :164-166) `toEqual(['submit_composer_capture', ...])`.
   - :88 reads `vi.mocked(on).mock.calls[0][1]` as the open-composer handler.
   - The `call` mock resolves `undefined` for every command (:5-8).
   - Effect on scout 14 Option A: fetching tags or entries on mount or summon breaks those assertions. So does a code path that maps the result without a guard. Registering `on('vault-index-updated')` before the existing listeners breaks :88.
   - Fix options: fetch lazily (on the first `#` or `[[`) and register new listeners after the existing two, or update the tests in the same change. Updating means extending the expected lists, not removing assertions.
2. **Wikilink options need an EditorView to apply** (see Scout 13). This decides the reuse question. Producing options is reusable headless, but inserting them is not.
3. **The editor's link targets differ from what the composer can get.**
   - The editor uses the whole file tree, attachments included and minus `.view` (app/editor-host.ts:76-85, file-entries.logic.ts:10-26).
   - `get_all_vault_entries_v2` returns only indexed notes. Images and PDFs would then be missing from composer `[[` suggestions.
   - `scan_vault` needs the vault path (commands.ts:76), and no existing command hands that path to the composer. UNVERIFIED whether another path source exists.
4. **CodeMirror ordering.** With `filter: false`, CodeMirror keeps the source's order and ignores `boost` (node_modules/@codemirror/autocomplete/dist/index.js:787-789). The alias `boost: -score` (wikilink/completion.ts:99) therefore has no effect in the editor today. A textarea reimplementation that "behaves like the editor" must keep plain source order (file options, then alias options). The default limit is 100 rendered options (UNVERIFIED against `maxRenderedOptions` here).
5. **Other editor behaviour the composer would have to match.**
   - The editor installs `closeBrackets()` (editor-extensions.ts:138), so typing `[[` auto-inserts `]]` and the `apply` closures skip an existing `]]`.
   - Its `completionKeymap` (:168) makes Enter accept and Esc close the popup.
   - The composer's window-level keydown (+page.svelte:161-171, bound at :202) fires on Esc first. Scout 20 mentions Esc. None of the four scouts lists `closeBrackets` as part of the behaviour to match.
6. **ADR-0028:63 is already factually stale.** It says the composer "lives at its own Tauri origin". theme.service.ts:9-11 says secondary windows "share this origin's localStorage", and the theme mirror depends on that. A new amendment should correct this. Scout 19 relied on :63 without noticing.
7. **Precedent for the help text.** help/documentation/21-kanban.md:78-80 already documents `[[` autocomplete in a non-editor surface ("just like in the markdown editor"). Scout 19 missed it as a template for the page-09 wording.
8. **The composer opens only with a vault database open.** `dispatch_shortcut` returns early when `!crate::db::is_open()` (lib.rs:45-47). So "no vault" is mostly unreachable from the hotkey.
   - The vault-switch window is still open: the db is open while `VaultIndexState` still holds the previous vault's index (app/editor-host.ts:97-99; app-lifecycle.service.ts:344-353).
   - Scouts 14 and 19 left the no-vault case UNVERIFIED.
9. **Pure-logic convention.** The pure-logic test does not forbid `@codemirror/*` (pure-logic.test.ts:39-44). CLAUDE.md's ".logic.ts: No framework imports" still argues against a `.logic.ts` file that imports `completion.ts` (and through it `@codemirror/state`). Scout 13 risk 2 calls this "fine". The test allows it; the convention does not.
