# 131: Section layout and live Filters preview

**Origin:** `view-editor` Issue 03, moved here on 2026-11-08. Its PRD, raw evidence and closed siblings stay in `.scratch/view-editor/`. Bare Issue numbers in the text below use that feature's numbering; `priority-2026-11-08.md` in this folder maps them to the numbers here.

**What to build:** the stacked layout and a preview that shows, while the user edits, what the view will list.

**Layout** (`ViewDialog.svelte`):
- Name on top, then collapsible sections (`src/lib/components/ui/collapsible/`). Only Filters exists in this Issue; 05 to 07 add theirs. Each section header shows a one-line summary when collapsed.
- The dialog widens (`sm:max-w-lg` today, `ViewDialog.svelte:169`) as needed for the sections.
- A visible "Name" label with `aria-describedby` on its message; Enter submits only when not `e.isComposing` (IME).
- Closing with touched fields asks to discard them. Today every close resets the form silently (`:102-116`).

**Filters section:**
- `FilterPanel` as today. "All views" shows when the file has root filters, else behind a "+ All views" toggle (PRD default D7). New view can add them too: `createView` writes them as the root `filters`.
- `availableProperties = combineAvailableProperties(propertyIndex, definition.formulas ?? {})` (`type-note-list.logic.ts:105-112`), so `formula.x` is offered as it is in the rail.
- One help line: "Inline blocks run the first view, with the filters as written."

**Preview** (under the filter rows):
- Add an optional `listSort` argument to `queryViewLens` and `viewRowSet` (`src/lib/features/rail-shell/lens.logic.ts:704-721`, `:785-808`) that replaces `getViewSort(viewEntry)`. Callers that omit it keep today's order.
- Run `queryViewLens` on a draft definition: the loaded definition with the draft filters, and `limit` removed from the edited view. The dialog applies the limit itself, so one run gives both counts ("N notes", or "N of M notes" once 05 adds a limit).
- Show the count, the rule in words (`describeViewFilters`), and the first 20 titles, read-only.
- Do not reuse `countViewNotes`: it re-reads the file from disk (`view-lens.service.ts:22-33`).
- Build the `LensContext` from the real stores as `TypesNavigator.svelte:96-105` does (entries, vault path, system folder, type map). Do not edit `TypesNavigator.svelte` or `RailNoteList.svelte` here: 04 owns those.
- New view: definition `{ views: [{ type: 'table', name }] }`, no path, `listSort: 'title'` (the preset of PRD default D6).
- Schedule in an `$effect` with `untrack` (CLAUDE.md rule 2), debounced 300 ms, dropping a stale run by a sequence number as `loadSeq` does. Re-run on draft changes and when the property index or entries are replaced.
- States: "Loading..." until `collectionStore.isIndexReady` and `viewEntriesLoaded(...)`; "Finish the filter to see matches" while a row's value is blank (skip the run); the `filterError` text when the query reports one.
- Next to the count, the number of notes that could not be evaluated ("1 note could not be evaluated"), which `view-engine-fixes/02` adds to the query result.
- Save is blocked while `filterError` is set and the filters were touched (PRD default D10).
- Collapsed summary: "N notes" or "Filter error".

**Blocked by:** 011

**Status:** ready-for-agent

**Gate:** frontend: `pnpm check` + `pnpm vitest run`.

- [ ] Failing tests first:
  - `src/tests/lib/features/rail-shell/lens.logic.test.ts`: `listSort: 'title'` orders rows by title; omitting it keeps today's order (existing tests unchanged).
  - `src/tests/lib/features/type-definitions/ViewDialog.svelte.test.ts`, with the real `collectionStore.propertyIndex` and real entries seeded (use fake timers for the debounce):
    - The rendered preview reads "3 notes", then "1 note" after a filter row is edited.
    - A row with a blank value renders "Finish the filter to see matches".
    - An unparseable expression renders the error text and disables Save.
    - A filter calling an unknown method renders its error and disables Save; `status.lower() == 'a'` over records where one `status` is a number renders "1 note could not be evaluated".
    - A `formula.x` option is listed for a file with that formula.
    - Closing with a touched field renders the discard prompt; Cancel on it keeps the draft.
    - "+ All views" adds the section, and Create passes root filters to `createView`.
- [ ] `help/documentation/25-types-and-relationships.md` § Creating a View and the Edit view item describe the sections and the preview.

## Notes

- **Run after (other feature):** view-engine-fixes 02, which adds the per-note failure count and the unknown-method error to `queryViewLens`. relay-lite does not enforce this.
- Cost: one in-memory query per debounce, the work of one navigator count without the disk read. Not measured on the owner's vault: check it in the app and report the time in the Comments.
- **Size:** M.
