# Refutation pass: design.md (composer tag and wikilink autocomplete)

Adversarial review of `design.md` against the scouts, validators and source at HEAD (main, 3c6e74e20). Read-only; nothing built or run. Library lines are `dist/index.js` of `@codemirror/autocomplete` 6.20.4, `@codemirror/view` 6.43.15, `@codemirror/commands`; Tauri lines are `~/.cargo/registry/src/index.crates.io-1949cf8c6b5b557f/tauri-2.12.5/`.

Verdict: the core choices hold up. These were attacked and survived: the CodeMirror swap, zero editor edits, reusing both sources unchanged, the direct `call()` data path, the ACL claim, lazy loading and the E2E feasibility. I re-read the ACL gate at `tauri-2.12.5/src/webview/mod.rs:2076-2083`: an app command from a local URL with no app manifest skips the check. I found no hidden editor behavior change. One must-fix: the Esc rule rests on an assumption the library refutes. The other findings are should-fix test or plan gaps, plus nits.

## must-fix

### M1. Esc dismisses the composer while the suggestion list is visibly open, after every keystroke

- Design section 4 tests `currentCompletions(view.state).length > 0` and accepts "an Esc in that window of 100 ms or less" as rare. It leaves open "whether a disabled dialog stays visible in 6.20.4" (UNVERIFIED there). The source settles it: the dialog stays visible.
  - Neither source returns `validFor` (`tag/completion.ts:35-40`, `wikilink/completion.ts:118-123`), so each typed character turns the result back into Pending (`ActiveResult.updateFor`, autocomplete `:1027-1033`).
  - `CompletionDialog.build` then returns `prev.setDisabled()` while any source is pending (`:853-855`). The tooltip stays mounted (`CompletionState.tooltip`, `:915`) and only gets the `cm-tooltip-autocomplete-disabled` class (`:575-576`, styled grey at `:1344-1353`).
  - The re-query starts after `activateOnTypingDelay` (100 ms, `:1180-1182`). With a disabled dialog, accept is debounced further by `updateSyncTime` (100 ms, `:1199-1200`, `:394`).
  - `currentCompletions` returns `[]` for a disabled dialog (`:2090-2094`).
- Failure scenario: the user types `#ide`, sees the list, and presses Esc within about 100-200 ms of the last key, a normal typing cadence. The list is on screen, but `composerEscape` calls `onEscape()` and the composer hides. In the editor, the same Esc only closes the list (`closeCompletion`, `:1116-1122`). This is not a rare edge. It happens on every keystroke typed while the list is open, and it breaks the design's own rule: "Esc closes a visible list".
- Fix (still zero editor edits): treat "visible" as "a completion tooltip is mounted", for example `view.dom.querySelector('.cm-tooltip-autocomplete')`, or `currentCompletions(...).length > 0 || <tooltip mounted>`. Keep the `pending, no tooltip ⇒ dismiss` branch that pins the validator 5 refutation.
- Test gap: 8.2 item 1 has no case for "list open, type one more char, Esc at once". Add one: the list closes, `onEscape` is not called, and the window spy does not fire. As written, all three 8.2 Esc cases pass while this bug ships.

## should-fix

### S1. `resetForShow` does not close a leftover list, and route test 8.3 case 4 cannot pass as specified

- Section 5.3 step 2 and the section 7 row "List open when the composer hides: closed by `setComposerText` on the next summon" assume the summon replaces the doc. But `setText` calls `setComposerText` only when `next !== view.state.doc.toString()`.
- The draft effect writes `text` on every change (`+page.svelte:34`, `:46-53`), so `readDraft()` at `:152` almost always equals the doc. A dismiss by Esc or click-away leaves the doc unchanged, so nothing replaces it and nothing closes the list.
- In the real window, `closeOnBlur` (default true, autocomplete `:382`; handlers `:545-549`, `:1272-1278`) probably closes the list when the window hides. That is the actual mechanism, and the design never names it. In jsdom nothing blurs, so 8.3 case 4 ("closes a list left open") fails unless the test's draft differs from the doc. The other way out is for an implementer to make the replace unconditional, which moves the caret to the end on every summon.
- Fix: call `closeCompletion(view)` in `resetForShow` unconditionally, separately from `setText`, and correct the section 7 row.

### S2. Owner decisions block Tasks 2 and 3, but the plan does not gate them

- Q2 (Esc), Q3 (Enter accepts), Q4 (autocorrect and Writing Tools), Q5 (closeBrackets) and Q8 (visuals) each change the extension set and the 8.2 assertions of Task 2. Q2 and Q3 also change the help text in Task 5.
- Section 11 lists Tasks 1-5 in order with no "blocked by Qn" column. Per memory `relay-owner-decision-issues`, Issues with an owner-decision criterion come back blocked.
- Fix: mark Tasks 2-5 blocked on Q2-Q5 and Q8. Only Task 1, the host, is decision-free (Q1 and Q-perf affect it only through the optional Task 6 or a data-source swap).

### S3. Test plan: the composer suites can pass while typing never opens the list, and the Enter cases hit `interactionDelay`

- 8.2 opens the list "as `tag/completion.test.ts:95-133` does". That helper calls `startCompletion` (explicit) and sets `interactionDelay: 0` (`tag/completion.test.ts:100`).
  - (a) An explicit start bypasses `activateOnTyping` and changes the wikilink source's contract: `!context.explicit` at `wikilink/completion.ts:116` returns an empty list instead of null. A composer that never activates on typing would still pass 8.2.
  - (b) The composer's production config keeps the default `interactionDelay` of 75 ms (`:393`, `:1098-1099`). An Enter fired right after the list opens inserts a newline, so 8.2 item 3 either fails or invites someone to add `interactionDelay: 0` to the production config. That would diverge from the editor's behavior.
- 8.3: the rewritten `type(v)` "dispatches a full replace". Without `userEvent: 'input.type'`, no completion activates (`getUpdateType`, `:957-966`), so new cases 1-4 need a separate typing helper.
- Fix: require at least one 8.2 case and one 8.3 case that type `#`/`[[` with `userEvent: 'input.type'` and never call `startCompletion`. Wait past 75 ms before Enter, using a real delay or fake timers. Forbid `interactionDelay` in `composer-editor.ts`. E2E (8.4) covers activation only in Chromium (`e2e/playwright.config.ts:23`), not WKWebView.

### S4. `placeholder()` is a new decoration on the dead-key path that the editor never exercises

- CodeMirror's `placeholder` is a widget decoration at position 0 that is removed as soon as the doc becomes non-empty (view `:10172-10181`). The editor does not use it: no `placeholder(` call under `src/lib/core/markdown-editor`. So no shipped surface has tested this on WKWebView.
- The documented WebKit bug class is DOM restructuring next to a composing text node during dead-key input (`composition-aware-bracket-matching.ts:9-24`). The first keystroke in an empty composer is exactly that: a widget node is removed while the browser composes. Example: a capture that starts with "É" or "Á" (the owner types Portuguese).
- UNVERIFIED whether WebKit loses the accent here. Fix: add "first character is a dead-key accent in an empty composer" to 8.5 as its own case. Keep a zero-risk fallback ready: a Svelte overlay `{#if !text}` placeholder outside the CodeMirror DOM, which needs no editor change.

### S5. The payload cost is left open, but it decides first-`[[` latency on the UI thread, and a lighter existing command was not weighed

- `get_all_vault_entries_v2` is a sync `fn` (`src-tauri/src/commands/vault.rs:562-575`). The repo says sync commands "run on the app main thread and stall the window" (`vault.rs:113-117`).
- The composer pays the full clone and serialization (snippet, tasks, outgoing links, frontmatter per note; scout 15 §2.1) on the first `[[` of every summon, even an empty `[[`. The main window instead keeps a version-gated, delta-patched memo.
- Design section 2 rejects only "a new lean Rust command". It never mentions `get_all_property_records` (`vault.rs:1055-1067`, an existing zero-arg command), which validator 2 gap 1 raised. That command drops tasks, snippet and links, and still carries `path` plus frontmatter as `properties`. It is also sync and needs an adapter to the `NoteEntryV2` shape the source reads (`wikilink/completion.ts:27-29`, `:87-90`).
- Fix: before Task 3, measure `exit get_all_vault_entries_v2 after Nms` on the owner's vault (`CmdTrace`, design Q-perf). Record the result together with the `get_all_property_records` option, not as an open question after delivery.

### S6. Task 2 pins a guessed attribute value in a test

- 8.2 item 7 asserts `autocorrect="on"`. Section 1 admits it is UNVERIFIED whether that matches the textarea's effective WebKit behavior. The textarea sets `spellcheck="false"` (`+page.svelte:209`), and whether macOS autocorrect is even active with spellcheck off is UNVERIFIED.
- So the test would lock in a guess: an "on" that diverges from today (or is inert) stays green.
- Fix: answer Q4 and confirm the textarea's behavior by hand first. Then write the assertion for whichever value is confirmed.

## nit

- N1. "A composer is open for seconds" (section 2) is an assumption, not a fact. Nothing hides the composer on blur: there is no `Focused` handler in `src-tauri/src`, only `intercept_close_as_hide` (`lib.rs:95`, `:151`). The window can stay up indefinitely, and the memo then misses notes and tags created meanwhile, or holds the old vault across a switch. `vault-index-updated` already reaches the composer (validator 2 gap 2). Either accept this in Q6 explicitly, or reset the memo on that event, registered after the two existing listeners so `on.mock.calls[0]` at `composer-page.test.ts:88` keeps its meaning.
- N2. The "No vault open: unreachable" row in section 7 covers only the hotkey (`lib.rs:44-46`). `open_composer` (`quick_capture/commands.rs:411-416`) has no `db::is_open()` gate. It has no frontend caller today (grep of `src` finds only `commands.ts:222`, `:325`), so this is harmless, but the claim is broader than the evidence.
- N3. The drag-region UNVERIFIED item is resolved. `drag.js` (`tauri-2.12.5/src/window/scripts/drag.js:51-67`) walks the composed path, and a `contenteditable` element without the attribute blocks dragging, so `.cm-content` never drags and the wrapper's `"false"` is redundant but harmless. Separately, the manual check "window drag from the padding" (8.5) will fail before and after the change. The drag invokes `plugin:window|start_dragging` (`drag.js:103-104`), and `composer.json:6-10` lacks `core:window:allow-start-dragging`: it is not in `core:window:default` (`gen/schemas/acl-manifests.json`) and only `default.json:11` grants it. Take that item out of the check list so the pre-existing failure is not blamed on the swap and nobody widens the capability.
- N4. Memoize the mapped `{ files, notes }`, not the raw IPC promise. With `filter: false` and no `validFor`, the source re-queries on every debounced keystroke. Mapping entries to `FileEntry` and filtering `.view` per call is O(N) allocation per keystroke. The `EditorHost` contract also treats `files` as a shared, read-only index (`editor-host.ts:37-43`).
- N5. `setComposerText` as a full-doc replace at `:113` and `:130` moves the caret to the end and closes the list while the user keeps typing. That is parity with the textarea, but `withoutWritten` only ever strips a prefix (`:138-140`). Deleting `0..written.length` keeps the caret and avoids replacing the DOM in the middle of a composition. Optional.
- N6. `buildEditorTheme` takes `fontFamily` as its first parameter (`setup/editor-theme.ts:12-19`). Section 6 lists the other five arguments only. The surface theme overrides `.cm-scroller` anyway, but name the argument (for example `''`).
- N7. Task 5 runs a full `cargo test` for a description string in `composer.json:4`, which costs a throttled cargo slot (memory `cargo-builds-throttled`). Either drop the edit (the ADR amendment carries the correction) or accept the cost knowingly.
- N8. The hint row "ESC cancels · ⌘↩ saves" (`+page.svelte:218`) becomes half-true while a list is open. It is left alone for scope, which is correct, but list it under Q2 so the owner decides with it in view.
- N9. Section 4 cites Svelte's delegation path. `<svelte:window on:keydown>` uses the non-delegated `create_event` (`svelte/src/internal/client/dom/elements/events.js:55-68`), whose `cancelBubble` check is the same line. The conclusion holds; only the description is off.

## Checked and not refuted

- Zero editor edits: the composer imports only exported symbols. The sources read nothing but the `editorHost` facet and `state.doc` (`tag/completion.ts:14-41`, `wikilink/completion.ts:43-123`). `markdown-editor-imports.test.ts:15-23` constrains only files under the editor folder.
- ACL: `webview/mod.rs:2080` rejects only plugin commands, apps with an app manifest, or non-local origins. `build.rs:23` is a bare `tauri_build::build()`.
- E2E: a bare `/composer` load registers `__e2e.fs`, `populate` rebuilds the mock index (`e2e/mocks/virtual-fs.ts:101-122`, `vault-index.ts` comment `:379-380`), and both commands have handlers (`e2e/mocks/tauri-core.ts:485`, `:491`).
- Keymap order: same-precedence bindings merge into one `run` array in extension order, and the first command that returns true wins (view `:9258-9270`). `stopPropagation` fires only when the binding handles the key (`:9264-9268`, `:9306-9307`). `defaultKeymap` binds `Escape` and `Mod-Enter` (commands `:1805-1806`) and is correctly left out.
- `isDark()` via the `dark` class works: `applyStoredTheme` → `applyMode` toggles it (`theme.service.ts:30-37`, `:54-67`).
