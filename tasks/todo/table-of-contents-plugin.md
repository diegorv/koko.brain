# Table of Contents Plugin

Add an optional right-sidebar plugin that lists every ATX heading (H1-H6) of the active markdown file. Clicking a heading scrolls the editor to it. Toggleable via settings and command palette.

## Tasks

- [x] Add `tableOfContentsVisible` flag to `LayoutSettings` (types + default)
- [x] Create `toc.types.ts` with `TocHeading` interface
- [x] Create `toc.logic.ts` with `extractTocHeadings`, reusing `HEADING_RE`, skipping fenced code blocks
- [x] Create `toc.logic.test.ts` covering empty, no headings, mixed levels, trailing whitespace, ``` fence, ~~~ fence, `#NotAHeading`, inline formatting
- [x] Create `toc.store.svelte.ts` with getter-based access pattern
- [x] Create `toc.service.ts` with `rebuildToc` and `scrollToHeading`
- [x] Create `toc.service.test.ts` (null clears, populates, null view no-op, clamping)
- [x] Create `TableOfContentsPanel.svelte` with `$effect` + `untrack()`, indented list, click-to-scroll
- [x] Wire `AppShell.svelte`: import + conditional mount after TagsPanel
- [ ] Add `layout:toggle-table-of-contents` command in `command-palette.service.ts`
- [ ] Add "Table of Contents" Switch in `GeneralSection.svelte`

## Notes

- Plan source: `/Users/diegorv/.claude/plans/queria-criar-uma-feature-hashed-gem.md`.
- Branch: `feat/table-of-contents-plugin`.
- One commit per task; full Conventional Commit format with Context/Problem/Solution/Behavior/Files.
- Run `pnpm check` + `pnpm vitest run` after each task. No Rust changes — skip cargo.
