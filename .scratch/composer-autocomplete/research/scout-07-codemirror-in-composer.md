# Scout 07: a minimal CodeMirror EditorView in the composer

Read-only research at HEAD 130d6b8f7. Nothing was built, run or edited. Paths are relative to the repo root.

## Verdict

Feasible with zero edits to editor files. Both completion sources are plain-text detectors that need no markdown language, no syntax tree and no live-preview code. All CodeMirror packages are already dependencies. Reuse is safe if the composer imports the two `completion.ts` files directly and avoids three barrels that drag in the whole editor (listed under "Import hygiene").

The real costs are in the composer page, not in the editor:
1. The textarea-to-CodeMirror swap changes the page's state sync, keyboard handling and styling.
2. The existing page test targets `textarea` and must be rewritten.
3. The composer host needs vault data from the main window, which other scouts cover.

## 1. What the completion sources actually need

### Tag source

- `tagCompletionSource` (`src/lib/core/markdown-editor/extensions/tag/completion.ts:14-41`) uses only:
  - `state.doc.lineAt` and `state.doc.toString()` (:16, :21)
  - `state.facet(editorHost).listTags()` (:26)
  - `reportError` (:28)
- No `syntaxTree` or `ensureSyntaxTree` appears in `extensions/tag/*.ts` or `extensions/wikilink/completion*.ts` (grep, no hits).
- `detectTagContext` (`tag/completion.logic.ts:75-91`) is pure text:
  - It matches `TAG_PREFIX_RE` (:22) against the current line.
  - It strips inline code with `endsInInlineCode` (:41-48).
  - It detects fences and frontmatter by regex in `inFrontmatterOrFence` (:56-71).
- A markdown language extension is therefore not required for tags.

### Wikilink source

- `wikilinkCompletionSource` (`wikilink/completion.ts:43-59`) uses `state.doc.toString()` and `detectWikilinkContext` (`wikilink/completion.logic.ts:26-72`), which is pure text on the current line.
- File mode calls `host.listLinkCandidates(includeNotes)` (`completion.ts:68`). `includeNotes` is true only for a non-empty query. The aliases come from `entry.frontmatter` and `entry.path` (:26-36, :87-93).
- Heading and block-id modes:
  - `[[#...` and `[[#^...` read the composer's own document (:136-137, :188-189) and work without host support.
  - `[[Note#...` and `[[Note#^...` call `host.resolveLink(target)` then `host.readNote(path)` (:15-23).
  - With a NOOP-style `resolveLink` returning null, heading and block-id completion for a named note simply returns null (:16-17, :141, :193). That is a graceful degradation, not an error.
- The `apply` callbacks dispatch `changes` and `selection` on the view (:72-80). That is plain EditorView API.
- They also add `]]` only when the next two characters are not already `]]` (:75-76). That works with or without `closeBrackets()`.

### Other imports of the two files

| File | Imports | Source |
|---|---|---|
| `tag/completion.ts` | `@codemirror/autocomplete` (type only), `../../editor-host`, `../live-preview/core/profiling`, `./completion.logic` | :1-4 |
| `wikilink/completion.ts` | `#lib/core/filesystem/wikilink-resolution.logic.js`, `#lib/utils/fuzzy-match.js`, `#lib/types/vault-v2.types.js` (type), `../../editor-host`, `../live-preview/core/profiling`, `./completion.logic` | :1-12 |

Findings on those imports:
- `profiling.ts` is standalone. Its disabled default means `reportError` falls back to `console.error` and a no-op log (`live-preview/core/profiling.ts:11-38`). A composer needs no `configureProfiling`.
- `editor-host.ts` imports only `@codemirror/state`, plus type-only imports (`editor-host.ts:1-4`).
- `fuzzy-match.ts` has no imports.
- `wikilink/completion.logic.ts` imports `file-entries.logic` (type), `fuzzy-match` and `./navigation.logic` (`completion.logic.ts:1-3`). `navigation.logic.ts` holds only regex constants and pure helpers (:1-20).
- `wikilink-resolution.logic.ts` has a type-only import from contracts (:1).
- No store, service, Tauri, feature or plugin import is reachable. That matches the guard in `src/tests/lib/architecture/markdown-editor-imports.test.ts:15-26` (ADR-0003).

## 2. Minimal extension set

### Required

1. `editorHost.of(composerHost)`.
   - `editorHost` is a static facet with `NOOP_HOST` as the fallback (`editor-host.ts:87-107`).
   - The composer host can be `{ ...NOOP_HOST, listTags, listLinkCandidates }`, and optionally `resolveLink` and `readNote`. That reuses the existing no-op defaults and leaves `editor-host.ts` untouched.
   - `NOOP_HOST.readNote` rejects and the source handles that (`completion.ts:19-23`).
2. `autocompletion({ override: [wikilinkCompletionSource, tagCompletionSource] })`.
   - `activateOnTyping` defaults to true (`node_modules/@codemirror/autocomplete/dist/index.js:377`).
   - `autocompletion()` already bundles its own keymap at `Prec.highest` (`defaultKeymap: true` at :384, `completionKeymapExt` at :2074, included at :2042-2051). Arrow keys, Enter to accept, Esc to close and Ctrl-Space work without adding `completionKeymap`.
   - `closeOnBlur` is left at its default. I did not check what it does when the composer window loses focus.
3. A theme and DOM wiring so the editor fills the flex area, plus the options below.

### Optional, composer-specific

- `EditorView.lineWrapping`, so long lines wrap as the textarea does.
- `placeholder("Quick capture...")` from `@codemirror/view`. It replaces the textarea placeholder (`+page.svelte:208`).
- `EditorView.contentAttributes.of({ spellcheck: "false", "aria-label": ... })`. This matches `+page.svelte:209-210`.
- `history()` and `historyKeymap`. A textarea has native undo and CodeMirror does not, so these are the replacement.
- An Enter binding: `insertNewlineAndIndent` or `insertNewline`. Without a keymap Enter would fall back to DOM-change handling, which is not recommended. This is a design choice, see the risks below.
- `closeBrackets()` is an open question. The editor has it (`editor-extensions.ts:138`), but it auto-pairs quotes and brackets, which is a new typing behavior in the composer.

### Not needed

- `markdownLanguage()`, `syntaxHighlighting` and `highlight-styles.ts`. The latter imports `lang-markdown`, `language-data` and two Lezer extensions (`highlight-styles.ts:1-12`).
- `livePreview`, `wikilinkDecoration`, `calloutDecoration`, `compositionAwareBracketMatching`, `lineNumbers`, `rectangularSelection`, `crosshairCursor` and `highlightActiveLine`.
- `dateShortcutCompletionSource`. It is out of scope, and the editor registers it in the same override list (`editor-extensions.ts:143`).
- Only one `autocompletion()` may exist per state, because the `override` config has no combiner (`editor-extensions.ts:139-141`). That is not an issue for a composer-specific view.

### No-marking-up consequence

With no markdown language and no highlighting, the composer shows plain text, which is what it shows today. `[[links]]` and `#tags` stay uncolored. That is consistent with "no other composer UX changes".

## 3. Dependencies and bundle

### Packages

All needed packages are already in `package.json` (:25-44):

| Package | Version range |
|---|---|
| `@codemirror/autocomplete` | ^6.20.4 |
| `@codemirror/commands` | ^6.11.1 |
| `@codemirror/state` | ^6.7.6 |
| `@codemirror/view` | ^6.43.15 |
| `@codemirror/language` | ^6.13.1 |

Installed versions in `node_modules` match: autocomplete 6.20.4, view 6.43.15, state 6.7.6, commands 6.11.1, language 6.13.1.

`@codemirror/autocomplete` and `@codemirror/commands` depend on `@codemirror/language` and `@lezer/common` (their `package.json`, :29-32). So `@codemirror/language` is pulled in by the autocomplete package either way. It is already a direct dependency of the app. Nothing needs to be added.

### Route and chunk structure

- The composer route is `src/routes/composer/+page.svelte`, a sibling of the `(app)` route group (`ls src/routes`: `(app)`, `+layout.svelte`, `+layout.ts`, `composer`).
- The root layout only imports `app.css` and renders children (`src/routes/+layout.svelte:1-8`). So the composer does not load the main app layout (`(app)/+layout.svelte`).
- `src/routes/+layout.ts:1-5` sets only `ssr = false`, and there is no `prerender`. `vite.config.js` configures adapter-static with `fallback: "index.html"`, so SPA mode serves `/composer` from the fallback. `build_composer_window` loads `WebviewUrl::App("/composer")` (`src-tauri/src/lib.rs:139`).
- The `/composer` page node is a separate Vite chunk. A static import of CodeMirror from `+page.svelte` goes into chunks that the composer page loads. No `import()` is needed for correctness.
- The composer already imports `theme.service.js`, which imports `settings.store.svelte` and `applied-theme.store.svelte` (`theme.service.ts:1-7`, `+page.svelte:6`). So the composer is not a lean bundle today, and CodeMirror view and autocomplete add to it.
- For scale, the unminified dist files are about 496 KB for `view`, 147 KB for `state`, 90 KB for `autocomplete`, 85 KB for `commands` and 97 KB for `language`. Minified and tree-shaken size is UNVERIFIED because I was told not to run a build.
- Shared chunk impact on the main window is UNVERIFIED. CodeMirror is already in the main bundle, so the composer would likely reuse the same chunks.
- A lazy `import()` of the CodeMirror setup would show the textarea first. It is probably not worth the extra moving parts, because the window is hidden and kept alive across summons (`lib.rs:131-134`, `intercept_close_as_hide`).

### Import hygiene (critical)

Do not import any of these from the composer:
- `src/lib/core/markdown-editor/extensions/wikilink/index.ts`. It re-exports `wikilinkDecoration` and `findWikilinkInfoAtPosition` (`index.ts:1-5`).
- `src/lib/core/markdown-editor/setup/index.ts` and `editor-extensions.ts`. They pull the live-preview graph, callouts, `markdownLanguage` and `language-data` (`editor-extensions.ts:20-34`).
- `src/lib/core/markdown-editor/highlight-styles.ts` (`:1-12`).

Import `.../extensions/wikilink/completion` and `.../extensions/tag/completion` directly. The `#lib/...` subpath aliases are in use project-wide. Whether the import graph scanner or `lib-specifier-convention.test.ts` accepts a direct import of an `extensions/...` file is UNVERIFIED.

## 4. What can be reused from `editor-extensions.ts` and `editor-theme.ts`

### `createExtensions`

Not reusable.
- It requires 16 options, including several Compartments, `isTabSwitching`, `copyBlockLink`, renderers and `disabledDecorators` (`editor-extensions.ts:40-89`).
- It installs live preview, a markdown language and `defaultKeymap`.
- The composer should compose its own array from the same primitives and the same two exported sources.

### `buildEditorTheme`

Partly reusable, at a cost.
- Signature: `(fontFamily, fontSize, lineHeight, contentWidth, paragraphSpacing, dark)` (`editor-theme.ts:11-18`).
- It uses the app theme variables `--editor-bg`, `--editor-fg`, `--popover`, `--border`, `--accent` and others. The composer already applies them with `applyStoredTheme()` (`+page.svelte:149, :174`; `theme.service.ts:9-14, :31-38`).
- The tooltip and autocomplete styling is the part worth reusing (`editor-theme.ts:59-80`): `.cm-tooltip`, `.cm-tooltip.cm-tooltip-autocomplete > ul`, and `li[aria-selected]`.
- The editor-specific parts clash with the composer look:
  - `&` gets `backgroundColor: var(--editor-bg)` and `height: 100%` (:26-31). The composer root is a translucent `color-mix` of `--popover` with a blur (`+page.svelte:238-240`), so an opaque editor background would change the look.
  - `.cm-content` gets `padding: 16px clamp(24px, 5vw, 80px)` (:44).
  - The scroller font comes from the editor font settings, whereas the composer hard-codes 14px system sans, line-height 1.5 (`+page.svelte:256-258`).
- If reused, the composer needs a second `EditorView.theme` to override the background and padding. Whether a later theme wins over an earlier one at equal specificity is UNVERIFIED, so test it in a real run.
- The alternative is a small composer-only theme that styles the tooltip with the same variables. That is about 15 lines duplicated from `editor-theme.ts:59-80`. It conflicts with "reuse wherever possible" in spirit, but avoids fighting the editor theme.
- Either way `dark` must be passed. The composer has `appliedThemeStore.isDark`, set by `applyMode` after `applyStoredTheme` (`theme.service.ts:34-38`), or it can read `html.dark`.
- CodeMirror's `baseTheme` for autocomplete is injected by the library itself (`autocomplete/dist/index.js:2049`). The fixed `maxHeight: 10em` list (:1318) and `minWidth: 250px` (:1317) come from it, so the popup renders in the composer without `app.css`.

### Other reusable pieces

- `editorHost` and `NOOP_HOST` (`editor-host.ts:87-107`).
- `fuzzyMatch`, `rankTags`, `matchFilesForWikilink` and the detectors come along with the two sources.
- The data types `VaultTag` and `LinkCandidates` (`editor-host.ts:13-24`).

### What the composer host must supply (data, for other scouts)

- `listTags(): Promise<readonly {name, count}[]>`.
- `listLinkCandidates(includeNotes)` returning `files: FileEntry[]` (`name`, `nameWithoutExt`, `path`; `file-entries.logic.ts:5-9`) and `notes: NoteEntryV2[]`, of which only `path` and `frontmatter` aliases are read (`completion.ts:26-36, :87-93`).
- For reference, the app's version is `src/lib/app/editor-host.ts:123-133`. `listLinkCandidates` is called on every keystroke inside `[[`, so the composer host must cache and refresh per summon (on `qc:open-composer`, `+page.svelte:178-180`).
- The composer capability has no fs access and no vault IPC (`src-tauri/capabilities/composer.json:4-10`). The data source is another scout's topic.

## 5. Risks in swapping the textarea (page-level, not editor-level)

All of these touch only `src/routes/composer/+page.svelte` and its test.

1. **Esc closes the popup and also dismisses the composer.**
   - The page handles Escape on `svelte:window` keydown (`+page.svelte:161-166, :202`). It does not check `defaultPrevented`.
   - CodeMirror's keymap runs first on the content DOM. When `closeCompletion` returns true the view calls `preventDefault` (`view/dist/index.js:4615-4627`). It only calls `stopPropagation` when a binding sets it (:9269-9310), and the completion bindings do not.
   - So the event still reaches the window handler and dismisses the composer. The Esc handler needs an `event.defaultPrevented` check (or a composer keymap entry that stops propagation) so Esc closes the popup first.
2. **Cmd+Enter conflicts with `defaultKeymap`.**
   - `defaultKeymap` binds `Mod-Enter` to `insertBlankLine` (`commands/dist/index.js:1806`). It would insert a blank line before the window handler runs `handleSave`, so the saved text would carry an extra newline.
   - Do not include `defaultKeymap` as is. Bind only what is needed, or filter `Mod-Enter` and `Escape` out as `editor-extensions.ts:160-162` filters `Mod-d`. The `Escape` entry is `simplifySelection` (`commands/dist/index.js:1805`).
   - `completionKeymap` binds plain `Enter` only, so Cmd+Enter is not consumed by an open popup.
3. **Enter accepts a completion while the popup is open.** That is the same as the editor (`autocomplete/dist/index.js:2072`). A user who types `#idea` and presses Enter for a newline gets the highlighted suggestion instead. This is inherent to "behaving like the editor". Flag it to the owner.
4. **Two-way state sync.** The page uses `bind:value={text}` plus a `$effect` draft writer (`+page.svelte:14, :34, :207`) and assigns `text` externally in three places:
   - `resetForShow` (:152)
   - `withoutWritten` (:113, :130)
   - draft restore (:14)
   - An `EditorView` needs an `updateListener` to push edits into `text` and a guarded dispatch to pull external assignments in, with loop protection. `text` is also read synchronously in `handleSave` (:86).
5. **Focus.** `textareaEl?.focus()` at :158 and :175 becomes `view.focus()`. The deferred `queueMicrotask` ordering (:157-158) is untested for CodeMirror.
6. **Window geometry and popup clipping.**
   - The window is 600x240 and not resizable (`lib.rs:143-147`). The body has `overflow: hidden` (`+page.svelte:223-229`).
   - CodeMirror tooltips are position-fixed and clamped to the window viewport (`view/dist/index.js:10404-10405, :10571, :10586-10610`). The list is capped at `10em`.
   - Placement logic: the tooltip flips above or below the cursor, shrinks to the available height, and hides entirely when less than one line height is available (:10597-10604).
   - On a tall text, the popup may be small or flipped above. The popup also overlaps the hint line. This is acceptable but needs a visual check, since the window is only 240 px high.
7. **Drag region.** The root has `data-tauri-drag-region` and the textarea opts out with `data-tauri-drag-region="false"` (`+page.svelte:204, :211`). CodeMirror's internal DOM carries no such attribute, so how Tauri treats clicks on `.cm-editor` is UNVERIFIED (the drag script is in the tauri crate, outside this repo). Add the attribute through `EditorView.editorAttributes` to mirror the textarea.
8. **Existing test.** `src/tests/routes/composer-page.test.ts` selects `textarea` and sets `.value` and dispatches `input` (:60, :138-144, :199-267). It must be rewritten around a CodeMirror view (jsdom). The repo's editor tests already mount real `EditorView`s in jsdom (`editor-extensions.test.ts:1-22`, `test-helpers.ts`), including `startCompletion` and `completionStatus`, so the pattern exists.
9. **Existing completion tests stay valid.** `src/tests/lib/core/markdown-editor/extensions/tag/completion.test.ts` and `completion.logic.test.ts` exist, and the wikilink logic test exists, so zero editor edits means zero editor test edits.
10. **Behavior differences from a textarea.** CodeMirror is contenteditable, so native spellcheck, autocorrect and system text services behave differently. IME composition inside CodeMirror is a known area. The editor guards composition with its own extension (`extensions/composition-aware-bracket-matching.ts`), which is relevant only if `closeBrackets` is added. Paste of rich content is also plain-text-ized by CodeMirror, probably matching the textarea. UNVERIFIED in a real run.
11. **Architecture docs and ADR.** `docs/adr/0028-quick-capture-merge-into-kokobrain.md` lists this feature as out of scope (per the task brief; I did not re-read the ADR). A change would likely need an ADR amendment, and `docs/architecture/overview.md:10` describes the composer entry point.
12. **Layer rules.** The composer route may import `core/` and the plugin layer; the edge from `src/routes/composer` to `core/markdown-editor/extensions/...` is a route importing core, which looks allowed. The `layer-rules.test.ts` result is UNVERIFIED and must be checked at implementation time. Putting the composer host in `plugins/quick-capture` is allowed by structure (`scripts/import-graph.mjs:46-50` lists its one plugin exception, periodic-notes).

## 6. Reuse summary

| Reuse | How | Edits to editor files |
|---|---|---|
| `tagCompletionSource`, `wikilinkCompletionSource` | direct import of the two `completion.ts` files | none |
| `editorHost` facet, `NOOP_HOST` | `editorHost.of({ ...NOOP_HOST, ... })` | none |
| Detectors and ranking (`completion.logic.ts`) | come with the sources | none |
| `autocompletion()` and its keymap | library built-in | none |
| Tooltip theme rules | either reuse `buildEditorTheme` plus overrides, or duplicate about 15 lines | none |
| `createExtensions`, live preview, markdown language | do not reuse | none |

## 7. Open questions

1. Should the composer include `closeBrackets()`? It matches the editor but adds auto-pairing of quotes and brackets, which the textarea never had. The wikilink `apply` works either way (`wikilink/completion.ts:75-76`).
2. Should the Enter-accepts-completion behavior stay as in the editor (recommended), or be gated? Gating would mean not reusing `completionKeymap` as is.
3. Does a later `EditorView.theme` override an earlier one at equal specificity? This decides between theme reuse and a small composer-only theme.
4. Does Tauri treat clicks inside CodeMirror's DOM as drag-region clicks? Check the tauri crate's drag script, which lives outside this repo.
5. Will the owner accept a textarea-to-contenteditable swap, given the differences in section 5 (spellcheck, IME, paste)? This is the only part of the feature that changes baseline composer behavior beyond completion.
6. Does `layer-rules.test.ts` or `lib-specifier-convention.test.ts` accept a route importing `core/markdown-editor/extensions/...` directly? Run at implementation time.
7. Minified bundle delta for `/composer` and any effect on shared chunks (UNVERIFIED, needs a build).
