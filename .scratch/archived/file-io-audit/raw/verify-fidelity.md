# Verify: content fidelity (adversarial pass over review-fidelity.md)

Read-only. No repo file changed except this report. Nothing run (no cargo, pnpm, vitest, build).
READ = seen in code at the cited line. FETCHED = upstream source fetched this session. INFER = reasoning.

Fetched this session:
- `codemirror/state` main `src/text.ts`: `toString() { return this.sliceString(0) }`, `sliceString(from, to = this.length, lineSep = "\n")`.
- `codemirror/state` main `src/state.ts`: `EditorState.create` does `Text.of((config.doc || "").split(configuration.staticFacet(EditorState.lineSeparator) || DefaultSplit))`.
- `tauri-apps/plugins-workspace` tag `fs-v2.7.1` `plugins/fs/guest-js/index.ts`: `readTextFile` = `new TextDecoder(options?.encoding ?? 'utf-8').decode(bytes)` (no `fatal`, so malformed bytes become U+FFFD, BOM stripped); `writeTextFile` = `new TextEncoder().encode(data)`.
- Same tag `plugins/fs/src/commands.rs`: `read_text_file` -> `read_file_inner`, `read_to_end` into `Vec<u8>`, no `String::from_utf8`. `write_text_file` -> `write_file_inner`, open with `truncate: true`, `write_all`, no temp+rename.

Known-issue check: grep of `.scratch/architecture-stability/issues/*.md` and `.scratch/suspected-bugs` for toggleTask/toggle_task, CRLF, kanban, parseCanvas, TextDecoder, settings.json: no matching issue. Only F6 is a documented decision (ADR-0029).

---

## fidelity-1 Task toggle drops unsaved edits: CONFIRMED (data-loss)

Tried to refute: looked for a save on tab switch, editor blur/unmount, or a dirty-tab check in toggle.
- `switchTab` only sets the index (READ `src/lib/core/editor/editor.service.ts:250-255`). `MarkdownEditor.svelte:147-165` onDestroy saves view state only, no content save. Callers of `saveAllDirtyTabs`/`saveCurrentFile` are vault switch, app close, Cmd-S, file history restore (grep), none on tab switch.
- `TasksView.svelte:66-67` -> `toggleTask` (`tasks.service.ts:100-120`): no dirty-tab check; calls Rust `toggle_task_status`.
- Rust `toggle_task_status_inner` reads disk `std::fs::read_to_string(path)` (`src-tauri/src/commands/vault.rs:663-664`), toggles, `write_atomic` (`:675`).
- TS `syncExternalContentToEditor(filePath, updatedContent, true, 'none')` (`tasks.service.ts:114`) -> `updateTabContentByPath` sets content AND savedContent (`editor.store.svelte.ts:129-136`). `'none'` cancels nothing, but `saveDirtyTabs` (`editor.service.ts:182-193`) then finds the tab clean.
- The external replace is dispatched with `Transaction.addToHistory.of(false)` (`MarkdownEditor.svelte:332`), so Cmd-Z cannot bring the typed text back.
- Typed text never reached a save, so no file-history snapshot (`file-history.service.ts:190-196` snapshots on after-save only).
- Line numbers come from the Rust index, which the `edit` source does not refresh (CLAUDE.md SOURCE_POLICY), so a toggle on a stale line number also hits the disk text, not the buffer.
Same class CONFIRMED by reading: `src/lib/app/deep-link-actions.ts:53-63` (daily append reads disk, writes, marks tab saved), `src/lib/features/deep-link/deep-link.service.ts:257-262` and `:276-281` (prepend/append).
Repro: open note N, type a line, within 2 s press the Tasks toggle shortcut, tick a task of N, return to N: typed line gone, file on disk lacks it. Test idea: `tasks.service.test.ts` with tab `{content: 'typed\n- [ ] t', savedContent: '- [ ] t'}`, mock toggle result `'- [x] t'`, assert tab content still contains `typed` (fails today).
Fix hint: if the tab is dirty, save it first (`saveFileByPath`) before invoking the toggle, or toggle the line in `tab.content` and let autosave write.

## fidelity-2 Empty `---\n---` frontmatter gets a second block: CONFIRMED (corruption, low impact)

- `FRONTMATTER_REGEX = /^---\r?\n([\s\S]*?)\r?\n---/` (`properties.logic.ts:37`). On `---\n---\n` the group would need `\n---` after the opener; position 4 is `-`, so no match (INFER from regex, deterministic).
- `extractBody` returns full content (`:53-56`), `parseFrontmatterProperties` returns `[]` (`:345-348`), `rebuildContent` writes `---\n${yaml}\n---\n${body}` (`:615-621`).
- `detectLossyFrontmatter` returns null when `raw === null` (`:413-414`), so `updateNoteFrontmatter` (`frontmatter-write.service.ts:121-124`) writes.
- App produces the input itself: `ensureFolderNote` writes `'---\n---\n'` (`file-icons.service.ts:92-98`), then `setFrontmatterIcon` (`:130-133`) -> `updateNoteFrontmatter`. Result: `---\n_icon: ...\n---\n---\n---\n`.
- `ensureFrontmatterLink` special-cases exactly this (`properties.logic.ts:531-532`, comment "FRONTMATTER_REGEX needs at least one line between the delimiters"), proving the gap is known in one writer only.
Not destructive (no text lost) and stable on later rewrites (the regex then matches the first block), so it is a visible stray-rule glitch. The "thematic break later in body" variant is INFER only, not traced.
Repro: right-click a folder without a folder note, set an icon, open the folder note in source mode: two `---` lines after the block. Test idea: `rebuildContent(mutate(parse('---\n---\n')), extractBody('---\n---\n'))` must equal `---\n_icon: x\n---\n`.
Fix hint: make the regex accept an empty block (`/^---\r?\n(?:([\s\S]*?)\r?\n)?---/` or equivalent) and update `extractRawFrontmatter` callers that treat `''` vs null.

## fidelity-3 Meta-bind toggle/number/select write quoted strings: CONFIRMED (corruption of type)

- Toggle dispatches `'true'`/`'false'` strings (`widgets.ts:862-864`); number/date commit `input.value` (`:921-925` area, `commit`); select `selectedValue` (`:704-707`).
- `dispatchMetaBindUpdate` -> `setPropertyByBindTarget(properties, bindTarget, value: string)` keeps `type`, stores the string (`properties.logic.ts:597-609`); `serializeProperties` `doc.set(p.key, p.value)` (`:580`) so yaml quotes it.
- Tests pin it: `meta-bind-writers.test.ts:113` `count: "7"`, `:117` `done: "true"`.
- Consumers: `lifecycle.logic.ts:7-24` `=== true`; Rust `entry.rs:246-251` `as_bool().unwrap_or(true)` for `_organized`, `extract_bool_flag` `unwrap_or(false)` (`:371-377`); test `entry.rs:891-896` confirms non-bool `_organized` reads as true.
- Docs show `INPUT[toggle():archived]` (`help/documentation/24-meta-bind.md:44`); `archived` -> `_archived` (`frontmatter-aliases.ts:9`).
Not a content-loss bug; the write is user-requested but lands with the wrong type, so the flag has no effect (`_archived: "true"` not archived; `_organized: "false"` reads organized). Severity kept "corruption" as type corruption; impact is functional.
Repro: note with `` `INPUT[toggle():archived]` `` in body; tick it; sidebar still lists it as not archived. Test idea: toggle widget on `---\n---`-free note, assert written line is `_archived: true`.
Fix hint: in `setPropertyByBindTarget` (or per widget) coerce by widget kind: toggle -> boolean, number -> Number (empty -> ""), keep select as string.

## fidelity-4 CRLF note saved as LF after first edit: CONFIRMED (corruption, whitespace only)

- FETCHED: `EditorState.create` splits on `lineSeparator` facet or `DefaultSplit`; `Text.toString()` joins with `"\n"`.
- `grep lineSeparator src/lib`: no match. No CRLF normalization on read (grep for `\r\n/g` in core/app: only paste-tsv).
- `opts.onDocChanged(update.state.doc.toString(), fmChanged)` (`editor-extensions.ts:188`) -> `updateContent` (`editor.store.svelte.ts:84-88`); `isTabDirty` string compare (`editor.logic.ts:44-46`); `saveFileByPath` writes `tab.content` (`editor.service.ts:162-168`).
- ADR-0029:82 says save "writes verbatim": true of bytes in `tab.content`, wrong for a CRLF file after any edit.
No text lost; every line ending flips, so git shows a full-file diff. Opening alone writes nothing.
Repro: create a CRLF .md outside the app, open it, type and delete a char, wait 2 s, `file` shows LF. Test idea: in a jsdom CodeMirror test, create state with `'a\r\nb'`, assert `doc.toString()` equals input (fails).
Fix hint: detect the file's line ending on open and set `EditorState.lineSeparator` per tab (or re-join with the original separator on save).

## fidelity-5 Kanban drops unmodeled content; CRLF and frontmatter boards: CONFIRMED (data-loss)

- `HEADING_RE = /^##\s+(.+)$/`, `TASK_RE = /^-\s+\[([xX ])\]\s+(.*)$/`, split on `'\n'` (`kanban.logic.ts:4-5`, `:61`). JS `.` excludes `\r` and `$` without `m` is end-of-input, so `## Todo\r` and `- [ ] x\r` never match (INFER, standard JS regex semantics). `ARCHIVE_SEPARATOR_RE = /^---\s*$/` matches `---\r`.
- Loop (`:67-109`) only handles separator, heading, task; every other line is ignored. `serializeKanbanBoard` (`:118-145`) emits only lanes, cards, archive, settings.
- Leading frontmatter `---` sets `inArchive = true` at line 1 (`:69-72`); later `##` headings skipped (`:78-82`), tasks go to archive (`:103-104`).
- `KanbanView.svelte:79-90` `applyChange` serializes the whole board and calls `onContentChange` (wired `EditorView.svelte:79` with `activeTab.content`) -> autosave. The only guard is "serialized == current", which does not hold after a real mutation.
Repro: board with a line of prose under a lane, toggle a card: prose gone from disk. CRLF board: opens empty; add lane; file holds one lane. Test idea: `serializeKanbanBoard(parseKanbanBoard('## A\r\n\r\n- [ ] x\r\n'))` contains `x` (fails); a round-trip test with a prose line.
Fix hint: strip `\r` before parsing; refuse board mutations (read-only banner) when the parse drops non-empty unmodeled lines or the file starts with frontmatter.

## fidelity-6 Panel / meta-bind edits drop comments, nested maps, anchors: CONFIRMED, KNOWN (documented decision)

- `commitChanges` guards only `isFrontmatterUnparseable` (`properties.service.ts:78-97`); `dispatchMetaBindUpdate` same (`widgets.ts:754-769`). Grep: `detectLossyFrontmatter` is called only by `frontmatter-write.service.ts:121`, `auto-move.service.ts:201`, `event-calendar.service.ts:937`, `:997`.
- Nested drop with only a session-log line (`properties.logic.ts:290-300`); `uniqueKeys: false` (`:263`); `toJS` (`:249`).
- Panel commit -> `syncExternalContentToEditor(..., false, 'frontmatter')` -> 500 ms save. External replace not in undo history (`MarkdownEditor.svelte:332`).
- ADR-0029 (`docs/adr/0029-frontmatter-yaml-canonical-form.md:103`, `:107`, `:99`): "Every other writer ... keeps the drop behaviour", "every other panel edit keeps the drop behaviour above".
Real and silent, but an accepted, documented decision. Flag to owner because it conflicts with the "no silent loss" priority.
Fix hint: run `detectLossyFrontmatter` in `commitChanges` and `dispatchMetaBindUpdate` and refuse with a toast, like `updateNoteFrontmatter`.

## fidelity-7 Number re-spelling on any rewrite: CONFIRMED (corruption)

- `computeAndCache` uses `doc.toJS()` (`properties.logic.ts:245-249`); `convertToProperty` keeps the JS number (`:187-189`); `serializeProperties` `doc.set(p.key, p.value)` creates a fresh node (`:580`). yaml 1.2 core schema (default) resolves `01234` as decimal int, `0x1F` as hex int, `1.10`/`1.0` as floats (reviewer FETCHED int.ts/float.ts; consistent with ADR-0029:36 "Parses as YAML core number (decimal, hex, octal, float...)"). A fresh node from a JS number has no source text or `minFractionDigits`, so output is `1234`, `31`, `1.1`, `1`.
- `detectLossyFrontmatter` flags only unsafe integers (`:427-434`); fixture `properties.logic.test.ts:1232` lists `h: 0x1F` as safe.
- List items also go through `String(item)` (`:174-178`), so `[01234]` -> `["1234"]`.
Correction to the reviewer: "Rust reads the rewritten value the same way" is wrong for hex/octal. ADR-0029:105 says Rust keeps `0x1F` and `0o14` as strings; after a TS rewrite Rust reads the number 31, so the index value changes.
Repro: note `zip: 01234`, favorite it from the sidebar, file shows `zip: 1234`. Test idea: `serializeProperties(parseFrontmatterProperties('---\nzip: 01234\n---\n'))` equals `zip: 01234`.
Fix hint: in `detectLossyFrontmatter` flag numeric scalars whose `source` differs from `String(value)` (and refuse), or carry the scalar source text through `Property`.

## fidelity-8 Non-UTF-8 notes rewritten with U+FFFD: CONFIRMED (corruption, rare)

- FETCHED: decode is non-fatal UTF-8; Rust side returns raw bytes without validation; write always UTF-8.
- Write sites with no editor edit: `updateNoteFrontmatter` closed branch reads (`frontmatter-write.service.ts:117`) and writes `next` (`:149`) — favorite/icon on a closed note; `updateLinksAfterRename` reads closed files (`link-updater.service.ts:35`) and writes (`:39`).
- No U+FFFD check anywhere (INFER from reading those paths). A snapshot is only taken of the written string.
Likelihood limited to legacy/imported Latin-1 files. BOM loss on first save: same mechanism, low.
Repro: write a Latin-1 `cafe\xe9.md` outside the app with `[[Target]]`, rename Target in the app: the note now has EF BF BD. Test idea: `updateNoteFrontmatter` with a mocked `readTextFile` returning a string containing `�` must refuse.
Fix hint: read with `readFile` + `new TextDecoder('utf-8', { fatal: true })` in the shared read paths and refuse writes on decode failure.

## fidelity-9 Skipped post-commit parse leaves a stale store: PLAUSIBLE (stale-state)

Trace (READ): commit arms `skipNextParseFor = activePath` (`properties.service.ts:89`) and updates content; `PropertiesView.svelte:99-114` schedules a 300 ms timer per content change and clears the previous one; the timer that finally fires calls `consumeSkipNextParse(path)` (`properties.service.ts:33-37`), which skips regardless of content. So if any edit lands within 300 ms of the commit and the edits keep coming under 300 ms apart, the parse that would have seen them is skipped. The store keeps the commit's list. The next content change on the same note (any keystroke) re-parses and heals it; a tab switch heals it too (`syncPropertiesFromActiveTab`, `:47-53`). Only a panel edit made before any further keystroke rebuilds from the stale store (`updateProperty` uses `propertiesStore.properties`, `:110-118`) and drops the new key; the replace is not undoable (`MarkdownEditor.svelte:332`).
Narrower than reported: the stale window ends at the next edit, not "minutes later regardless". The panel would also visibly lack `status: done` during that window. Depends on a sub-300 ms follow-up edit, which I could not pin as realistic for keyboard typing after a mouse click.
Test idea: commit via `updateProperty`, then change tab content twice within 300 ms (fake timers), advance 300 ms, assert `propertiesStore.properties` has the new key.
Fix hint: store the committed content string with the skip flag and skip only when the parsed content equals it.

## fidelity-10 Invalid .canvas JSON opens empty and the first edit overwrites: CONFIRMED (data-loss)

- `parseCanvas` returns `createEmptyCanvas()` on parse error or non-object, no log/toast (`canvas.logic.ts:36-49`).
- `CanvasInner.svelte:76` `canvasData = $derived(parseCanvas(jsonContent))`; sync effect loads empty nodes and pushes that as the undo baseline (`:87-101`); `persistWithoutHistory` serializes `flowToCanvas(updatedNodes, updatedEdges, canvasData)` and calls `onJsonChange` (`:107-112`) -> tab content -> autosave.
Repro: canvas file with a trailing comma; open; double-click to add a node; wait 2 s; file holds one node. Test idea: component test that mounts with invalid JSON, adds a node, asserts `onJsonChange` is not called (or a read-only state is shown).
Fix hint: have `parseCanvas` return an error result; on error render a read-only "invalid canvas, open source mode" state.

## fidelity-11 Unparseable settings.json overwritten with defaults: CONFIRMED (minor)

- `loadSettings` catch (`settings.service.ts:165-176`) sets `DEFAULT_SETTINGS` and calls `saveSettings`; `JSON.parse` at `:54` is inside the try. A transient read error takes the same branch.
- `loadAutoMoveConfig` catch sets defaults in memory (`auto-move.service.ts:58-61`); `saveAutoMoveConfig` writes store state (`:69-87`) on the next save.
Repro: add a trailing comma to `.kokobrain/settings.json`, reopen vault: file reset. Fix hint: on parse/read failure, rename the bad file to `settings.json.bak-<ts>` before writing defaults (or do not write).

## fidelity-12 .view/.collection writers drop comments; toolbar write under dirty tab: CONFIRMED for comments, PLAUSIBLE for the dirty-tab part (minor)

- `updateCollectionYaml` and siblings use `yaml.parse` then `yaml.stringify` (`yaml-parser.ts:1`, `:145-150`, returns `stringifyYaml(raw)` at `:231`), and `updateViewIconYaml` the same (`type-sidebar.logic.ts:357-379`). Comments and formatting are lost on any filter/sort/icon change.
- `updateViewQuery`/`updateViewIcon` read and write disk without tab sync (`type-definitions.service.ts:284-311`). `reloadExternallyChangedTabs` skips dirty tabs (`editor.service.ts:376-381`), so a dirty open `.view` tab autosaves its older YAML over the toolbar change. Window is the 2 s autosave debounce, so timing-dependent.
Fix hint: use `parseDocument` + `doc.setIn` + `doc.toString()` to keep comments; route view writes through the open tab when one exists.

## fidelity-13 Integer-like key reorder; rename rewrites links inside code fences: CONFIRMED (minor)

- `Object.entries(parsed)` over `toJS()` (`properties.logic.ts:290`): JS orders array-index keys (`"2024"`) before string keys (INFER, ECMAScript OrdinaryOwnPropertyKeys), and `doc.set("2024", ...)` emits a string key that yaml quotes. Order + key type change; no value lost.
- `replaceWikilinks` (`link-updater.logic.ts:23-39`) is a global regex replace with no fence awareness. Requires the note to also be a backlink source (`get_backlinks_v2`, `link-updater.service.ts:27-28`).
Fix hint: iterate the yaml map items (`doc.contents.items`) instead of `Object.entries`; skip fenced/inline code ranges in `replaceWikilinks`.

---

## Not checked / risks
- Did not run anything; F4, F5 regex and F7 number behavior traced from fetched source and regex/YAML semantics, not executed.
- F9 realism of the 300 ms window not measured.
- F12 dirty-tab overwrite depends on the .view being open and dirty within the 2 s debounce.
