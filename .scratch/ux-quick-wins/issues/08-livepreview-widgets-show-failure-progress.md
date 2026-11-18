# 08: Live-preview widgets show failure and progress

**Origin:** design review 2026-11-17, proposals P112 (part), P113 (part), P10 (button names only) (`.scratch/design-review/review.md`), prototype `.scratch/design-review/prototypes/editor-authoring.html` (P112, P113, P10), research `.scratch/ux-quick-wins/research/verdict-editor.md` (E1) and `breakdown.md` (old ticket 07).

**Scope:** widget and style edits only. No live-preview decoration rework, no new decoration plugin, no change to how widgets are replaced or revealed. Read `docs/agents/live-preview-rules.md` before editing `widgets.ts` (rule 2: `toDOM` runs again on cache hits; rule 11: widget controls stop `mousedown`).

**What to build:**

1. **A failed image says so.** On an `<img>` `error` event, if `wrapper.isConnected` (the event can fire after CodeMirror destroyed the widget): add `cm-lp-image-missing` to the wrapper, keep `cm-lp-image-wrapper`, replace the image with the text `Could not load "<name>"` (the alt text or the wikilink target) and call `view.requestMeasure()`. Applies to `ImageWidget` (`src/lib/core/markdown-editor/extensions/live-preview/widgets.ts:133-175`) and a resolved `WikilinkImageEmbedWidget` (`:592-615`). The unresolved-link text `"<target>" not found` (`:614-616`) stays; "not found" is wrong for remote URLs, hence the different copy.
2. **Style.** `.cm-lp-image-missing` (today no rule exists; only `widgets.ts:175,615` add the class) is muted text in a dashed `--radius-xs` box in the embed error colour (`styles.ts`).
3. **Mermaid shows progress.** The diagram container holds `Rendering diagram...` until the existing success (`innerHTML`) or error (`textContent`) assignment replaces it (`widgets/mermaid-widget.ts:78-121`). The cache path (`:93-98`) and the empty-source path (`Empty mermaid diagram`) are unchanged (rule 2).
4. **A failed copy says so.** In `widgets/code-block-widget.ts:89-101`, a rejected or missing `navigator.clipboard.writeText` shows "Copy failed" on the code-block button for 1500 ms, then "Copy" (today there is no catch). Success still shows "Copied!".
5. **Named table buttons.** The table +col and +row buttons (`widgets.ts:461-491`, text `+`, `title` only) get `aria-label` "Add column" and "Add row" (keep `title`). No change to layout, padding or the add dispatches.

Not in this ticket (deferred): embedded notes rendered as read-only markdown (M), a Toggle task command and Cmd+L (semantics, `commands.ts`), raw-mode table Tab and pipe alignment (rewrites table text), the 20 px +row hit area and overlay (it conflicts with the pinned `e2e/specs/live-preview/click-reveal/table-add-buttons.spec.ts:31-42` and the tuned gap at `styles.ts:373-379`; open-itens 211 stays open), Tab-reachable add buttons (Tab in the editor is `indentWithTab`, `setup/editor-extensions.ts:165`).

**Size:** M (6 source files, 6 test files, 7 E2E specs). Split point: items 1 and 2 (images, `widgets.ts`, `styles.ts`, `misc-features.spec.ts`) first; items 3 to 5 (mermaid, copy, table names) second.

**Blocked by:** 03

**Status:** resolved

**Gate:** pnpm check + pnpm vitest run, plus bash scripts/e2e.sh <spec> for the specs named in the E2E criterion below.

- [x] Failing test first, `src/tests/lib/core/markdown-editor/extensions/live-preview/widgets/image-widget.test.ts` and `wikilink-image-embed-widget.test.ts`: dispatching `error` on the `<img>` gives the wrapper `cm-lp-image-missing` and the text `Could not load "<name>"`, keeps `cm-lp-image-wrapper`; a detached wrapper does nothing and throws nothing.
- [x] `styles.test.ts` finds an exact `.cm-lp-image-missing` rule with `border-radius: var(--radius-xs)` (added to the ladder list at `:62`).
- [x] `mermaid-widget.test.ts`: a pending `render` shows `Rendering diagram...`; when resolved the text is gone and an SVG is present; the cached path shows the SVG with no placeholder; empty source still says "Empty mermaid diagram".
- [x] `code-block-widget.test.ts`: `writeText` rejecting, or no `navigator.clipboard`, shows "Copy failed" then "Copy" after 1500 ms (fake timers), no unhandled rejection; success still shows "Copied!".
- [x] `table-widget.test.ts` (path `src/tests/lib/core/markdown-editor/extensions/live-preview/table-widget.test.ts`): the two buttons have the names; the mousedown `stopPropagation` (rule 11) and append tests are unchanged.
- [x] `e2e/specs/live-preview/misc-features.spec.ts:108-122` ("image renders widget") has no `page.route` today and relies on a broken `<img>` counting as visible, so it routes its URL to a stub PNG (pattern `click-reveal/image.spec.ts:23-27`) and still sees `img.cm-lp-image`; a new step routed to 404 sees `.cm-lp-image-missing` with "Could not load". Also run `click-reveal/code-block-copy`, `embed-widgets` (its wrapper-attached assertion at `:71-74` still holds), `click-reveal/image`, `click-reveal/wikilink-image-embed`, `mermaid`, `click-reveal/table-add-buttons` with `bash scripts/e2e.sh`.
- [ ] Owner eye check: a note with a deleted image file and one with a mermaid block.
- [x] Frontend gate: pnpm check and pnpm vitest run pass.

## Original proposal

- **P112 (part).** Live-preview widgets have thin loading and error states: missing images have no style and no `onerror`, mermaid is blank while it renders. Style `.cm-lp-image-missing` and switch to it from `img onerror`; show a placeholder while mermaid renders. Validation: revise, math and QueryJS already handle errors; embedded notes as markdown are deferred.
- **P113 (part).** Editor widget controls are mouse-only; Code Copy has no catch, so a failure is silent. Copy failures show "Copy failed". The Toggle task command and Cmd+L are deferred. Validation: revise.
- **P10 (button names only).** Tables in the editor cannot be edited as tables, and both add buttons carry only a title. This ticket ships the accessible names; everything else of P10 is deferred (L).

## Problem

A deleted image or a failed remote image leaves an empty box with no text, mermaid leaves a blank block while it renders, and a copy that fails looks like a copy that worked. The table add buttons are announced as "+".

## Evidence

Checked at `085b23c5d`.

- `widgets.ts:175,615` add `cm-lp-image-missing` for unresolved links only; no `error` listener exists; `grep cm-lp-image-missing styles.ts` finds no rule. `mermaid-widget.ts:78-121` leaves `.cm-lp-mermaid-diagram` empty until the async render. `code-block-widget.ts:91-98` `writeText(...).then(...)` with no catch.
- `widgets.ts:471-472,487-488` the `+` buttons with `title` only (accessible name "+").
- `e2e/specs/live-preview/misc-features.spec.ts:108-122` renders a remote image with no route (no fixture routes it).
- `e2e/specs/live-preview/click-reveal/table-add-buttons.spec.ts:31-42` pins the +row button below the table.

## Why blocked

- 03 adds qjs rules and a `cm-lp-table-scroll` class to `styles.ts` and extends `styles.test.ts` (the radius ladder list at `:62`); this ticket adds `.cm-lp-image-missing` to the same ladder list and the same file, so it runs after 03.

## Sequence with

Tickets 03 (before: `styles.ts` qjs rules), 13 and 14 (after: `styles.ts` and `callout-field.ts`, collection rules); one at a time, never in parallel worktrees. shell-sidebars-ux 33 edits the mousedown sites in `widgets.ts` (`:341-349`, `:675-681`, the table-cell link and the embed header); this ticket edits `ImageWidget`, `WikilinkImageEmbedWidget` and `attachAddButtons` at other lines, but do not run both in parallel. Open-itens 211 (table add-button hit area) and 061 (`TaskCheckboxWidget`) are not covered and stay open.

## Comments

- 2026-11-18, triage: ready-for-agent. Decided by the owner: the order and grouping. Defaults (not individually answered): none.
- 2026-11-18, deliver (issue/08-livepreview-widgets-show-failure-progress): image and wikilink-embed widgets show `Could not load "<name>"` on load error, mermaid shows "Rendering diagram..." while pending, code-block copy shows "Copy failed" on clipboard failure (timer restarts on a second press), table +col/+row buttons have accessible names, styles add `.cm-lp-image-missing`. Full suite passed at 2d927f892 (654 files, 17397 passed, 56 skipped, 1 todo); pnpm check clean. Review round 1 APPROVED (findings fixed: copy timer restart, test DOM cleanup); round 2 APPROVED with no findings. Owner eye check still open.
