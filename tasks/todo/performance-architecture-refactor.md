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
- [ ] **1.2** Implement `extract_outgoing_links` in `src-tauri/src/vault/parsing.rs`. Excludes frontmatter + fenced code. Handles `[[target]]`, `[[t|d]]`, `[[t#h]]`, `[[t#^b]]`.
- [ ] **1.3** Implement `extract_tags` (nested, code-fence exclusion, in-word rejection). Reuse existing `src-tauri/src/search/fts_logic.rs:31-129` logic where possible.
- [ ] **1.4** Implement `parse_frontmatter` — malformed YAML → empty map, no panics.
- [ ] **1.5** Add `#[tauri::command] scan_vault_v2` returning `Vec<NoteEntry>`.
- [ ] **1.6** Mirror `NoteEntry` in `src/lib/types/vault-v2.types.ts` (`@experimental`).

### Phase 2 — Rust Backlinks Index (parallel)

- [ ] **2.1** `src-tauri/src/index/mod.rs`: `VaultIndex { entries, by_path, backlinks, version }`.
- [ ] **2.2** `VaultIndex::build(entries)` computing reverse index with same resolution rules as TS `resolveWikilink` (filename, title, aliases, path suffix).
- [ ] **2.3** Wire `VaultIndex` into Tauri managed state (`RwLock<VaultIndex>`). Initialize on `scan_vault_v2`.
- [ ] **2.4** `#[tauri::command] get_backlinks_v2(path)` → `Vec<NoteEntry>`.
- [ ] **2.5** `VaultIndex::update_entry` returning `UpdateResult { changed, affected }`.
- [ ] **2.6** `#[tauri::command] update_note_in_index(path, content)` → parse + update_entry + emit `vault-index-updated`.

### Phase 3 — Migrate Backlinks Consumers

- [ ] **3.1** Add `experimental` nested settings group. Flag `experimental.rustBacklinks` default `false`.
- [ ] **3.2** Add `vaultStore.vaultIndexVersion` + global `listen('vault-index-updated')`.
- [ ] **3.3** Branch `active-tab-tracker.service.ts` on the flag.
- [ ] **3.4** Migrate Backlinks Panel to consumer pattern.
- [ ] **3.5** Hook `update_note_in_index` into `notifyAfterSave` when flag on.
- [ ] **3.6** Run `pnpm perf:baseline` with flag on; commit comparison to `docs/perf/phase-3-comparison.md`.
- [ ] **3.7** Enable flag by default after validation.
- [ ] **3.8** Delete orphan TS (`updateBacklinksForFile` etc.); keep `resolveWikilink` util.
- [ ] **3.9** Remove flag.

### Phase 4 — Tab-Switch Pipeline Cleanup

- [ ] **4.1** Baseline `switchTab` breakdown.
- [ ] **4.2** Remove redundant `forceDecorationRebuild.of(null)` rAF call (line ~288).
- [ ] **4.3** Combine language reconfigure + doc replace into single `view.dispatch`.
- [ ] **4.4** Add `AbortController` cancellation for rapid switches.
- [ ] **4.5** Regression test for 100 rapid switches.

### Phase 5 — Keystroke Reactivity Fix ⚠️ BEHAVIORAL (subtle)

- [ ] **5.1** Inventory every call site mutating `editorStore` tab content from outside `editor.service.ts`.
- [ ] **5.2** Add `editor.service.ts::syncExternalContentToEditor(path, content)`.
- [ ] **5.3** Migrate each call site.
- [ ] **5.4** Replace content-sync `$effect` with signal-based + `untrack()`.
- [ ] **5.5** Tests: `syncExternalContentToEditor` + perf assertion (0 `toString()` on 100 keystrokes).

### Phase 6 — Rust Outgoing Links

- [ ] **6.1** `get_outgoing_links_v2` (reuses `VaultIndex` outgoing_links).
- [ ] **6.2** `get_outgoing_unlinked_mentions_v2` (mirrors TS word-boundary rules).
- [ ] **6.3** `experimental.rustOutgoing` flag.
- [ ] **6.4** Migrate Outgoing Links Panel + consumers.
- [ ] **6.5** Enable + delete orphans.

### Phase 7 — Rust Tag & Task Indexes

- [ ] **7.1** Extend `VaultIndex` with `tags`, `tasks`.
- [ ] **7.2** `extract_tasks` (checkboxes, statuses, line numbers, due dates).
- [ ] **7.3** Wire into `update_entry` with `vault-index-updated`.
- [ ] **7.4** Read commands: `get_notes_with_tag`, `get_all_tags`, `get_all_tasks`, `get_tasks_in_path`.
- [ ] **7.5** Write commands: `rename_tag`, `add_tag_to_note`, `remove_tag_from_note`, `toggle_task_status`.
- [ ] **7.6** `experimental.rustTagsAndTasks` flag; migrate Tags + Tasks panels.
- [ ] **7.7** Enable + delete orphans.

### Phase 8 — Rust Frontmatter / Properties Index + File Ops

- [ ] **8.1** Extend `VaultIndex` with `properties: HashMap<String, HashMap<Value, Vec<String>>>`.
- [ ] **8.2** Wire into `update_entry`.
- [ ] **8.3** Read commands: `query_notes_by_property`, `get_property_values`, `get_note_properties`.
- [ ] **8.4** Write commands: `update_frontmatter`, `delete_frontmatter_key`, `rename_frontmatter_key`.
- [ ] **8.5** `experimental.rustProperties` flag; migrate Properties Panel + `collection.service.ts`.
- [ ] **8.6** File op commands: `create_note`, `rename_note`, `delete_note`, `create_folder`.
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
