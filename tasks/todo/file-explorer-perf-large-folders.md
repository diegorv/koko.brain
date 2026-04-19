# File Explorer — Performance on Large Folders

Opening a folder with hundreds of markdown files (e.g. `Reading list/2026/04-Apr`
with 630 items) freezes the UI. Root cause: every `FileTreeItem` eagerly mounts
an `IconPicker` (which runs `loadIcons()` as a `$effect` on mount) and a per-row
set of absolutely-positioned indentation divs. For 630 rows this means 630 eager
icon-pack loads and thousands of extra DOM nodes.

## Tasks

### Phase 1 — Lazy-mount + CSS indentation (quick wins)

- [x] Task 1: Lazy-mount `IconPicker` inside `FileTreeItem.svelte` via `{#if iconPickerOpen}` so the dialog (and its `loadIcons` effect) only mounts when the user opens the picker for that row.
- [x] Task 2: Replace the per-row `{#each Array(depth)}` indentation-line divs with a CSS gradient driven by `--depth`, removing N absolutely-positioned divs per row.

### Phase 2.1 — Hoist ContextMenu + IconPicker

- [x] Task 3: Replace per-row `<ContextMenu.Root>` + `<IconPicker>` in `FileTreeItem.svelte` with a single shared instance at `FileExplorer.svelte`. Rows emit `oncontextmenu` into a Svelte context; `ContextMenu.Content` renders conditional items based on `contextTargetNode` (null = vault-root menu). Validated via `FE-FILE-EXPLORER-PROBE` instrumentation: `Reading list/2026/04-Apr` with 710 children mounts in ~15ms (click→paint 125ms). Probe removed before commit.

### Phase 2.2 — (future work, not in this session)

- Virtualize the file tree list for very large directories (only render visible rows).

## Notes

- `.svelte` component changes are exempt from vitest coverage per `docs/TESTING.md`. E2E `file-explorer.spec.ts` is the regression gate for these tasks.
- Task 2 does not justify extracting a `.logic.ts` file — the CSS expression is trivial.
- Keep the visual appearance of the indentation lines identical (same color, same 1px width at the same offsets).

## Learnings — what actually causes the "UI feels slow" sensation

This plan started out scoped to the file explorer, but profiling quickly
showed the perceived-slow moments of the app almost never come from the
component the user was interacting with. The real pattern behind every
measurable stall was **the JS main thread being busy elsewhere**, so
microtasks, reactive effects, and even "instant" Tauri IPC responses
piled up in the queue.

The sections below document the patterns, the diagnostic tricks that
revealed each one, and the fixes that shipped across commits
`3bd673b` → `c24dce1`. Future regressions in this area should look
here first.

### Pattern 1 — Per-row work that should be shared (Phase 1 + 2.1)

**Symptom:** Expanding `Reading list/2026/04-Apr` (710 markdown files)
froze the UI for several seconds.

**Cause:** Every `FileTreeItem` mounted its own `IconPicker` dialog and
its own `<ContextMenu.Root>` from bits-ui. `IconPicker` has a `$effect`
that calls `loadIcons()` on mount (one icon-pack `Promise.all` per
row). `ContextMenu.Root` instantiates a `MenuRootState` +
`MenuMenuState` reactive container per row. For 710 rows that is 710
`loadIcons()` calls and 710 reactive state containers, most of which
are never used because only one context menu / picker can be visible
at a time.

**Fixes shipped:**
- Lazy-mount `IconPicker` behind `{#if iconPickerOpen}` — `3bd673b`.
- Hoist a single `ContextMenu.Root` + single `IconPicker` to
  `FileExplorer.svelte`; rows just fire `oncontextmenu` into a Svelte
  context — `cc558bf`.
- Replace per-row indentation `{#each Array(depth)}` divs with a CSS
  `repeating-linear-gradient` driven by `--ft-indent-depth` — `2f9a47a`.

**Measured impact (probe `FE-FILE-EXPLORER-PROBE`, now removed):**
710 children mounted in ~15 ms (click→paint ~125 ms) — before the
fixes it was multiple seconds.

### Pattern 2 — Reactive storm from a high-frequency Tauri event

**Symptom:** Any user action performed while the semantic index was
being (re)built felt sluggish, even though each individual action was
cheap.

**Cause:** The Rust embedder emits a `semantic-index-progress` event
every 4 chunks (~16 events per second during indexing). The frontend
listener called `searchStore.setSemanticProgress(payload)` on every
event, which is read by `SearchStatus` (in the status bar),
`SearchPanel` (sidebar), and `SearchSection` (settings). Every event
therefore scheduled three component re-renders. Additionally, each
event was written to the log file via `appendLog`, a Tauri plugin-fs
IPC write (~2–5 ms). Combined overhead during indexing:
**~80–160 ms/s of main-thread time for zero UX benefit** (humans
can't read 16 status updates/second).

**Fixes shipped:**
- Trailing-edge 500 ms throttle on the listener. Phase transitions
  (e.g. downloading → embedding → complete) bypass the throttle and
  propagate immediately — `2a726df`.
- Removed the per-batch `debug('SEARCH', 'Semantic progress:', …)`
  call; kept logging only for phase transitions. Rust already logs
  per batch via `EMBEDDER`, so the frontend duplicate was pure IO — `4b7433f`.

**Principle:** Any event that fires >5×/second needs either a throttle
or debounce before it reaches reactive state. Treat high-frequency
events the same way you'd treat a typing input — batch before
propagating.

### Pattern 3 — Synchronous Tauri commands block the IPC thread

**Symptom:** During startup the `await startSemanticProgressListener()`
call in `initializeVault` paused for ~3 seconds even though all it
does is attach an event listener (should be ~1 ms).

**Cause:** A Tauri command declared as sync `pub fn` runs on the
main Tauri IPC thread. While it executes, every other `invoke()` and
`listen()` queues behind it. `build_search_index` was
`pub fn build_search_index(...)` and the full FTS rebuild (1,800+
docs, ~3 s) was hogging the IPC thread, so the `listen()` call couldn't
even register. Compare `build_semantic_index`, which is `pub async fn`
+ `tokio::task::spawn_blocking`; that pattern never blocks IPC.

**Fix shipped:**
- Split `build_search_index` into a sync helper `build_search_index_inner`
  (keeps the existing body, safe for tests) and a thin async Tauri
  command that dispatches it through `spawn_blocking` — `29fcdb9`.

**Diagnostic signal:** If a tiny Tauri call (like `listen` or a trivial
`invoke`) takes multiple seconds at startup, look for a concurrent sync
Tauri command hogging the IPC thread. A neighbouring
`pub async fn` + `spawn_blocking` is the template.

**Note for future:** other sync Tauri commands in the codebase
(`update_search_index_file`, `is_semantic_model_available`, etc.) are
currently called with tiny payloads so they finish quickly, but any
new sync command with non-trivial work needs the same async treatment.

### Pattern 4 — Microtask starvation by synchronous JS work

**Symptom:** The auto-opened daily note's `exists()` took ~650 ms and
its `readTextFile()` took ~1,400 ms to resolve, for a 3.7 KB file.
Post-startup the same operations run in 3 ms.

**Cause:** `autoOpenDailyNote()` was called (fire-and-forget) in the
middle of `initializeVault`. After that call, the function kept running
CPU-bound synchronous work on the main JS thread:
`buildTagIndex` → `buildTaskIndex` → `buildPropertyIndex` →
`buildFrontmatterIconIndex` → `scanFilesForCalendar` (≈450 ms of
synchronous CPU). Rust responded to `exists()` in ~1 ms, but the
`.then` microtask to resolve the promise could only run once the
main thread finished those builds. Same story for `readTextFile`,
except it then queued behind Svelte's initial mount of AppShell +
panels + editor (~1.4 s).

**Fix shipped:**
- Removed `autoOpenDailyNote()` from inside `initializeVault`. Moved
  it to `+layout.svelte`, chained off `initializeVault(path).then(...)`
  with a `setTimeout(0)` so Svelte gets at least one event-loop tick
  to paint before the file-IO microtasks run — `c24dce1`.

**Measured impact (probe `FE-STARTUP-PROBE`, still active):**
- `readTextFile` resolve: 1,400 ms → **7 ms** (200×).
- `exists()` resolve: 650 ms → ~1,400 ms (regressed — now queues
  behind Svelte initial mount instead of behind sync builds; same
  root cause, different moment). Net user-visible win is ~730 ms
  earlier for the daily-note tab to appear.

**Principle:** If you need to `await` Tauri IO, do it at a moment when
the main thread is not already spoken for. Fire-and-forget in the
middle of heavy synchronous work is the worst of both worlds: the
promise starts immediately but the continuation can't run.

### Diagnostic technique — `setTimeout` latency as a main-thread probe

The `activeTabLinks:effect→callback: 2060 ms` log is measuring from a
`perfStart()` taken before a `setTimeout(fn, 150)`. When the callback
finally runs, the elapsed time is reported. A 150 ms timer that
finishes in 2,060 ms means the event loop was blocked for ~1,910 ms
before the callback could fire. Any time we see this log spike, the
main thread was starved.

### Remaining suspects (not yet addressed)

The probe tag `FE-STARTUP-PROBE` stays in the code (commit `c24dce1`)
so we can keep measuring. Follow-up plans should tackle:

1. **Svelte initial mount (~1.4 s)** — the remaining delay on
   `exists()`. Candidates: lazy-mount the sidebar panels (Backlinks /
   Outgoing / Tags / Calendar / Properties) so they only construct on
   first reveal; virtualise the file tree (Phase 2.2 in this file).
2. **Backlinks `buildIndex` (~1.2 s)** — parses all 1,830 markdown
   files looking for `[[wikilinks]]` on every startup. Cache the
   result to `.kokobrain/backlinks.json` and rebuild incrementally
   via the watcher.
3. **FTS full rebuild on every startup (~3 s background)** — the Rust
   command still clears + reinserts every document. Skip the work
   when the stored index matches the vault's mtime snapshot; fall
   back to a full rebuild only when the schema changes or a mismatch
   is detected. This was the "Step B" follow-up to `29fcdb9`.
4. **Tag / Property indexes (~400 ms combined)** — same caching
   pattern as backlinks.
5. **QueryJS view execution (~1.5 s when daily note contains a
   `kb.view(…)` block)** — user-authored code, but we can lazy-execute
   via IntersectionObserver so off-viewport blocks don't run at load.
