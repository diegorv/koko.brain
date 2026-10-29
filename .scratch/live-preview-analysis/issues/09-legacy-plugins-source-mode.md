# 09: Legacy decorations only in source mode; right click does not navigate

**What to build:** The legacy `wikilinkDecoration` and `calloutDecoration` extensions run only in source mode. Today they are always installed next to live preview: wikilinks and callout headers are styled twice, they rebuild on every scroll, and the callout one styles `> [!note]` inside code fences. The callout one is the only callout styling in source mode, so it must stay there. Right click on a wikilink no longer navigates or creates the note.

**Context:** Analysis run 2026-10-29 (40 haiku + 15 opus over `src/lib/core/markdown-editor`, plus 20 haiku over seven reference editors). Evidence and decisions: `.scratch/live-preview-analysis/findings-2026-10-29.md`; verified findings with file:line: `.scratch/live-preview-analysis/report-markdown-editor.md`. Target model: one shared line-based reveal predicate (every line touched by the selection), rebuild on every selection change with no cross-update state, instant swaps with no CSS animation, heading line height independent of the cursor.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

**Touches:**
- `src/lib/core/markdown-editor/setup/editor-extensions.ts` (modify; :84-85)
- `src/lib/core/markdown-editor/MarkdownEditor.svelte` (modify; :57)

**Gate:** `pnpm check` + `pnpm vitest run` + `pnpm build` (frontend only)

- [ ] Test: live-preview extension set does not contain the legacy wikilink and callout decorations; source mode still does
- [ ] Test: a right-button mousedown on a wikilink does not navigate
- [ ] Manual check: wikilinks and callouts in live preview look the same as before minus the double styling
