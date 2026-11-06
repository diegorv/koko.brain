# 104: A meta-bind button's updateMetadata always writes the button's own note, also after an open or createNote action

**Migrated from:** `.scratch/file-io-audit/issues/48-meta-bind-button-writes-opened-note.md` (audit 2026-11-05). Priority: corner case (bucket 4-corner). It writes into an unrelated note, but only for a button that puts open or createNote before updateMetadata. It builds on Issue 10's open result.

**Audit check at `5f8003d67`:** still_present (content, low). The click loop runs every action against the same shared view (src/lib/core/markdown-editor/extensions/live-preview/widgets/meta-bind-button-widget.ts:33-40). open awaits followWikilinkInfo and returns true (:103-120), createNote returns host.createNote (:122-128), and the next updateMetadata calls dispatchMetaBindUpdate(view, ...) (:98-101), which reads view.state.doc at call time (widgets.ts:868-883). No code captures the button note's path.

**Stale in the text below:** Lines moved: click loop :33-40 (Issue :30-37), updateMetadata :98-101 (Issue :85-88), open :103-120 (Issue :90-103, :113), createNote :122-128 (Issue :105-111); dispatchMetaBindUpdate is at widgets.ts:868 (Issue :754-768). Overlaps Issue 10 (open result); the fix touches the same switch.

**Status:** ready-for-agent

**First wave:** yes, picked by the owner on 2026-11-06.

Priority: P1 (writes a property into an unrelated note; rare, needs a button whose actions put `open` or `createNote` before `updateMetadata`)

**What to build:** The button click handler (src/lib/core/markdown-editor/extensions/live-preview/widgets/meta-bind-button-widget.ts:30-37) runs the button's actions in order with the same `view`. `open` awaits `host.openLink` (:90-103, then returns true at :113) and `createNote` returns `host.createNote(...)` (:105-111), so the sequence goes on. Both switch the active tab: `openLink` is `await openFileInEditor(path)` (src/lib/app/editor-host.ts:76-79; `setActiveIndex` at editor.service.ts:116 or `addTab` at :140), and `createNote` goes through `openOrCreateNote` (editor-host.ts:85-98). The editor is one `EditorView` for every tab (src/lib/core/markdown-editor/MarkdownEditor.svelte:131), and its tab-switch effect (:170-237) replaces the doc with the new tab's content (:230-235). The next `updateMetadata` (:85-88) calls `dispatchMetaBindUpdate(view, ...)` (src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:754-768), which reads `view.state.doc` at call time, so it rewrites the frontmatter of the note that was just opened or created. `onDocChanged` -> `onContentChange` (MarkdownEditor.svelte:124, editor.service.ts:228-231) writes that into the new active tab and arms the 500 ms frontmatter autosave. The button's own note never gets the value. Meta Bind resolves a bind target with no file prefix against the note that contains it ("If omitted, it defaults to the containing file", https://www.moritzjung.dev/obsidian-meta-bind-plugin-docs/guides/bindtargets/), so the write target is the button's note.

Fix: pin every `updateMetadata` of one click to the button's note. Capture that note's path when the click starts, before the first `await`. The extensions under `core/markdown-editor/extensions/` do not import `editorStore` (only MarkdownEditor.svelte and EditorTabs.svelte do), so read the path and do the path-keyed write through the editor host: add a member that returns the path of the note the view shows, and one that sets a bind target on a note by path. Implement the second in src/lib/app/editor-host.ts with `updateNoteFrontmatter(path, (props) => setPropertyByBindTarget(props, bindTarget, value))` (src/lib/core/frontmatter/frontmatter-write.service.ts:95-101), which patches an open tab by path, keeps its unsaved body edits and also handles a closed note. When the active note is still the captured one, keep the current `dispatchMetaBindUpdate(view, ...)` path. A refused or failed write still stops the rest of the sequence (`return false`), and a failed write shows the error (`toastFrontmatterWriteError`). Same shared-view class as issue 12; this fix touches only the button widget and the editor host.

**Blocked by:** 103

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build`

**Source:** src/lib/core/markdown-editor/extensions/live-preview/widgets/meta-bind-button-widget.ts:30-37, :82-114, src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:754-768, src/lib/core/markdown-editor/editor-host.ts:33-53, src/lib/app/editor-host.ts:76-98, src/lib/core/markdown-editor/MarkdownEditor.svelte:131, :170-237, src/lib/core/editor/editor.service.ts:98-140, :228-231, src/lib/core/frontmatter/frontmatter-write.service.ts:95-101

- [ ] Failing test comes first. Move `.scratch/editor-data-safety/repro/writes-into-wrong-tab/meta-bind-button-sequence.test.ts` under `src/tests/` (for example `src/tests/lib/core/markdown-editor/extensions/live-preview/meta-bind-button-sequence.test.ts`)
- [ ] A button with `[open [[B]], updateMetadata status=done]` leaves B's content unchanged, both when B is already open and when it is opened fresh
- [ ] The same click sets `status: done` in the button's own note A (assert on A's tab content, or on disk when A is no longer open)
- [ ] A button with `[createNote, updateMetadata]` writes the metadata into the button's note, not the created note
- [ ] A button whose actions do not navigate (only `updateMetadata`) still writes through the view as before (existing meta-bind writer tests stay green)
- [ ] A refused or failed path-keyed write stops the remaining actions and shows an error toast

## Audit evidence (editor-data-safety, 2026-11-02)

Source: editor-data-safety audit, finding F104 (`.scratch/editor-data-safety/audit-2026-11-02.md`; cross-reference in `.scratch/editor-data-safety/xref-file-io-audit.md`: no existing issue covers it, issues 12 and 17 share only the root-cause class). Code re-read at 1351a35d.

## Meta-bind button actions after a navigation or create write into whichever note the shared editor shows

- Verdict: REPRODUCED (priority P1, likelihood rare)

**How a user hits it.** A note A holds a button whose config is `actions: [{type: open, link: [[B]]}, {type: updateMetadata, bindTarget: status, value: done}]`, or `createNote` followed by `updateMetadata`. Clicking it opens B and writes `status: done` into B's frontmatter, overwriting B's own `status`. A keeps its old value. The 500 ms frontmatter autosave writes B to disk.

**Recoverable from.** Cmd+Z in B during the session (the dispatch is a normal history transaction), if the user notices. B's previous value is in File History only if B was saved in-app before.

**Code trace.** meta-bind-button-widget.ts:33-36 loops over `getButtonActions(this.config)` and stops only on a `false` return. `open` (:90-103) awaits `host.openLink` and falls through to `return true` (:113). editor-host.ts:76-79 awaits `openFileInEditor`, which switches the tab synchronously (editor.service.ts:116) or after `readTextFile` (:124, `addTab` at :140). The Svelte flush runs before the `await import('../widgets')` in the `updateMetadata` branch (:86) resolves, so MarkdownEditor.svelte:230-235 has already replaced the shared view's doc with B. widgets.ts:755 reads `view.state.doc.toString()`, which is B, and :767 dispatches the frontmatter change into B. No code pins the button's note.

**Repro test.** `.scratch/editor-data-safety/repro/writes-into-wrong-tab/meta-bind-button-sequence.test.ts` (copy to `src/tests/audit-repro/writes-into-wrong-tab/` to run, see the repro README). Both cases fail on the bug assertion:

```
expected '---\nstatus: done\nowner: bob\n---...' to be '---\nstatus: draft\nowner: bob\n---...'
```

**Fix sketch (audit).** Capture the button note's path when the click starts. Before each `updateMetadata`, if the active path has changed, apply the update to the captured path's tab content by path; otherwise dispatch as now. Or stop the sequence after a navigation. The issue text routes the path-keyed write through the editor host and `updateNoteFrontmatter` because the live-preview extensions do not import the editor store.

## Comments

- 2026-11-06: migrated from `.scratch/file-io-audit/issues/48-meta-bind-button-writes-opened-note.md` by audit 2026-11-05, which re-checked it at `5f8003d67`.
