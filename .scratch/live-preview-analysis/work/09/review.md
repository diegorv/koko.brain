VERDICT: APPROVED

# Review: Issue 09, legacy decorations only in source mode; right click does not navigate

Reviewed `git diff main...HEAD` at 9c18d628 (commits 12c35020, 02df3e37, e4b5d9f2, 9c18d628).

## Checks I ran

- `pnpm vitest run src/tests/lib/core/markdown-editor/setup/editor-extensions.test.ts src/tests/lib/core/markdown-editor/wikilink-click-capture.test.ts`: 2 files, 22 tests pass.
- `pnpm vitest run src/tests/lib/core/markdown-editor/`: 97 files, 1281 tests pass. This covers the tests of the changed code (setup, click target, live-preview combined tests).
- `pnpm check`: 0 errors, 0 warnings.
- Probe (temporary test file, deleted, not committed): `createExtensions({ isLivePreview: true })` plus `wikilinkDecoration()` and `calloutDecoration()` appended, which is the main-branch configuration, renders 1 `.cm-wikilink-target` on the same document. So the new live-preview assertion (`wikilinkTarget: 0`) fails against the old wiring. The build's red step failed on a missing export, not on behavior; this probe covers that gap.

The test verdict rests on `src/tests/lib/core/markdown-editor/setup/editor-extensions.test.ts` and `src/tests/lib/core/markdown-editor/wikilink-click-capture.test.ts`, plus the markdown-editor suite run above as a regression check.

## Acceptance criteria

- [x] **Test: the live-preview extension set has no legacy wikilink or callout decorations; source mode still does.** Met. `editor-extensions.test.ts:105-163` mounts a real `EditorView` from `createExtensions` and counts `.cm-wikilink-target`, `.cm-callout` and `.cm-lineNumbers`. Source mode gives 1/1/1 and live preview gives 0/0/0. Reconfiguring `sourceModeCompartment` swaps them both ways. The probe above shows the live-preview case discriminates.
- [x] **Test: a right-button mousedown on a wikilink does not navigate.** Met. `wikilink-click-capture.test.ts:62-88` checks that `findWikilinkClickTarget` returns null for buttons 1 and 2 and returns the element for button 0. `:169-183` checks that a right-button mousedown on a wikilink is not intercepted, reaches the CodeMirror listeners and is not default-prevented. `MarkdownEditor.svelte:59` calls the helper. See finding 3 for the limit of these tests.
- [ ] **Manual check: wikilinks and callouts in live preview look the same as before minus the double styling.** Not done; a human has to look in the app. Finding 1 is a visible change that this check has to cover.

## Decisions, rules and scope

- Matches report items 8, 11 and 12 (`report-markdown-editor.md:58-75`): `e.button !== 0` guard; both legacy plugins are installed only in source mode, and the callout one stays there because it is the only source-mode callout styling.
- Renaming `lineNumbersCompartment` to `sourceModeCompartment` is in scope. That compartment already held exactly the source-mode-only set, and the rename keeps the initial build (`editor-extensions.ts:77`) and the toggle (`MarkdownEditor.svelte:421`) on one helper. No other references are left (grep over `src/`, `docs/`, `help/`).
- In source mode `livePreview(false)` is `[]` (`live-preview.ts:110-111`), so moving the legacy plugins to the front of the extension array changes no decoration interaction there.
- Layer rules, tabs, JSDoc on the new exports and import grouping are fine. No error-handling paths changed. Performance: this removes two ViewPlugins that rebuilt on every scroll in live preview, in line with Performance rule 4.
- No scope creep beyond the rename.

## Findings

1. **Medium (needs a human decision, not blocking)**, `src/lib/core/markdown-editor/setup/editor-extensions.ts:71-77` together with `extensions/live-preview/inline/handlers/wikilink-handler.ts:25`. In live preview, a wikilink whose range the selection touches is skipped by `wikilinkHandler` (`isTouched` → `continue`). The legacy `.cm-wikilink-*` marks were the only styling and the only click target (`WIKILINK_SELECTOR`) for that revealed raw `[[link]]`. After this change it shows as uncolored plain text, and a click places the cursor instead of navigating; wikilinks have no Cmd/Ctrl+click path either (`click-handler.ts:14` only handles `.cm-lp-link`). Discovery records this as an accepted default. It is more than "minus the double styling", though, and Obsidian keeps revealed link source colored. Fix: during the manual check, look at a revealed `[[link]]` on purpose. If the uncolored source is not acceptable, open a follow-up Issue for a touched-state mark in `wikilinkHandler` (for example dimmed brackets plus a colored target) and not by restoring the legacy plugin in live preview.
2. **Low**, `src/tests/lib/core/markdown-editor/wikilink-click-capture.test.ts:44-62`. The new `describe('findWikilinkClickTarget')` sits between the capture-phase regression JSDoc ("Regression for the bug where clicking a wikilink could leave a multi-line selection…") and the `describe('wikilink mousedown capture-phase contract')` that the JSDoc documents. The comment now describes the wrong block. Fix: move the new `describe` above the JSDoc block (right after the `findWikilinkElement` describe closes at :43).
3. **Low**, `src/lib/core/markdown-editor/MarkdownEditor.svelte:59,421`. Both tests exercise the helpers (`findWikilinkClickTarget`, `sourceModeExtensions` through a test-owned compartment) and a mirrored handler, not the component's wiring. If someone reverts `:59` to `findWikilinkElement(e.target)`, or the toggle `$effect` at `:421` to the old `[lineNumbers(), highlightActiveLineGutter()]`, every test stays green. This follows the existing pattern; the repo has no MarkdownEditor component harness. Fix: no code change required. The manual check should include a right click on a wikilink in both modes and a live preview → source → live preview toggle, confirming that source mode shows the colored `[[link]]` and callout border after the toggle.
4. **Low (out of scope, informational)**, `src/lib/core/markdown-editor/wikilink-click-target.ts:30`. On macOS (the app's primary platform) ctrl+click is a secondary click, but it arrives as `button === 0` with `ctrlKey`, so it still opens or creates the note and the context menu appears as well. The Issue and report item 8 name only the right button, and the build report lists this. Fix: none here. If wanted, a follow-up Issue for `e.ctrlKey && isMac` → `null`.
