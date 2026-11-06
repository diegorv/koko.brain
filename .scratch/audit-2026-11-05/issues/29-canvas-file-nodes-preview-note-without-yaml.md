# 29: Canvas file nodes preview the note without its YAML frontmatter

**What to build:** FileNode reads the whole file (src/lib/features/canvas/FileNode.svelte:40-44) and renders it with renderCanvasMarkdown (:83, src/lib/features/canvas/canvas-markdown.logic.ts:14-18), plain marked with no frontmatter handling, so the card opens with a rule and the raw key: value lines (or a setext heading). The kanban card preview strips frontmatter first (src/lib/plugins/kanban/kanban.service.ts:82). Fix direction: strip the frontmatter before rendering a file node's preview (the existing stripFrontmatter in src/lib/core/markdown-editor/extensions/live-preview/embed-resolver.logic.ts:54 is a .logic.ts), without changing how text nodes render a leading ---.

**Blocked by:** none

**Status:** ready-for-agent

**First wave:** yes, picked by the owner on 2026-11-06.

**Gate:** frontend only: `pnpm check` + `pnpm vitest run`.

- [ ] Failing test first, in src/tests/lib/features/canvas/canvas-markdown.logic.test.ts (or the test of the helper FileNode calls): rendering the file-node preview of '---\ntype: person\ntags: [a]\n---\n# Title\nBody' yields HTML with the Title heading and Body and without 'type: person' or an <hr>. It fails today.
- [ ] A text node whose own text starts with --- renders as today.
- [ ] A file with no frontmatter renders as today; a file with only frontmatter shows the empty state.
- [ ] Frontend gate: pnpm check and pnpm vitest run pass.

## Notes

- **Priority:** daily use and UI correctness (bucket 2-ux). Ux/medium. Any typed or tagged note placed on a canvas previews its raw YAML.
- **Trigger:** Place a note that has properties (any typed or tagged note) on a canvas as a file node.
- **Evidence (verified by reading code at `5f8003d67`):** src/lib/features/canvas/FileNode.svelte:40-44 readTextFile of the whole file; FileNode.svelte:82-83 {@html renderCanvasMarkdown(fileContent)}; src/lib/features/canvas/canvas-markdown.logic.ts:14-18 marked.parse only; src/lib/plugins/kanban/kanban.service.ts:82 stripFrontmatter(content) for the kanban preview; help/examples/canvas-features/interview-notes.md opens with a --- block. Note: until .scratch/audit-2026-11-04/issues/17-canvas-node-path-resolution.md lands, in-app picked file nodes fail to load at all, so today this shows mainly on canvases with vault-relative paths.
- **Related Issues before the audit:** `.scratch/audit-2026-11-04/issues/17-canvas-node-path-resolution.md`
- **Source:** audit 2026-11-05, domain `boards`, finding `N-boards-05` (from boards-ux-5, boards-spec-6). Size S.

**Second opinion (audit 2026-11-05, round 2):** upheld (ux, medium). FileNode.svelte:40-44 reads the whole file and :82-83 renders it with renderCanvasMarkdown, which is only marked.parse plus sanitize (canvas-markdown.logic.ts:14-18) with no frontmatter handling. kanban.service.ts:82 strips frontmatter with stripFrontmatter from embed-resolver.logic.ts:54. The named test file canvas-markdown.logic.test.ts exists. Corrections to apply while implementing: The criterion 'a file with only frontmatter shows the empty state' also needs the {:else if fileContent} branch (FileNode.svelte:82) to test the stripped body instead of the raw content. Say so in the fix direction, or that criterion is easy to miss.

## Comments
