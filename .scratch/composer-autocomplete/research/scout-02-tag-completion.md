# Scout 02: tag completion end to end

Read-only research at HEAD 130d6b8f7. Paths are relative to the repo root. Nothing was run.

## 1. Summary

`tagCompletionSource` is a plain CodeMirror `CompletionSource`. It needs three things:

1. A `CompletionContext` with a `state.doc`.
2. The `editorHost` facet present on that state, with a working `listTags()`.
3. `reportError` from the editor's profiling module (a no-op-safe console logger).

It needs nothing else from the editor: not the markdown language, not live preview, not any compartment. It can be reused unchanged in a minimal CodeMirror instance inside the composer, with zero edits to editor files. The only new code the tag half needs is a composer-side `EditorHost` whose `listTags` calls `get_all_tags_v2` over IPC.

The date-shortcut source must NOT be included in a composer setup (section 5).

## 2. The source: `tagCompletionSource`

`src/lib/core/markdown-editor/extensions/tag/completion.ts`

- Signature `async (context: CompletionContext) => CompletionResult | null` (line 14).
- Fast pre-check (lines 16-19): reads `state.doc.lineAt(pos)` and returns null unless the line text before the cursor contains `#`. This avoids `doc.toString()` on keystrokes without `#`.
- Line 21: `detectTagContext(state.doc.toString(), pos)` runs on the whole document, because frontmatter and fence state need everything before the line.
- Lines 24-30: `state.facet(editorHost).listTags()` inside try/catch. On a rejection it calls `reportError('TAG_COMPLETION', ...)` and returns null.
- Line 32: `rankTags(match.query, tags)`; an empty result returns null (line 33).
- Lines 35-40: returns `{ from: match.from, to: match.to, options: [{ label: tag.name, type: 'keyword' }], filter: false }`. `to` extends past the cursor over tag characters, so accepting with the cursor inside a tag replaces the whole name. `filter: false` means CodeMirror does not re-filter, and there is no `validFor`. CodeMirror therefore re-queries the source on every doc change while the popup is open. Not verified in `@codemirror/autocomplete` source; this is from the documented contract for results without `validFor`.
- Imports: `@codemirror/autocomplete` (types only), `../../editor-host` (the facet plus the `VaultTag` type), `../live-preview/core/profiling` (`reportError`) and `./completion.logic`.
- Insertion is the default `apply` (label text replacing `from..to`). The `#` is already in the doc, so only the name is inserted. The existing test confirms `see #pro` becomes `see #prose` (`src/tests/lib/core/markdown-editor/extensions/tag/completion.test.ts:110-116`).

## 3. Pure logic: `completion.logic.ts`

`src/lib/core/markdown-editor/extensions/tag/completion.logic.ts`

- `TAG_PREFIX_RE = /(?:^|\s)#([\p{L}_][\p{L}\d_/-]*)?$/u` (line 22). The `#` must be at line start or after whitespace. The first tag character is a letter or `_`, so `# ` and `##` headings never match. The name is optional so the list opens right after `#`.
- `TAG_REST_RE` (line 25) is a sticky regex for tag characters after the cursor.
- `FRONTMATTER_RE = /^---\r?\n[\s\S]*?\r?\n---/` (line 28). Frontmatter counts only once its closing `---` exists.
- `CODE_FENCE_OPEN_RE` (line 35) matches backtick or tilde fences with any leading whitespace.
- `endsInInlineCode` (lines 41-48) tracks backtick runs of equal length.
- `inFrontmatterOrFence(docText, lineStart)` (lines 56-68) first treats everything inside the frontmatter as excluded. It then scans the lines before `lineStart` for fence open and close (the close must be the same char, at least as long, and a bare line).
- `detectTagContext(docText, pos)` (lines 75-89) works as follows:
  - It takes the current line up to `pos`, matches `TAG_PREFIX_RE`, then rejects when inside inline code or in frontmatter or a fence.
  - It returns `{ from: pos - query.length, to: pos + rest, query }`.
  - It uses `\n` only for line splitting; `\r\n` leaves a trailing `\r` on lines, which is harmless here (the prefix regex only looks before the cursor).
- `rankTags(query, tags)` (lines 96-102):
  - Uses `fuzzyMatch` from `src/lib/utils/fuzzy-match.ts:8-38` (pure, subsequence match, prefix bonus, shorter-name bonus).
  - Sorts by score, then count descending, then name via `localeCompare`.
  - Is generic over `{ name, count }`. An empty query keeps every tag.
- The logic file has no framework imports. Its only import is `#lib/utils/fuzzy-match.js`, so it is trivially bundle-safe in the composer.
- Its sync regexes mirror the indexer's rules: `INLINE_TAG_NAME_SOURCE`, `INLINE_TAG_REGEX` and `FRONTMATTER_REGEX` in `src/lib/utils/tag-extraction.ts:1-8`. This is a duplicated rule, noted in the comments.

### Composer-relevant behaviour of the logic

- The composer text is a free-form capture, not a note with frontmatter. If the user types a leading `---\n...\n---`, tags inside are suppressed (same as in the editor). That is consistent with how the note is later indexed.
- Fence and inline-code suppression applies to composer text too. This is correct, because the saved note is indexed with the same rules.

## 4. What the source needs from `EditorHost`

`src/lib/core/markdown-editor/editor-host.ts`

- `editorHost` is `Facet.define<EditorHost, EditorHost>({ static: true, combine: values => values[0] ?? NOOP_HOST })` (lines 104-107). Without a host installed, the facet yields `NOOP_HOST`, whose `listTags` resolves `[]` (line 97), so the source returns null.
- The tag source only calls `listTags(): Promise<readonly VaultTag[]>` (line 75). `VaultTag` is `{ name: string; count: number }` (lines 19-24). The name has no `#`, and nested tags keep their `/`.
- `NOOP_HOST` is exported (line 87). A composer host can be `{ ...NOOP_HOST, listTags }`. The existing unit test builds a host exactly this way (`src/tests/lib/core/markdown-editor/extensions/tag/completion.test.ts:25-27`).
- Module weight of `editor-host.ts`: its value imports are only `Facet` from `@codemirror/state`. The `EditorView`, `FileEntry` and `NoteEntryV2` imports are `import type` (lines 2-4), so they are erased at build.
- `profiling.ts` has no imports at all (read in full). `reportError` writes `console.error` plus the configured port; the default port is DISABLED (`profiling.ts:9,36-39`). That is fine in the composer without `configureProfiling`.
- No app store is pulled in by `tag/completion.ts` transitively. Verified by reading all four imports.

### How the main app implements `listTags`

`src/lib/app/editor-host.ts:93-111,195-197`

- `vaultTags()` returns `[]` until `vaultStore.indexReady` (line 99). The comment explains that Rust still holds the previous vault's index until the new one is built.
- Memoised by key `${vaultStore.path}\n${vaultStore.vaultIndexVersion}`; one IPC per vault path and index version (lines 100-110). A failed read is not cached.
- The IPC is `call('get_all_tags_v2').then(all => all.map(({ name, count }) => ({ name, count })))` (line 102). The `map` strips `filePaths`.
- `appEditorHost` pulls in the whole app (stores, Tauri fs, editor service; imports at lines 1-36). The composer must NOT import it. The composer needs its own small host.

### Rust side

- `get_all_tags_v2` is `#[tauri::command]` at `src-tauri/src/commands/vault.rs:637-646`. It takes `State<VaultIndexState>`, takes a read lock and returns `idx.lookup_all_tags()`.
- It is registered at `src-tauri/src/lib.rs:351`. The TS contract is `src/lib/contracts/commands.ts:103` (`get_all_tags_v2: { args: NoArgs; result: TagAggregate[] }`).
- `lookup_all_tags` (`src-tauri/src/vault/index.rs:1039-1065`) iterates every entry's tags to resolve display casing, builds a `TagAggregate` per tag including `file_paths` (all absolute paths of notes using it), then sorts. The cost is O(entries x tags per entry) plus a payload of every tag's file path list. It is not a cheap call on a big vault.
- The state is app-wide (managed Tauri state), so the composer webview would read the same index as the main window. Not verified by running; it follows from `tauri::State` semantics.

## 5. Date-shortcut source: exclude it

`src/lib/core/markdown-editor/extensions/date-shortcut/completion.ts` and `.logic.ts`

- It is registered third in the shared `autocompletion({ override: [wikilinkCompletionSource, dateShortcutCompletionSource, tagCompletionSource], activateOnTyping: true })` (`src/lib/core/markdown-editor/setup/editor-extensions.ts:142-145`).
- It is a separate, independent source. `dateShortcutCompletionSource` (`completion.ts:18-35`) needs no host, only line-local text. It handles `@today`, `@tomorrow` and `@yesterday` and inserts `YYYY-MM-DD` via `formatNow` (`completion.logic.ts:36-46`, which imports dayjs through `utils/date.ts`).
- The owner's constraint 3 limits scope to tags and wikilinks. The composer has no `@` shortcut today. Omitting the source from the composer's `override` array is all that is needed. It is not coupled to the other two sources, so no editor file has to change.
- Because the editor's `override` array is a literal in `createExtensions`, the composer cannot reuse `createExtensions` to get "just tags and wikilinks" (it would also bring live preview, keymaps and the date source, and requires many options). The composer should build its own small `autocompletion({ override: [wikilinkCompletionSource, tagCompletionSource] })`. This needs no edit to editor files.

## 6. Reuse opportunities

1. Import `tagCompletionSource` directly from `src/lib/core/markdown-editor/extensions/tag/completion.ts`. This is zero edits, with identical behaviour including frontmatter, fence, heading and inline-code suppression and ranking.
2. Install the facet with `editorHost.of(composerHost)`, where `composerHost = { ...NOOP_HOST, listTags: ... }` and `listTags` calls `call('get_all_tags_v2')` mapped to `{ name, count }` as the app does (`src/lib/app/editor-host.ts:102`). `call` from `#lib/contracts/ipc.js` is already used by the composer page (`src/routes/composer/+page.svelte:5,77,102`).
3. The existing tests at `src/tests/lib/core/markdown-editor/extensions/tag/completion.test.ts` already show how to drive the source and the accept flow in jsdom with only `editorHost.of(host)` plus `autocompletion({ override: [tagCompletionSource], interactionDelay: 0 })` (lines 95-108). They prove the source works in a minimal editor with no other editor extension.
4. Both tag and wikilink sources share the same `editorHost` facet, so a single composer host can serve both (wikilink details are another scout's topic).

## 7. Risks and gotchas (for the composer)

1. **Per-keystroke IPC cost.** The result has `filter: false` and no `validFor`, so every keystroke while the popup is open re-runs the source and calls `listTags()`. The app host memoises per index version; the composer has no `vaultStore`, so a naive host would call `get_all_tags_v2` (which clones every tag's file path list) on every keystroke after `#`. A composer host should memoise the promise. A natural lifetime is "until the next qc:open-composer summon" (`+page.svelte:178`), plus no caching on rejection (as `app/editor-host.ts:106-108` does). Memoising per summon means tags created after the window opened are missed, which is an acceptable staleness (UNVERIFIED as a product decision).
2. **No `indexReady` guard.** The composer cannot read `vaultStore.indexReady`. While the main window is indexing a new vault, Rust still holds the previous vault's index (`app/editor-host.ts:97-98`). A composer host would briefly offer the old vault's tags. Rare; likely acceptable (matches the owner's "no core changes for corner cases" preference), but name it.
3. **Escape handling collision.** The composer's window-level keydown handler dismisses the window on Escape without checking `defaultPrevented` (`+page.svelte:161-166`, attached via `<svelte:window on:keydown>` at line 202). CodeMirror's `completionKeymap` binds Escape to `closeCompletion` (`node_modules/@codemirror/autocomplete/dist/index.js:2067`). The view keymap only calls `stopPropagation` for bindings that set it (`node_modules/@codemirror/view/dist/index.js:9268-9275,9309-9310`), and the completion bindings do not, so the event would still bubble to the window and Esc would close the popup and dismiss the composer in one press. Needs a decision, for example the page handler skipping when the popup is open. That is a composer page edit, not an editor edit. Not verified at runtime.
4. **Cmd+Enter and `defaultKeymap`.** If the composer used the editor's `defaultKeymap`, `Mod-Enter` would probably run `insertBlankLine` before the window handler saves. UNVERIFIED (I did not read `@codemirror/commands`). Only the completion keymap is needed, so avoid `defaultKeymap` in the composer.
5. **Enter now accepts a completion.** With the popup open, `Enter` is `acceptCompletion` (`autocomplete/dist/index.js:2069-2073`). Without the popup it falls through. It does not conflict with Cmd+Enter (modifier differs).
6. **Textarea replacement is a larger change than the tag source.** The source needs a `CompletionContext` over an `EditorState`, so the composer must move from `<textarea>` to a CodeMirror view. That is the "CodeMirror swap" ADR-0028 names (`docs/adr/0028-quick-capture-merge-into-kokobrain.md`; the line was quoted in the task, not re-read by me). The draft persistence (`$effect(() => writeDraft(text))`, `+page.svelte:34`), `bind:value` and `textareaEl.focus()` (line 158) all depend on the textarea and will need rewiring. That is another scout's topic.
7. **Capability file.** `src-tauri/capabilities/composer.json` grants only `core:default`, `core:window:allow-hide` and `core:window:allow-set-focus`. The composer already calls custom commands (`submit_composer_capture`, `dismiss_composer`) with those permissions. `src-tauri/build.rs` calls `tauri_build::build()` with no `AppManifest`, so app commands are not individually permission-gated. This suggests `get_all_tags_v2` would be callable from the composer without a capability change. UNVERIFIED at runtime, and the capability's description says "no other IPC", which is a stated intent that this feature would relax. Needs an explicit decision, as does the choice between exposing the full vault tag list to the composer or adding a narrower command (the latter means Rust DTO/ts-rs work).
8. **Layer rules.** `src/routes/composer` importing `core/markdown-editor/extensions/tag/completion` is a route importing core, which looks allowed. A composer host placed under `plugins/quick-capture` importing core is fine in the usual direction. Not run against `layer-rules.test.ts` (forbidden to run tests).
9. **Bundle weight.** A CodeMirror view in the composer adds `@codemirror/view`, `state` and `autocomplete` to the composer route chunk. The tag source's own imports are tiny (section 4).
10. **Duplicated tag rule.** The logic file already mirrors the indexer's regexes. Reusing it keeps the composer consistent with what the saved note's indexer will extract.

## 8. Open questions

1. Is a plain CodeMirror state with no markdown language acceptable? The tag logic is text-based and does not read the Lezer tree, so it should be. The wikilink source may read the syntax tree (another scout should confirm).
2. Should the composer host memoise per summon, per vault index version (needs a new IPC to get the version), or not at all?
3. Is it acceptable that the composer webview calls `get_all_tags_v2` directly and receives file paths it discards, or should a slimmer command be added? A new command is a Rust change plus ts-rs bindings.
4. Escape and Enter semantics with the popup open (risks 3 and 5): does the owner want Esc to close only the popup?
5. How should the popup be positioned inside the 600x240 non-resizable window (`build_composer_window` in `src-tauri/src/lib.rs:135`)? Tooltip placement near the window edge may clip. UNVERIFIED and out of my topic.
6. Which is the intended `activateOnTyping` behaviour in the composer? The editor sets it explicitly to `true` (`editor-extensions.ts:144`), which is the library default (not re-verified).

## 9. Files read

- `src/lib/core/markdown-editor/extensions/tag/completion.ts`
- `src/lib/core/markdown-editor/extensions/tag/completion.logic.ts`
- `src/lib/core/markdown-editor/editor-host.ts`
- `src/lib/core/markdown-editor/setup/editor-extensions.ts` (lines 36-190)
- `src/lib/core/markdown-editor/extensions/date-shortcut/completion.ts`, `completion.logic.ts`
- `src/lib/core/markdown-editor/extensions/live-preview/core/profiling.ts`
- `src/lib/utils/fuzzy-match.ts`, `src/lib/utils/tag-extraction.ts` (lines 1-8 via grep)
- `src/lib/app/editor-host.ts`
- `src-tauri/src/commands/vault.rs` (lines 633-646), `src-tauri/src/vault/index.rs` (lines 1034-1065)
- `src-tauri/capabilities/composer.json`, `src-tauri/build.rs` (first 40 lines)
- `src/routes/composer/+page.svelte`
- `src/tests/lib/core/markdown-editor/extensions/tag/completion.test.ts`
- `node_modules/@codemirror/autocomplete/dist/index.js` (keymap, lines 2056-2074) and `node_modules/@codemirror/view/dist/index.js` (keymap runner, lines 9253-9312)
