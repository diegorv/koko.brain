# Dossier: Issue 002, keyboard edits next to the hidden frontmatter

Checked at HEAD `afc0a9df8` (2026-11-12). Read-only research. Facts are cited path:line; inference is marked.

## 1. Still present?

Verdict: present, exactly as written. Nothing under `src/lib` was added since the audit.

Verified in code:
- `src/lib/core/markdown-editor/extensions/live-preview/core/hide-lines.ts:14-20` hides each frontmatter line with `hiddenLineDeco` plus an empty `Decoration.replace({})` from `line.from` to `line.to`. The line breaks are not covered.
- `plugins/frontmatter-field.ts:23` calls `hideLines` from the opening fence to the closing fence. `computeFrontmatter` (:12-27) rebuilds on every `docChanged`.
- `plugins/frontmatter-field.ts:79-88`: only `EditorView.mouseSelectionStyle` is guarded. The doc comment at :86 still says "Keyboard moves (ArrowUp into the frontmatter) are not changed."
- `rg "atomicRanges|transactionFilter|changeFilter|filterTransaction" src/lib` returns nothing.
- `live-preview.ts:47`: `frontmatter: [frontmatterField, frontmatterGutter, frontmatterClick]`. This is the kill-switch entry, so a guard added here is off when the decorator is disabled.
- `parsers/frontmatter.ts:10,24-30`: `findFrontmatterBlock` needs line 0 and a later line to match `/^---\s*$/` exactly, so any damaged fence loses the block.
- `e2e/specs/live-preview/click-reveal/frontmatter.spec.ts:53-65` still pins ArrowUp landing on a hidden line. The file last changed in `52a7ae7b6` (Issue 03, mouse remap).
- `git log -S"transactionFilter" -- src/lib` is empty, so no guard ever existed or was removed.

Not verifiable without running the app (inference): the exact caret path for ArrowUp over `display:none` lines. The e2e at :53-65 records that the caret lands on a hidden line, which matches the Issue.

## 2. Impact for this owner

- Trigger: any note with frontmatter (nearly every note: properties, `_type`, meta-bind) open in live preview, caret on the first body line. The owner presses ArrowUp or Cmd+Up (a natural "go to top" gesture), then types or presses Enter. Or Backspace at the start of the first body line, including a held key repeating past the line start. Cmd+A then Backspace/cut/type also wipes the fences (select-all is 0..doc.length, which includes the hidden range; inference from CM `selectAll`, not run).
- Frequency (inference): medium to high. ArrowUp/Cmd+Up on line 1 is a reflex. Opening a note puts the caret after the frontmatter (`MarkdownEditor.svelte:407,495`, `getPositionAfterFrontmatter`), so the bad state needs one movement key first.
- Severity: wrong data, autosave writes it. The raw YAML shows up as body text (and the closing `---` turns the last line into a setext heading), so the owner sees it at once and Cmd+Z restores it. It is not silent loss, but meta-bind widgets, Properties and `.view` rail views all read the frontmatter and stop matching until fixed. Rank: content safety, medium. Daily core editing is in scope for the owner. No external writer is involved, so it is not demoted.

## 3. Complexity and risk

Size: S (about 40 lines of source, one new test file, one e2e edit). The Issue says M; the whole fix lives in one file.

Files:
- `src/lib/core/markdown-editor/extensions/live-preview/plugins/frontmatter-field.ts`: add and export one guard extension; register it in `live-preview.ts:47` with the other three.
- `src/tests/lib/core/markdown-editor/extensions/live-preview/plugins/frontmatter-field-keyboard.test.ts` (new).
- `e2e/specs/live-preview/click-reveal/frontmatter.spec.ts:53-65` (changed).

Centrality: a transaction filter runs on every user keystroke in every note with a hidden frontmatter. A bug would silently drop typing, so the guard must be a strict no-op when: no hidden range, no `input`/`delete`/`move`/`select` userEvent, or the change is wholly at or after the first body line.

Readers/regression map:
- `frontmatterEnd(state)` (:53) already exists and reads the decoration set; it is used by `bodyStart` (:62) and the mouse path. Reuse it with `tr.startState`. It returns `null` when the decorator is disabled or no frontmatter, which gives "applies only while hidden" for free.
- Programmatic writers have no input/delete userEvent and must pass: `dispatchMetaBindUpdate` (`widgets.ts:885-896`, no userEvent), tab content sync `MarkdownEditor.svelte:190-194` (addToHistory false, no userEvent), `setState`/`freshState`/`showTabState` (not transactions). Properties-panel, task toggle, watcher reload all go through the same external sync (`MarkdownEditor.svelte:~625-650`).
- User-event dispatchers found by `rg userEvent src/lib`: `MarkdownEditor.svelte:345` (`delete.cut`), `:362` (`input.paste`), `paste-html-link-handler.ts:40`, `paste-tsv-handler.ts:36`, `code-block-widget.ts:180`, `widgets.ts:486,501`, `callout-field.ts:87`. All target body text, so unaffected. Cut and menu paste use `replaceSelection`, so the selection clamp also protects them.
- Undo/redo (`undo`/`redo` userEvent) must pass, so Cmd+Z can still restore a frontmatter write.
- Run `invariants-harness.test.ts` (it references `frontmatterField`) and the existing `frontmatter-field.test.ts`, `frontmatter-field-click.test.ts`.

Library facts (read from `node_modules/@codemirror/state` 6.7.6, `dist/index.js`):
- `filterTransaction` (:2430) runs change filters then transaction filters against `tr.startState`.
- A `changeFilter` range array suppresses overlapping changes (`ChangeSet.filter`, :892-922), but an insert at exactly position 0 passes (the `pos == next && iter.len == 0` branch), and an insert attached to a deletion that starts inside a suppressed range is dropped. So ranges are not a clean "protect [0, bodyStart)". Return `false` (drop the transaction's changes) instead.
- A `transactionFilter` result may be a spec; `resolveTransaction` (:2416) merges it. Returning a full spec (`changes`, `selection`, `effects`, `annotations`, `scrollIntoView`) keeps the userEvent annotation. Do not return `[tr, {selection}]`: `tr` is a Transaction, not a spec (inference: it may work by duck typing, not documented).

Risks:
- Dropping a transaction can hide a legit multi-cursor edit that straddles the fence. Rare, visible, recoverable; the clamp makes it nearly impossible. Accept (matches the owner's "no rare-case complexity" rule).
- The first body line can be a block widget (code block, table). A clamped caret at its start reveals its source, same as ArrowUp today. Leave it; the mouse path keeps the selection in that case, the keyboard path does not need to.
- Frontmatter with no following line (`bodyStart` null, :62-64): the guard stays off, as the mouse path does. The doc has nowhere visible for a caret. Leave it and say so in the commit.
- Programmatic selection (no userEvent) into the hidden range is not clamped (for example `MarkdownEditor.svelte:308,606`). The change guard still blocks edits there. Fine.

## 4. Implementation plan (test-first)

One agent, one context. Gate (frontend only): `pnpm check` + `pnpm vitest run`, plus `bash scripts/e2e.sh e2e/specs/live-preview` as the Issue asks. Do not run the full gate while another heavy job runs (serial checks only).

1. Create `frontmatter-field-keyboard.test.ts` next to `frontmatter-field-click.test.ts`. Copy its `mount(doc, cursorLine, disabled)` helper (uses real `livePreviewExtensions`, jsdom, `createMarkdownState`; the `disabled` map takes `{ frontmatter: true }`). Constants: `FRONTMATTER = '---\nstatus: todo\n---\n'`, `DOC = FRONTMATTER + 'First body line.\n\nEnd line.'`. Cases, each failing today:
   - `cursorDocStart` then `insertNewlineAndIndent`: doc starts with FRONTMATTER, and `selection.main.head >= FRONTMATTER.length`. Strengthen the Issue's assertion to the whole doc equal to `FRONTMATTER + '\nFirst body line....'`.
   - `deleteCharBackward` at the start of the first body line: the three frontmatter lines are byte-identical.
   - `'---\nstatus: todo\n---\nab'`, cursor at end, five `deleteCharBackward` calls: doc is exactly FRONTMATTER.
   - `cursorDocStart` then `deleteCharForward`: doc unchanged.
   - Missing in the Issue: `selectAll` then `deleteCharBackward` (and `insertNewlineAndIndent`) keeps the frontmatter and deletes only the body. Today it wipes the fences.
   - Missing: `selectDocStart` from mid-body (shift extend) clamps the head to the body start; `cursorPageUp` lands at body start.
   - Missing: a direct dispatch of a change at 0 with `userEvent: 'input.type'` is dropped; the same at a body position applies.
   - Passes today and must keep passing (regression guards): a dispatch with no userEvent replacing `0..end` (meta-bind and Properties shape) changes the frontmatter; Enter in the middle of the body; typing on body lines; `undo` after such a write restores it.
   - With `{ frontmatter: true }` (decorator disabled): Backspace at the first body line start merges into the fence as today.
   - The Issue's ArrowUp case cannot run in jsdom (no layout; `cursorLineUp` needs coordinates). Cover it with the e2e below plus the `select.*` clamp tests above.
2. Run the new file, confirm the failures.
3. In `frontmatter-field.ts` add one exported extension, for example `frontmatterGuard`, made of two parts:
   - `EditorState.transactionFilter.of(tr => ...)`: if `!tr.docChanged && tr.selection && tr.isUserEvent('select')`, compute `bodyStart` with `frontmatterEnd(tr.startState)` (same `end >= doc.length` rule as `bodyStart` at :62-64; reuse that helper, it is module-private but in the same file). If any range anchor or head is below it, return `{ selection: EditorSelection.create(ranges mapped with max(pos, start), tr.selection.mainIndex), effects: tr.effects, annotations: tr.annotations, scrollIntoView: tr.scrollIntoView }`. This covers `select.pointer` too, which is harmless next to `frontmatterClick`.
   - `EditorState.changeFilter.of(tr => ...)`: if `tr.docChanged` and (`tr.isUserEvent('input') || tr.isUserEvent('delete') || tr.isUserEvent('move')`) and any changed range has `fromA < bodyStart` (use `tr.changes.iterChangedRanges`), return `false`; otherwise `true`. Insert at `bodyStart` is allowed, so Enter at the body start works. Do not use `atomicRanges` (the Issue's own warning: `deleteCharBackward` would delete the whole atomic range).
   - Doc comment: explain why (hidden lines have no caret and Enter or Backspace there breaks the fence), and update the `frontmatterClick` comment at :86 ("Keyboard moves ... are not changed" becomes stale).
4. Register in `live-preview.ts:47`: `frontmatter: [frontmatterField, frontmatterGutter, frontmatterClick, frontmatterGuard]`.
5. Run the new tests, `frontmatter-field*.test.ts`, `invariants-harness.test.ts`, then `pnpm check`.
6. E2E: change `frontmatter.spec.ts:53-65` to "ArrowUp from the first body line keeps the cursor on the first body line and the frontmatter stays hidden". Assert `activeLineText` stays `FIRST_BODY_LINE`, `HIDDEN_LINE.cm-activeLine` count is 0, hidden count is 3. Add one test: ArrowUp then Backspace, then assert `.cm-line` text still starts with the body line and the frontmatter is still hidden (`isRevealed` false). For Cmd+Up use Playwright `Control+Home` only if CM binds it on the CI platform (not verified); otherwise leave Cmd+Up to the jsdom `cursorDocStart` test. Say in the commit message that the e2e ArrowUp expectation was changed (the Issue requires it).
7. Commit as `fix:` with the full detailed message. The changed app code has a test, so no `Test-Exempt` trailer.

Acceptance criteria review:
- Wrong/weak: criterion 1 only checks the prefix, not the body (strengthen as above). "ArrowUp and Cmd+Up put the cursor at the start of the first body line" is untestable in jsdom for ArrowUp and the Cmd+Up key chord is platform dependent in Playwright. Criterion 7 and the "decorator disabled" case are testable via `mount(..., { frontmatter: true })`; live preview off (source mode) is not covered by that helper, so test only the decorator-off case, and note source mode is inferred safe because the extensions are not installed there (not verified in code: I did not trace `editorModeEffects`).
- Missing: select-all, undo, paste/cut over a selection, drag-drop `move.*`, multi-cursor, no-trailing-newline fence-only doc (guard intentionally off).
- The Notes line "the e2e pins only where the cursor lands, not edits, so it stays valid" contradicts the acceptance list, which says to change it. The acceptance list is right; the e2e must change.
- The stale-line text "Backspace at the start of the first body line deletes the line break after the closing fence" is correct; the guard range must include that break (the filter condition `fromA < bodyStart` does).

## 5. Run order

- Blockers: none. No overlap with 004, 015, 062, 009, 070, 067, 068, 028, 003, 010, 012 in files. It does not touch `editor.service.ts`, `widgets.ts`, `MarkdownEditor.svelte`, `properties.*`.
- Series group: `priority-2026-11-08.md` lists 002 under the `properties.logic.ts` / `properties.service.ts` group (005, 022, 081, 008, 002). By code, 002 touches neither file. Its real hot-code neighbours are live-preview frontmatter-field and the `widgets.ts` group (062, 063, 007, 158), but it edits only `frontmatter-field.ts` and `live-preview.ts:47`, so no merge conflict is expected with them. It can run alone, at any point in the queue.
- Shared files: `live-preview.ts` (also touched by 061 and the paste Issues 055, which only mention it in text); `frontmatter.spec.ts` (no other open Issue in `.scratch/open-itens/issues` references it). Issue 001 (caret follows text across frontmatter rewrites, `MarkdownEditor.svelte`) is a sibling by theme: its caret mapping and this clamp do not conflict, since external syncs carry no userEvent.
- Suggested slot: queue position last (as proposed) is fine for ordering, but given S size, low risk and daily-editing reach, it could move earlier, right after 004 and 015, if the owner wants.

## Not verified

- No code was run (no vitest, no e2e, no app). The transaction-filter behavior comes from reading `@codemirror/state` 6.7.6 source, not from running the new guard.
- Source-mode behavior and the Playwright Cmd+Up chord are unverified.
