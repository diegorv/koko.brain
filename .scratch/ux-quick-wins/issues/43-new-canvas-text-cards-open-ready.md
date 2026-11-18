# 43: New canvas text cards open ready to type and cascade; Enter or F2 edits a selected card

**Origin:** design review 2026-11-17, proposals P133 and P135, prototype `.scratch/design-review/prototypes/canvas.html`, research `.scratch/ux-quick-wins/research/verdict-canvas.md` (Q1, corrections 2 and 8) and `breakdown.md` (old ticket 16).

**What to build:**

1. **A new text card is ready to type in.** "Add text card" (the toolbar button, the empty-canvas "+ Add card" button at `src/lib/features/canvas/CanvasInner.svelte:607`, and the pane menu item at `:645-646`) adds the card, selects it, deselects the others and enters edit mode with focus in the textarea. The `editing` flag is set only after the creating `persistChanges`, through the same `updateNodeData(id, { editing: true })` the menu "Edit" uses (`:659-663`). At that point the node is in `lastSyncedData`, so `flowToCanvas` takes its existing-node branch, which copies only the whitelisted keys (`canvas.logic.ts:205-209`) and never serializes `editing`. No serialization function changes. Do not strip an `editing` key inside `flowToCanvas`: JSON Canvas allows extra keys and `flowNodeToCanvasNode` keeps them through `...originalNode` (`canvas.logic.ts:195`), so stripping would delete a third-party field from a vault file.
2. **Repeated adds cascade.** Repeated toolbar adds (`addTextCard`, `:482-488`) use a new pure `cascadePosition(nodes, point)` in `canvas.logic.ts` (new function only): the point when free, a fixed step while a node sits there. Menu-opened file, link and image adds land at the right-click point: store it when the menu opens the picker (`:648-650`), because `menu` is null by the time `handleFileSelected`, `handleImageSelected` and `handleLinkSubmitted` run (`:496-523`).
3. **Enter or F2 edits.** Enter or F2 on a focused, selected text or link card wrapper (`e.target` is the `.svelte-flow__node`) starts editing. A file card does nothing. Enter typed inside the textarea inserts a newline only (`TextNode.svelte:49` `stopPropagation`). Escape in the text textarea ends editing and returns focus to the wrapper with the card still selected, so Enter edits again. A link card keeps its current Enter and Escape handling. The choice for an unselected focused card is that Enter selects it and starts editing in the same keypress (xyflow selects on Enter, `NodeWrapper.svelte:189-192`); test that it does not need two presses.
4. **Roomier textarea.** `.canvas-textarea` (`TextNode.svelte:112-125`) gets `height: 100%`, `resize: none` and a focus ring on `--ring`. Any new radius is a token: the radius ratchet (`src/tests/lib/radius-scale.test.ts:164-205`) pins the px count per canvas file.
5. **Help.** `help/documentation/11-canvas.md:44,56` ("Click Text in the toolbar", "Double-click a text node to edit") name the ready-to-type card and Enter or F2. Lines `:86-87` belong to ticket 04.

Not in this ticket: any change to `flowToCanvas`, `flowNodeToCanvasNode`, `flowEdgeToCanvasEdge`, `serializeCanvas` or `parseCanvas`; edge label editing; Duplicate's own offset (open-itens 051); the `data.file` path form (open-itens 039).

**Size:** S.

**Blocked by:** 06, 16

**Status:** ready-for-agent

**Gate:** pnpm check + pnpm vitest run, plus bash scripts/e2e.sh canvas-view.spec.ts only when a selector or E2E surface changes (it only renders a seeded canvas today).

- [ ] Failing test first, `src/tests/lib/features/canvas/canvas.logic.test.ts`: `cascadePosition` returns the point when free, a stepped point when a node sits there, a further step for a third.
- [ ] Failing test first, new `src/tests/lib/features/canvas/canvas-text-editing.test.ts` (harness of `canvas-tab-switch.test.ts`, real stores, only Tauri boundaries mocked): clicking "Add text card" (found by name, so it survives shell-sidebars-ux 25) leaves a `.canvas-textarea` as `document.activeElement` and the node `selected`; a second click places a second card at another position.
- [ ] Typing in the new card and advancing the 300 ms debounce puts the text in the tab content. No `onJsonChange` payload ever contains an `editing` key: assert on every payload, including the first, synchronous one.
- [ ] Enter and F2 on a selected text card wrapper open the textarea focused; Enter on a selected file card does nothing; Enter inside the textarea inserts a newline and starts nothing else; Enter on an unselected focused card selects and edits in one press.
- [ ] Escape in the textarea: `document.activeElement` is the node wrapper, the node is still selected, and Enter edits again.
- [ ] Pane menu > Add link > submit places the node at the right-click flow point (the same for file and image).
- [ ] Source assertion: `.canvas-textarea` has `height: 100%` and `resize: none`; `radius-scale.test.ts` still passes with the same counts.
- [ ] Frontend gate: pnpm check and pnpm vitest run pass. Not checked in the real app: the focus ring and card feel at several zoom levels (owner eye check).

## Original proposal

- **P133.** New canvas cards are not ready to type into and stack on each other: a new card is neither selected nor in edit mode, toolbar adds all use the viewport centre and menu adds place cards inconsistently. Proposal: new text cards start selected and in edit mode, menu adds use the click position, repeated adds cascade.
- **P135.** Canvas text cards are hard to enter and cramped once editing: editing needs a double-click, the textarea is 40 px tall with its own resizer and no outline. Proposal: Enter or F2 on a selected card starts editing, the textarea fills the card (`height: 100%`, `resize: none`) and shows a focus ring. Validation: revise, the one-time hint is dropped because the empty card already says "Double-click to edit".

## Problem

Every new card needs a click to select it, a double-click to edit, and then a manual drag because the next card lands on top of it. Entering an existing card is double-click only, so a keyboard user cannot edit at all.

## Evidence

Checked at `085b23c5d`.

- `CanvasInner.svelte:474-480` `getViewportCenter`; `:482-488`, `:496-523`, `:548-553` all add at the viewport centre and call `persistChanges`; `:370-375` `addNodeAtMenuPosition`; `:129-133` `persistChanges`; `:229-243` the 300 ms effect that persists on any `nodes` change, which selection already triggers today with identical JSON.
- `canvas.logic.ts:195` (`...originalNode`), `:205-209` (whitelist: text, file, url, label, color), `:300-317` (new-node branch spreads `fn.data`, the only place a pre-persist `editing` would leak).
- `TextNode.svelte:22-26` the `data.editing` effect clears the flag with `editing: undefined` and focuses in a rAF; `:46-53` Escape and `stopPropagation`; `:112-125` the textarea CSS. `LinkNode.svelte:37-40` the same flag; `:60-68` its Enter and Escape.
- xyflow 1.7.1: a focused node wrapper handles Enter, Space and Escape (`NodeWrapper.svelte:189-192`); Enter selects an unselected node and never toggles off a selected one without the multi-select key (`store/index.js:196-202`); Escape unselects and blurs (`:199-201`). F2 is not global (only `NoteRow.svelte:73`).
- `canvas.logic.ts:348-350` `createTextNode` (`DEFAULT_WIDTH`, `DEFAULT_HEIGHT`).

## Why blocked

- 06: it moves the canvas surfaces to theme tokens and edits `CanvasInner.svelte`, `TextNode.svelte` colours and `canvas.logic.ts` (`buildGroupStyle`); this ticket edits the add paths, the key handling and `.canvas-textarea` in the same files. Its own blocker 04 (the file and link card headers, `LinkNode.svelte`, `CanvasInner.svelte` props) is covered through it.
- 16: it edits `ImageNode.svelte` and the node handles in `CanvasInner.svelte` and `canvas.logic.ts`; the image add at `:505-512` is one of the paths this ticket changes the position of.

## Risk

This ticket adds new triggers for creating nodes in a `.canvas` file (the existing write path `persistChanges` then `onJsonChange`, in a file the owner uses daily). What could be lost or damaged: a transient UI flag (`editing: true`) written into the file's JSON for good if it is set before the creating persist, which also leaks into the serialized text of a daily canvas; new cards cascading onto positions of existing ones in the saved layout; and a card created with an empty text that autosaves. The ticket sets the flag only after the creating persist, asserts on every `onJsonChange` payload, and changes no serializer. It runs only when the owner names it (launch by number, never `--all`).

## Sequence with

Shell-sidebars-ux 25 replaces `CanvasToolbar` with a `ViewHeader` in `CanvasInner.svelte` and its own test clicks "Add text card": never in parallel with it. Ticket 17 (runs before this one) edits the canvas menu and pickers, and the focus restore in their close handlers, in the same `CanvasInner.svelte` region (`:640-686`). Open-itens 039 edits `handleFileSelected` (`:496-502`) and the "Open in editor" path, 051 (Duplicate) keeps its own offset in the same add paths, 026 and 027 are the `.canvas` data paths: all stay open, sequence with them. Open-itens 195 and 196 are covered by ticket 06.

## Comments

- 2026-11-18, triage: ready-for-agent. Decided by the owner: the order and grouping, and for this ticket "tickets at the end, run only when named". Defaults (not individually answered): 43.1 (written here, from the verdict): on an unselected focused card, Enter selects and starts editing in the same keypress. Default: yes.
