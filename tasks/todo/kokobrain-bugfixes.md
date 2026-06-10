# Kokobrain Bug Fixes

Two bugs pulled from the Todoist `kokobrain` label. Do this plan **before** `kokobrain-features.md`:
the features plan touches the same type-definitions context menus that task B2 fixes.

## Tasks

- [x] B2: Fix stale/empty context menu on empty-area right-click (TypeSidebar + TypeNoteList)
- [ ] B1: Preserve URLs when pasting links (Slack) - convert clipboard HTML anchors to markdown links

## B2 - empty-area context menu (Todoist 6gqPHXWpwhM725Mm)

**Symptom (confirmed by user screenshots):** right-clicking an actual item gives the correct menu;
right-clicking the *empty area* of the type sidebar shows either an empty black box (first use) or
the *previously clicked* item's menu ("New Project" lingering).

**Root cause:** `sectionContextPath`/`sectionContextName` (`TypeSidebar.svelte:41-42`) are only set by the
per-item handlers (`:210` views, `:241` types) and are never reset when the right-click lands on the
container's empty space. bits-ui opens the menu off the container (`{...props}` spread on the scroll div
`TypeSidebar.svelte:173`), so the stale target renders. Same latent bug in the note list:
`TypeNoteList.svelte:413` (container) + `:423` (`contextTarget` never reset).

**Reference for the correct pattern:** `FileExplorer.svelte:273-276` resets its target when
`e.target === e.currentTarget`.

**Fix:** add an `oncontextmenu` on the trigger container in both components that, when the event target is
the container itself (empty area), resets the context target(s) to `null` and still forwards to bits-ui.
Result: empty-area right-click shows **no** menu (the "New type" item for the empty area is added later in
the features plan, task F3).

**Verify:**
- `pnpm check` + `pnpm vitest run` (component/logic tests for the reset behavior).
- Manual: right-click empty area in the type sidebar -> nothing; right-click an item -> correct menu for
  that item; repeat after selecting different items -> no stale target.

## B1 - paste link from Slack loses the URL (Todoist 6gqgwh9P7CqRWJGm)

**Root cause:** `paste-tsv-handler.ts:20` reads only `text/plain`; CodeMirror's default paste also uses only
`text/plain`. Slack puts the label in `text/plain` and the link in `text/html` (`<a href="url">label</a>`),
so the URL is discarded. No HTML->markdown library exists in the repo (and we will not add one).

**Decision (locked):**
- Output a **markdown link `[label](url)`**.
- **Conservative trigger:** only intervene when `text/html` contains an `<a href>` whose URL is **not already
  present** in the `text/plain`. Otherwise fall through to the existing TSV check, then CodeMirror's default.
  (Many apps put `text/html` on the clipboard for plain text - must not hijack normal pastes.)
- If the link **text equals the URL** (raw URL copied) -> insert the **bare URL**, not `[url](url)`.
- Replace each `<a href>` in the HTML with `[text](url)` and keep surrounding text; **no turndown / full
  rich-paste** (bold, lists, images out of scope -> plain-text fallback).

**Where:** extend the live-preview paste handling (`extensions/live-preview/handlers/paste-tsv-handler.ts`
and its registration in `extensions/live-preview/live-preview.ts:24,70`), or a sibling handler ordered with
it. Put the HTML-anchor -> markdown conversion in a pure `.logic.ts` so it is unit-testable.

**Verify:**
- `pnpm check` + `pnpm vitest run`. Unit tests for the converter: single anchor, anchor whose text == href,
  multiple anchors + text, html with no anchor (-> fall through), url already in plain text (-> fall through),
  TSV still converts to a table.
- Manual: copy a link in Slack, paste -> `[label](url)`.

## Notes

- One commit per task (B2, then B1), full Conventional Commit format with Context/Problem/Solution/Behavior/Files.
- B2 and B1 are independent; B2 is listed first because the features plan builds on the same components.
