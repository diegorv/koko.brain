## SilverBullet / topic 1

**Reveal logic (SilverBullet, `/tmp/silverbullet/client/codemirror/`)**

**Core predicate.** `isCursorInRange` in `util.ts` is the only reveal test:

```ts
// util.ts:219
export function isCursorInRange(state: EditorState, range: [number, number]) {
  if (state.readOnly && !state.field(readOnlyCursorActive, false)) return false;
  return state.selection.ranges.some((selection) =>
    checkRangeOverlap(range, [selection.from, selection.to]));
}
```

It is a closed-interval overlap test (`<=` in `checkRangeOverlap`), so a caret touching a node's boundary counts as inside. It checks every selection range, not just the main one. Reveal is per node, not per line. Only `hide_mark.ts` and `list.ts` use the same node-range check, but each node decides independently:

- Emphasis/strong/code marks (`hide_mark.ts:58`): `if (isCursorInRange(state, [from, to])) return;`, otherwise each mark child gets `invisibleDecoration`.
- ATX headings (`hide_mark.ts:95-111`): cursor inside the heading range gives a line class `sb-header-inside` and no hiding. Otherwise `invisibleDecoration.range(from, from + spacePos + 1)` hides `"# "`.
- Bullets (`list.ts:17-30`): cursor on the `ListMark` gives a `sb-li-cursor` mark. Otherwise `Decoration.replace({ widget: new ListBulletWidget() })` swaps `-`/`*`/`+` for `•`.
- Tasks (`task.ts:192-201`): `[x]`/`[ ]` becomes a `CheckboxWidget` replace unless the cursor is in the `TaskState` range.

**Hide mechanism.** Hiding uses `Decoration.replace`, not mark+CSS. `util.ts:231`: `export const invisibleDecoration = Decoration.replace({});`. I found no `atomicRanges` anywhere in `syntax/` or `editing/`, so the caret is not told to skip over hidden ranges.

**Rebuild policy.** `decoratorStateField` (`util.ts:113-140`) is the shared wrapper:

```ts
update(value, tr) {
  if (tr.isUserEvent("input.type.compose")) { /* map only */ }
  if (tr.isUserEvent("select.pointer")) return value;
  return stateToDecoratorMapper(tr.state, tr);
}
```

- Every non-pointer transaction runs a full `syntaxTree(state).iterate` over the whole document. That covers doc edits and keyboard selection changes.
- There is no `lastCursorLine` gate and no `viewportChanged` check. Nothing skips "same line" moves.
- Mouse-driven selections (`select.pointer`) keep the old DecorationSet. Clicking into `**bold**` does not reveal the marks until some later transaction rebuilds the set. This is a deliberate trade-off, not a per-line gate.

**Registration.** `clean.ts:55-84` puts `hideMarksPlugin`, `hideHeaderMarkPlugin`, `cleanBlockPlugin`, `taskListPlugin` and `listBulletPlugin` into the clean-mode extension list. Each one is a `StateField` provided through `EditorView.decorations`. None is a ViewPlugin.

**Relevance to the ArrowUp/ArrowDown bug in Kokobrain.** In SilverBullet, one arrow press recomputes the list-bullet replace and the H1 `"# "` replace together. Neither is gated by line, so SilverBullet has no line-gate to copy. Its only defence against the caret landing on hidden text is the lack of `atomicRanges`. I did not run it, so I cannot say whether that causes the glitch. Things to check in Kokobrain: whether its `Decoration.replace` ranges (ListMark, `"# "`) can hold the caret, and whether the glitch is only in the one frame where the bullet and heading are both replaced and the H1 line class flips.

**Not checked:** runtime behaviour, the `frontmatter*` and `object_preview` plugins, and the `editing/` files beyond a grep for selection use.

## SilverBullet / topic 2

**Short answer:** SilverBullet's heading and list markers keep the same width whether revealed or hidden, and it has an explicit ArrowUp/Down wrapper. I found no commit or test about heading or list cursor jumps, so the bullet/H1 glitch fix is not in its history.

**Headings** (`/tmp/silverbullet/client/codemirror/syntax/hide_mark.ts:75-116`)
- Off the cursor line, the `#… ` prefix is hidden with `invisibleDecoration` (a zero-width `Decoration.replace`).
- On the cursor line, nothing is hidden. The line gets `Decoration.line({ class: "sb-header-inside" })`.
- A bare `#` gets `sb-hashtag-text` instead.
- `/tmp/silverbullet/client/styles/editor.scss:250-290`: `.sb-header-inside.sb-line-hN` sets `--sb-header-hang`, which feeds a negative `text-indent`. The markers hang into the margin, so the text does not move. A container query sets the hang to 0 under 800px.
- `editor.scss:68-72`: `.sb-line-h1…h6` always has `--sb-line-pad-y: 2px` and bold weight, whether or not the cursor is on it. Heading lines are therefore always taller than bullet lines.
- `/tmp/silverbullet/CHANGELOG.md:134` says headings inside blockquotes or list items used to "jump sideways" when the cursor entered them. The fix was the hang.

**Lists and tasks**
- `/tmp/silverbullet/client/codemirror/syntax/list.ts`: a `ListMark` under the cursor becomes `Decoration.mark({class:"sb-li-cursor"})`, so the raw `-` shows. Off the cursor, `-`, `+` and `*` become a `Decoration.replace` with a `•` widget (`cm-list-bullet`, `white-space: nowrap`). Ordered marks stay as marks.
- `/tmp/silverbullet/client/codemirror/syntax/task.ts`: the `[ ]` checkbox is replaced by a `CheckboxWidget` only when the cursor is outside `[…]`. A `TaskDropdownWidget` (side 1) is always present for custom states.
- The source glyph and the widget are swapped on cursor entry. Their widths are not guaranteed to match.

**ArrowUp/Down** (`/tmp/silverbullet/client/editor_commands.ts:60-160`, bound at 320-346)
- `withCollapsedBlockSnap(cursorLineUp/Down)` wraps the default motion.
- It records `goalColumn` from `coordsAtPos` before the motion (lines 100-110).
- If the motion jumps more than one line, or lands in `hiddenBlockSource`, it resets the cursor to the adjacent line and replays `moveVertically` from the original position with the saved goal (lines 146-155).
- `/tmp/silverbullet/CHANGELOG.md:231` (2.8.1) fixed drift below tall widgets with this approach.

**Tests:** `/tmp/silverbullet/client/codemirror/editor_state.test.ts:78-96` only checks that `ATXHeading1` exists in the tree. Nothing covers cursor geometry across heading and list lines.

**Lessons for the bullet↔H1 glitch**
1. Make the cursor-line decoration geometry-neutral. SilverBullet uses a negative indent on the cursor line, not a padding or font-size change, so line box and x-position do not change. Check whether Kokobrain's cursor-line state changes padding, font-size or `text-indent`. `moveVertically` with a saved `goalColumn` is computed against the pre-change layout, which is the likely cause.
2. Keep the bullet's revealed and hidden glyphs the same width, or accept a visible change.
3. If the glitch remains, wrap ArrowUp/Down the way `withCollapsedBlockSnap` does, saving `goalColumn` before the motion and replaying it after decorations change.
4. Add a test that asserts cursor coordinates or line number after ArrowUp/Down across a bullet and an H1.

**Not checked:** I did not run SilverBullet or measure real layout. I did not look at Kokobrain's code. The Kokobrain-specific points above come from the task description.

## atomic-editor / topic 1

**Short answer:** atomic-editor has no same-line gate. Every selection change rebuilds the whole-document decoration set, and reveal is decided per line from the selection. It uses no `atomicRanges`.

**Reveal rule** (`src/inline-preview.ts`, `buildInlineDecorations`, ~L376-392)

```ts
if (view.hasFocus && !readOnly) {
  for (const r of state.selection.ranges) { ... activeLines.add(n) }  // every line a selection touches
}
```

- Most hidden syntax uses that line set: `shouldHide = !activeLines.has(lineNum)` (~L495-498). This covers heading `HeaderMark`, `QuoteMark`, `Escape`, `Image`, `HorizontalRule`, and list marks.
- Link children are the exception. They reveal only when the selection overlaps the Link node (inclusive), via `activeLinkStarts` (~L420-460).
- Fenced code is the other exception. Any active line in a fence expands `activeLines` to the whole fence (~L440-452).
- The `freezeMousePlugin` (L115-180) sets `previewFrozenField` on a pointerdown inside the content and releases it `FREEZE_TAIL_MS = 100` ms after pointerup. While frozen, selection-only updates are skipped (L899).

**Rebuild triggers** (`inlinePreviewPlugin.update`, ~L877-946)

```ts
if (justUnfroze || update.docChanged || update.selectionSet ||
    update.focusChanged || treeGrew || readOnlyChanged) {
  this.decorations = buildInlineDecorations(update.view);
}
```

- `viewportChanged` is deliberately excluded (~L916-920, an iOS scroll-momentum workaround).
- There is no same-line skip. Every `selectionSet`, including each ArrowUp/ArrowDown, runs a full `tree.iterate` over the whole document, plus `ensureSyntaxTree(state, doc.length, 200)`.
- `freezeMousePlugin.update` is a no-op.
- Kokobrain's `checkUpdateAction` + `lastCursorLine` gate has no counterpart here. So a cursor move within one line also rebuilds, and an arrow move diffs two lines' worth of state across the whole doc.

**Mechanism** (`grep -rn atomicRanges src` returns nothing)

- Hidden syntax is `Decoration.replace` via `pushReplace` (L321-352). It splits multi-line ranges per line, because plugin replaces may not cross line breaks. The test in `src/__tests__/multiline-decoration.test.tsx` covers that crash.
- Bullets are a replace with the singleton `BULLET_WIDGET` (L267). Ordered markers are `Decoration.mark` with the `cm-atomic-list-marker` class.
- Heading styling is `Decoration.line` with `cm-atomic-h1` and similar classes (L60-63 in `inline-preview.css`). It is applied on every line whether or not it is active. Font size and line-height are constant, so reveal changes only the `# ` characters, not line height.
- List padding and `text-indent` are also applied unconditionally to owned lines (~L600-640).

**Relevance to the ArrowUp/ArrowDown glitch:** on each arrow press, two lines swap state at once. The H1 `HeaderMark` replace is removed and the bullet `ListMark` replace is restored, or the reverse. Both changes come from one full rebuild and no per-line diff. Visible flicker would come from that rebuild, not from a height change in this code. The file has no test that asserts rendering across an arrow move. I did not run the editor, so this is from reading the code only.

**Not checked:** `src/styles/inline-preview.css` beyond the heading and list rules, runtime behavior, and the rest of `AtomicCodeMirrorEditor.tsx` beyond extension wiring (~L358).

## atomic-editor / topic 2

Análise somente leitura de `/tmp/atomic-editor` (não rodei nada nem reproduzi o bug).

**Headings (`#`)**
- A altura do título vem só da classe de linha: `.cm-line.cm-atomic-h1` define `font-size: 1.35em` e `line-height` sem depender do cursor (`/tmp/atomic-editor/src/styles/inline-preview.css:60-64`). `docs/architecture.md:52-57` afirma que isso evita layout shift.
- A marca `HeaderMark` é escondida com `pushReplace` (sem widget) só em linhas inativas, engolindo também o espaço seguinte (`src/inline-preview.ts:479-509`). Ao ativar a linha, o `# ` volta e o texto anda horizontalmente; a altura não muda.

**Listas**
- O `•` (`BulletWidget`) e o checkbox (`TaskCheckboxWidget`) são substituídos sempre, sem checar `activeLines` (`inline-preview.ts:644`, `705-719`). O `- ` de tarefas também fica sempre escondido (`:637`).
- O recuo é uma `Decoration.line` em toda linha do item com `padding-left` e `text-indent` (`:609-617`). O `text-indent: -1.2em` só existe na linha do marcador, e nenhum desses valores depende do cursor.
- Conclusão: listas não mudam de altura quando o cursor entra ou sai.

**ArrowUp/ArrowDown e cursor**
- Não há tratamento específico: nenhum `goalColumn`, `moveVertically`, `atomicRanges` ou `lastCursorLine` em `src/`.
- `inlinePreviewPlugin` reconstrói o conjunto inteiro a cada `selectionSet` (`inline-preview.ts:932-941`), sem o portão de mesma linha que o Kokobrain usa. Scroll não reconstrói (`:916-923`).
- Sem `atomicRanges`, o cursor pode cair dentro dos trechos escondidos (`# `, `- `).
- Nenhum teste cobre setas. `tests/e2e/list-interactions.spec.ts` só cobre continuação de lista e marcador `*`. O histórico git é um único commit (`b6ed65f v0.6.2`), então não há commits de fix para consultar. No CHANGELOG, as entradas relevantes são do 0.4.1 (`padding` vs `margin` no cálculo de clique, `CHANGELOG.md:276-291`) e 0.4.2 (rebuild durante freeze, `:147-157`).

**Lições para o glitch bullet↔H1**
- Hipótese (não verificada): ao subir do H1 para a lista, o `# ` do H1 some e o texto dele muda de largura. Como o CM6 mantém a coluna-alvo em pixels, a seta pode cair em outro caractere. Também é possível que o cursor caia dentro de um trecho oculto.
- Antes de mexer no código, reproduzir com Playwright em `tests/e2e`: gravar `getBoundingClientRect` das linhas e a posição do caret a cada `ArrowDown`. Assim se separa glitch vertical (altura) de horizontal (caret).
- Se confirmado, candidatos: `EditorView.atomicRanges` para os trechos ocultos, e um portão de "mesma linha" para mudanças só de seleção, como no Kokobrain.
- Diferença de modelo: o Kokobrain revela a linha inteira via `shouldShowSource`. Aqui a revelação é por linha para headings e blockquote, e por nó só para links (`inline-preview.ts:486-499`).

**Não verificado:** comportamento real no navegador, e se o glitch é de altura ou de caret. Não há testes de setas no repositório.

## Zettlr (GPL-3.0: describe ideas, do not reproduce large code) / topic 1

Read-only analysis of `/tmp/Zettlr`. I did not run or edit anything.

**Reveal decision: per node, by selection overlap, not by line or focus**

`source/common/modules/markdown-editor/util/range-in-selection.ts` is the only test:

```ts
if (includeAdjacent) {
  return !selection.ranges.some(range => range.to < rangeFrom || range.from > rangeTo)
} else {
  return !selection.ranges.some(range => range.to <= rangeFrom || range.from >= rangeTo)
}
```

- Every renderer walks the syntax tree and calls this on each node. If it returns true, the node's syntax is shown.
- `includeAdjacent` comes from `previewModeShowSyntaxWhenCursorIsAdjacent ?? true` (`util/configuration.ts:110`). Emphasis, links, blockquotes and admonitions read it. Headings hardcode `true` (`renderers/render-headings.ts:36`), so the cursor on a heading's boundary always shows `#`.
- There is no `hasFocus` check and no line comparison. The only `focus` call in the module is `view.focus()` in `render-tasks.ts:38`.

**Rebuild policy: every selection change, no gating**

- `renderers/render-headings.ts`, `render-emphasis.ts`, `render-links.ts`, `render-blockquotes.ts`, `render-admonitions.ts` and `renderers/base-renderer.ts` all use the same update check: `if (update.docChanged || update.viewportChanged || update.selectionSet)`. Each rebuilds over `view.visibleRanges`.
- There is no `lastCursorLine` or same-line skip. Each plugin recomputes on every cursor move.
- `renderBlockWidgets` (`base-renderer.ts`) is a StateField whose `update` calls `renderWidgets(transactions.state, [], ...)`. That is a full-document rebuild on every transaction, including pure selection moves, and it has no viewport-only skip.
- Contrast: `renderers/render-code.ts:49` rebuilds only on `docChanged || viewportChanged`, not on selection.

**Mechanism**

- Hidden marks use `Decoration.replace({})`: heading marks (`render-headings.ts`), emphasis, strikethrough, highlight, code marks, escapes, footnote brackets, link brackets (`render-emphasis.ts`, `render-links.ts`).
- List bullets use `Decoration.replace({ widget: new BulletWidget(...) })` on `ListMark` (`render-emphasis.ts:168`). The reveal check runs on the whole `ListItem` node, so the bullet reappears anywhere in a multi-line item.
- Pandoc and similar inline styling uses `Decoration.mark`.
- `atomicRanges` and `EditorView.atomicRanges` do not appear anywhere in `markdown-editor/`. The cursor can therefore land inside hidden syntax.
- Decorations are built with `Decoration.set(ranges, true)`.

**Relevance to the ArrowUp/ArrowDown glitch**

Heading and list reveal here are independent per-node decisions. Each plugin recomputes from the current selection on every move, with no cached "last line" state that could go stale across a list-to-H1 transition. Kokobrain's `checkUpdateAction` + `lastCursorLine` gate is the one piece with cross-update memory, so it is the first thing to check against the bug. This is an inference from the code, not a reproduced result.

**Not checked:** I did not run Zettlr, and I did not read Kokobrain's files for this answer. I did not check whether Zettlr's full-document block StateField costs much on large notes.

## Zettlr (GPL-3.0: describe ideas, do not reproduce large code) / topic 2

Zettlr analysis (read-only, `/tmp/Zettlr`, commit ecb7164). Only Zettlr was searched; the other similar projects were not.

**Heading markers** (`source/common/modules/markdown-editor/renderers/render-headings.ts`)
- `renderHeadings` is a ViewPlugin. `hideHeadingMarks` walks `visibleRanges` and, for each `ATXHeading*` node whose range is not touched by the selection, replaces the `HeaderMark` plus following spaces with `Decoration.replace({})`.
- It uses `rangeInSelection(..., true)`, so the cursor being adjacent to the heading also reveals the `#`.
- It rebuilds on `docChanged || viewportChanged || selectionSet`. There is no `lastCursorLine` gate, so every cursor move re-iterates the visible tree.
- Heading size is not tied to marker visibility. `theme/editor.ts:411-433` sets `font` on `.cm-line:has(.cm-header-N)` from the highlight class, which is present whether or not the marker is shown. Revealing the `#` changes horizontal width only, not line height.

**List bullets and task boxes**
- Bullets: `renderers/render-emphasis.ts` (`ListItem` case, ~line 162) replaces each `ListMark` with a `BulletWidget` (`&bull;`). The whole `hideFormattingCharacters` loop is skipped when `rangeInSelection(..., includeAdjacent)` is true for the node, so the cursor anywhere in the item shows the raw `-`.
- Task checkboxes: `renderers/render-tasks.ts` uses `renderInlineWidgets`, which replaces `TaskMarker` with a checkbox widget unless the selection touches the node (`renderers/base-renderer.ts`). Widgets are inline `Decoration.replace`, not line decorations.
- No font-size changes on list lines were found.

**ArrowUp/ArrowDown** (`keymaps/default.ts:159-160`)
- `ArrowUp` is bound to `moveCompletionSelection(false)` first, then `cursorLineUp` with `preventDefault`. Down is handled the same way by the default CM6 keymap.
- No custom goal-column logic was found. Vertical movement uses CM6's built-in `cursorLineUp`/`moveVertically`.

**Known bugs or fixes**
- The clone at `/tmp/Zettlr` has a single squashed commit, so `git log` has no cursor or heading fix history.
- The only markdown tests are `test/markdown-to-ast.spec.ts` and `test/markdown-to-html.spec.ts`. None cover cursor movement or rendering.
- I did not check GitHub issues or the changelog (no network access was used).

**Lessons for the Kokobrain bullet <-> H1 glitch**
1. Keep line-height independent of cursor position. Zettlr sets heading font on the line class, so the line is the same height whether the `#` is shown or hidden. Check that Kokobrain's H1 line height does not change when its marker is revealed. A changing height on the target line is the likely cause of the jump.
2. Hidden syntax should only change width, through `Decoration.replace` or `mark` with `font-size: 0`, never a line-level font change tied to the cursor.
3. Zettlr re-runs its heading pass on every selection change with no line gate. Kokobrain's `checkUpdateAction` + `lastCursorLine` gate is cheaper, but a gate that skips the update when the cursor moves between two lines whose reveal state differs could leave stale decorations. Test that case.
4. The arrow-key path (`cursorLineUp`) relies on measured coordinates. If a rebuild happens between the keypress and the measurement, or the block widget height differs from the source height, the goal column drifts. Make sure decorations are stable across the keypress.

Not verified: whether Zettlr has the same bug, and whether Kokobrain's current code matches the description (I did not read Kokobrain files).