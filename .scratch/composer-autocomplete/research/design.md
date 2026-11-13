# Design: tag and wikilink autocomplete in the Quick Capture composer

Designer pass over scouts 01-20 and validators 1-6, at HEAD 3c6e74e20 (only `chore:` commits since 130d6b8f7; none touch the files below). Read-only: nothing was built or run. Validator corrections override scout claims. Library line numbers are `dist/index.js` of the installed packages: `@codemirror/autocomplete` 6.20.4, `@codemirror/view` 6.43.15, `@codemirror/commands` 6.11.1, `@codemirror/state` 6.7.6. UNVERIFIED marks what nobody could confirm from source.

## 0. Decisions in one screen

| Topic | Decision |
|---|---|
| UI | Swap the `<textarea>` for a minimal CodeMirror `EditorView` built only for the composer. Not the editor's `createExtensions`. |
| Reuse | Import `wikilinkCompletionSource` and `tagCompletionSource` unchanged, plus `editorHost`, `NOOP_HOST` and `buildEditorTheme`. All the completion behavior comes from those files and from `@codemirror/autocomplete`. |
| Editor files edited | **None.** Section 9 shows the editor's behavior stays byte-identical. |
| Data | The existing commands `get_all_tags_v2` and `get_all_vault_entries_v2`, called straight from the composer webview through `call()`. No new Rust code, no new IPC, no capability permission. Only the description string in `composer.json` changes. |
| Caching | One memo per summon, filled lazily on the first `#` or `[[` of that summon and cleared in `resetForShow`. A failed read is never cached. |
| Host | `{ ...NOOP_HOST, listTags, listLinkCandidates }`. `resolveLink`, `readNote` and the other seven methods stay as no-ops. |
| Esc | Esc closes the suggestion list when one is showing. Otherwise it dismisses the composer as today. Cmd+Enter always saves. |
| Parity gap (v1) | `[[` offers only indexed notes (`.md`/`.markdown`). It does not offer attachments or `.canvas`, `.kanban` or `.collection` files, and `[[OtherNote#heading` / `[[OtherNote#^id` show no list. `[[#heading` over the composer's own text works. Closing the gap is optional Task 6 and needs an owner decision (Q1). |

## 1. UI approach: CodeMirror, not textarea

### Why

- The wikilink options carry `apply` closures that call `view.dispatch` and contain the `]]` rule and the `Note|alias` insert (`src/lib/core/markdown-editor/extensions/wikilink/completion.ts:74-81`, `:100-108`). Tag options have no `apply` and rely on CodeMirror's default insert (`tag/completion.ts:38`). Only an `EditorView` runs both without a fake view or a rewrite (validator 6, scout 13 refutation; validator 1 items 3-4).
- With a textarea, the composer would have to rewrite what CodeMirror already does:
  - the merge order: wikilink before tag, per the `override` array
  - the `filter: false` ordering, where `boost` is ignored (autocomplete `:787-790`, validator 1 gap 2)
  - the 100-row render cap (`:383`)
  - dropping stale async results (`:1181-1196`)
  - the keymap, ARIA (`:696-697`, `:935-945`) and caret-anchored placement

  Constraint 1 forbids that rewrite.
- The headless hybrid (a real source plus a fake `view` cast) reuses option building but still needs its own popup, keys, race handling and tag insert. It also depends on undocumented `apply` internals. Rejected.
- ADR-0028 already names a "CodeMirror swap" as the precondition (`docs/adr/0028-quick-capture-merge-into-kokobrain.md:68`).

### The composer's extension set (new file, section 5.2)

| Extension | Why |
|---|---|
| `editorHost.of(composerHost)` | Both sources read the host through the facet (`editor-host.ts:104-107`). |
| `autocompletion({ override: [wikilinkCompletionSource, tagCompletionSource], activateOnTyping: true })` | Same config as the editor (`setup/editor-extensions.ts:142-145`), minus `dateShortcutCompletionSource` (scope). It already bundles `completionKeymap` at `Prec.highest` (autocomplete `:384`, `:2074`). |
| `Prec.highest(keymap.of([composerEscape]))`, listed **before** `autocompletion()` | Esc rule, section 4. |
| `keymap.of([{ key: 'Enter', run: insertNewline, shift: insertNewline }, ...standardKeymap, ...historyKeymap.filter((b) => b.run === undo \|\| b.run === redo)])` | `standardKeymap` has no `Escape` and no `Mod-Enter` (commands `:1743-1769`). Its `Enter` is `insertNewlineAndIndent`, which with no language copies the line's leading whitespace and clears a whitespace-only line (commands `:1538-1566`). A textarea does neither, so a plain `insertNewline` (`:1496`) goes first. The history filter drops `Mod-u` / `Mod-Shift-u` (undo/redo selection, `:573-574`), which a textarea does not have. |
| `history()` | The textarea had native undo. CodeMirror needs this (validator 5 gap). |
| `EditorView.lineWrapping` | The textarea wraps. |
| `placeholder('Quick capture...')` | Replaces the textarea placeholder (`+page.svelte:208`). |
| `EditorView.contentAttributes.of({ 'aria-label': 'Quick capture composer', autocorrect: 'on', writingsuggestions: 'true', translate: 'yes' })` | CodeMirror defaults turn autocorrect, Writing Tools and translate off (view `:8339-8344`). The textarea set only `spellcheck="false"` (`+page.svelte:209`), which CodeMirror already defaults to. The aim is parity with today's textarea (Q4). Whether these values equal the textarea's WebKit defaults is UNVERIFIED: check by hand. |
| Theme compartment: `[Prec.high(composerSurfaceTheme), buildEditorTheme(...)]` | Section 6. |
| `EditorView.updateListener` | Pushes each doc change into the page's `text` rune (section 5.3). |

Deliberately left out:
- `markdownLanguage`, highlighting and live preview. The composer stays plain text, as today, and neither source reads a syntax tree (scout 07 §1).
- `closeBrackets()` (Q5). It would auto-pair `( [ { ' "`, which the textarea never did. The `apply` handles an existing `]]` either way (`wikilink/completion.ts:75-76`).
- `bracketMatching()`. Its decorations trigger the WKWebView dead-key bug (`extensions/composition-aware-bracket-matching.ts:5-24`, validator 4 refutation 1).
- `defaultKeymap`. Its `Mod-Enter` runs `insertBlankLine` and its `Escape` runs `simplifySelection` (commands `:1805-1806`).
- `indentWithTab`. Tab keeps leaving the field, as it does in the textarea.
- `drawSelection`, `highlightActiveLine` and the gutters.

Import hygiene: import `extensions/tag/completion.js`, `extensions/wikilink/completion.js`, `editor-host.js` and `setup/editor-theme.js` directly. Never import the barrels `extensions/wikilink/index.ts` (it re-exports the decoration) or `setup/index.ts` (it pulls in `createExtensions`, live preview and `language-data`) (validator 4 §1, refutation 3.1). The `.js` specifier is required (`lib-specifier-convention.test.ts:8-21`). There is precedent for plugins importing editor extension internals: `plugins/kanban/KanbanWikilinkSuggestions.svelte:2-3`, `plugins/queryjs/queryjs-block-widget.ts` and `plugins/table-of-contents/toc.logic.ts`.

## 2. How vault data reaches the composer

### Channel

The composer calls `call('get_all_tags_v2')` and `call('get_all_vault_entries_v2')` directly. The evidence:

- Both commands are zero-arg and read the process-wide `VaultIndexState` (`src-tauri/src/commands/vault.rs:562-575`, `:637-647`; `lib.rs:319`). Neither has a window check.
- App commands are not ACL-gated for a local-URL window. `build.rs:23` is a bare `tauri_build::build()`, and there is no app manifest and no `src-tauri/permissions/` folder. Tauri's runtime gate rejects a call only for a plugin command, an app with an ACL manifest, or a non-local URL (`tauri-2.12.5/src/webview/mod.rs:2080`, verified by validator 2). The composer's `WebviewUrl::App("/composer")` is local (`lib.rs:139`), and it already calls `dismiss_composer` and `submit_composer_capture` with no permission listed (`+page.svelte:77`, `:102`; `composer.json:6-10`).
- The page must go through `call()` from `#lib/contracts/ipc.js`, because `raw-invoke.test.ts` and `event-listen.test.ts` scan `src/routes` (validator 1 item 7).

Rejected channels:
- A relay through the main window: it fails once the main webview is destroyed (issue 003, `tauri-listeners.service.ts:48-55`), and it adds main-window code.
- A new lean Rust command: a Rust change with ts-rs work, justified only if the payload measures too large (Q-perf below).

### Mapping, mirroring `appEditorHost` (`src/lib/app/editor-host.ts:96-111`, `:128-133`)

- `listTags()` returns `call('get_all_tags_v2')` mapped to `{ name, count }`, dropping `filePaths`, exactly as `app/editor-host.ts:102` does.
- `listLinkCandidates(includeNotes)` returns:
  - `entries = (await call('get_all_vault_entries_v2')).filter((e) => isLinkTargetFile(e.path))`. Drop `.view` the way `app/editor-host.ts:80` and `:131` do. The index holds `.view` entries (`vault.rs:315-317`, validator 3).
  - `files = entries.map((e) => ({ name: basename, nameWithoutExt: getNoteName(e.path), path: e.path }))`. `getNoteName`'s `dotIndex > 0` rule (`wikilink-resolution.logic.ts:4-8`) matches `flattenFileTree`'s `ext > 0` (`file-entries.logic.ts:19-20`), so labels are identical.
  - `notes = includeNotes ? entries : []`. This keeps the host contract (`editor-host.ts:47-48`).
- In the composer, `files` need the entries read even for an empty `[[`. The editor's "notes only for a non-empty query" saving is therefore lost, but the memo caps the cost at one read per summon (validator 2, scout 03 §5.4 correction).
- Ordering: entries come sorted by path (`vault.rs:571`) and the tree comes dirs-first by name. `matchFilesForWikilink` sorts by score, then name, stably (`wikilink/completion.logic.ts:75-90`), so only same-named files in different folders can order differently. Negligible (validator 2 gap 7).

### Caching and freshness

- Each memo holds a promise and is keyed on nothing: `reset()` clears it. The page calls `host.reset()` in `resetForShow` (`+page.svelte:146-159`). Inside one summon, every keystroke re-runs the sources (`filter: false`, no `validFor`, so the source re-queries on each keystroke; autocomplete `:1004-1022`, `:1036-1038`), and they hit the memo, which resolves in a microtask.
- A rejected read clears its memo entry, using the same identity check as `app/editor-host.ts:104-108`. The next keystroke retries.
- Loading is lazy, on the first `#` or `[[` of a summon, never at the summon itself. Both commands are sync `fn`, so they run on the main thread (`vault.rs:114-117`). A prefetch on the hotkey would compete with the refocus retries at 150/280 ms (`quick_capture/commands.rs:375-386`; validator 3 gap 5). Lazy loading also keeps the exact `commands()` assertions of the route test intact (`composer-page.test.ts:201, 214, 224, 253, 265, 274, 292, 308, 355, 373`).
- Tags and links load separately. A `#` never pulls the entries payload.
- The composer does not listen to `vault-index-updated`. A composer is open for seconds, and the per-summon reset covers the next summon.

## 3. The composer `EditorHost`

| Method | Composer implementation | Effect |
|---|---|---|
| `listTags` | Real, IPC with a per-summon memo. Rejects on failure (contract `editor-host.ts:74-75`). | The tag source catches the rejection and logs it through `reportError` (`tag/completion.ts:24-30`), as in the editor. |
| `listLinkCandidates` | Real, IPC with a per-summon memo. Rejects on failure, like the app host (`getVaultEntries` is not caught at `app/editor-host.ts:131`). | The wikilink source does not catch it (`wikilink/completion.ts:68`). CodeMirror closes completion and calls `logException` (autocomplete `:1207-1215`), the same path as the editor. No extra code. |
| `resolveLink` | `NOOP_HOST` (`() => null`) | `[[Other#` and `[[Other#^` silently return null (`completion.ts:15-17`). `[[#` reads the composer's own doc (`:135-137`, `:187-189`). |
| `readNote` | `NOOP_HOST` (rejects) | Unreachable while `resolveLink` returns null. |
| `assetUrl`, `openLink`, `openExternal`, `createNote`, `openView`, `openTagSearch` | `NOOP_HOST` | No composer extension calls them. |

Shape: `createComposerEditorHost(): EditorHost & { reset(): void }`, built as `{ ...NOOP_HOST, listTags, listLinkCandidates, reset }`. It cannot reuse `appEditorHost`, which imports the whole main-window graph and reads empty stores (scout 03 §6). It cannot reuse `vault-entries.service.ts` either, which imports `vaultStore` (scout 06 §5).

`profiling.ts` has zero imports and a no-op port, so `reportError` in the composer is `console.error` only (validator 3, scout 06 correction). Importing the sources pulls in no store, no settings and no Sentry.

## 4. Keyboard

Facts:
- The page handles Esc and Cmd/Ctrl+Enter on `<svelte:window on:keydown>` in the bubble phase (`+page.svelte:161-171`, `:202`).
- CodeMirror's keymap calls `preventDefault` but not `stopPropagation`, unless a binding asks for it (view `:9264-9268`, `:9306-9310`).
- Svelte's delegated handler is skipped when `cancelBubble` is set (`svelte/.../events.js:65`).
- `closeCompletion` returns true whenever any source is not Inactive (autocomplete `:1116-1122`). Every `input.type` transaction moves every override source to Pending (`:949-959`, `:974-975`) for `activateOnTypingDelay` (100 ms, `:379`), even on a line with no trigger. So reusing `closeCompletion` as the Esc test would swallow an Esc pressed within about 100 ms of typing (validator 5 refutation).

Rule: Esc closes a visible list, and otherwise dismisses.

```ts
// composer-editor.ts (sketch)
const composerEscape: KeyBinding = {
	key: 'Escape',
	stopPropagation: true,
	run: (view) => {
		if (currentCompletions(view.state).length > 0) return closeCompletion(view);
		onEscape();
		return true;
	},
};
```

- It sits in a `Prec.highest` keymap listed before `autocompletion()`. Within one precedence, array order decides, so it runs before `completionKeymap`'s Escape. The first command that returns true wins (view `:9264-9272`). `stopPropagation` keeps the window handler from dismissing a second time. `dismiss()` is idempotent in any case (`+page.svelte:71-81`).
- `currentCompletions` is empty when nothing is open or the dialog is disabled (autocomplete `:2090-2098`). Edge: right after a keystroke with the list open, CodeMirror can show the old list disabled while it re-queries. An Esc in that window of 100 ms or less dismisses the composer instead of closing the list. The text survives as the draft (`+page.svelte:34`), so this is a visible, recoverable glitch and is accepted. UNVERIFIED whether a disabled dialog stays visible in 6.20.4.
- The window handler stays for Esc when focus is outside the editor, for example after a click on the hint row. IME: CodeMirror ignores keys during composition (view `:4699-4712`), so Esc reaches the window and dismisses, as today.
- Cmd+Enter: no composer keymap binds `Mod-Enter`, and completion binds only bare `Enter`. `Meta-Enter` therefore matches nothing, bubbles, and `handleSave` reads `text`, which the update listener keeps current synchronously. This works with the list open.
- Enter with the list open accepts (`acceptCompletion` at `Prec.highest`, autocomplete `:2072`). Without a list it falls through to `insertNewline`. Within `interactionDelay` (75 ms, `:393`, `:1096-1100`), Enter inserts a newline, as in the editor.
- Arrows and PageUp/Down navigate the list while it is open. Otherwise `standardKeymap` handles caret movement.
- Ctrl-Space, Alt-` and Alt-i start completion explicitly (`:2063-2073`). These come from the editor's keymap. Dead keys on a US layout are unaffected (validator 5 gap); other layouts are UNVERIFIED.
- Focus: `textareaEl?.focus()` at `+page.svelte:158` and `:175` becomes `view.focus()`, or the first Esc after a summon bypasses CodeMirror (scout 09 §5).

## 5. Page integration (`src/routes/composer/+page.svelte`)

### 5.1 Markup and CSS

- Replace the `<textarea>` (`:205-212`) with `<div class="composer-editor" bind:this={editorEl} data-tauri-drag-region="false"></div>`.
- CSS: `.composer-editor { flex: 1; min-height: 0; display: flex; }`. The old `textarea` rules (`:249-263`) move into the composer surface theme (section 6).
- The drag-region attribute goes on the wrapper, mirroring the textarea (`:211`). Whether Tauri checks only `event.target` is UNVERIFIED, so check it by hand.
- The hint row (`:213-219`) and its texts do not change (scope).

### 5.2 New lib code (frontend only)

- `src/lib/plugins/quick-capture/composer-editor-host.service.ts`: `createComposerEditorHost()` (section 3).
- `src/lib/plugins/quick-capture/composer-editor.ts`:
  - `createComposerEditor({ parent, doc, host, dark, onDocChange, onEscape }): EditorView`
  - `setComposerText(view, text)`: a full-doc replace with the cursor at the end, `Transaction.addToHistory.of(false)`, then `closeCompletion`.
  - `setComposerDark(view, dark)`: reconfigures the theme compartment.

The plugin-to-core direction is allowed (`layer-rules.test.ts:135-138`). This placement is not under `src/lib/core/markdown-editor/`, so `markdown-editor-imports.test.ts` does not apply, and the folder doc's rule that the editor reaches the app only through the facet holds.

### 5.3 State sync

- `text` stays the single source of truth for `handleSave`, `withoutWritten` and the draft effect (`:34`, `:86`, `:137-140`). None of that logic changes.
- View to rune: `onDocChange: (t) => (text = t)` from the update listener, on `docChanged`. It is synchronous with the dispatch.
- Rune to view: the three external writes go through `setText(next)`, which assigns `text` and calls `setComposerText(view, next)` when `next !== view.state.doc.toString()`:
  - `:113` and `:130` (`withoutWritten`)
  - `:152` (`readDraft`)

  The comparison prevents a loop. `:14` stays: its value becomes the initial `doc`.
- `onMount`: create the view before `view.focus()`. `onDestroy`: `view.destroy()`.
- `resetForShow`:
  1. `host.reset()`
  2. `setText(readDraft())`, which replaces the doc and closes any list left open by Cmd+Enter or blur
  3. `setComposerDark(view, isDark())`, after `applyStoredTheme()`
  4. `queueMicrotask(() => view?.focus())`
- `onStorage` (`:142-144`) also calls `setComposerDark`.
- `isDark()` reads `document.documentElement.classList.contains('dark')`, not `appliedThemeStore.isDark`. The store starts `true` and stays there when no theme is stored, while CSS shows light (validator 4 gap 6).
- Remove `textareaEl` (`:29`), which becomes an orphan.

## 6. Theme and tooltip

- Reuse `buildEditorTheme(...)` (`setup/editor-theme.ts:12-93`) unchanged, for the tooltip chrome and list styling (`:69-89`), the focus-outline reset (`:28-30`) and `userSelect: 'text'`, which undoes `body { user-select: none }` (`:40`, `app.css:498`).
- Pass `fontSize 14`, `lineHeight 1.5`, `contentWidth 0`, `paragraphSpacing 0` and `dark`. Every editor-surface rule it sets that differs from the textarea is overridden by a composer theme. That theme must have higher precedence: the earlier or higher-precedence theme wins (view `:8380-8383`, style-mod `:73-75`; validator 4 §4), so wrap it in `Prec.high`.
- Composer surface theme (values from `+page.svelte:249-263`):

| Selector | Rules |
|---|---|
| `&` | transparent background, `color: var(--popover-foreground)`, `height: 100%`, `flex: 1` |
| `.cm-scroller` | system font stack, 14px, line-height 1.5 |
| `.cm-content` | `padding: 0`, `caretColor: var(--popover-foreground)` |
| `.cm-line` | `padding: 0`, overriding the base `0 2px 0 6px` |
| `.cm-cursor` | `borderLeftColor: var(--popover-foreground)` |
| `.cm-placeholder` | `color: var(--muted-foreground)` |

- Placement: tooltips default to `position: fixed` inside the 600x240 viewport. CodeMirror flips above or below the cursor, shrinks the list to fit, and hides it under one line height (view `:10383-10408`, `:10597-10618`). No `tooltips()` config and no window resize. Rows stay readable on middle lines (about 4-6 rows); check by hand. The `backdrop-filter` ancestor is harmless while `.composer-root` sits at (0,0) (scout 10 §3).
- Accepted differences:
  - The list uses monospace, from CodeMirror's base theme, as in the editor.
  - Text selection uses `var(--syntax-selection)` from `buildEditorTheme:58-60`, not the system highlight the textarea used.
  - File rows show an empty icon slot, as in the editor (validator 4 refutation 3.3).

  Q9 covers the visuals.
- CSP: the main window already runs CodeMirror's style-mod under the same app CSP (`tauri.conf.json:29`), so nothing changes.

## 7. Edge states

| State | Behavior | Source |
|---|---|---|
| No vault open | Unreachable: the hotkey returns early. | `lib.rs:45-47` |
| Cold start, index not built | `VaultIndexState::default()` is empty, so there are no suggestions and typing and saving work. | `lib.rs:319` |
| Vault switch in progress, or a failed scan | The previous vault's tags and notes can show. The editor guards tags with `indexReady` (`app/editor-host.ts:99`), which the composer cannot read. The editor's aliases are unguarded too (validator 3 gap 4). Accepted as rare and self-healing on the next summon (Q6). | `app-lifecycle.service.ts:141-353` |
| Main window destroyed (issue 003) | Suggestions come from the last index. Saving already fails ("Save not confirmed"). Unchanged and out of scope. | `+page.svelte:216` |
| IPC failure | Tags: no list, one `console.error`. Links: CodeMirror logs and closes. The next keystroke retries. | sections 3, 2 |
| Empty `[[` on a large vault | All files sorted, 100 rows rendered, as in the editor. | autocomplete `:383` |
| Composer text starting with `---...---` | Tags inside are not completed, the same detector as the editor. | `tag/completion.logic.ts:56-68` |
| List open when the composer hides | Closed by `setComposerText` on the next summon. | section 5.3 |
| Fast Enter (under 75 ms) after the list appears | Newline, as in the editor. | autocomplete `:1096-1100` |
| Dead keys and accents (owner types Portuguese) | No bracket-match decorations are installed. Check by hand. | `composition-aware-bracket-matching.ts:9-24` |

## 8. Tests (test-first)

Mock only the Tauri boundary, `#lib/contracts/ipc.js` (`docs/TESTING.md`; `composer-page.test.ts:5-8` precedent). Use the real sources, `.logic.ts` files and CodeMirror. Each suite covers the happy path, empty input and the error path.

### 8.1 `src/tests/lib/plugins/quick-capture/composer-editor-host.service.test.ts` (Task 1)

Pattern: `EditorState.create({ doc, extensions: editorHost.of(host) })` plus `new CompletionContext(state, pos, false)`, calling the **real** sources (`tag/completion.test.ts:29-37`, `editor-host.test.ts:219-254`).

1. `see #pr` lists the ranked tag names from a mocked `get_all_tags_v2`, and the host returns `{name, count}` without `filePaths`.
2. `[[Wel` gives `Welcome`. A `.view` entry is never offered. An alias from `frontmatter.aliases` appears only for a non-empty query, with `displayLabel` set to the alias.
3. One IPC per command per summon across repeated source calls. `reset()` triggers a refetch. `listLinkCandidates(false)` returns `notes: []`.
4. Errors:
   - A rejected tags read makes the source return null and log once. The next call refetches, because failures are not cached.
   - A rejected entries read rejects `listLinkCandidates` and is not cached.
5. Empty vault: both sources return null.
6. `[[Other#h` returns null without a throw, and `[[#h` lists the headings of the doc itself.

### 8.2 `src/tests/lib/plugins/quick-capture/composer-editor.test.ts` (Task 2, jsdom)

Mount a real view. Type with `view.dispatch({ ..., userEvent: 'input.type' })`. Open the list as `tag/completion.test.ts:95-133` does: `startCompletion`, then `vi.waitFor(completionStatus === 'active')`. Fire keys with `contentDOM.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true }))`, as `editor-extensions.test.ts:209-210` does. In jsdom `Mod` is Ctrl.

1. Esc:
   - With the list open, Esc closes it, `onEscape` is not called, and a `window` keydown spy does not fire.
   - With no list, Esc calls `onEscape` once.
   - Esc within the typing debounce, with a source pending and no list, calls `onEscape`. This pins the validator 5 refutation.
2. Ctrl+Enter is not consumed (`defaultPrevented === false`), the doc is unchanged, and the event reaches `window`.
3. Enter with the list open:
   - `[[Welc` becomes `[[Welcome]]` with the cursor after `]]`
   - with `]]` already after the cursor, no second `]]` is added
   - an alias option inserts `Welcome|Home]]`
   - `see #pro` becomes `see #project`
4. Enter with no list: `  a` + Enter gives `  a\n`, with no copied indent. Shift+Enter behaves the same.
5. Ctrl+Z undoes the last typing. Ctrl+U is not consumed.
6. Out of scope stays out: `@today` opens no list, and typing `[` inserts only `[`.
7. Attributes:
   - `aria-label` and the placeholder are present
   - `autocorrect="on"`, `spellcheck="false"`
   - `setComposerDark` flips `view.state.facet(EditorView.darkTheme)`
8. `onDocChange` runs synchronously on each change. `setComposerText` replaces the doc, adds no undo entry, and closes an open list.

Most of these are the editor's own behaviors observed through the composer's extension set. They fill the gap where no source-level test of the wikilink `apply` exists (validator 4 gap 8, scout 17 §1).

### 8.3 `src/tests/routes/composer-page.test.ts` (Task 3)

- Rewrite helpers, not assertions:
  - `textarea()` becomes `editorView()`, using `EditorView.findFromDOM(target.querySelector('.cm-editor'))`
  - `type(v)` dispatches a full replace
  - `textarea().value` reads become `editorText()`, at 13 sites (validator 1 item 6)
  - the theme test's `textarea` existence check (`:60`) becomes `.cm-editor` with the aria-label

  No assertion is removed. The exact `commands()` lists stay valid because data loads lazily.
- `mockSubmit` gets branches for `get_all_tags_v2` and `get_all_vault_entries_v2` that return fixtures.
- New cases:
  1. typing `#` fetches tags once per summon, and a second summon refetches
  2. Esc with the list open does not call `dismiss_composer`, and a second Esc does
  3. Cmd+Enter with an accepted `[[Welcome]]` submits that text
  4. a summon restores the draft into the editor and closes a list left open
  5. the written prefix is dropped from the editor after a confirmed save
  6. a failed `get_all_tags_v2` keeps typing and saving working, with no `role="alert"`

### 8.4 E2E `e2e/specs/composer-autocomplete.spec.ts` (Task 4)

- Setup:
  1. `page.goto('/composer')`
  2. `waitForFunction(() => window.__e2e?.fs)`
  3. `__e2e.fs.populate(TEST_FILES)` (`e2e/fixtures/test-vault.ts:126`)
  4. `setViewportSize({ width: 600, height: 240 })`

  Base it on `console-guard.ts`, so any unmocked command fails. Both commands already have handlers (`e2e/mocks/tauri-core.ts:485`, `:491`).
- Cases:
  1. `[[` shows `.cm-tooltip-autocomplete` with labels
  2. `[[Wel` narrows to Welcome
  3. Enter inserts `[[Welcome]]`, checked through `.cm-content` text
  4. `#pl` shows `plan`, and Enter gives `#plan`
  5. the tooltip box stays inside 600x240
  6. Esc with the list open hides the list and leaves `.cm-content` visible
- Wait for a visible tooltip before pressing Esc, to avoid the timing trap (validator 5).
- No recorder change in `e2e/mocks/`. The submit and dismiss effects are covered by 8.3.

### 8.5 Manual check in `pnpm tauri dev` (not automatable)

Capability and data path in a real webview, accents with dead keys, autocorrect and Writing Tools against the old build, window drag from the padding, mouse selection inside the text, list height on lines 1, 4 and 8, light/dark switch then summon, undo. E2E cannot see the second webview or the capability (scout 18 §6).

## 9. Editor files: none touched, behavior unchanged

Files that must stay untouched (the delivery gate checks it):
- `src/lib/core/markdown-editor/**`, including `editor-host.ts`, `extensions/{tag,wikilink}/*`, `setup/*` and the live-preview `profiling.ts`
- `src/lib/app/editor-host.ts`, `src/lib/app/EditorView.svelte`
- their tests under `src/tests/lib/core/markdown-editor/**` and `src/tests/lib/app/editor-host.test.ts`

Why the editor cannot change:
1. No editor source line changes. The composer only imports exported symbols: `tagCompletionSource`, `wikilinkCompletionSource`, `editorHost`, `NOOP_HOST`, `EditorHost`, `buildEditorTheme`, `getNoteName` and `isLinkTargetFile`.
2. The main window and the composer are separate webviews, so they are separate JS realms. Module state is not shared:
   - the profiling port
   - `tagsMemo` and `linkIndexByTree`, which live in `app/editor-host.ts` and are not imported by the composer
   - style-mod mounts

   The composer's `autocompletion()` instance is a separate `EditorView` config. The "one autocompletion() per state" rule (`editor-extensions.ts:139-141`) is per state.
3. The composer data path calls the same Rust commands read-only. Both take a shared read lock and clone (`vault.rs:567-572`, `:642-645`), and neither writes the index.
4. Diagnostics only: while debug tracing is on, composer invokes of `CmdTrace`d commands can mis-pair the main window's queue-wait lines (`src/lib/contracts/ipc.ts:32-77`; validator 3 gap 7). No functional effect.
5. Bundling: a new import edge can change Vite's shared-chunk split. ESM semantics do not depend on chunking. CI's `pnpm build` (every PR) catches cycle or prerender breakage. Local `pnpm build` is not required because no dependency changes (CLAUDE.md rule 6).

Verification at delivery:
- `git diff --stat <base>..HEAD -- src/lib/core/markdown-editor src/lib/app/editor-host.ts src/lib/app/EditorView.svelte src/tests/lib/core/markdown-editor src/tests/lib/app/editor-host.test.ts` is empty.
- The full `pnpm vitest run` covers the editor's completion, host, theme and extensions tests, unchanged.
- `bash scripts/e2e.sh e2e/specs/wikilink-completion.spec.ts e2e/specs/editor.spec.ts` is green.

Optional docs-only edit: `docs/architecture/modules/src/lib/core/markdown-editor.md:33` lists outside importers of the completion code (kanban). Adding the composer there is documentation, not editor code.

## 10. Docs and ADR

All in Task 5:

- **`docs/adr/0028-quick-capture-merge-into-kokobrain.md`**: a new `## Amendment (YYYY-MM-DD): composer tag and wikilink completion` above the 2026-11-05 one, newest first like 0003 and 0004, with the date of the change. It says:
  - the out-of-scope bullet at `:68` is resolved
  - the CodeMirror swap was adopted as a minimal view that reuses the two editor sources unchanged
  - data comes from the existing `get_all_tags_v2` and `get_all_vault_entries_v2`, with no new IPC, because app commands are not capability-gated (`build.rs`)
  - the v1 gaps (non-index targets, other-note headings and block ids)
  - `:63` is factually stale: the composer shares the app origin's localStorage (`theme.service.ts:9-11`)

  Lines 47, 63 and 68 stay as written (`docs/adr/README.md:5`, `:99-100`).
- **`src-tauri/capabilities/composer.json:4`**: correct the description. It also reads the vault's tags and note entries, and app commands are not permission-gated. Permissions are unchanged.
- **`help/documentation/09-quick-notes-and-templates.md:12`**: one sentence. `#` suggests tags and `[[` suggests notes, as in the editor. `Enter` accepts a suggestion. `Esc` closes the list first, and a second `Esc` cancels. Precedent wording: `help/documentation/21-kanban.md:78-80`.
- **`docs/architecture/modules/src/routes.md`**:
  - `:15`: textarea becomes "a minimal CodeMirror view with tag and wikilink completion"
  - `:27-28`: add `src/lib/plugins/quick-capture` and `core/markdown-editor` as collaborators
  - `:34-37`: add the two IPC commands
  - `:46`: still true; add that tags and entries come straight from Rust
  - `:47-48`: note that the completion memo resets per summon
- **`docs/architecture/modules/src/lib/plugins/quick-capture.md`**: Key files gains the two new files. Responsibility and IPC bullets: the two commands are called by the composer host.
- Optional: `docs/FEATURES.md:13` gets one clause.
- No `CONTEXT.md` exists, so there is no glossary change. Backticked paths must exist, or `architecture-map.test.ts` fails.

## 11. Tasks (one commit each, test-first, in order)

| # | Task | Layer | Gate before commit |
|---|---|---|---|
| 1 | Write the 8.1 tests (red), then `composer-editor-host.service.ts` (green). | Frontend | `pnpm check` + `pnpm vitest run` |
| 2 | Write the 8.2 tests (red), then `composer-editor.ts`: extension set, Esc binding, theme compartment, `setComposerText`, `setComposerDark`. | Frontend | `pnpm check` + `pnpm vitest run` |
| 3 | Rewrite the 8.3 helpers and add the new cases (red), then swap the textarea in `+page.svelte`. | Frontend | `pnpm check` + `pnpm vitest run` |
| 4 | Add the 8.4 E2E spec. | Frontend (e2e) | `pnpm check` + `bash scripts/e2e.sh e2e/specs/composer-autocomplete.spec.ts e2e/specs/wikilink-completion.spec.ts e2e/specs/editor.spec.ts` |
| 5 | Section 10 docs and the `composer.json` description. | Both (config under `src-tauri/`) | `cargo test --manifest-path src-tauri/Cargo.toml` (rule 6: `src-tauri/` changed; `build.rs` embeds capabilities) + `pnpm vitest run src/tests/lib/architecture` |
| 6 | Optional, only if Q1 = full parity: see below. | Depends on Q1 | Depends on Q1 |

Notes:
- Each task stages only its own files and checks `git diff --cached --stat`. Commit bodies follow `docs/COMMITS.md`. The section 8.5 manual check runs after Task 3, before Task 5 documents the behavior.
- No `package.json` change, so no local `pnpm build`.
- Inside a relay-lite run, the role's targeted checks replace these gates (CLAUDE.md, "Inside a relay-lite run").

Task 6 (only on owner request): closing the v1 parity gap.
- (a) Get the vault path, by either of two routes:
  - a new zero-arg Rust command returning `VaultIndex::vault_root()` (`index.rs:348-350`). This is authoritative, but it is a Rust change plus `commands.ts`/`COMMAND_ARGS`, the e2e handler and IPC parity, so the gate is Both.
  - the `kokobrain:recent-vaults[0]` localStorage hint (`vault.store.svelte.ts:4`, `:80-87`). No Rust change, but the key is module-private in a core store, and the value is the last-opened vault, not a confirmed one.
- (b) `files` from `flattenFileTree(await call('scan_vault', { path, sortBy: 'name' })).filter(isLinkTargetFile)`, the editor's exact code path (`app/editor-host.ts:76-85`).
- (c) `resolveLink` from `resolveWikilinkCached(t, buildResolutionCache(paths), vaultPath)`.
- (d) `readNote` from `read_files_batch({ vaultPath, paths: [p] })` (`files.rs:23-27`).
- Cost: `scan_vault` walks the disk ("up to ~2.4 s measured", `vault.rs:114-117`; async, off the main thread). Per summon, the first `[[` would wait on it, so this probably needs a cache across summons with its own invalidation. That added complexity is the reason Task 6 is not in v1.

## 12. Open questions only the owner can answer

1. **Q1, link-target parity.**
   - (a) v1 as designed: indexed notes only, and no `[[Other#heading`/`#^id`.
   - (b) Add Task 6: attachments, `.canvas`, `.kanban` and `.collection` targets, and other-note headings.

   The owner uses canvas and kanban (memory `owner-feature-usage`). Recommended: (a) now, (b) if the owner misses them. If (b), choose the vault-path source: a Rust command (recommended) or the localStorage hint.
2. **Q2, Esc.** Esc closes a visible list and a second Esc cancels the composer. This matches the editor and changes today's single Esc only while a list is visible. Confirm.
3. **Q3, Enter.** Enter accepts a highlighted suggestion (editor parity), so `#idea` + Enter can take a suggestion instead of a newline. Confirm.
4. **Q4, autocorrect and Writing Tools.** Keep today's textarea behavior (recommended; CodeMirror defaults overridden) or take the editor's (off)?
5. **Q5, auto-closing `[[` → `[[]]`.** Recommended: no (typing stays as today). The editor auto-closes.
6. **Q6, stale vault during a switch.** Accept that the previous vault's suggestions may show for one summon (recommended), or add a Rust-side guard (Rust change)?
7. **Q7, undo.** CodeMirror groups undo steps differently from the native textarea, and a summon's draft restore is not undoable. Accept?
8. **Q8, visuals.** Accept the editor's tooltip look (monospace list) and the themed selection color in the composer, or override both to match the textarea?
9. **Q-perf, payload.** First-trigger latency of `get_all_vault_entries_v2` on the owner's vault is unmeasured. `CmdTrace` already logs `exit get_all_vault_entries_v2 after Nms` with debug logging on (`vault.rs:33-55`, `:566`). If it is too slow, does the owner accept a lean Rust command returning `{path, aliases}`?

## 13. Not verified

- WebKit defaults for `autocorrect`, `autocapitalize` and `writingsuggestions` on a macOS `<textarea>`.
- Tauri drag-region handling inside `.cm-editor`.
- Whether a disabled completion dialog stays visible while CodeMirror re-queries.
- List height in the real 600x240 window.
- Dead-key composition in the composer.
- Bundle delta for `/composer`.

All of these are covered by the section 8.5 manual check, or by CI `pnpm build` for the bundle.
