# 08: Table of contents: no decorative chevrons, the current heading follows the editor, and a Go to heading picker

**Origin:** design review 2026-11-17, proposal P115 (`.scratch/design-review/review.md`), prototype `.scratch/design-review/prototypes/right-sidebar.html` (P115 article), research `.scratch/shell-sidebars-ux/research/verdict-rs-links-toc.md` (tickets T5 and T6 there) and `.scratch/shell-sidebars-ux/research/breakdown.md` (old tickets 23 and 37, merged into this one). No open-itens Issue is absorbed.

**What to build:** in `src/lib/plugins/table-of-contents/` plus `src/lib/app/`:

1. **No row chevrons.** The per-row `ChevronRight` goes (`TableOfContentsPanel.svelte:3,62`; it has no handler). The section chevron from `SidebarSection` stays. Level-1 text lines up with other sidebar text: re-tune `padding-left` (`:58`) and `.toc-indent-lines` (`:72-81`). `title={heading.text}` stays on every row (`e2e/specs/table-of-contents.spec.ts:17` selects by it).
2. **Current heading.** The heading at the vertical middle of the editor viewport is marked current: `aria-current="true"`, tint, primary colour, semibold, inset left bar (prototype CSS, `right-sidebar.html:334`). Middle, not top: a TOC click centres its heading (`MarkdownEditor.svelte:590-612`, `EditorView.scrollIntoView(pos, { y: 'center' })`), so a top probe would mark the heading above after every click. Scrolled to the bottom, the last heading is current. A click marks its row at once.
   - Pure `headingIndexAtLine(headings, line)` in `toc.logic.ts`, comparing by `heading.line` (zero-based, `toc.types.ts`), not `pos`.
   - `tocStore` (`toc.store.svelte.ts`) gains the probe line: getter, setter, reset. Its getter needs a test (CLAUDE.md rule 3).
   - A bridge in the panel: an `$effect` on `editorStore.editorView` and `expanded`, a passive `scroll` listener on `view.scrollDOM`, throttled with `requestAnimationFrame`, removed on collapse and on destroy. It writes the doc line from `view.lineBlockAtHeight(scrollTop + clientHeight / 2)`, or the last line when scrolled to the bottom.
3. **Go to Heading.** A palette command "Go to Heading" (category Navigation, beside the `Go to <rail item>` commands built by `railGoToCommands`, `commands.ts:58-73`; no default shortcut) opens a picker of the active note's headings in document order, each with an `H<level>` hint, filtered by fuzzy match. Enter jumps to the heading by the TOC click's rule: `openNoteAt(activeTabPath, { kind: 'offset', offset: heading.pos })` (`open-note-at.service.ts`, same CRLF limit as the panel). Escape closes without moving. It works with the TOC section hidden (`tableOfContentsVisible` false) or collapsed. With no active markdown tab it shows a toast and opens nothing.
   - A picker component and a small open-state store in `src/lib/plugins/table-of-contents/`, built on `#lib/components/ui/command` like `TemplatePicker`, `OneOnOnePicker` and `ModActionPicker`; mounted once in `src/lib/app/AppOverlays.svelte` (`:20-22` is where the pickers sit); the command in `commands.ts`; headings from `extractTocHeadings(editorStore.activeTabContent)`.
4. **The open state stops being per note (08.2, align with ticket 06).** `expandedPath` becomes a boolean with no clear on tab switch or destroy (`TableOfContentsPanel.svelte:11-32`), `showTableOfContents` (`toc.service.ts:22-25`) sets it, and `16-table-of-contents.md:11` changes.
5. **Help:** `16-table-of-contents.md` (current-heading cue, Go to Heading), `06-search-and-navigation.md:63` (add a Go to Heading row beside "Go to *item*"), `20-keyboard-shortcuts.md:121` (same).

Not in this ticket: chevrons that collapse subtrees (dropped for removal, 08.1).

**Blocked by:** none

**Status:** ready-for-agent

**Gate:** `pnpm check` + `pnpm vitest run`, plus `bash scripts/e2e.sh table-of-contents.spec.ts`

- [ ] Failing test first, `src/tests/lib/plugins/table-of-contents/toc.logic.test.ts`: `headingIndexAtLine` returns the last heading with `line <= line`, `-1` before the first heading and for `[]`, and the last index past the end.
- [ ] Failing test first, `TableOfContentsPanel.test.ts`: heading rows contain no `svg.lucide-chevron-right`, the section chevron (`data-sidebar-section-chevron`) remains, and every row keeps `title`. After `tocStore.setProbeLine(n)` exactly one row has `aria-current="true"` and it moves with `n`; a click marks its row.
- [ ] `TableOfContentsPanel.test.ts` with a real jsdom `EditorView` installed through `editorStore.setEditorView` (29 test files already build one, `src/tests/lib/core/markdown-editor/test-helpers.ts`): a `scroll` event on `view.scrollDOM` writes the probe line only while expanded, and not after collapse or unmount. `lineBlockAtHeight` exists in the installed `@codemirror/view`.
- [ ] `toc.store.test.ts`: the probe-line getter, setter and reset.
- [ ] Failing test first, `src/tests/lib/app/commands.test.ts`: the "Go to Heading" command exists with its id, label and category Navigation, and its action opens the picker (real store). The count pin at `:151` rises by one on purpose.
- [ ] Picker test (real stores): headings in order with their level; typing filters; an empty query lists all; Enter sets `editorStore.pendingScrollPosition` to `heading.pos` and closes; Escape closes without moving. With no active tab or a non-markdown tab: no dialog and a toast. Works with `tableOfContentsVisible` false.
- [ ] E2E `table-of-contents.spec.ts` with a new long fixture note (8 or more headings): click a mid-note heading in the TOC, and once scrolling settles that row has `aria-current="true"` (fails with a top probe); scroll to the bottom and the last heading is current.
- [ ] Failing test first, `TableOfContentsPanel.test.ts`: after expanding the TOC on note A and switching to note B, the TOC is still expanded. `TableOfContentsPanel.test.ts:77` and `:92`, `toc.service.test.ts` (`expandedPath`) and the E2E "updates when switching files" (`:20-31`) are rewritten on purpose.
- [ ] Frontend gate: `pnpm check` and `pnpm vitest run` pass.

## Original proposal

- **P115.** The table of contents has decorative chevrons, no current heading, and loses state on tab switch. Remove the chevrons (or make them collapse subtrees), highlight the current heading with `aria-current`, add a "Go to heading" palette command. Keeping the panel open across tabs is an owner decision. Validation: revise; the collapse on tab switch is deliberate (commit `80ee3491a`).

## Problem

The chevron on every TOC row does nothing. Nothing shows where the editor is in a long note, and there is no keyboard route to a heading when the panel is closed. The tab-switch collapse is deliberate, so only the first two are bugs.

## Evidence

Checked at `ab143a411`.

- `src/lib/plugins/table-of-contents/TableOfContentsPanel.svelte:62` decorative `ChevronRight`; `:53-64` rows are buttons with `onclick` to `openNoteAt` and no `aria-current`; `:11-32` the deliberate per-note collapse.
- `src/lib/plugins/table-of-contents/toc.store.svelte.ts:14-27` has `headings` and `expandedPath` only; no current-heading state. `toc.types.ts` gives `TocHeading.line` (zero-based) and `pos`.
- `src/lib/core/markdown-editor/MarkdownEditor.svelte:590-612` consumes `pendingScrollPosition` and dispatches `EditorView.scrollIntoView(pos, { y: 'center' })`.
- `src/lib/app/commands.ts:330-337` "Toggle Table of Contents"; no heading command exists. `src/tests/lib/app/commands.test.ts:151` pins 43 commands.
- `help/documentation/16-table-of-contents.md:11` describes the collapse; `:43` the "Not available" state.

## Sequence with

- `TableOfContentsPanel.svelte`, its test and `table-of-contents.spec.ts`: 05 (passes `onHide` to the section and moves the heading locators at `TableOfContentsPanel.test.ts:133-140`).
- `commands.ts` and the count pin `commands.test.ts:151`: 01, 13, 15, 20, 24, 28, 29, 32. Each ticket that adds a fixed command changes the number on purpose and says so.
- `AppOverlays.svelte`: 27 (ZoomChip).
- `help/documentation/16-table-of-contents.md`: 26 (`:41-43`). `06-search-and-navigation.md` and `20-keyboard-shortcuts.md`: 01, 20, 28, 29 and others.
- The "Not available" and "No headings found" branches (`TableOfContentsPanel.svelte:47-50`) are shared with 12 if it restyles empty strings; rebase onto whichever lands first.

## Comments

- 2026-11-17, triage: ready-for-agent. Decided by the owner: the 34-ticket consolidation, which merges the old scroll-spy ticket and the old Go to heading ticket into this one. Defaults (not individually answered): 08.1 remove the row chevrons instead of making them collapse subtrees (breakdown.md question 23.1); 08.2 the TOC open state aligns with the Backlinks and Outgoing links rule from 06 and stays open across note switches (breakdown.md question 23.2, recommended "align"); 08.3 the command is "Go to Heading" in Navigation with no shortcut (breakdown.md question 37.1).
