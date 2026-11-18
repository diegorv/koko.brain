# 04: Canvas file and link cards: a plain click selects, an open button opens, previews skip frontmatter

**Origin:** design review 2026-11-17, proposals P134, P11 (canvas card half) (`.scratch/design-review/review.md`), prototype `.scratch/design-review/prototypes/canvas.html` (P134) and `editor-authoring.html` (P11), research `.scratch/ux-quick-wins/research/verdict-canvas.md` (Q2), `verdict-editor.md` (E4) and `breakdown.md` (old ticket 17). Absorbs open-itens 050 (`.scratch/open-itens/issues/050-canvas-file-nodes-preview-note-without-yaml.md`, already marked wontfix with a pointer here). The source-mode half of P11 is ticket 46.

**What to build:**

1. **Plain click selects.** The file and link header (`src/lib/features/canvas/FileNode.svelte:55-57,66-70`, `LinkNode.svelte:80-88,118-121`) no longer opens on a plain click; it is where users grab the card. Cmd or Ctrl click opens. xyflow's multi-select key is also Cmd on macOS, so Cmd-click also toggles selection; state this in the commit.
2. **An always-visible open button.** An icon button, a sibling of the header and never nested in it (the header becomes a non-interactive drag area), `aria-label` "Open note" or "Open link", visible without hover (the `.open-icon` at `FileNode.svelte:134-142` starts at `opacity: 0`), reachable by Tab, opens on click or Enter.
3. **Failures are visible.** `openUrl` rejecting, or `isSafeUrl` false, shows `toast.error` from svelte-sonner (today `LinkNode.svelte:84-86` swallows it).
4. **Menu items work.** `CanvasInner.svelte` passes the existing `onopenfile` and `onopenurl` (declared at `CanvasContextMenu.svelte:42-43`, rendered at `:127-136` as "Open in editor" and "Open URL") for file and link nodes; they are never wired today (`CanvasInner.svelte:635-686`). Open-itens 039 (the relative-path bug of "Open in editor", which passes `data.file` as stored) still applies and stays open.
5. **Previews skip frontmatter.** File node previews render the body after the frontmatter through a wrapper over `stripFrontmatter` (`src/lib/core/markdown-editor/extensions/live-preview/embed-resolver.logic.ts:53-61`) placed in `src/lib/features/canvas/canvas-markdown.logic.ts`, used at `FileNode.svelte:81-85`. A frontmatter-only file shows the existing "Empty file" state; text nodes keep rendering a leading `---` through the unchanged `renderCanvasMarkdown`; a file with no frontmatter renders as today. CRLF files stay as today (`stripFrontmatter` leaves them; known limit, the same as the kanban card preview). Display only: the file is never written.
6. **Help.** `help/documentation/11-canvas.md:86-87` describes the new behaviour (plain click selects, Cmd or Ctrl click or the open button opens).

Not in this ticket: new text card creation and keyboard editing (ticket 43), handles (ticket 16), theme tokens (ticket 06), double-click (stays "edit" on link cards; it cannot mean "open").

**Size:** M. Split point: items 1 to 4 (open behaviour, `FileNode`, `LinkNode`, `CanvasInner`, help) first; item 5 (preview strip, `canvas-markdown.logic.ts`) second, both inside `FileNode.svelte`.

**Blocked by:** none

**Status:** ready-for-agent

**Gate:** pnpm check + pnpm vitest run, plus bash scripts/e2e.sh <spec> only when a selector or E2E surface changes (run `e2e/specs/canvas-view.spec.ts` if the node header selector it uses changes).

- [ ] Failing test first, new `src/tests/lib/features/canvas/canvas-node-open.test.ts` (real `editorStore`, `@tauri-apps/plugin-opener` mocked as the Tauri boundary): a plain click on a file header adds no tab, and on a link header does not call `openUrl`.
- [ ] Ctrl or Cmd click opens (a tab is added, or `openUrl` is called with the URL).
- [ ] The open button has no `opacity: 0` default in the source, is reachable by Tab and opens on click.
- [ ] `openUrl` rejecting and a `javascript:` URL each show a toast.
- [ ] File nodes show "Open in editor" and link nodes "Open URL" in the menu, and they work.
- [ ] Failing test first, `src/tests/lib/features/canvas/canvas-markdown.logic.test.ts` (real logic): the file preview of `---\ntype: person\ntags: [a]\n---\n# Title\nBody` has the heading and Body and neither `type: person` nor an `<hr>`; frontmatter-only gives an empty body; no frontmatter renders as today; `renderCanvasMarkdown('---\ntext')` for a text node is unchanged.
- [ ] Help `11-canvas.md:86-87` is updated; by eye, a typed note on a canvas shows its body without YAML.
- [ ] Frontend gate: pnpm check and pnpm vitest run pass.

## Original proposal

- **P134.** A single click on a canvas file or link header navigates away. The header is where users grab the card, the open icon shows only on hover and URL failures are silent. A plain click selects; Cmd+click or an always-visible open icon opens; double-click stays "edit" on link cards; toast on `openUrl` failure; update the help. Validation: revise, double-click cannot mean "open".
- **P11 (canvas card half).** Canvas note cards render the raw file, so every typed note card shows "_type: Meeting" as a heading. Canvas cards strip frontmatter through a logic-layer wrapper around `stripFrontmatter`. Validation: keep.
- **Open-itens 050.** Canvas file nodes preview the note without YAML; its four criteria are carried above.

## Problem

Dragging a card by its header on a daily-use canvas opens the note or the browser instead, and a link that fails to open says nothing. Every typed note on a canvas opens with a rule and raw `key: value` lines, or a setext heading.

## Evidence

Checked at `085b23c5d`.

- `FileNode.svelte:55-57` `handleClick` opens the file, `:66-70` the header button, `:134-142` the hover-only icon, `:81-85` renders `renderCanvasMarkdown(fileContent)` with a plain `marked` pass (`canvas-markdown.logic.ts:14-18`).
- `LinkNode.svelte:80-88` `handleClick` swallows `openUrl` errors (`catch { /* ignore */ }`).
- `CanvasContextMenu.svelte:127-136` the two menu items are shown only when the callbacks are passed; `CanvasInner.svelte:635-686` passes neither.
- `help/documentation/11-canvas.md:86-87` documents the click-to-open behaviour.
- `src/lib/plugins/kanban/kanban.service.ts:82` already strips frontmatter for the kanban card preview.

## Sequence with

Tickets 06, 16, 17 and 43 edit `FileNode.svelte`, `LinkNode.svelte` or `CanvasInner.svelte` on other lines (06 colours, 16 handles and `ImageNode`, 17 the menu and pickers, 43 text card creation); run them one at a time, this ticket first. shell-sidebars-ux 25 replaces `CanvasToolbar` with a `ViewHeader` in `CanvasInner.svelte`: never in parallel. Open-itens 039 and 051 (canvas data paths) stay open and are not touched.

## Comments

- 2026-11-18, triage: ready-for-agent. Decided by the owner: the order and grouping. Defaults (not individually answered): 04.1 (old 17.1): a plain click on a card header selects instead of navigating away (validated P134; a daily-use behaviour change). Default: yes.
