# Help Examples Update

Add missing example sets identified by code-vs-examples audit:

1. `help/examples/` has no `.canvas` files despite the Canvas feature (`11-canvas.md`).
2. No `.kanban` files despite Kanban feature (`21-kanban.md`) with three view modes.
3. No auto-move rules JSON despite Auto Move feature (`22-auto-move.md`).
4. QueryJS API surface only partially exercised: existing 20 scripts cover ~10 of the 17 `kb.ui.*`/`kb.*` methods. Missing: `kb.ui.cards`, `kb.ui.statusCards`, `kb.ui.timeline`, `kb.ui.tagCloud`, `kb.ui.progressBar`, `kb.ui.heatmap` (color-scaled non-calendar), and `kb.list` with `kb.fileLink`/`kb.page` for KBLink-aware lists.

Plan file: `~/.claude/plans/revisa-tudo-do-projeto-sparkling-llama.md` (extended).

## Tasks

- [x] Task 1: `canvas-features/` — `product-brainstorm.canvas` + `interview-notes.md` + README, covering all 5 node types, preset + hex colors, labeled / sided / no-arrow edges.
- [x] Task 2: `kanban-features/` — three `.kanban` files (board / list / table view modes) + README covering lanes, archive, WIP limits, auto-complete, dates, colors, tags, wikilinks, sortMode, tagColors.
- [x] Task 3: `auto-move-features/` — `auto-move-rules.json` (5 rules, 1 disabled) + 3 sample notes that each match a different rule + README walking through the lifecycle.
- [x] Task 4: queryjs new scripts under `__system/queryjs/` — `vault-overview-cards`, `project-status-cards`, `recent-edits-timeline`, `vault-tag-cloud`, `project-progress-bars`, `tag-heatmap`, `note-shortlist`, plus a `dashboard.md` that composes them.

## Notes

- Docs-only commits, one per task.
- Match the existing style of `help/examples/<feature>/`.
- Use Portuguese sample data sparingly (project rule = English-only in repo) — examples should use English content.
