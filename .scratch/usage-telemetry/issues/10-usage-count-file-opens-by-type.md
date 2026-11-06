# 10: Usage stats count which kinds of notes I open (owner decision needed)

**What to build:** The four seams in Issue 07 count commands, shortcuts, rail and Settings pages. Opening a kanban board, a canvas, a table-heavy note or a meta-bind note goes through none of them. The owner uses kanban, canvas, tables, meta-bind and Quick Capture, and with only those four seams "Most used" will be dominated by Cmd+S and Cmd+W while the editor features look unused.

Option: count file opens by kind, from one seam in the app layer around the callers of `openFileInEditor` (`src/lib/core/editor/editor.service.ts`). Use ids like `open:md`, `open:canvas`, `open:kanban` (a kanban note is detected by its frontmatter) and `open:view`. The calling code must live in `app/` or `features/`, never in `core/`.

**Owner decision:** count note opens by kind, or accept that editor-level features stay invisible to usage stats? If counting, decide whether Quick Capture saves count too (`quick-capture.service.ts`).

**Blocked by:** 07

**Status:** needs-info

**Gate:** Frontend: `pnpm check` + `pnpm vitest run`.

- [ ] Owner decision recorded in Notes
- [ ] Failing first: opening a `.canvas` file records `open:canvas` once; opening the same tab again (focus only) records nothing
- [ ] Kanban detection reuses the existing kanban check, not a new parser

## Notes

- Source: review 2026-11-06 of Issue 07 (coverage gap), owner feature usage memory.
- Size: S.

## Comments
