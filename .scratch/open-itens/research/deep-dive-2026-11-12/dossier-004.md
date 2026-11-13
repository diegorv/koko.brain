# Dossier: Issue 004, a canvas edit closed or renamed inside the debounce window

Written 2026-11-12 against HEAD `115d8d576`. Read-only research; nothing was run (no tests, no app). "Fact" means read in code at the cited line. "Inference" means reasoned, not run.

## 1. Still present?

Verdict: **still present exactly for the close case (Cmd+W / tab x). The rename case is still present in code but practically unreachable.** The merged Issue 49 text (unkeyed instance, shared history, `onContentChange` writing `tabs[activeIndex]`) is already fixed and stale.

Facts, checked at HEAD:

- `closeTab` (src/lib/core/editor/editor.service.ts:303-332): dirty check `isTabDirty(tab)` at :312, `editorStore.removeTab(currentIndex)` at :328, `notifyTabClosed` at :330. Nothing runs between "is it dirty" and "remove" that asks the canvas to flush. A tab inside the debounce window is clean, so no prompt and no save.
- CanvasInner debounce (src/lib/features/canvas/CanvasInner.svelte:223-241): any change to `nodes` sets `pendingPersist = true` (:234) and arms a 300 ms timer (:236-239); the effect cleanup clears it (:240). Each keystroke re-arms it (TextNode.svelte:38-40 calls `updateNodeData` on every `input`), so the window is "300 ms after the last change".
- `onDestroy` flush (:246-250) calls `persistChanges` -> `persistWithoutHistory` (:118-124) -> `onJsonChange(ownPath, json)` at :123. `ownPath` is read once at :63. `onJsonChange` is `onContentChangeForPath` (src/lib/app/EditorView.svelte:83-86, the `{#key editorStore.activeTab.path}` block) -> `editorStore.updateTabContentOnly(path, content)` (editor.service.ts:265-268; editor.store.svelte.ts:139-144), which does `tabs.find(...)` and no-ops when the tab is gone. By the time Svelte destroys the keyed instance, `removeTab` already ran (editor.service.ts:328), so the edit is dropped. `scheduleAutoSave('body')` then finds no dirty tab.
- Only canvas close entry points: Cmd+W via `closeActiveTab` (src/lib/app/global-keybindings.ts:80-84), the command palette (src/lib/app/commands.ts:112), tab x and the tab context menu (src/lib/core/markdown-editor/EditorTabs.svelte:89, :104). All go through `closeTab`.
- Rename: `applyPathChange` calls `updateTabAfterRenameOrMove(from, to)` right after `diskOp` (src/lib/core/filesystem/path-change.service.ts:185); it calls `editorStore.updateTabPath` (src/lib/core/filesystem/link-updater.service.ts:99). The path change re-keys the EditorView block, the old instance's `onDestroy` flush targets the old `ownPath`, no tab has it, edit dropped. Renames do no pre-save (only deletes do, path-change.service.ts:167-172).
- Existing test src/tests/lib/features/canvas/canvas-tab-switch.test.ts:158-173 asserts only that the neighbour tab M is untouched after `closeTab(A)`. Nothing asserts A's edit survives. Confirmed.
- No pre-close hook exists: grep for `beforeClose|preClose|before-close` in src/lib returns nothing. `registerTabCloseListener` (editor.service.ts:28) runs after removal and its only consumer is src/lib/plugins/queryjs/queryjs-ports.ts:16.

History: `git log -- CanvasInner.svelte editor.service.ts EditorView.svelte` shows the last relevant change is f37acb402 (Issue 01, by-path persists). Later commits (7b71c217f, da3082ce2, 3df680423, 8afcfb42e) are unrelated to this path. No commit fixed the close drop.

Issue-text drift (to fix while implementing): the cited line numbers are off by a few lines (closeTab is :303-332 now, not :309-328; debounce :223-241, onDestroy :246-250). The "Option 2: have the path-scoped writer save a path with no open tab straight to disk" is unsafe for rename (it would recreate the renamed-away file) and for a tab closed after a failed-save prompt; the second opinion already said prefer the pre-close hook. Take the hook.

Related, same class, not in the Issue (fact): quit, vault switch and restart go `saveAllDirtyTabs` (editor.service.ts:275-288; callers exit.service.ts:16, vault.service.ts:23, app-lifecycle.service.ts:192), which only sees dirty tabs. A canvas edit inside the 300 ms window is clean, and quit never runs `onDestroy`, so it is lost too. The comment at CanvasInner.svelte:243-245 claims the flush covers quit; it does not. Inference: after `resetEditor`, vault-switch destroy flushes also hit no tab.

## 2. Impact for this owner

- Trigger: type in a canvas text card, then close the tab within ~300 ms of the last keystroke. Other edits (drag stop, delete, connect) persist immediately (`persistChanges` called synchronously), so only text edits and other `updateNodeData`/selection-driven node changes arm the debounce.
- Frequency: the owner uses canvas, so the code path is real. But the gap needs Cmd+W within 300 ms of the last typing. Inference: most closes come after a pause longer than that, so rare (order of "occasionally in months", higher for fast type-then-Cmd+W reflex). The whole text typed since the last 300 ms pause is lost, usually a few words, in worst case a long burst.
- Severity: silent data loss of text already typed. Not recoverable: it was never in the store or on disk, and File History cannot hold it. No prompt appears.
- Rename: needs a programmatic rename inside the window (second opinion: a user rename takes longer than 300 ms). Remaining routes: Auto Move on a canvas (the autosave observer moves .canvas files today; Issue 054 stops that; Auto Move is off by default) and a watcher-detected rename (the owner has no external writer). Effectively unreachable for this owner.
- Overall rank: medium severity x low likelihood, S/low risk. Fair at the head of the queue mainly because it is the blocker for 015 (a daily-use close-prompt fix), 006 (kanban, same mechanism), 027 and 100.

## 3. Complexity and risk

Size: **S** (about 25 lines in editor.service.ts, about 12 in CanvasInner.svelte, tests). Risk: low.

Files:
- src/lib/core/editor/editor.service.ts: add a path-keyed pending-edit flusher registry next to `tabCloseListeners` (:15-46), and call it at the top of `closeTab` before the dirty check (:311).
- src/lib/features/canvas/CanvasInner.svelte: register a flusher on mount, unregister on destroy.
- Optional: src/lib/core/filesystem/link-updater.service.ts:93-111 (rename), 3 lines.
- Tests: src/tests/lib/features/canvas/canvas-tab-switch.test.ts, src/tests/lib/core/editor/editor.service.test.ts.

Centrality: `closeTab` is a core write-adjacent path, but the change is additive and a no-op when no flusher is registered (every non-canvas tab). `core/` must not import `features/` (ADR-0003, layer-rules test): the registry lives in core, the canvas (feature) registers into it; CanvasInner already imports `openFileInEditor` from editor.service (CanvasInner.svelte:44), so the direction is allowed.

Readers/regression surface:
- Other `closeTab` callers: only the four above (all via `closeTab`). `closeTabsForDeletedPath` (:401-414) bypasses closeTab; a canvas deleted within 300 ms of a card edit loses that edit in the Trash copy (pre-delete save sees a clean tab). Leave it; fact, negligible.
- The existing `onDestroy` flush stays as the net for source-mode toggle and tab switch (tab still exists then). After a pre-close flush `pendingPersist` is false, so `onDestroy` is a no-op.
- Dirty-prompt interplay (key design point, fact): today `closeTab` prompts for any dirty tab (:312-319). If the hook only flushed into the tab, the tab becomes dirty and the user gets "This file has unsaved changes. Discard changes?" for text they just typed, or the edit is lost if they answer Discard. Issue criterion 1 expects a write to A's path, so the close must save after the flush. Issue 015 (blocked by 004) later makes every dirty close save-first; 004 must not take over 015's full scope (confirm-failed-save wording, in-flight keystroke re-check, docs).
- A flush on a canvas whose only "change" is selection or a xyflow measurement update re-serializes through `flowToCanvas`/`serializeCanvas`. If the file's bytes differ from the serializer's output (a file last written by Obsidian), the tab turns dirty and a save rewrites the file. This already happens 300 ms after any such change today (the debounce fires anyway), so the close path adds no new class of write; and `writeTab` no-ops when the tab is not dirty (editor.service.ts:189). Inference: not run.
- A throwing flusher must not block the close: wrap each in try/catch with `error('EDITOR', ...)`, matching `notifyTabClosed` (:38-46).

## 4. Implementation plan (test first)

Assumption stated: the flusher is a generic "pending edit" hook, so Issue 006 (kanban) can register the same way. No new abstraction beyond one Map and two functions.

1. Failing integration test first, in src/tests/lib/features/canvas/canvas-tab-switch.test.ts, next to the test at :158. Reuse `render`, `typeIntoCard`, `writtenPaths`.
   - `it('closing a canvas within the debounce window saves the typed text to its file')`: `render([{A canvas}, {M note}])`; `typeIntoCard('typed in A')`; `advanceTimersByTimeAsync(100)`; `await closeTab(tabIndex(A))`; `flushSync()`; `advanceTimersByTimeAsync(3000)`. Expect: `tabIndex(A) === -1`; `writeTextFile` was called with A and a body containing `typed in A` (`vi.mocked(writeTextFile).mock.calls.find(([p]) => p === A)`); `writtenPaths()` does not contain M; `tabContent(M)` is `NOTE`. Fails today: the tab is removed before the flush, so no write to A. (Note: this file does not mock `@tauri-apps/plugin-dialog`; the real `ask` goes through the mocked `invoke` and returns false, so a flush-only fix with a prompt would leave tab A open and also fail this test. That is what makes it a real proof of save-then-close.)
   - Guard: closing a canvas with no pending edit still closes with no write (A clean).
2. Failing unit tests in src/tests/lib/core/editor/editor.service.test.ts (`describe('closeTab')`, real store, only Tauri/dialog mocked; `ask` is mocked there at :8):
   - a flusher registered for the path runs before the dirty check; when it returns true and has changed the tab content (via `editorStore.updateTabContentOnly`), `closeTab` calls `writeTextFile(path, content)`, never `ask`, and removes the tab;
   - flusher returns false: no write, clean tab closes as today;
   - flusher true but `writeTextFile` rejects: tab dirty, `ask` is called with the existing labels, Cancel keeps the tab;
   - a flusher for another path is not called; an unregistered flusher is not called; a throwing flusher is logged and the close proceeds; pinned tab still skipped (flusher not called).
3. Implement in editor.service.ts:
   - `const pendingEditFlushers = new Map<string, Set<() => boolean>>()`; `export function registerPendingEditFlusher(path: string, flush: () => boolean): () => void` (returns unregister; JSDoc: flush writes the view's unsaved edit into the tab of `path` and returns true if it did); `export function flushPendingEdits(path: string): boolean` (runs the set for `path`, try/catch per flusher, returns true if any returned true).
   - In `closeTab`, after the pinned check and before `if (!isVirtualTab(tab))`: `if (flushPendingEdits(tabPath)) await saveFileByPath(tabPath);` then the existing dirty check runs unchanged (a failed save leaves the tab dirty, so the existing prompt is the fallback). Remove the explicit save when Issue 015 lands (015's save-first covers it).
4. Implement in CanvasInner.svelte: a `flushPending()` that does `if (!pendingPersist) return false; clearTimeout(nodesChangeTimer); persistChanges(nodes, edges); pendingPersist = false; return true;`, used by both the new registration and the existing `onDestroy` (keep onDestroy's behavior). `onMount(() => registerPendingEditFlusher(ownPath, flushPending))` (import `onMount` from svelte). Update the comment at :243-245 to say it covers tab switch and source-mode toggle, and that close is covered by the registered flusher.
5. Optional rename leg (Issue criterion 2, demoted): in `updateTabAfterRenameOrMove` call `flushPendingEdits(tab.path)` for the tab and each child before `updateTabPath` (link-updater.service.ts:96-107). The flush writes into the tab at the old path (still existing), then the path changes and the 2 s autosave writes to the new path. Test: type, 100 ms, `updateTabAfterRenameOrMove(A, A2)`, advance 3000: write to A2 with the text, none to A. Inference: that test imports link-updater, which pulls `applyNoteChange`; `invoke` is mocked in this test file, so it should load, but not verified. Do this only if cheap; the owner cannot hit it.
6. Optional (not in the Issue; owner call, mind "no core changes for corner cases"): call the same flushers for every registered path at the start of `saveAllDirtyTabs` so quit and vault switch keep the last 300 ms. One loop over the Map. Recommend raising it as a follow-up note rather than folding it in.
7. Gate: frontend only, `pnpm check` + `pnpm vitest run`; `pnpm build` only if the owner keeps the Issue's gate line (no dependency change, so CLAUDE.md rule 6 does not require it). One commit, full-format message, `fix:` with a test (satisfies the commit-msg hook).

Acceptance criteria review:
- Criterion 1 (close within debounce writes A's file, never the neighbour's): correct and testable, but incomplete: add "no unsaved-changes prompt appears" and "tab A is removed". Without those a flush-only fix passes a weaker reading and still shows the false prompt.
- Criterion 2 (rename): the phrase "through the same pre-close flush" is wrong, a rename is not a close; it needs its own call in `updateTabAfterRenameOrMove`. Demote to optional per the second opinion. Keep "never by saving to the old path".
- Missing: unit-level criteria for the new registry (unregister on destroy, throwing flusher, other paths untouched), and a criterion that the Kanban Issue (006) can register through the same API, since the Issue's own Stale note asks for reuse.
- Missing from Issue (optional): quit and vault switch with a pending edit (step 6).
- The "Historical" Issue 49 checkboxes are already met and can be dropped; the Cmd+W one is criterion 1.
- Gate line asks for `pnpm build` with no dependency change: not required by CLAUDE.md rule 6.

## 5. Run order

- Blocked by: none.
- It blocks: 015 (closeTab save-first, same function), 006 (kanban flush reuses the registry), 027 (unparseable canvas), 100 (note rename updates canvas file nodes; also blocked by 039, 052).
- Hot-code series group: `editor.service.ts`: 004, 015, 016, 017, 018, 019, 076, 089, 094, 095, 028 (priority-2026-11-08.md:58). 004 first, then 015 immediately (same `closeTab`, so no concurrent run), and 028 (duplicate saves unsaved typing) later in the queue; all of these are serial, never parallel.
- Shared files with other queue Issues: `editor.service.ts` with 015 and 028; `CanvasInner.svelte` with 027, 026, 039, 052, 100 and the deferred canvas Issues (none in the current queue except 004); `link-updater.service.ts` only if step 5 is taken (not shared with a queue Issue). Queue order is correct: 004 -> 015 first.
- Process notes: no worktree conflict beyond the series rule; after delivery the CLAUDE.md post-delivery review applies only if the fix commits are not tests/docs only.

## Not verified

- No test was run; the failing-test claim for step 1 is by code trace (closeTab removes the tab at :328 before any flush), not execution.
- Whether Cmd+W fires from inside the card textarea in the real app (no input exclusion found in global-keybindings.ts, but not confirmed in the running app).
- That `serializeCanvas` is byte-stable against files written by other tools.
