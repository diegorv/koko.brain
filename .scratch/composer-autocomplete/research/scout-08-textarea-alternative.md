# Scout 08: keep the textarea, build a dropdown over the pure logic

Read-only research at HEAD 130d6b8f7. Nothing was executed (no tests, no build). Paths below are relative to the repo root `/Users/diegorv/Dev/pet-projects/koko/brain`.

## Verdict in four lines

1. The four pure functions are directly reusable from a textarea with zero editor edits: they take `(docText, pos)` and plain arrays, and import only `utils/` and `core/filesystem/*.logic` (`tag/completion.logic.ts:1`, `wikilink/completion.logic.ts:1-3`).
2. Everything else the editor completion does (option building, `]]` handling, aliases, ranking of alias hits, keymap, popup, ARIA) lives in `completion.ts` + CodeMirror and is NOT reusable from a textarea; it would be rewritten (about 60 to 80 lines of logic plus about 100 lines of Svelte).
3. A precedent exists in this repo: `src/lib/plugins/kanban/KanbanWikilinkSuggestions.svelte` already does exactly "textarea + `detectWikilinkContext` + `matchFilesForWikilink`". It is the template, but it has defects that must not be copied (see section 4).
4. There is a third path that reuses MORE than the textarea option and still edits nothing in the editor: call the existing `tagCompletionSource` / `wikilinkCompletionSource` headlessly (see section 6). It is UNVERIFIED at runtime and hacky; flagged for the orchestrator to weigh.

## 1. What is reusable as-is (pure, no framework)

| Function | Location | Notes |
|---|---|---|
| `detectTagContext(docText, pos)` | `src/lib/core/markdown-editor/extensions/tag/completion.logic.ts:75-89` | Returns `{from,to,query}`. Reads the whole text for frontmatter and fences (`:56-68`). Handles `foo#` and heading `# ` rejection via `TAG_PREFIX_RE` (`:22`). `to` extends past the cursor over tag characters (`:86-88`), so accepting inside `#pro|ject` replaces the whole name. |
| `rankTags(query, tags)` | `tag/completion.logic.ts:96-102` | Fuzzy score, then count desc, then name. Generic over `{name,count}`. |
| `detectWikilinkContext(docText, pos)` | `wikilink/completion.logic.ts:26-72` | Modes `file` / `heading` / `blockId`. Single-line only (`lastIndexOf('\n')` at `:27`). |
| `matchFilesForWikilink(query, files)` | `wikilink/completion.logic.ts:75-90` | Empty query returns all files sorted by name (`:76-78`); otherwise fuzzy. Takes `FileEntry[]` (`{name,nameWithoutExt,path}`, `core/filesystem/file-entries.logic.ts:4-8`). |
| `fuzzyMatch` | `src/lib/utils/fuzzy-match.ts:8-41` | Used by the two above. |
| `extractHeadingsFromContent`, `extractBlockIdsFromContent` | `wikilink/completion.logic.ts:93-114` | Pure, but need the target note's text, which the composer cannot read (see below). |

Imports check: `tag/completion.logic.ts` imports only `fuzzy-match`; `wikilink/completion.logic.ts` imports a type from `core/filesystem/file-entries.logic.js`, `fuzzy-match`, and `./navigation.logic` (which has no imports of its own beyond what the grep returned empty for, so it is also pure). None import `@codemirror/*`, stores or Tauri. The composer route can import them without pulling the editor.

Layer note (CLAUDE.md layer rules): a composer component under `src/lib/plugins/quick-capture/` importing `core/markdown-editor/extensions/*/completion.logic.js` is `plugins -> core`, which is allowed direction. `KanbanWikilinkSuggestions.svelte:2-3` already imports the same file from `plugins/kanban`, so the pattern is accepted.

## 2. What is NOT reusable and must be written for the textarea

Everything in `completion.ts` is bound to `CompletionContext`, `state.facet(editorHost)` and `view.dispatch`:

- Tag source: `tag/completion.ts:14-41`. The non-logic part is small: guard "no `#` before cursor" (`:19`), call detector, fetch tags, rank, map to `{label,type:'keyword'}`, `filter:false`. Accepting uses CM default apply (replace `from..to` with label); no trailing space is added, so a textarea apply is `text.slice(0,from) + name + text.slice(to)` with the cursor at `from + name.length`.
- Wikilink file source: `wikilink/completion.ts:62-124`. Custom `apply` inserts `label + ']]'` unless the two characters after `to` are already `]]` (`:75-81`). Alias options insert `Note|alias` plus the same `]]` rule (`:100-108`) and are only built when the query is non-empty (`:86`).
- Heading and block-id modes: `wikilink/completion.ts:127-228`. They need `host.resolveLink` + `host.readNote` (`:15-24`). The composer has no filesystem capability (`src-tauri/capabilities/composer.json:6-10`: only `core:default`, `allow-hide`, `allow-set-focus`) and no link resolution. A textarea alternative would simply omit these two modes (the editor offers them; the composer would not). This is a behavior gap vs "behaving like the main editor"; the owner scoped "tags and wikilinks", and the ADR calls only "`[[` autocomplete" out of scope (`docs/adr/0028-quick-capture-merge-into-kokobrain.md:68`). Open question 2.
- Popup, selection state, keymap, scroll-into-view, a11y attributes, mouse handling: all CM-internal in the editor.

So "reuse" in the textarea option means reusing the detectors and rankers (roughly 190 of the 486 lines across the four completion files: both `.logic.ts` files minus the heading/blockId extractors), not the completion sources themselves.

## 3. Data source (shared by both options, outside this topic but it sizes the work)

The composer webview cannot read `vaultStore` / `fsStore` (ADR 0028:47, `:63`). `EditorHost.listTags()` and `listLinkCandidates()` are implemented in `src/lib/app/editor-host.ts:96-111` (tags via `call('get_all_tags_v2')`), `:128-133` (files from `fsStore.fileTree`, notes from `getVaultEntries()` -> `call('get_all_vault_entries_v2')`, `src/lib/core/vault/vault-entries.service.ts:27`).

- Tags: `get_all_tags_v2` takes only `VaultIndexState` (`src-tauri/src/commands/vault.rs:638-647`), no vault path argument and no window dependency. UNVERIFIED that a second webview may invoke it: `src-tauri/build.rs` has no `AppManifest` / command restriction (read lines 1-40), which in Tauri 2 normally means app commands are callable from every window, but the capability file for the composer is not enough proof on its own. Needs a check by whoever owns the IPC topic.
- Files for `matchFilesForWikilink`: the main window builds them from `fsStore.fileTree`, not from IPC. A composer-side file list needs either `get_all_vault_entries_v2` (names derivable from `NoteEntryV2.path`, and it also carries frontmatter aliases) or a new bridge. `isLinkTargetFile` filtering of `.view` files (`editor-host.ts:80,131`) would have to be repeated.

Both of those cost the same under either option.

## 4. The in-repo precedent, and defects not to copy

`src/lib/plugins/kanban/KanbanWikilinkSuggestions.svelte` (91 lines) + its host in `KanbanCard.svelte:61-90,178-196`:

- Reuses `detectWikilinkContext` (`:23`) and `matchFilesForWikilink` (`:29`); file mode only (`:24`); caps at 8 (`:19`); key handling for ArrowUp/Down/Enter/Tab/Escape (`:42-68`); mouse via `onmousedown` with `preventDefault` so the textarea keeps focus (`:84`).
- Popup placement: `absolute left-0 right-0 mt-1` under the whole textarea (`:80`). No caret positioning.
- Caret tracking: only `oninput` and `onclick` update `cursorPos` (`KanbanCard.svelte:184-185`). There is no `onkeyup` / `onselect` / `onkeydown` update, so arrow-key caret moves leave `cursorPos` stale and the suggestions follow the old position. Confirmed by reading those two handlers; not reproduced.
- Escape: returns `true` and calls `preventDefault` but changes no state (`:58-60`), while visibility is a pure `$derived` of text and caret (`:23-32`), so the popup stays open after Esc. A composer must add a "dismissed until the query changes" flag.
- Accept: `KanbanCard.svelte:79-86` always writes `[[name]]` and replaces `bracketStart..cursorPos`; it does not look at an existing `]]` after the caret, so `[[Pro|]]` becomes `[[Projects]]]]`. The editor avoids this (`wikilink/completion.ts:75-81`). The `]]` rule would need to be ported.
- No ARIA: buttons in a div, no `listbox`/`option`, no `aria-activedescendant`.
- Its test `src/tests/lib/plugins/kanban/KanbanWikilinkSuggestions.test.ts:1-44` mounts the real component with the real `fsStore`, which is the style CLAUDE.md wants (no store mocking).

## 5. Estimate for the textarea alternative

Reading `src/routes/composer/+page.svelte` (277 lines): a single `<textarea>` at `:205-212` bound to `text` (`:14`), window-level keydown at `:202` that handles Escape (dismiss, `:162-166`) and Cmd/Ctrl+Enter (save, `:167-170`). All composer edits stay in the composer; no editor file changes.

Pieces and rough size (my estimates, not measured):

| Piece | Lines | Notes |
|---|---|---|
| Pure `composer-completion.logic.ts`: given `(text, caret, tags, files)` return `{items, from, to}` and an `applyItem(text, item)` returning `{text, caret}` | 50 to 80 | Tag-first vs wikilink-first priority, `]]` rule, cap rows. Uses the four reused functions. Testable without DOM. |
| Svelte popup + state (selected index, dismissed flag, caret tracking) | 80 to 120 | Could be a child component like Kanban's, or inline in `+page.svelte`. |
| Keyboard integration | 20 to 30 | See below. |
| Data bridge for tags and files | IPC-topic dependent | Same for CM. |
| Caret-anchored positioning (optional) | 35 to 50 | Mirror-div measurement. No helper exists in the repo (grep for `getCaretCoordinates`, `textarea-caret`, `selectionStart` in `src` finds only the three Kanban files; `package.json` has no such dependency as far as the grep of `@codemirror/autocomplete` line showed; I did not list all deps, so a dependency could exist: UNVERIFIED). |
| Tests (`composer-page.test.ts` additions plus logic test) | 120 to 200 | Existing page test at `src/tests/routes/composer-page.test.ts` already drives the textarea, so it keeps working untouched in this option. |

Total new code: about 150 to 230 lines without caret positioning, about 190 to 280 with it, plus tests.

### Keyboard handling

Today the window handler maps Escape to `dismiss()` and Cmd+Enter to save (`+page.svelte:161-171`). With a popup:

- Escape must close the popup first and only dismiss the composer when no popup is open. Because the window listener sees the event after the textarea, the popup handler must run on the textarea and call `stopPropagation`, or the window handler must consult popup state. Either is a small change in `+page.svelte:161-166`. Getting this wrong makes Esc discard the capture window while the user only wanted to close the list.
- Enter and Tab accept only while the popup is open and there is a selection; otherwise Enter inserts a newline as today. The editor accepts on Enter only (`node_modules/@codemirror/autocomplete/dist/index.js:2063-2073`: Ctrl-Space, Alt-` / Alt-i on mac, Escape, ArrowUp/Down, PageUp/Down, Enter). Tab is NOT in CM's keymap; the editor binds Tab to `indentWithTab` (`editor-extensions.ts:~166`). Kanban accepts on Tab too (`KanbanWikilinkSuggestions.svelte:61-63`). To match the editor, accept on Enter only and leave Tab alone (open question 3).
- Cmd/Ctrl+Enter must keep saving even with the popup open. In CM, `Enter` with modifiers does not match the bare `Enter` binding, so the same holds there.
- IME: check `event.isComposing` before treating Enter as accept; Kanban does not (`:42-68`). CM guards IME internally. Not reproduced.
- ArrowUp/ArrowDown in the textarea normally move the caret between lines; only intercept while the popup is open.
- Caret movement without typing (arrow keys, click, Home/End) must recompute from `selectionStart`; listen to `input`, `click`, `keyup`, `select`, not only `input` and `click` as Kanban does (see section 4).
- Draft restore and re-summon: `resetForShow()` sets `text = readDraft()` (`+page.svelte:146-159`); popup state and the dismissed flag must be reset there too or a stale popup shows on the next summon.

### Caret positioning in a textarea

A `<textarea>` exposes no caret rectangle. Options:

1. Mirror div: copy the textarea's computed font, padding, border, `white-space: pre-wrap`, `word-wrap`, width into an offscreen div, put `text.slice(0, caret)` plus a marker `<span>`, read the span's `offsetLeft/offsetTop`, subtract `scrollTop`. About 35 to 50 lines; fragile with fonts, wrapped long words, and scroll. The composer textarea has simple styling (`+page.svelte:249-259`, 14px, line-height 1.5, system font), which keeps the mirror straightforward.
2. Fixed anchor (Kanban style): a list pinned under the text area or just above the hint row. Zero measurement code, never wrong, but not "at the caret".
3. Window geometry constraint that applies to either: the composer window is 600x240, not resizable, transparent (`src-tauri/src/lib.rs:135-146`) and the root has `overflow: hidden` (`+page.svelte:223-229`). The textarea is `flex:1` inside 14px/10px padding plus a hint row, so it is roughly 190 px tall. A dropdown with 8 rows of about 28 px (Kanban's `py-1.5 text-sm`) is about 224 px and cannot fit below the caret inside the window; it would be clipped by the window, since a webview cannot draw outside its native window. A caret-anchored popup therefore needs flip-above logic and a row cap of about 4 to 5, or it overlays the text area. Option 2 with a cap of 5 rows fits more reliably. This is a design constraint for the CM option too (CM's tooltip is positioned in the same viewport; whether it clips or flips inside a 240 px overflow-hidden body is UNVERIFIED).

### Accessibility

Textarea alternative: must be built by hand: container `role="listbox"`, rows `role="option"` with `aria-selected`, `id`s, and on the textarea `aria-controls`, `aria-activedescendant`, `aria-autocomplete="list"`, `aria-expanded`. The textarea already has `aria-label="Quick capture composer"` (`+page.svelte:210`). Whether `role="combobox"` is valid on a multi-line `<textarea>` is UNVERIFIED (ARIA 1.2 combobox normally wraps a single-line textbox); the safer pattern is keeping the textarea a textbox and adding `aria-controls`/`aria-activedescendant` plus a live region announcing result count. CodeMirror provides `role=listbox`, `aria-expanded`, `aria-autocomplete="list"` and `aria-activedescendant` out of the box (`node_modules/@codemirror/autocomplete/dist/index.js:696-697,935-945`), so CM wins here with zero code.

## 6. Comparison with the CodeMirror option (reuse vs from scratch)

| Aspect | Textarea + pure logic | CodeMirror in composer | Headless sources hybrid (unverified) |
|---|---|---|---|
| Editor files edited | none | none needed | none |
| Reuses detectors and rankers | yes | yes (via the sources) | yes |
| Reuses option building and `apply` (`]]`, alias `Note\|alias`) | no, rewritten (about 60 lines) | yes | yes |
| Reuses `autocompletion` UI, keymap, ARIA | no | yes | no (own popup) |
| Heading and block-id modes | dropped (no `readNote` in composer) | host returns null/rejects, same drop unless host implements them | same as CM |
| Alias suggestions | needs note entries with frontmatter; own code | via `listLinkCandidates(true)` host method | same as CM |
| Change to composer page | additive (popup, key handling) | replaces the textarea: `bind:value`, `placeholder`, `spellcheck`, `aria-label`, focus, draft sync, and the textarea-based assertions in `src/tests/routes/composer-page.test.ts` | additive |
| Risk to existing composer behavior | low (draft, save, theme code untouched) | higher: new input surface, IME, paste, undo, drag-region CSS | low |
| Popup placement in 600x240 window | own work | CM tooltip; clipping UNVERIFIED | own work |
| Owner's "reuse over from-scratch" | partial | strongest | strongest of the non-CM ones |

Hybrid detail (UNVERIFIED, not run): `CompletionContext` is exported and documented as constructible for tests (`node_modules/@codemirror/autocomplete/dist/index.js:8-37,2125`). `tagCompletionSource` needs only `state.doc.lineAt`, `state.doc.toString()` and `state.facet(editorHost).listTags()` (`tag/completion.ts:15-26`). A headless `EditorState.create({doc: text, extensions: [editorHost.of(composerHost)]})` plus `new CompletionContext(state, caret, false)` would let the textarea call the unmodified sources and get `{from,to,options}`. The wikilink options' `apply` closures call `view.dispatch({changes, selection})` and `state.doc.sliceString` (`wikilink/completion.ts:74-81`), so a tiny fake `view` that records the dispatched spec would reproduce the editor's exact insert text, including the `]]` rule and `Note|alias`, with no duplication. Costs: ships `@codemirror/state` + `@codemirror/autocomplete` into the composer route (both already in the app bundle; `profiling.ts` import in the sources is a no-op port by default, `profiling.ts:1-20`), rebuilds the state on each keystroke, relies on an internal-ish usage ("mostly useful for testing"), and still needs the popup and key handling. It removes the main rewrite cost of the textarea option but couples the composer to CM internals.

## 7. Risks

- Editor-parity drift: any rewrite of apply logic (`]]`, alias insert, tag replace range) can diverge when someone edits `completion.ts` later; no shared test ties them together. The hybrid avoids this; the pure-logic option needs a parity test or a comment pointing at `completion.ts`.
- Tag vs wikilink overlap: `[[a #b` matches BOTH `detectTagContext` (`#` after a space, `tag/completion.logic.ts:22`) and `detectWikilinkContext` heading mode (`wikilink/completion.logic.ts:39-64`). In the editor both sources run inside one `autocompletion` (`editor-extensions.ts:142-144`) and CM merges them. A textarea must pick a precedence. Not reproduced.
- Single-line detectors vs multi-line textarea: both detectors use only the current line (`lastIndexOf('\n', pos-1)`), but the tag detector also scans the full text for fences and frontmatter (`tag/completion.logic.ts:56-68`). A quick-capture body starting with `---` would be treated as frontmatter once a closing `---` exists, same as in the editor; probably acceptable, and note that captured text gets written into a note (`quick-capture.service.ts`, not read in full), so parity with the editor is arguably the right call.
- Escape and Enter regressions in the composer save flow (see keyboard section): they are the main user-visible risk because Esc today discards the composer and Enter inserts a newline.
- `get_all_tags_v2` access from the composer window and a file list source are unverified (section 3).
- Stale data: the main window's tag memo is keyed by vault path and index version (`editor-host.ts:93-111`); a composer-side cache needs its own invalidation or a fetch per summon.
- Kanban precedent has a test for only suggestions content, not keys; the composer option would need key-handling tests (Esc/Enter/arrows) to be safe.

## 8. Open questions

1. Is dropping heading (`[[Note#`) and block-id (`[[Note#^`) completion in the composer acceptable, given the editor offers them? Supporting them needs a note-text read from the composer (new IPC or fs capability), which widens `composer.json`.
2. Should alias suggestions appear? They need the notes' frontmatter (`get_all_vault_entries_v2`), a heavier read than tag names.
3. Accept key: Enter only (editor parity) or Enter and Tab (Kanban parity)? In a plain textarea Tab moves focus out, which is hostile in a popover with one input.
4. Popup placement: pinned list (simple, robust in a 240 px window) vs caret-anchored (needs mirror-div and flip logic)? The owner said only "behaving like the main editor's completion", which does not settle it.
5. Does any dependency already provide textarea caret coordinates? I grepped source only, not the full dependency list.
6. May the hybrid (headless CM sources + fake `view`) be considered "reuse" under constraint 1, or does the owner want no CM types in the composer?
