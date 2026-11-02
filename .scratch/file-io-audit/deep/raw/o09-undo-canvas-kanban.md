# o09-undo-canvas-kanban: deep-dive raw report

Code read in worktree `.claude/worktrees/file-io-repro` (identical to main). Installed versions: svelte 5.57.2, @xyflow/svelte 1.7.0, @codemirror/commands 6.11.1, @codemirror/state 6.7.6.

Repro tests (all under `src/tests/repro/o09-undo-canvas-kanban/`):
- `undo-across-doc-replace.test.ts` (real MarkdownEditor.svelte + real editor store + real CM history)
- `canvas-tab-switch.test.ts` + `CanvasTabHarness.svelte` (real CanvasView/CanvasInner/SvelteFlow, harness mirrors `src/lib/app/EditorView.svelte:64-86`, onJsonChange = real `onContentChange`)
- `kanban-unmodeled-content.test.ts` (real KanbanView via the repo's `src/tests/fixtures/KanbanViewHarness.svelte`)

Only Tauri modules (`@tauri-apps/plugin-fs`, `plugin-dialog`), `svelte-sonner`, and `kanban.service.js` (Tauri IPC, same mock as the repo's own KanbanView test) are mocked.

Upstream source fetched:
- https://raw.githubusercontent.com/codemirror/commands/main/src/history.ts (addToHistory=false -> `state.addMapping(tr.changes.desc)`; `addMappingToBranch` keeps an event whose mapped changes are non-empty; `mapEvent` maps `event.changes.map(mapping)`)
- https://raw.githubusercontent.com/xyflow/xyflow/main/packages/svelte/src/lib/components/NodeWrapper/NodeWrapper.svelte (click -> `store.handleNodeSelection(id)`)
- https://raw.githubusercontent.com/xyflow/xyflow/main/packages/svelte/src/lib/store/index.ts (`addSelectedNodes` and `updateNodeInternals` assign a new `store.nodes` array)
- https://raw.githubusercontent.com/sveltejs/svelte/main/packages/svelte/src/internal/client/runtime.js (`get`: `if (is_destroying_effect && old_values.has(signal)) return old_values.get(signal);`)
- https://raw.githubusercontent.com/sveltejs/svelte/main/packages/svelte/src/internal/client/reactivity/sources.js (`internal_set` stores the previous value in `old_values` when not destroying)

---

## Bug 1: CodeMirror undo history survives full-doc replaces (tab switch, external sync), so Cmd+Z appends text deleted elsewhere (cross-cutting-3)

Verdict: CONFIRMED_BY_TEST. Severity corruption, P1.

Trace:
- One EditorView/EditorState per MarkdownEditor mount: `MarkdownEditor.svelte:107-131`, `history()` at `setup/editor-extensions.ts:130`, `historyKeymap` at `:160`.
- Tab switch: `MarkdownEditor.svelte:230-235` dispatches `{from: 0, to: doc.length, insert: tab.content}` with `Transaction.addToHistory.of(false)`. History is never reset (no `historyField` / new state anywhere in `src/lib`).
- External sync (Properties panel, task toggle, link rename, watcher reload): `MarkdownEditor.svelte:329-333`, same shape.
- CM history (fetched): addToHistory=false -> `addMapping`; the inverse of a deletion is an insertion, and `ChangeSet.map` keeps insertions inside a range the other change replaced, placing them after the replacement text, so the event survives and inserts at the END of the new doc.
- Undo is a normal doc change: `editor-extensions.ts:171` gate (`isTabSwitching` / `isExternalEdit` both false) -> `onDocChanged` -> `onContentChange` (`editor.service.ts:224-227`) -> `editorStore.updateContent` + 2 s autosave -> `writeTextFile`.

Test: `undo-across-doc-replace.test.ts`
```
AssertionError: expected 'Line one of B\nLine two of B\nSECRET …' not to contain 'SECRET'
+ Line one of B
+ Line two of B
+ SECRET PARAGRAPH OF NOTE A
 ❯ expect(editorStore.tabs[1].content).not.toContain('SECRET');
```
Same-note variant (Properties panel via the real `syncExternalContentToEditor`):
```
AssertionError: expected true to be false
 ❯ expect(doc.endsWith(`Last para.\n${SENT}`)).toBe(false);
```
The store tab of B (the bytes autosave writes) holds A's paragraph.

Reachability: default settings, common actions (delete text in note A, switch to B, edit, press Cmd+Z repeatedly to revert B; or delete a sentence, edit a property, Cmd+Z). Nothing is lost; foreign text is inserted and autosaved 2 s later. CM scrolls the undo target into view, so it is usually visible, but repeated Cmd+Z makes it easy to miss, and it can move private text from one note into another file.

Recoverable: Cmd+Shift+Z (redo) or manual delete while noticed; File History snapshots of B's previous saves.

Fix sketch: on tab switch, build a fresh EditorState (or per-tab saved states) instead of dispatching a replace into the old history; for external syncs, compute a minimal diff instead of a whole-doc replace, or reset history (`view.setState`) when replacing the whole doc.

---

## Bug 2: An unparseable .canvas opens as an empty canvas and the first edit overwrites the file (feature-writers-6, fidelity-10)

Verdict: CONFIRMED_BY_TEST. Severity data-loss, P1.

Trace:
- `canvas.logic.ts:36-49` `parseCanvas`: any JSON.parse error, non-object, or array returns `createEmptyCanvas()`. No log, no flag, no toast.
- `CanvasInner.svelte:71` `canvasData = $derived(parseCanvas(jsonContent))`; `:85-98` sync effect builds nodes from it (empty).
- `:571-577` the empty state shows a "+ Add card" button, the most obvious next action.
- `addTextCard` (`:451-457`) -> `persistChanges` -> `persistWithoutHistory` (`:104-109`) -> `flowToCanvas(nodes, edges, canvasData)` (empty original) -> `onJsonChange` = `onContentChange` (`EditorView.svelte:81`) -> autosave (`editor.service.ts:168`).
- The repo's own `canvas.logic.test.ts:56` asserts the empty-on-invalid behavior; no test covers what happens on the next edit.

Test: `canvas-tab-switch.test.ts` "feature-writers-6 / fidelity-10"
```
AssertionError: expected '{\n\t"nodes": [\n\t\t{\n\t\t\t"id": "…' to contain 'keepme0000000001'
+ { "nodes": [ { "id": "c5f67f538c7695ce", "type": "text", "x": -125, "y": -30, ... "text": "" } ], "edges": [] }
```

Reachability: a .canvas with a git merge-conflict marker, a sync-conflict, a hand edit with a trailing comma, or a typo made in the app's own source mode and then a toggle back to canvas view. Less common than plain note editing, but no warning at all and the UI invites the destructive click.

Recoverable: File History only holds bytes from earlier in-app saves (after-save observer, `file-history.service.ts:190-197`, 7-day retention); an externally broken file's bytes are never snapshotted. Otherwise git/external backup only.

Fix sketch: make parseCanvas report failure (e.g. `{ok:false}`), show an error state with a source-mode link, and refuse to persist while the source does not parse.

---

## Bug 3: Kanban board actions rewrite the file from the lossy model: unmodeled lines, CRLF boards and frontmatter boards lose content (feature-writers-5, fidelity-5)

Verdict: CONFIRMED_BY_TEST. Severity data-loss, P1.

Trace:
- `kanban.logic.ts:4-6`: `HEADING_RE = /^##\s+(.+)$/`, `TASK_RE = /^-\s+\[([xX ])\]\s+(.*)$/`, `ARCHIVE_SEPARATOR_RE = /^---\s*$/`; `:61` splits on `\n` only. On CRLF lines each line ends in `\r`; in JS `.` does not match `\r` and `$` (no `m` flag) only matches at end of input, so `(.+)$` and `(.*)$` cannot reach past the `\r`. HEADING_RE and TASK_RE both fail, no lanes are created and every card is skipped.
- `:67-109`: only `##` headings, `- [ ]`/`- [x]` tasks and the first `---` are kept; prose, `#`/`###` headings, indented lines, `- [/]` and other states are skipped.
- `:69-72`: the first `---` (a frontmatter opener) switches to archive mode; `:78-82` headings in archive are skipped; `:103-104` items go to archive.
- `serializeKanbanBoard` (`:118-145`) writes only lanes, cards, archive and settings.
- `KanbanView.svelte:79-90` `applyChange` -> `onContentChange` (`EditorView.svelte:79`) -> 2 s autosave.

Test: `kanban-unmodeled-content.test.ts`
```
AssertionError: expected '## To Do\n\n- [ ] Card one\n\n## Done…' to contain 'Prose the user typed in source mode.'
AssertionError: expected '\n%% kanban:settings\n{\n  "viewMode"…' to contain 'Card one'      (CRLF: whole board reduced to a settings block)
AssertionError: expected '---\n\n## Archive\n\n- [ ] Card one\n…' to contain 'tags: [work]'  (frontmatter dropped, all cards moved to Archive)
```

Reachability: the app creates LF `.kanban` files without frontmatter (`kanban.service.ts:18`), so this needs (a) content typed in the app's Kanban source mode (button at `EditorView.svelte:88-100`) and then any board action, or (b) an external edit (CRLF from a Windows/git autocrlf/sync tool, frontmatter added by hand). Path (a) is realistic for users who use source mode; (b) is less common. The CRLF board shows empty first, which is a visible warning sign, but the next action still wipes it.

Recoverable: path (a) usually recoverable from File History, because the source-mode text was autosaved in-app first. Path (b): externally written bytes are never snapshotted, so only git/external backups.

Fix sketch: normalize `\r\n` before parsing (or `\r?$` like `navigation.logic.ts`), skip a leading frontmatter block and re-emit it, and keep unrecognised lines attached to their lane/card (or refuse to serialize a board that dropped lines and send the user to source mode).

---

## REFUTED: Canvas onDestroy flush writes canvas JSON into the newly active tab (feature-writers-1)

Verdict: REFUTED by test.

The premise holds: `pendingPersist` (`CanvasInner.svelte:211-226`) stays true for 300 ms after any `nodes` change, xyflow assigns a new `nodes` array on selection and measurement (fetched store/index.ts), and `onDestroy` (`:230-234`) calls `persistChanges` -> `onContentChange` -> `editorStore.updateContent`, which writes `tabs[activeIndex]` with no path check (`editor.store.svelte.ts:84-88`). I also confirmed with a stack-capturing harness that `onDestroy` does call `onJsonChange` after the switch.

What blocks it: Svelte 5 teardown semantics. During a destroying effect, `get()` returns the pre-change value of any signal changed in the current flush (`runtime.js`: `if (is_destroying_effect && old_values.has(signal)) return old_values.get(signal)`; `sources.js` `internal_set` records `old_values.set(source, source.v)`). The teardown runs in the same flush as the `activeIndex` change that unmounted the canvas branch, so `updateContent` reads the OLD `activeIndex`/`tabs` and writes into the canvas tab itself. The captured log showed `activeIndex=1` (the canvas) inside the onDestroy call made after `setActiveIndex(0)`.

Passing tests in `canvas-tab-switch.test.ts` assert the correct behavior on all claimed paths: switch via flushSync, switch via normal scheduler batching, the file-node-click path (`addTab` after an await, like `openFileInEditor`), and closing the canvas tab (`removeTab`). The note keeps its markdown every time, and the canvas tab receives the flush.

Residual (not claimed, P3): the guard is implicit (a Svelte runtime detail, not app code). On close, a pending <300 ms node-text edit is flushed into the removed tab object and lost; `closeTab` does not prompt because the tab is not dirty yet. On a canvas -> canvas switch, the effect cleanup cancels the timer but leaves `pendingPersist` true, so A's last <300 ms edit is dropped.

---

## Not verified
- I did not drive the real Tauri window. Cmd+Z was simulated by calling `undo(view)` from @codemirror/commands, the same command `historyKeymap` binds.
- The canvas tests use a harness that mirrors `EditorView.svelte:64-86`, not the full app EditorView.
