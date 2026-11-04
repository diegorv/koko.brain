# 18: The New view dialog takes filters

**What to build:** The New view dialog gets a filter section under the name: the same rows the note list's Filter panel uses (field, operator, value; the group's `CONJUNCTION_LABELS` menu, "All the following are true" / "Any of the following are true" / "None of the following are true"; Add filter; remove), with the `file.*` fields and every note property as fields. The panel's "All views" section is not shown. It starts with no rows; with no rows the view lists everything, as in Issue 17. Create is disabled while a row that needs a value has none. On Create the rows are saved as the first view's own filters, and the new view's list shows only the matching notes. Opening the note list's Filter panel on the new view shows the same rows under "This view".

Prefactor first, in its own commit: the collection filter panel (`src/lib/features/collection/toolbar/FilterPanel.svelte`) gets a prop `showGlobal?: boolean`, default `true`. With `false` it renders neither the "All views" collapsible nor the `Separator` under it. Its two current uses (`CollectionView.svelte` and `RailNoteList.svelte`) pass nothing and keep showing it. The dialog passes `showGlobal={false}`, empty `globalFilters` and a no-op `onGlobalFiltersChange`.

`createView` gains an optional filters argument:

```ts
createView(name: string, filters?: CollectionFilter | string): Promise<string> // filters land in views[0].filters; omitted when undefined
```

The filters go into the YAML through Issue 17's builder, which gains the same optional argument: `buildNewViewYaml(name, filters?)` puts them on `views[0].filters` of the object it serializes. No template-string filter line (filter expressions carry quotes, as in `_type == "Project"`), and not through `updateCollectionYaml`: `type-definitions.service.test.ts` mocks `yaml-parser.js` down to a bare `updateCollectionYaml: vi.fn()`. The dialog builds the filters from its groups with `filterGroupsToFilter` (`toolbar/filter.logic.ts`).

**Blocked by:** 17

**Status:** resolved

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`, plus the rail-shell E2E spec via `bash scripts/e2e.sh`.

- [x] Filter panel with `showGlobal={false}` renders only "This view" (no "All views" text, no separator), and add, edit, remove and conjunction change still report through `onViewFiltersChange`; by default it still renders both sections (component test; the panel's first direct test)
- [x] Dialog: starts with no rows, and after adding rows and cancelling, reopening shows no rows; the field list is exactly `getAllKnownProperties(collectionStore.propertyIndex)` (the `file.*` fields, then the index keys), with the index seeded through the real collection store; a row's operators follow the field's inferred type; in jsdom, clicking the field, operator or conjunction trigger neither calls `createView` nor unmounts the dialog (component test). Whether the portaled menus work inside the real focus trap is proven by the E2E
- [x] Dialog: Create is disabled, with a message, while any row whose operator takes a value has a blank value (empty after trim); unary rows (`is_empty`, `is_not_empty`, `is_true`, `is_false`) never block it; Enter on the name input does not create while Create is disabled (component test against the real filter logic)
- [x] Dialog submit passes `filterGroupsToFilter(groups)`: one positive row as a single expression; several rows, or a "None" group, as an `and` / `or` / `not` object; no rows pass `undefined` (component test, real filter logic, service mocked)
- [x] Builder: `buildNewViewYaml(name, filters)` parsed with `parseCollectionYaml` and seeded with `seedToolbarStateFromDefinition(definition, definition.views[0])` (`type-note-list.logic.ts`, what the note list's Filter panel loads) gives the same rows under `viewFilters` and none under `globalFilters`, for a single expression with double quotes (`_type == "Project"`) and for an `and` object of two rows; with `filters` undefined the output has no `filters` key anywhere (logic test, real parser and real filter logic)
- [x] Service: given filters, `createView` passes `createFile` content whose first view holds them, read back with the `yaml` package's `parse` and `parseFilterToGroups` (both real; `yaml-parser.js` is mocked in this file) to the same conjunction and the same expression per row, including a filter string with double quotes; a one-row "Any" group reads back as "All" (one expression either way) and row ids are ignored (service test, real stores)
- [x] E2E (extends Issue 17's happy path): in the dialog, click Add filter, open the field menu, pick `_type`, open the operator menu, pick `is`, type `Project`; the dialog stays open with the row updated; Escape with a menu open closes only the menu; Create; the note list shows exactly the two non-archived Project notes (Alpha and Beta), not the archived one (`Shelved`) and not the system-folder template; the saved `.view` (spec's `savedFile` helper) holds the filter under its first view
- [x] Help: `help/documentation/25-types-and-relationships.md`, "### Creating a View" (as rewritten by Issue 17): the dialog's filter section is described, including that dialog-made views store their filters under the first view (shown under "This view"), unlike the page's examples, which use top-level `filters:`, and that the filters can be changed later from the note list's Filter panel ("### Inline Filter and Sort Toolbar")

## Notes

- **Owner decisions (2026-11-04):** the dialog starts with no rows (not Tolaria's prefilled row); filters are written to `views[0].filters`, not top-level `filters`; icon and color stay out of the dialog (the row menu's Change icon covers them).
- **Main-session decisions:** a blank value blocks Create rather than being dropped on save (easier to explain); "blank" means empty after trim, and a non-blank value is saved as typed; the field list is the same one the note list's Filter panel shows, including the keys only `.view` files have (`views`, `filters`, `_sidebar_label`, ...), for parity; excluding them is a separate change for both. Enter submits only from the name input; the filter value inputs have no Enter handling.
- **Out (no equivalent here):** nested groups, Tolaria's `any_of` / `none_of`, the regex toggle, and Tolaria's `title` / `status` / `body` built-ins (`file.name` is the closest to title; `status` is an ordinary property).
- **Index not ready:** until the property index is loaded after vault open, or if loading it failed, the dialog offers only the `file.*` fields. No handling needed.
- **Pre-existing, filed separately:** date "is" never matches on `file.ctime` / `file.mtime` (Issue 03); the dialog exposes it the same way the toolbar does.
- **Dialog plus menus:** no dialog in the app hosts a dropdown menu yet, and jsdom cannot show whether the portaled menus work inside the dialog's focus trap; that is why the E2E drives the menus.
- **E2E fixtures:** Alpha and Beta carry only `_type: Project`; "active" in older wording meant not archived. Do not add a `status` to the fixtures.
- **Issue 19** reuses this dialog for Edit view and sets `showGlobal` per view; keep the prop, not a dialog-only fork of the panel.
- **Help overlap:** Issue 26 re-reads the same help page after the delivery.
- **Size:** M.
- **Type scale (typography-hierarchy, done 2026-11-04):** the chrome uses the text-role tokens in `src/app.css` (`text-label` 11px, `text-meta` 12px, `text-row` 14px, `text-title` 15px semibold, and the `section-label` utility for section headers, sentence case). New or changed UI in this Issue uses those roles, never `text-[Npx]`; line numbers traced above in files that delivery touched may have moved, so trust the code over the citation.

## Comments

- 2026-11-04, branch `issue/18-new-view-dialog-takes-filters`: the New view dialog takes filters (This-view-only Filter panel, Create gated on blank values, filters saved under the first view). Review round 1 APPROVED with two nits, both fixed (shared `isUnaryOperator` in `filter.logic.ts`; failed-create alert back under the name input); round 2 APPROVED, no findings. Tests: pnpm check 0 errors; full suite exit=0, 474 files, 11151 passed, build OK.
