# 33: Keystrokes typed during link rewrite, calendar delete or type rename writes are lost

**Status:** wontfix

**Blocked by:** none
Priority: P2
Severity: data-loss
Source: file I/O audit, deep-dive group(s) h03-search-links, h05-calendar-b, h06-type-rename, o07-external-change (raw reports in .scratch/file-io-audit/deep/raw/), verified at c4bfee07

## Link rewrite on rename overwrites keystrokes typed in the rewritten open note

- Verdict: CONFIRMED_BY_TEST (deep dive priority P2, severity data-loss)
- Claims covered: calendar-7, rename-move-delete-5

**How a user hits it.** Narrow race. A keystroke must land in the affected open note during its own read (clean tab) or write (dirty tab) IPC, a few ms, while a note it links to is renamed. Triggers: explorer and note-list rename, calendar title edit via event-calendar.service.ts:704/:728, and undo/redo at :1338. Permanent when hit. Upgrade to P1 if rename-while-typing in a linked note is judged common.

**Recoverable from.** No. The typed characters are removed from the tab buffer (updateTabContentByPath) and from the disk write. Whether Cmd+Z restores them was not verified (CodeMirror history after an addToHistory(false) full-doc replace).

**Root cause.** src/lib/core/filesystem/link-updater.service.ts:33-47: snapshot at :35 (or dirty tab content), await readTextFile :35 / writeTextFile :39, then unconditional syncExternalContentToEditor(..., true, 'none') at :47 (editor.service.ts:70-91, no guard; editor.store.svelte.ts:130-136 sets content and savedContent; MarkdownEditor.svelte:323-331 replaces the whole doc with addToHistory(false)).

**Evidence.** Traced: link-updater.service.ts:33-35 snapshot, :39 await write, :47 overwrite of tab content/savedContent with the snapshot-based text. Triggers traced: fs.service.ts:201-212 renameItem -> path-change.service.ts:117-149 applyPathChange -> updateLinksAfterRename. Repro: src/tests/repro/h05-calendar-b/link-rewrite-typing.test.ts, 2 tests, both fail with 'expected link to [[new-name]] to contain typed'.

**Repro test.** `.scratch/file-io-audit/repro/src/tests/repro/h05-calendar-b/link-rewrite-typing.test.ts` fails on the bug assertion at c4bfee07. When fixing, move it under `src/tests/` as the red test.

```
FAIL src/tests/repro/h05-calendar-b/link-rewrite-typing.test.ts > keeps a keystroke typed while the rewrite reads a clean open note: AssertionError: expected 'link to [[new-name]]' to contain 'typed'. FAIL > keeps a keystroke typed while the rewrite writes a dirty open note: same assertion. Tests: 2 failed.
```

**Fix sketch.** After the await, rewrite the live buffer (tab.content at that moment), not the snapshot; or when the tab changed since the snapshot, write the disk copy only and leave the buffer and savedContent alone.

## Calendar delete loses keystrokes typed while its pre-delete save is in flight

- Verdict: CONFIRMED_BY_TEST (deep dive priority P2, severity data-loss)
- Claims covered: calendar-6

**How a user hits it.** Narrow race. Requires a calendar delete of an event whose note is dirty and receives a keystroke during that one save IPC (ms). The window is exactly the writeTextFile await: the continuation after the save is a microtask chain, so no keystroke can land between save resolution and closeTabsForDeletedPath. Permanent when hit. P2 under the owner's ms-race rule.

**Recoverable from.** No. The Trash holds the pre-typing bytes that were saved; the typed text is in no file and no tab after the close.

**Root cause.** src/lib/features/event-calendar/event-calendar.service.ts:1037 (saveFileByPath then delete at :1043) plus src/lib/core/editor/editor.service.ts:165-169 (content captured before writeTextFile; markSavedByPath) and editor.service.ts:356-366 closeTabsForDeletedPath (no dirty check), called from path-change.service.ts:125 before diskOp.

**Evidence.** Traced the claim's chain and confirmed it: editor.service.ts:165 captures tab.content, :168 awaits the write, editor.store.svelte.ts:91-96 markSavedByPath sets savedContent to the captured text, then event-calendar.service.ts:1043 -> fs.service.ts:167-190 deleteItem -> path-change.service.ts:125 closes the tab synchronously. Existing test event-calendar.service.test.ts:1902 covers only the no-typing case. Repro: src/tests/repro/h05-calendar-b/calendar-delete-typing.test.ts simulates a keystroke inside the save write mock.

**Repro test.** `.scratch/file-io-audit/repro/src/tests/repro/h05-calendar-b/calendar-delete-typing.test.ts` fails on the bug assertion at c4bfee07. When fixing, move it under `src/tests/` as the red test.

```
FAIL src/tests/repro/h05-calendar-b/calendar-delete-typing.test.ts > keeps a keystroke typed while the calendar delete saves the note (calendar-6): AssertionError: expected false to be true (diskHolds('typed while saving')). Tests: 1 failed.
```

**Fix sketch.** Immediately before closeTabsForDeletedPath, re-check the tab: if still dirty, save again in the same synchronous block, or abort the delete when content differs from the saved bytes.

## Keystroke typed in the active member tab during the rename's per-tab write is lost

- Verdict: CONFIRMED_BY_TEST (deep dive priority P3, severity data-loss)
- Claims covered: feature-writers-15

**How a user hits it.** The window is one writeTextFile round trip per tab that precedes the active tab (milliseconds). The rename runs from a modal dialog (TypesNavigator.svelte:368), so typing into the editor during it is unlikely. Default settings.

**Recoverable from.** Partly. A few typed characters vanish from the editor and disk. Ctrl+Z may bring them back; not verified (replace uses addToHistory false).

**Root cause.** src/lib/features/type-definitions/type-definitions.service.ts:216-220 (content read before `await writeTextFile`, then syncExternalContentToEditor(..., true, 'none') writes the pre-await text), via editor.service.ts:76-82 and editor.store.svelte.ts:130-136 (updateTabContentByPath sets content and savedContent)

**Evidence.** type-definitions.service.ts:216 reads tab.content, :218 awaits writeTextFile, :220 syncExternalContentToEditor overwrites tab.content and bumps externalContentSignal; keystrokes reach the store via onContentChange -> updateContent (editor.store.svelte.ts:84-88) during the await. Line anchors in the claim (218, 130-136) match the code.

**Repro test.** `.scratch/file-io-audit/repro/src/tests/repro/h06-type-rename/keystroke-during-type-rename-write.test.ts` fails on the bug assertion at c4bfee07. When fixing, move it under `src/tests/` as the red test.

```
FAIL: AssertionError: expected '---\n_type: Initiative\n---\n\nhello' to contain '!'
```

## Keystrokes typed during the link-rewrite write can be overwritten in an open backlink-source tab

- Verdict: PLAUSIBLE (deep dive priority P3, severity corruption)
- Claims covered: 

**How a user hits it.** Needs the affected note to be the active tab and the user to type within the few-millisecond writeTextFile IPC window right after a rename. Low.

**Recoverable from.** CodeMirror undo may restore the text, since the doc replace is a normal transaction. Not verified; the external-replace annotations in MarkdownEditor were not read.

**Root cause.** src/lib/core/filesystem/link-updater.service.ts:33-47: content is captured before the await on writeTextFile (line 39), then syncExternalContentToEditor (editor.service.ts:70-92) sets tab.content to updatedContent and replaces the CodeMirror doc. Keystrokes that arrived during the await went into tab.content via onContentChange (editor.service.ts:224-227) and are overwritten, both in the editor and on disk.

**Evidence.** Code trace only; no test written. Source at link-updater.service.ts:33-47 and editor.service.ts:70-92, 224-227.

**Fix sketch.** Re-read tab.content after the write, or skip the sync and mark the tab dirty when it changed during the await. Or apply the rewrite through the editor transaction path.

## Watcher reload replaces keystrokes or property edits made while its readTextFile is pending

- Verdict: CONFIRMED_BY_TEST (deep dive priority P3, severity data-loss)
- Claims covered: external-change-2, save-pipeline-13

**How a user hits it.** A clean tab whose file just changed externally, with the user typing during the millisecond readTextFile IPC round trip. Rare, and visible: the typed characters vanish on screen. save-pipeline-13's other paths (link-updater and renameType writes, close-handler drain/flush awaits) need typing in the editor during an explorer rename or after Cmd+Q, so they are theoretical.

**Recoverable from.** None. The replace is dispatched with addToHistory false, so undo cannot restore the text. The user sees the loss and can retype it.

**Root cause.** src/lib/core/editor/editor.service.ts:398 (after the await, only diskContent===savedContent is checked, not isTabDirty)

**Evidence.** editor.service.ts:378-382: dirty is checked before the await at :385-387. :396-398: after the await, only savedContent is compared. :401: syncExternalContentToEditor(path, disk, true, 'none') → updateTabContentByPath (editor.store.svelte.ts:130-136) sets content and savedContent. MarkdownEditor.svelte:312-337 replaces the doc with addToHistory false. Keystrokes are synchronous: editor-extensions.ts:170-189 → MarkdownEditor.svelte:124 → editor.service.ts:224-227.

**Limits found while trying to refute.** Not refuted, but downgraded to P3: the window is milliseconds and the loss is visible and small.

**Repro test.** `.scratch/file-io-audit/repro/o07-external-change/reload-race.test.ts` fails on the bug assertion at c4bfee07. When fixing, move it under `src/tests/` as the red test.

```
× external-change-2 / save-pipeline-13 ... AssertionError: expected '# Note\nLine one.\nExternal line.\n' to contain 'abc' at reload-race.test.ts:69 expect(tab.content).toContain('abc')
```

**Fix sketch.** After the await, skip when isTabDirty(tab) or when tab.content changed since eligibility, and route that case to the Bug A conflict handling.

## Comments

- 2026-11-06: migrated to `.scratch/open-itens/issues/089-keystrokes-typed-during-link-rewrite-type-rename.md` by audit 2026-11-05 (its re-checked text and any related audit findings now live there, in one plan ordered by impact on written content and daily use). Closed here as wontfix so it is worked in one place; nothing was implemented.
