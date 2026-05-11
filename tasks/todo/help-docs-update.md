# Help Documentation Update

Bring `help/documentation/` back in sync with the current code. Spot-checks confirmed 10 docs are accurate, 14 need targeted edits, and meta-bind (INPUT/SELECT/BUTTON syntax handled in `src/lib/core/markdown-editor/extensions/live-preview/parsers/meta-bind-{input,button}.ts`) has zero user documentation. This task addresses every confirmed gap. Docs-only — no `src/` or `src-tauri/` changes.

Plan file: `~/.claude/plans/revisa-tudo-do-projeto-sparkling-llama.md`.

## Tasks

- [x] Task 1: `02-file-explorer.md` — add "New Kanban Board" context-menu entry, document icon color picker.
- [x] Task 2: `03-editor.md` — add Kanban to file-type list and source-toggle paragraph.
- [x] Task 3: `05-wikilinks.md` — document HTML `<audio>`/`<video>` embeds and supported image extensions.
- [x] Task 4: `07-sidebar-panels.md` — document tag color picker (click the dot, not right-click).
- [x] Task 5: `09-quick-notes-and-templates.md` — document `workPeopleFolder` + `peopleFolder` and fix default values.
- [x] Task 6: `11-canvas.md` — added keyboard shortcut table (Shift+1, Shift+2, Cmd+A, Escape, Delete). Color count was already correct.
- [x] Task 7: `14-graph-view.md` — added Layout note (auto-tuned force params) and "Show orphans" filter.
- [x] Task 8: `15-file-history.md` — added settings-key column and a Snapshots-and-Trash subsection.
- [x] Task 9: `16-encryption-and-security.md` — added full Recovery Keys section and corrected the "no recovery" warning.
- [x] Task 10: `21-kanban.md` — added View Modes section and `viewMode` settings-block key.
- [x] Task 11: `13-queryjs.md` — added Execution policy, Result cache, and Awaitless `kb.view()` subsections. (No `kb.query()` mention existed in the doc; that part was a false positive from the review.)
- [x] Task 12: `19-settings.md` — added Theme Editor, content width / paragraph spacing / heading typography, yearly periodic notes, Personal/Work people folders, QueryJS section, Tag Colors section, Security section, and disabledDecorators / livePreviewProfiling.
- [ ] Task 13: `12-collection.md` — fix property types list (5 actual: text, list, number, date, boolean; not 7).
- [ ] Task 14: Create new `24-meta-bind.md` — INPUT/SELECT/BUTTON syntax reference + cross-link to examples.
- [ ] Task 15: `04-markdown.md` — add short "Interactive elements" section pointing to `24-meta-bind.md`.
- [ ] Task 16: `README.md` — add entry 24 to the index + learning-path narrative.

## Notes

- Docs-only commits — CLAUDE.md rule 11 (test file per source change) is N/A. Every commit body should note this.
- One commit per task per CLAUDE.md plan-mode rules and `docs/COMMITS.md` format (Context, Problem, Solution, Behavior, Files with line ranges).
- Order optimized so the new `24-meta-bind.md` exists before docs that link to it (Tasks 15 and 16 run last).
- When complete: `mv tasks/todo/help-docs-update.md tasks/done/`.
