# Audit 2026-06-10 round 2 — perf HIGH carve-outs + functional HIGH fixes

Closes the remaining HIGH findings from `.scratch/audit-2026-06-10/findings.md` that phase 1 left open. Item 1 (perf/architecture HIGHs 1 and 3) was verified line-by-line against `tasks/todo/performance-architecture-refactor.md` and `tasks/todo/perf-persistent-vault-index.md` — **neither plan covers them** (verification record below), so both get minimal scoped fixes here, with cross-reference notes added to the owning plans. Item 2 fixes the three unowned functional HIGHs (TDD, red first, one commit each). Item 3 tasks are decision-gated: ask the user one question at a time BEFORE implementing.

## Item 1 coverage verification (done during planning, recorded here)

**HIGH 1 — sync full-vault scans block the IPC thread** (`scan_vault_v2` at `src-tauri/src/commands/vault.rs:978-1018`, `scan_vault_v2_cached` at `:1039-1231`, both sync `pub fn`):
- `performance-architecture-refactor.md`: Phase 10 (10.1-10.6, open) is the git-commit-hash cache — different mechanism, in practice superseded by the persistent-index plan; no task mentions `spawn_blocking`/async commands. Phase 11.1-11.4 (open) are focus-diff/poll/Cmd+R/watcher-verification — command threading never appears. NOT covered.
- `perf-persistent-vault-index.md`: built `scan_vault_v2_cached` as a sync command on purpose (Task 6: reconciliation "inline in scan_vault_v2_cached, synchronous — fast enough for 6K files"). Open tasks 10-11 are validation + archive only. NOT covered.
- → Carve-out: Task 1 below. Precedent: `src-tauri/src/commands/search_index.rs:20-30` (`build_search_index` async + `spawn_blocking`, comment documents ~3 s IPC stall) and `get_unlinked_mentions_v2` (`vault.rs:514-533`, spawn_blocking with owned data).

**HIGH 3 — `vault-index-updated` listener has no coalescing** (`src/lib/core/layout/tauri-listeners.service.ts:85-114`):
- `performance-architecture-refactor.md`: 3.2 created the listener (bump only); the snapshot-fetch body grew later; no debounce/coalescing task anywhere in phases 0-11. NOT covered.
- `perf-persistent-vault-index.md`: emits MORE `vault-index-updated` events (sweep per stale file) and never mentions the listener. NOT covered.
- → Carve-out: Task 2 below. Debouncing the version bump at the source also collapses the burst fan-out into `TasksView.svelte:71-76` and `GraphView.svelte:391-396` (related medium findings 22/26). GraphView's layout reset on a single legit update stays a follow-up (noted in the perf plan).

## Tasks

- [x] **Task 0: Commit this plan file.** `git add tasks/todo/audit-round2-high-fixes.md` → commit `chore(tasks): plan round-2 audit HIGH fixes`.

- [x] **Task 1: Move `scan_vault_v2` + `scan_vault_v2_cached` off the IPC thread.**
  - Files: Modify `src-tauri/src/commands/vault.rs` (`:978-1018`, `:1039-1231`). Tests: `src-tauri/tests/commands/vault_cache_test.rs` (or sibling — confirm where cached-scan tests live).
  - Step 1 (red): extract-and-test — write Rust tests against not-yet-existing inner fns: `scan_vault_v2_inner(path: &str, state: &VaultIndexState) -> Result<(Vec<NoteEntry>, u64), String>` and `scan_vault_v2_cached_inner(path: &str, state: &VaultIndexState) -> Result<(CachedScanResult, u64), String>` (`VaultIndexState = RwLock<VaultIndex>` constructible in tests without `tauri::State`). Tests: tempdir vault → inner returns entries + bumped version + populated index; cached_inner full-scan path on missing cache; cached_inner reconcile path reuses cache + rereads changed mtime. Compile failure = red.
  - Step 2 (green): extract the bodies into the inner fns (emit moves OUT of inner — wrapper emits via the returned version through the existing `emit_index_updated`). Wrappers become `pub async fn` taking `app: tauri::AppHandle, path: String` (drop the `State` param), body: `tokio::task::spawn_blocking(move || { let state = app.state::<VaultIndexState>(); let r = ..._inner(&path, &state)?; emit; Ok(...) }).await.map_err(...)?`. Copy the doc-comment style from `build_search_index` (`search_index.rs:20-24`) explaining WHY async.
  - Step 3: `cargo test --manifest-path src-tauri/Cargo.toml` → all pass. No TS change (invoke is promise-based either way; existing Rust tests only reference the command in comments).
  - Step 4: note the carve-out in `perf-persistent-vault-index.md` (Notes section) and `performance-architecture-refactor.md` (Notes): "IPC-thread blocking fixed 2026-06-11 in audit-round2 Task 1".
  - Step 5: commit `fix(vault): run scan_vault_v2/scan_vault_v2_cached on a blocking worker thread` (full format).

- [ ] **Task 2: Coalesce the `vault-index-updated` listener.**
  - Files: Modify `src/lib/core/layout/tauri-listeners.service.ts:85-114`. Test: `src/tests/lib/core/layout/tauri-listeners.service.test.ts`.
  - Step 1 (red): fake-timer tests — N events in <300 ms → exactly 1 `get_all_vault_entries_v2` invoke and 1 `bumpVaultIndexVersion` (with the LAST payload version); cleanup cancels a pending debounce (no invoke after unsubscribe); a stale response (older fetch resolving after a newer one) does not overwrite store state (latest-wins token).
  - Step 2 (green): wrap the handler body in `debounce(fn, 300)` from `$lib/utils/debounce` (pattern + rationale comment mirroring `tags.service.ts::scheduleTagIndexRebuild`). Keep `latestVersion` from the most recent payload; bump + fetch inside the debounced fn; guard responses with an incrementing `fetchSeq` token; returned cleanup calls `.cancel()` before `unlisten()`.
  - Step 3: `pnpm check` + `pnpm vitest run`.
  - Step 4: note in `performance-architecture-refactor.md` Notes: central coalescing landed here; GraphView per-update layout reset (medium 26) remains follow-up.
  - Step 5: commit `fix(layout): debounce vault-index-updated fan-out with latest-wins fetch guard`.

- [ ] **Task 3: TemplatePicker creates a nameless `.md` file.**
  - Files: Modify `src/lib/plugins/templates/TemplatePicker.svelte:33-43`. Test: create `src/tests/lib/plugins/templates/TemplatePicker.test.ts` (component test via `mount()` — pattern from `src/tests/lib/features/backlinks/BacklinksPanel.test.ts`: jsdom pragma, real stores, mock only `templates.service`).
  - Step 1 (red): mount picker with `templatesStore.open()` + `setTemplates([{name:'Daily', path:'/vault/_templates/Daily.md'}])`; click the template `Command.Item`; set the filename input value + dispatch `input`; keydown Enter; assert `createFileFromTemplate` called with `('/vault/_templates/Daily.md', 'My Note')`. Currently fails: called with `''` (`reset()` at `:36` clears `fileName` before the `:38` read). Fallback if bits-ui `Command.Dialog` won't render in jsdom: test via the service seam (assert `createFileFromTemplate` rejects empty `fileName` + add that guard) and document why.
  - Step 2 (green): capture `const name = fileName.trim();` BEFORE `reset()`; pass `name`.
  - Step 3: `pnpm check` + `pnpm vitest run` → commit `fix(templates): read file name before reset in TemplatePicker confirmCreate`.

- [ ] **Task 4: QueryJS widget stuck on "Building index..." at startup.**
  - Files: Modify `src/lib/core/markdown-editor/extensions/live-preview/widgets/queryjs-block-widget.ts:61-78` (live store read in `toDOM`, snapshot stays for `eq()` — mirror `collection-block-widget.ts:45-81`), `.../plugins/queryjs-block-field.ts:67-74` (let `forceDecorationRebuild` pass the `:73` early-return), `src/lib/core/markdown-editor/MarkdownEditor.svelte` (new `$effect` on `collectionStore.isIndexReady` dispatching `forceDecorationRebuild` — mirror the tagColors effect at `:418-426`). Tests: extend `queryjs-block-widget.test.ts`; create `queryjs-block-field.test.ts` (sole field without a test — audit medium 9; mirror a sibling field test that builds an `EditorView`).
  - Step 1 (red, widget): construct widget while `collectionStore` reset (not ready), then `setPropertyIndex(new Map())` (ready), call `toDOM()` with manual policy → assert ▶ Run prompt, NOT "Building index...". Fails today (`:72` reads the constructor snapshot).
  - Step 2 (red, field): EditorView with a queryjs block → dispatch `forceDecorationRebuild.of(null)` after flipping `isIndexReady` → assert decorations were recomputed (new widget instance / decoration iteration shows updated snapshot). Fails today (`:73` returns before `checkUpdateAction`). Also pin: viewport-only updates still skip (the documented scroll-debounce invariant).
  - Step 3 (green): widget `toDOM` reads `collectionStore.isIndexReady`; field early-return becomes `if (!update.docChanged && !update.selectionSet && !hasForceRebuild) return;` (compute `hasForceRebuild` from `update.transactions`); MarkdownEditor `$effect` dispatches rebuild when `isIndexReady` flips (component effect untestable without mount infra for MarkdownEditor — same justification as perf-plan tasks 4.5/5.5; field + widget tests cover the chain).
  - Step 4: `pnpm check` + `pnpm vitest run` → commit `fix(queryjs): recover from "Building index..." when the property index becomes ready`.

- [ ] **Task 5: CollectionView `selfUpdate` guard wipes in-progress state.**
  - Files: Modify `src/lib/features/collection/CollectionView.svelte:40,103-111`. Tests: create `src/tests/fixtures/CollectionViewHarness.svelte` (owns `let yamlContent = $state(...)`, `onYamlChange={(y) => yamlContent = y}` — the parent round-trip) + `src/tests/lib/features/collection/CollectionView.test.ts` (mount harness, real stores, `collectionStore.setPropertyIndex(new Map())`).
  - Step 1 (red): mount with a table-view YAML; open the Filter popover; add/locate a filter row's value input; capture the input element; dispatch one `input` keystroke (fires `FilterRow.svelte:167` → `persistState` → `onYamlChange` round-trip); `flushSync()`; assert the SAME input element is still connected (keyed-each identity stable). Fails today: the `:106` `selfUpdate = false` write re-dirties the effect (it reads `selfUpdate` at `:105`), re-runs into the reset branch, the seeding effect re-seeds `localGlobalFilters/localViewFilters` with fresh `uid()`s (`filter.logic.ts:10`) and the keyed each replaces the row DOM. Also pin legit behavior: clicking another view tab still re-seeds (seededIndex path).
  - Step 2 (green): change `let selfUpdate = $state(false)` to plain `let selfUpdate = false` (script-only flag, never rendered; effect keeps `yamlContent` as its only tracked dep). Keep the doc comment, extend it with WHY it must not be `$state`.
  - Step 3: `pnpm check` + `pnpm vitest run` → commit `fix(collection): make selfUpdate latch non-reactive so self-persist does not reset local state`.

## Item 3 — decision-gated (ASK FIRST, one question at a time, implement per answer)

- [ ] **Task 6: TOCTOU in `toggle_task_status_inner` + `create_note`** (`src-tauri/src/commands/vault.rs`; 2 `#[ignore]` audit tests exist). Present locking options (per-path mutex map in Rust vs TS-side serialization vs compare-and-swap on mtime) with trade-offs → ask → implement choice.
- [ ] **Task 7: `saveDirtyTabs` unbounded retry** (`src/lib/core/editor/editor.service.ts:157-171`). Ask whether bounded-retry-then-surface is intended; implement per answer.
- [ ] **Task 8: 11+ dead IPC commands in `src-tauri/src/lib.rs`** (audit low 6 lists 12). Ask: delete vs document-as-public vs keep until phase 2/3 → implement per answer.

## Notes

- Suites per task (rule 6): Task 1 Rust-only (`cargo test --manifest-path src-tauri/Cargo.toml`); Tasks 2-5 frontend-only (`pnpm check` + `pnpm vitest run`). Commit format per `docs/COMMITS.md` (Context/Problem/Solution/Behavior/Files with line ranges).
- Do NOT start audit phase 2 (CodeMirror extension test gaps) or phase 3 (Svelte component tests) in this session.
- Audit reasoning per finding: `.scratch/audit-2026-06-10/raw-result.json` (search by title).
