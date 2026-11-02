# Verify: feature-writers (adversarial)

Input: `.scratch/file-io-audit/raw/review-feature-writers.md` (F1-F15). Read-only. No cargo, pnpm, vitest or playwright run. No web fetch made: every third-party fact below was read from the in-repo `node_modules/@xyflow/svelte` 1.7.0. The reviewer's FETCHED plugin-fs truncate claim was not re-fetched; no verdict depends on atomicity alone.

READ = read in code. INFER = reasoning, not run.

Known-issue check: grepped `.scratch/architecture-stability/issues/*.md` and `.scratch/suspected-bugs/` for canvas, kanban, deep-link, composer, todoist, pending. Issue 34 covers the dirty-tab save in `switchVault`, not the pending deep-link slot. Issue 67 E2E covers only same-vault deep links. No other match. F14 is the trade-off already recorded in ADR 0010.

## Verdicts

| id | verdict | severity |
|----|---------|----------|
| F1 canvas onDestroy flush into the new tab | CONFIRMED | data-loss (re-graded from corruption) |
| F2 cross-vault pending deep link wiped | CONFIRMED | data-loss |
| F3 silent `new` overwrites existing note | CONFIRMED | data-loss |
| F4 deep-link merge discards unsaved typing | CONFIRMED | data-loss |
| F5 kanban drops unrecognised lines / CRLF / frontmatter | CONFIRMED | data-loss |
| F6 unparseable .canvas replaced on first edit | CONFIRMED | data-loss (low likelihood) |
| F7 composer text cleared when capture is dropped | CONFIRMED | data-loss (low likelihood) |
| F8 root unarchive gives `vault//x.md` | CONFIRMED (string), downstream effects PLAUSIBLE | stale-state |
| F9 deep-link overwrite reaches any vault file | CONFIRMED | security (owner's call) |
| F10 name `.` writes `<vault>.md` outside the vault | CONFIRMED | security (low impact) |
| F11 picker/drop absolute paths double-prefixed | CONFIRMED | minor |
| F12 Todoist sent list overwritten after failed load | CONFIRMED | minor |
| F13 capture dedupe anchor advances before write | CONFIRMED | minor |
| F14 queryjs unsandboxed with fs remove | CONFIRMED, known by design (ADR 0010) | security |
| F15 renameType loses keystrokes | PLAUSIBLE | minor |

## F1 CONFIRMED (data-loss)

Chain, all READ:
- `CanvasInner.svelte:212-226`: the nodes effect sets `pendingPersist = true` on any `nodes` change once `syncing` is false. Only the timer callback (`:223`) resets it. The effect cleanup (`:225`) clears the timer on destroy and leaves the flag set.
- `:230-234` onDestroy -> `persistChanges` -> `persistWithoutHistory` (`:104-109`) -> `onJsonChange`.
- `app/EditorView.svelte:36,80-81`: CanvasView is mounted only while `activeTab.fileType === 'canvas'`. `onJsonChange={onContentChange}`.
- `editor.service.ts:224-227` -> `editor.store.svelte.ts:84-88` `updateContent` writes `tabs[activeIndex]` with no path check.
- `editor.service.ts:213-220` arms the 2 s timer, `:183-194` `saveDirtyTabs` -> `:161-178` `writeTextFile`.
- `MarkdownEditor.svelte:99-108` mounts with `tab.content`, and its tab-switch replace (`:225-236`) suppresses `onContentChange`. Nothing writes the real note text back unless the user types.

Trigger, READ in `node_modules/@xyflow/svelte` 1.7.0:
- `NodeWrapper.svelte:277` `onclick={onSelectNodeHandler}`. `:174-179` calls `handleNodeSelection` when `nodeDragThreshold > 0`. The default is 1 (`store/initial-store.svelte.js:188`).
- `store/index.js:188-197` -> `addSelectedNodes` `:160-172` assigns `store.nodes = store.nodes.map(...)`, a new array, carried by `bind:nodes`.
- `FileNode.svelte:55-57,66`: the header button calls `openFileInEditor(data.file)` first. For a note that is not open yet, it suspends at `await readTextFile` (`editor.service.ts:124`). The bubbling click then selects the node. The microtask flush runs the nodes effect (`pendingPersist = true`). The read resolves (well under 300 ms) -> `addTab` (`:140`) -> branch destroyed -> JSON lands in the new note's tab.

Things that block other variants (my refutation attempts):
- Note already open: `openFileInEditor` calls `setActiveIndex` synchronously (`editor.service.ts:114-116`) before the click bubbles. In the same flush the block teardown runs before the user `$effect`, so the nodes effect never sets the flag (INFER from Svelte effect ordering). That case is safe unless a flag is already pending.
- `data.file` must be absolute for the open to succeed. Picker-added and dropped nodes are absolute (F11), so the in-app path works. A relative Obsidian-style path makes `readTextFile(relative)` fail the fs scope check (INFER, not verified), so no tab opens.
- Ctrl+Tab or closing the canvas tab within 300 ms of open (xyflow `updateNodeInternals`, `store/index.js:39-75`, also assigns a new array) or of a selection: same flush. That variant is timing-dependent (PLAUSIBLE).

Side observation (INFER, not filed): the post-mount measurement pass also arms a persist on the canvas tab itself. A canvas whose re-serialized JSON differs (formatting, measured sizes) is rewritten just by opening it.

Repro: add a note to a canvas with the toolbar file picker. Close that note's tab. Reopen the canvas, click the file node's header once (node not selected). Wait 3 s and check the note on disk: it holds the canvas JSON.
Test idea: mount CanvasInner with one file node and an `onJsonChange` spy wired to the real `onContentChange` and editorStore. Fire a node-selection change, then `editorStore.addTab(note)` and unmount. Assert that the note tab's content is unchanged.
Fix hint: capture the canvas tab path at mount and flush with a path-scoped write (`updateTabContentOnly(path, json)`), never through `updateContent`.

## F2 CONFIRMED (data-loss)

READ: `deep-link.service.ts:165-166` set pending, then `switchVault`. `vault.service.ts:18-22` saves and calls `vaultStore.open`. `(app)/+layout.svelte` effect -> `initializeVault`. `app-lifecycle.service.ts:172-188`: `unsubscribeFileChange` is set at `:494` for any initialized vault, so `teardownVault()` runs. `:641` `resetDeepLink()` -> `deep-link.service.ts:344-346` -> `deep-link.store.svelte.ts:33-35` sets `pendingAction = null`. Step 8 (`:503`) -> `executePendingAction` (`deep-link.service.ts:329-331`) gets null and returns with no toast. Nothing in `initializeVault` entry (`:133-170`) snapshots the slot. Tests set the slot and call `executePendingAction` directly. No lifecycle test covers it, and Issue 34/67 do not either.
Repro: open vault A, fire `kokobrain://new?vault=B&name=Inbox&content=x&silent=true`. B opens and Inbox.md is never written.
Fix hint: drop `resetDeepLink()` from `teardownVault`, or read the action before teardown and restore it after.

## F3 CONFIRMED (data-loss)

READ: `deep-link.service.ts:308-315` silent create does `mkdir` + `writeTextFile` with no `exists`. The non-silent branch uses `openOrCreateNote` (`:316-321`). `resolveContent` returns `''` when nothing is given (`:214-224`). `deep-link.types.ts:29,35`: `silent` means "do not open", and only `overwrite` replaces. The test at `deep-link.service.test.ts:287-304` covers only a missing file.
Repro: `kokobrain://new?vault=V&name=Existing&silent=true` truncates Existing.md to 0 bytes.
Fix hint: check `exists` in the silent branch and skip (or uniquify) like `openOrCreateNote`.

## F4 CONFIRMED (data-loss)

READ: merges read from disk (`deep-link.service.ts:257,276`, `app/deep-link-actions.ts:54`), then `syncExternalContentToEditor(path, merged, true, 'none')` (`:262,281,298`, `deep-link-actions.ts:63`) -> `editor.service.ts:78-79` -> `editor.store.svelte.ts:130-136` replaces `content` and `savedContent`, and `:87-88` bumps the CodeMirror signal. A dirty tab's unsaved text is replaced and marked clean. The race-audit test fixed only the opposite direction.
Repro: type in the daily note, and within 2 s fire `kokobrain://daily?vault=V&append=true&content=x`. The typed text is gone.
Fix hint: when the target tab is dirty, merge into `tab.content` (or `saveFileByPath` first), then write.

## F5 CONFIRMED (data-loss)

READ: `kanban.logic.ts:4-6`. `HEADING_RE` and `TASK_RE` end with `(.+)$` / `(.*)$` and have no `m` flag. `.` does not match `\r`, so CRLF lines never match, while `---\r` still matches `\s*$`. `:67-109` keeps only headings, tasks and the first `---`. A leading frontmatter `---` enters archive mode (`:69-72`), headings are skipped in archive (`:78-82`), and tasks go to archive. `serializeKanbanBoard` `:118-145` writes only those. `KanbanView.svelte:79-90` `applyChange` -> `onContentChange` -> autosave. Open writes nothing (`:69-76`). EditorView offers a source mode for kanban (`EditorView.svelte:88-100`), so the unrecognised lines can be typed in-app.
Repro: in source mode add a paragraph under a lane, switch back, toggle a card. After 2 s the paragraph is gone from disk.
Fix hint: keep unrecognised lines as opaque per-lane/preamble text and round-trip them; strip `\r` before matching.

## F6 CONFIRMED (data-loss, low likelihood)

READ: `canvas.logic.ts:36-49` returns an empty canvas on any parse error with no signal. `CanvasInner.svelte:71`. Add actions (`:450-456`, `:464-470`, drop `:541-566`) -> `persistChanges` -> `flowToCanvas(..., canvasData)` (`canvas.logic.ts:290-318`) serializes only the flow nodes. Open writes nothing: the first nodes-effect run is consumed by `skipInitialWatch` (`:213-216`).
Repro: write `{"nodes":[...],}` (trailing comma) to a .canvas, open it, click "+ Add card". The file now holds one node.
Fix hint: return a parse error and render read-only with a banner (source mode still available) instead of an empty editable canvas.

## F7 CONFIRMED (data-loss, low likelihood)

READ: `routes/composer/+page.svelte:27-50`. Success or a caught error both reach `dismiss()`. `resetForShow` (`:52-58`, run on `qc:open-composer`) clears `text`. `quick_capture/commands.rs:349-365` only emits, with no ack. `quick-capture.service.ts:85-91` drops with a main-window toast when no vault is open. `deep-link.service.ts:203-206` toasts on a write error. The composer shortcut is global (`src-tauri/src/lib.rs:47-51`).
Repro: close all vaults, press the composer shortcut, type, Cmd+Enter. "Saved" flashes and no note exists. Reopening the composer shows it empty.
Fix hint: have the main window ack (or reply with a result event) and keep the text unless the write succeeded.

## F8 CONFIRMED string / PLAUSIBLE downstream (stale-state)

READ: `type-lifecycle-rules.ts:36,48-55` adds the `{parent}` unarchive rule for `{folder}/<seg>`. `auto-move.logic.ts:107-115,128-129`: for `vault/_archive/x.md`, `relFolder='_archive'`, `parent=''`, resolves to `''`. `isAlreadyInDestination` (`:69-81`) compares `'_archive'` with `''`, so it is false. `auto-move.service.ts:173` `destPath = vault + '/'`. `fs.service.ts:229-230` `newPath = vault//x.md`. `path-change.service.ts:132,159` passes it unchanged. Rust `rename_note_inner` (`commands/vault.rs:1001-1033`) keys by the exact string. Ghost duplicate, resurrected note and double index entry are INFER (watcher self-path handling not traced).
Repro: a type with `archiveTo: "{folder}/_archive"`. Archive a root-level member, then set `_archived: false`. The tab path shows `vault//x.md`.
Fix hint: in `auto-move.service.ts` build `destPath` as `resolvedDest ? `${vault}/${resolvedDest}` : vault`.

## F9 CONFIRMED (security, owner's call)

READ: `deep-link.service.ts:292-306` writes unconditionally. `utils/path.ts:46-52` keeps any last segment that has a dot. The capability allows text writes to `**/.kokobrain/**` (`src-tauri/capabilities/default.json:83-98`). No confirmation in `handleDeepLinkUrl` / `resolveAndDispatch` (`:118-169`). F3's silent branch has the same reach without `overwrite`.
Repro: `kokobrain://new?vault=V&name=.kokobrain/todoist-sent.json&overwrite=true&content=[]`.
Fix hint: restrict deep-link writes to `.md` outside dot-folders and confirm `overwrite` of an existing file.

## F10 CONFIRMED (security, low impact)

READ: `utils/path.ts:39-44` accepts `normalized === base`, then `:47-50` appends `.md` to the vault folder name. `deep-link.logic.ts:82-86` accepts `name=.` (truthy). The write scope `$HOME/kokobrain-vaults/**` (`default.json:92`) matches the sibling. The silent (`:309-315`) and overwrite (`:292-296`) branches write it. The non-silent branch goes to Rust `create_note`, which has its own guard (reviewer-cited, not re-read).
Repro: `kokobrain://new?vault=Work&name=.&silent=true` creates `kokobrain-vaults/Work.md`.
Fix hint: reject `normalized === base` in `resolveFilePath` for file targets.

## F11 CONFIRMED (minor)

READ: `CanvasFilePicker.svelte:21,61` passes `file.path` from `flattenFileTree` (`file-entries.logic.ts:21`, an absolute `FileTreeNode.path`). Drops carry absolute paths (`FilesNavigator.svelte:223`, `NoteRow.svelte:69`). `FileNode.svelte:40` and `canvas-image.service.ts:33-34` prefix the vault again.
Fix hint: store vault-relative paths in the canvas (Obsidian format), or skip the prefix when the path is already absolute.

## F12 CONFIRMED (minor)

READ: `todoist.service.ts:103-118` returns `[]` on any error. `initTodoist` stores it. `sendTaskToTodoist` saves the store list (`saveSentTasks` `:124-131`). `syncTodoistTasks` returns early on an empty list, so only a send rewrites. The precondition (an unreadable file) is an external condition, but the overwrite after it is deterministic.
Fix hint: on a parse error, do not save over the file (back it up first, or block saves until a load succeeds).

## F13 CONFIRMED (minor)

READ: `quick_capture/commands.rs:79-95` advances `*last_signature` while building the batch, before any frontend ack. The state is app-lifetime (`lib.rs:292`) and never reset. The frontend may drop the batch (`quick-capture.service.ts:85-91`). No content is lost: the clipboard still holds it.
Fix hint: advance the anchor only after the frontend confirms the write, or clear it on a drop.

## F14 CONFIRMED, known by design

READ: `kb-api.ts:360` `new Function` in the main webview. `tauri.conf.json:29` has `'unsafe-eval'`. `default.json:138,155` grant `fs:allow-remove` / `fs:allow-rename`. Default `autoRunQueries: 'first-open'` (`settings.store.svelte.ts:136`). ADR 0010 (`docs/adr/0010-queryjs-kb-api-caching.md:57`) rejected a Worker sandbox. Not new; the owner should know its reach for vaults from others.

## F15 PLAUSIBLE (minor)

READ: `type-definitions.service.ts:214-225` reads `tab.content`, awaits `writeTextFile`, then `syncExternalContentToEditor(..., true, 'none')` replaces the content (`editor.store.svelte.ts:130-136`). Only keystrokes typed into that tab during its own write are lost, a window of milliseconds. The rename is started from a dialog, so focus is usually not in the editor (INFER). Real but very unlikely.
Fix hint: re-read `tab.content` after the await and re-apply the rewrite to it, or mark saved only if the content is unchanged.

## Not verified

- No runtime repro. F1's order (Svelte block teardown before user effects in one flush) is INFER from Svelte 5 semantics, not observed.
- The plugin-fs scope behaviour for relative paths and `..` was not fetched.
- F8's watcher-side duplicate entry was not traced.
