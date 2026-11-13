# Adversarial critique of the deep dive 002 synthesis

Basis: HEAD `84fc88230`, read-only. Library sources are under `node_modules/.pnpm/@codemirror+{state@6.7.6,commands@6.11.1,view@6.43.15,search@6.7.2,lang-markdown@6.5.2}`. Nothing was run. The file was not written because subagents return text. Labels: F means read in code, I means inference.

## 1. Bottom line

The synthesis is mostly right. Variant B, a change filter on `delete*` and `move*` plus a selection clamp, carries less risk than the Issue as written. I checked its core library claims and they hold (F):
- `filterTransaction` maps a blocked change's selection back, so a blocked Backspace puts the caret at `F1` (`state:2443-2455`).
- `ChangeSet.filter` filters change by change, so half of `moveLine` applies (`state:892-922`).
- `deleteLine` does `if (from > 0) from--` (`commands:1471-1491`).
- Undo and redo pass `filter: false`, but `select.undo` does not (`commands:530-556`).
- Transaction filters run last-registered first (`state:2457-2466`).
- `isUserEvent` matches by prefix.
- `EditorSelection.create` throws on an empty array (`state:1463-1465`).

It is still wrong in five places that matter for the build:
- The clamp code it prescribes does not type-check.
- Its main structural premise has a keyboard counterexample (`gotoLine`) and a typing-path counterexample (deletions the browser makes itself arrive as `input.type`).
- One of its "guard" acceptance tests cannot pass as specified (Properties writes are not in history).
- Its no-rebuild test can pass while typing transactions are being rebuilt.
- It names the wrong reason the first body line "starts at line start" for Enter.

None of these sinks variant B. All of them should be fixed in the Issue before launch.

## 2. Errors in the synthesis

### E1. The prescribed return spec fails `pnpm check`, and the obvious workaround brings back risk 10 (F)

Section 2.2 rule 4 says to return `{ changes: tr.changes, selection, effects: tr.effects, annotations: tr.annotations, scrollIntoView }`.
- `Transaction` declares `startState`, `changes`, `selection`, `effects` and `scrollIntoView`, plus `annotation(type)`. It does not declare `annotations` (`state/dist/index.d.ts:920-943`). The field exists only at runtime, as internal state.
- A build agent therefore hits a TS error. It will either cast to `any` or rebuild with `userEvent: tr.annotation(Transaction.userEvent)`.
- That rebuild drops every other annotation, including `fromHistory` on `select.undo`. History reads `fromHistory` from that annotation (`commands:531-536`), so Mod-u and Mod-Shift-u break whenever the clamp rewrites them.

Fix, the idiom CodeMirror's own `indentOnInput` uses (`@codemirror/language/dist/index.js:1215`):

```ts
return [tr, { selection, sequential: true }];
```

`resolveTransactionInner` reads the internal `annotations`, `changes` and `effects` straight off `tr` (`state:2403-2415`). `mergeTransaction` in sequential mode maps the new selection through an empty change set (`state:2382-2401`). This keeps every annotation, effect and scroll flag, and it type-checks: `Transaction` is assignable to `TransactionSpec`.

Risk 10 is therefore not "structurally untouched" under B. It is untouched only if the Issue names this idiom. The synthesis's own text steers the implementer away from it.

### E2. The premise "every keyboard selection is clamped" is false: gotoLine (F)

The repo installs `searchKeymap` minus `Mod-d` (`editor-extensions.ts:162`), so `Mod-Alt-g` `gotoLine` is bound (`search:1057`). Its dispatch is `{ effects: [close, scrollIntoView], selection }` with no userEvent (`search:363-366`).

"Go to line 1" or "go to line 3" therefore leaves the caret in the hidden range, unclamped. Under B, typing or Enter there edits the opening fence. This is a keyboard path, which Section 2.1 says cannot reach the hidden lines.

Likelihood is low: the owner is unlikely to use go-to-line, and an app-level shortcut on Mod-Alt-g was not checked. List it in "Out of scope", or clamp selection-only transactions that carry no userEvent. The synthesis rejected that broader clamp, so take the first option and document it.

### E3. The premise "deletions only come as delete*" is false for deletions the browser performs (F, then I)

- A DOM-originated change, deletion included, is dispatched as `input.type` or `input.type.compose[.start]` by `applyDefaultInsert` (`view:4468-4478`). It is never `delete.*`.
- CodeMirror leaves a key to the browser while composing (`composing > 0`). On desktop Safari and WKWebView, it also leaves the first key event within 100 ms after `compositionend` to the browser (`view:4700-4713`, with `compositionPendingKey` set at `view:5332`).

Scenario for this owner (I):
1. At the start of the first body line, press `´` to start a dead key.
2. Press Backspace to cancel it. This happens during composition, so the browser handles it.
3. Press Backspace again within 100 ms.
4. The second key goes to the browser too. If WebKit deletes the line break before the line, the result is `input.type` crossing `B`. B never filters it, and the fence merges (`---First line`), as it does today.

Whether WebKit deletes anything there at all is unknown: the previous line is `display:none`, and WebKit edits by visible positions. It may be a no-op.

This is not a regression; it is a gap B leaves and the Issue's variant would have filtered. Add a manual WKWebView check: dead key, then Backspace twice fast, at column 0 of a non-empty first body line. Document it as residual. Do not add code to the typing path for it unless the check reproduces it.

### E4. The Properties-undo claims are wrong (F)

Properties and other external writes reach the editor through `replaceDoc` (`MarkdownEditor.svelte:630-651`). That function dispatches with `Transaction.addToHistory.of(false)` (`MarkdownEditor.svelte:189-192`). A Properties write is never in history.

- Section 2.4 says "a frontmatter write by Properties or meta-bind is always restorable". That is wrong for Properties.
- The 3.4 guard says "a dispatch with no userEvent that rewrites the frontmatter (meta-bind and Properties shape) applies, and undo(view) restores the old frontmatter". Built with the real Properties shape, it fails for a reason unrelated to the guard. Built without `addToHistory(false)`, it does not test the Properties shape.
- The manual step "a Properties edit ... then Cmd+Z" undoes the previous body edit instead. A tester can easily read that as a guard bug.

Split the guard into two cases:
- **meta-bind shape:** `dispatchMetaBindUpdate` replaces `[0, frontmatterEnd]` with no userEvent and stays in history (`widgets.ts:899-924`). It applies, and undo restores it.
- **Properties shape:** no userEvent plus `addToHistory.of(false)`. It applies and keeps the caret on the same body text. Make no undo assertion.

Drop "then Cmd+Z" from the Properties manual step.

### E5. The no-rebuild probe can pass while typing transactions are rebuilt (F)

The probe "sees `tr.selection === undefined` for an `input.type` dispatch". It passes when the guard rebuilds the transaction as `{ changes, effects }` with no selection and no annotations. That is exactly the rebuild that loses the userEvent, which affects undo grouping (`commands:499-508`, `joinableUserEvent`), autocomplete and `indentOnInput`. The compose-plus-single-undo case catches only part of that.

Make it an identity check:
1. Register a stash filter after the guard, so it runs first, and store `tr`.
2. Register a probe before the guard, so it runs after it, and assert `probeTr === stashedTr`.
3. Also dispatch with a custom `Annotation` and assert that it survives.

Run the check for `input.type`, `input.type.compose`, a mid-body `delete.backward` and a mid-body `select`. Every pass path then proves it returns the same object.

### E6. The Section 2.1 reasoning is right for the wrong reason (F)

The claim is that "every keyboard input command acts ... at or after the start of the caret's line". `insertNewlineContinueMarkup` is a counterexample: its blockquote branch deletes on the previous line (`lang-markdown:249-256`), and its list branch reads the previous line (`:225`).

It is harmless here only because the previous line is the closing fence:
- `/>\s*$/` cannot match `---`.
- At `B`, `resolveInner(B, -1)` finds no list or quote context. The fence's HorizontalRule ends at `F1`, so the command returns `false` and Enter falls through to `insertNewlineAndIndent`.

Write the claim as "no input command edits the line above when that line is exactly `---`". Do not state it as a general law; a later markdown-keymap change could break it.

## 3. Additional facts the synthesis did not use

**F1. Menu Select All is answerable without the app.**
- The Edit menu installs the predefined `.select_all()` (`src-tauri/src/lib.rs:226-234`).
- A DOM selection change with no recent origin is dispatched with userEvent `"select"` (`view:4357-4366`), and keydown sets that origin (`view:4999-5000`).
- So a native Select All that spans the content (I: WebKit's selectAll covers the editable root) reaches the clamp as `select` and becomes `[B, len]`. Variant B clamps it.
- The context-menu Select All calls CodeMirror's `selectAll` (`MarkdownEditor.svelte:372-376`) and is clamped too.
- Keep the manual check, but downgrade the unknown.
- Side effect: any WebKit-driven DOM selection that lands in the hidden lines is now moved to `B`. That is a fix, with a small risk of the selection flapping back and forth if WebKit keeps renormalizing (I, low). The manual check covers it.

**F2. Accent over a multi-line selection.** When composition starts over a multi-line selection, CodeMirror first deletes the selection with userEvent `"input"` (`view:5309-5321`). Under B this is unfiltered. It is safe for clamped keyboard selections. For a pointer drag from the body into the top padding (head at 0, pre-existing), the owner's first accent deletes the whole frontmatter. Name this case in "Out of scope". Typing a dead key is the most likely way this owner triggers it.

**F3. The harness failure is likely, and I can say where (I, from reading).**
- `19-meta-bind.md` lines 1-6 parse as a HorizontalRule and a SetextHeading over lines 2-6, so `boundaryLines` visits lines 1, 2 and 6.
- At line 6, `endsAtLineStart` dispatches `select` `[line5.from, line6.from]`, which lies wholly below `B`. The clamp turns it into a cursor at `B`.
- The comparison state `earlier` is built with an unfiltered `state.update` (`invariants-harness.test.ts:316-322`). It still touches line 5, which reveals the setext underline on line 6.
- The keys then differ inside line 6, so the step fails. The edge doc "bullet list right under frontmatter" (`fixtures/edge-corpus.md:84-91`) is the same shape.
- The "type a character" step (`:331-338`) stays green under B. Its `input.type` insert at 0 or at the fence start is unfiltered and breaks the frontmatter for one step. The following `delete` then runs with `bodyStart` null, and neither file has a later `---`.
- The proposed early return covers lines 2 and 6. Keep it, with the owner's approval.

**F4. Blocked keys split undo groups (I, harmless).**
- A blocked Backspace dispatches a transaction that only sets the selection.
- History records it through `addSelection` (`commands:515-522`).
- `addChanges` will not join the next edit into the previous group (`!lastEvent.selectionsAfter.length`, `commands:502-504`).
- So after a blocked key, the next Cmd+Z undoes less. This is visible and harmless. Mention it in the commit; no test is needed.

**F5. Clamp ordering is correct.**
- `indentOnInput` is registered before `livePreview` (`editor-extensions.ts:136,146`), so it runs after the guard.
- The repo defines no other transaction or change filter.
- `form-control-events.ts` keeps Backspace typed inside meta-bind `<input>`s away from the CodeMirror keymap. Even if it failed, B blocks the fence edit at `B` that this would cause today.

## 4. Risk ranking corrections

- **Risk 10:** medium for B as written, because of E1. Low once the Issue names `[tr, { selection, sequential: true }]`.
- **Risk 7:** its pre-existing triggers should also list `gotoLine` (E2) and F2. Both are mentioned nowhere.
- **New residual R12, low:** a deletion the browser performs across `B` during or right after a dead key (E3). Same as today, not a regression.
- **New process risk R13, certain if unchanged:** the Properties-undo guard and the manual step (E4) produce a false failure.
- Ranks 1 to 4, 8 and 9 stand. Risk 5 stands as likely, with the concrete locations from F3.

## 5. Required amendments on top of synthesis Section 3

1. **3.1, clamp return:** replace the spec with `return [tr, { selection, sequential: true }]`, and say why (`Transaction.annotations` is untyped; this keeps `fromHistory`, the userEvent and `addToHistory`).
2. **3.3 Out of scope, add these lines:**
   - `gotoLine` (Mod-Alt-g) sets a selection with no userEvent and is not clamped.
   - A deletion the browser performs during or right after a dead key arrives as `input.type` and is not filtered.
   - Starting an accent over a pointer selection that reaches 0 deletes the frontmatter, as today.
   - An `input.drop` into the top padding inserts before the opening fence, as today.
3. **3.4, guards:**
   - Split the meta-bind and Properties shapes. Undo applies to meta-bind only.
   - Replace the `tr.selection === undefined` probe with the stash-and-identity probe plus a custom annotation. Run it for `input.type`, `input.type.compose`, a mid-body `delete.backward` and a mid-body `select`.
   - Add a `select.undo` case: put a selection wholly below `B` into history, run `undoSelection`, and assert no throw, a head `>= B`, and that a second `undoSelection` pops further instead of repeating.
4. **3.4, manual:**
   - Drop "Properties edit then Cmd+Z".
   - Add Edit > Select All from the mouse menu.
   - Add dead key, then Backspace twice fast, at column 0 of a non-empty first body line.
5. **3.4, policy text:** say whether the line-break exception applies to `move*` too. It is harmless either way, but the table order is ambiguous.
6. **Section 2.1:** restate the premise as in E6.

## 6. What I did not verify

- I ran nothing. F3 and the E3 WebKit behavior are inference.
- jsdom behavior for `deleteLine`, `addCursorAbove` and `undoSelection` is unchecked.
- An app-wide binding on Mod-Alt-g was not searched.
- The vault mods source is outside the repo and was not read.

## Recommendation

Run 002 as amended: variant B, with the synthesis's Section 3 edits plus the six amendments in Section 5. The most important one is E1, the clamp return form; without it the build agent's likely fix reopens risk 10. Do not run the Issue as written, and do not shrink to the selection-only variant: it leaves the Backspace trigger, which is the one this owner is most likely to hit.
