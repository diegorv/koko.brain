# 02: The New view dialog takes filters

**What to build:** The New view dialog gets a filter section under the name: the same rows the note list's Filter panel uses (field, operator, value; "All / Any / None of the following are true" for the group; Add filter; remove), with the `file.*` fields and every note property as fields. The panel's "All views" section is not shown. It starts with no rows; with no rows the view lists everything, as in 01. Create is disabled while a row that needs a value has none. On Create the rows are saved as the first view's own filters, and the new view's list shows only the matching notes. Opening the note list's Filter panel on the new view shows the same rows under "This view".

Prefactor first, in its own commit: the collection filter panel can hide its "All views" section. Its two current uses (the collection editor and the note list's view toolbar) keep showing it.

`createView` gains an optional filters argument:

```ts
createView(name: string, filters?: CollectionFilter | string): Promise<string> // filters land in views[0].filters; omitted when undefined
```

**Blocked by:** 01

**Status:** ready-for-agent

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`, plus the rail-shell E2E spec via `bash scripts/e2e.sh`.

- [ ] Filter panel with the global section hidden renders only "This view", and add, edit, remove and conjunction change still report through the view callback; by default it still renders both sections (component test; the panel's first direct test)
- [ ] Dialog: starts with no rows; the field list holds the `file.*` fields and the keys of the real property index (seeded through the real collection store); a row's operators follow the field's inferred type; opening a field, operator or conjunction menu does not submit or close the dialog (component test)
- [ ] Dialog: Create is disabled, with a message, while any row whose operator takes a value has a blank value; unary rows (is empty, is not empty, is true, is false) never block it (component test against the real filter logic)
- [ ] Dialog submit: one positive row is passed as a single expression; several rows, or a "None" group, as an `and` / `or` / `not` object; no rows pass no filters (component test, real filter logic, service boundary mocked)
- [ ] Service: given filters, the created `.view` holds them under the first view, and they read back to the same conjunction and the same expression per row; a one-row "Any" group reads back as "All" (one expression either way) and row ids are ignored (service test, real parser and real filter logic)
- [ ] E2E (extends 01's happy path): in the dialog, open the field menu, pick `_type`, open the operator menu, pick an item, type `Project`; the dialog stays open with the row updated; Escape with a menu open closes only the menu; Create; the note list shows exactly the two seeded active Project notes (Alpha and Beta), not the archived one and not the system-folder template; the saved `.view` holds the filter under its first view
- [ ] Help: the dialog's filter section is described, including that dialog-made views store their filters under the first view (shown under "This view"), unlike the page's examples, which use top-level `filters:`, and that the filters can be changed later from the note list's Filter panel

## Notes

- **Owner decisions (2026-11-04):** the dialog starts with no rows (not Tolaria's prefilled row); filters are written to `views[0].filters`, not top-level `filters`; icon and color stay out of the dialog (the row menu's Change icon covers them).
- **Main-session decisions:** a blank value blocks Create rather than being dropped on save (easier to explain); the field list is the same one the note list's Filter panel shows, including the keys only `.view` files have (`views`, `filters`, `_sidebar_label`, ...), for parity; excluding them is a separate change for both.
- **Out (no equivalent here):** nested groups, Tolaria's `any_of` / `none_of`, the regex toggle, and Tolaria's `title` / `status` / `body` built-ins (`file.name` is the closest to title; `status` is an ordinary property).
- **Index not ready:** until the property index is loaded after vault open, or if loading it failed, the dialog offers only the `file.*` fields. No handling needed.
- **Pre-existing, filed separately:** date "is" never matches on `file.ctime` / `file.mtime` (`.scratch/view-filter-bugs/issues/03`); the dialog exposes it the same way the toolbar does.
- **Dialog plus menus:** no dialog in the app hosts a dropdown menu yet, and jsdom cannot show whether the portaled menus work inside the dialog's focus trap; that is why the E2E drives the menus.
- **Size:** M.

## Comments
