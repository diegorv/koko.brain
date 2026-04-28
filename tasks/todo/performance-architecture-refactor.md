# Performance & Architecture Refactor

Move vault metadata computation (backlinks, outgoing links, tags, tasks, frontmatter) from TypeScript into Rust, incrementally, without breaking the app. Interleave reactivity fixes in the editor so every phase ships a visible win. End state: a Rust `VaultIndex` as source of truth for all note metadata, a native Rust watcher off the JS main thread, a single `vault-index-updated` event, a git-commit-hash cache for instant reopens, and a three-tier change detection system.

Full plan context: `/Users/diegorv/.claude/plans/pode-avaliar-o-users-diegorv-dev-pet-pro-mutable-eclipse.md` (approved 2026-04-28).

Replaces the abandoned PoC archived at `tasks/done/performance-architecture-refactor-poc.md`. The architectural shape is identical; this version anchors every task to file paths and line numbers verified by codebase audit on 2026-04-28, adds explicit risk gates on the behavioral phases (4.2, 5, 9), and uses balanced soak windows (30 min smoke for rAF removal, 4 h watcher parity, 2 days between flag default-on and orphan deletion).

## Tasks

### Phase -1 - Archive misleading PoC task file (one commit, no code)

- [x] **-1.1** Move `tasks/todo/performance-architecture-refactor.md` to `tasks/done/performance-architecture-refactor-poc.md` with a header note marking it as abandoned and superseded.
- [x] **-1.2** Create this fresh `tasks/todo/performance-architecture-refactor.md` from the approved plan (all `[ ]`, file paths and line numbers preserved).

### Phase 0 - Measurement Baseline

- [x] **0.1** Unify `PERF-BASELINE` tag across the existing probes:
  - `editor.service.ts::openFileInEditor` (already has `FE-STARTUP-PROBE`; add a parallel `PERF-BASELINE` line at start/end so both consumers can read it).
  - `editor.service.ts::switchTab` (lines 155-163) and `closeTab` (lines 170-202): add `perfStart`/`perfEnd` with tag `PERF-BASELINE`.
  - `index-updater.service.ts::updateIndexesForFile`: retag the existing perf line with `PERF-BASELINE`.
  - `active-tab-tracker.service.ts::updateActiveTabLinks`: same.
  - `MarkdownEditor.svelte` content-sync `$effect` (lines 321-337): new probe wrapping the toString check + dispatch.
- [x] **0.2** Create `scripts/perf-baseline.py`. Parses the most-recent log under `~/Library/Logs/com.diegorv.kokobrain/` for `PERF-BASELINE`; outputs median/p95 by `<TAG> <label>`. No E2E harness. Mirror style of `scripts/log-watcher.py`.
- [x] **0.3** Create `docs/perf/baseline-template.md`. Manual repro sequence (open 10 files, switch 20 times, close 5, type 500 chars, save). One-line command to enable debug + parse log. User commits filled-in copy as `docs/perf/baseline-<YYYY-MM-DD>.md`.
- [x] **0.4** Create `docs/adr/0025-rust-vault-index.md`. Number is correct: 0024 is highest existing. Link from `docs/adr/README.md` and from `CLAUDE.md` Documentation Index.

### Phase 1 - Rust Entry Enrichment (additive)

- [x] **1.1** Create `src-tauri/src/vault/mod.rs` and `vault/entry.rs`. Define `NoteEntry { path, title, frontmatter, outgoing_links, tags, modified_at, word_count, snippet }` with `#[serde(rename_all = "camelCase")]`. Wire `pub mod vault;` into `lib.rs`.
- [x] **1.2** `vault/parsing.rs::extract_outgoing_links`. Mirrors `backlinks.logic.ts::parseWikilinks` exactly: does NOT strip frontmatter or fenced code (TS doesn't either; opportunistic exclusion deferred to a future BEHAVIORAL phase to keep Phase 3.5 parity gate clean). Forms: `[[t]]`, `[[t|d]]`, `[[t#h]]`, `[[t#^b]]`, combinations `[[t#h|a]]`. `position` is a byte offset in Rust (TS emits UTF-16 code-unit offset; positions stay internal until Phase 2's `getContextSnippet` port).
- [ ] **1.3** `vault/parsing.rs::extract_tags_strict`. Unicode-aware, mirrors `tags.logic.ts::extractAllTags` exactly: rejects digit-first, strips HTML comments, normalizes trailing slash, no in-word matches. Coexist with `fts_logic::extract_tags` (do NOT modify the FTS variant).
- [ ] **1.4** `vault/parsing.rs::parse_frontmatter`. Hand-rolled minimal YAML (scalars, inline `[a, b]`, block `- item`, nested → null entries to preserve sibling parsing). No new crate dep. Malformed YAML → empty map, no panics.
- [ ] **1.5** `commands/vault.rs::scan_vault_v2(path) -> Vec<NoteEntry>`. Reuses `utils::fs::collect_markdown_paths_with_mtime`. Per-file errors logged via `debug_log("VAULT-V2", ...)` and skipped. Register in `lib.rs::generate_handler!`.
- [ ] **1.6** `src/lib/types/vault-v2.types.ts`. TS mirror with `@experimental` JSDoc on every exported symbol. Export recursive `FrontmatterValue` type.

### Phase 2 - Rust VaultIndex with Backlinks (additive)

- [ ] **2.1** `src-tauri/src/vault/index.rs`. `pub struct VaultIndex { entries, by_path, backlinks, version }`. Private fields, getter-only access (mirrors `noteIndexStore` getter pattern).
- [ ] **2.2** `VaultIndex::build(entries)`. Wikilink resolution mirrors `backlinks.logic.ts::resolveWikilink` exactly: lowercase filename stem + basename fallback for path-prefixed targets, first path wins on stem collisions, self-links filtered.
- [ ] **2.3** In `lib.rs`: `pub type VaultIndexState = RwLock<VaultIndex>;` exported from `vault/mod.rs`. Add `.manage(VaultIndexState::default())` next to the existing TerminalState manage. `scan_vault_v2` now takes `State<'_, VaultIndexState>` and calls `idx.build(...)` after collecting entries.
- [ ] **2.4** `commands/vault.rs::get_backlinks_v2(path) -> Vec<NoteEntry>`. Sort by title for stable UI ordering. Defensively filter out entries whose paths are missing.
- [ ] **2.5** `VaultIndex::update_entry(path, entry) -> UpdateResult { changed, affected, version }`. Diffs outgoing links vs previous entry; adds/removes source from target backlinks sets; cleans empty sets; self-links filtered.
- [ ] **2.6** `commands/vault.rs::update_note_in_index(path, content) -> UpdateResult`. Parses via Phase 1 extractors, calls `update_entry` under write guard, emits `vault-index-updated` carrying `UpdateResult` payload. mtime read from disk at call time. Failed emits logged but mutation already committed. Export `pub const VAULT_INDEX_UPDATED_EVENT: &str = "vault-index-updated";`.

### Phase 3 - Migrate Backlinks Consumers (behind flag)

- [ ] **3.1** Add `experimental: ExperimentalSettings` to `AppSettings` in `src/lib/core/settings/settings.types.ts`. First field: `rustBacklinks: boolean` default `false`. **Note**: this is the first nested experimental group; mirror the shape of existing groups (`SearchSettings`, `LayoutSettings`).
- [ ] **3.2** Add `vaultIndexVersion: number = 0` state + `bumpVaultIndexVersion(v: number)` setter + getter to `vault.store.svelte.ts`. In `+layout.svelte`, register a single global `listen('vault-index-updated', e => vaultStore.bumpVaultIndexVersion(e.payload.version))`.
- [ ] **3.3** Branch `active-tab-tracker.service.ts::updateActiveTabLinks` on `settingsStore.experimental.rustBacklinks`: flag-on calls `invoke('get_backlinks_v2', {path})` and writes `backlinksStore`; flag-off keeps existing TS path. Wrap both branches with the existing `perfEnd('ACTIVE-TAB', ...)` probe.
- [ ] **3.4** Migrate `BacklinksPanel.svelte` to consumer pattern: read `vaultStore.vaultIndexVersion` to invalidate; call `get_backlinks_v2` when active path changes OR version bumps. Effect uses `untrack()` per `docs/PATTERNS.md`.
- [ ] **3.5** Hook `update_note_in_index` into `editor.hooks.ts::notifyAfterSave` when flag on. Run **parallel** to existing TS indexers (do not remove yet). The parallel run validates parity.
- [ ] **3.6** Run `python3 scripts/perf-baseline.py` with flag on/off; commit `docs/perf/phase-3-comparison.md`.
- [ ] **3.7** Default-on after at least **2 days** of dogfooding (balanced risk posture).
- [ ] **3.8** Delete unreachable TS branches: body of `updateBacklinksForFile` no longer needed, `findLinkedMentionsFromReverse` if unused. **Apply CLAUDE.md "Removing or Refactoring Code" ritual**: each deletion's commit body must contain the explicit "Function A at [file:line] updates [store]. Replacement B at [file:line] also updates [store] via [mechanism]." sentence. Keep `noteIndexStore.reverseIndex` if any non-backlinks consumer still reads it (audit `noteIndexStore.reverseIndex` call sites first).
- [ ] **3.9** Remove `experimental.rustBacklinks` flag.

### Phase 4 - Tab-Switch Pipeline Cleanup (parallel with Phase 2-3)

- [ ] **4.1** Capture `switchTab` breakdown via Phase 0 probes; record before-numbers in commit body.
- [ ] **4.2** Investigate `forceDecorationRebuild.of(null)` at `MarkdownEditor.svelte:288`. **Risk gate (balanced)**: do a **30-minute manual smoke session** with the rAF removed (open large vault, scroll heavy, switch tabs, type fast, drop in/out of viewport). If no decoration regression appears, apply the trace-before-remove ritual and commit the removal. If a regression appears, restore the rAF + add an explanatory comment naming the symptom and the line that triggered it.
- [ ] **4.3** Combine language reconfigure (line 272 via `applyLanguageForTab`) + doc replace (lines 263-267) into a single `view.dispatch`. Inline the `getLanguageEffects` call before the dispatch builds its effects array.
- [ ] **4.4** Add `AbortController` to the tab-switch effect. Abort any prior pending rAF chain when `activeTabPath` changes again before the inner rAF fires. Track via local `let abortCtrl: AbortController | null` captured by the effect.
- [ ] **4.5** Vitest regression: simulate 100 rapid `switchTab` calls; assert at most one `forceDecorationRebuild` dispatched per resolved tab; assert prior abort signal clears stale rAFs.

### Phase 5 - Keystroke Reactivity Fix BEHAVIORAL (after Phase 0)

- [ ] **5.1** Inventory of external tab-content writers (already audited, confirm in commit body):
  - `tasks.service.ts:128, 135`
  - `link-updater.service.ts:41`
  - `properties.service.ts:42`
  - `editor.service.ts:320` (`reloadExternallyChangedTabs`)
- [ ] **5.2** Add `editor.service.ts::syncExternalContentToEditor(path: string, content: string)`. Single owner of "external content → CodeMirror" path. Internally bumps a new `editorStore.externalContentSignal` counter and calls the appropriate store mutator (path-keyed, dirty-aware).
- [ ] **5.3** Migrate each call site in 5.1 to `syncExternalContentToEditor`. **Apply trace-before-remove ritual** for the content-sync `$effect`: prove every external mutator now goes through the new function.
- [ ] **5.4** Replace content-sync `$effect` (MarkdownEditor.svelte:321-337) with a signal-driven effect on `editorStore.externalContentSignal`. Wrap with `untrack()` to avoid re-running on `editorStore.activeTab.content` reads. The effect dispatches the doc replace only when the signal bump indicates an external write.
- [ ] **5.5** Vitest tests:
  - `syncExternalContentToEditor` happy path (active tab + non-active tab + non-existent path).
  - Perf assertion: simulate 100 keystrokes via `onContentChange`, spy on `view.state.doc.toString`, assert zero calls.

### Phase 6 - Rust Outgoing Links

- [ ] **6.1** `commands/vault.rs::get_outgoing_links_v2(path)`. Reads `VaultIndex.entries[path].outgoing_links`.
- [ ] **6.2** `commands/vault.rs::get_outgoing_unlinked_mentions_v2(path)`. Port `outgoing-links.logic.ts::findOutgoingUnlinkedMentions` word-boundary rules. Same word-boundary regex as TS.
- [ ] **6.3** Add `experimental.rustOutgoing: boolean`. Branch `outgoing-links.service.ts`. Migrate `OutgoingLinksPanel.svelte` to consumer pattern (read `vaultIndexVersion`).
- [ ] **6.4** Default-on after **2 days** of dogfooding.
- [ ] **6.5** Delete TS orphans (`outgoing-links.service.ts` body, extract bits in logic). Trace-before-remove ritual.

### Phase 7 - Rust Tag & Task Indexes

- [ ] **7.1** Extend `VaultIndex` with `tags: HashMap<String, HashSet<PathBuf>>` and `tasks: HashMap<PathBuf, Vec<TaskItem>>`.
- [ ] **7.2** `parsing.rs::extract_tasks`. Checkboxes, statuses, line numbers, due dates. Mirror `tasks.logic.ts::extractTasks` + `task-metadata.logic.ts::parseTaskMetadata`.
- [ ] **7.3** Wire into `update_entry`: diff old/new tags + tasks; emit `vault-index-updated`.
- [ ] **7.4** Read commands: `get_notes_with_tag`, `get_all_tags`, `get_all_tasks`, `get_tasks_in_path`.
- [ ] **7.5** Write commands: `rename_tag`, `add_tag_to_note`, `remove_tag_from_note`, `toggle_task_status(path, line)`. **Critical**: `tasks.service.ts:113` currently writes disk directly via `writeTextFile`. Replace with `invoke('toggle_task_status', ...)`. This is one of the known JS write-surface violators.
- [ ] **7.6** Add `experimental.rustTagsAndTasks: boolean`. Migrate `TagsPanel.svelte`, `TasksView.svelte`. Default-on after **2 days** of dogfooding, then delete TS orphans (trace-before-remove ritual).

### Phase 8 - Rust Frontmatter / Properties + File Ops

- [ ] **8.1** Extend `VaultIndex` with `properties: HashMap<String, HashMap<Value, Vec<PathBuf>>>` (key → value → paths).
- [ ] **8.2** Wire into `update_entry`.
- [ ] **8.3** Read commands: `query_notes_by_property`, `get_property_values`, `get_note_properties`.
- [ ] **8.4** Write commands: `update_frontmatter`, `delete_frontmatter_key`, `rename_frontmatter_key`.
- [ ] **8.5** Add `experimental.rustProperties: boolean`. Migrate `PropertiesView.svelte` and `collection.service.ts`.
- [ ] **8.6** File-op commands: `create_note`, `rename_note`, `delete_note`, `create_folder`. Wraps current `writeTextFile`/`mkdir`/`rename` write surfaces.
- [ ] **8.7** Migrate `note-creator.service.ts:64` to `invoke('create_note', ...)` (template processing stays TS).
- [ ] **8.8** Migrate `templates.service.ts::ensureTemplatesFolder` to `invoke('create_folder', ...)`.
- [ ] **8.9** Audit `trash.service.ts:56,60,64,103,185` (mkdir/rename/remove). Decide per-call whether to invoke or stay TS (trash is complex; permanent delete + manifest may stay TS for now).
- [ ] **8.10** Properties Panel write branching: tab-open → `view.dispatch` (preserves CodeMirror history); tab-closed → `invoke('update_frontmatter', ...)`. Replace `properties.service.ts:42` `editorStore.updateContent()` with the split. Test specifically with a tab-switch in the middle of edits.
- [ ] **8.11** Default-on after **2 days** of dogfooding, then delete TS orphans (trace-before-remove ritual on each).
- [ ] **8.12** Meta-bind migration: wherever meta-bind triggers note creation, swap to `invoke('create_note', ...)`. `updateMetadata` stays on `view.dispatch`. Cache `parseFrontmatterProperties` by frontmatter substring.

### Phase 9 - Watcher Migration to Rust BEHAVIORAL (after 2-8 live)

- [ ] **9.1** Audit current TS watcher consumers (`fs.watcher.ts::onFileChange` listeners). Existing flow: 500 ms debounce → ≤10 files incremental, else full rebuild. `areAllRecentSaves` self-save filter; `isInsideHiddenDir` hidden-dir filter. Document the order.
- [ ] **9.2** Add `notify` crate to `src-tauri/Cargo.toml`. Verify version compatible with tokio 1.x. Implement native Rust watcher on a dedicated tokio task. 500 ms debounce. Emits a single `vault-index-updated` event after running through `update_entry` for each changed path. Add `experimental.rustWatcher: boolean` flag; emit events **parallel** to existing TS watcher for **4 hours** of dogfooding for parity verification.
- [ ] **9.2b** After parity verification (event-count delta < 1 percent via `debug_log` over the 4-hour window): flip `experimental.rustWatcher` default-on. Remove every frontend raw-watcher listener in a separate commit immediately after. Only `vault-index-updated` allowed thereafter.
- [ ] **9.3** Unconditionally ignore `.git/`, `.kokobrain/`, all dot-prefixed dirs (mirror `isInsideHiddenDir`).
- [ ] **9.4** Single Rust orchestrator: debounced paths → `update_entry` + `update_search_index_file` (existing FTS command) + `update_semantic_file` (existing semantic command).
- [ ] **9.5** Delete TS watcher fan-out: `fs.watcher.ts`, `watcher-handler.service.ts`. Trace-before-remove ritual.
- [ ] **9.6** `git_conflict_check` command via `std::process::Command` (`git status --porcelain`).
- [ ] **9.7** Startup + post-event check; conflict toast banner.
- [ ] **9.8** Exponential backoff on commit failures.

### Phase 10 - Git-Commit-Hash Cache OPT-IN

- [ ] **10.1** Cache JSON at `<app-data>/cache/<vault-hash>.json`.
- [ ] **10.2** `scan_vault_cached`: load → hash check → `git diff` + `git status` → re-parse only changed → write cache.
- [ ] **10.3** Edge cases: non-git, stale version, corruption, moved dir, uncommitted, case-rename, deletion.
- [ ] **10.4** `experimental.gitHashCache: boolean`.
- [ ] **10.5** Settings → Advanced "Clear Cache" action.
- [ ] **10.6** Perf test close → reopen.

### Phase 11 - Three-Tier Change Detection BEHAVIORAL (last)

- [ ] **11.1** Focus-based diff: `WindowEvent::Focused(true)` → `git status` + `git diff HEAD` vs last-seen. 500 ms debounce.
- [ ] **11.2** 10 s periodic poll while focused (configurable 5-60 s, 0 disables).
- [ ] **11.3** Cmd+R forces full rescan via `scan_vault_cached { force: true }`.
- [ ] **11.4** Verify watcher is sole in-session producer. Write ADR (next-available number, confirm at commit time).
- [ ] **11.5** Remove `noteIndexStore`, all TS index orphans (`backlinks.service.ts`, `outgoing-links.service.ts`, `tags.service.ts`, `tasks.service.ts`, `properties.service.ts`, `index-updater.service.ts`, `index-dedupe.ts`). Keep `legacyTsIndexers` flag for first release.
- [ ] **11.5b** Final write-surface audit. Grep `writeTextFile`, `mkdir`, `rename`, `removeFile`, `removeDir`, `@tauri-apps/plugin-fs`. Every remaining call must fall in one of three categories: editor save (`editor.service.ts:98` `saveFileByPath`), live-preview widget via `view.dispatch` (no direct fs), user-initiated op via Rust invoke. Known violators that earlier phases must clean up:
  - `tasks.service.ts:113` → Phase 7.5 invoke.
  - `properties.service.ts:42` → Phase 8.10 branching.
  - `note-creator.service.ts:64` → Phase 8.7 invoke.
  - `trash.service.ts:56,60,64,103,185` → Phase 8.9 decision.
  - `settings.service.ts:172` → stays (settings is not vault content).
- [ ] **11.6** Delete `active-tab-tracker.service.ts`. Trace-before-remove ritual.
- [ ] **11.7** Update `CLAUDE.md` Performance Guidelines (Indexing & Watcher section) and `docs/PATTERNS.md`.
- [ ] **11.8** Final `python3 scripts/perf-baseline.py` comparison → `docs/perf/final-<YYYY-MM-DD>.md`.

## Notes

- **Branch**: `claude/perf-refactor` (from `origin/main`).
- **Commit policy**: One commit per task, full Context/Problem/Solution/Behavior/Files format (see `docs/COMMITS.md`). Run relevant tests before each commit. No batching.
- **Ordering**: 1→2→3 strict. 4 parallel with 2-3. 5 standalone after 0. 6, 7, 8 any order. 9 requires 2-8 live. 10 and 11 must not be combined; 11.5 ships only after **2 days** of stable 11.1-11.4 - `legacyTsIndexers` flag retained for first release.
- **Risk posture (balanced)**:
  - Phase 4.2 `forceDecorationRebuild` removal: 30 min manual smoke session, restore on regression with explanatory comment.
  - Phase 9 watcher cutover: parallel emission with TS for 4 h, event-count delta < 1% gate before default-on.
  - Soak windows between default-on and orphan deletion: 2 days for 3.7-3.8, 6.4-6.5, 7.6, 8.11.
- **Trace-before-remove ritual**: mandatory on tasks 3.8, 4.2 (if removing rAF), 5.3, 6.5, 7.6, 8.11, 9.2b, 9.5, 11.5, 11.6. Each commit body must include the explicit "Function A at [file:line] updates [store]. Replacement B at [file:line] also updates [store] via [mechanism]." sentence.
- **Testing**: Never mock stores or `.logic.ts`. Getters (not `$derived`) in stores. Tabs, not spaces.
- **Perf claims**: every commit body needs before/after `appendLog` numbers.
