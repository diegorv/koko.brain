# Validation group 4: scouts 07, 08, 10

Adversarial check at HEAD 130d6b8f7 (working tree clean when checked). Read-only: nothing was built, run or edited. Library versions read from `node_modules`: `@codemirror/view` 6.43.15, `@codemirror/autocomplete` 6.20.4, `@codemirror/commands` 6.11.1, `@codemirror/state` 6.7.6, `@codemirror/language` 6.13.1, `style-mod` 4.1.4.

## Overall verdict

All three scouts reach the correct main conclusions:
- A CodeMirror view in the composer can reuse `tagCompletionSource` and `wikilinkCompletionSource` unchanged, with zero editor edits.
- A textarea can reuse only the pure detectors and rankers.
- The tooltip renders inside the 600x240 window.

Their errors are wrong line references and three wrong statements:
- the `composition-aware-bracket-matching` claim (scout 07)
- the barrel import advice (scout 10)
- the "one plugin exception" claim (scout 07)

Several items they left UNVERIFIED can be settled from the source (section 4). The gaps that matter most for the design are in section 5.

## 1. Scout 07 (CodeMirror in the composer)

### Confirmed

- Neither source needs a syntax tree or a markdown language. The tag source uses `doc.lineAt`, `doc.toString` and `facet(editorHost).listTags()` (`tag/completion.ts:15-29`). The detector is pure text (`tag/completion.logic.ts:56-89`).
- The wikilink source reads only the current line (`wikilink/completion.logic.ts:26-72`). `includeNotes` is `query.length > 0` (`wikilink/completion.ts:68`).
- `[[Note#` and `[[Note#^` return null when `resolveLink` returns null (`completion.ts:15-17`, `:141`, `:193`). `[[#` reads the view's own document (`:135-137`, `:187-189`).
- `editorHost` is a static facet that falls back to `NOOP_HOST` (`editor-host.ts:87-107`). `editor-host.ts` imports only `@codemirror/state`, plus type-only imports (`:1-4`).
- `profiling.ts` defaults to a disabled port, and `reportError` only does `console.error` (`profiling.ts:9-39`).
- Autocomplete defaults (`autocomplete/dist/index.js`):
  - `activateOnTyping: true` (:377) and `defaultKeymap: true` (:384).
  - `completionKeymapExt` is `Prec.highest` and is bundled by `autocompletion()` (:2042-2051, :2074).
  - Enter maps to `acceptCompletion` (:2072).
- Esc analysis is correct:
  - The keymap runs as a `domEventHandlers` keydown handler (`view/dist/index.js:9149-9151`). A true return calls `preventDefault` (`:4621-4625`).
  - `stopPropagation` runs only when the binding sets it (`:9267-9268`, `:9306-9307`), and the completion bindings do not.
  - So the `svelte:window` handler (`+page.svelte:161-166`, `:202`) still dismisses the composer.
- Cmd+Enter analysis is correct. `defaultKeymap` binds `Mod-Enter` to `insertBlankLine` and `Escape` to `simplifySelection` (`commands/dist/index.js:1805-1806`).
- `createExtensions` cannot be reused. It uses compartments, live preview and `markdownLanguage()` (`editor-extensions.ts:127-195`).
- Barrel hygiene is correct:
  - `extensions/wikilink/index.ts:2-3` re-exports the decoration.
  - `setup/index.ts:2` re-exports `createExtensions`.
  - `highlight-styles.ts:1-12` pulls `lang-markdown`, `language-data` and Lezer.
- The page line references are all correct: `+page.svelte` :14, :34, :86, :113, :130, :152, :158, :175, :204, :207-211, :223-229, :238-240, :256-258.
- Window: `lib.rs:139` and `:143-148`, with close-as-hide at `:151` (its doc comment is at `:131-134`).
- The dist sizes match exactly: view 495588, state 147400, autocomplete 90056, commands 84624, language 97134 bytes.
- The test pattern exists. `tag/completion.test.ts:5-37` mounts `autocompletion()` with `editorHost.of({...NOOP_HOST, listTags})` and imports the source directly.

### Refuted or wrong

1. **`composition-aware-bracket-matching` "relevant only if `closeBrackets` is added"** is wrong. The file replaces CodeMirror's `bracketMatching()`, not `closeBrackets` (`extensions/composition-aware-bracket-matching.ts:5-7`). It fixes a WKWebView dead-key composition bug that is triggered by bracket-match decorations. The rule for the composer is therefore: do not add `bracketMatching()`.
2. **"`scripts/import-graph.mjs:46-50` lists its one plugin exception, periodic-notes"** is wrong. `PLUGIN_ALLOWLIST` has four entries (`import-graph.mjs:46-51`): calendar, one-on-one, quick-capture and mods. Only quick-capture's own entry is periodic-notes (`:50`).
3. **"`createExtensions` requires 16 options"** is wrong. `CreateExtensionsOptions` has 18 fields (`editor-extensions.ts:40-89`).
4. **Wrong `editor-theme.ts` line references**:

   | Item | Scout's ref | Correct ref |
   |---|---|---|
   | signature | :11-18 | :12-19 |
   | `&` background and height | :26-31 | :22-27 |
   | `.cm-content` padding | :44 | :39 |
   | tooltip rules | :59-80 | :69-89 |

   The content is described correctly.
5. **Other small reference errors**:
   - `detectTagContext` is `:75-89`, not `:75-91`.
   - `FileEntry` is `file-entries.logic.ts:4-8`, not `:5-9`.
   - The editor-extensions imports are `:19-30`, not `:20-34`.
   - `editor-extensions.ts:160-162` filters `Mod-d` out of `searchKeymap`, not out of `defaultKeymap`. Fine as an analogy, but it is a different keymap.
6. **"Enter accepts while the popup is open"** is incomplete. `acceptCompletion` returns false for the first `interactionDelay` (75 ms) after the list opens (`autocomplete/dist/index.js:1096-1100`, `:393`). A fast `#idea` + Enter can therefore still insert a newline. The editor does the same, so parity holds, but the claim overstates it.

## 2. Scout 08 (textarea alternative)

### Confirmed

- The pure functions and their line references are correct:
  - `detectTagContext` `:75-89`, `rankTags` `:96-102`
  - `detectWikilinkContext` `:26-72`, `matchFilesForWikilink` `:75-90`, extractors `:93-114`
  - `fuzzyMatch` `fuzzy-match.ts:8-41`
- `tag/completion.logic.ts` imports only `fuzzy-match`. `wikilink/completion.logic.ts` has a type-only `FileEntry` import, `fuzzy-match` and `navigation.logic`, and `navigation.logic` is regex constants and pure helpers.
- The `]]` rule is at `wikilink/completion.ts:75-81`. Alias insertion (`Note|alias`) is at `:100-108` and runs only for a non-empty query (`:86`).
- Kanban precedent: `KanbanWikilinkSuggestions.svelte` imports the logic (:2-3) and caps at 8 (:19). Keys are handled at :42-68, Esc changes no state (:58-60), and Tab accepts (:61-63).
- Kanban caret tracking uses only `oninput`/`onclick` (`KanbanCard.svelte:184-185`).
- The Kanban accept always writes `[[name]]` over `bracketStart..cursorPos` (`KanbanCard.svelte` `handleWikilinkSelect`). So `[[Pro|]]` becomes `[[Projects]]]]`.
- `KanbanWikilinkSuggestions.test.ts` (44 lines) uses the real `fsStore`.
- Tag and wikilink overlap: `[[a #b` matches both detectors (`TAG_PREFIX_RE` `:22`, heading branch `wikilink/completion.logic.ts:39-64`). `[[#b` matches only the wikilink detector, because `#` after `[` fails `(?:^|\s)`.
- ARIA from CodeMirror: `role=listbox`, `aria-expanded` (`autocomplete/dist/index.js:696-697`), `aria-autocomplete`, `aria-activedescendant` (`:935-945`).
- `selectionStart` appears only in the three Kanban files. `package.json` has no caret-coordinates dependency, which settles open question 5.
- The ADR says "requires CodeMirror swap + IPC" (`docs/adr/0028-quick-capture-merge-into-kokobrain.md:68`). The textarea option departs from the ADR's own expected design, which an ADR amendment should state.
- The hybrid is less speculative than the scout says. `tag/completion.test.ts:30-37` already calls the unmodified source headlessly, with `EditorState.create({ extensions: editorHost.of(host) })` and `new CompletionContext(state, pos, explicit)`. `CompletionContext` documents `view` as optional (`autocomplete/dist/index.js:8-37`).

### Refuted or incomplete

1. **"Reuses option building... ranking of alias hits"** is a trap for any rewrite. With `filter: false`, CodeMirror ignores `boost`: each option gets `1e9 - options.length` (`autocomplete/dist/index.js:787-790`), and `boost` is added only on the filtering path (`:798`).
   - In the editor, file options therefore always come first, in `matchFilesForWikilink` order, followed by alias options in note-iteration order.
   - A textarea or hybrid that "ranks alias hits" by `boost`/score would diverge from the editor.
2. **Merge order is not mentioned.** CodeMirror concatenates active sources in `override` order with descending scores, then sorts stably (`:784-790`, `:827`). In the editor, wikilink options come before tag options. A textarea or hybrid must reproduce that precedence rather than "pick one".
3. **Rendered window not mentioned.** CodeMirror renders at most 100 rows, as a window around the selected row (`maxRenderedOptions: 100`, `:383`, `:521`). An empty `[[` lists every file sorted (`completion.logic.ts:76-78`), so a hand-built list needs a cap or virtualization.
4. **The hybrid's tag `apply`.** Tag options have no `apply` (`tag/completion.ts:38`), so CodeMirror's default insert applies. A hybrid needs its own `from..to` replace for tags. Only the wikilink options carry `apply` closures. Note also that those closures read the captured `state`, not `view.state` (`wikilink/completion.ts:75`, `:101`).
5. **IPC reachability.** The scout's "UNVERIFIED" can be narrowed with in-repo evidence:
   - The composer already invokes the app commands `dismiss_composer` and `submit_composer_capture` (`+page.svelte:77`, `:102`).
   - `composer.json:6-10` grants no permission for them, and `build.rs` calls plain `tauri_build::build()` with no app manifest.
   - So app commands are not capability-gated per window here.
   - `get_all_tags_v2` has no window check (`src-tauri/src/commands/vault.rs:636-645`).
   - One conflict remains: the capability description says "no other IPC" (`composer.json:4`), and that text would need updating.

## 3. Scout 10 (theme and tooltip)

### Confirmed

- Tooltip styling lives only in `buildEditorTheme` (`editor-theme.ts:69-89`). `cm-tooltip` appears only there and in its test, there is no `tooltips(` call in `src`, and `app.css` has no `.cm-` selectors.
- The rule references `:22-27`, `:31-36`, `:37-46`, `:55-57`, `:61-65` and `:91` are correct.
- Three callers: `MarkdownEditor.svelte:235` and `:711`, plus `editor-extensions.ts:169`.
- The composer loads `app.css` through `src/routes/+layout.svelte:2`. The `--popover`, `--accent` and `--border` values are at `app.css:160-172`, the `@theme static` radius and shadow blocks at `app.css:109-130`, and `--elev-*` at `:205-209`.
- Theme service: `applyStoredTheme` (`theme.service.ts:54-68`), `setRootVars` (`:16-21`), `applyMode` with `setDark` (`:30-37`).
- The tooltip defaults match the code:
  - fixed position, `parent: null`, `windowSpace` (`view/dist/index.js:10383-10408`)
  - container is `view.dom` (`:10444-10451`)
  - Safari kludge and offsetParent detection (`:10528-10541`)
  - horizontal clamp, flip, shrink, and hide below one line height (`:10597-10618`)
- Autocomplete base theme: monospace font, `maxHeight: 10em`, `minWidth: 250px`, `height: 100%` (`autocomplete/dist/index.js:1309-1338`). There is no `resize` key in autocomplete.
- Neither source sets `info` (grep finds no hits), so no info panel opens.
- The Esc / `stopPropagation` worry is confirmed, using the code cited in section 1.

### Refuted or wrong

1. **Reuse option 1 and item 5 import `buildEditorTheme` "via `setup/index.ts:1`" (`#lib/core/markdown-editor/setup`).** That barrel also re-exports `createExtensions` (`setup/index.ts:2`), whose module graph pulls live preview, `markdownLanguage`, `language-data` and callouts (`editor-extensions.ts:19-30`). Scout 07 rightly says to avoid that barrel. Import `#lib/core/markdown-editor/setup/editor-theme.js` directly instead: it imports only `@codemirror/view`, a state type and `utils/font-stacks` (`editor-theme.ts:1-4`).
2. **"Which of two themes wins: UNVERIFIED"** can be settled (section 4).
3. **"`file` icon rule UNVERIFIED"** can be settled. Autocomplete's base theme defines `.cm-completionIcon-*` for function, method, class, interface, variable, constant, type, enum, property, keyword, namespace and text, but not `file` (`autocomplete/dist/index.js:1390-1431`). No `completionIcon` rule exists in `src`. Wikilink rows therefore show an empty icon slot, the same as in the editor.

## 4. UNVERIFIED items settled from source

| Item | Answer | Evidence |
|---|---|---|
| Does a later `EditorView.theme` override an earlier one? (scouts 07 and 10) | **No, the earlier one (higher precedence) wins.** `mountStyles` mounts `styleModules.concat(baseTheme).reverse()`. style-mod gives later-mounted modules precedence, so the first facet value wins. A composer override must come **before** `buildEditorTheme` in the extension array, or be wrapped in `Prec.high`/`Prec.highest`. | `view/dist/index.js:8380-8383`; `style-mod/src/style-mod.js:73-75`, `:107-128`; `EditorView.theme` builds `[theme.of(prefix), styleModule.of(...)]` at `view/dist/index.js:8829-8835` |
| Does CodeMirror `stopPropagation` on handled keys? (scout 10) | No, unless the binding sets `stopPropagation`. | `view/dist/index.js:9264-9268`, `:9306-9307` |
| Do `layer-rules.test.ts` and the import scanner accept `src/routes/composer` importing `core/markdown-editor/extensions/...`? (scout 07) | `src/routes` is not scanned, so the layer rules cannot fail on it. A composer host under `src/lib/plugins/quick-capture/` importing core is plugins to core, which is allowed. | `scripts/import-graph.mjs:152-154`, `:29` (`LIB = 'src/lib'`) |
| Does `lib-specifier-convention.test.ts` accept a direct import? (scout 07) | Yes, when it has the `.js` extension, as in `#lib/core/markdown-editor/extensions/tag/completion.js`. | `lib-specifier-convention.test.ts:8-21`; precedent `tag/completion.test.ts:15` |
| Caret-coordinates dependency? (scout 08) | None. | `package.json` has no "caret"; `selectionStart` appears only in the three Kanban files |
| Tauri drag region inside `.cm-editor` (scout 07) | Still UNVERIFIED. The drag script lives in the tauri crate, outside the repo and `node_modules/@tauri-apps`, where grep finds no "drag-region". From memory (UNVERIFIED): Tauri 2 checks the attribute on the event target itself, so children of `.composer-root` would not drag. | none in repo |
| Bundle delta for `/composer` | Still UNVERIFIED (needs `pnpm build`, which was forbidden). | |

## 5. Gaps the scouts missed

1. **`standardKeymap` exists.** `@codemirror/commands` exports `standardKeymap`, which has Enter, Backspace, arrows, Home/End and Mod-a but no `Mod-Enter` and no `Escape` (`commands/dist/index.js:1743-1767`). `defaultKeymap` is that list plus extras (`:1817`). The composer can use `standardKeymap` with `historyKeymap` and needs no filtering, which settles scout 07's Cmd+Enter risk.
   - Caveat: its Enter is `insertNewlineAndIndent`, which with no language falls back to the line's indentation. A textarea does not carry indentation, so `{ key: 'Enter', run: insertNewline }` placed ahead of it would be closer to the textarea.
   - The `insertNewlineAndIndent` fallback is from memory, UNVERIFIED.
2. **Esc is also swallowed while a query is pending.** `closeCompletion` returns true whenever any source is not inactive, including pending, not only when the list is visible (`autocomplete/dist/index.js:1116-1122`).
   - With the proposed `defaultPrevented` check, an Esc pressed within the 100 ms typing delay (`:378`), or while the composer host awaits IPC, closes the pending query and leaves the composer open. A second Esc is then needed.
   - This is minor, but it belongs in the key-handling test plan.
3. **A rejected `listLinkCandidates` closes all completion.** The wikilink file branch does not catch it (`wikilink/completion.ts:68`). CodeMirror then dispatches `closeCompletionEffect` and `logException` (`autocomplete/dist/index.js:1207-1215`), which also closes tag results.
   - The composer host's IPC-backed `listLinkCandidates` and `listTags` should resolve to empty on failure, as `NOOP_HOST` does.
   - Note that `listTags` failure is caught (`tag/completion.ts:25-30`); only the wikilink path is not.
4. **CodeMirror's default content attributes change composer typing.** `contentDOM` defaults to `spellcheck:false`, `autocorrect:off`, `autocapitalize:off`, `writingsuggestions:false` and `translate:no` (`view/dist/index.js:8339-8344`). The textarea sets only `spellcheck="false"` (`+page.svelte:209`).
   - So the swap turns off macOS autocorrect, auto-capitalize and Writing Tools suggestions in the composer.
   - This is a user-visible change under hard constraint 3. Restore them with `EditorView.contentAttributes` if parity with the textarea is wanted.
   - Scout 07 lists `spellcheck` as something to add, but it is already the default.
5. **A composer-local theme must reset two things `buildEditorTheme` handles.**
   - CodeMirror's base theme draws a dotted focus outline on `&.cm-focused` (`view/dist/index.js:6874-6884`). The editor removes it at `editor-theme.ts:28-30`.
   - `body { user-select: none }` (`app.css:498`) is reset only by the editor's `.cm-content { userSelect: 'text' }` (`editor-theme.ts:40`). A textarea is a form control and was never affected.
   - Scouts 07 and 08 miss both. Scout 10 notes the second only in passing.
6. **The `dark` default is wrong when no theme is stored.** `appliedThemeStore.isDark` starts `true` (`applied-theme.store.svelte.ts:4`). `applyStoredTheme` returns early when localStorage has no theme (`theme.service.ts:59-61`), leaving `html` without `.dark`, so the light `:root` defaults apply (`app.css:155`, `:215`).
   - Passing `isDark` to `buildEditorTheme` would then pick CodeMirror's dark base theme over light CSS vars.
   - This is an edge case, because the main window normally mirrors the theme first (`theme.service.ts:76-87`).
7. **Dead-key composition is a known WKWebView risk in this repo.** The editor documents a real CodeMirror dead-key bug on WKWebView (`composition-aware-bracket-matching.ts:9-24`), and the owner types accented text (Portuguese example in the same comment). A CodeMirror composer needs a manual dead-key check, and it must not add `bracketMatching()`.
8. **No source-level test of `wikilinkCompletionSource` exists.** `src/tests/.../extensions/wikilink/` has only logic, decoration and navigation tests. Its integration coverage is `setup/editor-extensions.test.ts:99-102`, through `createExtensions`. A composer that relies on the wikilink `apply` (`]]` rule, `Note|alias`) through a minimal extension set has no existing test of that path, so the composer's own tests must cover it.

## 6. Net effect on the decision

- The CodeMirror path (scout 07) stays the strongest reuse option, with zero editor edits. Its real costs are all on the composer page:
  - Esc and `defaultPrevented` handling
  - the keymap choice (`standardKeymap`)
  - a theme ordered before `buildEditorTheme`, or a local theme that resets outline and user-select
  - content attributes restored for textarea parity
  - draft sync
  - a rewritten page test
- The textarea path (scout 08) must reproduce three CodeMirror behaviors to match the editor: no boost ranking, wikilink-before-tag merge order, and the `]]` rule.
- The hybrid's source call is proven by an existing test (`tag/completion.test.ts:30-37`). The popup and keys are still its own work.
