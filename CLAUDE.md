# Kokobrain

A desktop note-taking app inspired by [Obsidian.md](https://obsidian.md) built with Svelte 5 + Tauri 2.

## Approach (Mandatory)
- Read existing files before writing. Don't re-read unless changed.
- Thorough in reasoning, concise in output.
- No sycophantic openers or closing fluff.
- No emojis or em-dashes.
- Do not guess APIs, versions, flags, commit SHAs, or package names. Verify by reading code or docs before asserting.#

## Quick Reference (Most Common Mistakes)

1. **Never mock stores or `.logic.ts` files** in tests — use real stores, verify real state
2. **Always wrap service calls in `$effect` with `untrack()`** — see [docs/PATTERNS.md](docs/PATTERNS.md)
3. **Use getters, not `$derived`** in stores — `$derived` doesn't work in vitest; every computed getter must have a test
4. **Never remove code claiming "redundant"** without tracing the full execution chain first
5. **Use tabs, not spaces** — all code files use tabs for indentation
6. **Run the right tests before EVERY commit** — match the tests to what you changed:
   - **Rust only** (`src-tauri/`): `cargo test --manifest-path src-tauri/Cargo.toml`
   - **Frontend only** (`src/`, styles, config, `package.json`/`pnpm-lock.yaml`): `pnpm check` + `pnpm vitest run` + `pnpm build`
   - **Both**: all four commands. No exceptions.

   `pnpm build` is part of the gate because vitest does not exercise the
   production bundler. A dependency bump that moves `rolldown`, `vite` or
   `es-module-lexer`, a circular import, or an adapter-static prerender failure
   passes `check` and `vitest` and still breaks `pnpm build`. It costs ~17s.
7. **Services return errors via try/catch** — propagate to caller, never silently swallow
8. **Assert on rendered content** in E2E tests, not just container existence
9. **Verify staging area before every commit** — run `git diff --cached --stat` to ensure only intended files are staged. See [docs/COMMITS.md](docs/COMMITS.md)
10. **Commit after EVERY completed task in a plan** — each task = one commit, immediately after passing the relevant tests (see rule 6). NEVER batch multiple tasks into one commit. See [docs/COMMITS.md](docs/COMMITS.md)
11. **Check test files BEFORE committing** — for every source file you changed, find its test file and update/create it. NEVER commit source changes without test changes. See [docs/TESTING.md](docs/TESTING.md) § Task Completion Gate.

## Stack

- **Frontend:** Svelte 5 (runes), SvelteKit, TypeScript
- **UI:** shadcn-svelte (Tailwind CSS + bits-ui)
- **Backend:** Tauri 2 (Rust)
- **Package manager:** pnpm

## Commands

```bash
pnpm tauri dev        # Run app in dev mode (frontend + Tauri)
pnpm dev              # Run frontend only (no Tauri window)
pnpm build            # Build frontend for production
pnpm tauri build      # Full release build with bundle (.dmg) - shipping
pnpm tauri:build:fast # Local fast build: release-fast profile, no bundle/codesign
pnpm check            # TypeScript type checking
pnpm check:watch      # Type checking in watch mode
bash scripts/e2e.sh   # Run E2E tests (starts server, runs Playwright, cleans up)
```

**Build performance:** `.cargo/config.toml` requires `sccache` on PATH (`brew install sccache`). The `beforeBuildCommand` is `bash scripts/tauri-before-build.sh`, which skips `pnpm build` when frontend inputs are unchanged; bypass with `KOKO_FORCE_FRONTEND_BUILD=1`.

**E2E tests:** ALWAYS run via `bash scripts/e2e.sh`. NEVER run `PLAYWRIGHT=true pnpm dev` manually — the script handles server lifecycle, port cleanup, and teardown automatically.

## Project Structure

```
src/lib/
  components/ui/      # shadcn-svelte components (generated via CLI)
  core/               # Essential: app-lifecycle, editor, file-explorer, filesystem, keybindings,
                      #   layout, markdown-editor, note-creator, settings, status-bar, trash, vault, zoom
  features/           # Built-in features: auto-move, backlinks, bookmarks, canvas, collection,
                      #   command-palette, copy-block-link, deep-link, dock-badge, file-history,
                      #   file-icons, folder-notes, outgoing-links, properties, quick-switcher,
                      #   search, tags, tasks, type-definitions
  plugins/            # Optional modules: calendar, graph-view, kanban, one-on-one, periodic-notes,
                      #   queryjs, quick-capture, table-of-contents, templates, word-count
  utils/              # Pure shared utilities (no state, no side effects)
```

### Layer Rules

| Layer | Rule |
|-------|------|
| `components/ui/` | shadcn-svelte generated components. Customized via Tailwind. |
| `core/` | App breaks without it. Stores + services + core components. |
| `features/` | Always loaded. Each feature is self-contained in its own folder. |
| `plugins/` | App works without them. Self-contained, could be toggled off. |
| `utils/` | No state, no side effects. Can be used by any layer. |

## Architecture Guidelines

Keep logic testable by separating pure functions from framework-coupled code. Extract files **when complexity justifies it** — don't create files preemptively.

| File type | When to create | Rules |
|-----------|---------------|-------|
| `.logic.ts` | When there's real pure logic (parsing, transformations, validations) | No framework imports. Only imports other `.logic.ts` or `utils/`. |
| `.store.svelte.ts` | When a feature needs shared reactive state | Reactive state only. May call `.logic.ts`. |
| `.service.ts` | When there are Tauri API calls that need to be mockable in tests | Can import `.logic.ts` + stores. |

Start simple, extract when it grows:

```
# Simple feature — start here
features/tags/
  Tags.svelte               # Component with inline logic

# As complexity grows — extract
features/backlinks/
  backlinks.logic.ts        # extractLinks(), findBacklinks()
  backlinks.store.svelte.ts # Shared reactive state
  backlinks.service.ts      # Tauri calls + store updates
  Backlinks.svelte          # UI component
```

For Svelte 5 reactive patterns (`$effect`/`untrack()`, PaneForge, store pattern), see [docs/PATTERNS.md](docs/PATTERNS.md).

## Pre-Change Checklist

Before modifying ANY service or store, answer these questions:

1. **What stores does this function write to?** List every `store.setX()` call.
2. **What computed getters depend on those stores?** Trace the reactive chain.
3. **What UI components read those computed getters?** Search for store imports in `.svelte` files.
4. **Does the existing test verify those computed getters?** If not, add tests BEFORE making changes.
5. **Can I write a failing test for the bug/change?** If yes, write it FIRST.

If you cannot answer #1-#3 with specific file paths and line numbers, you do NOT understand the code well enough to modify it safely.

## Removing or Refactoring Code — Mandatory Checks

**NEVER remove a function call, import, or code path claiming it's "redundant" or "already handled elsewhere" without FIRST tracing the full execution chain to PROVE it.** This is the single most dangerous class of bugs — silent regressions where something that used to work simply stops.

### Before removing any call or code path, you MUST:

1. **Trace all callers:** Search for every call site of the function. Understand what each one does and why it's there.
2. **Trace the replacement:** If you claim "X already handles this", read X's implementation line-by-line and confirm it actually performs the EXACT same side effects (store updates, API calls, event emissions). "Calls the same Rust command" ≠ "updates the same store."
3. **Check store consumers:** If the removed code updates a store, find every component that reads from that store. Verify they will still receive data through the alternative path.
4. **State the proof explicitly:** In your reasoning, write: "Function A at [file:line] updates [store/state]. The replacement path B at [file:line] also updates [store/state] via [mechanism]." If you cannot write this sentence with specific file paths and line numbers, DO NOT remove the code.

### Common traps:

- **Same Rust command ≠ same effect:** `buildIndex()` and `loadDirectoryTree()` both call `scan_vault`, but only `loadDirectoryTree` updates `fsStore.fileTree`. Removing one because "the other already scans" breaks the file explorer.
- **"Redundant" calls that target different stores:** Two functions may appear to do the same thing but write results to different stores consumed by different UI components.
- **Initialization order matters:** A call in `+page.svelte` that runs on user click vs. an `$effect` in `+layout.svelte` that runs reactively may have different timing. Don't assume one replaces the other.

### When modifying service orchestration (e.g., initializeVault):

5. **Write a regression test BEFORE changing:** Create a test that captures the current behavior. Run it to confirm it passes. Then make your change.
6. **Test the full initialization sequence, not just individual calls.**

## Error Handling

### Services (Tauri API calls)

- **Always use try/catch** around `invoke()` and Tauri plugin calls.
- **Propagate errors to the caller** — never silently swallow them. Let the component or orchestrator decide how to handle.
- **Log before re-throwing** when context would be lost: `console.error('buildIndex failed:', error)`.
- **Do not update stores with partial/corrupt data** on error. Either update on success or leave the store untouched.

### Components

- **User-facing errors** should be shown via toast notifications or inline error states — not `console.error` alone.
- **Network/file errors** that the user can't fix (e.g., corrupt file) should show a clear message explaining what happened and what to do.

## Debugging

**Logging is ALWAYS the first debugging tool.** When something isn't working, add log statements to inspect values, execution flow, and state BEFORE trying to reason about the problem or rewrite code. Do NOT waste time guessing — log it, see the actual data, then fix it.

### Log file location

All app logs are written to `~/Library/Logs/com.diegorv.kokobrain/` (one file per session, e.g. `2026-04-08_10-33-38.log`). Use `python3 scripts/log-watcher.py` to tail in real-time.

### Frontend logging

**Use `appendLog(tag, ...args)` from `$lib/utils/log.service`** — NOT `console.log`. `appendLog` writes to the session log file; `console.log` only goes to browser devtools (which requires right-click → Inspect in the Tauri window) and is not persisted.

```typescript
import { appendLog } from '$lib/utils/log.service';
appendLog('MY-TAG', `value=${someVar} state=${otherVar}`);
// Output in log file: [HH:mm:ss.SSS] [MY-TAG] value=... state=...
```

### Rust logging

- Use `debug_log(tag, msg)` from `utils::logger` — emits to stderr (terminal) and to the frontend via `tauri-debug-log` event (when debug mode is enabled).
- For low-level debugging: `eprintln!` outputs to the terminal where `pnpm tauri dev` is running.
- For structured logging: `RUST_LOG=debug pnpm tauri dev`.

## Testing

See [docs/TESTING.md](docs/TESTING.md) for the full testing guide: mock rules, assertion patterns, service/store test rules, E2E tests, and the task completion gate.

**Key rules (detailed examples in the doc):**

- **Mock only** Tauri APIs, side-effect services, and DOM services. **Never mock** stores or `.logic.ts` files.
- **Assert on real store state** and computed getters — never `.toHaveBeenCalled()` as the sole assertion.
- **Every test suite** must cover: happy path, empty/null input, and error handling.
- **Every computed getter** in a store must have a corresponding test.
- **Use getters, not `$derived`** in stores — `$derived` doesn't update synchronously in vitest.
- **Task completion gate:** Run the relevant tests for what you changed (see Quick Reference rule 6) before any commit.

## Conventions

- **Indentation:** Tabs, not spaces. All code files use tabs for indentation.
- **Language:** English for all code, variables, and UI text.
- **Features:** Each feature/plugin is isolated in its own folder with components + logic.
- **Logic:** Extract to `.logic.ts` when there's real pure logic to test. No framework imports.
- **Stores:** `.svelte.ts` extension, getter-based access pattern, reactive state only (no business logic).
- **Services:** Functions that perform side effects (Tauri API calls) and update stores.
- **Components:** shadcn-svelte for UI primitives, custom only when needed (e.g., Tree View).
- **File naming:**

| File type | Convention | Example |
|-----------|-----------|---------|
| Components | PascalCase `.svelte` | `MarkdownEditor.svelte` |
| Stores | kebab-case `.store.svelte.ts` | `editor.store.svelte.ts` |
| Services | kebab-case `.service.ts` | `vault.service.ts` |
| Logic | kebab-case `.logic.ts` | `code-highlight.logic.ts` |
| Utilities | kebab-case `.ts` | `fuzzy-match.ts` |
| Types | kebab-case `.types.ts` | `canvas.types.ts` |

- **Imports:** Group in order: (1) external packages (`svelte`, `@codemirror`, `lucide-svelte`, etc.), (2) `$lib/` imports (core → features → plugins), (3) local relative imports (`./`).
- **Comments:** Use JSDoc (`/** */`) on all exported functions, interfaces, interface fields, store methods, and state variables. Write in English.
- **Tests:** Every code change MUST include corresponding test updates (`src/tests/` for TypeScript, `src-tauri/tests/` for Rust).
- **Commits:** Use Conventional Commits with **full detailed descriptions** — every commit must include Context, Problem (if applicable), Solution, Behavior, and Files (with line ranges). No short-form commits. See [docs/COMMITS.md](docs/COMMITS.md) for the full format and examples.

## Performance Guidelines

### Live Preview (CodeMirror Decorations)

The live-preview system splits decoration into two tracks: per-feature `StateField`s for **block** widgets (frontmatter, code-block, table, callout, queryjs, mermaid, math, …) and **one** unified `inlineFormattingPlugin` for inline marks/styles (driven by a node + line handler registry from `live-preview/inline/`). Tag-based styling (bold/italic/strikethrough/monospace) goes through `HighlightStyle` in `inline/markdown-highlight-style.ts` — same `cm-lp-*` class names themes already target. Key performance rules:

1. **Use `Decoration.mark()` + CSS over `Decoration.replace()` + widgets** — marks are CSS-only (GPU-accelerated paint), widgets cause DOM reflow. Only use widgets for complex interactive elements (tables, code blocks, meta-bind selects, queryjs blocks). For simple visual replacements (bullets, HR, hard breaks), use marks with `font-size: 0` + `::before`/`::after` pseudo-elements.

2. **Never re-execute expensive code in `toDOM()`** — widgets are destroyed and recreated when scrolling in/out of viewport. Cache the expensive RESULT, but never hand a cached live element to more than one widget: CodeMirror builds new lines detached, so an `!isConnected` guard cannot tell "same widget re-entering the viewport" from "second widget for a duplicated block", and a shared node gets moved to the last widget, blanking the earlier occurrences. Cache by widget content:
   - `queryjs-block-widget.ts` + `queryjs-session.store.svelte.ts`: the ONLY live-DOM cache — required so `<canvas>` / `<video>` / `<iframe>` state survives re-mount; the `!isConnected` guard is a partial mitigation there.
   - `math-widget.ts`: caches the sanitized KaTeX HTML string; every `toDOM()` builds a fresh element. One widget serves both `$$...$$` blocks (a `<div>`, `displayMode: true`) and inline `$...$` (a `<span>`), so the cache key MUST carry `displayMode` — KaTeX emits different markup per mode and a formula-only key would serve block markup to an inline site.
   - `mermaid-widget.ts`: cache the sanitized SVG markup string (post id-strip).
   - `collection-block-widget.ts`: cache the query DATA (view + QueryResult) and rebuild the DOM per `toDOM()` — rows/pills/bars carry click listeners, so markup strings don't work there.

3. **Widgets with `eq()` don't prevent `toDOM()` calls** — `eq()` returning `true` keeps existing DOM, but when the widget is removed from viewport and re-enters, CM calls `toDOM()` fresh. Cache is the only way to avoid re-execution.

4. **Block plugins must skip viewport-only scroll** — `if (update.viewportChanged && !update.docChanged && !update.selectionSet) return;` as the first line of `update()` in any plugin that scans the full document. Eleven of the twelve block decorators inherit it from `live-preview/core/block-decorator.ts`: build them with `blockDecorator({ settingsKey, profileLabel, compute })` and the factory supplies the guard, the `checkUpdateAction` + `lastCursorLine` gate and the profiling wrapper. `settingsKey` is typed `BlockDecoratorName` and must also appear in `BLOCK_EXTENSIONS` in `live-preview.ts` — that pair is what gives the decorator its Troubleshooting kill-switch. The twelfth name, `frontmatter`, is the exception: a hand-written `StateField` (`plugins/frontmatter-field.ts`) with no factory and no `settingsKey`, and it needs no guard at all — a pure scroll dispatches no transaction, so a `StateField.update()` never runs for it. `BLOCK_EXTENSIONS` still wires its kill-switch. The only remaining hand-written guard is in the inline `inlineFormattingPlugin`; the four inline ViewPlugins (image, footnote, wikilink-embed, meta-bind-input) get the same viewport skip from `checkUpdateAction`, which returns `'none'` on `viewportChanged` — do not add the guard line to them.

5. **`checkUpdateAction` with `lastCursorLine`** — pass cursor line to skip rebuilds when cursor stays on the same line. All plugins use this.

6. **Profile before optimizing** — the LP-PROFILE timing logs (via `appendLog` from `core/profiling.ts`) measure JS computation. If JS is fast (~1ms per plugin), the bottleneck is DOM rendering, not JS. Disable per-feature decorators via `settingsStore.disabledDecorators` to isolate which plugin causes lag.

7. **Scroll debounce** — `scrollDebouncePlugin` defers `forceDecorationRebuild` by 150ms after scroll stops. `expandedVisibleRanges()` pre-computes decorations 2000 chars beyond viewport so content has decorations ready when it scrolls in.

8. **QueryJS uses `_pendingViews` instead of an auto-await regex.** `KBAPI.view()` registers its returned Promise on `this._pendingViews`; the widget calls `await api.awaitAllPending()` after running the user script. A block like `` ```queryjs\nkb.view("…")\n``` `` works whether the user wrote `await` or not — the IIFE returns Promise<undefined> immediately, but `awaitAllPending()` waits on every `view()` started during the run, so DOM mutations finish before the result is cached. **Do not add a regex rewrite back** — the legacy `s/(?<![\w.])(kb|dv)\.view\(/await $1.view(/g` was the source of the "function-local `kb.view()` accidentally awaited" footgun and is permanently obsoleted by `_pendingViews`.

9. **QueryJS `resultCache` holds the LIVE element, not a clone.** `queryjs-session.store.svelte.ts` keeps `Map<contentHash, HTMLElement>` and re-attaches the same DOM node on cache hit. `<canvas>` pixel buffers, `<video>` playback state, and `<iframe>` loaded content survive widget destruction because the element keeps living through the store reference; CodeMirror destroys the widget but the DOM is detached, not garbage-collected. **Do not bring back `cloneNode(true)` + `<canvas>/<video>/<iframe>` exclusion** — the live-ref scheme is correct, simpler, and preserves chart state without the special case.

11. **Interactive widget elements must `stopPropagation` on `mousedown`** — CodeMirror processes mousedown for cursor positioning. Without explicit stopPropagation, clicking a button inside a widget moves the cursor → `shouldShowSource(...)` returns true → widget destroyed → click fires on detached DOM → handler never runs. Pattern used by every interactive control: meta-bind select/inputs, code-block language switcher, callout type popover, table +col/+row buttons, queryjs ▶ Run button.

10. **`autoRunQueries` policy matrix governs when a queryjs block executes.** Set via `settingsStore.queryjs.autoRunQueries`. Each toDOM() lookup runs in this order:
    - Cache hit (`queryjsSessionStore.hasResult(jsContent)`) → re-attach the cached element. No execution.
    - Cache miss + `'always'` → execute. Mark autoRun (harmless — not consulted).
    - Cache miss + `'first-open'` + file not in `autoRunOnFirstOpen` → execute, mark autoRun.
    - Cache miss + `'first-open'` + file already in `autoRunOnFirstOpen` → render `▶ Run` button.
    - Cache miss + `'manual'` → render `▶ Run` button.

    **Invariant: manual mode never marks `autoRunOnFirstOpen`.** A user clicking ▶ Run while in manual does NOT promote the file to "auto-run". If they later switch to `'first-open'`, every block re-shows ▶ Run on the first render after the switch. This invariant lives in `queryjs-block-widget.ts → renderRunPrompt` (no markAutoRun call inside the click handler) and is exercised by the session-store + widget tests. Don't break it — the policy switch would silently corrupt user expectations otherwise.

### Indexing & Watcher

1. **Vault metadata lives in Rust `VaultIndex`** (`src-tauri/src/vault/index.rs`). The TS side does not mirror it — every read goes through a `*_v2` Tauri command (`get_backlinks_v2`, `get_outgoing_links_v2`, `get_outgoing_unlinked_mentions_v2`, `get_unlinked_mentions_v2`, `get_all_tags_v2`, `get_all_tasks_v2`, `get_tasks_in_section_v2`, `get_all_property_records`, `get_all_vault_entries_v2`). The Rust side parses wikilinks / tags / tasks / frontmatter / properties at scan time and maintains backlinks + tags + properties reverse indexes in lock-step with entries.

2. **Reactive consumer pattern: `vaultIndexVersion`** — TS panels (`BacklinksPanel`, `OutgoingLinksPanel`, `TagsView`, `TasksView`, `GraphView`, etc.) attach a `$effect` that reads `vaultStore.vaultIndexVersion` and re-invokes the relevant `*_v2` command. The version bumps when Rust emits `vault-index-updated` (after `update_note_in_index`, `remove_note_from_index`, `scan_vault_v2`, `toggle_task_status`, or any watcher-driven update). Panels store the result locally; no central TS-side mirror.

3. **Unlinked mentions are deferred** — only computed on save and tab switch, never on keystroke. Controlled by `backlinksStore.unlinkedDirty` flag. The actual scan runs Rust-side via `get_unlinked_mentions_v2(path)` (which re-reads candidate files from disk inside Rust + applies the same word-boundary + frontmatter/code-stripping rules as the legacy TS `findUnlinkedMentions`).

4. **Watcher is native Rust** (`src-tauri/src/vault/watcher.rs`, notify crate, dedicated thread, 500 ms debounce). Emits `vault-files-changed` with absolute paths. The TS consumer at `watcher-handler.service.ts` decides incremental (≤10 files) vs full rebuild — incremental fans `read_files_batch` + `update_note_in_index` + `remove_note_from_index` per changed path; full rebuild calls `scan_vault_v2` and the per-feature TS bulk builders that survive (`buildPropertyIndex`, `buildFrontmatterIconIndex`, `scanFilesForCalendar`).

5. **Hidden-directory filter is Rust-side** — `is_inside_hidden_dir` in the watcher silently discards events from any dot-prefixed directory (`.git`, `.kokobrain`, `.claude`, `.obsidian`, etc.). No TS-side filtering needed.

6. **`applyNoteChange` is the ONE owner of "a note's bytes changed"** - `core/filesystem/note-change.service.ts`. Every write path (`notifyAfterSave`, the layout content-effect via `updateIndexesForFile`, the watcher, the note creator, `fs.service::createFile`) and every removal path (`path-change.service::forgetNote`, the watcher's deletion branch) routes through it. Anything that changes a note's PATH goes one level up, through `path-change.service::applyPathChange`, which owns the ordering and the folder-children walk and calls `forgetNote` per path. It owns the `index-dedupe` map, the Rust `update_note_in_index` / `remove_note_from_index` IPC, the FTS5 + semantic legs and the fan-out to the registered per-file indexes. Do not grow a second owner and do not call the per-file updaters directly.
   - **Consumers register, they are not imported.** `core/` must not import `features/` or `plugins/` (ADR-0003), so `registerCollectionNoteChangeConsumer` / `registerFileIconsNoteChangeConsumer` / `registerCalendarNoteChangeConsumer` are wired in `initializeVault` and unwound in `teardownVault`. Forgetting the registration is a SILENT no-op.
   - **The per-source policy has two independent axes.** `SOURCE_POLICY` gives each of `save` / `edit` / `watcher` / `create` / `fs` its own `consumers` and `rust` rule. `save` fires the Rust IPC even on a dedupe hit (Rust has its own `UpdateResult.changed` short-circuit) while skipping the TS consumers; `edit` skips both; `create` and `fs` skip the IPC because `create_note` already indexed the note. Collapsing the axes into one boolean silently drops the save-side `VaultIndex` refresh.
   - **`save` must stay synchronous.** `applyNoteChange` is `async`, but only the `edit` row yields (`yieldBeforeConsumers`). `notifyAfterSave` depends on the consumer fan-out finishing before `invalidateQueryjsCache()`.
   - **FTS5 / semantic keys go through `vaultRelativeKey`** (`utils/path.ts`), the one nullable derivation. A path that is not inside the vault yields `null` and the update is skipped - never fall back to the absolute path. Only the watcher passes a `vaultPath`; on the save side those tables belong to the search after-save observer.

7. **Frontmatter auto-save uses a faster debounce** — `editor.service.ts` runs two mutually exclusive timers: 500 ms for frontmatter-only edits (property changes via meta-bind, icon picker, lifecycle actions) and 2000 ms for body text. The timers cancel each other so only one fires per edit burst.

8. **Index dedupe** (`$lib/utils/index-dedupe.ts`) - shared `Map<path, lastContent>` with `isAlreadyIndexed` / `markIndexed` / `clearIndexedEntry` / `clearAllIndexed`. `applyNoteChange` is the only reader/writer, plus one guard in `updateIndexesForFile` that must run BEFORE it bumps its version counter (a dedupe hit that bumped the version would cancel the consumer fan-out of an in-flight call). The owner's delete branch clears the signature - reached through `path-change.service.ts::applyPathChange` from `deleteItem` / `renameItem` / `moveItem`, plus the watcher's deletion path - so a re-created file with identical bytes re-indexes. On a folder change `applyPathChange` walks the children out of `fsStore.fileTree` first, so each child's signature is cleared too. `resetHooks` wipes the whole map on vault teardown. Memory cost is one Map entry per indexed file (~50 B × N).

9. **Absolute paths everywhere** — `FileTreeNode.path`, editor tabs, all `*_v2` IPC params and return `path` fields are absolute. Never convert to vault-relative paths before storing or invoking. Path traversal protection lives in Rust's `read_files_batch` (`canonicalize` + `starts_with`); the frontend doesn't strip prefixes.

10. **Semantic embedding uses content-hash skip** — `update_semantic_file()` compares chunk hashes before embedding. Unchanged chunks skip ONNX inference (~200-500 ms saved per save). Independent of the `VaultIndex` flow above; both fire from `notifyAfterSave`.

11. **Properties parse cache** — `parseFrontmatterProperties` is LRU-cached (capacity 16) by raw frontmatter substring. Meta-bind's per-keystroke rebuild path doesn't re-parse identical YAML. The cache lives in `properties.logic.ts` and is independent of the Rust `VaultIndex` (which does its own parse during `update_note_in_index`).

12. **QueryJS KBAPI consumes a Rust entries snapshot** — `kb-api.ts` is constructed with `entries: NoteEntryV2[]`, read through `core/vault/vault-entries.service.ts::getVaultEntries()` — a memo over `get_all_vault_entries_v2` keyed on `vaultStore.vaultIndexVersion`, so N visible blocks at one index version cost ONE IPC, not N. It is a cache, not a mirror (ADR 0025 amendment 2026-08-19): between a Rust mutation and the 300 ms-debounced version bump a reader is served the previous snapshot. The version counter is never rewound, so vault scoping comes from `invalidateVaultEntries()`, called at `initializeVault` entry, right after `markIndexReady()`, and in `teardownVault` — do not drop any of the three. Consumers that run BEFORE the bump (`initializeVault` step 4b, `buildFrontmatterIconIndex`) must keep their direct `invoke`, and so must the search content/tag maps, for a different reason: they run at query time, want freshness beyond the last debounced bump, and each fires at most once per settled query. `loadVaultContentMap` fires only on the two fallback paths (an operator-only query, or FTS5 unavailable); `loadVaultTagMap` fires only on a successful `search_fts` call whose query carries `tag:` operators. Neither has a repeat-reader fan-out for a version-keyed memo to collapse. `buildKBPage` reads `entry.tags` / `entry.tasks` / `entry.outgoingLinks` directly — no per-file YAML re-parse. Wikilink resolution still uses TS-side `buildResolutionCache` + `resolveWikilinkCached` over the snapshot's path list (O(N) build, O(1) per outlink). The session cache (`queryjs-session.store.svelte.ts`) keeps live DOM elements across viewport scrolls; `_pendingViews` (no regex rewrite) handles awaitless `kb.view()`.

## Documentation Index

| Document | Contents |
|----------|----------|
| [docs/PATTERNS.md](docs/PATTERNS.md) | Svelte 5 reactive patterns: `$effect`+`untrack()`, PaneForge conditional panes, store pattern |
| [docs/TESTING.md](docs/TESTING.md) | Full testing guide: mock rules, assertions, service/store tests, E2E, completion gate |
| [docs/COMMITS.md](docs/COMMITS.md) | Commit message convention with format and examples |
| [docs/LIVE-PREVIEW.md](docs/LIVE-PREVIEW.md) | Live preview plugin architecture: plugin types, templates, core utilities |
| [docs/SEARCH.md](docs/SEARCH.md) | Search architecture: text / semantic / hybrid pipeline, chunking, models, RRF, versioning levers |
| [docs/adr/README.md](docs/adr/README.md) | Architecture Decision Records — decision log of foundational choices (stack, layers, patterns, testing, performance) |
| [docs/architecture/](docs/architecture/) | Four generated interactive maps: runtime architecture, `initializeVault` lifecycle, live-preview decoration pipeline, search retrieval pipeline. Each is an HTML viewer plus the `.json` source it was rendered from; regenerate with the `archify` skill |

## Plan Mode Workflow

**Every plan created in plan-mode MUST be saved under `.scratch/<feature-slug>/` as a task file** (see [docs/agents/issue-tracker.md](docs/agents/issue-tracker.md)). This is non-negotiable.

### Lifecycle

1. **Create the plan file:** Save to `.scratch/<feature-slug>/plan-<YYYY-MM-DD>.md` (e.g., `.scratch/search-improvements/plan-2026-08-19.md`), creating the directory if needed.
2. **Work through tasks sequentially:** One at a time, in order.
3. **After EACH task, execute this exact sequence (NO EXCEPTIONS):**
   1. Mark the task `[x]` in the plan file.
   2. **Verify test coverage** for every source file you changed — see [docs/TESTING.md](docs/TESTING.md) § Task Completion Gate, Step 0.
   3. **Run the relevant tests** (see Quick Reference rule 6):
      - Rust only → `cargo test --manifest-path src-tauri/Cargo.toml`
      - Frontend only → `pnpm check` + `pnpm vitest run` + `pnpm build`
      - Both → all four
   4. Stage only files related to this task (`git add <specific files>`).
   5. Run `git diff --cached --stat` to verify staging area.
   6. **Commit immediately** — one commit per task, using the full detailed format (Context, Problem, Solution, Behavior, Files with line ranges). See [docs/COMMITS.md](docs/COMMITS.md).
   7. **Only then** proceed to the next task.
4. **Close out when finished:** delete the plan file in its own closing commit (done is recorded in the commit message), matching the `.scratch` issue flow. If the plan produced follow-up issues, they stay as `.scratch/<feature-slug>/issues/<NN>-<slug>.md` until each is closed the same way.

### Task File Format

```markdown
# <Title>

<Brief description of what this plan accomplishes and why.>

## Tasks

- [ ] Task 1: Short description of what needs to be done
- [ ] Task 2: Short description of what needs to be done
- ...

## Notes

<Any relevant context, decisions made, or constraints.>
```

### Rules

- **One task at a time.** Do not skip ahead or work on multiple tasks in parallel.
- **COMMIT after EVERY task.** This is NON-NEGOTIABLE. Each completed task MUST be committed immediately — run the relevant tests (rule 6) → `git add <files>` → `git commit` with the full detailed format (Context, Problem, Solution, Behavior, Files with line ranges). NEVER batch multiple tasks into one commit. NEVER proceed to the next task without committing first. If you finish task 3 and realize you haven't committed tasks 1–2, STOP — you are violating this rule.
- **Update immediately.** The plan file under `.scratch/<feature-slug>/` must always reflect the current progress.
- **Never leave stale files.** If a plan is abandoned, delete it with a note in the closing commit message.
- **Task granularity matters.** Each task should be a concrete, completable unit of work — not a vague goal.

## Agent skills

### Issue tracker

Local markdown under `.scratch/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Default vocabulary (needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout (one `CONTEXT.md` + `docs/adr/` at repo root). See `docs/agents/domain.md`.
