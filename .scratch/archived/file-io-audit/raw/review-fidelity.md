# Review: content fidelity (theme "fidelity")

Read-only review. No repo file changed except this report. No cargo, pnpm, vitest or build run.
Labels: READ = seen in code at the cited line. FETCHED = official upstream source fetched this session. INFER = my reasoning from READ/FETCHED facts.

Fetched this session:
- `eemeli/yaml` tag `v2.9.1`, `src/schema/core/float.ts` and `src/schema/core/int.ts` (raw.githubusercontent.com). Repo pins yaml 2.9.1 (`package.json:77`).
- `tauri-apps/plugins-workspace` tag `fs-v2.7.1`, `plugins/fs/guest-js/index.ts` (`readTextFile` / `writeTextFile`). Lock files pin 2.7.1 (`pnpm-lock.yaml:946`, `src-tauri/Cargo.lock:5557-5558`).
- `codemirror/state` `main`, `src/state.ts` (line splitting, `lineSeparator` facet).

Scout reports used as leads: `scout-frontmatter-writers.md`, `scout-read-fidelity.md`, plus a cross-check of `scout-deep-link.md`.

---

## Findings (most severe first)

### F1. Toggling a task in the Tasks view throws away unsaved edits of the same note [data-loss, high confidence, not filed]

READ path:
1. `switchTab` only sets the active index, it does not save (`src/lib/core/editor/editor.service.ts:250-255`). Body edits wait for the 2000 ms debounce (`:197`).
2. Tasks view checkbox -> `toggleTask` (`src/lib/features/tasks/TasksView.svelte:67`, `src/lib/features/tasks/tasks.service.ts:100`).
3. Rust `toggle_task_status_inner` reads the file from DISK (`src-tauri/src/commands/vault.rs:664-670`), toggles, and writes it (`:683`).
4. TS calls `syncExternalContentToEditor(filePath, result.updatedContent, true, 'none')` (`tasks.service.ts:114`). With `markSaved=true` that calls `updateTabContentByPath` (`editor.service.ts:78-80`), which sets BOTH `content` and `savedContent` to the disk-based text (`src/lib/core/editor/editor.store.svelte.ts:130-136`).
5. The tab is now clean, so the pending 2 s autosave finds nothing to save (`editor.service.ts:183-187`).

Scenario: type a paragraph in note N, within 2 s open the Tasks tab (or have it open beside) and tick a task that lives in N. The paragraph is gone from the editor and never reaches disk. The file-history hook snapshots only what gets saved (`src/lib/features/file-history/file-history.service.ts:190-196`), so the lost text is not in history.

Same class, already mapped by the deep-link scout (`scout-deep-link.md` L2, not in `.scratch/architecture-stability/issues`): `deep-link-actions.ts:54-63` (daily append, which first opens the daily note at `:37`) and `deep-link.service.ts:257-262`, `:276-281` read disk, ignore the open dirty tab, then mark the tab saved with disk+append.

Fix direction (not applied): when a tab for the path is dirty, either save it first or toggle the line in `tab.content` instead of disk.

### F2. An empty frontmatter block `---\n---` is not seen as frontmatter, so every frontmatter writer adds a second block and leaves the old fences in the body [corruption, high confidence, not filed]

READ:
- `FRONTMATTER_REGEX = /^---\r?\n([\s\S]*?)\r?\n---/` (`src/lib/core/frontmatter/properties.logic.ts:37`) needs a line break before the closing fence, so `---\n---\n` does not match. `extractBody` then returns the whole content (`:53-56`) and `parseFrontmatterProperties` returns `[]` (`:345-348`).
- `rebuildContent` writes `---\n${yaml}\n---\n${body}` (`:615-621`), with `body` still starting with `---\n---\n`.
- The app writes that exact empty block itself: `ensureFolderNote` creates `'---\n---\n'` (`src/lib/features/file-icons/file-icons.service.ts:92-98`) and `setIconForPath` then calls `setFrontmatterIcon` on it (`:130-133`) -> `updateNoteFrontmatter` (`src/lib/features/file-icons/frontmatter-icon.service.ts:31-37`, `src/lib/core/frontmatter/frontmatter-write.service.ts:117-124`). `detectLossyFrontmatter` returns null for no frontmatter (`properties.logic.ts:413-414`), so nothing refuses.
- The editor and live preview DO treat `---\n---` as empty frontmatter (`FRONTMATTER_FENCE_RE = /^---\s*$/`, `src/lib/core/markdown-editor/extensions/live-preview/parsers/frontmatter.ts:10`; test `src/tests/lib/core/editor/editor.logic.test.ts:245-249`). `ensureFrontmatterLink` special-cases it (`properties.logic.ts:531-532`), which shows the gap is known in one writer only.

INFER (straight from the string code): setting an icon on a folder that has no folder note writes `---\n_icon: lucide:folder\n_color: "#0000ff"\n---\n---\n---\n`. The folder note now shows two stray horizontal rules. The test for this path (`src/tests/lib/features/file-icons/file-icons.service.test.ts:149-161`) asserts only the placeholder write, not the second write.

Same result for every `rebuildContent` writer on a note or template that starts with an empty `---\n---` block: sidebar favorite (`lifecycle.service.ts` via `updateNoteFrontmatter`), Properties panel add/update (`src/lib/features/properties/properties.service.ts:87-88`), meta-bind (`src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:761-767`), calendar.

Variant, same root (INFER, low): if such a note later has a `---` thematic break in the body, the regex closes on that break, so the text between is parsed as YAML. A body paragraph that reads as a map (`# Project X\nStatus: active`) becomes properties, and a panel edit rewrites it, deleting the `# Project X` heading line (comments are dropped, see F6). Closing fences with trailing spaces (`--- `) or `----` leave the extra characters at the start of the body (`:56` strips only `\r?\n`), so a rewrite inserts a stray line.

### F3. Meta-bind toggle, number and select write quoted strings, so the documented `INPUT[toggle():archived]` never archives a note [corruption, high confidence, not filed]

READ:
- Toggle writes the string `'true'` / `'false'` (`widgets.ts:862-864`); number/date write `input.value` (`:931-934`); select writes the option string (`:704-707`).
- `setPropertyByBindTarget` keeps the old `type` but stores the string value (`properties.logic.ts:597-609`). `serializeProperties` sets the string (`:580`), and yaml quotes strings that would read as another type (ADR-0029 table, `docs/adr/0029-frontmatter-yaml-canonical-form.md:35-36`).
- Tests pin the result: `count: 5` -> `count: "7"` and `done: false` -> `done: "true"` (`src/tests/lib/core/markdown-editor/extensions/live-preview/meta-bind-writers.test.ts:21`, `:97`, `:110`).
- Consumers want a real boolean: `getLifecycleState` / `isFavorite` / `isOrganized` compare `=== true` (`src/lib/features/properties/lifecycle.logic.ts:7-24`); Rust uses `as_bool()` with `unwrap_or(false)` for `_archived` / `_favorite` and `unwrap_or(true)` for `_organized` (`src-tauri/src/vault/entry.rs:246-251`, `:371-376`).
- The user docs show this exact binding: `` `INPUT[toggle():archived]` `` (`help/documentation/24-meta-bind.md:44`), and `archived` canonicalizes to `_archived` (`src/lib/utils/frontmatter-aliases.ts:9`).

Scenario: a note has `INPUT[toggle():archived]` as in the docs. The user ticks it; the file gets `_archived: "true"`. The toggle shows checked (it accepts the string, `widgets.ts:859-860`), but the sidebar, lifecycle state and Rust index all say not archived. Unticking `_organized` writes `_organized: "false"`, which Rust reads as organized. A bare `count: 5` edited to 7 becomes text, so numeric sort and filter in collections stop treating it as a number. Issue 44 is a different number-input bug (value wiped on blur).

### F4. A CRLF note is rewritten with LF on the first edit, and ADR-0029 says the save writes verbatim [corruption, high confidence, not filed]

READ/FETCHED:
- `EditorState.create` splits a string doc on `DefaultSplit` (`\r\n`, `\r` or `\n`) unless the `lineSeparator` facet is set, and joins with `\n` (FETCHED `codemirror/state/src/state.ts`). The repo never sets `lineSeparator` (grep in `src/lib`: no match).
- The listener sends `update.state.doc.toString()` (`src/lib/core/markdown-editor/setup/editor-extensions.ts:188`) into `editorStore.updateContent` (`editor.store.svelte.ts:84-88`). `isTabDirty` is a string compare (`src/lib/core/editor/editor.logic.ts:44-46`), so `content` (LF) != `savedContent` (CRLF) and the save writes the LF text (`editor.service.ts:165-168`).

Scenario: open a Windows-origin or git-autocrlf note, type and delete one character. Autosave rewrites every line ending; git shows every line changed; undo cannot bring CRLF back, because the tab stays dirty against the CRLF `savedContent`. Opening alone writes nothing (`editor.service.ts:124-140`). ADR-0029 "Trigger window" claims "does NOT fire on save (... writes verbatim)" (`docs/adr/0029-frontmatter-yaml-canonical-form.md:82`), which is wrong for line endings. Frontmatter writers on closed CRLF notes write an LF block before a CRLF body (`properties.logic.ts:621`, documented at ADR-0029:78), which leaves mixed endings.

### F5. Kanban boards lose any content the parser does not model; a CRLF board or one with frontmatter is rewritten on the first change [data-loss, high confidence, not filed]

READ:
- `HEADING_RE = /^##\s+(.+)$/`, `TASK_RE = /^-\s+\[([xX ])\]\s+(.*)$/` with no `m` flag; lines split on `\n` only (`src/lib/plugins/kanban/kanban.logic.ts:4-5`, `:61`). On a CRLF line `.` cannot match `\r` and `$` needs end of input, so no heading or card matches (INFER from regex semantics). `ARCHIVE_SEPARATOR_RE = /^---\s*$/` does match `---\r` (`\s` covers `\r`).
- Every line that is not a `## ` heading, a task, or the first `---` is ignored (`:67-109`). `serializeKanbanBoard` writes only lanes, cards, archive and settings (`:118-145`).
- A `.kanban` file that starts with frontmatter: its opening `---` hits `ARCHIVE_SEPARATOR_RE` at line 1 (`:69-72`), so every later `## lane` is skipped as an archive heading (`:78-82`) and every card goes to the archive (`:103-104`).
- Any mutation serializes the parsed board and hands it to the editor autosave (`src/lib/plugins/kanban/KanbanView.svelte:79-90`, wired at `src/lib/app/EditorView.svelte:79`).

Scenarios:
- CRLF board: shows empty. The user adds a lane; the file is replaced by that one lane, every lane and card is gone.
- Board with intro prose, a `# title`, nested bullets, multi-line cards or notes under a lane: the first card toggle or move deletes them, without warning.
- Board with frontmatter (for example a renamed Obsidian Kanban file): no lanes are shown; adding a lane writes it with every card under `## Archive`, frontmatter and lane membership gone.
Contrast: `navigation.logic.ts:6` already uses `\r?$` for the same CRLF problem.

### F6. Properties panel and meta-bind edits silently drop comments, nested values, duplicate-key values and anchors, while the sidebar refuses the same note [data-loss, high confidence, documented decision]

READ: `commitChanges` (`properties.service.ts:78-97`) and `dispatchMetaBindUpdate` (`widgets.ts:754-769`) guard only `isFrontmatterUnparseable`. The parse drops nested maps (`properties.logic.ts:290-300`), keeps the last of duplicate keys (parse with `uniqueKeys: false`, `:263`), expands anchors (`toJS`, `:249`). `serializeProperties` emits no comments. `updateNoteFrontmatter` refuses the same inputs (`frontmatter-write.service.ts:121-122`).

Scenario: note with `title: x  # reviewed` and a nested `meta:` map; tick a checkbox in the Properties panel; within 500 ms the comment and `meta` are gone from disk, no toast. Favoriting the same note from the sidebar shows a refusal toast instead.

Known: ADR-0029 amendments 2026-10-28 (`docs/adr/0029-frontmatter-yaml-canonical-form.md:103`) and issue 41 text (`:107`) state the panel and meta-bind keep the drop behaviour; issues 41 and 42 fixed only the unparseable case. Not filed as an open issue. Flagged for the owner because it contradicts the top priority (no silent content loss).

### F7. Every frontmatter rewrite changes how numbers are spelled: `01234` becomes `1234`, `1.10` becomes `1.1`, `1.0` becomes `1` [corruption, high confidence on mechanism, not filed]

READ/FETCHED:
- yaml core int: decimal `/^[-+]?[0-9]+$/` resolved with `parseInt(str, 10)`; hex/octal parsed by radix (FETCHED int.ts). Core float resolve keeps `minFractionDigits` only on the parsed node (FETCHED float.ts).
- The TS path drops the node: `doc.toJS()` (`properties.logic.ts:249`) -> plain JS number (`:188-190`) -> `doc.set(p.key, p.value)` builds a fresh node (`:580`), so the source spelling and `minFractionDigits` are gone.
- `detectLossyFrontmatter` treats numbers as safe (only unsafe integers flagged, `:427-434`); its fixture marks `h: 0x1F` as safe (`src/tests/lib/core/frontmatter/properties.logic.test.ts:1232`) and the round-trip test compares parsed values, not text (`:1252-1257`), so it cannot see this.

Scenario: a note has `zip: 01234` or `version: 1.10`. The user favorites it from the sidebar (or sets an icon, or edits any other property). The file now says `zip: 1234` / `version: 1.1`. This passes the strictest writer (`updateNoteFrontmatter`) too. ADR-0029 lists quoting, empty values and list coercion as canonical changes, but not number re-spelling. Rust reads the rewritten value the same way (`parse_scalar`, `src-tauri/src/vault/parsing.rs:961-968`), so the index does not flag it.

### F8. Non-UTF-8 notes are rewritten with U+FFFD, including by a sidebar favorite or a rename's link update with no edit in the editor [corruption, high confidence on mechanism, not filed]

FETCHED: `readTextFile` decodes with `new TextDecoder(options?.encoding ?? 'utf-8')` (non-fatal, BOM stripped); `writeTextFile` always encodes UTF-8.
READ write sites that feed a decoded string back to disk:
- editor save after any keystroke (`editor.service.ts:124`, `:168`);
- closed-note `updateNoteFrontmatter` (`frontmatter-write.service.ts:117`, `:149`): toggling favorite or setting an icon from the sidebar on a closed Latin-1 note rewrites every non-ASCII byte as EF BF BD. Nothing checks for U+FFFD;
- `updateLinksAfterRename` on closed files (`src/lib/core/filesystem/link-updater.service.ts:35-39`): renaming a note rewrites every Latin-1 note that links to it.
The pre-change bytes are not in file history (snapshots store the saved string, `file-history.service.ts:111-123`, `:190-196`). Likelihood: legacy or imported vaults. BOM loss on first save is the same mechanism (low severity).

### F9. A panel edit can revert frontmatter typed or set by meta-bind just after an earlier panel edit [stale-state -> lost edit, medium confidence, not filed]

READ: `commitChanges` rebuilds the frontmatter from `propertiesStore.properties`, not from the buffer (`properties.service.ts:86-88`). The store is refreshed by a 300 ms debounced parse (`src/lib/features/properties/PropertiesView.svelte:100-114`). After a commit, `skipNextParseFor` stays armed (`properties.service.ts:89`) until the first debounced parse fires, and that parse is skipped whatever content it sees (`:33-37`, `PropertiesView.svelte:108`). `propertiesMatchActiveNote` checks only the path (`properties.service.ts:64-69`).

Scenario: click a Properties checkbox, then within 300 ms start typing `status: done` in the frontmatter in CodeMirror (or click a meta-bind toggle), each keystroke under 300 ms apart. The only parse after the commit is skipped, so the store never sees `status: done`. Any later panel edit, minutes later, rewrites the frontmatter from the store and removes `status: done`; the 500 ms frontmatter autosave writes the loss. Narrow timing, but the stale store lasts until the next edit, not 300 ms.

### F10. A `.canvas` file with invalid JSON is replaced by an empty canvas on the first edit [data-loss, high confidence on path, not filed]

READ: `parseCanvas` returns `createEmptyCanvas()` on any JSON error, with no log or toast (`src/lib/features/canvas/canvas.logic.ts:36-49`); `canvasData` derives from it (`src/lib/features/canvas/CanvasInner.svelte:76`); any persist serializes `flowToCanvas(..., canvasData)` (`:104-109`) to the editor autosave. Scenario: a canvas with a trailing comma or a git conflict marker opens empty; double-click to add a node; the file now holds only that node.

### F11. An unparseable or unreadable `settings.json` is overwritten with defaults [corruption of config, high confidence, not filed]

READ: any throw inside `loadSettings` (read error, `JSON.parse` error, `null` JSON) sets defaults and calls `saveSettings` (`src/lib/core/settings/settings.service.ts:166-176`). One trailing comma from a hand edit loses all settings, no backup. `auto-move.service.ts:58-61` sets in-memory defaults on the same error, and the next `saveAutoMoveConfig` writes them (`:69-87`, which now writes `rules`/`excludedFolders` from the store).

### F12. `.view` / `.collection` writers drop YAML comments, and the sidebar toolbar writes disk under an open dirty tab [corruption / lost update, minor]

READ: `updateCollectionYaml` and `updateViewIconYaml` use `yaml.parse` then `yaml.stringify` (`src/lib/features/collection/yaml-parser.ts:1`, `:145-150`; `src/lib/features/type-definitions/type-sidebar.logic.ts:2`, `:357-379`), so a filter, sort or icon change drops every comment and re-formats the file. `updateViewQuery` / `updateViewIcon` read and write disk with no tab sync (`src/lib/features/type-definitions/type-definitions.service.ts:284-311`; callers `RailNoteList.svelte:201`, `TypesNavigator.svelte:134`). If the same `.view` is open and dirty (source mode), its autosave later writes the old YAML back over the toolbar change. Overlaps `scout-deep-link.md` L14.

### F13. Minor rewrites (low)

- Integer-like keys are moved to the top and re-quoted: the parse iterates `Object.entries` of `toJS()` (`properties.logic.ts:290`), and JS orders integer-like keys first (INFER from the JS property-order rule). `title: x\n2024: a` comes back as `"2024": a\ntitle: x` (key quoting INFER from yaml string-key rules).
- `replaceWikilinks` has no code-fence awareness (`src/lib/core/filesystem/link-updater.logic.ts:23-39`): a note that documents `[[Old]]` inside a code block and also links to Old gets the code example changed on rename.

---

## Known / filed cross-check

- Issue 34 (save dirty tabs before vault switch): not re-audited; unrelated to F1.
- Issues 41, 42: unparseable guard only; F6 is the documented remainder (ADR-0029:103, :107).
- Issue 44: number/date wipe on blur; different from F3.
- Issues 54, 63: view-parse-cache races; not F12.
- No `.scratch` issue covers F1-F5, F7-F13 (grep over `.scratch/architecture-stability/issues` and `.scratch/suspected-bugs` for toggle, quoted, CRLF, kanban, canvas, U+FFFD, leading zero).

## Paths checked and found SAFE

- Opening a note writes nothing: read, then `addTab` with `savedContent = content` (`editor.service.ts:122-140`).
- `updateNoteFrontmatter` open-tab branch rewrites from `tab.content`, keeps unsaved body edits, restores the base on a failed save only if the tab still shows the rewrite (`frontmatter-write.service.ts:114-136`).
- `updateNoteFrontmatter` closed branch: lossy guard (`:121-122`), tab re-check with no await before the write (`:144`), `create: false` so a deleted note is not recreated (`:149`).
- `saveFileByPath` snapshots `tab.content` before the await and marks that snapshot saved, so typing during a save keeps the tab dirty (`editor.service.ts:165-169`).
- Rust `rewrite_type_in_frontmatter` changes only the matching `_type:`/`type:` line and keeps quotes and line endings (`src-tauri/src/vault/parsing.rs:101-125`); the TS mirror does the same (`src/lib/features/type-definitions/type-definitions.logic.ts:180-211`); `renameType` writes open tabs from `tab.content` first (`type-definitions.service.ts:215-225`).
- `toggle_task_status_inner` skips the write when nothing changed and writes with `write_atomic` (`vault.rs:669-683`); fidelity is fine apart from F1.
- `updateLinksAfterRename` uses a dirty tab's in-memory content (`link-updater.service.ts:33-35`) and changes only link text.
- `ensureFrontmatterLink` inserts after the opening fence and keeps the template bytes when the key is absent (`properties.logic.ts:529-540`).
- Alias twins keep the populated value instead of last-wins (`properties.logic.ts:488-510`).
- Auto-move skips its icon write on lossy frontmatter (`src/lib/features/auto-move/auto-move.service.ts:199-205`).
- Kanban `applyChange` does not arm its latch for a no-op serialize (`KanbanView.svelte:84-87`).

## Not checked / risks

- Canvas rewrite on open (xyflow `bind:nodes` measuring nodes after the `syncing` microtask, `CanvasInner.svelte:96`, `:210-226`): hypothesis only, needs a runtime byte/mtime check.
- Whether the file tree can open unlisted binary types (`.docx`, `.sqlite`) through `openFileInEditor`; the denylist is at `src/lib/core/filesystem/fs.logic.ts:79-88`.
- Write atomicity, watcher reload races and deep-link writers belong to other themes; only cross-referenced here.
- Nothing was run. F2, F7 and F13 outputs are traced from string code and fetched yaml source, not executed.
