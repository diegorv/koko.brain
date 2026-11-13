# Scout 01: editor wikilink completion, end to end

Read-only research at HEAD 130d6b8f7. Nothing was run (no vitest, cargo, build). All paths are relative to the repo root.

## 1. Anatomy

### 1.1 Entry point: `wikilinkCompletionSource`
- `src/lib/core/markdown-editor/extensions/wikilink/completion.ts:43-59`. It takes a CodeMirror `CompletionContext`, copies the whole doc with `state.doc.toString()` (line 45), runs `detectWikilinkContext(docText, pos)` (line 47) and dispatches on `match.mode` to one of three builders.
- Registered once, in the single shared `autocompletion({ override: [wikilinkCompletionSource, dateShortcutCompletionSource, tagCompletionSource], activateOnTyping: true })` at `src/lib/core/markdown-editor/setup/editor-extensions.ts:142-145`. The comment at lines 139-141 says a second `autocompletion()` would throw a config merge conflict.
- All three builders return `{ from, to, options, filter: false }`. The sources do their own filtering and ranking. CodeMirror's own filter is disabled.

### 1.2 Pure detection: `detectWikilinkContext`
- `wikilink/completion.logic.ts:26-72`. Signature is `(docText: string, pos: number) => WikilinkMatch | null`. It is a pure string function.
- It looks only at the current line (`lastIndexOf('\n', pos - 1)`, line 27). It finds the last `[[` before the cursor (line 30). It returns null if `]]` follows that `[[` before the cursor (line 34) or if there is a `|` (line 37, so no completion in display-text position).
- Mode selection: no `#` gives `file`, with `from` right after `[[`. `#` gives `heading` with `target` = text before `#`. `#^` gives `blockId` (lines 39-64). `to` is always `pos`, so text after the cursor is never part of the replaced range.
- Edge: `[[#x` yields `target: ''`. The builders treat an empty target as "the current document" (completion.ts:135-137, 187-189).
- Existing unit tests: `src/tests/lib/core/markdown-editor/extensions/wikilink/completion.logic.test.ts` (imports the logic file directly, lines 1-8).

### 1.3 File mode (`buildFileCompletions`, completion.ts:62-124)
1. Calls `state.facet(editorHost).listLinkCandidates(match.query.length > 0)` (line 68). It asks for the `notes` (frontmatter, for aliases) only when the query is non-empty.
2. File options: `matchFilesForWikilink(query, files)` (logic.ts:75-90). Empty query sorts by `name.localeCompare`. Otherwise it scores with `fuzzyMatch(query, file.name)` and sorts by score, then name. Each option has `label: file.nameWithoutExt`, `type: 'file'`, and an inline `apply` (completion.ts:71-82).
3. Alias options, only for a non-empty query (lines 85-113). For each note, `getAliasesFromEntry` (lines 27-36, module-private) reads `frontmatter.aliases ?? frontmatter.alias`, accepting an array of strings or a single string. For each alias that `fuzzyMatch`es, it emits `{ label: noteName, displayLabel: alias, detail: noteName, boost: -score, apply }`. The apply inserts `noteName|alias`. `noteName` comes from `getNoteName(entry.path)`.
4. Returns null when there are no options and the request is not explicit (line 116). There is no cap on the option count here. The kanban component caps at 8 on its own.
- Note: the label is `nameWithoutExt` for every file the host lists, so images and other attachments are offered extension-less. Same-named files in different folders produce duplicate labels. The host filters out only `.view` files (`src/lib/app/editor-host.ts:72`, `isLinkTargetFile` at `core/filesystem/wikilink-resolution.logic.ts:15-18`). This is existing behavior, and the composer inherits it if it reuses the source.

### 1.4 Heading mode (`buildHeadingCompletions`, completion.ts:127-176)
- Content source: empty target means `state.doc.toString()` (the live document). Otherwise `resolveTargetContent(host, target)` (lines 15-24), which calls `host.resolveLink(target)` and then `host.readNote(resolved)`. A read failure is reported through `reportError('WIKILINK_COMPLETION', ...)` and returns null.
- `extractHeadingsFromContent` (logic.ts:93-102) uses `HEADING_RE` from `navigation.logic.ts:6` (`/^#{1,6}\s+(.+)\r?$/`).
- Ranking is inline (completion.ts:143-153): empty query keeps document order. Otherwise `fuzzyMatch`, filter, sort by score. This is not exported.
- Apply inserts `label + (']]' unless already follows)` and puts the cursor after the brackets (lines 160-167).

### 1.5 Block-id mode (`buildBlockIdCompletions`, completion.ts:179-228)
- Same shape as heading mode. It uses `extractBlockIdsFromContent` (logic.ts:105-114) with `BLOCK_ID_RE` (`navigation.logic.ts:14`). Ranking and apply are the same inline code, with `type: 'text'`.

### 1.6 The `apply` functions (3 near-identical copies plus 1 alias variant)
- Lines 72-81, 100-108, 160-167, 212-219. Each does:
  - `after = state.doc.sliceString(to, min(to + 2, len))`
  - `closingBrackets = after === ']]' ? '' : ']]'`
  - `view.dispatch({ changes: { from, to, insert: label + closingBrackets }, selection: { anchor: from + insert.length } })`
- Two coupling points to the editor:
  - They use `view.dispatch` with `changes` and `selection` only. They do not use `view.state`, DOM, or anything else on the view. They also do not add the `pickedCompletion` annotation that the `Completion.apply` doc requires (`node_modules/@codemirror/autocomplete/dist/index.d.ts:42-48`).
  - They close over the `state` captured when the source ran (not `view.state`). Each keystroke re-runs the source, so it is only a stale-snapshot concern if the host re-uses a result across edits.
- `[[` in the editor goes through `closeBrackets()` (editor-extensions.ts:138), which auto-inserts `]]`. That is why the `after === ']]'` guard exists. A plain textarea has no auto-close, so the guard would normally append `]]`.

## 2. What the source needs

| Dependency | Where | Editor-bound? |
|---|---|---|
| `CompletionContext` (`state`, `pos`, `explicit`) | completion.ts:43-45, 116 | Needs an `EditorState` only, no view |
| `state.doc` (`toString`, `sliceString`) | completion.ts:45, 75, 137 | Doc only |
| `state.facet(editorHost)` | completion.ts:68, 139, 191 | Facet; `NOOP_HOST` when nothing is installed (`editor-host.ts:104-107`) |
| `EditorHost.listLinkCandidates(includeNotes)` | `editor-host.ts:48`, returns `{ files: FileEntry[], notes: NoteEntryV2[] }` | App impl: `src/lib/app/editor-host.ts:128-133` (file tree and `getVaultEntries()`) |
| `EditorHost.resolveLink(target)` and `readNote(path)` | `editor-host.ts:46, 50` | App impl: `src/lib/app/editor-host.ts:124-126, 135-137` (`readTextFile`) |
| `view.dispatch(changes, selection)` in `apply` | completion.ts:77, 105, 163, 215 | Needs only a `dispatch`-like object |
| `reportError` | completion.ts:6, from `live-preview/core/profiling.ts:36-39` | Module with no imports; uses a module-level port (no-op until configured), plus `console.error` |

Within `EditorHost`, wikilink completion uses only `listLinkCandidates`, `resolveLink` and `readNote`. The other 7 methods are irrelevant to it. The tag source uses only `listTags` (`tag/completion.ts:28-35`).

## 3. Pure vs editor-bound

**Pure, no CodeMirror, importable anywhere:**
- `completion.logic.ts` (all four exports). Imports are `type FileEntry` (type-only, erased), `fuzzyMatch` (`utils/fuzzy-match.ts`, no imports) and `HEADING_RE` / `BLOCK_ID_RE` (`navigation.logic.ts`, no imports). Checked via the import lines at logic.ts:1-3 and navigation.logic.ts:1-14.
- `getNoteName` (`core/filesystem/wikilink-resolution.logic.ts:4-8`). Its only import is type-only (line 1).
- `fuzzyMatch` (`utils/fuzzy-match.ts:8-41`, lower score is better; prefix bonus and a length penalty).

**Editor-tied (cannot run without CodeMirror types and a facet or a view):**
- `completion.ts` as a whole: imports `@codemirror/autocomplete` types (line 1) and `editorHost` (line 5).

**Pure in spirit but private (not exported), so unreachable without editing `completion.ts`:**
- `getAliasesFromEntry` (completion.ts:27-36).
- The alias-option building loop (lines 85-113).
- The heading/block-id fuzzy filter-and-sort (lines 143-153, 198-205).
- The closing-bracket rule (`after === ']]'`, repeated 4 times).
- `resolveTargetContent` (lines 15-24).
- Barrel warning: `wikilink/index.ts` re-exports `decoration` (CodeMirror view code). Import `completion.logic.js` and `navigation.logic.js` directly, never the barrel, to keep the composer bundle small. Kanban already does this (see 4.1).

## 4. Reuse opportunities (zero edits to editor files)

### 4.1 Precedent: a non-CodeMirror consumer already exists
`src/lib/plugins/kanban/KanbanWikilinkSuggestions.svelte:2-30` imports `detectWikilinkContext` and `matchFilesForWikilink` from `completion.logic.js` and drives a plain `<input>/<textarea>` with a custom dropdown. It is used in `KanbanCard.svelte:190` and `KanbanLane.svelte:368`. It takes `text` and `cursorPos` props, caps at 8 items (line 19), and handles ArrowUp/Down/Enter/Tab/Escape (lines 42-68). It replaces `[context.from - 2, cursorPos]` with `nameWithoutExt` and leaves the closing `]]` to the parent (lines 70-76, 14). It supports file mode only. It does not do aliases, headings or block ids, and it appends no `]]` itself. Its data comes from `fsStore.fileTree` in the main window, so the composer cannot reuse the component as is.

### 4.2 Option A: reuse the real source headlessly (full feature parity, zero edits)
Existing tests prove `wikilinkCompletionSource` works with no `EditorView`: `src/tests/lib/core/markdown-editor/editor-host.test.ts:219-232` builds `EditorState.create({ doc, extensions: editorHost.of(host) })` and calls `wikilinkCompletionSource(new CompletionContext(state, pos, false))`. Lines 245-253 do the same for heading mode with `explicit = true`. For the composer:
- Build an `EditorState` from the textarea value, with `editorHost.of(composerHost)`, where `composerHost` is a partial `EditorHost` (rest from `NOOP_HOST`). It needs `listLinkCandidates`, `resolveLink` and `readNote`, plus `listTags` for the tag scout.
- Call the source with the cursor at `textarea.selectionStart`.
- Render `result.options` in a small dropdown. The label is `displayLabel ?? label`, and `detail` exists for aliases.
- On accept, call `option.apply(shimView, option, result.from, result.to)`. The shim implements only `dispatch({ changes, selection })` against the textarea value and caret (the source uses nothing else from the view; completion.ts:77, 105, 163, 215). It needs a type cast. The `apply` type is `(view: EditorView, ...)` (autocomplete d.ts:48).
- Cost: it pulls `@codemirror/state` and `@codemirror/autocomplete` into the composer bundle (the facet needs `@codemirror/state`). `completion.ts` does a runtime-free `import type` from autocomplete, so only `@codemirror/state` is needed at runtime for the facet. This is UNVERIFIED for the bundler output, since I did not inspect the build.
- Trade-off: the exact same ranking, aliases, headings, block ids and apply semantics, so editor and composer cannot drift.

### 4.3 Option B: reuse only the pure logic (partial parity)
Import `detectWikilinkContext`, `matchFilesForWikilink`, `extractHeadingsFromContent`, `extractBlockIdsFromContent` and `getNoteName` directly (all pure). The composer then has to re-implement the following (about 40 lines): alias extraction, the alias option and `noteName|alias` insert, the heading/block-id fuzzy ordering, and the `]]` rule. This is the Kanban pattern extended. It is lighter, but it duplicates logic that lives privately in `completion.ts`. Making it shareable would need exports or a new `.logic.ts` helper in the editor folder, which touches editor files. The constraint says to avoid that.

### 4.4 Data supply for either option (from the composer webview)
The composer cannot read `fsStore` or `vaultStore`. It needs `files` (`FileEntry[]`: `name`, `nameWithoutExt`, `path`; logic.ts:1 and `file-entries.logic.ts:4-8`), plus `notes` (`NoteEntryV2`, only `path` and `frontmatter` are read by this source) for aliases, plus a way to read a note for heading and block-id modes. The main window builds `files` from `flattenFileTree(fsStore.fileTree).filter(isLinkTargetFile)` (`src/lib/app/editor-host.ts:72`) and `notes` from `getVaultEntries()` (line 131). A Rust-side source for this exists as `getVaultEntries` (not traced by this scout). How to ship it to the composer (new IPC command, event from main window, or a Rust read of the vault index) belongs to the other scouts.

## 5. Behaviors to know

1. Replace range is `[from, to]` with `to === cursor`. Text after the cursor is untouched, except that `]]` right after the cursor is not duplicated (the `after` check). The caret ends after the closing brackets.
2. Alias options appear only when the query is non-empty, and `listLinkCandidates(false)` returns `notes: []` for an empty query (completion.ts:68, 86; `app/editor-host.ts:131`). With an empty query, only the files show, sorted by name.
3. Heading mode with an empty target reads the "current document", which in the composer would be the draft text itself (state doc), not a vault note. That is correct for a draft only if the draft contains headings or `^ids`. It is an edge case, harmless.
4. The `explicit` flag: the empty-result return is suppressed only for explicit activation (completion.ts:116, 155, 207). With `activateOnTyping` style behavior, call with `explicit = false` to match the editor's typing behavior.
5. `detectWikilinkContext` is line-local, and returns null after a `|`. Multi-line textarea input works because it finds the line start itself.
6. No `pickedCompletion` annotation in `apply`. Irrelevant outside CodeMirror, but note it if anyone wires the shim into a real view.

## 6. Risks

- Option A: the shim view is a cast that could break if a future editor change makes `apply` use more of `EditorView` (for example `view.state`). The risk is low but real because the editor owners may not know the composer depends on it. A test in the composer that runs real `apply` through the shim would catch it. The existing `editor-host.test.ts:219-253` already guards the source's behavior under a fake host, but not the apply path (checked: no apply call in lines 219-253).
- Option B: drift between editor and composer ranking and apply rules.
- Either option: the stale `state` closed over by `apply` is fine only if the source is re-run on every input event.
- Layer rules: `layer-rules.test.ts` scans `src/lib` (lines 16, 42), so a route importing `#lib/core/markdown-editor/...` is outside that scan. UNVERIFIED whether any other lint or test restricts `src/routes`. Even so, `src/routes/composer/+page.svelte:4-6` already imports from `#lib/core/settings` and `#lib/contracts`.
- Bundle size and theme: not verified.
- Data volume: no cap on the number of file options in the source (completion.ts:71-115). On a large vault the composer dropdown must cap and virtualize or slice, as Kanban does with 8 (`KanbanWikilinkSuggestions.svelte:19, 29`).
- Cold-cache cost: `listLinkCandidates(true)` on the app side is "one IPC on a cold cache" (`editor-host.ts:47`). The composer's replacement must be equally lazy or cached, since it is a popover that is summoned often.

## 7. Open questions

1. Is Option A (headless real source plus shim) acceptable to the owner as "reuse the editor's code", given it ships `@codemirror/state` in the composer webview, or should the composer stay free of CodeMirror (ADR 0028 says CodeMirror swap was out of scope, but a headless state is not a swap)?
2. Should the composer offer heading and block-id modes at all? The task says "wikilinks"; reading another note needs an IPC `readNote` equivalent in the composer. Dropping them would shrink the data feed to files and aliases.
3. Should attachments (png, pdf) appear in the composer's `[[` list? The editor offers them today, extension-less (see 1.3). Parity says yes.
4. How does the composer obtain `files` and `notes` (and how fresh must they be)? Not covered by this scout.
5. UNVERIFIED: the `@codemirror/state` bundling cost and whether Vite's chunking for the `composer` route would pull the whole editor module graph through `editor-host.ts` (that file imports `type EditorView` only, so it should not, but I did not run a build).
