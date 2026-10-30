# 08 discovery: data notes for markdown-editor-vault

Template: issue 03 (scoping) left the queries reading this folder; this Issue only adds data and rewrites texts.

## Files that change
- New `help/examples/markdown-editor-vault/data/` (15 notes): 2 bugs, 1 backlog task, 2 projects, 3 meetings,
  7 dailies (2026-02-09..15). Shapes copied from `collection-features/` and `queryjs-features/`, renamed fake values.
- `20-collection.md`: header (lines 4-7) and every ESPERADO of sections 1-15, 20.
- `22-queryjs.md`: header (5-6); section 4 (line 57) folder source `/collection-features` -> `/data`; ESPERADO of
  query sections; backtick the inline `#projeto` / `#type/project` (lines 6, 49, 256) so the note does not index them.
- `23-queryjs-real-scripts.md`: header (5-8) and ESPERADO of sections 1, 2, 4, 7-10.
- `24-queryjs-advanced.md`: header (5-6); frontmatter `tags: [area/dev, team/engineering]` so section 9 has related
  notes; ESPERADO of the query sections.

## Facts the texts depend on (verified in code)
- Collection `file.hasTag` = exact match on frontmatter `tags` (evaluator.ts:501); meetings carry a plain `meeting`
  tag and project-garden a plain `pessoal` tag. Sort puts null last both ways (collection.logic.ts:273).
- QueryJS `whereTag` = prefix match on Rust tags (frontmatter + inline, `%%` not stripped: parsing.rs:442).
- Rust tasks: `- [c] text` with any non-space `c` counts as completed (parsing.rs:1167); callout tasks are not tasks.
- Folder already holds notes with data: 18-frontmatter (status active, priority 3, created 2024-01-15, 3 tags),
  19-meta-bind (status todo), 21-combined-stress (status active, 2 tags, 2 tasks), 03-lists (12 tasks),
  02-headings (inline tag `Sem`). ESPERADO counts include them.

## Plan
1. Commit this discovery.
2. Write the 15 data notes, then rewrite headers and ESPERADO texts with exact results; verify tag/task counts with
   a throwaway node script over `tags.logic.ts::extractAllTags`. Run the scoping guard.

## Defaults taken
- 23 section 8 (`status === "active"`) keeps its code: ESPERADO lists the 4 active notes instead of narrowing the query.
- 23 sections 3/5 (`kb.view` from the vault root) are untouched: their scripts belong to issue 09/02.
- Mixed `priority` types (projects numeric for 23 sections 7/8, others strings for collection section 4) stay; the
  texts do not claim an order across types.

## Risks
- Exact counts drift whenever a note in this folder gains tags, tasks or status.
