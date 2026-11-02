# Scout 10: CodeMirror 6 editor on iOS WebKit and touch

Scope: `src/lib/core/markdown-editor` and its live-preview widgets. Read-only. No builds run.
Versions checked: `@codemirror/view` 6.43.15, `@codemirror/state` 6.7.6 (installed in `node_modules`, read-only), `package.json` ranges `^6.43.15` / `^6.7.6`.
Platform evidence: source reads only. Nothing was run on a device. Items marked UNVERIFIED need an iPhone/iPad test in the Tauri iOS WKWebView.

## 1. Summary

1. The editor uses native iOS selection, not CM's custom selection layer. `drawSelection` is not used anywhere in `src/` (grep), so the native caret and selection handles stay. `caretColor` is set explicitly at `src/lib/core/markdown-editor/setup/editor-theme.ts:30`. This avoids the grabber bug in CM issue 1538 (see section 4).
2. The biggest structural gap is the reveal guard. `mouseSelectingField` is driven only by `mousedown` and a document `mouseup` (`extensions/live-preview/core/mouse-selecting.ts:40-56`). iOS dispatches no compatibility mouse events while a finger moves, so a selection-handle drag never arms the guard. Every touched-line change during a drag then rebuilds decorations and can destroy the widget under the handle.
3. Every hover-only affordance is invisible on a phone. Copy-block, table `+col`/`+row`, and the callout and link hover states rely on `:hover` with `opacity: 0` (`extensions/live-preview/styles.ts:277-290`, `341-364`). There is no `@media (hover: none)` or `(pointer: coarse)` rule anywhere in `src/`.
4. Tap targets are far below the 44 pt guideline. The task checkbox is 18 px. The table add buttons are 20 px wide. The copy button is 11 px text with 2 px 6 px padding.
5. Opening links needs a modifier key that touch cannot send. Live-preview external links (`parsers/link.ts` via `click-handler.ts:16-19`) and wikilinks on a revealed line (`wikilink-click-target.ts:57-67`) need Cmd/Ctrl. A touch user has no route to open a URL from a rendered link.
6. The queryjs Prev/Next table buttons have no `mousedown` stop-propagation guard (`src/lib/plugins/queryjs/kb-ui.ts:499-533`). The other queryjs buttons have one. A tap likely reveals the block and destroys the button before its click fires. This also affects desktop.
7. Copy-block-link and the tab/editor context menus need `contextmenu`, which iOS WebKit does not fire on long press (secondary sources, WebKit bug 213953). On touch those menus are unreachable.
8. Autocorrect, autocapitalize and spellcheck are off for the editor body. CM sets them off on `.cm-content` (`@codemirror/view` `dist/index.js:8336-8342`), and the app does not override them.
9. Viewport: the app's viewport meta has no `interactive-widget` (`src/app.html:6`). Whether the caret stays above the keyboard inside the Tauri WKWebView is UNVERIFIED.
10. Wrapped lines (`editor-extensions.ts:169`, always on) carry known WKWebView scroll bugs (CM issues 1278, 1460, 1601). CM maintainers call 1601 a browser issue with no workaround.

Installed CM 6.43.15 already contains the main iOS touch fixes (6.39.17 tap-selection and iOS selection handles, 6.40.0 Shift-modifier fix). The app's pinned range does not need an upgrade for those.

## 2. How CM 6.43 handles touch (verified in source)

| Behavior | Evidence |
|---|---|
| CM's own `mousedown` selection is skipped for ~2 s after any touchstart ("Ignore touch interaction"). Taps on text are placed by the native selection, which feeds `selectionchange` back into CM. | CM `src/input.ts`, `handlers.mousedown` and `observers.touchstart` (codemirror/view main, read via `gh api`). Installed-dist line not located (UNVERIFIED line number). |
| `drawSelection` is absent, so `nativeSelectionHidden` is false and the native selection is not hidden. | `node_modules/@codemirror/view/dist/index.js:9617-9623` (`drawSelection` adds `hideNativeSelection`), `:6378`. App does not import `drawSelection` (grep of `src/`: no match). |
| CM 6.39.17 added its own iOS selection handles, but only inside `drawSelection`. Not applicable to this app unless `drawSelection` is added later. | `node_modules/@codemirror/view/CHANGELOG.md:209-213`; `dist/index.js:9586` (`drawMainRange = !browser.ios`), `:9592`, `:9678`. |
| Shift+Enter/Backspace/Delete on iOS was losing shift. Fixed in 6.40.0. | CHANGELOG.md (6.40.0 entry, installed); issue 1682 (closed 2026-03-12). |
| Enter/Backspace/Delete on iOS are deferred 50 ms (`pendingIOSKey`) and flushed through key handlers. | `dist/index.js:4650-4690` (installed; `flushIOSKey`, `setTimeout(...,50)`). |
| Momentum scroll is tracked so iOS fling is not aborted by CM's stabilization. | `dist/index.js:4993`; CHANGELOG.md:111. |
| `autocapitalize` set on iOS drops the Shift flag on Enter/Backspace. | `dist/index.js:4675-4680`; CHANGELOG.md:131. |
| CM `contentDOM` defaults: `spellcheck=false`, `autocorrect=off`, `autocapitalize=off`, `writingsuggestions=false`. | `dist/index.js:8336-8342`. `rg contentAttributes src/` returns nothing (no override). |
| `cursorScrollMargin` defaults to 5 px; `scrollMargins` facet exists for extra margins (for example a keyboard-covered area). | `dist/index.js:9011-9031`. |

## 3. Repo risks (file:line)

Severity: H = likely user-visible on iPhone and cheap to fix or test; M = visible under some condition; L = minor or already mostly mitigated.

### 3.1 Reveal guard and drags

| # | Sev | Where | Issue on iOS | Mitigation |
|---|---|---|---|---|
| R1 | H | `core/mouse-selecting.ts:40-56` (flag set on `mousedown`, cleared on `mouseup` or `dragstart`); `core/check-update-action.ts:26-29` (`skip` while dragging); `core/reveal.ts:67` (`revealPredicate` returns false while dragging); `plugins/queryjs-block-field.ts:63-73` (gate). | The guard only engages on compatibility mouse events. The W3C spec says UAs "typically dispatch mouse and click events only for single-finger activation gestures (like tap and long press)" and a touch that moves gets only touch events ([W3C Touch Events, "Interaction with Mouse Events and click"](https://w3c.github.io/touch-events/)). A native handle drag or extend-selection therefore has no `mousedown`, so the flag never arms. Each time the touched line set changes during the drag, `checkUpdateAction` returns `rebuild`, and widgets (table, code block, callout, math) under the drag are destroyed and recreated. That can cancel the native handle drag. Long-press behavior in WebKit is UNVERIFIED on device. | Arm the flag on `touchstart` and release on `touchend`/`touchcancel` from a `domEventHandlers` entry (CM supports `touchstart` in `domEventObservers`/`domEventHandlers`). Test first with a device: select across a table and a code block with handles. |
| R2 | L | `core/mouse-selecting.ts:43` (`once` document `mouseup` listener). | If a synthetic `mouseup` never arrives (a long press that becomes a callout, or a `touchcancel`), the flag stays true. While stuck, `revealPredicate` returns `() => false` and decorations skip rebuilds until the next mouse event. | Release on `touchcancel` as in R1. Verify with a long press that opens the iOS callout. |
| R3 | M | `extensions/live-preview/core/scroll-debounce-plugin.ts:32-41` | The 150 ms timer after the last viewport change fires `forceDecorationRebuild` even if the finger is still down without moving. A rebuild during touch can change block heights under the finger. During a fling there are no viewport changes for the timer to measure, so decorations outside the 2000-char buffer (`core/expanded-ranges.ts`) stay stale until the fling stops. Effect UNVERIFIED on device. | Gate the timer on `touchActive` (CM tracks it: `dist/index.js:4993` uses `iState.touchActive`). Measure fling on device. |

### 3.2 Widget event handling (touch-specific gaps)

The `mousedown` + `stopPropagation` pattern is consistent in most widgets. Checked list:

| Widget | Where | Guard? | Touch note |
|---|---|---|---|
| Task checkbox | `widgets.ts:36-42` | `preventDefault` only, dispatches on `mousedown` | Native checkbox still toggles on `click`. The dispatch rebuilds the widget, so the state converges. Target 18 px (`styles.ts:169-172`). |
| Wikilink (rendered) | `widgets.ts:293-299` | yes (`preventDefault` + `stopPropagation`) | Works on tap (no modifier needed). Good. |
| Table `+col` / `+row` | `widgets.ts:420-445` | yes (`mousedown`) | Buttons are `opacity: 0` until `.cm-lp-table-wrapper:hover` (`styles.ts:341-364`). 20 px wide (`styles.ts:365-371`). See H4 and H5. |
| Code block language `<select>` | `code-block-widget.ts:145-168` (guard at `:162`) | yes | Native iOS picker. Font 13 px (zoom risk, H7). |
| Code block Copy | `code-block-widget.ts:88-100` | yes | Hidden until `.cm-lp-codeblock:hover` (`styles.ts:277-290`), 11 px text. `navigator.clipboard.writeText` in a `mousedown` handler: user-gesture status on iOS UNVERIFIED. |
| Meta-bind select | `widgets.ts:694-710` (guard at `:696`) | yes | Font 13 px (`styles.ts:617-625`). Zoom risk (H7). |
| Meta-bind toggle | `widgets.ts:861` | yes | Native checkbox; 13 px label context. |
| Meta-bind text input | `widgets.ts:940-950` | yes | Font 13 px (`styles.ts:709-717`). Zoom risk (H7). |
| Meta-bind button | `meta-bind-button-widget.ts:25-28` | yes | OK. |
| Callout fold chevron | `plugins/callout-field.ts:30-34` | yes | Glyph width `1.2em` (`styles.ts:404-407`). Small target. |
| Callout type label and popover options | `callout-field.ts:82-98` | yes | Label padding `0 4px` (`styles.ts:421-425`). Popover is absolutely positioned inside `cm-content`; clipping on a narrow phone UNVERIFIED. |
| Callout outside-click close | `callout-field.ts:100-107` | document `mousedown` listener, removed in `destroy` | Works on tap. |
| queryjs Run / Run again | `queryjs-block-widget.ts:159`, `:250` | yes | OK. |
| queryjs cell link | `plugins/queryjs/kb-api.ts:423-429` | yes | OK. |
| queryjs table Prev / Next | `plugins/queryjs/kb-ui.ts:499-533` (`prev`/`next` created at `:499-506`; `onclick` at `:520-533`) | NO | Likely broken on tap, and on desktop: the click lands after CM's `mousedown` moves the cursor and the block is revealed and destroyed (see `queryjs-block-field.ts:63-73`). Buttons are rendered inside the widget container (`queryjs-block-widget.ts:69-70`); the exact attach point of this table output is UNVERIFIED. Fix: add the same `mousedown` stop-propagation used at `queryjs-block-widget.ts:159`. |

### 3.3 Hover-only affordances and tap targets

| # | Sev | Where | Issue |
|---|---|---|---|
| H4 | H | `styles.ts:277-290` (copy button `opacity: 0`, shown on `.cm-lp-codeblock:hover`); `styles.ts:341-364` (table `+` buttons `opacity: 0`, `.cm-lp-table-wrapper:hover` to 0.6); `styles.ts:413-416` (callout fold hover) | On iPhone, `:hover` only sticks after a tap, and a tap on the block usually reveals it as source (H9). The copy and `+` controls are effectively undiscoverable. Opacity 0 buttons still take taps, so they are a hidden tap zone. |  Add `@media (hover: none) { .cm-lp-codeblock-copy, .cm-lp-table-add { opacity: 1 } }` in `styles.ts` (the theme object). MDN documents `hover` and `pointer` media features; confirmed in repo that none exist (`rg "hover: ?none|pointer: ?coarse" src` returns nothing). |
| H5 | H | `styles.ts:169-172` (checkbox 18 px); `styles.ts:365-371` (table add 20 px); `styles.ts:277-287` (copy 11 px, padding 2 px 6 px); `styles.ts:421-425` (callout label padding 0 4px); `styles.ts:912-920` (queryjs Prev/Next 12 px, padding 2 px 10 px) | All below the 44 pt guideline. Apple's HIG accessibility page is the reference (body not retrieved, see section 5). Secondary sources cite 44x44 pt for iOS controls ([Evinced tappable area](https://knowledge.evinced.com/mobile-validations/tappable-area), [Newly accessibility](https://newly.app/how-to/add-accessibility)). Fix: keep the artwork small, enlarge the hit area with padding or a transparent `::before`. |

### 3.4 Links and modifier-based actions

| # | Sev | Where | Issue |
|---|---|---|---|
| H6 | H | `click-handler.ts:16-19`, `:21-38` (external URL opens only with `isOpenLinkModifier`); `platform.ts` (`isOpenLinkModifier`: Cmd on Mac, Ctrl elsewhere) | Live-preview links (`[text](url)`, autolinks, bare URLs) cannot be opened by touch. Tap places the cursor and reveals the source. There is no touch alternative in the editor. |
| H6b | M | `wikilink-click-target.ts:53-67` | A rendered wikilink opens on tap (`widgets.ts:293-299`). When the cursor is on its line, the raw `[[...]]` is shown with no wikilink class (CLAUDE.md, live-preview notes; `wikilink-click-target.ts:37-41`), so a tap only moves the cursor. Opening it then requires Cmd/Ctrl, which touch cannot send. |
| H6c | M | `MarkdownEditor.svelte:144` (capture-phase `mousedown` for wikilinks); `:65-81` | Capture-phase handler calls `preventDefault` on the synthetic `mousedown`. Whether iOS still focuses the editor and raises the keyboard after the navigation is UNVERIFIED. |

### 3.5 Context menu and copy-block-link

| # | Sev | Where | Issue |
|---|---|---|---|
| H7 | H | `MarkdownEditor.svelte:84-89` (`handleContextMenu`), `:412` (`oncontextmenu` on the container), `:416-421` (copy-block items); `setup/editor-extensions.ts:147-153` (copy-block keymap) | WebKit on iOS does not fire `contextmenu` on long press (WebKit bug 213953, [bugs.webkit.org/show_bug.cgi?id=213953](https://bugs.webkit.org/show_bug.cgi?id=213953); the search snippet describes the behavior, body not fetched). The only route to copy-block-link on touch is the keyboard shortcut, which needs a hardware keyboard. Fix options: a long-press timer that dispatches a synthetic `contextmenu` (common pattern, secondary sources), or a toolbar button. Caveat: iOS fires a compatibility `click` after lift that can close the menu. |
| H7b | M | `EditorTabs.svelte` (ContextMenu on tabs) | Same `contextmenu` gap. Outside the editor, noted only. |

### 3.6 Text entry

| # | Sev | Where | Issue |
|---|---|---|---|
| T1 | M | `dist/index.js:8336-8342` (CM defaults); no override in `src/` | Notes on iPhone get no autocapitalization, autocorrect or spellcheck. Trade-off: CM's iOS autocorrect/Enter history is buggy (issues 1349, 1366, 1062). Option: `EditorView.contentAttributes.of({autocapitalize: 'sentences', autocorrect: 'on'})`. Test IME and autocorrect on device before enabling. |
| T2 | M | `setup/editor-extensions.ts:139-142` (`autocompletion` with `activateOnTyping`) | Tapping a completion item uses CM's tooltip `mousedown`. Whether iOS dismisses the keyboard on tap is UNVERIFIED. |
| T3 | L | `setup/editor-extensions.ts:159` (`searchKeymap`) | Cmd+F on iPad with a hardware keyboard opens the Safari search UI (CM issue 1160). Hardware-keyboard only. |
| T4 | L | `widgets.ts`, `styles.ts` | Zoom on focus: iOS Safari zooms any input or select rendered under 16 px (secondary source, [docs.squirrelscan.com input-zoom](https://docs.squirrelscan.com/rules/mobile/input-zoom); WebKit primary source not located). Meta-bind text input, select (13 px) trigger it. The note body is 18 px by default (`settings.store.svelte.ts:75`), so the caret editor itself should not zoom. Fix: 16 px on `@media (pointer: coarse)` for widget controls. |

### 3.7 Viewport, keyboard and scrolling

| # | Sev | Where | Issue |
|---|---|---|---|
| V1 | H | `src/app.html:6` (`width=device-width, initial-scale=1`); `MarkdownEditor.svelte:412` (`absolute inset-0`); `editor-theme.ts:23-28` (`.cm-scroller` `overflow: auto`) | No `interactive-widget` key. Per MDN the default is `resizes-visual`, so the keyboard shrinks only the visual viewport and the layout does not change ([MDN viewport meta](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/meta/name/viewport)). MDN does not document Safari support for `interactive-widget` (checked; table not in fetched text). Whether the caret stays above the keyboard in WKWebView, and whether Tauri resizes the WKWebView frame, is UNVERIFIED. CM's `cursorScrollMargin` (5 px default) does not know the keyboard height. Test: type at the bottom of a long note with the keyboard up. |
| V2 | M | `editor-extensions.ts:169` (`EditorView.lineWrapping` always on) | WKWebView wrapped-line scroll bugs: CM issue 1278 (scrollbar drag jumps, open, moved to [code.haverbeke.berlin/codemirror/dev](https://code.haverbeke.berlin/codemirror/dev/issues/1278)), issue 1460 (scroll jumps on large wrapped docs; a commenter reports the root-level scroll view avoids it: [codemirror/dev#1460](https://github.com/codemirror/dev/issues/1460)), issue 1601 (Safari moves scroll absolutely during a drag; maintainers call it a browser bug, no workaround, closed 2026-02-25: [codemirror/dev#1601](https://github.com/codemirror/dev/issues/1601)). Every note is affected. The app nests `.cm-scroller` inside an `absolute inset-0` layout (`MarkdownEditor.svelte:412`). Test on device; consider whether the scroller can be the top-level scroll view. |
| V3 | M | `core/scroll-debounce-plugin.ts` (see R3) | As R3. |
| V4 | M | `CM issue 1663` (open; keyboard opens and scrolls the editor the wrong way on some devices; platform not stated: [codemirror/dev#1663](https://github.com/codemirror/dev/issues/1663)) | Unknown platform. Test. |

### 3.8 Tap placement and block widgets

| # | Sev | Where | Issue |
|---|---|---|---|
| P1 | M | Block widgets replace the first characters of a line (table, code block, callout, math, mermaid, queryjs; for example `widgets.ts:380-396` `eq` includes source ranges). | CM issue 1639 (closed 2026-02-23, [codemirror/dev#1639](https://github.com/codemirror/dev/issues/1639)): Safari tap on the top padding of a `cm-line`, or on a line whose first character is inside a `contenteditable=false` widget, sets the selection to the wrong place or restores the previous selection. Related CM changes that are in the installed 6.43.15: the 6.39.17 "touch tap-selection on line wrapping boundaries" entry (`CHANGELOG.md:209`) and the 0.18.12 end-of-widget tap fix (`CHANGELOG.md:2230`). The changelog does not name issue 1639 as the fix, so whether 1639 itself is resolved is UNVERIFIED. Residual risk: tap-to-place next to a widget on the first character. Test. |
| P2 | M | Live preview reveal (`core/reveal.ts`) | Every tap on a rendered block reveals it as source. On a phone the block grows under the finger (a table becomes raw text, possibly wider than the screen). This is the design, but the reflow is larger on a small viewport and it is the only way to edit a block. Not a bug; a UX cost to measure. |
| P3 | L | `styles.ts` and `drawSelection` absence | Grabber issue 1538 (handles vanished after 6.35.1 because `caret-color: transparent` was set by `drawSelection`). This app does not use `drawSelection`, so native handles stay. If anyone adds `drawSelection` later, the native handles are hidden and CM 6.39.17 draws its own handles on iOS only (`dist/index.js:9678`). Keep this in mind for cursor styling work. |

### 3.9 Known CM iOS issues the app does not hit directly

| Issue | Status | Note |
|---|---|---|
| [1481](https://github.com/codemirror/dev/issues/1481): no `cm-cursor` element on iOS | closed 2024-11 | The app does not use `drawSelection`, so there is no `.cm-cursor`. The theme's `borderLeftColor` (`editor-theme.ts:45-47`) is inert. Caret colour comes from `caretColor` (`editor-theme.ts:30`), which works. |
| [1487](https://github.com/codemirror/dev/issues/1487): `border-left-color` not applied on mobile Safari | closed 2024-12 | Same. Inert in this app. |
| [1600](https://github.com/codemirror/dev/issues/1600): selection background stuck on iOS after tap | closed 2025-09 | Fix not traced to a changelog entry; re-check on device. |
| [1626](https://github.com/codemirror/dev/issues/1626): Safari focus regain jumps scroll | closed 2025-10 | Relevant to tab switch and focus paths in `MarkdownEditor.svelte:134` and `:246`. Test on device. |
| [1304](https://github.com/codemirror/dev/issues/1304): select-all empty on large docs (iOS) | closed | Check select-all on large notes. |
| [1328](https://github.com/codemirror/dev/issues/1328): cannot select the newline on iOS | closed | Test on device. |
| [1349](https://github.com/codemirror/dev/issues/1349), [1366](https://github.com/codemirror/dev/issues/1366), [1062](https://github.com/codemirror/dev/issues/1062): iOS autocorrect and IME Enter/delete | closed | Relevant to T1. |
| [1403](https://github.com/codemirror/dev/issues/1403): Korean IME Enter duplicates line break (Safari, macOS 10.15 reporter) | open | macOS Safari, not iOS. Still an IME risk for iPhone Korean input. |

## 4. Things that are already in good shape

- Native iOS selection handles are kept because `drawSelection` is absent (section 2).
- The widget guard pattern (`mousedown` + `stopPropagation`) is applied to nearly every interactive widget; only queryjs Prev/Next is missing it (3.2).
- Installed CM 6.43.15 includes the iOS key-handling fixes (Shift modifier 6.40.0, pendingIOSKey, Enter/Backspace speedups 6.43.11) and the tap-selection work (6.39.17).
- The scroll debounce is correct for desktop-style scrolling (`scroll-debounce-plugin.ts:32-41`), with the caveat in R3.

## 5. Unverified and what to test on device

Could not verify without an iPhone or iPad:

- Whether WKWebView's long-press and handle drags deliver any `mousedown`/`mouseup` (R1, R2). Test with a table and a code block under a selection handle.
- Whether the caret stays above the keyboard in the Tauri WKWebView (V1).
- Whether a rendered table cell tap reveals the table on iOS as on desktop (P2).
- Whether `contextmenu` fires on long press in this WKWebView (H7). Source is a WebKit bug and secondary snippets, not a retrieved WebKit page.
- Apple HIG hit-target number: the HIG accessibility page fetch returned no body. The 44 pt figure comes from secondary sources. Re-check the HIG page directly.
- Input zoom rule: the 16 px rule comes from a secondary source. Confirm on device with the meta-bind input.
- Clipboard write inside a `mousedown`: user-gesture acceptance in WKWebView (`code-block-widget.ts:94`).
- Autocompletion tap keeping focus on iOS (T2).
- The exact attach point of queryjs table output inside the widget container (3.2).

Note on sources: the CM issue tracker moved to `code.haverbeke.berlin` (issue 1278 comment, 2026-04-15). GitHub copies of old issues show stale open/closed states. Check the new host when citing.

## 6. Sources

- CM view source (read via `gh api repos/codemirror/view/contents/src/input.ts`): `handlers.mousedown` touch ignore, `observers.touchstart`, contentDOM attributes.
- Installed `node_modules/@codemirror/view` 6.43.15: `dist/index.js` lines cited above; `CHANGELOG.md` lines 27, 57, 81, 111, 131, 145, 185, 195, 209-213, 2230.
- CM issues: [1538](https://github.com/codemirror/dev/issues/1538), [1639](https://github.com/codemirror/dev/issues/1639), [1601](https://github.com/codemirror/dev/issues/1601), [1278](https://github.com/codemirror/dev/issues/1278), [1460](https://github.com/codemirror/dev/issues/1460), [1481](https://github.com/codemirror/dev/issues/1481), [1487](https://github.com/codemirror/dev/issues/1487), [1600](https://github.com/codemirror/dev/issues/1600), [1626](https://github.com/codemirror/dev/issues/1626), [1682](https://github.com/codemirror/dev/issues/1682), [1663](https://github.com/codemirror/dev/issues/1663), [1020](https://github.com/codemirror/dev/issues/1020), [1349](https://github.com/codemirror/dev/issues/1349), [1062](https://github.com/codemirror/dev/issues/1062), [1160](https://github.com/codemirror/dev/issues/1160), [1403](https://github.com/codemirror/dev/issues/1403).
- W3C Touch Events, "Interaction with Mouse Events and click": https://w3c.github.io/touch-events/
- MDN viewport meta (`interactive-widget`): https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Elements/meta/name/viewport
- WebKit bug 213953 (contextmenu on iOS): https://bugs.webkit.org/show_bug.cgi?id=213953 (search snippet only)
- Apple HIG accessibility: https://developer.apple.com/design/human-interface-guidelines/accessibility (fetched, no body returned)
- Secondary: [Evinced tappable area](https://knowledge.evinced.com/mobile-validations/tappable-area), [Newly accessibility](https://newly.app/how-to/add-accessibility), [squirrelscan input-zoom](https://docs.squirrelscan.com/rules/mobile/input-zoom)
