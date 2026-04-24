# Performance & Architecture Refactor

Move vault metadata computation (backlinks, outgoing links, tags, tasks, frontmatter) from TypeScript into Rust, incrementally, without breaking the app. Interleave reactivity fixes in the editor so every phase ships a visible win. End state: a Rust `VaultIndex` as source of truth for all note metadata, a native Rust watcher off the JS main thread, a single `vault-index-updated` event, a git-commit-hash cache for instant reopens, and a three-tier change detection system.

Full plan context: `/root/.claude/plans/performance-architecture-buzzing-cray.md`. Architectural patterns (event-driven update flow, consumer panel pattern, three permitted write surfaces, panel write-back branching) apply uniformly across all phases.

## Tasks

### Phase 0 — Measurement Baseline

- [x] **0.1** Add `perfStart` / `perfEnd` probes around `openFileInEditor`, `closeTab`, `switchTab` (tab-switch effect in `MarkdownEditor.svelte`), `updateActiveTabLinks`, `updateIndexesForFile`, and the content-sync `$effect`. Emit via `appendLog('PERF-BASELINE', …)`.
- [x] **0.2** Add `scripts/perf-baseline.py` that parses a session log file (`~/Library/Logs/com.diegorv.kokobrain/*.log`) and extracts `PERF-BASELINE` median/p95 timings grouped by `<TAG> <label>`. Plain log parser — no E2E harness (E2E fixtures are not a good fit for timing data).
- [x] **0.3** Create `docs/perf/baseline-template.md` describing the manual reproduction sequence (open 10 files, switch 20×, close 5, type 500 chars, save) and the one-line command to turn on the flag + parse the log. User fills in the numbers on their real vault and commits as `docs/perf/baseline-<date>.md`.
- [x] **0.4** Add ADR `docs/adr/0025-performance-refactor-rust-vault-index.md` (number bumped — 0018 was already taken by the batch-IPC ADR) documenting this plan at a high level. Linked from `CLAUDE.md` and `docs/adr/README.md`.

### Phase 1 — Rust Entry Enrichment (additive)

- [x] **1.1** Define `NoteEntry` in `src-tauri/src/vault/entry.rs` (path, title, frontmatter, outgoing_links, tags, modified_at, word_count, snippet). Serde camelCase.
- [x] **1.2** Implement `extract_outgoing_links` in `src-tauri/src/vault/parsing.rs`. Excludes frontmatter + fenced code. Handles `[[target]]`, `[[t|d]]`, `[[t#h]]`, `[[t#^b]]`.
- [x] **1.3** Implement `extract_tags` (nested, code-fence exclusion, in-word rejection). The existing `src-tauri/src/search/fts_logic.rs` extractor is too permissive (allows first-char digits, no HTML-comment strip, no trailing-slash normalisation) for the canonical NoteEntry view; wrote a Unicode-aware version in `vault/parsing.rs` that mirrors `tags.logic.ts::extractAllTags` exactly. fts_logic version retained for FTS5 indexing.
- [x] **1.4** Implement `parse_frontmatter` — malformed YAML → empty map, no panics. Minimal subset parser (scalars, inline arrays, block arrays) — adequate for note frontmatter; nested maps intentionally become null entries to preserve sibling parsing. No new crate dep (sandbox has no network egress for cargo fetches).
- [x] **1.5** Add `#[tauri::command] scan_vault_v2` returning `Vec<NoteEntry>`. Uses `NoteEntry::from_content` (new) + `utils::fs::collect_markdown_paths_with_mtime`. Per-file read failures logged and skipped.
- [x] **1.6** Mirror `NoteEntry` in `src/lib/types/vault-v2.types.ts` (`@experimental`). Also exports `FrontmatterValue` recursive type.

### Phase 2 — Rust Backlinks Index (parallel)

- [x] **2.1** `src-tauri/src/vault/index.rs` (moved from `src-tauri/src/index/` — staying under the `vault/` module to keep related code together): `VaultIndex { entries, by_path, backlinks, version }` with private fields + getter-only access (no drift between entries and reverse index).
- [x] **2.2** `VaultIndex::build(entries)` computing reverse index. Wikilink resolution mirrors TS `resolveWikilink` exactly: lowercase filename stem + basename-fallback for path-prefixed targets. First path wins on stem collisions. Self-links filtered.
- [x] **2.3** Wire `VaultIndex` into Tauri managed state (`RwLock<VaultIndex>`) via `VaultIndexState` alias in `vault/mod.rs`. `scan_vault_v2` takes `State<'_, VaultIndexState>` and calls `idx.build(...)` after collecting entries.
- [x] **2.4** `#[tauri::command] get_backlinks_v2(path)` → `Vec<NoteEntry>`. Sorts results by title for stable UI ordering; filters out entries whose paths are missing from the index (defensive, should not happen in normal operation).
- [x] **2.5** `VaultIndex::update_entry` returning `UpdateResult { changed, affected, version }`. Diffs outgoing links vs previous entry state; adds/removes source from target backlinks sets; cleans up empty sets. Self-links filtered.
- [x] **2.6** `#[tauri::command] update_note_in_index(path, content)` → parses via Phase 1 extractors, calls `update_entry`, emits `vault-index-updated` carrying the `UpdateResult`. Reads mtime from disk at call time; failed emits are logged but don't fail the mutation (already committed under the write lock). Event name exported as `VAULT_INDEX_UPDATED_EVENT` constant.

### Phase 3 — Migrate Backlinks Consumers

- [x] **3.1** Added `ExperimentalSettings` group on `AppSettings` with `rustBacklinks`, `rustOutgoing`, `rustTagsAndTasks`, `rustProperties`, `gitHashCache`, `legacyWatcher`, `legacyTsIndexers` — all default `false`. Persistence wired via `settings.service.ts`. Store exposes `settingsStore.experimental` getter + `updateExperimental` partial setter.
- [x] **3.2** Added `vaultStore.vaultIndexVersion` + `bumpVaultIndexVersion()`. Global `listen('vault-index-updated')` registered in `app-lifecycle.service.ts::initializeVault` (Step 0, idempotent — subscription survives vault switches because the Tauri managed VaultIndex is process-wide).
- [x] **3.3** Branched `updateActiveTabLinks` on `settingsStore.experimental.rustBacklinks`: flag on → `invoke('get_backlinks_v2')` → convert `NoteEntry[]` to `BacklinkEntry[]` (empty snippets for now) → populate store; flag off → existing TS reverse-index path. Outgoing links still flow through TS until Phase 6. Unlinked mentions panel-side path unchanged. Tests pin both branches plus the loading-guard bypass when the Rust path is active.
- [x] **3.4** Migrated the active-tab-links effect in `src/routes/+layout.svelte` to the consumer pattern — now depends on both `editorStore.activeTabPath` AND `vaultStore.vaultIndexVersion`. Any Rust `vault-index-updated` event re-invokes `updateActiveTabLinks`, which re-fetches via `get_backlinks_v2` when the flag is on. Kept the 150ms debounce + no-op isVirtualTab skip. Panel component itself (`BacklinksPanel.svelte`) reads from the store and needs no direct change.
- [x] **3.5** Added `shouldUpdateRustIndex()` check in `notifyAfterSave` that ORs every Rust migration flag (`rustBacklinks | rustOutgoing | rustTagsAndTasks | rustProperties`). When any is on, invokes `update_note_in_index` fire-and-forget after the TS updaters. Rust side emits `vault-index-updated` which bumps `vaultStore.vaultIndexVersion` and fans out to consumer panels. Tests pin: not called when all flags off, called once even when multiple flags on, swallows invoke failures without blocking observers.
- [ ] **3.6** Run `pnpm perf:baseline` with flag on; commit comparison to `docs/perf/phase-3-comparison.md`.
- [ ] **3.7** Enable flag by default after validation.
- [ ] **3.8** Delete orphan TS (`updateBacklinksForFile` etc.); keep `resolveWikilink` util.
- [ ] **3.9** Remove flag.

### Phase 4 — Tab-Switch Pipeline Cleanup

- [ ] **4.1** Baseline `switchTab` breakdown.
- [ ] **4.2** Remove redundant `forceDecorationRebuild.of(null)` rAF call (line ~288). **Deferred** — analysis shows the rebuild is needed because scrollTo happens AFTER the docChanged rebuild; removing it could cause a 150ms decoration lag on large files until scrollDebouncePlugin fires. Requires real-vault validation with the Phase 0 probes.
- [ ] **4.3** Combine language reconfigure + doc replace into single `view.dispatch`. **Deferred** — `applyLanguageForTab` is async (awaits `getLanguageEffects`); combining requires making the effect body async, which interacts with the Phase 4.4 cancellation pattern. Safer to tackle against real vault with baseline probes.
- [x] **4.4** Rapid-switch cancellation via a `tabSwitchVersion` counter. Simpler than `AbortController` (no async plumbing, no listener leak). Each effect invocation pre-increments + captures; both rAF callbacks bail when the counter has advanced.
- [ ] **4.5** Regression test for 100 rapid switches.

### Phase 5 — Keystroke Reactivity Fix ⚠️ BEHAVIORAL (subtle)

- [ ] **5.1** Inventory every call site mutating `editorStore` tab content from outside `editor.service.ts`.
- [ ] **5.2** Add `editor.service.ts::syncExternalContentToEditor(path, content)`.
- [ ] **5.3** Migrate each call site.
- [ ] **5.4** Replace content-sync `$effect` with signal-based + `untrack()`.
- [ ] **5.5** Tests: `syncExternalContentToEditor` + perf assertion (0 `toString()` on 100 keystrokes).

### Phase 6 — Rust Outgoing Links

- [x] **6.1** `get_outgoing_links_v2(path)` → `Vec<NoteEntry>`. Added `VaultIndex::outgoing_links_of` (O(K) using a cached `by_filename` resolver — now maintained incrementally by `build` + `update_entry` instead of being rebuilt on every update). Dedupes target paths, filters self-links, omits unresolved links. Sorted by title for stable UI.
- [x] **6.2** `get_outgoing_unlinked_mentions_v2(path, content)` + `VaultIndex::outgoing_unlinked_mentions_of` + `count_plain_text_mentions` in `vault/parsing.rs`. Content passed as a param so the editor's unsaved buffer is honoured. Mirrors TS `findOutgoingUnlinkedMentions` word-boundary + wikilink-exclusion + frontmatter/code-strip semantics. New struct `OutgoingUnlinkedMention { noteName, notePath, count }` (camelCase serde).
- [x] **6.3** `experimental.rustOutgoing` flag. Already defined as part of the Phase 3.1 `ExperimentalSettings` group (defaults to `false`). No code change needed here beyond wiring consumers — that's Task 6.4.
- [x] **6.4** Branched `updateActiveTabLinks` in `active-tab-tracker.service.ts` on `rustOutgoing` (independent from `rustBacklinks` — either can flip on without the other). On: invokes `get_outgoing_links_v2` + `get_outgoing_unlinked_mentions_v2(path, content)` in parallel. Reads current editor buffer content so unsaved edits propagate. Stale-tab race guard skips the unlinked-mentions invoke if the active tab path has drifted. Converts `NoteEntry[]` to `OutgoingLink[]` with `target = title`, `alias/heading = null`, `position = 0` (intentional Phase 6 reduction — matches the Panel 3 snippets-deferred decision). Outgoing Links Panel reads from store; no component change needed.
- [ ] **6.5** Enable + delete orphans.

### Phase 7 — Rust Tag & Task Indexes

- [x] **7.1a (tags)** Added `tags_by_name: HashMap<String, HashSet<String>>` (lowercase-keyed) + `tags_display: HashMap<String, String>` (first-occurrence casing) to `VaultIndex`. Populated in `build`; maintained in `update_entry` via tag diff (drops source from old tags, inserts into new, cleans up empty sets, preserves display casing across replacements). Getters: `notes_with_tag(tag)` (O(1)) + `all_tags() -> Vec<TagAggregate>`.
- [ ] **7.1b (tasks)** Extend `VaultIndex` with `tasks: HashMap<String, Vec<TaskEntry>>`. Deferred — task extraction is substantial new work (checkbox regex + TaskMetadata emoji signifiers + indent calc + ordered/unordered markers).
- [ ] **7.2** `extract_tasks` (checkboxes, statuses, line numbers, due dates).
- [ ] **7.3** Wire into `update_entry` with `vault-index-updated` (tags portion done as part of 7.1a).
- [x] **7.4a (tag read commands)** `get_all_tags_v2` + `get_notes_with_tag_v2(tag) -> Vec<NoteEntry>`.
- [ ] **7.4b (task read commands)** `get_all_tasks`, `get_tasks_in_path`.
- [ ] **7.5** Write commands: `rename_tag`, `add_tag_to_note`, `remove_tag_from_note`, `toggle_task_status`.
- [ ] **7.6** `experimental.rustTagsAndTasks` flag (already defined in Phase 3.1); migrate Tags + Tasks panels.
- [ ] **7.7** Enable + delete orphans.

### Phase 8 — Rust Frontmatter / Properties Index + File Ops

- [x] **8.1** Extend `VaultIndex` with `properties: HashMap<String, HashMap<String, HashSet<String>>>` (key → canonical-value-string → paths). Values canonicalise via `canonicalise_property_value`: scalars produce one key; arrays explode per-element; objects skipped (no stable O(1) shape). Populated in `build` + cleared on rebuild.
- [x] **8.2** Wired into `update_entry` via symmetric-difference diff on (key, canonicalised value) pairs. Empty value-sets drop their entry; empty key-maps drop the key. Handles array→scalar transitions correctly.
- [x] **8.3** Read commands: `query_notes_by_property_v2(key, value)` → `Vec<NoteEntry>`, `get_property_values_v2(key)` → distinct sorted values, `get_note_properties_v2(path)` → frontmatter map.
- [x] **8.4** Write commands in `src-tauri/src/commands/vault.rs` + surgical text mutator in `vault/frontmatter_writer.rs`: `update_frontmatter_v2(path, key, value)` (scalars only; block-valued existing keys return an error so callers know the shape isn't supported), `delete_frontmatter_key_v2(path, key)` (removes scalar lines + block continuation lines), `rename_frontmatter_key_v2(path, old_key, new_key)` (collision rejection + empty-new-key validation). Shared `write_and_reindex` helper: read → mutate → write → rebuild NoteEntry → `update_entry` → emit `vault-index-updated`. Mutator preserves comments, order, quoted multi-line strings — no YAML re-serialisation round-trip.
- [ ] **8.5** `experimental.rustProperties` flag; migrate Properties Panel + `collection.service.ts`.
- [x] **8.6** File-op commands in `src-tauri/src/commands/vault.rs`: `create_note(path, content)` (creates parent dirs, refuses to clobber existing files, goes through `write_and_reindex` so the new note shows up in the index immediately), `rename_note(old, new)` (validates destination, fs rename, drops old entry, reindexes with new path — outgoing wikilinks pointing to the old stem silently break as a known limitation), `delete_note(path)` (removes from index first, then `fs::remove_file` — trash logic is caller-side), `create_folder(path)` (`create_dir_all`, no-op if exists, doesn't touch the index). All four registered in lib.rs. Added `VaultIndex::remove_entry(path)` method that cleanly drops the entry from every sub-index (backlinks reverse, tags, properties, by_filename) with 4 dedicated unit tests.
- [ ] **8.7** Migrate `note-creator.service.ts` (template processing stays in TS).
- [ ] **8.8** Migrate `templates.service.ts::ensureTemplatesFolder`.
- [ ] **8.9** Migrate other TS `fs.service.ts` / feature file ops.
- [ ] **8.10** Properties Panel write branching (tab-open → `view.dispatch`; tab-closed → invoke).
- [ ] **8.11** Enable flags + delete orphans.
- [ ] **8.12** Meta-bind migration: `createNote` → `invoke('create_note', ...)`; `updateMetadata` stays on `view.dispatch`; cache `parseFrontmatterProperties` by frontmatter substring.

### Phase 9 — Watcher Migration to Rust ⚠️ BEHAVIORAL (subtle)

- [ ] **9.1** Audit current watcher consumers + order.
- [ ] **9.2** Native Rust watcher via `notify` crate on tokio task. 500ms debounce. Emits single `vault-index-updated`.
- [ ] **9.2b** Remove every frontend raw-watcher listener; only `vault-index-updated` allowed.
- [ ] **9.3** Unconditionally ignore `.git/`.
- [ ] **9.4** Single Rust orchestrator: debounced paths → `update_entry` + SQLite FTS + semantic enqueue.
- [ ] **9.5** Delete TS watcher fan-out.
- [ ] **9.6** `git_conflict_check` command.
- [ ] **9.7** Startup + post-event check; banner on conflict.
- [ ] **9.8** Exponential backoff on commit failures.

### Phase 10 — Git-Commit-Hash Cache ⚠️ OPT-IN

- [ ] **10.1** Port cache JSON at appdata/cache/<vault-hash>.json.
- [ ] **10.2** `scan_vault_cached`: load → hash check → `git diff` + `git status` → re-parse changed → write cache.
- [ ] **10.3** Edge cases (non-git, stale version, corruption, moved dir, uncommitted, case-rename, deletion).
- [ ] **10.4** `experimental.gitHashCache` flag.
- [ ] **10.5** Settings → Advanced "Clear Cache" action.
- [ ] **10.6** Perf test close→reopen.

### Phase 11 — Three-Tier Change Detection ⚠️ BEHAVIORAL (full)

- [ ] **11.1** Focus-based diff: `WindowEvent::Focused(true)` → `git status` + `git diff HEAD` vs last-seen. 500ms debounce.
- [ ] **11.2** 10s periodic poll while focused (configurable 5-60s, 0 disables).
- [ ] **11.3** Cmd+R forces full rescan via `scan_vault_cached { force: true }`.
- [ ] **11.4** Verify watcher is sole in-session producer; ADR 0019.
- [ ] **11.5** Remove `noteIndexStore`, TS backlinks/outgoing/tags/tasks/collection orphans, `index-updater.service.ts`, `index-dedupe.ts`. `legacyTsIndexers` flag for first release.
- [ ] **11.5b** Final write-surface audit: grep all `writeTextFile`/`mkdir`/`rename`/`remove*`/`@tauri-apps/plugin-fs`. Every remaining call must fall in one of 3 categories (editor save, live-preview widget via `view.dispatch`, user-initiated op via Rust invoke).
- [ ] **11.6** Delete `active-tab-tracker.service.ts`.
- [ ] **11.7** Update `CLAUDE.md` + `docs/PATTERNS.md`.
- [ ] **11.8** Final perf:baseline comparison → `docs/perf/final-<date>.md`.

## Notes

- **Branch**: `claude/perf-refactor` (from `origin/main`).
- **Commit policy**: One commit per task, full Context/Problem/Solution/Behavior/Files format (see `docs/COMMITS.md`). Run relevant tests before each commit. No batching.
- **Ordering**: 1→2→3 strict. 4 parallel with 2–3. 5 standalone after 0. 6, 7, 8 any order. 9 requires 2–8 live. 10 and 11 must not be combined; 11.5 ships only after 2 weeks of stable 11.1–11.4 — `legacyTsIndexers` flag retained for first release.
- **Testing**: Never mock stores or `.logic.ts`. Getters (not `$derived`) in stores. Tabs, not spaces.
- **Perf claims**: every commit needs before/after `appendLog` numbers in body.
