# Scout 09: keyboard conflicts (composer window keydown vs CodeMirror completion keymap)

Versions read: @codemirror/autocomplete 6.20.4, @codemirror/view 6.43.15, @codemirror/commands 6.11.1 (node_modules/@codemirror/*/package.json and dist/index.js). Line numbers for library files refer to `dist/index.js` of each package.

## Summary

Without any change, putting a CodeMirror editor in the composer would make Esc close the popup AND dismiss the composer, because the composer's handler is a bubble-phase window listener that never looks at what CodeMirror already did. Enter accepting a completion works out of the box (autocompletion installs its own keymap). Cmd+Enter works only if the composer does NOT install `defaultKeymap`. The fix for Esc needs zero edits to editor files: one extra keymap binding with `stopPropagation: true`, or a `defaultPrevented` guard in the composer handler.

## Findings

### 1. The composer handler is a bubble-phase window listener, and it ignores defaultPrevented

- `src/routes/composer/+page.svelte:202` `<svelte:window on:keydown={onKeyDown} .../>`. Svelte's `event()` helper passes `capture` through as `undefined` for this form (node_modules/svelte/src/internal/client/dom/elements/events.js:121-122), so it is `addEventListener('keydown', fn, {capture: undefined})`: bubble phase, after any element-level handler.
- `+page.svelte:161-171` `onKeyDown`: Escape -> `preventDefault()` + `dismiss()`; (meta|ctrl)+Enter -> `preventDefault()` + `handleSave()`. It never reads `event.defaultPrevented`, `event.target` or `event.isComposing`.
- Today the textarea is a child with no key handlers (`+page.svelte:205-212`), so the window handler is the only consumer.
- Existing test dispatches synthetic events directly at `window` (`src/tests/routes/composer-page.test.ts:148-150`, `press()`), with `key: 'Escape'` / `{key:'Enter', metaKey:true}`. Those never pass through a CodeMirror element, so they keep working with a window-level guard and are blind to the new conflict.

### 2. Event order with CodeMirror

- CodeMirror attaches its keydown listener to `view.contentDOM` (view/dist/index.js:4630-4645, `ensureHandlers`). Target/element phase runs before the window bubble phase, so CodeMirror always sees the key first, the composer handler second.
- Dispatch chain: `handleEvent` (4605) -> `keydown()` bookkeeping (4648) -> `runHandlers` (4614-4628). Keymap entries run through `handleKeyEvents` (9150-9153, `Prec.default`) -> `runHandlers(map, ...)` (9249-9311).
- In `InputState.runHandlers` (4614-4628) a handler returning `true` triggers `event.preventDefault()`. It does NOT stop propagation.
- In the keymap `runHandlers` (9249-9311) `event.stopPropagation()` is called only when `handled && binding.stopPropagation`. `stopPropagation` is set on a binding only if the binding object sets it (9203, 9216, 9223-9224). None of `completionKeymap`, `standardKeymap`, `defaultKeymap` set it.
- Consequence: when CodeMirror handles Esc (closes the popup), the event still bubbles to the window with `defaultPrevented === true`, and the composer dismisses anyway.
- Skipped when composing: `ignoreDuringComposition` (4699-4712) makes CodeMirror drop key events during IME composition, so those reach the window untouched. Same as today's textarea behavior; not a regression.

### 3. What the completion keymap binds

- `autocompletion()` returns `[commitCharacters, completionState, completionConfig.of(config), completionPlugin, completionKeymapExt, baseTheme]` (autocomplete/dist/index.js:2046-2053). `completionKeymapExt` is `Prec.highest(keymap.computeN(... defaultKeymap ? [completionKeymap] : []))` (2074), and `defaultKeymap` config defaults to `true` (384). So just calling `autocompletion(...)` already installs Escape/Enter/arrows/PageUp/PageDown/Ctrl-Space. The editor ALSO passes `...completionKeymap` explicitly (`src/lib/core/markdown-editor/setup/editor-extensions.ts:164`), which is redundant for behavior (same command identities, deduped by the `ran` Set at view 9262-9270); the composer need not copy it.
- `completionKeymap` (2063-2073): `Escape -> closeCompletion`, `Enter -> acceptCompletion`, `ArrowDown/Up -> moveCompletionSelection`, `PageDown/Up`, `Ctrl-Space` and mac `Alt-\``/`Alt-i` -> `startCompletion`.
- `closeCompletion` (1116-1122) returns `true` iff any active source has `state != Inactive`, i.e. Pending (1) counts too (118, 896). With no popup and no pending query it returns `false`, so Esc falls through to the window handler and dismisses the composer. Esc while a source is still pending (async `listTags` / `listLinkCandidates` in flight) is consumed by closing the pending query; same as the editor.
- `acceptCompletion` (1096-1104) returns `false` when the popup is closed, `selected < 0`, disabled, readOnly, or opened less than `interactionDelay` (75 ms, 393) ago. In those cases Enter falls through to the newline binding. Same behavior as the editor; a fast typist can get a newline instead of an accept (visible, recoverable).
- Binding key names: `keyName` builds `Meta-Enter` / `Ctrl-Enter` for modified Enter (view 9140-9148 area), so `{key: "Enter"}` does NOT match Cmd+Enter or Ctrl+Enter. Accepting a completion never swallows the save shortcut.
- `commitCharacters` (autocomplete 1294-1310) is a `Prec.highest` keydown handler that always returns `false`, only applies when a source defines commit characters. The tag and wikilink sources define none (`tag/completion.ts:35-40`, `wikilink/completion.ts:118-123`). No effect.

### 4. The default keymap is hostile to the composer's shortcuts

- `defaultKeymap` (commands/dist/index.js:1796-1822) includes `Escape -> simplifySelection` (1805) and `Mod-Enter -> insertBlankLine` (1806), and ends with `.concat(standardKeymap)` (1816), which carries `Enter -> insertNewlineAndIndent` (1762).
- The editor installs `...defaultKeymap` (`editor-extensions.ts:159`). If the composer reuses that list as is:
  - `Mod-Enter` (Cmd+Enter on mac, Ctrl+Enter elsewhere) runs `insertBlankLine`, which dispatches a doc change and returns true. The window handler still fires and saves, but `text` now contains an extra blank line; and with a `defaultPrevented` guard it would not save at all.
  - `Escape` with a non-empty selection or multiple ranges runs `simplifySelection` (1164-1175), returns true, and consumes Esc. Today (textarea) Esc with a selection dismisses. With a guard it would collapse the selection instead; without a guard it would do both.
- `standardKeymap` alone (1743-1795) has Enter, arrows, Backspace, Mod-a etc., but no Escape and no Mod-Enter (grep: Escape only at 1805, Mod-Enter only at 1806). It is the safe base if the composer wants editor-like editing keys.
- Plain Enter without any newline binding: UNVERIFIED. CodeMirror normally still inserts a newline from the native contenteditable `insertParagraph` input, but I did not trace that path (view 4778-4779 is only the iOS pending-key table). Including `standardKeymap` (or one explicit Enter binding) removes the doubt.
- Tab: not in the keymap lists above; `indentWithTab` is a separate export (commands 1824). The editor installs it (`editor-extensions.ts:165`); the composer should not, to keep Tab behavior as today.

### 5. How to make Esc close the popup first (two options, neither edits editor files)

Option A (preferred): stopPropagation merge on the composer's own keymap.
- `buildKeymap` merges every binding with the same key name into ONE binding object (view 9206-9228: `scopeObj[full] || (scopeObj[full] = {...})`, then `if (command) push`, `if (stopPropagation) binding.stopPropagation = true`). A composer binding `{ key: 'Escape', stopPropagation: true }` with no `run` therefore merges into the completion binding; when `closeCompletion` returns true the keymap calls `event.stopPropagation()` (9309-9310) and the window listener never fires. When `closeCompletion` returns false, `runFor` leaves `stopPropagation` unset (9264-9279; it is only set on a handled command or `preventDefault`), so the event bubbles and the composer dismisses as today.
- Precedence needed: none beyond defaults, because the merge is per key name across all keymap facet entries of the state. The composer entry can be `Prec.default`.
- Caveat: this relies on merge semantics inside `buildKeymap`; covered by view/dist 9206-9228. A unit test in the composer test file (CodeMirror in jsdom, dispatch keydown on `contentDOM`) would pin it. Not run here.

Option B: guard in the window handler.
- Add `if (event.defaultPrevented) return;` at the top of `onKeyDown` (`+page.svelte:161`). CodeMirror sets defaultPrevented when its command returned true (view 4620-4622). This works for Esc (popup closed) and keeps working with the existing tests, whose synthetic events are not prevented.
- Risk: any other CodeMirror binding that handles Esc or Cmd+Enter would silently block dismiss/save (see finding 4). It only stays safe if `defaultKeymap` is NOT installed.
- It is a behavior change to the shared handler for both keys; Option A limits it to Escape-with-open-popup.

Either option requires that focus is in the CodeMirror content, which brings a related item: `resetForShow` focuses `textareaEl` in a microtask (`+page.svelte:158`) and `onMount` does too (175). These must target the view (`view.focus()`) or the first Esc after summon bypasses CodeMirror entirely and dismisses.

### 6. Enter accepts instead of newline

- Because `completionKeymapExt` is `Prec.highest` (2074), `Enter -> acceptCompletion` runs before any `Enter -> insertNewline...` binding from a lower-precedence keymap. If it returns true, the newline binding in the same merged `Enter` binding is not run: `runFor` returns on the first command that returns true (9264-9272). No composer code is needed.
- When there is no popup, `acceptCompletion` returns false and the next command in the merged binding inserts the newline.
- The window handler does not touch plain Enter (only meta/ctrl+Enter), so there is no conflict there.

### 7. Cmd+Enter still saves

- With no `Mod-Enter` binding in the composer's keymaps (i.e., not `defaultKeymap`), Cmd+Enter yields keymap name `Meta-Enter`, matches nothing (completion binds plain `Enter` only), bubbles to the window, `handleSave()` runs. Works with the popup open too: the popup state is irrelevant to `handleSave`, which reads the `text` rune.
- `handleSave` reads `text` (`+page.svelte:86`). With CodeMirror the `text` rune must be updated synchronously from an update listener on every doc change, or a Cmd+Enter right after typing saves stale text. UNVERIFIED which sync mechanism the implementation will use; a listener on `docChanged` is synchronous with the dispatch.
- An accepted completion that arrives from async source resolution never touches `text` outside a transaction, so the listener sees it.

### 8. Other keyboard-adjacent items

- `closeOnBlur` default is true (autocomplete config; blur handler at 1270-1279 uses a 10 ms timeout). The composer window is hidden by `dismiss_composer` (`src-tauri/src/quick_capture/commands.rs:422-431`) and by `intercept_close_as_hide` (`src-tauri/src/lib.rs:95-103`). Whether the webview fires `blur` on hide so the popup is closed on the next summon is UNVERIFIED. If not, a stale popup could be visible after re-summon; `resetForShow` could close it with `closeCompletion(view)` (exported API) or by replacing the doc.
- The window is 600x240, `resizable(false)`, transparent (`lib.rs:135-153`), and `body` is `overflow: hidden` (`+page.svelte:223-229`). CodeMirror's tooltip is positioned inside the document and may be clipped at the window edge for lower lines. Not a keyboard issue; flagged for the layout scout.
- `data-tauri-drag-region` on `.composer-root` (`+page.svelte:204`) is irrelevant to keys; the textarea carries `data-tauri-drag-region="false"` (211), so the CodeMirror host needs the same attribute to keep mouse selection from dragging the window. Out of scope here but related to the swap.
- The main window's global shortcuts use `document.addEventListener('keydown', ...)` (`src/lib/app/global-keybindings.ts:48`) and live in the main window; the composer is a separate webview and the route does not import it. No conflict.
- Double dismiss: `dismiss()` is idempotent via `dismissing` (`+page.svelte:71-81`), so Esc spam is safe even if both paths fire.

## Reuse opportunities

- `autocompletion({ override: [...], activateOnTyping: true })` alone gives the whole completion keymap; no need to import `completionKeymap` (editor-extensions.ts:142-145 and 164 are the reference).
- `standardKeymap` from `@codemirror/commands` for Enter and cursor movement, deliberately without `defaultKeymap`.
- The editor's sources (`tagCompletionSource`, `wikilinkCompletionSource`) contain no key handling, so nothing in them conflicts with the composer shortcuts (`tag/completion.ts`, `wikilink/completion.ts` read in full above for the tag file and lines 1-150 for the wikilink file).
- `closeCompletion` is exported from `@codemirror/autocomplete` (index.js:2125) if the composer needs to close the popup programmatically on show/dismiss.

## Risks

1. Reusing the editor's `defaultKeymap` list breaks Cmd+Enter (inserts a blank line) and changes Esc-with-selection (finding 4).
2. Guard-only fix (Option B) trades one conflict for silent blocking of dismiss/save by any future binding.
3. Focus still on a hidden textarea or missing `view.focus()` after summon makes the first Esc skip CodeMirror (finding 5).
4. `interactionDelay` of 75 ms makes a very fast Enter after the popup appears insert a newline (finding 3). Same in the editor; do not change.
5. IME composition: keys are ignored by CodeMirror and reach the window handler (finding 2); Esc during composition would dismiss, as the textarea does today.
6. The existing test file only dispatches at `window`; it cannot detect the Esc double-action. A new test must dispatch on `view.contentDOM`.

## Open questions

- Does the owner want Esc with a non-empty selection to dismiss (textarea parity, no `simplifySelection`) or collapse the selection (editor parity)? Recommendation: parity with today's composer, i.e. no `defaultKeymap`.
- Which mechanism syncs the doc to `text` (finding 7)?
- Does the Tauri webview fire `blur` on `window.hide()` (finding 8)? Needs a manual check in a running app.
- Is plain Enter without `standardKeymap` correct in CodeMirror on WKWebView (finding 4)? Recommend including `standardKeymap` or an explicit Enter binding and verifying manually.
