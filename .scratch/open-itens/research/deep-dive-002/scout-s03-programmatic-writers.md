# Scout s03: programmatic writers vs the Issue 002 guard

Read-only research at HEAD `a946f22f9`. Nothing was run (no vitest, e2e, app). Library behavior comes from reading `node_modules/@codemirror/*` source. Facts carry path:line. Inference is marked "Inference".

Library versions read: `@codemirror/state` 6.7.6 (`node_modules/.pnpm/@codemirror+state@6.7.6/node_modules/@codemirror/state/dist/index.js`), `@codemirror/view` 6.43.15, `@codemirror/commands` 6.11.1, `@codemirror/search` 6.7.2 (same `.pnpm` layout).

## 1. Summary

- Every programmatic writer in the repo that touches the frontmatter or the document start dispatches with NO `userEvent`. A guard that matches positively on `input` / `delete` / `move` / `select` lets all of them through. A guard written as "anything that is not undo/redo" would block every one of them. This is the main implementation trap.
- No writer reaches CodeMirror by a path that bypasses the filters except `view.setState` (tab loads, fresh states). Those never run filters, so they need no care.
- Writers that DO carry a matching userEvent (`input.paste`, `delete.cut`, `input.table.*`, `input.callout.set-type`, `input.codeblock.set-language`) all edit body text at or after `bodyStart`. They stay a no-op under the guard unless the caret is in the hidden range.
- The programmatic writers can leave the caret INSIDE the hidden range, because the guard's selection clamp only sees `select*` transactions that carry a userEvent. After such a write, the next typed character is a pure insertion below `bodyStart` and the guard drops it with no feedback. Today the same keystroke corrupts the fence visibly. Cases: Cmd+D / Cmd+E or a Properties-panel add on a note with no frontmatter and the caret at 0; File History restore; a legacy text-search jump to a match inside the YAML; right-click in the top padding. This is the main new-behavior risk (R2).
- Design defect found while comparing change shapes: narrowing with a changeFilter range is not atomic. `moveLineUp` on the first body line produces one suppressed deletion and one kept insertion, so the closing fence is DUPLICATED below the body line. This contradicts the Issue's own acceptance test ("moveLineUp leaves the doc equal to DOC") (R1). A straddling replacement loses its inserted text while its body part is deleted.
- Replace-all / replace-next from the CodeMirror search panel stop touching frontmatter occurrences, silently (R4).

## 2. Facts

### 2.1 How the guard will be wired

- `BLOCK_EXTENSIONS.frontmatter = [frontmatterField, frontmatterGutter, frontmatterClick]` at `src/lib/core/markdown-editor/extensions/live-preview/live-preview.ts:47`. The array is skipped when the decorator is disabled (`live-preview.ts:90-92`) and the whole `livePreviewCompartment` is `[]` in source mode (`live-preview.ts:109-111`).
- `frontmatterEnd(state)` reads the decoration set of `frontmatterField` (`plugins/frontmatter-field.ts:53-59`); `bodyStart` is private and returns `null` when `end >= doc.length` (`:62-65`).
- `computeFrontmatter` hides lines `openIdx..closeIdx` with one `Decoration.replace({})` per line (`frontmatter-field.ts:13-26`, `core/hide-lines.ts:14-20`). Line breaks are not covered.
- Nothing under `src/lib` defines `transactionFilter`, `changeFilter`, `transactionExtender` or `atomicRanges` (rg, empty).
- `createExtensions` installs `history()` (`setup/editor-extensions.ts:133`), `autocompletion` with three sources (`:142-145`), and `keymap` with `defaultKeymap`, `searchKeymap` (minus Mod-d), `historyKeymap`, `completionKeymap`, `indentWithTab` (`:150-166`). The update listener computes `fmChanged` from `update.changes` (`:173-193`); a filtered transaction reaches it already filtered.

### 2.2 CodeMirror mechanics the guard depends on

- `filterTransaction` runs every `changeFilter` first, then every `transactionFilter`, both against `tr.startState` (`@codemirror/state` index.js:2430-2468). `false` drops all changes and maps the selection back through the inverted changes; an array calls `tr.changes.filter(ranges)`. The filtered transaction's selection is `tr.selection.map(back)` and effects go through `StateEffect.mapEffects(tr.effects, back)` (:2454).
- A `transactionFilter` that returns a spec is passed to `resolveTransaction(state, specs, false)` (:2465): no further filtering, then `extendTransaction`. The spec's `changes` default to empty, so a selection-only spec must only be used for transactions with no doc change.
- `ChangeSet.filter(ranges)` (:892-922): a pure insertion at `pos == next` with `iter.len == 0` passes (:897); a deletion inside the range is moved to `filtered` and left unchanged in the result (:910-917); an insert attached to a replacement goes with the first section (`iter.off == 0 ? iter.ins : 0`, :902, :915). Insertions located after the range are kept.
- `isUserEvent('input')` matches `input.type`, `input.type.compose`, `input.paste`, `input.drop`, `input.replace.all`, `input.complete`, `input.table.add-row` and the like (`:2313-2316`).
- DOM-observed typing becomes `input.type`, plus `.compose` and `.compose.start` while composing (`@codemirror/view` index.js:4468-4478). Dead-key accents on macOS go through this path.
- `moveLine` builds two changes: `{from: nextLine.from, to: block.from}` and `{from: block.to, insert: lineBreak + nextLine.text}`, userEvent `move.line` (`@codemirror/commands` index.js:1403-1430).
- Undo and redo dispatch `userEvent: "undo"` / `"redo"` (commands index.js:554); `undoSelection` / `redoSelection` dispatch `select.undo` / `select.redo` (:537). `selectAll` dispatches `select` with anchor 0 (:1085).
- Search: `findNext`/`selectMatches` use `select.search` / `select.search.matches` (`@codemirror/search` index.js:860-916), `replaceNext` uses `input.replace` (:952), `replaceAll` uses `input.replace.all` in one transaction (:975).
- `ChangeDesc.mapPos(pos, assoc=-1)` (state index.js:736-760): a pure insertion at the caret position keeps the caret BEFORE the insertion (:751-752, `endA == pos && assoc < 0 && !len` returns `posB`); a caret at the end of a replaced range lands AFTER the inserted text (falls through to `posB += ins`, :753); a caret strictly inside a replaced or deleted range maps to the range start (:752).

### 2.3 Writers that dispatch into the view, with their userEvent

| Writer | File:line | Dispatch shape | userEvent | Guard keyed on user input lets it through? |
|---|---|---|---|---|
| External content sync (Properties panel, Cmd+D/Cmd+E, link rewrite, task toggle, watcher reload, mods `syncExternalContentToEditor`, deep link / Quick Capture append and prepend, type-definitions rewrites) | `MarkdownEditor.svelte:630-655` calls `replaceDoc` (`:175-204`); spec at `:189-192` | `docDiff` changes plus `Transaction.addToHistory.of(false)`; no explicit selection (the selection maps) | none | Yes |
| Too-large external diff | `MarkdownEditor.svelte:179-188`, `freshState` `:107-133` | `setState` of a fresh state, caret at the clamped OLD offset | not a transaction | Yes (filters never run) |
| Tab switch, first visit and revisit | `MarkdownEditor.svelte:221-254` | `setState`; revisit is `saved.update({changes, addToHistory:false, effects})` | none | Yes |
| Meta-bind select / toggle / number / date | `widgets.ts:812-818`, `:1020-1024`, `:1090-1106` -> `dispatchMetaBindUpdate` `:899-926` | `changes {from:0, to: doc.length - body.length, insert: newFrontmatter}` plus `scrollSnapshot().map(changes)` effect (`:916-924`) | none | Yes |
| Meta-bind button `updateMetadata` | `widgets/meta-bind-button-widget.ts:98-101` | same function | none | Yes |
| File History restore | `features/file-history/file-history.service.ts:92-96` | `{from:0, to: doc.length, insert: restoredContent}` | none | Yes |
| Todoist note writer (active tab) | `features/todoist-sync/note-writer.service.ts:76-80` | `docDiff(...)` + `addToHistory:false`; other tabs go through `syncExternalContentToEditor` (`:83`) | none | Yes |
| Copy block link (appends ` ^id`) | `features/copy-block-link/copy-block-link.service.ts:51` | single insertion at `line.to` | none | Yes |
| Task checkbox | `widgets.ts:44-46` | one char replace | none | Yes (body) |
| Wikilink completion `apply` (file, alias, heading, block id) | `extensions/wikilink/completion.ts:77-80`, `:104-107`, `:163-166`, `:215-218` | changes plus explicit `selection` | none | Yes (body) |
| Pending scroll (search jump, TOC, tasks, calendar chip, mods `openNoteAt`) | `MarkdownEditor.svelte:606-609` | `selection: cursor(clampedPos)` plus scroll effect | none | Selection is NOT clamped (no userEvent) |
| Same-note wikilink to heading or block | `live-preview/wikilink-navigation.ts:56` | `selection: cursor(anchorPos)` | none | Not clamped |
| Right-click caret | `MarkdownEditor.svelte:302-310` (dispatch `:308`), `:384-387` | `selection: cursor(pos)` | none | Not clamped |
| Menu Cut | `MarkdownEditor.svelte:339-348` (`:345`) | `replaceSelection('')` | `delete.cut` | Matches `delete`: narrowed |
| Menu Paste | `MarkdownEditor.svelte:354-371` (`:360-364`) | `replaceSelection(text)` | `input.paste` | Matches `input`: narrowed or dropped when caret is hidden |
| Menu Select All | `MarkdownEditor.svelte:373-377` | `selectAll(view)` | `select` | Clamped (owner decision) |
| HTML-link paste | `handlers/paste-html-link-handler.ts:34-43` | `selection.main` replace plus explicit `selection {anchor}` | `input.paste` | Matches `input` |
| TSV paste | `handlers/paste-tsv-handler.ts:28-38` (`userEvent` at `:36`) | same shape | `input.paste` | Matches `input` |
| Table +col / +row | `widgets.ts:517`, `:530-533` | line-end insertions | `input.table.add-column`, `input.table.add-row` | Matches `input`, body only |
| Callout type | `plugins/callout-field.ts:85-88` | replace of the type word | `input.callout.set-type` | Matches `input`, body only |
| Code block language | `widgets/code-block-widget.ts:178-181` | replace/insert after the fence | `input.codeblock.set-language` | Matches `input`, body only |
| Scroll, theme, mode, rebuild | `MarkdownEditor.svelte:87, 577, 662, 672, 688, 709`, `core/scroll-debounce-plugin.ts:37`, `core/mouse-selecting.ts:21,42`, `plugins/callout-field.ts:33` | effects only | none | No-op |

Notes on the table:
- `editorStore.editorView` is read outside the editor only by `note-writer.service.ts:69`, `app/commands.ts:383,393` (copy block link/embed), `file-history.service.ts:90`, and by mods through `MOD_APP.editorStore` (`plugins/mods/mod-app.service.ts:27-28`). No other module dispatches into the view.
- Templates and Quick Capture never dispatch into the editor. `templates.service.ts:63-69` and `quick-capture/note-composer.service.ts:44-50` call `openOrCreateNote`, which writes the file through Rust `create_note` and then `openFileInEditor` (`core/note-creator/note-creator.service.ts:123-127`). The tab content arrives through `freshState` or `showTabState` (no filter). The caret comes from `getPositionAfterFrontmatter` (`core/editor/editor.logic.ts:110-123`, used at `MarkdownEditor.svelte:407,495`).
- Quick Capture (`quick-capture.service.ts` dispatch path, `app/deep-link-actions.ts:44-78`, `features/deep-link/deep-link.service.ts:268-312`) writes disk then calls `syncExternalContentToEditor(..., 'none')`, so it lands as a no-userEvent `docDiff`. Its `prepend` mode builds `content + '\n' + existing` (`deep-link.service.ts:268-276`, `deep-link-actions.ts:70-77`), a pure insertion at position 0 that puts text before the opening fence. That already breaks the frontmatter regardless of the guard; it is not a guard concern, and the guard must not be written as "block any insertion at 0" without a userEvent check.
- Link rewrite on rename: `core/filesystem/link-updater.service.ts:49-66` writes disk, then `syncExternalContentToEditor(filePath, updatedContent, true, 'none')`. `replaceWikilinks` runs over the whole content, so frontmatter wikilinks are rewritten too. No userEvent.
- Properties panel: `features/properties/properties.service.ts:83-109`; a text field commits on every keystroke (`:90-91` comment), so one no-userEvent `replaceDoc` per keystroke goes through every filter. Frontmatter writer: `core/frontmatter/frontmatter-write.service.ts:131-137,160`.
- `rebuildContent` returns the body alone when properties are empty (`core/frontmatter/properties.logic.ts:689-692`), so removing the last property deletes the whole block with a no-userEvent change.
- `extractBody` strips exactly one newline after the closing fence (`properties.logic.ts:55-59`, regex at `:39`), so the meta-bind replace range `[0, doc.length - body.length]` is exactly `[0, bodyStart]`.
- Programmatic transactions use `Transaction.addToHistory.of(false)` in `replaceDoc`, `showTabState` and the Todoist writer, but meta-bind (`widgets.ts:924`) and File History (`file-history.service.ts:92`) use default history, so Cmd+Z undoes them with the `undo` userEvent.
- A pre-existing e2e types into a meta-bind number input and presses Backspace (`e2e/specs/live-preview/click-reveal/meta-bind-text-input.spec.ts:78`); the widgets use `ignoreEvent(isFormControlInputEvent)` (`widgets.ts:446, 846, 991, 1033`), so those keys never reach the keymap.
- Existing unit tests that combine userEvents and frontmatter docs: `plugins/frontmatter-field-click.test.ts`, `src/tests/lib/core/markdown-editor/undo-history-across-notes.test.ts` (mounts the real MarkdownEditor; programmatic syncs at `:179-225`), `invariants-harness.test.ts` (`:316-358`: `input.type` and `delete` at every line start, `select` and `select.pointer` ranges at line starts). `keyboard-reveal.test.ts` and `arrow-reveal.test.ts` do not combine them with frontmatter (rg).

### 2.4 Where the caret can end up inside the hidden range (programmatic, no userEvent)

- Insertion at 0 with the caret at 0: `docDiff('Hello', '---\n_favorite: true\n---\nHello')` is a pure insertion at 0 (`doc-diff.logic.ts:26-52`); `mapPos` keeps the caret at 0 (state :751-752), now before the opening fence. Writers: Cmd+D / Cmd+E (`app/global-keybindings.ts:187-201` -> `lifecycle.service.ts` `updateActiveNote` -> `frontmatter-write.service.ts:132`), Properties-panel first property (`properties.service.ts:106`), meta-bind never (it needs an existing property).
- File History restore replaces `[0, doc.length]`; a caret strictly inside the old doc maps to 0 (state :752), inside the restored frontmatter.
- Search jump by offset: `SearchResult.svelte:123-126` passes `legacyResult.matches[0].position` to `openNoteAt`; `searchFileContent` scans raw content including the YAML (`features/search/search.logic.ts:33-47`); `openNoteAt` clamps to the content length only (`core/editor/open-note-at.service.ts:44-48`). The semantic chunker skips frontmatter (`src-tauri/src/semantic/chunker.rs:64-65`), so line-based jumps are safe.
- Same-note heading wikilink: `findHeadingPosition` scans every line, including YAML comment lines that look like headings (`extensions/wikilink/navigation.logic.ts:21-34`).
- Right-click in the top padding: `handleContextMenu` dispatches a plain cursor at `posAtCoords`, which the click comment says maps to 0 (`frontmatter-field.ts:76-79`, `MarkdownEditor.svelte:308`).
- `replaceDoc` with a diff too large (`DOC_DIFF_MAX_EDITS = 400`, `doc-diff.logic.ts:17`) rebuilds with the old numeric caret offset (`MarkdownEditor.svelte:179-188`).
- Mapping that stays safe: a caret at `bodyStart` with the meta-bind replace `[0, bodyStart]` lands after the new frontmatter (`:753`), so toggling a control does not move the caret into the YAML.

## 3. Regression risks for Issue 002

### R1. Narrowing by range is not atomic: `move.*` duplicates the fence, straddling edits lose their insert

- Scenario: Alt+ArrowUp on the first body line (`moveLineUp`). Changes are `{from: fenceLineStart, to: bodyStart}` (delete the closing fence line) and `{from: block.to, insert: '\n---'}` (commands index.js:1417-1430). A changeFilter returning `[0, bodyStart]` suppresses the deletion (it lies inside the range) and keeps the insertion (it lies after the range) by `ChangeSet.filter` (state :896-919).
- What breaks (Inference from reading the source; not run): the doc becomes `---\nstatus: todo\n---\nFirst body line.\n---\n\nEnd line.`. The frontmatter stays intact, but the body gains a stray `---` below the first body line, which turns that line into a setext heading and autosave writes it. This directly contradicts the acceptance test "moveLineUp(view) leaves the doc equal to DOC" (Issue 002 line 28), so the test would fail against the Issue's own design.
- Related: a replacement that starts below `bodyStart` and ends after it keeps its deletion for the body part but sends the insert to the suppressed part (`iter.off == 0 ? iter.ins : 0`, state :902,:915). Example: an unclamped straddling selection (programmatic caret at 0, then paste) loses the pasted text while the body part is deleted.
- Likelihood for this owner: Alt+ArrowUp on the first body line is plausible (reordering lines); straddling needs an unclamped selection (low).
- Prevention: return `false` for `move` userEvents and for any transaction where some change straddles `bodyStart`; use the range array only where partial application is wanted (`input.replace.all`, `input.replace`). State in the Issue that narrowing applies per transaction family, not to everything.

### R2. A caret left in the hidden range turns the next keystroke into a silent drop

- Scenario: any case in 2.4, then the user types. The caret is below `bodyStart` and nothing clamps it (programmatic selections carry no userEvent, so the clamp does not run). `input.type` inserts at a position below `bodyStart`; for a pure insertion at 0 the Issue's rule returns `false`, so the whole transaction is dropped (Issue 002 line 10).
- What breaks: today the keystroke corrupts the fence and the owner sees raw YAML at once; under the guard the keystroke vanishes and nothing explains why. Backspace and Enter in the same state are no-ops. Mid-composition (a dead-key accent), a dropped `input.type.compose.start` can leave CodeMirror's DOM and state out of step until the next measure (Inference: the DOM-change path at view index.js:4373-4404 dispatches once and does not retry).
- Likelihood for this owner: Cmd+D / Cmd+E are daily and run from inside the editor, but only a note with NO frontmatter and the caret at 0 hits it; his notes nearly all have frontmatter. File History restore and legacy search jump into the YAML are rare. Overall low to medium, with visible-but-unexplained effect.
- Prevention (pick one, state the limit in the commit): (a) accept and pin the behavior with a test so it is a decision, not an accident; (b) also clamp the resulting selection of programmatic doc-changing transactions: a `transactionFilter` on `tr.docChanged && !tr.annotation(Transaction.userEvent)` that reads `frontmatterEnd(tr.state)` (this forces state creation, so only for these rare transactions) and moves a range below the new `bodyStart` to it. Option (b) adds code on every external write, which the owner's "no core changes for corner cases" memory argues against; (a) is the minimal reading. Do not clamp programmatic selections in the `select` branch without a userEvent check (it would change `MarkdownEditor.svelte:606` search jumps and `:308`).

### R3. The guard must test for the userEvents it handles, never for the absence of one

- Scenario: an implementation written as "block unless undo/redo/remote" or "unless `tr.annotation(Transaction.addToHistory) === false`". Meta-bind writes use default history (`widgets.ts:924`) and File History restore too (`file-history.service.ts:92`), so the history annotation is not a reliable discriminator either.
- What breaks: every row of 2.3 marked "none" stops working: meta-bind inputs and buttons, Properties panel, Cmd+D / Cmd+E, link rewrite, task toggle, Todoist writes, File History restore, mods. This is the highest-impact regression if it happens, and it is silent for those writers (a refused write could still leave the widget showing the new value).
- Likelihood: low if the Issue's text is followed (it says "programmatic writes must pass unchanged"), but easy to get wrong in a hurry.
- Prevention: `tr.isUserEvent('input') || tr.isUserEvent('delete') || tr.isUserEvent('move')` for the change filter and `tr.isUserEvent('select')` plus `!tr.isUserEvent('select.pointer')` for the clamp; no negative conditions. Add the writer-shape tests in section 4 so a negative-condition rewrite fails.

### R4. Search panel replace-all / replace-next skip frontmatter occurrences without telling the owner

- Scenario: Cmd+F (CodeMirror search is in the keymap, `editor-extensions.ts:162`), replace-all of a tag or a value that also appears in properties. `input.replace.all` (search index.js:975) matches `input`, so the YAML matches are suppressed and the body matches replaced. `replaceNext` (`input.replace`, :952) on a hidden match does nothing; `findNext` / `selectMatches` (`select.search*`, :860-916) selecting a hidden match is clamped to `bodyStart`.
- What breaks: today replace-all also rewrites matches in the YAML block (an intended rename for a property value). After the guard it silently leaves them. "Find next" on a match that exists only in the hidden YAML appears to do nothing (Inference).
- Likelihood: low to medium; the owner uses properties and views that read them.
- Prevention: say it in the commit message with the Cmd+A change; consider letting `input.replace*` through untouched (replace is an explicit bulk action, and a regex replace that broke a fence is visible and undoable) and keeping the guard on typing, delete and move only. The Issue's replace-all test then asserts the opposite; this is the owner's call, so ask once.

### R5. IME / dead-key composition at the first body line

- Scenario: the owner types accented characters with dead keys. Composition transactions are `input.type.compose[.start]` (view index.js:4468-4478), so the change filter and clamp see every update.
- What breaks: nothing when the composing text starts at or after `bodyStart`. It breaks only when `change.from < bodyStart`, which needs a caret in the hidden range (R2) or a DOM diff whose `from` is shifted left by `findDiff` ambiguity (view index.js:4480-4509). Hidden lines render with `display: none` and an empty replace, so the DOM text for them is empty; whether WKWebView ever reports a diff reaching them was not verified.
- Prevention: keep the filter a strict no-op when every `fromA >= bodyStart`; test composition userEvents at `bodyStart` and in the middle of the body; do not run the select clamp on a transaction that also carries a composition annotation (not found needed; just include a test that a clamp never changes a body-range selection).

### R6. Per-transaction cost and early exit

- Scenario: Properties-panel text fields commit per keystroke (`properties.service.ts:90-91`); each commit is a no-userEvent `replaceDoc`. Every transaction in every note with hidden frontmatter passes both filters.
- What breaks: nothing functional; the cost is `frontmatterEnd` iterating the decoration set (two decorations per frontmatter line, `frontmatter-field.ts:53-59`), plus `tr.state` if used. Reading `tr.state` inside a filter forces the new state to be built before the filter result is known.
- Prevention: check the userEvent and `docChanged` first, compute `frontmatterEnd(tr.startState)` only after them; never read `tr.state` in the user-event filters.

### R7. Selection-only transactions riding with effects

- Scenario: the clamp rewrites a `select` transaction. Callers attach effects that must survive: `EditorView.scrollIntoView` (`MarkdownEditor.svelte:606-609` is a programmatic case and is skipped, but `cursorDocStart` and ArrowUp carry `scrollIntoView: true`), `forceDecorationRebuild`, search effects (`select.search` adds `scrollIntoView`).
- What breaks: a returned spec that omits `effects`, `annotations` (including the `userEvent` annotation and `Transaction.time`) or `scrollIntoView` loses them (state :2404-2414). Dropping the `userEvent` annotation would also make `checkUpdateAction`/reveal logic and history grouping treat it differently.
- Prevention: return `{ selection, effects: tr.effects, annotations: tr.annotations, scrollIntoView: tr.scrollIntoView }` and test that a clamped `select.search` keeps its scroll effect (assert `tr.scrollIntoView` or the effect on the update). Only use the spec form for transactions with `!tr.docChanged`.

### R8. Mods and `MOD_APP` expose the live view and `syncExternalContentToEditor`

- Scenario: a vault mod calls `ctx.app.editorStore.editorView.dispatch(...)` (`mod-app.service.ts:27-28`) with any userEvent, or uses `syncExternalContentToEditor` (`:66-67`).
- What breaks: sync writes pass. A mod that dispatches with `input.*` or `delete.*` at the YAML would now be narrowed or dropped. The mod sources are in `~/kokobrain-vaults/kokobrain-mods-src` (outside this repo), so I did not search them.
- Prevention: ask the owner to grep that tree for `.dispatch(` and `editorView` before shipping; the repo's mods service and docs have no in-repo example that dispatches (rg of `docs`, `src/lib/plugins/mods`).

### R9. Pure insertion at `bodyStart` and widgets that are the first body line

- Scenario: the first body line is a table, callout or code block. `+row` and `+col` (`widgets.ts:517,530-533`), the callout type switcher (`callout-field.ts:85-88`) and the language switcher (`code-block-widget.ts:178-181`) dispatch `input.*` events with positions at or after `bodyStart`.
- What breaks: nothing, provided the strict condition is `fromA < bodyStart` and an insertion exactly at `bodyStart` passes (as the Issue says). A guard that uses `<=` would block them.
- Prevention: tests with a frontmatter doc whose first body line is each widget; assert the exact resulting doc.

### R10. Frontmatter with no following line stays unguarded and sits next to Quick Capture and templates

- Scenario: `bodyStart` is `null` when the closing fence is the last characters of the doc (`frontmatter-field.ts:62-65`); the guard is off and the caret opens at the end of the closing fence (`editor.logic.ts:110-123`). `withUnorganizedFlag` (`core/note-creator/explicit-organization.logic.ts:29-37`) returns `---\n_organized: false\n---\n` plus the content, so an empty template yields a trailing newline and `bodyStart = doc.length`: guarded. A template that is only a frontmatter block without a final newline is not.
- Likelihood: depends on the owner's templates (not read here); the Issue already marks this out of scope.
- Prevention: none in this Issue; say it once in the commit. Do not let the guard's "off when null" be mistaken for a bug in tests.

### R11. Pre-existing prepend breaks the fence before the guard can matter

- Scenario: deep-link / Quick Capture `prepend` (`deep-link.service.ts:268-276`, `deep-link-actions.ts:70-77`) writes text above the opening fence on disk and syncs it as a no-userEvent insertion at 0.
- What breaks: the frontmatter stops being a block (line 0 no longer matches the fence). This is unrelated to 002 and the guard cannot and must not prevent it. Mention it so a later reader does not file it as a hole in the guard.

## 4. Test cases the Issue must add (programmatic-writer side)

All in `frontmatter-field-keyboard.test.ts` unless noted; real `livePreviewExtensions`, no store or logic mocks; assert full-doc equality. `FRONTMATTER` and `DOC` as in the Issue.

1. Writer shapes pass unchanged (each should pass today and after):
   - meta-bind shape: call the REAL `dispatchMetaBindUpdate(view, 'status', 'done')` on a mounted `DOC`; the doc changes to the rebuilt frontmatter and the body is untouched; the caret that sat at `bodyStart` ends at the new `bodyStart` (no clamp, no shift into the YAML).
   - external sync shape: `{ changes: docDiff(old, new), annotations: Transaction.addToHistory.of(false) }` that changes the frontmatter, the first body line, and both at once.
   - whole-doc replace without userEvent: `{ changes: { from: 0, to: doc.length, insert: restored } }` (File History shape).
   - prepend shape: `{ changes: { from: 0, insert: 'x\n' } }` without userEvent applies in full.
   - removing the last property: the no-userEvent deletion of `[0, bodyStart]` applies.
   - Todoist shape: `docDiff` of body lines with `addToHistory.of(false)`.
   - copy-block-link shape: a bare insertion at a body `line.to`.
   - wikilink completion `apply` shape: `changes` plus explicit `selection`, no userEvent.
2. Undo of a programmatic write: after the meta-bind dispatch, `undo(view)` restores the old frontmatter (the Issue has this; keep it with the REAL `dispatchMetaBindUpdate`, because it uses default history).
3. Widgets that carry `input.*` userEvents keep working on a doc with frontmatter, including as the first body line: `input.table.add-row`, `input.table.add-column`, `input.callout.set-type`, `input.codeblock.set-language` shapes (copy the shapes from `widgets.ts:517,530-533`, `callout-field.ts:85-88`, `code-block-widget.ts:178-181`).
4. Paste handlers on a frontmatter doc: html-link and TSV paste (`paste-*-handler.ts`) at a body caret produce the converted text and the caret after it (they set an explicit `selection {anchor}`); with `Cmd+A` first, they replace the body only and leave the three frontmatter lines byte-identical. Menu paste shape `replaceSelection(text)` + `input.paste` the same.
5. Cut: menu cut shape `before.replaceSelection('')` + `delete.cut` after `selectAll` leaves exactly `FRONTMATTER`, and the selected text (what `selectedText` copies) equals the body only.
6. Hidden-caret behavior pinned (decision per R2): programmatic `selection: cursor(0)` without userEvent on a frontmatter doc is NOT clamped; a following `input.type` insertion at 0 is dropped (doc equals DOC) and a following `input.type` at `bodyStart` applies. Also the Cmd+D shape: no-frontmatter doc, caret 0, no-userEvent insertion of a frontmatter block at 0, then assert the resulting caret and the outcome of a typed character; record whichever behavior the owner chooses.
7. Structural-edit atomicity (R1): `moveLineUp` leaves `DOC`; `moveLineDown` on the first body line still works and changes only body lines; a straddling `input.paste` replacement over `[bodyStart - 3, bodyStart + 5]` leaves the doc equal to `DOC` (not a doc with the body part deleted); `input.replace.all` still replaces only the body occurrence.
8. userEvent family matrix at `bodyStart - 1`, `bodyStart` and `bodyStart + 1`: `input.type`, `input.type.compose.start`, `input.type.compose`, `input.complete`, `input.drop`, `delete.backward`, `delete.forward`, `delete.cut`, `move.line`, `move.drop`, `undo`, `redo`, no userEvent. Table-driven; expected: below `bodyStart` unchanged for the guarded families, everything else applies.
9. Clamp keeps what rides along (R7): a `select.search` dispatch with a range inside the YAML and `scrollIntoView: true` keeps `scrollIntoView` and its `userEvent` annotation; `select.undo` / `select.redo` and a `select` with an effect (`forceDecorationRebuild`) keep the effect.
10. Search panel (R4): `findNext` onto a match that exists only in the YAML leaves the selection at `bodyStart` and does not loop; record the replace-next outcome whichever way the owner decides.
11. Kill switch and source mode: with `{ frontmatter: true }` (decorator off) every writer shape above and every keyboard command behave as today; after `editorModeEffects(false, ...)` (source mode) the same.
12. Existing suites unchanged: `meta-bind-writers.test.ts` (it mounts real widgets and calls the writers), `undo-history-across-notes.test.ts` (`:179-225` programmatic syncs and undo), `invariants-harness.test.ts` (`input.type` and `delete` at every line start of a frontmatter doc, `select` ranges ending at line starts; these dispatches fall inside the hidden range and will turn into no-ops or clamps, so check that its checks still hold and note it in the commit).
13. e2e (add to `frontmatter.spec.ts` plus one meta-bind spec): after a meta-bind toggle on a note, ArrowUp then Backspace leaves the YAML hidden and intact; after Cmd+D on a note with frontmatter, typing in the body works and the YAML is untouched; on a frontmatter-less note with the caret at 0, Cmd+D then a typed character (record the chosen outcome).
14. Perf guard: a micro-assertion that a no-userEvent `docChanged` transaction never calls `frontmatterEnd` (spy on the exported helper is not needed; keep the user-event checks before it and cover with a code-review note).

## 5. Not verified

- Nothing was executed. R1 (fence duplication) and the `mapPos` outcomes are derived from reading `@codemirror/state` and `@codemirror/commands`, not from running a transaction.
- WKWebView behavior for dead-key composition at the first body line, and whether a DOM diff can reach into the hidden lines, was not checked.
- The mod sources under `~/kokobrain-vaults/kokobrain-mods-src` were not searched (outside the working directory).
- The owner's template set (frontmatter-only templates without a final newline) was not read.
