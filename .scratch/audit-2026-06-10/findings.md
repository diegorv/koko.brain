# Auditoria completa — 2026-06-10

Auditoria investigativa de `src/` e `src-tauri/` (sem bug reportado; fase de descoberta). Metodologia: 56 agentes de varredura (Haiku) leram TODOS os 872 arquivos (~146k linhas: fontes FE, fontes Rust, testes FE/Rust, configs); 4 agentes transversais (Fable 5) mapearam contrato IPC, eventos, reatividade Svelte 5, bloqueio de UI e mapa fonte→teste; auditores Fable 5 verificaram cada achado contra o código real (com execução de testes/snippets quando decisivo); céticos independentes (Fable 5) tentaram refutar todos os critical/high.

**Resultado:** 102 achados confirmados (0 critical, 6 high, 33 medium, 63 low) | 57 falsos positivos eliminados | 405 gaps de teste. Nenhum lote falhou.

> Escopo: apenas listagem de achados — nenhum plano de correção.


## High (6)

### 1. Full-vault scans run inside synchronous Tauri commands (main-thread blocking)

- **Arquivo:** `src-tauri/src/commands/vault.rs:980-1019, 1040-1232, 159-203`
- **Severidade:** high | **Origem:** cross:ui-blocking

scan_vault_v2_cached (vault.rs:1040-1045) and scan_vault_v2 (vault.rs:980) are sync `pub fn` commands. Cache miss runs collect_v2_entries (vault.rs:159-203: fs::read_to_string + full parse per .md) + idx.build(notes.clone()) (1092) + write_snapshot (1105); even cache hits stat-walk the whole vault (1131) and clone all entries (1195). The repo's own comment at search_index.rs:21-24 states a sync command 'would run on the main Tauri IPC thread and block every other invoke()/listen() call' (~3s measured on 1800 notes) — the FTS build was converted to spawn_blocking for exactly this reason. Triggered on every vault open (backlinks.service.ts:63) and every watcher full rebuild >10 files, e.g. git…

### 2. shutdown_semantic is registered and documented as required on vault teardown but never invoked — stale cross-vault semantic state and search-result leak

- **Arquivo:** `src/lib/core/app-lifecycle/app-lifecycle.service.ts:350-435`
- **Severidade:** high | **Origem:** cross:ipc-contract

teardownVault (app-lifecycle.service.ts:350-435) never invokes shutdown_semantic; grep finds zero call sites in src/. SEARCH_CACHE (semantic.rs:55) is a process static checked BEFORE the DB in get_or_load_cache (semantic.rs:83-86). On vault switch (+layout.svelte:91 / initializeVault → teardownVault at :121): init_semantic_search (semantic.rs:228-251) does not invalidate; build_semantic_index's no-change early return (semantic.rs:389-399) skips the only bulk invalidate at :607; cleanup_orphaned_chunks (:1175-1201) doesn't invalidate either. So switching to an already-indexed unchanged vault leaves search_semantic/search_hybrid serving the OLD vault's chunks until a save runs update_semantic_…

### 3. vault-index-updated listener refetches the ENTIRE vault snapshot on every event, no coalescing

- **Arquivo:** `src/lib/core/layout/tauri-listeners.service.ts:85-114`
- **Severidade:** high | **Origem:** cross:ui-blocking

tauri-listeners.service.ts:88-103: per event, invokes get_all_vault_entries_v2 (sync Rust, vault.rs:478-488: clone + sort of EVERY NoteEntry incl. frontmatter/tasks/links) then runs refreshArchivedPaths, refreshTypeDefinitions, setEntries, buildContentOrderMap, and possibly loadDirectoryTree — no debounce or coalescing. Events fire per content-changed save (editor.hooks.ts:189, emit gated only on result.changed at vault.rs:292), per 1s typing pause (index-updater.service.ts:48), and ONCE PER FILE in the watcher incremental loop (watcher-handler.service.ts:103-127: 10 files = 10 events = 10 full-snapshot fetches). Recurring O(vault) IPC serialize + JS parse + O(N) rebuilds on main threads whi…

### 4. Stale closure: QueryjsBlockWidget captures isIndexReady at construction, uses stale value in toDOM()

- **Arquivo:** `src/lib/core/markdown-editor/extensions/live-preview/widgets/queryjs-block-widget.ts:61, 65, 72`
- **Severidade:** high | **Origem:** core/markdown-editor#4

Snapshot at :65 is read in toDOM (:72) instead of the live store; contrast collection-block-widget.ts:75 which reads collectionStore.isIndexReady live. No recovery path: queryjs-block-field.ts:73 early-returns on every update without docChanged/selectionSet (even forceDecorationRebuild), and no $effect watches isIndexReady. Race is deterministic at startup: app-lifecycle.service.ts:246-252 defers buildPropertyIndex() via setTimeout(0) so the auto-opened note renders BEFORE the index is ready; widgets snapshot false and show 'Building index...' forever (scroll re-entry re-calls toDOM with the same stale field). Heals only on edit or cursor moving to another line (eq() at :124 then forces repl…

### 5. selfUpdate guard self-defeating: effect reads and writes its own $state dep, re-run wipes in-progress local toolbar state after every self-persist

- **Arquivo:** `src/lib/features/collection/CollectionView.svelte:40, 90-100, 103-111, 169-189`
- **Severidade:** high | **Origem:** cross:svelte-reactivity

Empirically verified with svelte 5.55.8 (compiled runes harness): after `selfUpdate=true` + prop change in one flush, the effect runs the guard branch, the `selfUpdate=false` write at line 106 dirties its own tracked dep, and the effect re-runs into the reset branch (initialized=false, seededIndex=-1). Seeding effect (90-100) then re-seeds. Impact: (a) localFormulas re-seeds from YAML which excludes editing:true entries (persistState 171-173) — in-progress formula rows wiped on any other persist; (b) FilterRow fires onUpdate per keystroke (FilterRow.svelte:167) → persistState per keystroke → parseFilterToGroups regenerates row uids (filter.logic.ts uid()) → keyed each `(row.id)` (FilterPanel…

### 6. Stale closure: fileName reset before use in confirmCreate

- **Arquivo:** `src/lib/plugins/templates/TemplatePicker.svelte:33-43`
- **Severidade:** high | **Origem:** fe-src:calendar+graph-view+one-on-one+periodic-notes+quick-capture+

Real defect. confirmCreate() (TemplatePicker.svelte:33-43): guard at :34 passes, reset() at :36 sets fileName='' (:58), then :38 reads the $state fresh, so createFileFromTemplate(path, '') is always called. In templates.service.ts:54-66 fullFileName becomes '.md' (''.endsWith('.md') is false), so openOrCreateNote creates/opens `${vaultPath}/.md` — a junk dotfile; the user's named file is never created. Every picker-driven template creation is broken; no component test exists for TemplatePicker (only store/service/logic tests in src/tests/lib/plugins/templates/). 'Stale closure' is a misnomer (it's a fresh read of already-reset state) but the mechanism in the evidence is correct. High: user-v…


## Medium (33)

### 1. commands/semantic.rs: runtime search paths (search_hybrid, search_semantic, update_semantic_file, init_semantic_search) untested

- **Arquivo:** `src-tauri/src/commands/semantic.rs:227-252, 618-729, 746-864, 879-889, 909-1041`
- **Severidade:** medium | **Origem:** cross:test-gap-map

Confirmed: semantic_commands_test.rs imports only check_and_update_model_hash, cleanup_orphaned_chunks, clear_changed_files_without_chunks, compute_model_hash, get_semantic_stats, shutdown_semantic (lines 1-4 of the test). search_semantic, search_hybrid, update_semantic_file, init_semantic_search, get_semantic_file_status: 0 references in src-tauri/tests (sweep's claim that build_semantic_index is covered is also wrong — it isn't). Nuance: full search paths need a real ONNX embedder (ensure_embedder_loaded at 634/767), impractical in CI; RRF fusion is tested inline (search/rrf.rs:49+). But model-free, data-mutating paths ARE testable and untested: update_semantic_file's empty-content delete-…

### 2. Non-atomic file writes in create_note and propagate_type_rename

- **Arquivo:** `src-tauri/src/commands/vault.rs:344, 682, 897`
- **Severidade:** medium | **Origem:** rust-src:commands+db

All three sites are plain std::fs::write (O_TRUNC + write_all), not write-temp+rename. vault.rs:344 (propagate_type_rename_inner) and vault.rs:682 (toggle_task_status_inner) rewrite EXISTING user notes in place — a crash/power loss between truncate and write_all leaves an empty/partial note. vault.rs:897 (create_note) writes a NEW file, so worst case there is a partial new file (trivial). Mitigation is partial: file-history snapshots are FE-triggered on editor save only (file-history.service.ts:111-122), so type-rename/task-toggle rewrites of files never edited this session have no snapshot. Note the whole app shares this strategy (editor.service.ts:144 writeTextFile is equally non-atomic), …

### 3. Documented TOCTOU vulnerability in toggle_task_status_inner not protected at runtime

- **Arquivo:** `src-tauri/src/commands/vault.rs:662-690`
- **Severidade:** medium | **Origem:** tests/rust#2

Mechanism verified: read_to_string at vault.rs:667, whole-file write at vault.rs:682, with no file lock and no compare-and-swap (no mtime/content recheck before write). The VaultIndex write lock taken by the toggle_task_status command (vault.rs:715-720) serializes only in-process index mutations, not the file, so an external writer (vim, iCloud/Dropbox/Syncthing) landing between read and write gets its content silently clobbered by the stale toggled snapshot. The repo acknowledges and probabilistically reproduces this in src-tauri/tests/vault_task_test.rs:12-86 (#[ignore] audit_finding_9 test asserting lost>0). Downgraded high->medium: the window is sub-millisecond per checkbox click, so sil…

### 4. Tensor shape assumption causes panic in mean pooling

- **Arquivo:** `src-tauri/src/semantic/embedder.rs:198, 204 (root cause); 246-248, 276-278 (panic site)`
- **Severidade:** medium | **Origem:** rust/semantic

Real but downgraded. embedder.rs:198/204: non-3D output falls back to hidden_dim=expected, so validate_dimensions (199/205) always passes for ANY non-3D model. mean_pool_f32/f16 then double index_axis assuming 3D; for 2D output [batch,hidden], embs is 1D and token=embs.index_axis(Axis(0),j) is 0-dim, so token[k] (248/278) panics — verified with throwaway ndarray 0.17.2 program (ndindex.rs:151 assert in debug; out-of-bounds panic in release). Severity capped at medium: every call site (semantic.rs:489, 629, 915, 1045) is inside spawn_blocking, so the panic becomes a JoinError (no crash) but poisons the EMBEDDER mutex, disabling semantic features until restart. Trigger needs a manually swapped…

### 5. Every save nukes the entire queryjs result cache vault-wide

- **Arquivo:** `src/lib/core/editor/editor.hooks.ts:193`
- **Severidade:** medium | **Origem:** cross:ui-blocking

Verified. notifyAfterSave (editor.hooks.ts:193) → invalidateQueryjsCache (queryjs-block-widget.ts:31-33) → queryjsSessionStore.clearResults() (queryjs-session.store.svelte.ts:83) drops every cached rendered DOM vault-wide; also fired per watcher batch (watcher-handler.service.ts:82,165). The store header (:29-31) documents the intended contract — per-block invalidate(contentHash) from notifyAfterSave — which was never implemented; widget doc (:51-53) repeats the false claim. Consequence: saving note A makes note B's blocks cache-miss on next toDOM — 'first-open' policy shows ▶ Run instead of the chart; 'always' re-executes (full get_all_vault_entries_v2 snapshot + user JS per block). Defeats…

### 6. vault-index-updated listener refetches and re-processes the ENTIRE vault entry set on every index event (every save / task toggle / watcher update)

- **Arquivo:** `src/lib/core/layout/tauri-listeners.service.ts:88-103`
- **Severidade:** medium | **Origem:** cross:ipc-contract

Confirmed end-to-end. update_note_in_index emits when result.changed (vault.rs:292); changed is FULL struct equality including modified_at/size (index.rs:358), so virtually every save emits. The listener (tauri-listeners.service.ts:90) then invokes get_all_vault_entries_v2, which clones + sorts every NoteEntry — frontmatter BTreeMap, wikilinks, tags, tasks, snippet (vault.rs:478-488, entry.rs:139-184) — a multi-MB JSON IPC + main-thread parse per save on large vaults, then re-runs refreshArchivedPaths/refreshTypeDefinitions/setEntries/buildContentOrderMap over all entries. Worse: incremental watcher updates fire one Rust call per file in a loop (watcher-handler.service.ts:121-127), so a 10-f…

### 7. Central vault-index-updated listener fans a full get_all_vault_entries_v2 snapshot + type-definition recompute on every event with no debounce/coalescing

- **Arquivo:** `src/lib/core/layout/tauri-listeners.service.ts:85-114`
- **Severidade:** medium | **Origem:** cross:svelte-reactivity

Verified: every vault-index-updated event (emitted per update_note_in_index call — vault.rs:267-297; watcher incremental path loops ≤10 files, watcher-handler.service.ts:16,125) triggers a full get_all_vault_entries_v2 fetch + refreshArchivedPaths + refreshTypeDefinitions + setEntries (bumps entriesVersion fanning into TypeSidebar:70 and other consumers) + buildContentOrderMap, with no debounce/coalescing — a 10-file burst means 10 full-vault JSON snapshots parsed on the main thread plus 10 recomputes; out-of-order responses can leave stale entries in the store. One sweep sub-claim is wrong: the `cancelled` check at line 91 DOES guard all inner store writes. The un-debounced fan-out itself i…

### 8. composition-aware-bracket-matching.ts (175 lines of IME edge-case logic) has no test

- **Arquivo:** `src/lib/core/markdown-editor/extensions/composition-aware-bracket-matching.ts:1-175 (testable logic: 120-144; freeze guard: 157-166)`
- **Severidade:** medium | **Origem:** cross:test-gap-map

Confirmed: grep 'composition-aware'/'compositionAwareBracketMatching' over src/tests = 0; the only importer is setup/editor-extensions.ts:71 (live code), whose test (src/tests/.../setup/editor-extensions.test.ts) only smoke-tests that createExtensions returns a non-empty array. Untested: buildBracketDecorations (lines 120-144, incl. the multi-cursor range-sort at 139-142 required by RangeSetBuilder ascending order, and the backward-then-forward matchBrackets fallback at 127-128) and the composition freeze guard (160-162). The file exists specifically to fix a shipped user-visible WebKit IME bug (text vanishing during dead-key composition); a regression would only be caught manually. Note: bu…

### 9. queryjs-block-field.ts is the only live-preview StateField with no test file

- **Arquivo:** `src/lib/core/markdown-editor/extensions/live-preview/plugins/queryjs-block-field.ts:1-88`
- **Severidade:** medium | **Origem:** cross:test-gap-map

Verified by directory diff: all 15 sibling files in live-preview/plugins/ have mirrored tests in src/tests/.../plugins/; queryjs-block-field.test.ts is the sole absentee. The file contains real untested logic: computeQueryjsBlocks (13-48, fence replacement + line hiding + shouldShowSource gating) and update() gating — the mandated viewport-skip guard (line 68) plus an extra early-return at line 73 that deliberately skips forceDecorationRebuild for scroll debounce. That second skip is subtle, undocumented elsewhere, and exactly the kind of invariant sibling tests pin down. Only the widget (queryjs-block-widget.test.ts) is covered. Medium: documented perf invariants with zero coverage.

### 10. Note/image embed widgets re-flatten the file tree and re-read the target file from disk on every toDOM()

- **Arquivo:** `src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:550-555, 613-639, 653-706`
- **Severidade:** medium | **Origem:** cross:ui-blocking

Verified. resolveEmbedTarget (widgets.ts:613-619) flattens fsStore.fileTree + O(N) resolveWikilink per call; loadEmbedContent (:627-631) does a full readTextFile IPC. Both fire from WikilinkNoteEmbedWidget.toDOM (:683) and WikilinkImageEmbedWidget.toDOM via resolveImageEmbedAssetUrl (:550-555, called :580) with zero caching. eq() does not prevent toDOM on viewport re-entry (documented LP rule 3), so every scroll re-entry repeats flatten + disk read and re-shows 'Loading…' (visible flicker, :680). Direct violation of LP perf rule 2 (cache the expensive RESULT), which sibling widgets (block-math, mermaid, collection) all follow. Medium: repeated main-thread O(vault) work + IPC flood per embed …

### 11. CodeBlockWidget re-runs lowlight syntax highlighting + DOMPurify in toDOM() with no cache

- **Arquivo:** `src/lib/core/markdown-editor/extensions/live-preview/widgets/code-block-widget.ts:107-124`
- **Severidade:** medium | **Origem:** cross:ui-blocking

toDOM (code-block-widget.ts:111-118) runs highlightCode + DOMPurify.sanitize uncached; highlightCode (code-highlight.logic.ts:40-49) has no memoization — full lowlight parse + HAST walk per call. The convention exists in code: block-math-widget.ts:5-15 caches the sanitized HTML string keyed by formula; mermaid does too. Worse than the sweep stated: codeBlockField rebuilds decorations per docChanged (code-block-field.ts:118-125) creating new widget instances; typing ABOVE a block shifts languageRange offsets so eq() returns false (code-block-widget.ts:126-139) → DOM redrawn → full re-highlight per keystroke for every block below the edit, plus per viewport re-entry on scroll. Medium: synchron…

### 12. Collection cache key ignores index content, only checks size

- **Arquivo:** `src/lib/core/markdown-editor/extensions/live-preview/widgets/collection-block-widget.ts:36, 53, 60-64, 330-336`
- **Severidade:** medium | **Origem:** tests/core/markdown-editor#5

cacheKey = `${yamlContent}|${indexSize}` (line 53) over a module-level Map (line 36) cleared only at vault teardown (app-lifecycle.service.ts:407). Content-only index updates keep the size constant: every save runs editor.hooks.ts:172 -> updateNoteInIndex (collection.service.ts:96-103) -> collectionStore.updateRecord, replacing a record in-place. Next toDOM() (lines 60-64) serves the stale cached QueryResult; eq() (330-336) also compares only yaml/isIndexReady/indexSize. So editing a property on an existing note never refreshes any collection block for the rest of the session (until a file add/delete changes size). The test at collection-block-widget.test.ts:185-203 explicitly asserts this s…

### 13. meta-bind-button-widget.ts (144-line interactive widget) has no direct test

- **Arquivo:** `src/lib/core/markdown-editor/extensions/live-preview/widgets/meta-bind-button-widget.ts:1-144 (key untested paths: 24-36, 79-144)`
- **Severidade:** medium | **Origem:** cross:test-gap-map

Verified zero direct coverage. The only test-side references are meta-bind-button-field.test.ts (iterates decoration ranges via computeMetaBindButtons; never calls toDOM) and meta-bind-button.logic.test.ts (parsing only). No test constructs MetaBindButtonWidget or calls toDOM/executeButtonAction (grep MetaBindButtonWidget in src/tests = 0). Contrast: meta-bind-input-widgets.test.ts:19 mounts an EditorView and calls widget.toDOM. Untested surface includes the rule-11 mousedown stopPropagation (lines 24-27), the click->executeButtonAction dispatch (29-36), and the updateMetadata frontmatter splice math (89-101: frontmatterEnd = doc.length - body.length) which rewrites document content — regres…

### 14. Per-keystroke O(doc) pipeline: 3+ full-doc string materializations and full-line scans per edit

- **Arquivo:** `src/lib/core/markdown-editor/setup/editor-extensions.ts:109-129`
- **Severidade:** medium | **Origem:** cross:ui-blocking

Per docChanged transaction: (1) editor-extensions.ts:127 update.state.doc.toString() → onContentChange → editorStore.updateContent (editor.store.svelte.ts:84-89, comment: 'called on every keystroke') → EditorTabs.svelte:40 + SaveStatus.svelte isTabDirty content!==savedContent string compares; (2) meta-bind-input-plugin.ts:61 state.doc.toString() per rebuild (checkUpdateAction returns rebuild on docChanged); (3) table-field.ts:16 parseFrontmatterProperties(state.doc.toString()). The unclosed-frontmatter edge (editor-extensions.ts:113-120) scans every line when line 1 is a fence with no close. Text.toString is uncached. 3+ O(doc) allocations per keystroke; perceptible typing latency only on la…

### 15. Canvas FileNode passes vault-relative path to openFileInEditor, violating the absolute-paths-everywhere contract

- **Arquivo:** `src/lib/features/canvas/FileNode.svelte:31-52, 55-57`
- **Severidade:** medium | **Origem:** cross:svelte-reactivity

Confirmed as a path-form inconsistency where exactly one of FileNode's two consumers is broken for any given node. No normalization exists anywhere in canvas.logic (createFileNode at canvas.logic.ts:353 stores the string as-is; flowToCanvas/serializeCanvas never touch file). In-app creation stores ABSOLUTE paths: CanvasFilePicker passes fsStore.fileTree paths (absolute per src-tauri/src/commands/vault.rs:137) and CanvasInner.handleDrop gets FileTreeItem's node.path (FileTreeItem.svelte:159). For those, handleClick works but the preview read (FileNode.svelte:40) builds `${vault}/${abs}` -> readTextFile fails -> 'Could not load file'. For relative-path canvases (Obsidian-compatible JSON), the …

### 16. canvas-image.logic.ts exports untested async function resolveImageSrc

- **Arquivo:** `src/lib/features/canvas/canvas-image.logic.ts:28-40`
- **Severidade:** medium | **Origem:** tests:canvas+command-palette+copy-block-link+dock-badge+file-histo

Confirmed. resolveImageSrc (canvas-image.logic.ts:28-40) is exported and consumed in production at ImageNode.svelte:26 inside an $effect whose error state and blob-URL cleanup depend on its return value. The sole test file src/tests/lib/features/canvas/canvas-image.logic.test.ts imports only isImageFile and extToMime (line 2); repo-wide grep shows no other test references resolveImageSrc (canvas.logic.test.ts only covers the unrelated createImageNode). The function has real untested branches: https?:// passthrough (line 30), vaultStore.path prefix join vs raw fallback (lines 33-34), extension/mime fallback (lines 36-37), blob URL creation. Violates the mandatory suite rule (happy path + empt…

### 17. Function-form contains() uses substring matching instead of element matching for arrays

- **Arquivo:** `src/lib/features/collection/expression/evaluator.ts:320-324`
- **Severidade:** medium | **Origem:** tests/features/collection#2

Confirmed. evaluator.ts:320-324 stringifies args[0]; an array property joins with commas ('Parent,AlsoParent') and .includes() then substring-matches, so contains(tags,'rent') is true and needles spanning the joint ('a,b' vs ['a','b']) match. Method-form list .contains() at methods.logic.ts:141-145 uses exact element equality, so semantics diverge. Real-world path: the visual filter builder offers 'contains' for list properties (toolbar/filter.logic.ts:183) and serializes it as the function form (filter.logic.ts:48-49), so the documented 'tags contains project' filter (help/documentation/12-collection.md:71,427) yields false positives for overlapping tags (e.g. 'work' matches 'workout'). No …

### 18. TOCTOU race condition: prepend/append read stale file content

- **Arquivo:** `src/lib/features/deep-link/deep-link.service.ts:211-226, 229-244`
- **Severidade:** medium | **Origem:** fe-src:deep-link+dock-badge+file-history+file-icons+folder-notes

Two windows. (a) exists()->readTextFile(): deletion in between makes readTextFile reject, which is caught at executeAction :160-163 (log + toast) — graceful, not corruption. (b) readTextFile()->writeTextFile(): non-atomic read-modify-write with NO serialization. Dispatch is genuinely concurrent: handleDeepLinkUrl is fired un-awaited per URL (:40-43, :52-56), so two append/prepend deep links to the same file (automation scripts, multi-URL cold start) both read the same baseline and the last write silently drops the other's content. The codebase's own comment at :335-338 states exists-then-write is only race-free when dispatch is serialized (quick-capture listener); the new-action path has no …

### 19. Missing test coverage for exported function registerDeepLinkListener

- **Arquivo:** `src/lib/features/deep-link/deep-link.service.ts:35-65`
- **Severidade:** medium | **Origem:** tests/features/deep-link

Confirmed by repo-wide grep: no test calls registerDeepLinkListener. The onOpenUrl/getCurrent mocks (deep-link.service.test.ts:7-8, race-audit.test.ts:16-17) only satisfy module imports and are never exercised. The function is production code (src/routes/(app)/+layout.svelte:41) with real untested logic: cancellation race (service.ts:44-46, cleanup before onOpenUrl resolves must call fn() or a listener leaks), unlisten on cleanup (line 63), cold-start dispatch incl. null guard (lines 52-56), and two error paths (47-49, 57-59). The repo's own pattern reference, registerMenuSettingsListener, IS fully tested for these exact behaviors (tauri-listeners.service.test.ts:81-153), proving this is a c…

### 20. lifecycle.service.ts has no test file (state-mutating orchestrator untested)

- **Arquivo:** `src/lib/features/properties/lifecycle.service.ts:12-38`
- **Severidade:** medium | **Origem:** cross:test-gap-map

Verified: commitLifecycleChange (lifecycle.service.ts:12-20) writes propertiesStore.setProperties (line 13) AND rewrites note content into the editor via syncExternalContentToEditor (line 18) using extractBody+rebuildContent. No lifecycle.service.test.ts exists in src/tests/lib/features/properties/ and grep shows no test imports this service anywhere; only the pure toggles are covered by lifecycle.logic.test.ts. Callers are LifecycleActions.svelte buttons (lines 21-58). The orchestration that rebuilds frontmatter+body and syncs it into the editor has zero coverage. Downgraded from high: a test gap is not active user-visible breakage, but it leaves a content-rewriting path unguarded against r…

### 21. Search fallback / operator-only path reads the whole vault per query via sync read_files_batch

- **Arquivo:** `src/lib/features/search/search.service.ts:31-43, 197-205, 237-248`
- **Severidade:** medium | **Origem:** cross:ui-blocking

loadVaultContentMap (search.service.ts:31-43) fetches all entries then read_files_batch with ALL vault paths. Called per search execution on operator-only queries (line 200) and on any FTS error (line 242). performSearch is 200ms-debounced per keystroke ((app)/+layout.svelte:180-182), so typing 'tag:javascript' re-reads the entire vault repeatedly. read_files_batch is a sync command (files.rs:22-26: canonicalize + read_to_string per file on the IPC thread); search_fts is also sync (search_index.rs:120) but cheap. The service's own comment estimates 50-200ms per call on a 1944-note vault. Medium: real blocking per keystroke, but only on operator-only queries or FTS failure, not the default te…

### 22. vaultIndexVersion effect fires full get_all_tasks_v2 IPC + remap per bump with no debounce, single-flight, or stale guard

- **Arquivo:** `src/lib/features/tasks/TasksView.svelte:71-76`
- **Severidade:** medium | **Origem:** cross:svelte-reactivity

Verified: effect (TasksView.svelte:71-76) calls buildTaskIndex (tasks.service.ts:54-73) per bump — full get_all_tasks_v2 + remap + setFileTaskGroups, with no debounce/single-flight/version-snapshot. Sibling mitigations exist and are documented as fixes for measured problems: tags.service.ts:76-96 (300ms debounce + single-flight, with a 2026-05-11 log analysis showing 4 concurrent rebuilds at 4527 notes) and backlinks fetchBacklinksV2Inner's lastFetchedBacklinksVersion guard. Watcher bursts emit up to 10 vault-index-updated events (watcher-handler.service.ts:16,125 loops update_note_in_index per file; vault.rs:267-297 emits per call) → 10 overlapping fetches; out-of-order completion lets an o…

### 23. Missing test coverage for syncTodoistTasks function

- **Arquivo:** `src/lib/features/tasks/todoist.service.ts:244-280`
- **Severidade:** medium | **Origem:** tests/features/tasks

Verified: zero test references anywhere (grep over src/tests/ and e2e/); only test file importing the service omits it. Live code at TasksView.svelte:80. This is the riskiest gap: Promise.allSettled partial-failure handling (todoist.service.ts:257-273), deleted-task mapping `task?.checked ?? false` → marks 404'd tasks as not-completed (266-269), skip-on-rejection leaving entries untouched (270-272), unconditional persistence of possibly-partial sync (275), and setSyncing finally-clear (277-279). These semantics could regress silently. Severity lowered from high: missing tests cause no user-visible breakage by themselves; high is reserved for runtime defects.

### 24. Silent error swallowing in loadViewNotes without logging

- **Arquivo:** `src/lib/features/type-definitions/TypeNoteList.svelte:226-228`
- **Severidade:** medium | **Origem:** features/type-definitions

Real throw path exists: getCachedViewDefinition (view-parse-cache.ts:32-36) falls through to refreshViewDefinition:22 which calls Tauri readTextFile — rejects if the .view file is deleted/unreadable. YAML parse errors are handled via parsed.success (TypeNoteList.svelte:182), but readTextFile rejection or an executeQuery throw hits the bare catch at 226-228: no appendLog (used on the success path at 225), no toast. User sees a misleading 'No notes' empty state, and subCounts is left stale (only notes is reset). Violates repo error-handling rules (never silently swallow; surface user-facing errors). Medium: incorrect, undiagnosable behavior in edge cases, no data loss.

### 25. Silent error swallowing in persistViewState without logging

- **Arquivo:** `src/lib/features/type-definitions/TypeNoteList.svelte:243-245`
- **Severidade:** medium | **Origem:** features/type-definitions

updateViewQuery (type-definitions.service.ts:160-166) has no try/catch or logging of its own, so a writeTextFile failure (read-only file, file deleted, disk full) propagates raw to the component, where catch at 243-245 swallows it with zero log/toast. The user's filter/sort change stays in local $state (handleGlobalFiltersChange:248-251 already mutated it) so the UI looks applied, but the YAML write failed — the edit is silently lost on next reload/seed. Note: the sweep's sub-claim about unhandled rejection from loadViewNotes at 242 is wrong (loadViewNotes catches internally at 226-228, its promise never rejects), but the main defect stands. Medium: silent persistence failure in edge cases.

### 26. vaultIndexVersion effect refetches full vault snapshot and restarts the d3 force simulation per bump, resetting graph layout

- **Arquivo:** `src/lib/plugins/graph-view/GraphView.svelte:391-396`
- **Severidade:** medium | **Origem:** cross:svelte-reactivity

Verified: effect (391-396) → loadAndRebuild (71-81) → buildGraph IPC (full get_all_vault_entries_v2 snapshot) → initSimulation, which discards all current node positions (`simNodes = data.nodes.map((n) => ({...n}))`, line 89) and reheats `simulation.alpha(1).restart()` (line 127). No debounce or in-flight guard, so watcher bursts (up to 10 events, see watcher-handler.service.ts:125) fire overlapping fetches with possible out-of-order fullData overwrite. Realistic trigger while the graph tab is visible: a pending 2s-debounced save firing after the user switches to the graph tab, watcher events from external sync, or toggle_task_status — each visibly resets the layout and loses drag positionin…

### 27. Race condition: stale linked file content overwrites newer content

- **Arquivo:** `src/lib/plugins/kanban/KanbanCard.svelte:146-158`
- **Severidade:** medium | **Origem:** plugins/kanban

Real race. The $effect (KanbanCard.svelte:146-158) calls loadLinkedFileContent(text) with no sequence token/cancellation; the .then at :151-153 writes linkedContent in resolution order. loadLinkedFileContent (kanban.service.ts:49-81) is cached per card text, so a re-run for cached text resolves in one microtask while an earlier uncached call is still awaiting readTextFile (:72) — the slow stale result then overwrites the fresh one. Worse: when the wikilink is removed, the else branch (:155) sets linkedContent='' synchronously, but the in-flight promise from the old text later re-populates the preview ({#if linkedContent} at :216) on a card with no wikilink, and nothing corrects it until the …

### 28. selfUpdate latch can permanently skip the next external content sync if a self-write round-trips to identical markdown

- **Arquivo:** `src/lib/plugins/kanban/KanbanView.svelte:64-83, 459-477`
- **Severidade:** medium | **Origem:** cross:svelte-reactivity

Real, but via different triggers than cited: archiveCompletedItems returns the SAME ref when nothing is completed (kanban.logic.ts:336), so the === guard (KanbanView.svelte:79) blocks it. However setViewMode (kanban.logic.ts:705-707) and updateBoardSettings (kanban.logic.ts:368-373) always return new objects with no same-value guard in callers: clicking the already-active view button (KanbanView.svelte:459-477) or a zero-delta lane resize (KanbanLane.svelte:206-210 always fires onLaneWidthChange) serialize to identical markdown once those settings keys exist. onContentChange -> editorStore.updateContent (editor.store.svelte.ts:86) writes an equal string; Svelte 5 source equality skips notifi…

### 29. distinct() without key fails to deduplicate objects

- **Arquivo:** `src/lib/plugins/queryjs/data-array.ts:199-213`
- **Severidade:** medium | **Origem:** plugins/queryjs

data-array.ts:201 uses `new Set(this._values)` — SameValueZero/reference equality, so structurally equal objects are never deduped. Realistic trigger: queryjs.logic.ts:131-137 builds a fresh KBLink object per wikilink (`{ path, display }`), so `page.file.outlinks.distinct()` — the canonical Dataview idiom this plugin emulates (dv alias in kb-api.ts) — silently returns duplicate links to the same target; Dataview dedupes these by value. Tests (src/tests/lib/plugins/queryjs/data-array.test.ts:275-285) only cover primitives without key. Workaround exists (`.distinct(l => l.path)`), primitives work, no corruption — incorrect results only in the object-without-key case, hence medium not high.

### 30. Timezone mismatch in heatmapCalendar between entry parsing and day computation

- **Arquivo:** `src/lib/plugins/queryjs/kb-ui.ts:686 (root cause); 961-967`
- **Severidade:** medium | **Origem:** plugins/queryjs

Confirmed, and broader than claimed: kb-ui.ts:686 feeds a LOCAL-midnight Date (`new Date(e.date+'T00:00')`) into getDayOfYear (kb-ui.ts:961-967) which reads getUTC* components. In any UTC-positive timezone local midnight is the previous UTC day, so EVERY entry shifts one cell earlier, not just year boundaries. Node experiment (TZ=Europe/Berlin): '2026-03-05' → day 63 (Mar 4); '2026-01-01' → day 365 = renders on the Dec 31 cell of the displayed grid. UTC-negative timezones are unaffected. Cited lines 660 and 698-701 are actually correct (local-consistent filter; timezone-independent calendar facts). Sibling yearlyCalendar (840-842) handles it correctly via local getMonth()/getDate(). Visualiz…

### 31. Missing assertions on TS-side index updaters in notifyAfterSave

- **Arquivo:** `src/tests/lib/core/editor/editor.hooks.test.ts:101-237 (notifyAfterSave describe block)`
- **Severidade:** medium | **Origem:** tests/core/editor

hooks.ts:170-175 calls updateNoteInIndex/updateFrontmatterIconForFile/updateCalendarForFile inside the dedup guard. editor.hooks.test.ts mocks only $lib/utils/debug and invoke (lines 3-14), so the real services run (collection.service.ts:93-103 -> collectionStore; file-icons.service.ts:204-232 -> fileIconsStore; calendar.service.ts:90-110 -> calendarStore) but no test asserts those stores. The test 'TS dedup STILL skips the TS indexers' (hooks.test.ts:203-215) only counts invoke() calls and none of the three updaters call invoke, so it verifies nothing about them. index-updater.service.test.ts covers a different call site (updateIndexesForFile). Deleting hooks.ts:172-174 fails zero tests; ve…

### 32. Missing test coverage for frontmatterChanged parameter in onContentChange

- **Arquivo:** `src/tests/lib/core/editor/editor.service.test.ts:320-401 (onContentChange describe block); mock at 28-45`
- **Severidade:** medium | **Origem:** tests/core/editor

onContentChange at src/lib/core/editor/editor.service.ts:180-189 branches on frontmatterChanged: true -> debouncedSave.cancel() + debouncedSaveFrontmatter() (500ms, line 177); false -> debouncedSaveFrontmatter.cancel() + debouncedSave() (2000ms, line 174). Repo-wide grep: 'frontmatterChanged' appears in ZERO test files, so the true branch is fully untested. Worse, the debounce mock at editor.service.test.ts:28-45 makes both instances identical immediate-fire wrappers, so the 500ms/2000ms distinction and the mutual-cancel interplay are unobservable without reworking the mock (e.g. tagging instances by delay or using fake timers with the real debounce). CLAUDE.md documents this dual-timer beha…

### 33. maybeAutoCheckForUpdates not tested despite being a public async function

- **Arquivo:** `src/tests/lib/core/settings/update-check.service.test.ts:1-12`
- **Severidade:** medium | **Origem:** tests:settings+status-bar+trash+vault+zoom

Confirmed. update-check.service.test.ts (12 lines) only tests the trivial shouldAutoCheckNow wrapper. maybeAutoCheckForUpdates (update-check.service.ts:57-80) invokes check_for_update_on_channel, writes settingsStore.updateUpdates({lastCheckedAt}), persists via saveSettings with its own catch (67-69), shows toast on update found (71-76), and swallows errors by design (77-79). Grep over src/tests shows no test anywhere exercises it. Violates the repo rule that every suite needs happy path + error handling, and store-write behavior (lastCheckedAt) is unverifiable by regression. Downgraded from high to medium: a missed regression affects only the auto-update-check toast/timestamp, not core flow…


## Low (63)

### 1. Embedding bytes deserialization silently truncates malformed data

- **Arquivo:** `src-tauri/src/commands/semantic.rs:94-98`
- **Severidade:** low | **Origem:** rust-src:commands+db

Mechanism verified: get_or_load_cache at semantic.rs:94-98 deserializes via chunks_exact(4), silently dropping remainder bytes; the DB layer stores arbitrary-length blobs verbatim (proven by the repo's own audit tests at semantic_repo.rs:675-714, which document this as known-unfixed finding #12). Downstream impact is bounded: cosine_similarity (semantic/embedder.rs:386-389) returns 0.0 on length mismatch — no panic, no wrong ranking; the corrupt chunk just silently never matches any query and nothing is logged. Trigger requires already-corrupt DB bytes (the embedder always emits dim*4 bytes). Downgraded medium→low: graceful-but-silent degradation under DB corruption only; the fix is a length…

### 2. TOCTOU race condition in create_note: exists check then write

- **Arquivo:** `src-tauri/src/commands/vault.rs:893-897`
- **Severidade:** low | **Origem:** rust-src:commands+db

Real race: vault.rs:894-896 checks Path::exists(), vault.rs:897 then calls std::fs::write (which truncates). A file created in the gap (concurrent create_note IPC double-fire, sync client, Finder) is silently overwritten instead of returning the promised 'File already exists' error. The doc comment at vault.rs:874 even claims 'Atomically creates'. Correct fix is OpenOptions::create_new(true). Downgraded to low: the window is microseconds in a single-user desktop app, and exploitation requires an external writer hitting the exact same absolute path inside that window; worst case overwrites a file that appeared milliseconds earlier.

### 3. commands/vault.rs: most *_v2 IPC command wrappers have no command-layer test

- **Arquivo:** `src-tauri/src/commands/vault.rs:401-660, 794-855, 936-978, 1041, 1253`
- **Severidade:** low | **Origem:** cross:test-gap-map

Verified: grep for every listed *_v2 command name over src-tauri/tests = 0 hits, while the underlying VaultIndex lookups are thoroughly tested (vault_index_test.rs, e.g. lookup_backlinks suite at 291-334, match_unlinked_mentions at 1585+). The wrappers are genuinely thin: acquire read lock -> idx.lookup_*() -> Ok (e.g. get_backlinks_v2 at 401-410). Two carry minor extra logic: get_all_vault_entries_v2 path-sort (485-486) and get_unlinked_mentions_v2's 3-phase lock/spawn_blocking/title-sort orchestration (514-546). Testing them directly requires tauri::State, and Cargo.toml line 22 does not enable tauri's 'test' feature, so command-layer tests need new infra for marginal value. Low is correct…

### 4. Silent error dropping in semantic_repo get_chunk_hashes_for_path

- **Arquivo:** `src-tauri/src/db/semantic_repo.rs:142`
- **Severidade:** low | **Origem:** rust-src:commands+db

Verified: semantic_repo.rs:142 uses .filter_map(|r| r.ok()) with no logging, while sibling readers in the same file log skipped corrupt rows (load_all_embeddings at 171-177, get_distinct_sources at 191-197, get_sample_chunks at 301-307). Trigger is rare (rusqlite type-mismatch on a TEXT column, i.e. real DB corruption) and the failure mode is self-healing: a missing hash entry causes update_semantic_file's content-hash comparison to miss, so the chunk is re-embedded and re-inserted. Net effect is one wasted embedding pass with no diagnostic signal. Consistency/observability defect only; low is correct.

### 5. Silent error dropping in semantic_repo delete_orphaned_mtimes

- **Arquivo:** `src-tauri/src/db/semantic_repo.rs:236`
- **Severidade:** low | **Origem:** rust-src:commands+db

Verified: semantic_repo.rs:233-237 collects keys via .filter_map(|r| r.ok()) without logging, unlike load_all_embeddings (171-177). Same pattern class as the get_chunk_hashes_for_path finding but a distinct site with a distinct failure mode, so not a duplicate: a corrupt key row is skipped, leaving an orphaned mtime: entry in semantic_meta indefinitely (a few bytes of stale metadata, no functional impact — the orphan check simply runs again next cleanup). Note get_stored_mtimes at line 56 (rows.flatten()) shares the same silent pattern. Observability nit; low.

### 6. 11 of 62 registered commands are dead IPC surface (never invoked from src/), several still documented as the active read path in CLAUDE.md

- **Arquivo:** `src-tauri/src/lib.rs:289, 301, 303, 307-309, 316, 321, 333-334, 339-340`
- **Severidade:** low | **Origem:** cross:ipc-contract

Verified by grep over all of src/: zero production invoke sites for scan_vault_v2, get_notes_with_tag_v2, get_tasks_in_path_v2, query_notes_by_property, get_property_values, get_note_properties, search_vault, get_search_index_stats, debug_semantic_embeddings, shutdown_semantic, capture_clipboard_now, open_composer (12 listed, not 11; only doc-comments in vault-v2.types.ts mention some). Production uses scan_vault_v2_cached (backlinks.service.ts:63); the global shortcut calls capture_clipboard_now_with/show_composer directly (lib.rs:19, 60-79), bypassing the commands. CLAUDE.md items 1 and 4 are stale as claimed. Overlaps finding 1 on shutdown_semantic but root cause differs (dead surface vs …

### 7. semantic/reranker.rs has neither inline #[cfg(test)] nor integration test references

- **Arquivo:** `src-tauri/src/semantic/reranker.rs:1-168 (model-free testable: load() error paths 39-48)`
- **Severidade:** low | **Origem:** cross:test-gap-map

Gap is real: no #[cfg(test)] in reranker.rs while chunker/embedder/model/filtering/types all have one, and grep 'rerank' over src-tauri/tests = 0 files. But the sweep over-states testability: Reranker holds a concrete ort::Session with private fields and can only be built via Session::builder().commit_from_file (lines 57-64), so rerank()'s batching loop (108-115), the empty-docs early return (102-104), and with_batch_size (91-94, takes self) all require real ONNX assets — same constraint that limits embedder.rs tests to pure helpers (validate_dimensions/cosine), and reranker has no pure helpers. The only model-free testable surface is load()'s two missing-file error branches (43-48). Practic…

### 8. Exported function `collect_markdown_paths_with_metadata` not covered by tests

- **Arquivo:** `src-tauri/src/utils/fs.rs:65-72, 206-267`
- **Severidade:** low | **Origem:** rust-src:utils+vault+vault

Narrower than claimed but real. The function IS exercised indirectly: collect_v2_entries (src-tauri/src/commands/vault.rs:165-166) calls it and has ~10 tests in tests/commands/vault_test.rs:281-440 covering empty vault, multi-file/subdir collection, error paths, and mtime (v2_modified_at_is_seconds_since_epoch_and_recent, 412-421). However the metadata-specific outputs ctime (fs.rs:255-260) and size (fs.rs:261) are asserted NOWHERE: vault_test.rs:130-136 created_at tests target scan_vault's separate FileNode walk; vault_file_ops_test.rs:40 size goes through update_note_in_index_inner's own fs::metadata read (vault.rs:262); vault_cache_test.rs builds entries by hand; load_vault_from_cache (va…

### 9. remove_entry missing promoted path from affected set

- **Arquivo:** `src-tauri/src/vault/index.rs:1046-1091`
- **Severidade:** low | **Origem:** rust/vault#2

Omission is real: the promotion block (index.rs:1046-1084) mutates backlinks[surviving_path] (1074-1082) but only the targets_to_clean loop inserts into affected (988), violating the field's documented contract (index.rs:32-36 'paths whose backlinks set was modified'). However the sweep's evidence is wrong on two counts. (1) update_entry is NOT inconsistent: its retro-backlinks block (478-514) also never adds the target path to affected — lines 508-513 insert into self.backlinks, and affected (521-523) is only the removed/added outgoing-target diff. (2) No notification is lost: remove_note_from_index (commands/vault.rs:948) emits vault-index-updated with changed=true (entry was present), and…

### 10. Weak file_name assertion doesn't verify expected result count

- **Arquivo:** `src-tauri/tests/commands/search_test.rs:85-100`
- **Severidade:** low | **Origem:** tests/rust#1

Accurate but minor. Per src-tauri/src/commands/search.rs:75-78 both note.md and note.markdown strip to display name 'note', so `file_names.contains(&"note")` (line 98) passes whenever either file is found — it discriminates nothing. The load-bearing assertion is `results.len() == 2` (line 96), which catches both realistic single regressions (.txt wrongly searched → len 3; .markdown wrongly skipped → len 1). Only a combined double regression {include .txt, exclude .markdown} would slip through (file_names ['note','note.txt'] still satisfies contains). Stronger form: assert all file_names == 'note'. Test-quality nit only; severity low as sweep rated.

### 11. Test simulates sequential behavior when claiming to test concurrent locking

- **Arquivo:** `src-tauri/tests/db_concurrent_test.rs:97-152`
- **Severidade:** low | **Origem:** tests/rust#1

Accurate: the test commits conn_a (line 134) before conn_b ever runs BEGIN IMMEDIATE (line 137), so the busy_timeout wait path is never exercised and the assertions at lines 150-151 pass for any plain sequential writes. The doc comment at lines 100-101 ('Two threads race... the second one waits via busy_timeout') is misleading; the in-body comment at 121-123 even admits the simulation. Downgraded to low because the sweep missed `immediate_transactions_survive_threaded_contention` (lines 159-220) in the same file, which spawns two threads with a Barrier, runs 20 BEGIN IMMEDIATE transactions each, and asserts all 40 writes land — that test DOES cover real concurrent serialization, so this is a…

### 12. Relative-path fallback passes absolute paths into the vault-relative-keyed FTS/semantic commands when the changed path doesn't share the vaultPath prefix

- **Arquivo:** `src/lib/core/app-lifecycle/watcher-handler.service.ts:113-115, 131, 138, 155`
- **Severidade:** low | **Origem:** cross:ipc-contract

Mechanism verified: read_files_batch returns the INPUT path verbatim (files.rs:40/64) while validating against the canonicalized root (files.rs:30,36-48), so a canonicalized watcher path (notify/FSEvents resolves symlinks; watcher.rs:234-235 forwards raw event paths, and is_inside_hidden_dir keeps non-prefix paths, watcher.rs:74-77) survives with a spelling that fails startsWith(vaultPath) → fallback keeps the absolute path. update_search_index_file_inner keys FTS rows verbatim (search_index.rs:171-177), producing rows that double-join at search.service.ts:220. One correction: update_semantic_file does NOT necessarily error — update_stored_mtime does vault_root.join(file_path) (semantic.rs:1…

### 13. resetEditor() cancels only one of the two auto-save debounce timers

- **Arquivo:** `src/lib/core/editor/editor.service.ts:398-402`
- **Severidade:** low | **Origem:** cross:ui-blocking

Verified: resetEditor (:399) cancels only debouncedSave; debouncedSaveFrontmatter (:177) is left running, contradicting the doc comment 'Cancels any pending auto-saves' (:393). Mitigations confirmed line-by-line: the SOLE caller is teardownVault (app-lifecycle.service.ts:410), and the only teardown path runs await saveAllDirtyTabs() first (app-lifecycle.service.ts:119→121), which cancels BOTH timers (editor.service.ts:203-204). Even if a frontmatter edit re-arms the 500ms timer between those calls, the stale saveDirtyTabs reads live post-reset store state (tabs cleared by editorStore.reset(), new-vault tabs open clean) → no-op. Latent contract inconsistency, fragile to reordering; no user im…

### 14. saveDirtyTabs failure retry loop is unbounded and toasts every 5s

- **Arquivo:** `src/lib/core/editor/editor.service.ts:157-171, 150-154`
- **Severidade:** low | **Origem:** cross:ui-blocking

Verified: on any failed save, setTimeout(saveDirtyTabs, 5000) (:168-170) retries forever with no cap or backoff; each attempt re-runs saveFileByPath whose catch fires toast.error('Failed to save file.') (:152) — one toast per failing tab per 5s indefinitely for persistent failures (read-only file, disk full). The timer id is never stored, so resetEditor/teardown cannot cancel it (it only self-terminates because post-reset tabs are empty). Worse than stated: each debouncedSave fire during a failing period spawns an additional parallel retry chain, multiplying toasts. Low: error-path-only, data-preserving intent, user must intervene anyway; spam is annoyance not breakage.

### 15. File explorer renders the whole expanded tree with no virtualization; watcher batches replace the entire tree

- **Arquivo:** `src/lib/core/file-explorer/FileExplorer.svelte:278-280 (FileTreeItem.svelte:293-296, fs.watcher.ts:158-195)`
- **Severidade:** low | **Origem:** cross:ui-blocking

Verified mechanics: FileExplorer.svelte:278-280 renders every root node; FileTreeItem.svelte:293-296 recurses into every EXPANDED dir (collapsed dirs render nothing) — so thousands of root-level or expanded files mean thousands of live DOM nodes with per-node $derived subscriptions, no windowing. fs.watcher.ts: each debounced batch runs attachFileCounts(currentTree) O(all nodes) + fsStore.setFileTree (:194-195) forcing a keyed diff of the root array (keyed each limits actual re-renders to changed-reference subtrees); >5 unique parents (:158) falls back to refreshTree → sync `pub fn scan_vault` full-vault walk (vault.rs:72). Real scalability ceiling for large vaults, no incorrect behavior, no…

### 16. fs.store.svelte.ts: getter contentOrder has no test

- **Arquivo:** `src/lib/core/filesystem/fs.store.svelte.ts:37`
- **Severidade:** low | **Origem:** cross:test-gap-map

Verified: get contentOrder() at fs.store.svelte.ts:37 and setContentOrder at line 41; 'contentOrder' has 0 matches in fs.store.test.ts while all 8 sibling getters (fileTree, selectedFilePath, isLoading, expandedDirs, sortBy, renamingPath, pendingCreationPath, folderOrder) are asserted at test lines 10-17 and in mutation suites. contentOrder is consumed in tauri-listeners.service.ts:96-101 for the orderChanged comparison that triggers loadDirectoryTree. Pass-through accessor + trivial setter, no derivation logic, so low severity despite the parity gap.

### 17. frontmatterField + frontmatterGutter build a LineInfo array for the whole doc per keystroke, even with no frontmatter

- **Arquivo:** `src/lib/core/markdown-editor/extensions/live-preview/plugins/frontmatter-field.ts:11-27, 38-44, 50-64`
- **Severidade:** low | **Origem:** cross:ui-blocking

computeFrontmatter (frontmatter-field.ts:12) calls getAllLines (get-all-lines.ts: one object per doc line) BEFORE findFrontmatterBlock, which bails at lines[0] if no opening fence (frontmatter.ts:106-107). The StateField re-runs on every tr.docChanged (frontmatter-field.ts:38); frontmatterGutter (gutterLineClass.compute(['doc']) at :50-64) repeats the identical full-doc getAllLines per doc change — 2x O(lines) allocations per keystroke for a guaranteed-empty result on fence-less docs. Verified the same pattern in block-comment-field, meta-bind-button-field, audio-plugin, video-plugin, mermaid-field, collection-block-field, queryjs-block-field. GC pressure only; low.

### 18. Performance issue: full document scan per reference image in image-plugin

- **Arquivo:** `src/lib/core/markdown-editor/extensions/live-preview/plugins/image-plugin.ts:79-99, 147`
- **Severidade:** low | **Origem:** core/markdown-editor#3

Mechanism is real: resolveRefUrl (image-plugin.ts:83) calls syntaxTree(state).iterate with no from/to bounds — full-doc walk with no early abort (returning false from enter only skips children). Called at :147 per reference image inside buildImageDecorations, which reruns on every doc change/cursor-line change (update(), :62-73). So N visible ![alt][ref] images cost N full-tree walks per keystroke; a label→URL map built once per call would fix it. Downgraded to low: reference-style image syntax is rare in note-taking content (users write inline ![](url) or ![[embed]]), the Image scan itself is viewport-bounded via expandedVisibleRanges, and one tree iterate is comparable to the full-doc scan…

### 19. Dead code: unused instance variables in queryjsBlockField

- **Arquivo:** `src/lib/core/markdown-editor/extensions/live-preview/plugins/queryjs-block-field.ts:60-61, 65`
- **Severidade:** low | **Origem:** core/markdown-editor#3

Grep across src/ shows `lastDocContent` exists only at queryjs-block-field.ts:60 (declaration) and :65 (write in constructor) — never read; `lastCursorInBlock` exists only at :61 — never read or written after init. update() (lines 67-85) uses only `lastCursorLine` + `checkUpdateAction`. Minor extra cost: line 65 runs `view.state.doc.toString()` and retains a full document copy per plugin instance, never refreshed in update(). Pure dead code; severity low.

### 20. Missing test file for queryjs-block-field plugin

- **Arquivo:** `src/lib/core/markdown-editor/extensions/live-preview/plugins/queryjs-block-field.ts:1-88`
- **Severidade:** low | **Origem:** core/markdown-editor#3

Verified: src/tests/lib/core/markdown-editor/extensions/live-preview/plugins/ has test files for all 15 sibling plugins (code-block-field, collection-block-field, mermaid-field, etc.); queryjs-block-field.test.ts is the sole missing one among 16 source plugins. No test anywhere references computeQueryjsBlocks or queryjsBlockField (grep over src/tests: zero hits). Untested branches: the two early returns in update() at :68 and :73 (the second one — skip when !docChanged && !selectionSet — is unique to this plugin and silently drops forceDecorationRebuild) and the shouldShowSource-gated decoration build (:24-39). Violates the repo's mirrored-test convention; severity low since it is a coverage…

### 21. queryjsBlockField rescans the entire doc on every keystroke/cursor-line move; lastDocContent cache is dead code

- **Arquivo:** `src/lib/core/markdown-editor/extensions/live-preview/plugins/queryjs-block-field.ts:59-85`
- **Severidade:** low | **Origem:** cross:ui-blocking

queryjs-block-field.ts:59-60 declares lastDocContent ('Cached doc content hash to skip redundant rebuilds'); :65 assigns it via view.state.doc.toString() (an O(doc) string per editor mount/reconfigure). Repo-wide grep confirms it is never read anywhere — the documented skip never executes. update() (:67-85) calls computeQueryjsBlocks(update.state) on every docChanged and cursor-line change; computeQueryjsBlocks (:13-48) walks getAllLines over the full document even for docs with zero queryjs fences. Dead code + redundant O(lines) scan per keystroke; impact is GC pressure on large docs only → low.

### 22. Test gap: createMetaBindSelect function and MetaBindSelectWidget not tested

- **Arquivo:** `src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:726-779, 782-807`
- **Severidade:** low | **Origem:** core/markdown-editor#4

Evidence overstated but gap is real. Partial coverage exists: e2e/specs/live-preview/meta-bind.spec.ts (:21-79) asserts the select renders, reflects frontmatter value, toggles to source; plugins/meta-bind-input-plugin.test.ts verifies widget decoration creation. But no unit test references createMetaBindSelect or MetaBindSelectWidget (grep of src/tests returns nothing), while sibling Number/Date/Toggle widgets ARE unit-tested in meta-bind-input-widgets.test.ts:71-138. Critically, the change handler at widgets.ts:761-776 — which rewrites the entire frontmatter region (dispatch from 0 to frontmatterEnd) — is untested anywhere, including e2e (no test selects an option and asserts the doc update…

### 23. KaTeX/mermaid render caches grow unbounded for the whole vault session

- **Arquivo:** `src/lib/core/markdown-editor/extensions/live-preview/widgets/block-math-widget.ts:10-15 (also mermaid-widget.ts:36-41, inline-math-widget.ts:10-15)`
- **Severidade:** low | **Origem:** cross:ui-blocking

Factually true: mathCache (block-math-widget.ts:10), inlineMathCache (inline-math-widget.ts:10), mermaidCache (mermaid-widget.ts:36) are uncapped Maps cleared only at vault teardown (app-lifecycle.service.ts:406-409). But the sweep overstates growth: intermediate states while typing are NOT cached — block-math-field.ts:17-18 shouldShowSource shows raw source while the cursor is inside, so no widget/cache insert occurs during editing; entries are added only per cursor-out render (the edit-preview loop adds one entry per preview cycle). This string-cache-per-content scheme is the documented intentional design (CLAUDE.md Live Preview rule 2). Realistic accumulation is KB-scale KaTeX entries plu…

### 24. Dead code in dispatchLanguageChange: ternary always inserts newLanguage regardless of condition

- **Arquivo:** `src/lib/core/markdown-editor/extensions/live-preview/widgets/code-block-widget.ts:176`
- **Severidade:** low | **Origem:** core/markdown-editor#4

Line 176 is exactly `range.languageFrom === null ? newLanguage : newLanguage` — the condition has no effect. However, there is NO behavioral bug: insert-vs-replace is already handled by from/to at :174-175 (`languageFrom ?? openFenceTo` / `languageTo ?? openFenceTo`), so a tagless fence inserts newLanguage at end-of-fence-line (producing ```lang) and a tagged fence replaces [languageFrom, languageTo]. Verified openFenceTo = openLine.to in parsers/fenced-code-block.ts:89. So this is dead/no-op code (likely a refactor leftover), not the medium-severity logic bug the sweep implied. Cosmetic cleanup only.

### 25. Test gap: wikilinkCompletionSource and builder functions not tested

- **Arquivo:** `src/lib/core/markdown-editor/extensions/wikilink/completion.ts:80, 99, 164, 216`
- **Severidade:** low | **Origem:** core/markdown-editor#4

Partially overstated: e2e/specs/wikilink-completion.spec.ts covers wikilinkCompletionSource + buildFileCompletions happy paths (tooltip opens on `[[`, narrowing, apply inserts `Name]]`). But buildHeadingCompletions (:164), buildBlockIdCompletions (:216), and the alias branch of buildFileCompletions (:121-150, incl. the ensureEntriesCached IPC cache at :32-47) have zero coverage in unit or e2e tests (e2e wikilink-anchors.spec.ts is navigation-only; grep of src/tests for wikilinkCompletionSource returns nothing; completion.logic.test.ts covers only the pure logic). Gap is real but narrower than claimed and guards autocomplete convenience, not data integrity — low severity.

### 26. wikilinkCompletionSource materializes the full document string on every keystroke

- **Arquivo:** `src/lib/core/markdown-editor/extensions/wikilink/completion.ts:80-85`
- **Severidade:** low | **Origem:** cross:ui-blocking

completion.ts:82 does state.doc.toString() before detectWikilinkContext, which only inspects the current line (completion.logic.ts:28-29: lastIndexOf('\n', pos-1) + substring). Registered in the single autocompletion override with activateOnTyping (editor-extensions.ts:76-79), so it runs per typed character. CM Text.toString() = sliceString(0), uncached (verified in @codemirror/state dist:106). Real defect — the sibling dateShortcutCompletionSource uses lineAt — but downgraded to low: a single O(doc) allocation per completion query, throttled by cm-autocomplete's activation scheduling; user-visible impact only on multi-MB docs. One-line fix: state.doc.lineAt(pos).

### 27. Memory leak: semantic progress listener not stopped on error in handleToggle

- **Arquivo:** `src/lib/core/settings/sections/SearchSection.svelte:86-93`
- **Severidade:** low | **Origem:** core/settings#1

Real but minor. The catch (SearchSection.svelte:86-93) disables semantic search (line 89) yet omits stopSemanticProgressListener(), breaking the codebase invariant 'listener active iff semantic enabled': the symmetric disable-on-failure paths at app-lifecycle.service.ts:298 and :313 DO stop it, as does the toggle-off branch at SearchSection.svelte:96. However it is NOT a memory leak: start is an idempotent singleton (search.service.ts:90 'if (progressUnlisten) return') so repeated failures never accumulate listeners; semantic-index-progress is emitted only by download/build commands (semantic.rs) which never run while disabled; stale searchStore.semanticProgress renders nowhere (SearchStatus…

### 28. untrack() wraps the entire effect body: effect has zero dependencies and never re-runs, hiding the vaultStore.path dependency

- **Arquivo:** `src/lib/core/settings/sections/SearchSection.svelte:36-38`
- **Severidade:** low | **Origem:** cross:svelte-reactivity

Verified: the whole body is untracked, so the effect registers zero deps and runs once per mount (onMount in disguise), while refreshRerankerStatus (26-34) reads vaultStore.path and silently no-ops when null. The null-path mount is reachable: AppOverlays + the menu:settings listener are registered unconditionally in (app)/+layout.svelte (lines 33, 188) and the vault picker (+page.svelte) renders with vaultStore.path null, so Settings → Search can mount before any vault is open; rerankerAvailable then stays false until the section remounts. Mitigating: SettingsPanel.svelte:142 conditionally renders the section, so navigating away and back remounts and refreshes — staleness is bounded. Edge-ca…

### 29. settings.store.svelte.ts: 5 computed getters have no test (violates 'every computed getter must have a test')

- **Arquivo:** `src/lib/core/settings/settings.store.svelte.ts:147-154`
- **Severidade:** low | **Origem:** cross:test-gap-map

Verified: getters debugHeartbeat (147), livePreviewProfiling (148), disabledDecorators (149), explicitOrganization (153), showUntypedNotes (154) exist and grep of settings.store.test.ts returns 0 matches for all five. Also untested: their mutators updateDebugHeartbeat (297), updateLivePreviewProfiling (302), and toggleDecorator (307) — the latter has real merge logic gating the documented live-preview decorator kill-switch. Nuance: these are pass-through accessors, not computed getters, so the cited rule is a stretch; the genuine gap is the untested mutation methods. Downgraded to low: trivial accessors plus simple-spread mutators, no derivation logic to regress.

### 30. Service error silently swallowed in buildPropertyIndex

- **Arquivo:** `src/lib/features/collection/collection.service.ts:65-79 (catch at 76-78)`
- **Severidade:** low | **Origem:** features/collection#1

Catch at collection.service.ts:76-78 logs but never rethrows, so the Promise always resolves — violates the 'log + rethrow' service rule. But the sweep over-rates it: (1) the error IS logged via errorLog, not silent; (2) setPropertyIndex at :73 runs only after invoke succeeds, so on error the store is untouched and isIndexReady stays false (store :14-16) — explicitly enshrined by test 'swallows IPC errors and leaves the store untouched' (src/tests/lib/features/collection/collection.service.test.ts:86-96); (3) both prod callers are fire-and-forget: watcher-handler.service.ts:74 doesn't await (its try/catch can't see async rejections), app-lifecycle.service.ts:252 has no .catch — rethrowing to…

### 31. file-icons.store.svelte.ts: getter packVersion has no test

- **Arquivo:** `src/lib/features/file-icons/file-icons.store.svelte.ts:20`
- **Severidade:** low | **Origem:** cross:test-gap-map

Verified: get packVersion() at file-icons.store.svelte.ts:20; case-insensitive grep for 'packversion|bumppack' in file-icons.store.test.ts returns 0 matches, so the getter, bumpPackVersion() (line 38), and reset()'s packVersion=0 (line 57) are all uncovered while recentIcons/frontmatterIcons are tested. The counter is a reactive re-render signal for icon consumers after pack loading. Pass-through accessor and a one-line increment; a regression would be cosmetic (stale icons until next render). Low severity.

### 32. No test file for lifecycle-filter.service.ts

- **Arquivo:** `src/lib/features/properties/lifecycle-filter.service.ts:1-11`
- **Severidade:** low | **Origem:** tests/features/properties

Verified: no lifecycle-filter.service.test.ts exists anywhere in src/tests (lifecycle-filter.logic.test.ts and lifecycle-filter.store.test.ts do exist). refreshArchivedPaths (lines 7-11) also has no try/catch around invoke, violating the error-handling convention — a mandated error-handling test would have caught it. Mitigations keeping this low: the sole production caller (tauri-listeners.service.ts:92) always passes entries, so the invoke branch never executes in the app today and the caller wraps its own fetch in .catch (line 103); the pure logic and store are independently tested. 3-line untested orchestration with a dormant convention violation: low.

### 33. lifecycle-filter.service.ts has no test file

- **Arquivo:** `src/lib/features/properties/lifecycle-filter.service.ts:7-11`
- **Severidade:** low | **Origem:** cross:test-gap-map

Verified: no test file for the service; src/tests/lib/features/properties/ contains only lifecycle-filter.logic.test.ts and lifecycle-filter.store.test.ts. However the untested surface is small: buildArchivedPathSet (logic) and setArchivedPaths (store) are each tested in isolation; the service is 5 lines of glue. Its single caller (tauri-listeners.service.ts:92) always passes entries, so the fetch-fallback branch is currently unreachable in production. Downgraded to low: the gap is real per repo convention but the uncovered code is trivial glue plus a dead branch.

### 34. invoke() not wrapped in try/catch in lifecycle-filter.service.ts (violates error-handling convention)

- **Arquivo:** `src/lib/features/properties/lifecycle-filter.service.ts:8`
- **Severidade:** low | **Origem:** cross:test-gap-map

Verified: line 8 calls invoke('get_all_vault_entries_v2') with no try/catch and no log-before-rethrow, violating the documented convention. Mitigating facts traced: the ONLY caller (tauri-listeners.service.ts:92) always passes entries, so the invoke branch never executes today; when entries are provided nothing in the function can reject; and the store is never written on error (rejection happens before setArchivedPaths). Risk is latent: a future caller omitting entries would get an unlogged rejection, and fire-and-forget call sites would produce an unhandled promise rejection. Downgraded to low: convention violation in a currently-unreachable branch.

### 35. No test file for lifecycle.service.ts

- **Arquivo:** `src/lib/features/properties/lifecycle.service.ts:1-39`
- **Severidade:** low | **Origem:** tests/features/properties

Verified: src/tests/lib/features/properties/ has lifecycle.logic.test.ts but no lifecycle.service.test.ts, and a repo-wide grep finds no test importing lifecycle.service or setOrganized/setArchived/setFavorite. The service is user-facing orchestration (LifecycleActions.svelte:21-58 buttons -> store write + syncExternalContentToEditor), and repo convention mandates service tests. Mitigation: the actual toggle logic is covered in lifecycle.logic.test.ts and commitLifecycleChange (lines 12-20) is an 8-line mirror of the tested commitChanges. Note it omits skipNextParse (unlike properties.service:43) — untested divergence a test would document. Process gap, no incorrect behavior shown: low.

### 36. upsertProperty uses literal key matching instead of canonical

- **Arquivo:** `src/lib/features/properties/properties.service.ts:63-77 (find at 68)`
- **Severidade:** low | **Origem:** tests/features/properties

Mechanism is real: line 68 literal find misses a canonical twin; the append branch (line 74) creates a duplicate, and dedupeCanonicalKeys (properties.logic.ts:238-243) keeps the FIRST populated value, silently dropping the new write from the serialized file (logged, store collapses on next re-parse). But it is unreachable today: the only caller is PropertiesView.svelte:70 with fixed keys _belongs_to/_related_to/_has_many, none in ALIAS_MAP (frontmatter-aliases.ts:6-23), so literal == canonical for every actual input. Commit 4a0831b hardened the alias-bearing paths (addNewProperty, renameProperty, setPropertyByBindTarget) and left upsert literal. Latent API hazard, not high — downgrade to low…

### 37. updateProperty does not canonicalize keys before matching

- **Arquivo:** `src/lib/features/properties/properties.service.ts:53-60 (logic at properties.logic.ts:343)`
- **Severidade:** low | **Origem:** tests/features/properties

Literal matching is real: updatePropertyValue (properties.logic.ts:342-345) compares p.key !== key, so an alias-vs-canonical mismatch is a silent no-op. But every caller passes a key that exactly matches the store: PropertyField forwards property.key verbatim (PropertyField.svelte:57-83); PropertiesView:72/83 use un-aliased relationship keys; PropertiesView:201 uses '_type', and that selector only renders when the store literally holds '_type' (derived at PropertiesView.svelte:87). Store keys are canonicalized at parse (properties.logic.ts:146). No reachable mismatch; sibling of the upsert finding (same module, different code site/failure mode). Latent hazard, low.

### 38. quick-switcher.service.ts untested and mocked away in the only test that touches it

- **Arquivo:** `src/lib/features/quick-switcher/quick-switcher.service.ts:4-6`
- **Severidade:** low | **Origem:** cross:test-gap-map

Verified: no quick-switcher.service.test.ts exists (src/tests/lib/features/quick-switcher/ has only logic+store tests); app-lifecycle.service.test.ts:150-151 mocks the module and line 456 asserts only toHaveBeenCalled(). So teardownVault (app-lifecycle.service.ts:426) -> real quickSwitcherStore.reset() is never verified end-to-end. Mitigations: quickSwitcherStore.reset() itself IS tested (quick-switcher.store.test.ts:124-129), and mocking a side-effect service in app-lifecycle tests is permitted by the repo's mock rules. The uncovered code is a one-line delegation; low severity.

### 39. TS SemanticProgress.phase union omits the 'downloading-reranker' phase emitted by Rust

- **Arquivo:** `src/lib/features/search/search.types.ts:74-79`
- **Severidade:** low | **Origem:** cross:ipc-contract

search.types.ts:75 declares phase: 'downloading' | 'chunking' | 'embedding'; Rust emits a 4th value "downloading-reranker" (semantic.rs:282) on the same 'semantic-index-progress' channel consumed by listen<SemanticProgress> (search.service.ts:92). The path is actively reachable: SearchSection.svelte:46-47 starts the listener then invokes download_reranker_model. Rust-side types.rs:51 doc comment is equally stale. No runtime impact today — phase is only compared for change detection (search.service.ts:101) and logged; UI renders .message. Pure type-contract drift that would defeat future exhaustive switches → low.

### 40. TagsPanel.svelte is dead: never imported or mounted anywhere, near-duplicate of TagsView including its vaultIndexVersion effect

- **Arquivo:** `src/lib/features/tags/TagsPanel.svelte:1-66`
- **Severidade:** low | **Origem:** cross:svelte-reactivity

Verified: grep across all of src/ finds zero imports or mounts of TagsPanel; the only mentions are prose in doc comments (index-updater.service.ts:25, tags.service.ts:88). No dynamic component registry or svelte:component mounting exists in core/layout that could reference it by string. EditorView.svelte:52 mounts TagsView instead. The script blocks are line-for-line identical (same debouncedSave, handleTagClick, handleColorChange, displayedTree, and the vaultIndexVersion effect at TagsPanel.svelte:60-65 / TagsView.svelte:54-59); only the markup wrapper differs (Separator, max-h-[50vh], count placement). Dead code that will drift from TagsView; low severity, no runtime effect.

### 41. Missing test for getContrastTextColor function

- **Arquivo:** `src/lib/features/tags/tag-colors.logic.ts:30-37`
- **Severidade:** low | **Origem:** fe-src:search+tags

Verified: src/tests/lib/features/tags/tag-colors.logic.test.ts (lines 1-95) covers TAG_COLOR_PRESETS, getTagColor, and setTagColor but never imports or exercises getContrastTextColor — a genuine violation of the repo rule that exported .logic.ts functions must be tested. However, a repo-wide grep shows getContrastTextColor has ZERO call sites (only its definition at tag-colors.logic.ts:30) — it is dead exported code. Downgraded medium→low: no behavioral impact possible; the right fix is either delete the unused export or add a 3-case test (light bg, dark bg, hex with/without #).

### 42. Missing test coverage for loadProjects function

- **Arquivo:** `src/lib/features/tasks/todoist.service.ts:137-154`
- **Severidade:** low | **Origem:** tests/features/tasks

Verified: todoist.service.test.ts imports (lines 39-48) omit loadProjects; grep across src/tests/ and e2e/ finds zero references. Function is live code (TodoistPopover.svelte:71). Untested branches: token-missing throw (todoist.service.ts:139), cache short-circuit + forceRefresh bypass (141-144), loading-flag finally-clear (146-153). Violates the project rule that every suite covers happy/empty/error paths. Severity lowered from medium: no runtime defect; inner fetchProjects is fully tested (test lines 50-76) and store setters setProjects/setLoadingProjects are tested in todoist.store.test.ts, so only thin orchestration is unverified.

### 43. Missing test coverage for loadSections function

- **Arquivo:** `src/lib/features/tasks/todoist.service.ts:159-171`
- **Severidade:** low | **Origem:** tests/features/tasks

Verified: no test anywhere references loadSections (only test file importing the service is todoist.service.test.ts, and it imports fetchSections but not loadSections). Live code at TodoistPopover.svelte:73,87. Untested: token guard throw (todoist.service.ts:161), setLoadingSections finally-clear on fetch error (163-170). Severity lowered from medium: it is a 12-line wrapper; fetchSections itself has happy-path and error tests (test lines 78-104) and the store setters are tested, so the unverified surface is minimal. Still a confirmed convention violation (suite must cover error handling of exported service functions).

### 44. Unintended dependency on selectedTypeOrNav: full type-section rebuild re-runs on every sidebar selection click; store write not untracked

- **Arquivo:** `src/lib/features/type-definitions/TypeSidebar.svelte:70-91`
- **Severidade:** low | **Origem:** cross:svelte-reactivity

Mechanism real: `typeDefinitionsStore.selectedTypeOrNav` ($state behind getter, store line 8/14) is read tracked at TypeSidebar.svelte:88, so every setSelection (selectNav:121, selectType:125, selectUntyped:129, view click:242) re-runs excludeSystemFolder + buildTypeSections + countNavItems (type-sidebar.logic.ts:75/88/262 — O(N) passes plus per-section sorts) and reassigns sections/navCounts. The line-89 setSelection write also isn't untracked, costing one extra converging run on the auto-select path (same self-write retrigger empirically proven for finding 1). Downgraded to low: output stays correct, the recompute is a few ms even at thousands of notes, triggers only on clicks, and the key…

### 45. Unreachable condition in matchesSelection function

- **Arquivo:** `src/lib/features/type-definitions/type-sidebar.logic.ts:165`
- **Severidade:** low | **Origem:** features/type-definitions

Verified by logic: in `!entry.isA && entry.isA !== 'Type'` (line 165), when !entry.isA is true, isA is falsy (undefined/null/'') and therefore necessarily !== 'Type'; when !entry.isA is false the && short-circuits. The second clause can never change the result — pure dead code. No behavioral impact whatsoever (countSubFilters and callers produce identical results with or without it), so this is cosmetic/dead-code only. Low. This finding also covers the identical clause at line 191 per its own evidence.

### 46. Missing test coverage for openCalendarFile function

- **Arquivo:** `src/lib/plugins/calendar/calendar.service.ts:131-133`
- **Severidade:** low | **Origem:** tests:calendar+graph-view

Confirmed factually: openCalendarFile (calendar.service.ts:131-133) is exported and used as a click handler in CalendarPanel.svelte:135, but src/tests/lib/plugins/calendar/calendar.service.test.ts imports/tests every other exported function (lines 22-28: scanFilesForCalendar, updateCalendarForFile, openOrCreatePeriodicNoteForDate, openOrCreateDailyNoteForDate, resetCalendar) and never references openCalendarFile; no CalendarPanel component test exists. The test file even already mocks openFileInEditor (lines 8-10), so the gap is pure omission. Downgraded to low: the function is a single-statement delegation with no logic, branching, error handling, or store writes — a coverage-convention vio…

### 47. GraphView refetches the full graph and restarts the d3 simulation on every index bump

- **Arquivo:** `src/lib/plugins/graph-view/GraphView.svelte:391-396, 71-81, 83-128`
- **Severidade:** low | **Origem:** cross:ui-blocking

Mechanism verified: $effect (:391-396) on vaultIndexVersion → loadAndRebuild (:73 full get_all_vault_entries_v2) → initSimulation recreates all nodes WITHOUT preserving x/y (:89) and alpha(1).restart() (:127) — full layout re-randomization. But the sweep's headline trigger is wrong: GraphView mounts only as the ACTIVE tab (EditorView.svelte:53-54; single EditorView in AppShell.svelte:160, no split panes), so typing/autosave in a note can never coincide with a mounted graph — the $effect doesn't run unmounted. Real impact is limited to index bumps while the graph tab is open (watcher/external sync, quick-capture, task toggles): occasional visible layout scramble + redundant snapshot IPC. Down…

### 48. Async linked-content load has no cancellation or generation guard: out-of-order resolution can leave stale preview content

- **Arquivo:** `src/lib/plugins/kanban/KanbanCard.svelte:146-158`
- **Severidade:** low | **Origem:** cross:svelte-reactivity

Verified: no cleanup/aborted flag/generation counter; loadLinkedFileContent(text).then() writes linkedContent unconditionally. Worst case: item.text changes wikilink→none — the else branch clears linkedContent synchronously, but an in-flight older read can resolve afterwards and re-show a preview for a removed link (persists until next text change). Two-edit out-of-order clobber is also possible. Mitigations narrow the window: kanban.service.ts:49-58 caches by full cardText (cached lookups resolve in order on microtasks) and text only changes on explicit edit commits. Both cited correct in-repo patterns verified: features/canvas/FileNode.svelte:~37-51 (aborted flag in effect cleanup) and Ico…

### 49. TOC rebuild effect re-runs on every keystroke with no debounce while the panel is expanded

- **Arquivo:** `src/lib/plugins/table-of-contents/TableOfContentsPanel.svelte:31-36`
- **Severidade:** low | **Origem:** cross:svelte-reactivity

Verified: the effect reads editorStore.activeTabContent (updates per keystroke via onContentChange, editor.service.ts:180-181) and calls rebuildToc whenever expanded — extractTocHeadings (toc.logic.ts:63-93) is a full single-pass line scan plus tocStore.setHeadings per keystroke. Both cited sibling debounces verified: PropertiesView.svelte ~99-110 (300ms setTimeout-in-effect) and word-count/WordCount.svelte:17-29 (500ms). The scan is cheap (one split + regex per line; a few ms even on very large docs) and only runs while the panel is expanded, so it is a minor inefficiency/inconsistency, not user-visible breakage. Low confirmed.

### 50. TOC panel rebuilds synchronously on every keystroke while expanded

- **Arquivo:** `src/lib/plugins/table-of-contents/TableOfContentsPanel.svelte:31-36`
- **Severidade:** low | **Origem:** cross:ui-blocking

Mechanism verified end-to-end: CM updateListener (editor-extensions.ts:109-127) calls onContentChange (editor.service.ts:180-181) -> editorStore.updateContent on every keystroke (JSDoc at editor.store.svelte.ts:83), changing the activeTabContent getter (line 40). The $effect at TableOfContentsPanel.svelte:31-36 has no debounce, so while the TOC collapsible is expanded each keystroke runs rebuildToc -> extractTocHeadings (toc.logic.ts:63-93, full-doc split + per-line regexes) and replaces tocStore.headings, re-rendering the {#each} keyed by heading.pos (pos shifts below the edit point, recreating buttons). WordCount.svelte:17-29 debounces the same dependency 500ms. Low: only when sidebar+TOC …

### 51. tauri-fs.fixture: mockJsonFile/mockTextFile breaks previous mocks on sequential calls

- **Arquivo:** `src/tests/fixtures/tauri-fs.fixture.ts:17-23, 30-36`
- **Severidade:** low | **Origem:** tests:search+tags+misc

Mechanism verified: both helpers call vi.mocked(exists)/vi.mocked(readTextFile).mockImplementation() with a closure over a single path (tauri-fs.fixture.ts:18-22, 31-35), so a second call wholesale replaces the first — after mockJsonFile('/a',d1); mockJsonFile('/b',d2), exists('/a') is false and readTextFile('/a') throws. However severity is low, not medium: (1) the fixture already provides mockMultipleFiles (lines 43-50) as the documented multi-file path, so accumulation was never the contract; (2) repo-wide grep shows ZERO importers of tauri-fs.fixture.ts — no test uses these helpers, so nothing is currently broken. It is a latent footgun in unused test infrastructure, worth a Map-based fi…

### 52. invalidateQueryjsCache and clearLinkedContentCache not verified in tests

- **Arquivo:** `src/tests/lib/core/editor/editor.hooks.test.ts:101-237 (notifyAfterSave describe block)`
- **Severidade:** low | **Origem:** tests/core/editor

hooks.ts:193-194 calls invalidateQueryjsCache() and clearLinkedContentCache() on every save; neither is mocked nor asserted in editor.hooks.test.ts. Repo-wide grep: watcher-handler.service.test.ts:38 mocks invalidateQueryjsCache for the watcher path (different call site) and kanban.service.test.ts:149 calls clearLinkedContentCache directly — no test verifies they fire from notifyAfterSave. Removing both lines fails zero tests. Not a duplicate of the index-updater finding: different side effects, different fix (assert queryjs session-store invalidation / kanban linked-content cache, not collection/icon/calendar stores). Low: regression would be stale queryjs/kanban renders after save, not bre…

### 53. backlinksStore.markUnlinkedDirty() not tested in notifyAfterSave

- **Arquivo:** `src/tests/lib/core/editor/editor.hooks.test.ts:101-237 (notifyAfterSave describe block)`
- **Severidade:** low | **Origem:** tests/core/editor

hooks.ts:156 calls backlinksStore.markUnlinkedDirty() in notifyAfterSave. backlinksStore is NOT mocked in editor.hooks.test.ts (only debug + invoke are), so asserting backlinksStore.unlinkedDirty === true after notifyAfterSave would be a one-line real-store assertion — and it is absent. backlinks.store.test.ts:34-37 tests the store method in isolation only; no test covers the save-path integration. Removing line 156 fails zero tests; the regression would be the BacklinksPanel never recomputing unlinked mentions on save (the deferred unlinkedDirty flow, CLAUDE.md Indexing rule 3). Distinct side effect from the other two notifyAfterSave findings (separate assertion, separate store), so not a d…

### 54. Vacuous assertion in onFileChange unsubscribe test

- **Arquivo:** `src/tests/lib/core/filesystem/fs.watcher.test.ts:121-133`
- **Severidade:** low | **Origem:** tests/core/filesystem

Test's only assertion is `expect(true).toBe(true)` (fs.watcher.test.ts:132). Implementation unsubscribe (src/lib/core/filesystem/fs.watcher.ts:66-68) is `changeListeners = changeListeners.filter(...)`, which can never throw, so the 'doesn't throw' premise guards nothing. The test never emits an event to verify listener1 is no longer notified while listener2 still is, even though the file already has the machinery (setupWatcher + emit, used at lines 395-409). No other test covers unsubscribe semantics: app-lifecycle.service.test.ts mocks onFileChange entirely. A broken unsubscribe would pass the suite. Implementation is correct; pure test-quality gap, hence low severity.

### 55. Cleanup test mocks 19 functions but 21 keybindings are registered

- **Arquivo:** `src/tests/lib/core/keybindings/global-keybindings.test.ts:226-236`
- **Severidade:** low | **Origem:** tests:app-lifecycle+keybindings+layout+note-creator

Count mismatch is real: global-keybindings.ts registers 21 bindings (lines 32-144) and the test's line 102 asserts 21, but the cleanup test prepares only 19 mockReturnValueOnce fns (line 226-229). However, the claimed TypeError is wrong: line 10 mocks registerKeybinding as vi.fn(() => vi.fn()), so calls 20-21 fall back to the default implementation and return fresh callable vi.fn()s, not undefined (vi.clearAllMocks at line 85 clears history, not implementations). Verified by running the file: all 43 tests pass. Actual defect is only a coverage gap — cleanups for the last two bindings (Cmd+K line 134, Cmd+Shift+E line 139) are never asserted, so dropping them from the cleanups array would go …

### 56. Weak test assertion: toBeGreaterThanOrEqual instead of specific count

- **Arquivo:** `src/tests/lib/core/markdown-editor/extensions/live-preview/parsers/combined-inline-nesting.test.ts:630`
- **Severidade:** low | **Origem:** tests/core/markdown-editor#3

Confirmed empirically: a throwaway node script using the repo's @codemirror/lang-markdown+GFM shows findItalicRanges('***bi*** *italic*') returns exactly 2 ranges ({0,8} outer Emphasis of ***bi***, {9,17} standalone italic). toBeGreaterThanOrEqual(1) at line 630 passes even if standalone *italic* detection regresses, because the ***bi*** wrapper alone yields 1 — masking exactly the 'coexist' behavior the test name claims (lines 621-632). All ~60 other assertions in the file use exact toHaveLength; this is the only weak one. Severity low, not medium: standalone italic (lines 19-45) and bold-italic wrapping (lines 76-89) each have exact-count coverage elsewhere in the same file, so marginal co…

### 57. Incomplete test: missing assertion for inline comments in ordered list test

- **Arquivo:** `src/tests/lib/core/markdown-editor/extensions/live-preview/parsers/combined-list-inline.test.ts:313-324`
- **Severidade:** low | **Origem:** tests/core/markdown-editor#3

Confirmed. The test 'ordered list + inline comment' (lines 314-323) calls findInlineCodeRanges at line 321 (wrong parser), assigns to `comments`, and has NO expect() on it — line 322 is a comment admitting findInlineCommentRanges is correct. That function is imported (line 17) and used properly in the task-list combo at line 462. findInlineCommentRanges is a pure regex (comment.ts:19-33) and would match '%%comment%%' at index 3, so the proper assertion would pass — the test just never makes it. Severity low, not high: the parser is fully covered in comment.test.ts and the task-list combo; only this one combination is unverified; no CI impact (tsconfig has no noUnusedLocals; vitest run passes…

### 58. Duplicate makeLines function definition in test file

- **Arquivo:** `src/tests/lib/core/markdown-editor/extensions/live-preview/parsers/comment.test.ts:8-16`
- **Severidade:** low | **Origem:** tests/core/markdown-editor#3

Confirmed. comment.test.ts:8-16 defines a local makeLines whose body is identical to the exported makeLines at src/tests/lib/core/markdown-editor/test-helpers.ts:9-17, and the file already imports createMarkdownState from that exact module at line 6 — so switching to the shared helper is a one-line import change. One evidence detail is off: line 6 does not import makeLines (it imports createMarkdownState), so there is no shadowing or conflict, just duplication. No behavioral effect; tests pass. Maintenance-only smell, severity low.

### 59. FootnoteDefRange.contentFrom field not tested

- **Arquivo:** `src/tests/lib/core/markdown-editor/extensions/live-preview/parsers/footnote.test.ts:73-119`
- **Severidade:** low | **Origem:** tests/core/markdown-editor#4

Factually correct: the findFootnoteDefRange suite (footnote.test.ts:73-119) asserts markerFrom, markerTo, label, contentTo but never contentFrom, and the contentFrom computation at footnote.ts:80 is the most convoluted expression in the parser (it also mis-points for empty-content defs like '[^1]: ', where contentFrom=5 lands on the space). However, repo-wide grep shows footnote's contentFrom has ZERO consumers — footnote-plugin.ts:83-86 uses only markerFrom/markerTo/label (the only consumed contentFrom is fenced-code-block's, at code-block-field.ts:30-31). The untested field is dead payload, so a regression in it cannot affect behavior. Downgrade medium → low.

### 60. applyHeadingTypography function not tested in loadSettings

- **Arquivo:** `src/tests/lib/core/settings/settings.service.test.ts:1-547`
- **Severidade:** low | **Origem:** tests:settings+status-bar+trash+vault+zoom

Real coverage gap. loadSettings calls applyHeadingTypography() on all 4 exit paths (settings.service.ts:40,50,161,173) yet grep over src/tests finds zero references to it; only the pure converter headingTypographyToCssVars is tested (heading-typography.logic.test.ts). vitest.config.ts sets no environment and the test file has no jsdom pragma, so document is undefined and the function silently early-returns (settings.service.ts:197) during every loadSettings test. Because the call is intra-module it cannot be mocked; the correct test is a jsdom suite asserting CSS vars on document.documentElement after loadSettings. Severity low: a missed regression here only loses heading typography styling …

### 61. Test suite does not cover upsertProperty with canonical key mismatches

- **Arquivo:** `src/tests/lib/features/properties/properties.service.test.ts:64-112`
- **Severidade:** low | **Origem:** tests/features/properties

Verified: the upsertProperty describe block (lines 64-112) has 4 tests, all exact-key; no alias/canonical crossing. The gap is real and notable because commit 4a0831b added exactly this class of test for renameProperty (155-168) and addNewProperty (242-264) in this same file but skipped upsert. Writing the missing test would surface the literal-match behavior confirmed above. Downgraded to low because the input combination it would cover is unreachable from any current caller (see upsert finding); it guards a latent, not active, defect.

### 62. Test suite does not cover updateProperty with canonical key mismatches

- **Arquivo:** `src/tests/lib/features/properties/properties.service.test.ts:25-62`
- **Severidade:** low | **Origem:** tests/features/properties

Verified: updateProperty tests (lines 25-62) are 3 cases, all exact-key ('title', 'count'); no alias/canonical mismatch case. Same situation as the upsert coverage gap: the file already contains alias-collision tests for renameProperty and addNewProperty, so the omission is an inconsistency from commit 4a0831b's scope. Low, not medium: the mismatch input is unreachable from current call sites (PropertyField passes store-exact keys; relationship keys are un-aliased), so the missing test guards a latent hazard only.

### 63. kanban.service test does not verify error propagation in loadLinkedFileContent

- **Arquivo:** `src/tests/lib/plugins/kanban/kanban.service.test.ts:79-155`
- **Severidade:** low | **Origem:** tests:kanban+one-on-one

Real gap. kanban.service.ts:62-80 wraps resolution + readTextFile in try/catch; on error it logs, caches '' for that card text, and returns ''. The suite (test:79-155) covers no-wikilink, happy path, no-frontmatter, unresolved link, cache hit, and cache clear — but never makes the mocked readTextFile reject, so the catch at service:76-80 is entirely unexercised. This violates the repo rule 'every suite needs happy path + empty/null input + error handling' (the sibling createKanbanFile suite has its error case at test:55-64). Notably untested behavior: a transient read error is cached as '' until clearLinkedContentCache. Severity low: test-quality only, production code is correct.


## Gaps de teste (405)

Agrupados por módulo. Itens marcados **[sem teste]** não têm arquivo de teste algum; os demais são lacunas parciais.


### core/markdown-editor (90)

- **[sem teste]** `src/lib/core/markdown-editor/EditorTabs.svelte` — No test file found for EditorTabs component (tab rendering, pinning, closing, context menu)
- `src/lib/core/markdown-editor/EditorTabs.svelte` — No unit test; E2E tabs.spec.ts and tab-pinning.spec.ts only.
- **[sem teste]** `src/lib/core/markdown-editor/EditorView.svelte` — No test file found for EditorView component (tab switching, view mode toggles, collection/canvas/kanban/tasks switching)
- **[sem teste]** `src/lib/core/markdown-editor/MarkdownEditor.svelte` — No test file found for MarkdownEditor component (editor mounting, tab switching effects, wikilink clicking, context menu, live preview toggling)
- **[sem teste]** `src/lib/core/markdown-editor/extensions/callout/callout.ts` — No test file found for calloutDecorationPlugin export (only logic test for parseCalloutLine exists). Plugin's decoration building and update behavior not tested
- `src/lib/core/markdown-editor/extensions/callout/callout.ts` — Callout extension wiring untested; callout.logic.ts tested (callout.logic.test.ts imports only the .logic module).
- **[sem teste]** `src/lib/core/markdown-editor/extensions/callout/index.ts` — Barrel, no test. Low value.
- **[sem teste]** `src/lib/core/markdown-editor/extensions/composition-aware-bracket-matching.ts` — No test file found; exported function compositionAwareBracketMatching() needs tests for: composition guard behavior, bracket highlighting during IME, decorator state after composition ends
- **[sem teste]** `src/lib/core/markdown-editor/extensions/composition-aware-bracket-matching.ts` — 175 lines of IME bracket-matching logic, no test or test import anywhere.
- `src/lib/core/markdown-editor/extensions/date-shortcut/completion.ts` — CM autocomplete wiring untested; completion.logic.ts is tested.
- **[sem teste]** `src/lib/core/markdown-editor/extensions/debug-composition.ts` — No test file found; compositionDebugExtension() exported but never tested. Testing is not critical for debug-only code, but other exports (debugCompartments) could be tested
- **[sem teste]** `src/lib/core/markdown-editor/extensions/debug-composition.ts` — Debug-only CM extension, no test. Low value.
- **[sem teste]** `src/lib/core/markdown-editor/extensions/lezer/highlight-extension.ts` — Lezer highlight extension (44 lines), no test.
- **[sem teste]** `src/lib/core/markdown-editor/extensions/lezer/math-extension.ts` — Lezer math grammar extension (115 lines), no test. Math parsers/widgets tested separately, but grammar wiring is not.
- **[sem teste]** `src/lib/core/markdown-editor/extensions/live-preview/click-handler.ts` — No test file found; exported handleLivePreviewLinkMousedown() and livePreviewClickHandler need tests for: cmd/ctrl+click detection, safe URL checking, URL extraction from different link types
- `src/lib/core/markdown-editor/extensions/live-preview/core/check-update-action.ts` — Used by all plugin update() methods (mermaid-field, table-field, video-plugin, etc.) to decide 'rebuild' action. Function body not read; tests rely on it. Critical to plugin performance (viewport-only scroll skip).
- `src/lib/core/markdown-editor/extensions/live-preview/core/expanded-ranges.ts` — Used by meta-bind-input and wikilink-embed plugins for viewport-optimized decoration. Body not examined; tests use createMarkdownState without measuring the expanded-range behavior directly.
- `src/lib/core/markdown-editor/extensions/live-preview/core/expanded-ranges.ts` — expandedVisibleRanges() (viewport+2000 chars pre-compute, perf-critical per CLAUDE.md rule 7) has no test.
- **[sem teste]** `src/lib/core/markdown-editor/extensions/live-preview/core/get-all-lines.ts` — 12-line helper, no test.
- `src/lib/core/markdown-editor/extensions/live-preview/core/is-inside-block-context.ts` — Used by meta-bind-input and wikilink-embed plugins to skip decoration inside fenced code/HTML blocks. Body not read; tests pass, assuming correct skip logic.
- `src/lib/core/markdown-editor/extensions/live-preview/core/scroll-debounce-plugin.ts` — 150ms scroll debounce + forceDecorationRebuild timing logic (CLAUDE.md perf rule 7), no test.
- `src/lib/core/markdown-editor/extensions/live-preview/core/should-show-source.ts` — Core cursor-in-block guard used by all plugins. Function body not examined; tests assume correct behavior. Critical to show/hide source logic.
- `src/lib/core/markdown-editor/extensions/live-preview/core/types.ts` — Type-only. Low value.
- **[sem teste]** `src/lib/core/markdown-editor/extensions/live-preview/handlers/paste-html-link-handler.ts` — No test file found for pasteHtmlLinkHandler extension (only logic test exists). Handler's paste event dispatch and transaction flow not tested
- `src/lib/core/markdown-editor/extensions/live-preview/handlers/paste-html-link-handler.ts` — CM paste handler wiring untested; paste-html-link.logic.ts is tested.
- **[sem teste]** `src/lib/core/markdown-editor/extensions/live-preview/handlers/paste-tsv-handler.ts` — No test file found for pasteTsvHandler extension (only logic test exists). Handler's paste event dispatch and transaction flow not tested
- `src/lib/core/markdown-editor/extensions/live-preview/handlers/paste-tsv-handler.ts` — CM paste handler wiring untested; paste-tsv.logic.ts is tested.
- **[sem teste]** `src/lib/core/markdown-editor/extensions/live-preview/index.ts` — Barrel/extension assembly, no test.
- **[sem teste]** `src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/autolink-handlers.ts` — No test file found for autolinkHandler and extendedAutolinkHandler (node and line handlers for inline autolinks)
- **[sem teste]** `src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/block-reference-handler.ts` — No test file found for blockReferenceHandler (line handler for block references)
- **[sem teste]** `src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/blockquote-handler.ts` — No test file found for blockquoteHandler (node handler for QuoteMark with depth-aware styling)
- **[sem teste]** `src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/heading-handler.ts` — No test file found for headingHandlers array (8 handlers for ATX and setext headings)
- **[sem teste]** `src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/highlight-handler.ts` — No test file found for highlightHandler (node handler for ==text==)
- **[sem teste]** `src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/inline-comment-handler.ts` — No test file found for inlineCommentHandler (line handler for %%text%%)
- **[sem teste]** `src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/mark-handlers.ts` — No test file found for markHandlers array and escapeHandler (inline formatting marks like **/`/~~ and escape sequences)
- **[sem teste]** `src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/markdown-link-handlers.ts` — No test file found for linkHandler and linkReferenceHandler (markdown link decoration)
- **[sem teste]** `src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/simple-widget-handlers.ts` — No test file found for simpleWidgetHandlers array (task markers, horizontal rules, list marks, hard breaks, inline math widgets)
- **[sem teste]** `src/lib/core/markdown-editor/extensions/live-preview/inline/handlers/wikilink-handler.ts` — No test file found for wikilinkHandler (line handler for wikilink decoration)
- **[sem teste]** `src/lib/core/markdown-editor/extensions/live-preview/live-preview.ts` — livePreviewExtensions() function not tested - no test file exists for live-preview.ts
- `src/lib/core/markdown-editor/extensions/live-preview/live-preview.ts` — Top-level live-preview extension assembly, no direct test (individual fields/plugins tested).
- `src/lib/core/markdown-editor/extensions/live-preview/parsers/footnote.ts` — FootnoteDefRange.contentFrom field is not asserted in findFootnoteDefRange tests (tests check markerFrom, markerTo, label, contentTo but not contentFrom)
- `src/lib/core/markdown-editor/extensions/live-preview/parsers/meta-bind-input.ts` — Parser for `INPUT[...]` ranges. Test coverage via buildMetaBindInputDecorations integration tests is good, but direct parser unit tests do not exist.
- `src/lib/core/markdown-editor/extensions/live-preview/parsers/table.ts` — findAllTables() is used by table-field but not directly tested. Table widget test (table-widget.test.ts) covers renderTableSource and button dispatch, not the parser.
- `src/lib/core/markdown-editor/extensions/live-preview/parsers/wikilink-embed.ts` — Parser for ![[...]] embeds. Integration tests in buildWikilinkEmbedDecorations exist, but direct unit test file for parser functions does not exist.
- `src/lib/core/markdown-editor/extensions/live-preview/plugins/audio-plugin.ts` — audioPlugin ViewPlugin export (line 55) is not tested; only computeAudioBlocks function is tested
- `src/lib/core/markdown-editor/extensions/live-preview/plugins/block-comment-field.ts` — blockCommentField plugin export not tested; only computeBlockComments function is tested
- `src/lib/core/markdown-editor/extensions/live-preview/plugins/block-math-field.ts` — blockMathField plugin export not tested; only computeBlockMath function is tested
- `src/lib/core/markdown-editor/extensions/live-preview/plugins/callout-field.ts` — calloutField and calloutFoldState exports not tested; only computeCallouts function is tested
- `src/lib/core/markdown-editor/extensions/live-preview/plugins/code-block-field.ts` — codeBlockField ViewPlugin export is not tested; only computeCodeBlocks function is tested
- `src/lib/core/markdown-editor/extensions/live-preview/plugins/collection-block-field.ts` — collectionBlockField ViewPlugin export is not tested; only computeCollectionBlocks function is tested
- `src/lib/core/markdown-editor/extensions/live-preview/plugins/footnote-plugin.ts` — footnotePlugin ViewPlugin export is not tested; only buildFootnoteDecorations function is tested
- `src/lib/core/markdown-editor/extensions/live-preview/plugins/frontmatter-field.ts` — frontmatterField StateField and frontmatterGutter exports are not tested; only computeFrontmatter function is tested
- `src/lib/core/markdown-editor/extensions/live-preview/plugins/image-plugin.ts` — Reference image resolution untested. Missing test cases for ![alt][ref] syntax that calls resolveRefUrl(), including invalid refs, missing refs, and multiple reference images
- **[sem teste]** `src/lib/core/markdown-editor/extensions/live-preview/plugins/image-plugin.ts` — No tests for buildImageDecorations exported function with expandedVisibleRanges parameter (only tested via buildImages helper with full doc range)
- `src/lib/core/markdown-editor/extensions/live-preview/plugins/image-plugin.ts` — imagePlugin ViewPlugin export (line 52) is not tested; only buildImageDecorations and parseImageAlt functions are tested
- `src/lib/core/markdown-editor/extensions/live-preview/plugins/meta-bind-input-plugin.ts` — buildMetaBindInputDecorations not exported; pickWidget() function untested for number/date/toggle widget types and edge cases
- **[sem teste]** `src/lib/core/markdown-editor/extensions/live-preview/plugins/queryjs-block-field.ts` — No test file. Missing: ViewPlugin.update() behavior, computeQueryjsBlocks() decoration generation, viewport and doc-change guards, forceDecorationRebuild handling
- **[sem teste]** `src/lib/core/markdown-editor/extensions/live-preview/plugins/queryjs-block-field.ts` — No test that an unchanged doc skips computeQueryjsBlocks — the lastDocContent skip-cache is dead code and nothing would catch its removal or repair.
- `src/lib/core/markdown-editor/extensions/live-preview/plugins/queryjs-block-field.ts` — Only live-preview StateField without a mirrored test (all sibling *-field/*-plugin files have one).
- **[sem teste]** `src/lib/core/markdown-editor/extensions/live-preview/styles.ts` — Style definitions, no test. Low value.
- `src/lib/core/markdown-editor/extensions/live-preview/widgets.ts` — createMetaBindSelect, MetaBindSelectWidget, TableWidget, ImageWidget, AudioWidget, VideoWidget, WikilinkImageEmbedWidget, WikilinkNoteEmbedWidget, MetaBindNumberWidget, MetaBindDateWidget, MetaBindToggleWidget, dispatchMetaBindUpdate, isNumericString…
- `src/lib/core/markdown-editor/extensions/live-preview/widgets.ts` — Widget barrel/re-exports, no direct test.
- `src/lib/core/markdown-editor/extensions/live-preview/widgets/block-math-widget.ts` — clearMathCache exported but never tested
- **[sem teste]** `src/lib/core/markdown-editor/extensions/live-preview/widgets/code-block-widget.ts` — No test file exists for code-block-widget.ts. Tests at code-block-widget.test.ts cover widget rendering, language select, and eq(), but source imports and language-switch transaction dispatch are not audited.
- **[sem teste]** `src/lib/core/markdown-editor/extensions/live-preview/widgets/code-block-widget.ts` — No test that repeated toDOM() calls for identical (code, language) reuse a cached highlight result (math/mermaid widgets have cache tests; code-block has no cache at all).
- `src/lib/core/markdown-editor/extensions/live-preview/widgets/collection-block-widget.ts` — clearCollectionCache exported but never tested; buildCollectionTable function not tested
- `src/lib/core/markdown-editor/extensions/live-preview/widgets/inline-math-widget.ts` — clearInlineMathCache exported but never tested
- `src/lib/core/markdown-editor/extensions/live-preview/widgets/mermaid-widget.ts` — getMermaid, clearMermaidCache exported but never tested
- `src/lib/core/markdown-editor/extensions/live-preview/widgets/mermaid-widget.ts` — Mermaid widget source not directly examined; test file exists (mermaid-widget.test.ts) with comprehensive coverage of cache, async render, error handling, and duplicate detection. Assumed implementation matches test expectations.
- `src/lib/core/markdown-editor/extensions/live-preview/widgets/meta-bind-button-widget.ts` — executeButtonAction private function; MetaBindButtonErrorWidget not tested
- `src/lib/core/markdown-editor/extensions/live-preview/widgets/meta-bind-button-widget.ts` — Interactive widget (144 lines) with no direct test; mousedown stopPropagation rule unverified.
- `src/lib/core/markdown-editor/extensions/live-preview/wikilink-navigation.ts` — openWikilinkTarget function tested but resolveEmbedTarget helper function not tested
- `src/lib/core/markdown-editor/extensions/wikilink/completion.logic.ts` — matchFilesForWikilink has test coverage (line 110-151 in completion.logic.test.ts), but error handling for null files array not tested. Empty/null edge cases partially covered.
- `src/lib/core/markdown-editor/extensions/wikilink/completion.ts` — wikilinkCompletionSource, buildFileCompletions, buildHeadingCompletions, buildBlockIdCompletions async functions not tested; ensureEntriesCached cache logic not verified
- `src/lib/core/markdown-editor/extensions/wikilink/completion.ts` — CM wiring untested; completion.logic.ts tested.
- **[sem teste]** `src/lib/core/markdown-editor/extensions/wikilink/decoration.logic.ts` — No test file for WIKILINK_DECORATION_RE, findWikilinkRanges, findWikilinkInfoAtPosition functions
- `src/lib/core/markdown-editor/extensions/wikilink/decoration.logic.ts` — findWikilinkRanges and findWikilinkInfoAtPosition are fully tested (decoration.logic.test.ts lines 7-204). No gaps detected in test coverage.
- `src/lib/core/markdown-editor/extensions/wikilink/decoration.ts` — wikilinkDecorationPlugin ViewPlugin not tested; buildDecorations function not tested
- **[sem teste]** `src/lib/core/markdown-editor/extensions/wikilink/decoration.ts` — No test asserting the plugin skips viewport-only scroll updates (the rule-4 guard every live-preview plugin has); same gap for extensions/callout/callout.ts.
- `src/lib/core/markdown-editor/extensions/wikilink/decoration.ts` — CM wiring untested; decoration.logic.ts tested.
- `src/lib/core/markdown-editor/extensions/wikilink/index.ts` — Re-exports only; no source logic to test
- **[sem teste]** `src/lib/core/markdown-editor/extensions/wikilink/index.ts` — Barrel, no test. Low value.
- `src/lib/core/markdown-editor/extensions/wikilink/navigation.logic.ts` — HEADING_RE, BLOCK_ID_RE, findHeadingPosition, findBlockIdPosition not tested
- `src/lib/core/markdown-editor/extensions/wikilink/navigation.logic.ts` — findHeadingPosition and findBlockIdPosition have comprehensive tests (navigation.logic.test.ts lines 7-118). CRLF line ending support tested at line 62-69. No gaps.
- `src/lib/core/markdown-editor/highlight-styles.ts` — getLanguageEffects and getLanguageEffectsSync are tested (highlight-styles.test.ts) for return types and .md fast-path. Internal language loading (JS/TS/Python/Rust async imports) not inspected; tests assume correct.
- `src/lib/core/markdown-editor/setup/editor-extensions.ts` — createExtensions returns extension array; tested at editor-extensions.test.ts for array length and option handling, but actual extension composition and order not verified.
- `src/lib/core/markdown-editor/setup/editor-theme.ts` — buildEditorTheme creates Extension; tested for return type and parameter sensitivity, but CSS output and theme property values not verified.
- **[sem teste]** `src/lib/core/markdown-editor/setup/index.ts` — Barrel, no test (editor-extensions.ts and editor-theme.ts are tested).
- `src/lib/core/markdown-editor/tab-view-state.ts` — All four functions (saveTabViewState, getTabViewState, deleteTabViewState, clearAllTabViewStates) tested comprehensively (tab-view-state.test.ts). No gaps detected.
- `src/lib/core/markdown-editor/wikilink-click-target.ts` — Source file not read. Test file (wikilink-click-capture.test.ts) assumes findWikilinkElement() and WIKILINK_SELECTOR are correct. DOM traversal and class-matching logic not directly inspected.


### core/settings (47)

- **[sem teste]** `src/lib/core/settings/BuildInfo.svelte` — No test file exists. Component should test containerClass reactivity based on variant prop.
- **[sem teste]** `src/lib/core/settings/SettingsPanel.svelte` — No test file exists for debounced save flow, section navigation, keyboard close handler.
- `src/lib/core/settings/SettingsPanel.svelte` — No unit test; E2E settings.spec.ts (single 'Settings panel' describe) only.
- **[sem teste]** `src/lib/core/settings/sections/AppearanceSection.svelte` — No test file exists. Component exports selectTheme, deleteTheme, handleCreateNew, handleEdit, handleDuplicate, handleEditorSave, handleEditorCancel functions that need testing.
- `src/lib/core/settings/sections/AppearanceSection.svelte` — No unit test; no section-specific E2E.
- **[sem teste]** `src/lib/core/settings/sections/EditorSection.svelte` — No test file exists for Tauri invoke() calls and UI state updates (font picker, system fonts loading).
- `src/lib/core/settings/sections/EditorSection.svelte` — No unit test; no section-specific E2E.
- **[sem teste]** `src/lib/core/settings/sections/FileHistorySection.svelte` — No test file exists for clampRetentionDays function or Switch/Input updates.
- `src/lib/core/settings/sections/FileHistorySection.svelte` — No unit test; no E2E ('history' = 0 hits in e2e/specs).
- **[sem teste]** `src/lib/core/settings/sections/GeneralSection.svelte` — No test file exists for layout visibility toggle functionality.
- `src/lib/core/settings/sections/GeneralSection.svelte` — No unit test; no section-specific E2E.
- **[sem teste]** `src/lib/core/settings/sections/HeadingTypographyEditor.svelte` — No test file exists for updateLevel function and heading typography state management.
- `src/lib/core/settings/sections/HeadingTypographyEditor.svelte` — No unit test (heading-typography.logic.ts is tested); no E2E.
- **[sem teste]** `src/lib/core/settings/sections/OneOnOneSection.svelte` — No test file exists for folder path and format input handling.
- `src/lib/core/settings/sections/OneOnOneSection.svelte` — No unit test; no E2E ('one-on-one' = 0 hits).
- **[sem teste]** `src/lib/core/settings/sections/PeriodicNotesSection.svelte` — No test file exists for updatePeriod function and nested period object updates.
- `src/lib/core/settings/sections/PeriodicNotesSection.svelte` — No unit test; no section-specific E2E.
- **[sem teste]** `src/lib/core/settings/sections/QueryjsSection.svelte` — No test file exists for handlePolicyChange and clearCache function calls.
- `src/lib/core/settings/sections/QueryjsSection.svelte` — No unit test; no section-specific E2E.
- **[sem teste]** `src/lib/core/settings/sections/QuickCaptureSection.svelte` — No test file exists for folder/filename format or template path updates.
- `src/lib/core/settings/sections/QuickCaptureSection.svelte` — No unit test; no E2E.
- **[sem teste]** `src/lib/core/settings/sections/SearchSection.svelte` — No test file exists. Component tests needed for handleToggle error path (verify listener is stopped) and handleRerankerDownload listener cleanup.
- `src/lib/core/settings/sections/SearchSection.svelte` — No unit test; no section-specific E2E.
- `src/lib/core/settings/sections/SettingItem.svelte` — Simple component; unit test coverage minimal but component is straightforward presentational.
- `src/lib/core/settings/sections/SettingItem.svelte` — No unit test; shared settings row primitive, no direct coverage.
- **[sem teste]** `src/lib/core/settings/sections/TemplatesSection.svelte` — No test file exists for folder and systemFolder Input handlers.
- `src/lib/core/settings/sections/TemplatesSection.svelte` — No unit test; no section-specific E2E.
- **[sem teste]** `src/lib/core/settings/sections/ThemeColorRow.svelte` — No test file exists for color picker and hex input validation (isValidHex, normalizeHex).
- `src/lib/core/settings/sections/ThemeColorRow.svelte` — No unit test; no E2E.
- **[sem teste]** `src/lib/core/settings/sections/ThemeEditor.svelte` — No test file exists for handleSave, handleExport, handleImport, updateColor functions and validation.
- `src/lib/core/settings/sections/ThemeEditor.svelte` — No unit test (theme-editor.logic.ts is tested); no E2E.
- **[sem teste]** `src/lib/core/settings/sections/TodoistSection.svelte` — No test file exists for handleTokenChange function or password input handling.
- **[sem teste]** `src/lib/core/settings/sections/TrashSection.svelte` — No test file exists for trash service integration (loadTrash, restoreItem, deletePermanently, emptyTrash) and Tauri dialog handling.
- `src/lib/core/settings/sections/TrashSection.svelte` — No unit test; no section-specific E2E.
- **[sem teste]** `src/lib/core/settings/sections/TroubleshootingSection.svelte` — No test file exists for debug toggle handlers and log service integration (initLogSession, startHeartbeat, openLogDir).
- `src/lib/core/settings/sections/TroubleshootingSection.svelte` — No unit test; no E2E.
- **[sem teste]** `src/lib/core/settings/sections/TypesSection.svelte` — No test file exists for explicitOrganization and showUntypedNotes toggle handlers.
- `src/lib/core/settings/sections/TypesSection.svelte` — No unit test; no E2E.
- **[sem teste]** `src/lib/core/settings/sections/UpdateSection.svelte` — No test file exists for checkForUpdates, confirmInstallStable, download progress tracking (Channel.onmessage), and version formatting.
- `src/lib/core/settings/sections/UpdateSection.svelte` — No unit test (update-check.service tested); no E2E.
- `src/lib/core/settings/settings-panel.store.svelte.ts` — Test file exists (settings-panel.store.test.ts), getters and setters should be fully covered.
- `src/lib/core/settings/settings.logic.ts` — Test file exists (settings.logic.test.ts) with comprehensive coverage of clamp functions, isValidFolderName, and SETTINGS_SECTION_GROUPS.
- `src/lib/core/settings/settings.service.ts` — Test file exists but should verify error recovery paths (loadSettings fallback to defaults, saveSettings error handling), directory creation, and applyHeadingTypography.
- `src/lib/core/settings/settings.service.ts` — applyHeadingTypography() exported function is called in loadSettings but never mocked or verified in service tests. Called 4 times in loadSettings but test does not assert it was invoked.
- `src/lib/core/settings/settings.types.ts` — Type-only. Low value.
- `src/lib/core/settings/theme.types.ts` — Type-only. Low value.
- `src/lib/core/settings/update-check.service.ts` — maybeAutoCheckForUpdates() — the main exported async function that invokes Tauri commands, updates store, saves settings, and shows toasts. Only shouldAutoCheckNow is tested.


### rust (38)

- `src-tauri/src/commands/db.rs` — Minimal coverage. Only 584B file but `open_vault_db` command is tested in vault_test.rs. No dedicated db_test coverage for the thin wrapper itself.
- `src-tauri/src/commands/db.rs` — close_vault_db has 0 test references (open_vault_db is integration-tested). No #[cfg(test)].
- **[sem teste]** `src-tauri/src/commands/debug.rs` — No test file found. This command module has 1.3K - likely small but should have integration tests for any debug/tracing commands
- **[sem teste]** `src-tauri/src/commands/fonts.rs` — No test file found. Font handling command with 3.0K of code - should verify font discovery and path handling
- `src-tauri/src/commands/search.rs` — search_vault (lines 16-29): Full-text search command with directory recursion, symlink handling, and file size limits. Has E2E tests but no isolated unit tests in test suite.
- `src-tauri/src/commands/semantic.rs` — update_semantic_file (lines 910-1038): Complex async fn with mtime tracking, hash dedup, chunk embedding, and transaction management. Not covered by unit tests.
- `src-tauri/src/commands/semantic.rs` — search_semantic (lines 619-729): Embedding-based search with cosine ranking and reranker. No isolated unit tests; relies on integration testing.
- `src-tauri/src/commands/semantic.rs` — search_hybrid (lines 747-864): RRF fusion of FTS and semantic search. No isolated unit tests.
- `src-tauri/src/commands/semantic.rs` — build_semantic_index (lines 325-614): Multi-phase indexing with concurrent safeguards. Helper functions tested but the full async orchestration not covered.
- **[sem teste]** `src-tauri/src/commands/semantic.rs` — No tests for embedding bytes with length not divisible by 4. No test verifying chunks_exact truncation behavior in production code (only documented in unit test audit_finding_12).
- `src-tauri/src/commands/semantic.rs` — search_hybrid, search_semantic, update_semantic_file, init_semantic_search, get_semantic_file_status, model download/availability fns: 0 test references. Only build/stats/cleanup/hash paths covered by semantic_commands_test.rs.
- `src-tauri/src/commands/update_channel.rs` — check_for_update_on_channel (lines 86-127): Async command with Tauri updater integration, version comparator override. Cannot be unit tested (requires Tauri runtime), but parameter validation could have tests.
- **[sem teste]** `src-tauri/src/commands/update_channel.rs` — No test file found. Update channel logic (6.9K) - no unit/integration tests for version checking and update flow
- **[sem teste]** `src-tauri/src/commands/vault.rs` — No tests for TOCTOU race in create_note; concurrent access with same path. No tests for non-atomic crash safety of file writes at lines 344, 682, 897. No tests for propagate_type_rename error recovery when partial file rewrites fail.
- `src-tauri/src/commands/vault.rs` — 15+ *_v2 command wrappers (get_backlinks_v2, get_all_tags_v2, get_all_tasks_v2, query_notes_by_property, etc.) have 0 command-layer test refs; underlying VaultIndex methods are tested in vault_index_test.rs.
- `src-tauri/src/db/fts_repo.rs` — No direct tests for insert_entry/delete_entry/search_match/expand_vocab_terms; only indirect coverage via search_index::search_fts calls in search_fts_test.rs.
- **[sem teste]** `src-tauri/src/db/mod.rs` — is_open(): no test for poisoned lock behavior. No test distinguishing 'database closed' vs 'lock poisoned' case.
- **[sem teste]** `src-tauri/src/db/semantic_repo.rs` — get_chunk_hashes_for_path: no test for malformed row deserialization errors. delete_orphaned_mtimes: no test for malformed mtime key format. No tests verifying debug_log is called on errors (pattern used by load_all_embeddings, get_distinct_sources).
- **[sem teste]** `src-tauri/src/lib.rs` — App wiring / Tauri command registration, no tests. Low value (verified only at compile time).
- **[sem teste]** `src-tauri/src/main.rs` — Binary entry point, no tests. Low value.
- `src-tauri/src/quick_capture/commands.rs` — No integration tests in src-tauri/tests/ covering the full capture_clipboard_now or submit_composer_capture Tauri command paths with actual app state
- `src-tauri/src/search/text_search.rs` — No integration tests in src-tauri/tests/ for full text search across vault files; unit tests exist in-file but integration coverage is missing
- `src-tauri/src/semantic/chunker.rs` — No explicit tests for unwrap() safety on line 292 merge_short_sections; guard condition !merged.is_empty() prevents panic but no dedicated test
- **[sem teste]** `src-tauri/src/semantic/embedder.rs` — No tests for non-3D tensor shapes from ONNX model; tests only use default 3D assumption. Missing tests for shape=[batch, hidden] or shape=[batch] fallback paths (lines 198, 204)
- **[sem teste]** `src-tauri/src/semantic/model.rs` — No tests for ManagedModel with zero downloads; division by zero on lines 124, 130 not tested
- `src-tauri/src/semantic/reranker.rs` — No inline tests and no integration test references for load/rerank/with_batch_size. Only semantic/ module with zero coverage.
- **[sem teste]** `src-tauri/src/utils/fs.rs` — `validate_vault_path()` function has no test coverage. Missing: error cases (non-existent path, non-directory path, permission denied)
- `src-tauri/src/utils/fs.rs` — `collect_markdown_paths_with_metadata()` function has no test coverage. The `_with_mtime` variant is tested (27 tests), but `_with_metadata` variant is missing tests for ctime + size extraction
- `src-tauri/src/utils/logger.rs` — `debug_log()` function has no true functional test. Test `debug_log_enabled_without_app_handle_does_not_panic` only verifies no panic when APP_HANDLE is unset; doesn't verify stderr output or event emission
- **[sem teste]** `src-tauri/src/vault/aliases.rs` — No test for edge case: empty key or numeric-only key passed to `canonicalize_key()`. Tests cover all known aliases but not unknown keys beyond the "pass-through" category
- `src-tauri/src/vault/index.rs` — Test at line 1527 (remove_entry_retroactive_backlinks_for_promoted) does not verify the return value from remove_entry() or check that the promoted path appears in result.affected
- `src-tauri/src/vault/index.rs` — Test at line 1526 (remove_entry_rebuilds_backlinks_for_promoted_surviving_sibling) does not capture or verify the UpdateResult.affected field
- `src-tauri/src/vault/task.rs` — `TaskPriority` impl and `Task` struct fields (checked, status, indent, metadata) have no targeted tests for edge cases like indent=0, very large line_number, or empty metadata
- **[sem teste]** `src-tauri/src/vault/watcher.rs` — `start_vault_watcher()` Tauri command has no test (vault_watcher_test.rs only tests `start_watcher_inner`). Missing: app handle integration, race conditions between start/stop, multiple start calls on same state
- `src-tauri/tests/commands/vault_test.rs` — Dead-but-registered commands (get_notes_with_tag_v2, get_tasks_in_path_v2, query_notes_by_property, get_property_values, get_note_properties, get_search_index_stats) have Rust-side tests but no TS consumer or contract test, so their wire shape can dr…
- `src-tauri/tests/search_fts_test.rs` — Missing test for expand_fuzzy_terms with empty input or very long terms that exceed reasonable distance thresholds
- `src-tauri/tests/vault_index_test.rs` — lookup_notes_with_tag: test verifies both '#work' and 'work' return length 1 but doesn't check if they return identical entries; should add assertion comparing result[0].path or result[0].title
- **[sem teste]** `src-tauri/tests/vault_watcher_test.rs` — No tests for watcher behavior when system is under load or when recv_emit times out; current tests all expect successful emit within 3s timeout


### features/collection (27)

- `src/lib/features/collection/CollectionCalendarView.svelte` — No unit test file; calendar view logic tested via E2E only.
- `src/lib/features/collection/CollectionCalendarView.svelte` — No direct test, no E2E (calendar.logic.ts tested).
- `src/lib/features/collection/CollectionLinearCalendarView.svelte` — No unit test file; linear calendar view logic tested via E2E only.
- `src/lib/features/collection/CollectionLinearCalendarView.svelte` — No direct test, no E2E (linear-calendar.logic.ts tested).
- `src/lib/features/collection/CollectionTableView.svelte` — No unit test file; UI component logic tested via E2E only.
- `src/lib/features/collection/CollectionTableView.svelte` — No direct test, no collection E2E spec. Collection logic/store/service tested; the table renderer is not.
- `src/lib/features/collection/CollectionView.svelte` — No unit test file; UI component tested via E2E only. Handler functions handleToggleSort, handleAddView, etc. are not unit-tested.
- **[sem teste]** `src/lib/features/collection/CollectionView.svelte` — No test covers the selfUpdate guard: nothing verifies that a self-triggered YAML persist does NOT re-seed local toolbar state (filters/sort/columns/in-progress formulas). Only logic/yaml-parser/store tests exist.
- `src/lib/features/collection/collection.logic.ts` — Tests exist but do not verify all exported functions. Functions like `buildPropertyIndex`, `formatCellValue`, `getPropertyValue`, `evaluateFilter`, and `executeQuery` are tested, but check that all getters/computed properties on results are asserted.
- `src/lib/features/collection/collection.logic.ts` — formatCellValue() is untested in batch. Should test null/undefined, Date objects, display values (link/image/icon/html), boolean, array, and string values.
- `src/lib/features/collection/collection.store.svelte.ts` — Store has getters for propertyIndex and isIndexReady, but no test verifies these getters are reactive or recompute correctly.
- **[sem teste]** `src/lib/features/collection/collection.types.ts` — No test file exists for types-only file. Only QueryResult, NoteRecord, and SortDef interfaces - these are used by callers but don't need unit tests.
- `src/lib/features/collection/collection.types.ts` — Type-only (imported by many tests as types). Low value.
- **[sem teste]** `src/lib/features/collection/expression/evaluator.ts` — Function-form contains() with multi-element arrays: no test covers contains(['a','b'], 'c') behavior. All relationship filter tests use method form .contains() instead of function form. Tests should verify function-form matches method-form semantics …
- **[sem teste]** `src/lib/features/collection/expression/expression.types.ts` — No test file for this types-only file. isDisplayValue() function has no explicit unit test (used in evaluator tests but not directly tested).
- `src/lib/features/collection/expression/methods.logic.ts` — Test file exists (methods.test.ts) but need to verify all exported methods are tested. File is 300+ lines with many method registries for string, number, date, array operations that should each have tests.
- `src/lib/features/collection/toolbar/CalendarConfigPanel.svelte` — No unit tests for component; props onDatePropertyChange, onEndDatePropertyChange, onWeekStartDayChange, onColorPropertyChange event callbacks untested
- `src/lib/features/collection/toolbar/CalendarConfigPanel.svelte` — No direct test; no E2E.
- `src/lib/features/collection/toolbar/FilterPanel.svelte` — No unit tests for component; filter group and row management logic, add/remove/update filter operations untested at component level
- `src/lib/features/collection/toolbar/FilterPanel.svelte` — No direct test (FilterRow is referenced in tests; filter.logic.ts tested); no E2E.
- `src/lib/features/collection/toolbar/FilterRow.svelte` — No unit tests for component; property/operator/value change handlers and raw expression mode switching untested
- `src/lib/features/collection/toolbar/FormulaRow.svelte` — No unit tests for component; edit mode toggling, name/expression input handling, and error display untested
- `src/lib/features/collection/toolbar/FormulaRow.svelte` — No direct test (formula.logic.ts tested); no E2E.
- `src/lib/features/collection/toolbar/PropertiesPanel.svelte` — No unit tests for component; column visibility toggling, formula entry management, and scroll-to-bottom on add untested
- `src/lib/features/collection/toolbar/PropertiesPanel.svelte` — No direct test (properties.logic.ts tested); no E2E.
- `src/lib/features/collection/toolbar/SortPanel.svelte` — No unit tests for component; drag-reorder, sort direction toggling, and add-sort dropdown untested
- `src/lib/features/collection/toolbar/SortPanel.svelte` — No direct test (sort.logic.ts tested); no E2E.


### plugins/kanban (24)

- `src/lib/plugins/kanban/KanbanCard.svelte` — No component tests. Card interactions untested: toggle checkbox, inline edit on double-click, date picker, card color picker, linked file content preview loading and display, wikilink click navigation, context menu operations.
- `src/lib/plugins/kanban/KanbanCard.svelte` — No unit test; E2E kanban-view.spec.ts only.
- `src/lib/plugins/kanban/KanbanCardText.svelte` — No component tests. Rich text rendering untested: wikilink rendering and click behavior, tag rendering and color popover interaction, mixed text/wikilink/tag segment parsing and display.
- `src/lib/plugins/kanban/KanbanCardText.svelte` — No unit test; E2E at best.
- `src/lib/plugins/kanban/KanbanDatePicker.svelte` — No component tests. Date picker untested: open/close, calendar navigation, date selection, date removal, proximity badge styling.
- `src/lib/plugins/kanban/KanbanDatePicker.svelte` — No unit test; no clear E2E coverage.
- `src/lib/plugins/kanban/KanbanLane.svelte` — No component tests. Lane-level interactions untested: item drag-drop within/between lanes, inline card editing, lane title editing, lane collapse, auto-complete toggle, max items setting, context menu operations, add-card input with wikilink suggesti…
- `src/lib/plugins/kanban/KanbanLane.svelte` — No unit test; E2E kanban-view.spec.ts only.
- `src/lib/plugins/kanban/KanbanListView.svelte` — No component tests. List view rendering untested: lane sections, item display, checkbox toggle, wikilink clicks.
- `src/lib/plugins/kanban/KanbanListView.svelte` — No unit test; E2E kanban-view.spec.ts at best.
- `src/lib/plugins/kanban/KanbanTableView.svelte` — No component tests. Table view rendering untested: table structure, tag extraction and display, date display, checkbox toggle.
- `src/lib/plugins/kanban/KanbanTableView.svelte` — No unit test; E2E kanban-view.spec.ts at best.
- `src/lib/plugins/kanban/KanbanView.svelte` — No component tests. Critical UI behavior untested: board drag-drop, keyboard navigation (arrow keys, space, enter, delete), filter/sort UI updates, view mode switching, lane width resizing, archive expand/collapse.
- **[sem teste]** `src/lib/plugins/kanban/KanbanView.svelte` — selfUpdate latch path untested: no test that an external markdownContent change after a no-op self-serialize still re-parses the board.
- `src/lib/plugins/kanban/KanbanView.svelte` — No unit test; E2E kanban-view.spec.ts only.
- `src/lib/plugins/kanban/KanbanWikilinkSuggestions.svelte` — No component tests. Suggestion dropdown untested: wikilink context detection, file matching, keyboard navigation, suggestion selection.
- `src/lib/plugins/kanban/KanbanWikilinkSuggestions.svelte` — No unit test; no clear E2E coverage.
- **[sem teste]** `src/lib/plugins/kanban/kanban.logic.ts` — No tests for negative edge cases in moveItem: toIndex clamping near 0 (e.g., toIndex=-1 should clamp to 0); interaction with empty source lane; or target lane not found
- **[sem teste]** `src/lib/plugins/kanban/kanban.logic.ts` — No tests for parseCardSegments with consecutive metadata tokens like '{2025-01-01}{color:red}' in rapid succession or nested edge cases
- **[sem teste]** `src/lib/plugins/kanban/kanban.logic.ts` — No tests for card metadata stripping functions with overlapping patterns (e.g., text containing both legal dates and color names but in wrong format: 'Task 2025-01-01 not in braces'
- **[sem teste]** `src/lib/plugins/kanban/kanban.service.ts` — loadLinkedFileContent race condition not tested: no test for out-of-order Promise resolution where rapid card edits cause stale data to overwrite fresh data.
- `src/lib/plugins/kanban/kanban.service.ts` — Function `createKanbanFile` is tested but does not verify that writeTextFile is called with exact markdown (only that expectedMd contains certain strings, not that the written output is identical)
- **[sem teste]** `src/lib/plugins/kanban/kanban.store.svelte.ts` — No tests for store getters (lanes, archive, settings) to verify they return the same reference across consecutive calls vs. creating new references each time
- `src/lib/plugins/kanban/kanban.types.ts` — Type-only. Low value.


### features/canvas (21)

- **[sem teste]** `src/lib/features/canvas/CanvasContextMenu.svelte` — No test file - component presents context menus, no unit test coverage
- `src/lib/features/canvas/CanvasContextMenu.svelte` — No unit test; E2E coverage uncertain (canvas-view.spec may not open context menu).
- **[sem teste]** `src/lib/features/canvas/CanvasEdge.svelte` — No test file - custom edge component, edge styling/label rendering untested
- **[sem teste]** `src/lib/features/canvas/CanvasFilePicker.svelte` — No test file - file picker dialog, no tests for filtering/selection logic
- `src/lib/features/canvas/CanvasFilePicker.svelte` — No unit test; no clear E2E coverage.
- **[sem teste]** `src/lib/features/canvas/CanvasInner.svelte` — No test file - core canvas component with state sync, undo/redo, group reparenting; none of this is tested
- `src/lib/features/canvas/CanvasInner.svelte` — No unit test; E2E canvas-view.spec.ts only.
- **[sem teste]** `src/lib/features/canvas/CanvasLinkInput.svelte` — No test file - URL input dialog, no tests for https:// auto-prefixing or validation
- `src/lib/features/canvas/CanvasLinkInput.svelte` — No unit test; no clear E2E coverage.
- **[sem teste]** `src/lib/features/canvas/CanvasToolbar.svelte` — No test file - toolbar buttons, untested
- `src/lib/features/canvas/CanvasToolbar.svelte` — No unit test; E2E canvas-view.spec.ts only.
- **[sem teste]** `src/lib/features/canvas/CanvasView.svelte` — No test file - wrapper component, untested
- `src/lib/features/canvas/CanvasView.svelte` — No unit test; E2E canvas-view.spec.ts only.
- **[sem teste]** `src/lib/features/canvas/ColorPicker.svelte` — No test file - color selection component, untested
- `src/lib/features/canvas/ColorPicker.svelte` — No unit test; no clear E2E coverage.
- **[sem teste]** `src/lib/features/canvas/FileNode.svelte` — No test file - file preview node loading/error states untested; readTextFile promise handling untested
- **[sem teste]** `src/lib/features/canvas/GroupNode.svelte` — No test file - group node rendering untested
- **[sem teste]** `src/lib/features/canvas/ImageNode.svelte` — No test file - image loading/error states untested; resolveImageSrc promise handling untested; blob URL revocation untested
- **[sem teste]** `src/lib/features/canvas/LinkNode.svelte` — No test file - link node editing/URL opening untested; $effect(data.editing) trigger untested
- **[sem teste]** `src/lib/features/canvas/TextNode.svelte` — No test file - text node editing untested; $effect(data.editing) trigger untested; markdown rendering untested
- `src/lib/features/canvas/canvas-image.logic.ts` — resolveImageSrc() - async function handling external URLs and local Tauri file reads with Blob creation, not tested


### features/properties (12)

- `src/lib/features/properties/LifecycleActions.svelte` — No unit test, no E2E; pairs with the untested lifecycle.service.ts (whole lifecycle UI path uncovered).
- `src/lib/features/properties/PropertyField.svelte` — No direct test; possibly rendered via PropertiesView refs in tests / sidebars.spec, but never asserted on.
- `src/lib/features/properties/RelationshipSearch.svelte` — No unit test, no E2E.
- **[sem teste]** `src/lib/features/properties/lifecycle-filter.service.ts` — No test file. Exports refreshArchivedPaths which calls Tauri invoke and updates store.
- **[sem teste]** `src/lib/features/properties/lifecycle-filter.service.ts` — No test file exists. Should test refreshArchivedPaths with both provided entries and Tauri IPC path, plus error handling.
- **[sem teste]** `src/lib/features/properties/lifecycle-filter.service.ts` — No test file. invoke('get_all_vault_entries_v2') + store write untested; also lacks try/catch.
- **[sem teste]** `src/lib/features/properties/lifecycle.service.ts` — No test file. Exports setOrganized, setArchived, setFavorite which call syncExternalContentToEditor.
- **[sem teste]** `src/lib/features/properties/lifecycle.service.ts` — No test file exists. Should test setOrganized, setArchived, setFavorite functions with store/editor interactions.
- **[sem teste]** `src/lib/features/properties/lifecycle.service.ts` — No test file. Writes propertiesStore + syncs editor content; zero coverage of setOrganized/setArchived/setFavorite orchestration.
- **[sem teste]** `src/lib/features/properties/properties.logic.ts` — No test coverage for yaml-quoting.logic integration. The serializePropertyValue and serializeProperties functions rely on yaml.Document but don't test edge cases like backslash+quote sequences in values.
- `src/lib/features/properties/properties.service.ts` — updateProperty and upsertProperty lack tests for canonical key alias mismatches (e.g., calling with 'color' when '_color' exists).
- `src/lib/features/properties/properties.types.ts` — Type-only. Low value.


### features/tags (11)

- `src/lib/features/tags/TagColorDot.svelte` — No unit test, no E2E.
- `src/lib/features/tags/TagColorPicker.svelte` — No unit test, no E2E (tag-colors.logic.ts tested).
- `src/lib/features/tags/TagItem.svelte` — No unit test, no E2E.
- **[sem teste]** `src/lib/features/tags/TagsPanel.svelte` — No tests for debounced saveSettings, tag color changes, filter toggle, sort toggle, or the $effect listening to vaultIndexVersion.
- `src/lib/features/tags/TagsPanel.svelte` — Component is never mounted and has no component test; if it is supposed to exist, nothing would catch its drift from TagsView (or its accidental deletion).
- `src/lib/features/tags/TagsPanel.svelte` — No unit test and NO E2E (no 'tag' occurrence in sidebars.spec.ts; no tags spec). Entire tags panel UI untested (logic/store/service tested).
- **[sem teste]** `src/lib/features/tags/TagsView.svelte` — No tests for the same patterns as TagsPanel (debounce, color persistence, filtering, sorting).
- `src/lib/features/tags/TagsView.svelte` — No unit test, no E2E.
- `src/lib/features/tags/tag-colors.logic.ts` — getContrastTextColor() is not tested. Need tests covering light background (brightness > 150 -> dark text), dark background (brightness <= 150 -> white text), and edge cases (pure black, pure white).
- `src/lib/features/tags/tags.service.ts` — Functions openTagsTab(), closeTagsTab(), and toggleTagsTab() are not tested. These functions modify editorStore.tabs and manage the TAGS_VIRTUAL_PATH tab.
- `src/lib/features/tags/tags.types.ts` — Type-only. Low value.


### features/type-definitions (11)

- **[sem teste]** `src/lib/features/type-definitions/SidebarModeToggle.svelte` — No test file exists; component uses saveSettings which could fail, but error is swallowed via .catch() with only console.error
- `src/lib/features/type-definitions/SidebarModeToggle.svelte` — No unit test, no E2E (Cmd+Shift+E cycling UI untested at component level).
- **[sem teste]** `src/lib/features/type-definitions/TypeNameDialog.svelte` — No test file exists; component validates input and calls onConfirm callback, no test coverage for error scenarios
- `src/lib/features/type-definitions/TypeNameDialog.svelte` — No unit test, no E2E (rename-with-propagation entry dialog).
- **[sem teste]** `src/lib/features/type-definitions/TypeNoteList.svelte` — No test file exists; complex component with multiple effects, async functions, and error handling paths not covered by tests
- **[sem teste]** `src/lib/features/type-definitions/TypeSidebar.svelte` — No test file exists; component with debounced view count updates and complex state management not tested
- `src/lib/features/type-definitions/TypeSidebar.svelte` — No unit test, no E2E (no TypeSidebar/type-sidebar reference in e2e/specs). type-sidebar.logic.ts IS tested.
- `src/lib/features/type-definitions/type-definitions.service.ts` — refreshTypeDefinitions (exported line 21) is not tested; no test file imports or covers this function
- `src/lib/features/type-definitions/type-definitions.store.svelte.ts` — Store getter getTypeMetadata (lines 17-19) is tested on line 43-53 of the test file. No gaps detected.
- `src/lib/features/type-definitions/type-definitions.store.svelte.ts` — Store getter sortedTypes (lines 22-24) is tested on lines 55-75 of the test file. No gaps detected.
- `src/lib/features/type-definitions/type-sidebar.logic.ts` — collectViewFiles (lines 436-441) is tested on lines 741-789. getAllKnownProperties is not directly tested in this batch but referenced indirectly via combineAvailableProperties.


### features/tasks (11)

- `src/lib/features/tasks/TasksView.svelte` — No unit test file exists. Component has reactive logic ($derived.by for filteredGroups/stats), event handlers (handleFileClick, handleToggle, handleSync), debouncing of section tag filter, and reactive $effect that calls buildTaskIndex. These should …
- **[sem teste]** `src/lib/features/tasks/TasksView.svelte` — No test for the vaultIndexVersion -> buildTaskIndex effect: burst behavior, overlapping IPC calls, and out-of-order completion overwriting newer task groups are all unexercised.
- `src/lib/features/tasks/TasksView.svelte` — No unit test; E2E tasks-view.spec.ts only.
- `src/lib/features/tasks/TodoistPopover.svelte` — No unit test file exists. Component has interactive select elements, error handling (line 216), and async operations (loadProjects, loadSections, sendTaskToTodoist) that should be tested.
- `src/lib/features/tasks/TodoistPopover.svelte` — No unit test, no E2E ('todoist' = 0 hits in e2e/specs). Todoist service/store/client tested; the send-to-Todoist UI is not.
- `src/lib/features/tasks/task-metadata.types.ts` — Type-only (task-metadata.logic.ts is tested). Low value.
- `src/lib/features/tasks/tasks.types.ts` — Type-only. Low value.
- `src/lib/features/tasks/todoist.service.ts` — loadProjects: Missing tests for success path, error handling, cache behavior (forceRefresh flag), loading state transitions
- `src/lib/features/tasks/todoist.service.ts` — loadSections: Missing tests for success path, error handling, loading state transitions, projectId parameter passing
- `src/lib/features/tasks/todoist.service.ts` — syncTodoistTasks: Missing tests for parallel fetching via Promise.allSettled, partial failure handling, store updates, disk persistence
- `src/lib/features/tasks/todoist.types.ts` — Type-only. Low value.


### routes (9)

- **[sem teste]** `src/routes/(app)/+layout.svelte` — No tests for the core effects: vault initialization, backlinks fetching, content indexing, and search. Race conditions and out-of-order promise completion are not covered by tests.
- **[sem teste]** `src/routes/(app)/+page.svelte` — No tests for vault picker UI, recent vaults list rendering, and event handlers (openVault, openRecent, removeRecent).
- `src/routes/(app)/+page.svelte` — No unit test; exercised implicitly by every E2E spec (app entry page).
- **[sem teste]** `src/routes/+layout.svelte` — No tests — this is the root layout that sets up global styles and renders children.
- **[sem teste]** `src/routes/+layout.ts` — No tests for SSR configuration file.
- **[sem teste]** `src/routes/+layout.ts` — 5-line SvelteKit prerender config, no test. Low value.
- `src/routes/composer/+page.svelte` — No unit tests for composer UI. Behavior should include: save/dismiss idempotency, keyboard shortcuts (Esc, Cmd+Enter), 180ms save flash timing, Tauri event listener lifecycle.
- `src/routes/composer/+page.svelte` — The composer webview's IPC path (submit_composer_capture / dismiss_composer invoked from a second window under the restricted 'composer' capability) has no test; a capability regression blocking these invokes would ship unnoticed.
- `src/routes/composer/+page.svelte` — Quick-capture composer window route: no unit test and NO E2E spec touches it (grep 'composer|quick-capture' in e2e/specs = 0).


### plugins/queryjs (8)

- `src/lib/plugins/queryjs/data-array.ts` — distinct() without key function is not tested on array of objects (only primitives tested)
- `src/lib/plugins/queryjs/kb-api.ts` — The renderValue private method's KBLink click handler (lines 417-421) is not tested to verify that openFileInEditor is actually invoked when a link is clicked
- `src/lib/plugins/queryjs/kb-ui.ts` — heatmapCalendar with entries crossing timezone year boundaries not tested
- `src/lib/plugins/queryjs/kb-ui.ts` — yearlyCalendar with entries crossing year boundaries not tested
- `src/lib/plugins/queryjs/kb-ui.ts` — getDayOfYearLocal() behavior with DST transitions or extreme timezones not tested
- `src/lib/plugins/queryjs/kb-ui.ts` — The chart() method has one test marked .todo() at line 915 in the test file ("renders error message when Chart.js import fails") - this error path is not covered
- `src/lib/plugins/queryjs/kb-ui.types.ts` — Type-only. Low value.
- `src/lib/plugins/queryjs/queryjs.types.ts` — Type-only. Low value.


### outros (8)

- `src/lib/types/vault-v2.types.ts` — No corresponding source file test discovered; vault-v2.types.ts is a type-only file, so type tests in vault-v2.types.test.ts are appropriate
- **[sem teste]** `src/lib/utils.ts` — shadcn cn()/utility helpers, no test. Low value.
- `src/tests (all service tests) + scripts/e2e.sh` — No true end-to-end IPC test exists: TS tests mock invoke(), Rust tests call inner fns, and Playwright E2E runs frontend-only (PLAYWRIGHT=true pnpm dev, no Tauri). Serde rename / arg-key / shape drift between the two sides is only detectable at runtim…
- **[sem teste]** `src/tests/lib/core/app-lifecycle/app-lifecycle.service.test.ts` — No test asserts teardownVault releases Rust semantic state (shutdown_semantic) or that a vault switch cannot serve the previous vault's semantic SEARCH_CACHE; the cross-vault stale-cache path is fully untested on both sides.
- `src/tests/lib/core/app-lifecycle/watcher-handler.service.test.ts` — The relativePath fallback branch (changed path not starting with vaultPath — symlinked/canonicalized vault roots) is untested; no assertion on what key reaches update_search_index_file / update_semantic_file in that case.
- `src/tests/lib/core/filesystem/fs.watcher.test.ts` — onFileChange() unsubscribe function: test only checks that unsub() doesn't throw, not that the listener is actually removed from the listeners array. Should emit event after unsubscribe and verify unsubscribed listener is not called.
- `src/tests/lib/core/settings/update-check.service.test.ts` — check_for_update_on_channel Rust tests cover endpoint mapping only; the rid handoff to plugin:updater|download_and_install, the allowDowngrades comparator path, and the UpdateMetadata null-vs-Some wire shape have no integration coverage.
- **[sem teste]** `src/tests/lib/features/search/search.service.test.ts` — No test feeds a 'downloading-reranker' phase through the semantic-index-progress listener; the throttle/phase-transition logic is only exercised with the three phases the TS union declares.


### core/editor (7)

- `src/lib/core/editor/editor.hooks.ts` — notifyAfterSave() side effects: updateNoteInIndex, updateFrontmatterIconForFile, updateCalendarForFile calls never asserted; invalidateQueryjsCache() and clearLinkedContentCache() calls never mocked/verified; backlinksStore.markUnlinkedDirty() call n…
- `src/lib/core/editor/editor.service.ts` — Fire-and-forget invoke calls in reloadExternallyChangedTabs (line 370-372) don't have test coverage for rejection handling. The read transform applied during external reload is tested but the combined flow of read+transform+sync with external content…
- `src/lib/core/editor/editor.service.ts` — onContentChange() function: never tested with frontmatterChanged=true parameter; the 500ms frontmatter debounce path and cross-debounce cancellation logic untested
- **[sem teste]** `src/lib/core/editor/editor.service.ts` — No test that resetEditor() cancels BOTH debounce timers (the 500ms frontmatter timer is currently not cancelled) nor that a pending frontmatter save cannot fire after store reset.
- **[sem teste]** `src/lib/core/editor/editor.service.ts` — saveDirtyTabs retry path untested: no test for the 5s retry rescheduling, retry-chain termination after teardown, or repeated-failure toast behavior.
- `src/lib/core/editor/editor.store.svelte.ts` — Getter `activeTab` edge case when activeIndex is out of bounds (should return null, covered via tests but no specific edge case test). Store reset behavior during vault switch not explicitly tested.
- `src/lib/core/editor/editor.types.ts` — Type-only declarations, no runtime code. Low value.


### core/file-explorer (6)

- **[sem teste]** `src/lib/core/file-explorer/FileExplorer.svelte` — No test directory exists for file-explorer components. FileExplorer, FileExplorerHeader, FileTreeItem.svelte have no coverage.
- `src/lib/core/file-explorer/FileExplorer.svelte` — No unit test; covered by e2e/specs/file-explorer.spec.ts only.
- `src/lib/core/file-explorer/FileExplorerHeader.svelte` — No unit test; E2E file-explorer.spec.ts only.
- `src/lib/core/file-explorer/FileTreeItem.svelte` — Drag & drop handlers (handleDragStart, handleDragOver, handleDragLeave, handleDrop) are not tested. Rename flow edge cases (pending creation + commit vs cancel) untested.
- `src/lib/core/file-explorer/FileTreeItem.svelte` — No unit test; E2E file-explorer.spec.ts / file-operations.spec.ts only.
- **[sem teste]** `src/lib/core/file-explorer/file-explorer.context.ts` — Svelte context helper (22 lines), no test.


### core/status-bar (6)

- **[sem teste]** `src/lib/core/status-bar/SaveStatus.svelte` — No test file exists; component has derived state logic that should be tested
- `src/lib/core/status-bar/SaveStatus.svelte` — No unit test; no E2E asserts on save-status UI directly.
- **[sem teste]** `src/lib/core/status-bar/SemanticIndexStatus.svelte` — No test file exists; component has $effect with RPC call and observer registration that should be tested
- `src/lib/core/status-bar/SemanticIndexStatus.svelte` — No unit test, no E2E ('semantic' = 0 hits in e2e/specs); semantic-index-status.logic.ts IS tested.
- **[sem teste]** `src/lib/core/status-bar/StatusBar.svelte` — No test file exists; component accepts snippet props and renders conditional content
- `src/lib/core/status-bar/StatusBar.svelte` — No unit test and no E2E spec asserts on the status bar.


### features/auto-move (6)

- **[sem teste]** `src/lib/features/auto-move/AutoMoveRuleRow.svelte` — No test file exists; component's icon picker, expression validation UI (line 40-43), and handlers untested
- `src/lib/features/auto-move/AutoMoveRuleRow.svelte` — No unit test, no E2E ('auto-move' = 0 hits). Logic/service/store are tested.
- **[sem teste]** `src/lib/features/auto-move/AutoMoveSection.svelte` — No test file exists; component's rule management UI, excluded folders editor, and debounce input handling untested
- `src/lib/features/auto-move/AutoMoveSection.svelte` — No unit test, no E2E.
- `src/lib/features/auto-move/auto-move.service.ts` — mkdir failure case not tested; implementation has try/catch but saveAutoMoveConfig test doesn't verify mkdir rejection handling
- `src/lib/features/auto-move/auto-move.types.ts` — Type-only. Low value.


### features/file-icons (6)

- `src/lib/features/file-icons/IconPicker.svelte` — No unit tests for the component; effects and icon loading lifecycle not covered
- `src/lib/features/file-icons/IconPicker.svelte` — No unit test, no E2E ('icon' = 0 hits in e2e/specs).
- `src/lib/features/file-icons/IconRenderer.svelte` — No unit test, no E2E; used across file tree, tabs, panels (icon-resolver.ts IS tested).
- **[sem teste]** `src/lib/features/file-icons/file-icons.icon-data.ts` — Static icon data table, no test. Low value.
- `src/lib/features/file-icons/file-icons.store.svelte.ts` — packVersion getter/bump are tested indirectly in service tests, but no dedicated store test verifies packVersion state and reactivity.
- `src/lib/features/file-icons/file-icons.types.ts` — Type-only. Low value.


### features/search (6)

- **[sem teste]** `src/lib/features/search/SearchPanel.svelte` — No tests for Svelte component. Interactions, mode toggle button disabling when model unavailable (line 106), fuzzy toggle visibility (line 90), and result list rendering should be tested.
- `src/lib/features/search/SearchPanel.svelte` — No unit test; E2E search.spec.ts only.
- **[sem teste]** `src/lib/features/search/SearchResult.svelte` — No tests for rendering results in different modes, click handlers for openFileInEditor, pendingScrollPosition setting, and path resolution edge cases.
- `src/lib/features/search/SearchStatus.svelte` — No unit test; E2E search.spec.ts at best.
- **[sem teste]** `src/lib/features/search/search.service.ts` — No tests for error cases where vaultPath is null/empty and affects FTS tag filtering (line 220 path concatenation bug).
- `src/lib/features/search/search.types.ts` — Type-only. Low value.


### features/deep-link (5)

- **[sem teste]** `src/lib/features/deep-link/deep-link.service.ts` — registerDeepLinkListener: no tests for the listener registration, cold-start URL check, or unsubscribe cleanup
- **[sem teste]** `src/lib/features/deep-link/deep-link.service.ts` — handleDeepLinkUrl: no tests for rejection propagation or error handling of unawaited promises
- **[sem teste]** `src/lib/features/deep-link/deep-link.service.ts` — executeNewAction prepend/append: no tests for race condition when file deleted between exists() and readTextFile()
- `src/lib/features/deep-link/deep-link.service.ts` — registerDeepLinkListener (lines 35-65) is exported and public but has zero test coverage. No tests for listener setup, cleanup function, error handling, or cold-start URL detection.
- `src/lib/features/deep-link/deep-link.types.ts` — Type-only. Low value.


### features/file-history (5)

- `src/lib/features/file-history/DiffViewer.svelte` — No unit test, no E2E (file-history.logic diff logic IS tested).
- `src/lib/features/file-history/FileHistoryDialog.svelte` — No unit test, no E2E ('history' = 0 hits in e2e/specs). Whole file-history UI is untested at component level.
- `src/lib/features/file-history/SnapshotList.svelte` — No unit test, no E2E.
- **[sem teste]** `src/lib/features/file-history/file-history.service.ts` — restoreSnapshot: no test for the case where editorStore.editorView becomes null between check and dispatch
- `src/lib/features/file-history/file-history.types.ts` — Type-only. Low value.


### features/quick-switcher (4)

- **[sem teste]** `src/lib/features/quick-switcher/QuickSwitcher.svelte` — No test file. Missing tests for: handleOpenChange, selectFile, createAndOpenNote, and reactive $derived chains (allFiles, filteredFiles, hasResults).
- **[sem teste]** `src/lib/features/quick-switcher/quick-switcher.service.ts` — No test file. Exports resetQuickSwitcher (minimal function).
- **[sem teste]** `src/lib/features/quick-switcher/quick-switcher.service.ts` — No test file. resetQuickSwitcher() is only tested indirectly via store tests; a dedicated service test is missing.
- **[sem teste]** `src/lib/features/quick-switcher/quick-switcher.service.ts` — No test file; mocked out in app-lifecycle.service.test.ts, so real teardown reset never verified.


### core/layout (4)

- `src/lib/core/layout/AppOverlays.svelte` — No unit test; rendered implicitly in all E2E specs.
- `src/lib/core/layout/AppShell.svelte` — No unit test; rendered implicitly in all E2E specs.
- `src/lib/core/layout/tauri-listeners.service.ts` — registerVaultIndexUpdatedListener fan-out (full entries fetch + refreshTypeDefinitions + conditional loadDirectoryTree) has no test for event bursts or for the cancelled-flag race between unlisten and the in-flight invoke.
- **[sem teste]** `src/lib/core/layout/tauri-listeners.service.ts` — No test that N rapid vault-index-updated events coalesce; current behavior of one full get_all_vault_entries_v2 fetch per event (incl. per-file watcher emissions) is uncovered.


### features/backlinks (3)

- `src/lib/features/backlinks/LinkItem.svelte` — No direct test; likely rendered indirectly via BacklinksPanel.test.ts.
- `src/lib/features/backlinks/backlinks.logic.ts` — parseWikilinks: missing test cases for wikilinks with spaces around pipe/hash (e.g. '[[note | alias ]]', '[[note# heading ]]')
- `src/lib/features/backlinks/backlinks.types.ts` — Type-only. Low value.


### plugins/one-on-one (3)

- **[sem teste]** `src/lib/plugins/one-on-one/one-on-one.logic.ts` — No tests for buildOneOnOneVariables when periodicNotesSettings has missing or empty daily.format field; edge case where buildWikilinkPath could fail silently
- **[sem teste]** `src/lib/plugins/one-on-one/one-on-one.service.ts` — No tests for createOneOnOneNote error propagation when openOrCreateNote rejects; line 214 tests rejection but does not verify the exact error message or stack is preserved
- **[sem teste]** `src/lib/plugins/one-on-one/one-on-one.service.ts` — No tests for loadPeople behavior when readDir rejects after exists succeeds (readDir failure during directory scan)


### plugins/graph-view (3)

- `src/lib/plugins/graph-view/GraphControls.svelte` — No unit test, no graph E2E spec (GraphView itself referenced in unit tests).
- **[sem teste]** `src/lib/plugins/graph-view/GraphView.svelte` — Only logic/service/store tests exist. No test that an index bump preserves (or intentionally resets) node positions, or that bursts of bumps don't fire overlapping get_all_vault_entries_v2 fetches.
- `src/lib/plugins/graph-view/graph-view.types.ts` — Type-only. Low value.


### core/app-lifecycle (2)

- `src/lib/core/app-lifecycle/app-lifecycle.service.ts` — Rapid vault switch race condition with initVersion counter not explicitly tested. Semantic search deferred init timer cancellation race edge cases not covered. The version-checking logic in async callbacks is correct but integration tests would benef…
- `src/lib/core/app-lifecycle/watcher-handler.service.ts` — Full rebuild fallback path after incremental failure is covered but edge case of many deletes (>INCREMENTAL_THRESHOLD) not explicitly tested. Vault path null case during incremental update is not tested.


### core/filesystem (2)

- `src/lib/core/filesystem/fs.types.ts` — Type definitions file has no corresponding test file (type-only exports don't require tests)
- `src/lib/core/filesystem/fs.types.ts` — Type-only, no runtime code. Low value.


### features/command-palette (2)

- **[sem teste]** `src/lib/features/command-palette/CommandPalette.svelte` — No test file exists; component's $derived filtering (line 13-15), handleOpenChange (17-22), and executeCommand (24-34) logic untested
- `src/lib/features/command-palette/command-palette.types.ts` — Type-only. Low value.


### core/trash (2)

- `src/lib/core/trash/trash.store.svelte.ts` — Complete coverage exists. All getters (items, loading, count, isEmpty) and all methods (setItems, setLoading, addItem, removeItem, clear) have test cases.
- `src/lib/core/trash/trash.types.ts` — Type-only. Low value.


### features/bookmarks (2)

- `src/lib/features/bookmarks/bookmarks.service.ts` — mkdir failure case not tested in loadBookmarks/saveBookmarks; toggleBookmarkForPath and updateBookmarkPathsAfterMove error paths (silent swallow) not tested
- `src/lib/features/bookmarks/bookmarks.types.ts` — Type-only. Low value.


### features/outgoing-links (2)

- `src/lib/features/outgoing-links/OutgoingLinksPanel.svelte` — Test covers vaultIndexVersion refetch and collapse, but does NOT test: fileType rendering check (line 62), error handling when fetchOutgoingLinksV2 rejects (line 27), or assert on rendered link content (violates CLAUDE.md rule 8: assert on rendered c…
- `src/lib/features/outgoing-links/outgoing-links.types.ts` — Type-only. Low value.


### plugins/calendar (2)

- `src/lib/plugins/calendar/CalendarPanel.svelte` — No unit test; E2E calendar-plugin.spec.ts only (CalendarGrid referenced in unit tests).
- `src/lib/plugins/calendar/calendar.service.ts` — openCalendarFile(filePath: string) is exported but not tested. Should verify it correctly delegates to openFileInEditor and handles errors appropriately.


### plugins/word-count (2)

- `src/lib/plugins/word-count/WordCount.svelte` — Component is not tested. Behavior of 500ms debounce, reactive dependency on activeTab content, and rendered output stats should be verified.
- `src/lib/plugins/word-count/WordCount.svelte` — No unit test; E2E word-count.spec.ts only (word-count.logic.ts tested).


### plugins/table-of-contents (2)

- `src/lib/plugins/table-of-contents/TableOfContentsPanel.svelte` — No unit test; E2E table-of-contents.spec.ts only.
- `src/lib/plugins/table-of-contents/toc.types.ts` — Type-only. Low value.


### plugins/quick-capture (1)

- **[sem teste]** `src/lib/plugins/quick-capture/quick-capture.service.ts` — registerQuickCaptureListener function is not tested; no test coverage for event listener registration, queue serialization, or cleanup behavior


### core/keybindings (1)

- `src/lib/core/keybindings/global-keybindings.ts` — No source file in the batch; test file exists. The test at line 99 verifies 21 keybindings are registered (correct), but the cleanup test at line 226 only mocks 19 cleanup functions.


### core/vault (1)

- `src/lib/core/vault/vault.service.ts` — Complete coverage exists. openVaultDialog, openRecentVault, and closeVault all have corresponding test cases.


### core/zoom (1)

- `src/lib/core/zoom/zoom.service.ts` — Complete coverage exists. zoomIn, zoomOut, and resetZoom all have test cases covering boundaries and state transitions.


### lib/utils (1)

- `src/lib/utils/app-channel.ts` — Source implementation uses conditional __APP_CHANNEL__ constant; test only checks default case (stable), missing coverage of nightly channel case when __APP_CHANNEL__ is defined


### plugins/periodic-notes (1)

- `src/lib/plugins/periodic-notes/DailyNoteButton.svelte` — No unit test; possibly touched by editor-empty-state.spec.ts ('daily' mentions), never asserted directly.


## Notas por módulo (varredura)

- **rust/vault#3**: Comprehensive audit of parsing.rs (3156 lines). Code quality is high with careful attention to UTF-8 safety, boundary conditions, and error handling. All public functions have extensive unit test coverage directly in the module. No critical defects found. The implementation carefully mirrors TypeScript semantics as documented, with explicit handling of edge cases like multibyte characters, empty i…
- **tests/core/markdown-editor#2**: Batch "tests/core/markdown-editor#2" contains 9 comprehensive test files for live-preview markdown parser combinations. All 223 tests pass. The test files cover:
1. Parser function integration (callout, collection-block, frontmatter, table, code-blocks, math, headings, inline formatting, etc.)
2. Combined structures (block + inline, callout + multiple content types, edge cases)
3. Negative cases (…
- **tests/core/markdown-editor#5**: Batch contains 25 test files (all in tests/lib/core/markdown-editor/); all test files were fully read. All mirror source files in src/lib/core/markdown-editor/ were examined. Three defects found: (1) collection cache key does not invalidate on index content changes (medium severity, tested by test that assumes buggy behavior), (2) LinearCalendar startCell off-by-one indexing can skip event renderi…
- **tests:auto-move+backlinks+bookmarks**: Comprehensive review of 11 test files (2394 lines) in auto-move, backlinks, and bookmarks features. All tests follow proper conventions: no forbidden mocking of stores or .logic.ts files, assertions check real state, all computed getters have tests. All exported functions have test coverage. Service error handling uses try/catch with logging. Store getters (not $derived) are properly tested. No lo…
- **config:config**: Audit of config batch (8 files, 821 lines): app.d.ts, app.html, app.css, tauri.conf.json, build.rs, Cargo.toml, composer.json, default.json. All JSON files are syntactically valid. Version numbers are consistent (2.11.5) across tauri.conf.json and Cargo.toml. Build script (build.rs) properly handles git command failure via .ok().and_then().unwrap_or_else() chain with sensible fallback. CSS variabl…
- **tests:date.test.ts+debounce.test.ts+debug.test.ts+frontmatter-alia**: Reviewed all 13 test files in the batch (date, debounce, debug, frontmatter-aliases, fuzzy-match, index-dedupe, inflight, keybindings, log.service, path, sanitize-url, sanitize, template). Tests are comprehensive with good coverage of happy paths, edge cases, and error scenarios. All assertions check correct expected behavior. Mocking is done properly (no mocking of stores or .logic.ts files). No …
- **cross:ipc-contract**: Contract is in very good shape overall: all 62 #[tauri::command] fns are registered; all 51 production-invoked commands exist; every invoke payload key was verified against the actual Rust parameter names (Tauri 2 camelCase mapping) with zero mismatches; every IPC struct has serde rename_all=camelCase and the TS mirrors match field-for-field, including Option/skip_serializing_if vs optional fields…
- **cross:svelte-reactivity**: Scope: read docs/PATTERNS.md, then inspected all 54 $effect sites, the single $effect.pre (ThemeEditor.svelte:49, safe init-once under an {#if} remount), and all $derived/$state usages under src/lib, plus src/routes/(app)/+layout.svelte since it hosts the central orchestration effects. Convention checks that PASSED: zero $derived in any .store.svelte.ts (getter pattern upheld); all Tauri listener …
- **cross:ui-blocking**: Verification context: Tauri 2 sync `#[tauri::command] pub fn` handlers execute on the main/event-loop thread (only `async fn` commands are spawned onto the async runtime), which is why the sync full-vault commands (scan_vault_v2_cached, read_files_batch, get_all_vault_entries_v2, search_fts, save_snapshot, save_vault_cache) are flagged as ui-blocking — the codebase itself uses spawn_blocking for F…
- **cross:test-gap-map**: Coverage map summary. FRONTEND: 466 source files under src/lib + src/routes; 98 are shadcn-generated src/lib/components/ui/** (no tests, low value by convention, not listed individually). Test suite: 232 test files under src/tests mirroring src/lib, plus a Playwright E2E suite at e2e/specs/ (30 specs + live-preview/ subdir; run via scripts/e2e.sh). Overall frontend discipline is strong: every .sto…