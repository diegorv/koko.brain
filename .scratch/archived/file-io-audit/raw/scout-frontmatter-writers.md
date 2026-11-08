# Scout: frontmatter writers (read-only map)

Repo: /Users/diegorv/Dev/pet-projects/koko/brain (branch main). Read-only audit, no repo files changed, no build or test run.

Method: read the slice files, grepped callers, read Rust `utils/fs.rs` and `parsing.rs`, read the ADR-0029 text and the `.scratch/architecture-stability/issues` files. Third-party behavior was checked by WebFetch of the official GitHub sources (listed in section 6).

Labels: READ = seen in code at the cited line. INFER = my reasoning from read code. FETCHED = from the official source via WebFetch.

---

## 0. Answer to the core question

- Open note (tab exists): `updateNoteFrontmatter` (frontmatter-write.service.ts:127-136) does NOT write disk first. It patches the editor buffer, `base = tab.content` (line 115), so unsaved body edits are kept, then saves the whole buffer at once with `saveFileByPath`. The Properties panel (properties.service.ts:95) and meta-bind (widgets.ts:767) also write only the editor buffer; disk is written later by the autosave timers (editor.service.ts:197-200).
- Closed note (no tab): straight to disk, read-modify-write (frontmatter-write.service.ts:117, 149). No buffer exists, so there is no conflict with the editor. The only conflicts are a tab that opens during the window (re-handled at lines 139-144) and external edits (not detected).
- Which edit wins: the last write to the buffer or disk. The buffer is authoritative for open notes. For a dirty open tab, a frontmatter write from the sidebar or the icon picker also saves the user's pending body edits to disk immediately (documented at frontmatter-write.service.ts:84-86). That is a side effect the user did not ask for.

---

## 1. Entry points and call chains

### 1a. updateNoteFrontmatter (the one owner of "rewrite frontmatter by path")
- Definition: frontmatter-write.service.ts:95-101 (captures `vaultStore.path`, calls `attempt`).
- `attempt`: lines 107-159.
  - 112-119: tab lookup; if no tab, `readTextFile(path)` (117) then `assertVault` (118).
  - 121-122: `detectLossyFrontmatter(base)` refuses (throws FrontmatterWriteError) on comments, nested, duplicate-keys, alias-collision, anchors, unparseable.
  - 124: `next = rebuildContent(mutate(parseFrontmatterProperties(base)), extractBody(base))`.
  - 125: `next === base` returns base (no write).
  - Tab branch 127-137: `syncExternalContentToEditor(path, next, false, 'none')` (128) -> `saveFileByPath` (129) -> `assertVault` (130) -> on failure restore base only if the tab still shows `next` (133) and throw `save-failed` (134).
  - Closed branch 139-158: `exists` (139), `assertVault` (140), `missing` (141), `findTab` re-check and recursion (144), `writeTextFile(path, next, { create: false })` (149), catch re-checks `exists` and maps to `missing` (150-152), `assertVault` (154), `syncExternalContentToEditor(path, next, true, 'none')` (156, no-op without a tab), `notifyAfterSave(path, next)` (157).
- Callers (rg):
  - lifecycle.service.ts:34 `updateActiveNote` (active tab, used by keybinding global-keybindings.ts:195 and commands.ts:233 for favorite, organized, archived).
  - lifecycle.service.ts:50 `toggleFavoriteForPath` (called by NoteRowMenu.svelte:22 import).
  - frontmatter-icon.service.ts:36 `writeIconFrontmatter`, used by `setFrontmatterIcon` (:50) and `removeFrontmatterIcon` (:73). Called from file-icons.service.ts:124, :134, :151, :161, which are reached from NoteRowMenu.svelte:139/145, FilesNavigator.svelte:193/199, TypesNavigator.svelte:136/146.
  - bookmark-migration.service.ts:80, called from app-lifecycle.service.ts:286 (surrounding block not read).
  - event-calendar.service.ts:753 (behind a per-path queue, see section 3).

### 1b. Properties panel (no `updateNoteFrontmatter`, writes the buffer)
- PropertiesView.svelte handlers (:121 handleUpdate, :125 handleRename, :129 handleRemove, :133 handleAddProperty, :66 and :77 relationship add/remove) call properties.service.ts:110 `updateProperty`, :122 `upsertProperty`, :145 `renameProperty`, :161 `removePropertyByKey`, :170 `addNewProperty`.
- All go through `commitChanges` (properties.service.ts:78-98):
  - 79 `propertiesMatchActiveNote()` (64-69) checks only that `propertiesStore.sourcePath === activeTabPath`. It does not check that the store is fresh.
  - 82-85 `isFrontmatterUnparseable(content)` refuses only unparseable YAML. No `detectLossyFrontmatter` call.
  - 86 `propertiesStore.setProperties(updated, activePath)`.
  - 87-88 `rebuildContent(updated, extractBody(content))`. The frontmatter comes from the STORE, the body from the live tab content.
  - 95 `syncExternalContentToEditor(activePath, newContent, false, 'frontmatter')` (editor.service.ts:70-91): `updateTabContentOnly` (store :139-144), `bumpExternalContentSignal` (editor.service.ts:87-88), `scheduleAutoSave('frontmatter')` (editor.service.ts:90 -> 500 ms timer, :213-216).
- Store refresh: PropertiesView.svelte:100-114. Each content change clears and re-arms a 300 ms timer, which calls `parseAndSetProperties` unless `consumeSkipNextParse` (properties.service.ts:33-37) fires.
- Autosave: editor.service.ts:183-194 `saveDirtyTabs` -> `saveFileByPath` (:161-178).

### 1c. Meta-bind writers (CodeMirror widgets, write the buffer)
- Select: widgets.ts:704-710 (change) -> `dispatchMetaBindUpdate`; a refused write resets the select (:706-708).
- Toggle: widgets.ts:862-866 writes `'true'` or `'false'` as strings (:863).
- Number and date input: widgets.ts:931-938 `commit` on blur or Enter -> `dispatchMetaBindUpdate` (:934); the unchanged guard is `input.value === shown` (:932).
- Button `updateMetadata`: meta-bind-button-widget.ts:82-88 (dynamic import of widgets) -> `dispatchMetaBindUpdate`.
- `dispatchMetaBindUpdate` (widgets.ts:754-769):
  - 755-760: `view.state.doc.toString()`; `isFrontmatterUnparseable(doc)` refuses with a toast (Issue 42). No `detectLossyFrontmatter`.
  - 761-764: `parseFrontmatterProperties(doc)`, `extractBody(doc)`, `setPropertyByBindTarget(properties, bindTarget, newValue)` (properties.logic.ts:597-609), `rebuildContent`.
  - 765-767: computes the frontmatter prefix length and `view.dispatch({ changes: { from: 0, to: frontmatterEnd, insert: newFrontmatter } })`. This is the only disk-adjacent step; it is a buffer edit.
- The buffer edit reaches the store through editor-extensions.ts:179-188 (`update.docChanged && !isTabSwitching && !isExternalEdit` -> `onDocChanged`). `fmChanged` is true when the change starts inside the frontmatter, so the 500 ms timer is used. MarkdownEditor.svelte:124 -> `onContentChange` (editor.service.ts:224-227) -> store `updateContent` (editor.store.svelte.ts:84-88) -> `scheduleAutoSave`.

### 1d. file-icons.service.ts (non-frontmatter writers in the same file)
- `saveRecentIcons` writes `.kokobrain/recent-icons.json` with plain `writeTextFile` (file-icons.service.ts:59-69; write at :65, error swallowed and logged at :66-68). `loadRecentIcons` (:42-57) resets to `[]` on parse error, so the next `trackRecentIcon` (:71-76) overwrites the corrupt file.
- `ensureFolderNote` (:93-105): `exists(notePath)` (:95), then `writeTextFile(notePath, '---\n---\n')` (:98) with the default `create`. No `create: false`, no re-check. `applyNoteChange` is fired with `void` (:102).
- `setIconForPath` (:113-140) and `removeIconForPath` (:148-167): dispatch to frontmatter-icon.service.ts. For a folder, `ensureFolderNote` runs first, so a refused write leaves the placeholder behind.
- `buildFrontmatterIconIndex` (:175-205), `updateFrontmatterIconForFile` (:211-245), `removeFrontmatterIconForFile` (:252-265) are index-only (no disk).

### 1e. frontmatter-icon.service.ts
- `writeIconFrontmatter` (:31-43) wraps `updateNoteFrontmatter` and toasts `FrontmatterWriteError`, rethrows anything else.
- `setFrontmatterIcon` (:50-65): `upsertProperty` for `_icon`, and `_color` / `_title_color` set or removed.
- `removeFrontmatterIcon` (:73-79): pre-read `tab.content` or `readTextFile(filePath)` (:74-75) OUTSIDE the write, so a pre-read that is stale only matters for the "no icon keys" early return (:76). A missing file throws a raw error (not a FrontmatterWriteError), and it propagates.

### 1f. lifecycle.logic.ts (the flag semantics the writers feed)
- `getLifecycleState` (:7-13), `isFavorite` (:16-19), `isOrganized` (:22-24) compare with `=== true` (READ).
- `setBooleanFlag` (:30-40) writes a JS boolean with `type: 'boolean'`.

### 1g. Bookmark migration
- `migrateBookmarksToFavorites` (bookmark-migration.service.ts:49-115).
  - 53-59 `exists` + `readTextFile` + `bookmarksFrom` (22-34). Invalid JSON or a non-array returns `[]` (:25-29, :30).
  - 31-33: entries whose `path` is not a string are filtered out silently.
  - 64-90 sequential loop over `updateNoteFrontmatter` (80) with `toggleFavorite(props, true)`.
  - 93-99: if any failed, a toast and the file is kept.
  - 101-102: `remove(filePath)` (the bookmarks file) runs when nothing failed. For invalid JSON the loop does nothing, so `failed` and `dropped` are both empty and the file is deleted with no toast.

### 1h. Event calendar (caller only, not traced in depth)
- event-calendar.service.ts:753 `updateNoteFrontmatter(target, ...)`, with its own overlay and error mapping (:757-772). It serializes per path with its own queue (:351-470).

### 1i. Helpers that are pure string transforms
- `ensureFrontmatterLink` (properties.logic.ts:526-555) is pure. Callers: one-on-one.service.ts:94 (`buildContent`) and note-action-bar.service.ts:95 (`createFile`). I did not trace these to a disk write. It throws `Error` (not FrontmatterWriteError) at :536 and :546.

---

## 2. Every disk write, delete, rename in the slice

| # | Where | Call | Atomic? | Preconditions | Error handling | State on success | State on failure |
|---|---|---|---|---|---|---|---|
| W1 | frontmatter-write.service.ts:149 (closed note) | `writeTextFile(path, next, { create: false })` | No, in place (FETCHED, see 6) | `exists` at :139, tab re-check at :144, `assertVault` :140 and :154 | :150-153: if the file is gone, `missing`; otherwise the raw error rethrows | `syncExternalContentToEditor(..., true)` (:156), `notifyAfterSave` (:157), index updated | Raw error to caller (not FrontmatterWriteError). File may already be truncated (INFER, see lead L5) |
| W2 | editor.service.ts:168 (`saveFileByPath`, used by the tab branch :129, autosave, close, vault switch) | `writeTextFile(path, content)` (no `create` flag, so default true) | No | Tab exists, tab not virtual, tab dirty (:163) | :173-176: `error` + `toast.error`, returns false | `markSavedByPath(path, content)` with the content captured BEFORE the await (:165, :169), `notifyAfterSave` (:170) | Returns false; tab stays dirty; retry every 5 s by `saveDirtyTabs` (:191-193) |
| W3 | file-icons.service.ts:98 (`ensureFolderNote`) | `writeTextFile(notePath, placeholder)` | No | `exists` false at :95 (no re-check, default create true) | none; propagates to `setIconForPath` | `applyNoteChange` (:102, void) | Throws (not caught in the function) |
| W4 | file-icons.service.ts:65 (`saveRecentIcons`) | `writeTextFile(recent-icons.json)` | No | `ensureDir` (:63) | :66-68 logged, swallowed | none | Logged only |
| W5 | bookmark-migration.service.ts:102 | `remove(filePath)` (bookmarks file) | n/a | Only when `failed` is empty (:93-99) | :103-106 logged + toast | Toast about dropped names (:110-114) | Toast, file kept |
| W6 | editor store / buffer (properties.service.ts:95, widgets.ts:767, frontmatter-write.service.ts:128 and :156) | `syncExternalContentToEditor` and `view.dispatch` | Not disk | n/a | n/a | Dirty tab, autosave timer armed (500 ms frontmatter / 2000 ms body, editor.service.ts:197-200, :213-221) | n/a |
| W7 | Rust, for reference | `vault_fs::write_atomic` (src-tauri/src/utils/fs.rs:16-32, temp file plus rename, no fsync) | Yes | Read-only check (:20-24) | Error string | n/a | n/a |

Rust `write_atomic` is used by `propagate_type_rename` (commands/vault.rs ~:370), toggle-task (~:683) and `create_note` (~:899). No frontend note writer in this slice uses it (READ: all TS writers use `@tauri-apps/plugin-fs`).

No deletes or renames of note files in this slice. `remove` appears only for the bookmarks file (W5). Renames are out of scope (path-change.service).

Capability check: `fs:allow-write-text-file` is in src-tauri/capabilities/default.json:83 (READ). I did not read the path scope.

---

## 3. Concurrency

- `updateNoteFrontmatter` has no queue. Each call is an independent async function. Concurrent calls on one CLOSED note race: both read the same `base`, the last write wins. The docstring says so (frontmatter-write.service.ts:91-93: "callers must serialize writes per path").
- Who serializes:
  - event-calendar: per-path queue (event-calendar.service.ts:351-470, READ at signature level).
  - bookmark migration: sequential `for` loop (bookmark-migration.service.ts:63-64), but it runs at vault open alongside user actions.
  - NOT serialized: `toggleFavoriteForPath` (lifecycle.service.ts:46-55), `setFrontmatterIcon` / `removeFrontmatterIcon` (frontmatter-icon.service.ts:50-79), and each of them against the calendar and the migration.
- Open tab writes are serialized by the store: `updateNoteFrontmatter` writes the new content to the store synchronously (`syncExternalContentToEditor`, frontmatter-write.service.ts:128) before its `await`, so a second call in the window reads the new base (INFER, consistent with the design).
- Timers:
  - `debouncedSave` 2000 ms and `debouncedSaveFrontmatter` 500 ms (editor.service.ts:197-200), mutually exclusive via `scheduleAutoSave` (:213-221). `'none'` cancels nothing (:211-212).
  - `saveAllDirtyTabs` cancels both timers (:235-236) and awaits all saves (:240-245). Used before vault switch (Issue 34).
  - Failed autosave retries every 5 s without a limit (:191-193).
  - PropertiesView 300 ms re-parse timer (PropertiesView.svelte:105-112) with the one-shot skip flag `skipNextParseFor` (properties.service.ts:24, 33-37). The flag is consumed by whichever timer fires first, so a body keystroke that cancels the commit's timer can leave the flag armed for the next parse (INFER, low).
- Watcher interplay: `notifyAfterSave` marks the path as a recent self-save for 15 s (editor.hooks.ts:24-44, 67-68). Watcher-driven reloads of clean tabs are therefore skipped for these writes (INFER: the watcher skips self-saves per the comment at editor.hooks.ts:15-18).
- Tab open during a closed write: `attempt` re-checks the tab before the write (frontmatter-write.service.ts:144) and syncs after it (:156). `openFileInEditor` (editor.service.ts:98-148) re-checks only for an existing tab after its read (:131-135), not whether the bytes it read are stale (lead L7).

---

## 4. Leads (ranked; confidence in brackets)

L1. Meta-bind toggle and lifecycle keys turn booleans into quoted strings [HIGH on the write, MEDIUM on user impact]
- READ: widgets.ts:862-866 writes `'true'` / `'false'`. setPropertyByBindTarget keeps the value as a string (properties.logic.ts:597-609). ADR-0029 :35 and properties.logic.test.ts:670-676 say a string `"true"` is emitted quoted.
- READ: meta-bind-writers.test.ts:110-118 PINS `done: "true"` as the expected output of a toggle on a note whose property is bare `false`.
- READ: Rust `project_value` returns a String for any non-plain scalar (parsing.rs:805-812) and `extract_bool_flag` uses `as_bool().unwrap_or(false)` (entry.rs:373-378); `_organized` defaults to true when `as_bool()` fails (entry.rs:247-251). TS: `getLifecycleState` / `isFavorite` / `isOrganized` use `=== true` (lifecycle.logic.ts:9, :17, :23).
- Scenario: a note has `_organized: false` (bare). The user adds `INPUT[toggle():_organized]` and unchecks it. The note becomes `_organized: "false"`. Rust indexes `_organized` as the string, so `unwrap_or(true)` makes the note "organized" in the index. The same happens for `_archived` / `_favorite` (both default to false, so they become "not archived" / "not favorite"). For any other bare boolean (`done: false`), Obsidian-style consumers see a string.
- Note: Issue 44 is about a different number/date problem, and no issue covers this type change.

L2. Meta-bind number input turns a number into a quoted string [HIGH on the write]
- READ: widgets.ts:791-794 validates, widgets.ts:934 writes `input.value` (always a string). meta-bind-writers.test.ts:97-99 PINS `count: "7"` from a native `count: 5`.
- Scenario: `count: 5` (bare number) edited through `INPUT[number():count]` becomes `count: "7"`. The Properties panel shows a text property. Rust `parse_scalar` never sees a number (parsing.rs:942-960). Numeric sort or filter on `count` breaks.
- Same mechanism for a bare `value: 3.5` (yaml core number) going through the select writer.

L3. Panel and meta-bind writers drop comments, nested mappings, anchors, duplicate keys and alias collisions, while updateNoteFrontmatter refuses them [documented decision, flagged; HIGH on the code]
- READ: panel `commitChanges` and `dispatchMetaBindUpdate` only check `isFrontmatterUnparseable` (properties.service.ts:82; widgets.ts:756). `detectLossyFrontmatter` (properties.logic.ts:412-468) is called only from frontmatter-write.service.ts:121, properties.logic.ts:535, event-calendar, and auto-move.service.ts:201.
- Consequences on rewrite: comments dropped (ADR-0029 :74, :102); nested mapping values dropped with only a session-log line (properties.logic.ts:290-300; ADR-0029 :84-86); anchors and aliases expanded to plain values (toJS at :246-250); a duplicate key keeps the last value (detectLossy :458 flags it, the parse does not); alias collision keeps the first populated value and logs the other (properties.logic.ts:502-506).
- ADR-0029 Amendment 2026-10-28 (line 103) states this is intended for the panel and meta-bind ("Every other writer ... keeps the drop behaviour"). Issue 42 (Fix text) offered `detectLossyFrontmatter` as an option and chose unparseable only. Issue 41 asked the "wider guard" question and only answered it for unparseable.
- Scenario: a note has `title: x  # reviewed` and `meta:` with a nested map. The user ticks a box in the Properties panel. Within 500 ms the file has lost the comment and `meta`. The same note, favorited from the sidebar, gets a refusal toast instead. The owner's first concern is content loss, so this inconsistency is the main item to decide on.

L4. Every rewrite changes numeric scalars [HIGH for hex and exponent, MEDIUM-HIGH for trailing zeros]
- READ: convertToProperty stores a plain JS number for any yaml number (properties.logic.ts:188-190). toJS produces plain numbers (:246-250). serializeProperties does `doc.set(key, p.value)` with the number (:580).
- FETCHED (yaml v2.9.1 stringifyNumber.ts): the output comes from `JSON.stringify(value)` on the JS value, with zero padding only when `minFractionDigits` is set. The TS path has no node, so the source spelling is gone before stringify.
- Consequences: `h: 0x1F` becomes `h: 31`; `v: 1e3` becomes `v: 1000`; `version: 1.10` becomes `version: 1.1` (INFER, the same mechanism). The fixture at src/tests/fixtures/frontmatter-parity.fixture.json:1232 contains `h: 0x1F` as a number case.
- Affects every writer (lifecycle, icons, panel, meta-bind, calendar, bookmark). Not covered by detectLossyFrontmatter and not listed in ADR-0029 (its table at :36 covers quoting only).
- Scenario: a note with `version: 1.10`, favorited from the sidebar, is saved as `version: 1.1`. Any sidebar favorite or icon change rewrites it.

L5. Non-atomic in-place writes can truncate a note [MEDIUM; the mechanism is FETCHED, the crash outcome is INFER]
- FETCHED (plugins-workspace fs commands, `write_text_file` -> `write_file_inner`): options default to `truncate: true`, `create: true`; the data goes straight into the opened handle with `write_all`; no temp file or rename.
- Applies to W1 (frontmatter-write.service.ts:149), W2 (editor.service.ts:168, which is also the normal save for every note), W3 and W4.
- In W1 the catch (:150-152) rethrows the raw OS error when the file still exists, so the lifecycle and icon callers (lifecycle.service.ts:36, frontmatter-icon.service.ts:39) rethrow it as an uncaught error (not a toast). The Rust `write_atomic` (utils/fs.rs:16-32) exists and is not used for note saves.
- Scenario: ENOSPC, EIO, a kill or a power loss during the write of a closed note (favorite toggle from the sidebar) leaves the note empty or cut short, with no backup.

L6. Lost update between writers on a closed note [LOW probability, HIGH on the code]
- Read-modify-write without a per-path lock across lifecycle.service.ts:46-55, frontmatter-icon.service.ts:50-79, bookmark-migration.service.ts:63-90, and event-calendar. Window is one `readTextFile` to `writeTextFile` round trip. External edits in the same window are also overwritten (no mtime check).
- Scenario: the user toggles favorite on note X from the row menu and, just after, sets its icon from the same menu. If the two IPC round trips overlap, the second write uses the base from before the first and drops `_favorite`.

L7. Stale tab from a read that started before a closed-note write [LOW, INFER]
- A tab opened by `openFileInEditor` (editor.service.ts:98-148) that began its `readTextFile` before W1's write, and whose `addTab` lands after `syncExternalContentToEditor(..., true)` (frontmatter-write.service.ts:156), holds the pre-write bytes as `content` and `savedContent`, and is clean. The watcher skips self-saves (editor.hooks.ts:24-44), so it is not reloaded. Any later panel commit (store built from this stale tab, properties.service.ts:86-88) or body save writes the old frontmatter back, undoing the write.
- Needs the open and the write to overlap within the read's round trip.

L8. Panel commit can revert frontmatter keystrokes typed in the last 300 ms [MEDIUM-LOW, timing-dependent]
- READ: `commitChanges` rebuilds the frontmatter from `propertiesStore.properties` (properties.service.ts:86-88). The store lags the buffer by the 300 ms re-parse (PropertiesView.svelte:105-112). `propertiesMatchActiveNote` checks only the path (properties.service.ts:64-69).
- Scenario: the user types `status: done` in the frontmatter in CodeMirror, then within about 300 ms clicks a Properties checkbox. The commit writes the store's frontmatter (without `status: done`) with the current body. The typed value is lost from the buffer, and the autosave saves the loss.

L9. Corrupt or non-list bookmarks file is deleted silently [LOW, HIGH on the code]
- bookmark-migration.service.ts:22-34 turns invalid JSON or a non-array into `[]`; the loop then does nothing (:64); `remove(filePath)` runs at :102 because `failed` is empty. The only toast in that path is the `dropped` one, and it is empty here. Filtered entries (non-string `path`, :31-33) vanish the same way.
- The file is the only copy of the legacy bookmark list. This is metadata, not note content, and the comment at :27 documents the intent ("deleting it with no bookmarks moved").

L10. Folder-note placeholder can overwrite a note created in the gap [LOW]
- file-icons.service.ts:95-98: `exists` then `writeTextFile` with default `create`, no re-check. A `Folder/Folder.md` created between the two calls is overwritten with `---\n---\n`. If `exists` returns false on a stat error (INFER from Tauri's implementation, not fetched), an unreadable existing note is also overwritten.

L11. Frontmatter rewrite flushes unsaved body edits of an open dirty tab [INFO, by design]
- frontmatter-write.service.ts:115 uses `tab.content`, and :128-129 saves the whole buffer at once. Documented at :84-86 ("also flushes a pending body edit before autosave would"). Mentioned because it is a disk write the user did not ask for at that moment (owner concern 2).

L12. CRLF and fence edge cases in the frontmatter regex [LOW]
- Any rewrite emits LF in the frontmatter (properties.logic.ts:621; ADR-0029 :78 says LF only), while the body keeps CRLF, so a CRLF note ends up with mixed endings. Documented, low.
- FRONTMATTER_REGEX (properties.logic.ts:37) closes on the first `\n---`. A closing fence of `----` or `--- ` (trailing space) is split: `extractBody` (:53-57) keeps `-` or ` ` as the first body character. A later rewrite inserts a newline or a space (INFER from the regex, not run).

---

## 5. Known or filed issues cross-check

- Issue 34 (`.scratch/architecture-stability/issues/34-save-dirty-tabs-before-vault-switch.md`): known, covers `saveAllDirtyTabs` before vault switch. Not re-audited here.
- Issue 41 (`41-anchored-wikilink-empties-frontmatter.md`): panel guard added for unparseable frontmatter. Its "wider guard" question was answered only for unparseable. L3 is not covered.
- Issue 42 (`42-meta-bind-writers-parse-guard.md`): meta-bind writers refuse unparseable frontmatter. Issue text offered `detectLossyFrontmatter` as an option. L3 is the gap.
- Issue 44 (`44-meta-bind-input-sanitized-value-wipe.md`): number/date wipe on blur (value sanitized to `""`), fixed by option B. Not the same as L2 (L2 is type change on a valid value).
- ADR-0029 amendment 2026-10-28 (line 103): documents that the panel and meta-bind keep the drop behavior. L3 is therefore a documented decision that conflicts with the owner's stated priority; it is flagged, not new.
- NEW (not in issues, no match found by grep on "toggle", "quoted", "boolean", "hex", "atomic", "CRLF"): L1, L2, L4, L5, L6, L7, L8, L9, L10, L12.

---

## 6. Third-party sources fetched

- tauri-apps/plugins-workspace, `plugins/fs/src/commands.rs` (branch v2). Used the WebFetch summary: `write_text_file` -> `write_file_inner`, options default `truncate: true` (no append), `create: true`, bytes written with `write_all` into the opened handle; no temp file or rename. Fetched text had no line numbers, so none are cited.
- tauri-apps/plugins-workspace, `plugins/fs/guest-js/index.ts` (branch v2). `writeTextFile` invokes `plugin:fs|write_text_file`; `create` is documented as "defaults to true".
- eemeli/yaml v2.9.1, `src/stringify/stringifyNumber.ts`. Output is built from `JSON.stringify(value)` of the JS value; zero padding only when `minFractionDigits` is set.
- Not fetched: the fs scope/permission model, `exists()` error semantics, the yaml parser's `minFractionDigits` for `1.10` (not needed, since the TS path has no node).

---

## 7. Not checked (risks for the reviewer)

- Did not trace the vault-open call site of `migrateBookmarksToFavorites` (app-lifecycle.service.ts:286) or the picker components (IconPicker.svelte, NoteRowMenu) beyond the imports.
- Did not read `ensureFrontmatterLink` callers to the disk (one-on-one, note-action-bar).
- Did not read the event-calendar queue internals (only its entry at :753).
- Did not read the watcher or `reloadExternallyChangedTabs` (editor.service.ts:375-412) beyond the self-save skip.
- Did not run any test. L4 `1.10` depends on yaml internals I did not verify. L1/L2 are pinned by existing tests, so the behavior is what the repo expects today.
- capabilities/default.json path scope for `fs:allow-write-text-file` not read.
