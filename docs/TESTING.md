# Testing Guide

**ALWAYS update tests when code is changed, created, or removed.** No code change is complete without corresponding test updates.

## TypeScript Unit Tests

- Tests live in `src/tests/`, mirroring `src/lib/` structure
- Tests should primarily import from `.logic.ts` files — no framework mocks needed
- Rust tests live in `src-tauri/tests/`, mirroring `src-tauri/src/` structure

## What to Mock (and What NOT to)

### Allowlist — ONLY mock these:

| Category | Examples | Why |
|----------|----------|-----|
| Tauri file APIs | `@tauri-apps/plugin-fs` (readTextFile, writeTextFile, exists, mkdir) | No filesystem in vitest |
| Tauri core APIs | `@tauri-apps/api/core` (invoke) | No Tauri runtime |
| Tauri dialog APIs | `@tauri-apps/plugin-dialog` (open, ask) | No native dialogs |
| Side-effect services | `openOrCreateNote`, `openFileInEditor`, `refreshTree` | Write to disk |
| DOM services | `applyActiveTheme`, `preloadPacks` | No DOM in node env |

### Blocklist — NEVER mock these:

- **`.store.svelte.ts` files** — `$state` + getters work natively in vitest. Use real stores, verify real state. **Do NOT use `$derived`** — it doesn't update synchronously in vitest.
- **`.logic.ts` files** — pure functions are the whole point of testing. Import the real function.
- **Other feature stores** used as data sources (e.g., `noteIndexStore` in tags service).

### Mock Realism

When mocking `invoke('scan_vault')` or `readTextFile`, return data structures that match the real Rust API — nested directories, timestamps, error fields. Do NOT return simplified flat arrays that miss fields. Use shared fixtures from `src/tests/fixtures/`.

### localStorage Stub

Required when any test imports `vaultStore`. Use the shared fixture from `src/tests/fixtures/localStorage.fixture.ts`:

```typescript
const storage = new Map<string, string>();
Object.defineProperty(globalThis, 'localStorage', {
  value: {
    getItem: (key: string) => storage.get(key) ?? null,
    setItem: (key: string, value: string) => storage.set(key, value),
    removeItem: (key: string) => storage.delete(key),
    clear: () => storage.clear(),
  },
  writable: true,
});
```

Place BEFORE imports and AFTER `vi.mock()` calls.

## How to Assert

1. **Assert on REAL store state** — not `.toHaveBeenCalled()` alone:
   ```typescript
   // BAD — proves nothing about data correctness
   vi.mock('note-index.store.svelte', () => ({ noteIndexStore: { setNoteIndex: vi.fn() } }));
   await buildIndex('/vault');
   expect(noteIndexStore.setNoteIndex).toHaveBeenCalled();

   // GOOD — uses real store, verifies real state
   import { noteIndexStore } from '$lib/features/backlinks/note-index.store.svelte';
   await buildIndex('/vault');
   expect(noteIndexStore.noteIndex.get('/vault/a.md')).toEqual([
     expect.objectContaining({ target: 'b' })
   ]);
   ```

2. **Assert on computed getters** — components consume these, not raw state:
   ```typescript
   // BAD — only tests the setter
   bookmarksStore.setBookmarks([{ path: '/a.md', type: 'file' }]);
   expect(bookmarksStore.bookmarks).toHaveLength(1);

   // GOOD — tests what components actually consume
   bookmarksStore.setBookmarks([{ path: '/a.md', type: 'file' }]);
   expect(bookmarksStore.isBookmarked('/a.md')).toBe(true);
   expect(bookmarksStore.isBookmarked('/other.md')).toBe(false);
   ```

3. **Verify behavior, not mechanism:**
   ```typescript
   // BAD — mirrors implementation, catches nothing
   it('calls scan_vault then read_files_batch', async () => {
     await buildIndex('/vault');
     expect(invoke).toHaveBeenCalledWith('scan_vault', { path: '/vault' });
   });

   // GOOD — verifies observable outcome
   it('indexes vault files and makes wikilinks searchable', async () => {
     vi.mocked(invoke).mockResolvedValueOnce(/* scan */).mockResolvedValueOnce(/* batch */);
     await buildIndex('/vault');
     expect(noteIndexStore.noteIndex.size).toBe(2);
     expect(noteIndexStore.noteIndex.get('/vault/a.md')?.[0]?.target).toBe('b');
   });
   ```

4. **Tauri mocks:** verify called with correct args AND verify resulting store state.

5. **NEVER use `.toHaveBeenCalled()` as the SOLE assertion** — always also verify state.

## What to Cover

### Service Tests

Validate the full chain: Tauri API → service logic → store mutation → computed getter update.

**Every service test suite MUST include:**
1. Happy path (normal operation)
2. Empty/null input (empty vault, null path, missing file)
3. Error handling (parse failure, file not found)

**Setup/teardown:**
- Every `beforeEach`: call `.reset()` on every store used + `vi.clearAllMocks()`
- If `vaultStore` imported: add localStorage stub (see above)

**Orchestrator exception:** Thin orchestrators (e.g., `index-updater.service.ts`) that only dispatch to other already-tested services MAY mock those sub-services and verify call order + arguments. This is the ONLY case where mocking services is acceptable.

### Store Tests

Validate reactive state: setters, getters, and especially computed getters.

**Mandatory coverage for every store:**
1. Initial state (all defaults correct)
2. Every public setter modifies state correctly
3. **Every computed getter** reacts to state changes — HIGHEST PRIORITY
4. `reset()` restores all state including derived values
5. Edge cases: empty collections, boundary conditions

### General Rules

- When adding new code: write tests for it
- When modifying existing code: update related tests to reflect the changes
- When removing code: remove or update the corresponding tests
- **Bug validation:** FIRST write a failing test that exposes the bug using real stores (not mocks). Only if real-store testing is technically impossible, fall back to console.log.
- **Test the actual output, not just the container.** Always assert on the final output (e.g., `svg` inside a diagram div, actual text inside a rendered widget), not just that a wrapper element exists.
- **The 10-second litmus test:** After writing a test, comment out the key `store.setX()` line in the source. Does the test fail? If not, the test is worthless — rewrite it.

## E2E Tests (Playwright)

- Tests live in `e2e/specs/`, run with `./scripts/e2e.sh` (or `pnpm test:e2e`)
- The `scripts/e2e.sh` wrapper manages the full lifecycle: starts the E2E Vite server on port 1421, waits for it, runs Playwright, and cleans up zombie processes on exit
- **ALWAYS use `./scripts/e2e.sh`** — never start the E2E server manually or use `PLAYWRIGHT=true pnpm dev` directly
- Pass extra args to Playwright via the script: `./scripts/e2e.sh e2e/specs/editor.spec.ts` or `./scripts/e2e.sh --ui`

### When to Run E2E (per-task)

**After each task that touches a core area, run ONLY the affected spec(s)** — never the full suite.

| Area modified | Run only this |
|---------------|---------------|
| `core/file-explorer/` | `./scripts/e2e.sh e2e/specs/file-explorer.spec.ts e2e/specs/file-operations.spec.ts` |
| `core/markdown-editor/` (editor, tabs) | `./scripts/e2e.sh e2e/specs/editor.spec.ts` |
| `core/markdown-editor/` (live preview) | `./scripts/e2e.sh e2e/specs/live-preview/<relevant>.spec.ts` |
| `core/editor/` (tab/file logic) | `./scripts/e2e.sh e2e/specs/editor.spec.ts` |
| `core/filesystem/` | `./scripts/e2e.sh e2e/specs/file-operations.spec.ts` |
| `core/vault/` | `./scripts/e2e.sh e2e/specs/vault-picker.spec.ts` |
| `core/app-lifecycle/` | `./scripts/e2e.sh e2e/specs/editor.spec.ts` |
| `src-tauri/src/` (Rust commands) | The spec(s) that exercise the affected command |

For `features/` and `plugins/`: run the matching spec only if one already exists. Otherwise unit tests are the gate.

**Full suite (`./scripts/e2e.sh` with no args):** only at the very end of a multi-task plan, and only if 3+ core areas were touched.

### When to Create E2E Tests

- **New user-facing feature:** At least one E2E test covering the happy path.
- **New live preview plugin:** Add a spec in `e2e/specs/live-preview/` following the existing pattern.
- **User-visible bug fix in core:** Add an E2E test that would have caught it.
- **Behavioral change:** Update the relevant E2E spec to match.

### E2E Quality Rules

- **Assert on rendered content, not just containers.** Check that an `<svg>` exists inside a Mermaid widget, that table cells contain expected text — not just that a wrapper div is present.
- **Keep tests focused.** One behavior per test.
- If E2E tests fail, fix the issues before finishing the task.

## Task Completion Gate

Before declaring any task complete, ALL of the following must pass — **in this order:**

### Step 0: Verify test coverage for EVERY modified file

**Before running checks or committing, review every source file you changed in this task.** For each one:

1. **Find the corresponding test file** in `src/tests/` (mirrors `src/lib/` structure) or `src-tauri/tests/` (mirrors `src-tauri/src/`).
2. **If the test file exists** → read it and update it to cover your changes (new branches, changed behavior, new getters, etc.).
3. **If no test file exists** and the source is a `.logic.ts`, `.store.svelte.ts`, or `.service.ts` → **create a test file** following the project conventions.
4. **Only `.svelte` components and `utils/` with trivial code** may skip tests — everything else MUST have test coverage.

**NEVER commit a source change without checking its test file.** A commit that touches `backlinks.service.ts` but not `backlinks.service.test.ts` is almost certainly wrong.

### Steps 1–7: Checks and commit

1. **Run the relevant tests** based on what changed:
   - **Rust only** (`src-tauri/`): `cargo test --manifest-path src-tauri/Cargo.toml`
   - **Frontend only** (`src/`, styles, config): `pnpm check` (ZERO type errors) + `pnpm vitest run` (ALL pass)
   - **Both**: all three commands
3. Service tests use REAL stores (not mocked) unless testing an orchestrator
4. New tests include at least one edge case (empty input, error, or null)
5. Every new computed getter in a store has a corresponding test
6. No test uses `.toHaveBeenCalled()` as the sole assertion — must also verify state
7. **COMMIT IMMEDIATELY** — after steps 1–6 pass, create a commit for this task BEFORE starting the next one. See [docs/COMMITS.md](../docs/COMMITS.md) for the full post-task commit sequence.

**NEVER commit without running the relevant tests first.** No exceptions — but only run what matches the changes (Rust tests for Rust, frontend tests for frontend, both for mixed).
**NEVER skip the commit between tasks.** Each task in a plan = one commit. No batching.
