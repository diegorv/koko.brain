## ink-mde (CM6) / topic 1

**Verdict: ink-mde has no cursor-line reveal logic.** Its markdown syntax is never toggled by the cursor, so the Kokobrain ArrowUp/ArrowDown glitch class (a reveal flipping as the cursor moves between lines) has no counterpart here. I searched only `/tmp/ink-mde`. The other two repos you named were not in scope, and `lib/codemirror-kit/decorations.ts` exists but is a generic helper, not reveal logic.

**Reveal decision (hide vs show):** none. A grep for `selectionSet`, `hasFocus`, `mainSelection`, `.head`, `cursorLine` and `shouldShow` across `src`, `lib` and `plugins` finds nothing that depends on selection. Bullet markers are always replaced:

`src/editor/extensions/lists.ts:177-182`
```ts
const dotDec = Decoration.replace({ widget: dotWidget() }).range(markerStart, textStart)
decorationRanges.push(dotDec)
atomicRanges.push(dotDec)
```

Heading `#` markers are not hidden at all. `src/editor/extensions/theme.ts:78-118` only styles `tags.heading1`…`heading6` via font size and weight.

**Rebuild triggers (no gating):**
- Bullet, number and task lists use a StateField that fully rebuilds on every transaction (`lists.ts`, around lines 193 and 266, `update(_references, { state }) { return decorate(state) }`). That covers selection, focus, doc and viewport changes alike. There is no "same line" skip.
- `blockquote.ts` and `code.ts` use a ViewPlugin whose `update: () => decorate(view)` runs on every ViewUpdate. `decorate` iterates `view.visibleRanges`, so it is viewport-bounded but not gated on what changed.
- `src/editor/extensions/extension.ts` rebuilds only on `docChanged` and otherwise calls `customs.map(transaction.changes)`.
- `nodeDecorator` in `lib/codemirror-kit/decorations.ts` (around line 215) rebuilds on `docChanged`, reconfigure or effects, and maps otherwise. I did not check where it is used.

**Technique:** `Decoration.replace` plus `EditorView.atomicRanges` for bullet dots and indent spacers (`lists.ts` around lines 203-207). `Decoration.line` for list and blockquote classes. `Decoration.mark` for inline code. No `font-size:0` marks and no `markText`/hide-token.

**Comparison to Kokobrain:**
- Kokobrain's `shouldShowSource` and `checkUpdateAction` + `lastCursorLine` gating are absent here. Nothing toggles, so nothing flips when ArrowUp/Down crosses a line.
- Kokobrain's `inlineFormattingPlugin` pass has no counterpart. ink-mde's always-on design means markers never appear or disappear as the cursor moves.
- Cost: ink-mde does full-document list rebuilds on every transaction, including cursor moves. Kokobrain's lastCursorLine gate exists to avoid exactly that.

**Not verified:** I did not run the editor, so I cannot confirm the ArrowUp/Down behavior of ink-mde itself. Whether the Kokobrain glitch comes from reveal toggling (the most likely cause) is unconfirmed from this search.

## ink-mde (CM6) / topic 2

**Read-only findings from /tmp/ink-mde (single commit `597bbd0`, so no history, issues or changelog were searched)**

**1. Heading markers are never hidden, styled only.** No `HeaderMark` handling exists anywhere in `src/` or `lib/`. Headings are styled by `HighlightStyle` tags in `/tmp/ink-mde/src/editor/extensions/theme.ts` (`tags.heading1` → `fontSize: 'var(--ink-internal-syntax-heading1-font-size)'`, 1.6em). The `#` stays visible and inherits the large size. `/tmp/ink-mde/src/api/format.ts` only toggles the `# ` prefix. There is no reveal-on-cursor and no marker show/hide, so moving the cursor onto an H1 causes no marker layout shift.

**2. Bullets, numbers and tasks use replace widgets.** In `/tmp/ink-mde/src/editor/extensions/lists.ts`:
- Each marker range (`- `, `1. `, `- [ ] `) is replaced with `Decoration.replace({ widget })` and added to `EditorView.atomicRanges`.
- The line gets `Decoration.line` with `--indent-level`, plus `padding-left` and negative `textIndent` for a hanging indent (CSS at lines 436-455).
- Lists are not in the default bundle. They are lazily loaded through `lazyResolvers` in `src/extensions.ts`, then applied by a compartment reconfigure after mount.

**3. Likely cause of the bullet/H1 glitch (unverified, no app run).**
- Every list `StateField.update()` calls `decorate(state)` unconditionally. It ignores `docChanged`, `selectionSet` and `viewportChanged`, and iterates the whole syntax tree on every transaction, including a bare ArrowUp/Down.
- `dotWidget()` and `numberWidget()` set no `eq` and no `id`. `buildWidget` (`/tmp/ink-mde/lib/codemirror-kit/decorations.ts`) then returns `false` from `eq`. Every arrow press therefore builds fresh bullet and number DOM for every visible list marker. `taskWidget` avoids this with `eq: other.isChecked === isChecked`.
- Vertical motion uses the goal column via `coordsAtPos`/`posAtCoords`, and the bullet line's hanging indent and atomic replaced ranges change where that column lands. The H1 line's 1.6em height is the other variable. I did not confirm which of these produces the visible glitch.

**4. Contrast with Kokobrain.** Kokobrain gates rebuilds with `checkUpdateAction` plus `lastCursorLine`, skips viewport-only scrolls, and reveals source on the cursor line. ink-mde has none of these gates for lists, and it has no reveal for headings.

**5. Lessons for the bullet<->H1 glitch.**
- Gate list `update()` on `tr.docChanged || tr.reconfigured` (or the Kokobrain `lastCursorLine` check). Cursor-only transactions then keep the same decorations.
- Give `dotWidget`/`numberWidget` a stable `eq` (for example a constant `id`), so arrow presses stop recreating DOM.
- Add a Playwright test in `/tmp/ink-mde/test/e2e/core/lists.spec.ts` that mounts `- a\n# H1\n- b` with `lists: true`, presses ArrowUp/Down, and asserts the cursor line and the bullet DOM node identity. This reproduces the glitch or rules out the widget-churn hypothesis.

**Not checked:** GitHub issues and PRs for cursor-jump fixes (read-only, no network use), the other repos named in the request (`blueberrycongee/codemirror-live-markdown`, `laobubu/HyperMD`), and any runtime behavior.

## codemirror-live-markdown (CM6) / topic 1

**Reveal decision (two rules, not one)**

- **Block marks** (`HeaderMark`, `ListMark`, `QuoteMark`) are gated by line. `build()` collects every line touched by any selection range into `activeLines`, then `livePreview.ts:113` does `const isActiveLine = activeLines.has(lineNum);`. The visible class is applied only when `isActiveLine && !isDrag`.
- **Inline marks** (`EmphasisMark`, `StrikethroughMark`, `CodeMark`) are gated by range overlap. `livePreview.ts:128` calls `shouldShowSource(state, node.from, node.to)`. In `src/core/shouldShowSource.ts:44-50`, the rule is `if (range.from <= to && range.to >= from) return true;`. It returns false during drag (`mouseSelectingField`) and when `collapseOnSelectionFacet` is off.
- **Links** (`link.ts:141`, `:180`) use the same `shouldShowSource`. Not touched and not dragging gives `Decoration.replace({ widget })`. Touched gives `Decoration.mark({ class: 'cm-link-source' })`.
- **`markdownStyle.ts`** has no reveal logic. It only adds `cm-header-N`, `cm-strong` and similar classes, and rebuilds on `docChanged || viewportChanged` only.

**Rebuild triggers**

`livePreview.ts:55-58` calls `checkUpdateAction(update) === 'rebuild'`. `src/core/pluginUpdateHelper.ts:35-64` returns `'rebuild'` on doc, viewport or reconfigure changes, on drag end, and on any `update.selectionSet`. It returns `'skip'` while dragging. There is no `lastCursorLine` gate, so every arrow key runs a full `syntaxTree(state).iterate` and a fresh `Decoration.set`. `link.ts:239-263` does the same, rebuilding on `docChanged`, `viewportChanged`, drag end and `selectionSet`.

**Decoration types**

- Only `Decoration.mark` is used for syntax marks. Hiding is CSS: `src/theme/default.ts:72-84` for block marks sets `fontSize: '0.01em'`, `opacity: '0'`, with `transition: font-size 0.2s ease-out`. The `-visible` variant sets `fontSize: '1em'`. Inline marks (`default.ts:42-69`) use `maxWidth` and `scaleX` animation.
- `Decoration.replace` is used only for link and wikilink widgets (`link.ts:147`, `:186`).
- I found no `atomicRanges`, `EditorView.atomicRanges`, or `markText`/CM5 hide-token equivalent in `src/`. Hidden inline marks are therefore reachable by the cursor. Replaced link widgets are not atomic either.

**Relevance to the reported ArrowUp/ArrowDown glitch (hypothesis, not reproduced)**

Moving between a list line and an H1 line changes `activeLines` for two lines in one step. `cm-formatting-block` then transitions `font-size` (a layout property) on two separate lines at once, while `checkUpdateAction` rebuilds the whole decoration set on each keypress. Both are plausible contributors to a visible jump. I did not run the tests or the app, so this is inference from the code.

**Tests**

`src/plugins/__tests__/livePreview.test.ts` covers "visible class when cursor on inline mark", "block mark visible when cursor on that line", and "rebuild on selection change". It does not cover arrow-key transitions between block and heading lines.

**Files**
- /tmp/codemirror-live-markdown/src/plugins/livePreview.ts
- /tmp/codemirror-live-markdown/src/core/shouldShowSource.ts
- /tmp/codemirror-live-markdown/src/core/pluginUpdateHelper.ts
- /tmp/codemirror-live-markdown/src/plugins/link.ts
- /tmp/codemirror-live-markdown/src/plugins/markdownStyle.ts
- /tmp/codemirror-live-markdown/src/theme/default.ts

**Not checked:** runtime behaviour, the `index.ts` wiring beyond exports, and `mouseSelecting.ts` internals.

## codemirror-live-markdown (CM6) / topic 2

**Verdict:** codemirror-live-markdown has no heading- or list-specific cursor handling, no ArrowUp/ArrowDown keymap, and no goal-column code. Its heading and list behavior is a CSS font-size animation on the marker, rebuilt on every selection change. That is the likely source of the bullet/H1 glitch, and the repo has no fix or test for it.

**Headings** (`src/plugins/markdownStyle.ts:58-91`)
- `ATXHeading1..6` nodes get `cm-header-N` as a `Decoration.mark` over the whole node, `#` included.
- Each heading also gets `Decoration.line({ class: 'cm-heading-line' })`. I found no CSS rule for it in `src/theme/default.ts`; only the test at `markdownStyle.test.ts:104` references it.
- Sizes are in `src/theme/default.ts`: `.cm-header-1` is `fontSize: '2em'`, `lineHeight: '1.3'`.

**Marker visibility** (`src/plugins/livePreview.ts:86-135`)
- `HeaderMark` and `ListMark` are "block marks". They get `cm-formatting-block`, or `cm-formatting-block-visible` if their line is in `activeLines`.
- `default.ts:72-86`: `.cm-formatting-block` is `fontSize: '0.01em'`, `opacity: '0'`, with `transition: 'font-size 0.2s ease-out, opacity 0.2s ease-out'`. The visible class is `fontSize: '1em'`, `opacity: '0.6'`.
- The `#` sits inside `.cm-header-1` (2em), so its 0.01em is relative to the parent and only 0.02em in effect. Visible becomes 2em. Animating font-size animates the glyph advance width, which pushes the heading text sideways over 0.2s.
- Inline marks use `shouldShowSource` (`src/core/shouldShowSource.ts:31-52`), which returns false during drag and true on range intersection.

**Lists and task checkboxes**
- `ListMark` follows the same block-mark path as headings.
- `TaskMarker` appears nowhere in `src/`. `[ ]` and `[x]` are neither hidden nor styled, and there is no widget.

**Update gating** (`src/core/pluginUpdateHelper.ts`)
- `checkUpdateAction` returns `'rebuild'` on any `selectionSet`. There is no `lastCursorLine` gate, so arrowing rebuilds every mark in the document.
- Moving from a bullet line to an H1 line flips two classes at once: the bullet's marker animates to 0.01em, and the `#` animates to 1em over 0.2s. That happens on every arrow press.
- I did not read the update method in `markdownStyle.ts`, so I cannot say whether its plugin rebuilds on selection.

**ArrowUp/ArrowDown and goal column**
- `grep` finds no `keymap`, `moveVertical`, `goalColumn` or `ArrowUp` in `src/`. CodeMirror's default keymap handles vertical movement, including the goal column.
- Inference: the goal column is a pixel x stored at the start of a vertical move. The animating marker widths change the x positions of the text on both lines while the move is running, so the caret can land on a different column than expected. I did not reproduce this.

**Bugs and history**
- The clone has one commit (`f1438ab`), so git history gives no cursor-jump fix.
- `CHANGELOG.md` has no heading or list cursor fix. `ROADMAP.md:178` lists task checkboxes as not yet done.
- `livePreview.test.ts:158-173` checks that the visible class is set on the cursor line. Nothing tests vertical movement, and nothing tests height or x stability.

**Lessons for the bullet/H1 glitch (Kokobrain comparison)**
1. Gate rebuilds on the cursor line, as Kokobrain's `checkUpdateAction` + `lastCursorLine` does. This repo does not, so every arrow press reflows every marker.
2. Do not animate font-size on markers. Use opacity or a fixed-width `::before` so the marker does not change advance width. Kokobrain uses `font-size: 0` marks as a no-reflow alternative.
3. Keep the heading class off the marker span, or set the marker's size in absolute units, so the 2em parent does not compound with the marker's em size.
4. Add a test that moves the cursor between a list line and an H1 and asserts the caret's x-coordinate and line-box height are unchanged.

## HyperMD (CodeMirror 5, archived; focus on ideas that still apply to CM6) / topic 1

**Short answer:** HyperMD reveals by selection overlap, not by cursor line. Hiding is a CSS class toggle on existing DOM text nodes, with no replace or atomic ranges. Rebuilds are debounced and never skip on the same line.

**Reveal decision** (`src/addon/hide-token.ts`, `updateImmediately`):
- Every selection range marks each line it touches as "active" (`activedLines[line].push(oRange)`). A multi-line selection activates all its lines.
- Per token span, `shallHideTokens = true` unless the span's range intersects a selection range on that line: `if (rangesIntersect(spanRange, userRange)) shallHideTokens = false`.
- So the test is span-vs-selection overlap. Focus is not checked, and a token in an inactive line is hidden whenever it is not in the active set.
- Only the `em|strong|strikethrough|code|linkText|task` span types are considered (`defaultOption.tokenTypes`).

**Hide mechanism:** `procLine` adds or removes `hmd-hidden-token` on the parent `<span>` of the formatting text node. `hypermd-light.scss` line 773 handles the rest: `font-size: 0` for hidden tokens, and `color: transparent` for task tokens. Inactive lines get `hmd-inactive-line` on the `<pre>`, which hides table rules and HR lines.

**Rebuild triggers** (`hide-token.ts`, constructor and `update`):
- `cursorActivity` calls `update()`, which is `debounce(() => this.updateImmediately(), 100)`.
- `renderLine` calls `procLine(line, el)` for each line as it is rendered. This reads the cached `this._rangesInLine`.
- `update` (a document-change event) also triggers `update()`.
- There is no viewport-only skip and no same-line gate. Each run recomputes the full active set, then calls `procLine` on the previously active lines (to deactivate them) and on the currently active ones. Only `caretLineChanged` triggers `cm.refresh()`.

**Fold path differs** (`src/addon/fold.ts`, around line 252): folds are CM5 `markText` markers, and the `cursorActivity` handler clears any marker whose `_hmd_crange` contains a cursor position (`marker.clear()`). It runs synchronously with no debounce. Hidden-token state, by contrast, waits 100 ms.

**Likely cause of the ArrowUp/Down glitch (inference, not reproduced):**
- The H1 line's tokens are only re-marked after the 100 ms debounce, and the `renderLine` path uses the stale `_rangesInLine`. During that window the `#` marker can be shown or hidden against the old active set.
- Fold clears synchronously while hide-token does not, so the two layers can disagree for about 100 ms.
- I did not run the app, so treat this as a hypothesis to check with a test.

**Kokobrain comparison:**
- Kokobrain's `shouldShowSource` on the cursor line is coarser: HyperMD's span-overlap rule is more precise, and it also covers multi-line selections.
- Kokobrain's `checkUpdateAction` with `lastCursorLine` skips rebuilds when the cursor stays on one line. HyperMD never skips, so it does more work per arrow key but has no stale-line gate.
- HyperMD's trailing debounce is the thing to avoid in CM6: `selectionSet` should drive the reveal synchronously, and only the rebuild should be gated.
- Kokobrain's `Decoration.mark` + `font-size:0` matches HyperMD's approach. Neither uses `atomicRanges`, so the cursor can land inside hidden markers.

**Not checked:** the `mode/hypermd.ts` line-class logic, `core/line-spans.ts`, and the git history for the debounce. The CM6 claims are from memory, not checked against the current CM6 docs.

## HyperMD (CodeMirror 5, archived; focus on ideas that still apply to CM6) / topic 2

**HyperMD: headings and lists (source at `/tmp/HyperMD`, shallow clone with one commit, so no cursor-jump history)**

**Heading markers.** Marks are not decorations. The mode tags tokens (`formatting-header`, `line-HyperMD-header-N`), and CSS does the rest. `theme/hypermd-light.scss` (~L190-210) sets `pre.HyperMD-header-1` to 2x and `-2` to 1.5x font size and forces `line-height: 1.5 !important` on every header line. The `#` marks are hidden only on inactive lines, at ~L805-812:

```scss
pre.hmd-inactive-line { span.cm-formatting-header { font-size: 0 !important; display: inline; } }
```

**Who toggles it.** `src/addon/hide-token.ts` adds `hmd-inactive-line` to every line without a selection (`procLine`, ~L160). It also adds `hmd-hidden-token` to spans whose type is in `tokenTypes` (`em|strong|strikethrough|code|linkText|task`, L44). `header` is not in that list, so heading marks are hidden by the line-class CSS, not the token class. The `hmd-hidden-token` rule for tasks is `color: transparent`, not `font-size: 0`.

**Lists.** Bullets are never hidden. `src/mode/hypermd.ts` (~L485-504) tags `formatting-list` and `hmd-list-indent`. The theme renders the bullet as a `float: left` span with a negative `margin-left` and a glyph font (`HyperMD-Bullets`, ~L288-330). Task checkboxes are monospace text, made transparent when hidden.

**Cursor movement.** HyperMD has no goal-column or ArrowUp/Down code. `grep` for goal, moveV, and ArrowUp in `src/` found nothing. Caret motion is left to CodeMirror 5.

**Layout shift.** Toggling `#` to `font-size: 0` changes the width and metrics of the line. HideToken handles this by deleting `lv.measure.heights` and clearing `lv.measure.cache`, then calling `cm.refresh()` only if the caret line's classes changed (`hide-token.ts` ~L262-272, ~L212-222). Its `update` is debounced by 100 ms (`debounce(..., 100)` at L143), so during fast ArrowUp repeat the newly active line can show stale styling for up to 100 ms.

**Known bugs.** The changelog has only general notes: 0.3.7 "Adjacent headers, the latter was not correctly styled", and "Use another way to hide tokens. Fix #38". The SCSS cites issue #25 for header line-height. I could not open those issues, and there are no cursor-jump commits to check.

**Lessons for the bullet to H1 glitch in Kokobrain (inferred from HyperMD, not from reading Kokobrain):**
1. Keep marker hiding height-neutral. Pin `line-height` on heading lines, as HyperMD does, and hide `#` with `font-size: 0` or a mark, not by display changes. Width changes on the cursor line move the caret and can reflow the line above.
2. Don't debounce the reveal of the cursor's line. HyperMD's 100 ms debounce leaves stale styling during key repeat. Apply `shouldShowSource` synchronously for the active line, and keep debounce only for the inactive-line cleanup.
3. Make the bullet's layout independent of the heading's. HyperMD's float-plus-negative-margin bullets depend on the surrounding line's metrics. Use a fixed-width inline bullet, or give the bullet line a fixed `min-height`.
4. Don't rely on a per-line measure cache. HyperMD clears it by hand after every toggle. In CM6, check that a decoration change on the cursor line triggers a re-measure of the line above.

**Not checked:** the live CodeMirror 6 behavior, the Kokobrain code, and the HyperMD issue tracker.