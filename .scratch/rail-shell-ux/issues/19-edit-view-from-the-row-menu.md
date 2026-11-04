# 19: Edit view from the view row's menu

**What to build:** The view row's menu in the Types navigator gets "Edit view". It opens the same dialog as New view, titled "Edit view", prefilled with the view's label and filters, with the button "Save". The first view's own filters show under "This view"; a view that also has top-level filters shows them under "All views", so nothing in the view is hidden. Saving rewrites only the label (`_sidebar_label` and the first view's name) and the two filter places; the `.view` filename and every other key stay as they are. The row and the note list update to the new label and filters. A save failure shows inline with the dialog kept open, as in create.

**Blocked by:** 04, 18

**Status:** ready-for-agent

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`, plus the rail-shell E2E spec via `bash scripts/e2e.sh`.

- [ ] Prefill: the label, the first view's filters and, when present, the top-level filters load into the dialog's two sections; New view still shows only "This view" (component test, real filter logic)
- [ ] Save rewrites `_sidebar_label`, the first view's name and the two filter places, and keeps every other key as values: `_icon`, `_color`, `_sort`, `_order`, `_open_in_editor`, the view's sort, columns and limit, and any other views (logic test, real YAML updater)
- [ ] Clearing all rows of a section on Save removes that filter key instead of writing an empty one (logic test)
- [ ] The duplicate-label check ignores the view being edited, so saving with the same name, or a case change of it, is allowed (logic test)
- [ ] The filename never changes: open tabs on the view and a saved Types pick of it keep resolving after a rename (component test, real stores)
- [ ] Save failure keeps the dialog open with the reason in a `role="alert"` element; the dialog cannot be closed while saving (component test)
- [ ] E2E: open a view's row menu, Edit view, change the name and a filter, Save; the row shows the new name and the note list the new matches
- [ ] Help: the Types and Relationships page lists Edit view among the view row's menu actions

## Notes

- **Why Issue 04 first:** nested filter objects must load as rows, or a hand-written nested filter would be rewritten as JSON text on Save.

- **Owner decisions (2026-11-04):** Edit view is part of this feature; renaming changes the label only, never the filename (no path change, so tabs, saved picks and links are untouched); nested filters are fixed first (Issue 04) rather than shown as read-only.
- **Known limitation, not fixed here:** the existing `.view` write path writes through the plugin-fs file API and bypasses the note-change owner, so the index catches up only through the watcher's full rebuild (filed as Issue 02). Edit's Save reuses that path; when Issue 02 lands, Edit gets the fix with it.
- **Label lag:** the row label comes from the index, so after a rename it updates at the next index refresh; ask for a prompt refresh on Save, as create does.
- **Size:** M.

## Comments
