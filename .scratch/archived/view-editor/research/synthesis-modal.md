# Synthesis: the view dialog, PRD refutation and spec

## 1. Refutation of `.scratch/view-editor/PRD.md`

**R1. "Save writes everything the dialog shows" (PRD:13). Wrong and unsafe, separately from the conflict check the owner declined.**
- An unchanged Save already changes files today, because the dialog always sends `viewFilters` (`ViewDialog.svelte:145-149`):
  - Every untouched filter goes through the lossy panel round trip. `date('X')` becomes `'X'`, `> '10'` becomes `> 10`, `{and: []}` becomes JSON text, and `or: []` is dropped (V02-2, V03 L1/L2/H1). The rail already runs the round-tripped filter, but inline blocks run the raw value (`collection-block-widget.ts:110,123`). So writing the round trip back changes what a block over `views[0]` shows.
  - `edited.name = edit.label` runs every time (`yaml-parser.ts:318`), and the label comes from the row (`TypesNavigator.svelte:150`), which falls back to the file name (`type-sidebar.logic.ts:337-340`). An unchanged Save on New table's `Untitled.view` therefore renames its view `All` to `Untitled`.
  - `stringifyYaml` runs with no guard for an unchanged edit (`yaml-parser.ts:329`), so comments go on every Save.
- Writing every field "as loaded" in canonical spelling would rename every alias (`icon:` to `_icon:`) and rewrite every section, so all these losses get worse as fields are added.
- The PRD contradicts itself. PRD:15 says an ignored value "is left as it is unless the user edits that field". That rule needs to know which fields were touched, which is the opposite of "writes everything".
- **Fix:** track touched fields and save a patch. Each field compares its draft with its loaded value, and Save writes only fields that differ. An empty patch writes nothing; `rewriteViewFile` already skips identical bytes (`type-definitions.service.ts:389-390`). This is not a conflict check, so it stays within what the owner decided, and it shrinks the clobber window to the fields the user touched.

**R2. The ignored-value rule (PRD:15) is incomplete.**
- `RESERVED_KEY_RULES` checks only the kind of value, and only for 7 keys (`type-sidebar.logic.ts:408-424`). `_rail: false` and `_group: "  "` pass that check, yet the readers treat both as not set (`lens.logic.ts:222`, `type-sidebar.logic.ts:368-372`).
- No rule covers `_sidebar_label`, `_icon`, `_color`, `_title_color` or `_list_properties_display`. An unquoted `_sidebar_label: 2024` is ignored with no note (`:337-340`, DOC25:405).
- For a `_rail_view` that names no view, the note needs the parse (`railViewNameNote`, `:437-441`).
- **Fix:** each field gets three states: absent, effective, or ignored. The state comes from the reader functions (`getViewOrder`, `getViewSort`, `getViewVisible`, `getViewGroup`, `getViewOpensInEditor`, `getViewLabel`, `getViewListProperties`, `railViewIndex`), not from `RESERVED_KEY_RULES`. Use `ignoredKeyNotes` only for its wording. Keys without a rule get a note local to the dialog, with no new navigator mark.

**R3. The alias rule (PRD:17) is right in substance but has gaps.**
- The TS mirror `canonicalizeKey` exists (`src/lib/utils/frontmatter-aliases.ts:6-31`) and matches Rust (`aliases.rs:9-28`).
- Root `sort` and `order` fold onto `_sort` and `_order`. A list at the root (a query sort or a column order written in the wrong place) therefore reads as an ignored `_sort` or `_order`, and Save must not delete it unless the user edits that field.
- Drop an alias only when its field is written. Never sweep aliases on Save.
- The TS and Rust values can differ: `_order: 0x1F` is 31 in TS and a string in Rust (V01). The dialog would show 31 while the menu ignores it. Accept this and name it under "not verified".

**R4. The name rule (PRD:19) is contradicted by the code and leaves things out.**
- The code always renames `views[idx].name` (`yaml-parser.ts:318`). The tests at `yaml-parser.test.ts:988` and `:1093` assert this and must change (V10-M4).
- Once the dialog never renames views in a multi-view file, the `_rail_view` sync (`:319`) and the in-file duplicate guard (`:308`) are only needed for the one-view case.
- With one view, "today's rule" also overwrites a deliberate tab name such as New table's `All` (`collection.service.ts:18-23`). Proposal: sync `views[0].name` only when it equalled the old effective label (owner decision D3).
- The prefill label comes from the index row, which can lag 2 to 10 s (`TypesNavigator.svelte:150`). Read it from the loaded bytes instead.
- After Duplicate, two files share one label. The check against other labels is case-insensitive (`type-definitions.logic.ts:185-196`), so the duplicate opens with Save disabled (V06-M2). Validate the name only when it is touched or the view is new (D9).

**R5. The `_rail_view` selector (PRD:19) is underspecified.**
- The first match wins (`yaml-parser.ts:131-144`). A second view with the same name cannot be picked, so the selector must show it disabled with a reason.
- A stale `_rail_view` runs `views[0]` (`:142-144`). The selector shows the note and keeps the value until the user picks a view.
- The PRD says nothing about what happens when the user switches views after editing the old view's filters, sort or limit. See D5.
- The collection editor and inline blocks never read `_rail_view` (`yaml-parser.ts:136-141`, `collection-block-widget.ts:110`). The selector needs a one-line hint that it changes only the rail.

**R6. The live preview (PRD:5, 11) has no defined mechanics.**
- Do not reuse `countViewNotes`: it re-reads the file from disk (`view-lens.service.ts:33`).
- `queryViewLens` reads `limit` from `definition.views` and `_sort` from `ctx.entries` (`lens.logic.ts:711-714,792-797`). A draft `limit` must be put into a draft definition, and a draft `_sort` needs an override parameter (V05-M6).
- New view has no entry, so its preview sorts by `modified`, while `buildNewViewYaml` writes `_sort: title` (`type-sidebar.logic.ts:353`).
- The summary "23 notes" is counted after `limit` (`lens.logic.ts:720`). See section 3.2.

**R7. Missing: hidden views.**
- Edit view exists only on a visible Types row (`TypesNavigator.svelte:147-152,312`).
- Behavior can set `_visible: false`, which removes the dialog's own entry point. Every New table file is already outside it (`collection.service.ts:18-21`).
- An entry point is required before Behavior ships (D4, V06-M1 rated High).

**R8. "Never write a default" (PRD:14) clashes with New view.** `buildNewViewYaml` writes `_sort: title`, which is not the reader's default (`type-sidebar.logic.ts:353`, `:462-465`). Treat it as a New-view preset, shown as set (D6).

**R9. Comments (PRD:21) are not a given.**
- V01 ran the repo's `yaml` 2.9.1 and found that `parseDocument` with `setIn` and `toString({lineWidth: 0})` keeps head and inline comments.
- ADR-0029:74 says comments are not kept "with our options". That claim is about the frontmatter path and was not re-run here.
- A Document-based patch writer would also keep key order and untouched bytes (D2).

**R10. The PRD's order (PRD:25) is missing a foundation step.**
- Tasks 02 to 04 each extend `updateViewEditYaml`. Without a shared draft and patch model, each one would reinvent the state for absent, ignored and touched fields.
- Put the model in a new pure `.logic.ts` file in task 01.
- `type-definitions.service.ts` has met its hotspot trigger (V10-F4, `HOTSPOTS.md:40`, not re-run). Keep its changes to signatures.

**R11. The PRD leaves out formula properties.** Formulas are out of scope for editing (PRD:9), but filters and sorts can reference `formula.X`. The dialog uses `getAllKnownProperties` (`ViewDialog.svelte:58`) where the rail uses `combineAvailableProperties` (`type-note-list.logic.ts:105-112`).

**R12. The prefill and the write base differ.**
- The dialog prefills from disk (`ViewDialog.svelte:83`), but the write base is a dirty tab's buffer (`type-definitions.service.ts:388`).
- A cheap fix that adds no conflict check: load from the same base. Add `readViewBase(path)`, which returns a dirty tab's content, else the disk bytes.

**R13. One bad entry blocks the whole dialog.** The parse stops at the first invalid view (`yaml-parser.ts:39-95`), and `loadError` disables Save (`ViewDialog.svelte:65,92-95`). When the raw YAML parses but the collection check fails, the menu sections could stay editable (D8).

## 2. Architecture shared by every section (task 01)

**New pure module `src/lib/features/type-definitions/view-dialog.logic.ts`**, with no framework imports:
- `readViewDialogDraft(raw, definition | null, fileName)` returns per-field `Field<T> = { state: 'absent' | 'set' | 'ignored'; value: T | null; note?: string }`.
  - Root keys are folded with `canonicalizeKey` in file order, the last one winning as in Rust.
  - Each field's state comes from its reader, applied to a frontmatter-shaped record built from the folded raw values.
- `buildViewDialogPatch(loaded, draft)` keeps only fields whose canonical value changed.
  - Filters are compared with `canonicalToolbarValue` (`type-note-list.logic.ts:153-156`).
  - Sort lists are compared as sorted JSON.
- `applyViewDialogPatch(yaml, patch, viewIndex)` parses once, applies the patch and stringifies once with `lineWidth: 0`. It returns the input when the patch is empty, and `{ok:false}` on a parse failure, as `updateViewEditYaml` does (`yaml-parser.ts:286-310`).
  - A set writes the canonical key and deletes its aliases.
  - A clear deletes both the canonical key and its aliases.
  - Untouched fields are not written.
- This replaces `ViewEdit` and `updateViewEditYaml`. Keep `updateViewEditYaml` as a thin wrapper only if other callers exist; a grep found `editView` as its only caller in `src/lib`.

**Service** (`type-definitions.service.ts`):
- `editView(path, patch)` keeps `promptIndexRefresh` (`:541-549`), because the label, group, order, visibility and pin are read from the index snapshot.
- `createView(name, filters, folder)` gains an optional patch for New view (`:271-279`).
- New `readViewBase(path)`, using `findViewTab` and `isTabDirty`, as in `:387-388`.

**Load:**
- Read the base and `parseYaml` it into raw.
- `parseCollectionYaml` gives the definition. On failure, show the message and keep only the menu sections enabled, if D8 is accepted.
- Duplicate keys throw at the YAML level (V01 ran it). Say so in the load error.

## 3. Section spec

### 3.1 Name

| | |
|---|---|
| Key | `_sidebar_label`, aliases `sidebar_label` and `sidebar label` (`aliases.rs:19-20`) |
| Control | the existing `Input`; add a visible label "Name" and `aria-describedby` (V02-14) |
| Read | the effective label from `getViewLabel` (a non-empty string, else the file name). A non-string value shows the file name, with the note "Ignored _sidebar_label: expected text, got 2024" |
| Validate | `validateViewName(name, existingLabels, isNew)` (`type-definitions.logic.ts:187-196`), only when touched or for New view. A whitespace-only name is refused, because the check trims first |
| Write | the trimmed `_sidebar_label`, aliases dropped. One view: `views[0].name` also changes when it equalled the old label (D3). Several views: no view name changes and no `_rail_view` sync |
| Enter | keep submit, but skip while `e.isComposing` (IME, V02-14) |

### 3.2 Filters and live preview

| | |
|---|---|
| Keys | the root `filters` ("All views") and `views[idx].filters` ("This view"), where `idx` is the current `_rail_view` pick |
| Control | `FilterPanel` (`toolbar/FilterPanel.svelte`), unchanged. `availableProperties = combineAvailableProperties(propertyIndex, definition.formulas ?? {})` |
| Read | `parseFilterToGroups`, as today (`ViewDialog.svelte:96-98`). "All views" shows only when root filters exist (D7) |
| Touched | a group draft differs from the loaded value under `canonicalToolbarValue`, so adding a row and removing it again counts as untouched |
| Validate | blank values block Save, as today (`:60-65`). Save is also blocked when the preview reports `filterError` and the filters were touched: that filter would lock the rail toolbar (V05-M1, `RNL:193,860`). Raw rows keep their inline `rawError` (`FilterRow.svelte:43-45`), and the preview's `filterError` now blocks them too |
| Write | `filterGroupsToFilter(groups)`; empty groups delete the key, as `yaml-parser.ts:320-327` does. Untouched filters write nothing (R1) |
| Help text | one line: "Inline collection blocks run the first view and the filters as written in the file" |

**Preview mechanics:**
- Call `queryViewLens(draftDef, { globalFilters, viewFilters, sort: draftViewSort }, collectionStore.propertyIndex, path ?? '', ctx, { listSort: draftSortOrNull })`.
  - `draftDef` copies the definition with `views[idx] = { ...view, limit: undefined }`. The dialog slices to the draft limit itself, so one run gives both the count before the limit and the count after it.
  - The new optional `listSort` argument goes through to `viewRowSet`, which uses it in place of `getViewSort(viewEntry)` (`lens.logic.ts:714`).
  - `ctx` is the `LensContext` the rail builds (`RailNoteList.svelte:126`, `TypesNavigator.svelte:98`). Extract a shared builder, or pass the entries, vault path and system folder.
- Output:
  - "N notes", or "N of M notes (limit)" when the limit cuts the list.
  - The first 20 titles, read-only.
  - `filterError` shows as the error line.
  - With a blank value, show "Finish the filter to see matches" and skip the run. Today an incomplete row becomes `file.name == ''` and matches nothing (V03-M6).
  - Caveat line: a misspelled method gives 0 rows with no error (V08 refuted item, `collection.logic.ts:356-358`).
- Scheduling:
  - A 300 ms debounce in an `$effect` with `untrack` (CLAUDE.md rule 2), dropping stale results with a sequence number as `loadSeq` does.
  - Re-run on any draft change and on `propertyIndex` or entries changes. Both are replaced on every save (`collection.store.svelte.ts:41-44`), and the debounce absorbs that.
  - Show "Loading..." until the index is ready.
- Cost: one in-memory run per debounce, the same work as one navigator count without the disk read. Filter evaluation is O(N) over the property index, plus O(N) entry scans in `viewRowSet` (`lens.logic.ts:711-712`), plus the sort. No disk I/O. Not measured.
- New view uses the same call with `definition = { views: [{ type: 'table', name }] }`, no path and `listSort: 'title'`.
- Collapsed summary: "N notes" (after the limit), or "Filter error".

### 3.3 Sort and limit

| Field | Key | Control | Read and not set | Write |
|---|---|---|---|---|
| View sort | `views[idx].sort` | `SortPanel` (`toolbar/SortPanel.svelte`; props `sorts`, `availableProperties`, `propertyConfigs = definition.properties ?? {}`, `propertyIndex`, `onSortsChange`) | empty means not set | the list with uppercase `ASC`/`DESC`; empty deletes it (`yaml-parser.ts:209-215`) |
| List order | `_sort`, alias root `sort` | `Select`: "Default (modified, newest first)" (not set) plus the `VIEW_SORTS` values (`type-sidebar.logic.ts:395`), with the labels from `effectiveViewSortLabel` | `getViewSort`. A wrong value, or a root `sort:` list, shows the default with the ignored note | the value; "Default" deletes `_sort` and `sort` |
| Limit | `views[idx].limit` | number `Input`; empty means not set | a finite integer of at least 1 is effective. `.nan` and `.inf` count as ignored (the reader applies no limit or returns every row, `lens.logic.ts:720`). `2.5` shows with "acts as 2" | an integer from 1 up, required when touched; empty deletes the key |

- Interplay: when the view sort is not empty, disable the List order select with the note "The view's sort wins; _sort and _order pins apply only without it" (`type-note-list.logic.ts:96-98`).
- Note on DESC: notes with no value come first (`collection-logic.test.ts:640-659`). Show this as info only; changing it is out of scope.
- Collapsed summary: `title, max 50`, or `sort: due ↓, max 50`.

### 3.4 Display

| Field | Key | Control | Read | Write |
|---|---|---|---|---|
| Icon and colors | `_icon`, `_color`, `_title_color` (aliases `icon`, `color`, `title_color`) | a button that opens `IconPicker` (`file-icons/IconPicker.svelte`; `open`, `currentPack/Name/Color/TextColor`, `onSelect`, `onColorsChange`, `onRemove`, `onClose`) and stores the result in the draft without writing it | `extractViewIcon(yaml)`. A rejected `_icon` shows "not recognised; the default icon shows" (`icon-resolver.ts:48-53`) | the same key rules as `updateViewIconYaml` (`type-sidebar.logic.ts:520-543`). Remove deletes all three keys and their aliases. The draft blocks a color without an icon; title color works alone |
| Group | `_group` (no alias) | `Input` with a datalist of the groups already in use (from the `viewNavigatorRows` groups) | `getViewGroup`: trimmed, blank means not set | trimmed; blank deletes the key |
| Position | `_order`, alias root `order` | number `Input` | `getViewOrder`: only a number counts. `"1"` or a root list is ignored | a finite number; empty deletes `_order` and `order`. Help text: "Position in Views and among rail pins; not the order of the notes" (V04) |
| Row properties | `_list_properties_display` (alias) | `RailPropertiesPicker` (`available`, `selected`, `onChange`) | `getViewListProperties` | a list; empty deletes it, alias dropped, as in `:622-635` |

- Row properties `available`: frontmatter keys from the property-index records of the preview rows. Pills render only `note.frontmatter[key]` (`NoteRow.svelte:100`), so leave out `file.*` and `formula.*`.
- Collapsed summary: `rocket, Work`.

### 3.5 Behavior

| Field | Key | Control | Read | Write |
|---|---|---|---|---|
| Show in Views | `_visible` (alias `visible`) | checkbox | only the boolean `false` hides (`:378-380`). `"false"` shows as visible with the ignored note | checked deletes `_visible` and `visible`; unchecked writes `false`. Hiding also shows a warning about the entry point (D4) |
| Pin to rail | `_rail` | checkbox | only the boolean `true` pins (`lens.logic.ts:222`) | checked writes `true`; unchecked deletes it, as `updateViewRailYaml` does |
| Click opens the editor | `_open_in_editor` | checkbox | only `true` (`:360-362`) | checked writes `true`; unchecked deletes it |
| Note list runs | `_rail_view` | `Select`, shown with 2 or more views, or when a stale value exists | `railViewIndex` plus `railViewNameNote` | "First view (name)" deletes the key; a view writes its exact `name`. Duplicate names after the first are disabled with "same name as view N" |

- Switching the `Note list runs` pick re-seeds This view's filters, the view sort and the limit from `views[newIdx]` (PRD:19). With touched view fields, see D5.
- Hint: "Only the rail reads this; the editor and inline blocks start on the first view."
- Collapsed summary: `pinned, hidden, opens editor, runs "Board"`.

## 4. New view and Edit view

- **New view:**
  - No load. Every field starts absent except `_sort: title` (D6) and `views[0]` = `{ type: 'table', name }`.
  - `createView` builds the YAML from `buildNewViewYaml`, then applies the patch.
  - The name check runs always, with file-name rules (`validateViewName(..., true)`).
  - The `_rail_view` picker is hidden.
- **Edit view:**
  - Loads from `readViewBase`.
  - Touched-only patch, and the name is validated only when touched.
  - The entry point accepts a path directly, so hidden views and pins can open it (D4). `existingLabels` already includes hidden views (`lens.logic.ts:673-677`).
- **Both:**
  - Closing with touched fields asks to discard them; today every close resets the form (`ViewDialog.svelte:102-116`, V02-11).
  - Keep the `save-failed` case as the single inline message. The editor has already shown a toast (`TypesNavigator.svelte:202`).

## 5. Files and tests per task

- **01** (foundation, sections and Name, Filters and preview):
  - `view-dialog.logic.ts` (new), with tests in `src/tests/lib/features/type-definitions/view-dialog.logic.test.ts`. Cover the absent, set and ignored states per reader, alias folding (last one wins), and the patch: empty patch returns the same bytes, set drops aliases, clear deletes both spellings, untouched keys survive, and filters with a lossy round trip stay unwritten.
  - `yaml-parser.ts`: retire or narrow `updateViewEditYaml`. Update `yaml-parser.test.ts:956-1150`, including the multi-view rename tests at `:988` and `:1093`.
  - `type-definitions.service.ts`: `editView`, `createView`, `readViewBase`. Tests in `edit-view.service.test.ts`, `create-view-folder.service.test.ts` and `rewrite-view-file.service.test.ts`.
  - `lens.logic.ts`: the `listSort` override on `queryViewLens` and `viewRowSet`, with a test that the default stays unchanged.
  - `ViewDialog.svelte` and `ViewDialog.svelte.test.ts`:
    - The three existing describe blocks (`:43`, `:314`, `:559`) need new cases.
    - New cases: an unchanged Save writes nothing; the New table `All` name stays; preview count and limit; blank-value skip; `filterError` blocks Save; formula properties are offered.
  - `TypesNavigator.svelte` and `FilesNavigator.svelte:400`, to pass the path-based entry.
- **02** (Sort and limit): the logic, dialog and preview tests above, plus help docs.
- **03** (Display): wire `IconPicker` and `RailPropertiesPicker` inside the dialog. Nesting a bits-ui dialog in a dialog is not verified, so add a render test.
- **04** (Behavior): the hidden-view entry point (`NoteRowMenu.svelte:78-92,205-268`, or the one D4 picks) and the `_rail_view` select. Test that a stale value is kept and that duplicates are disabled.
- **Docs** in every task: `help/documentation/25-types-and-relationships.md:177` (the Edit view paragraph), `:360`, `:405`, `:418`, `:420` and `:487` (the rename and `_rail_view` sentences).

## 6. Owner decisions

- **D1.** Replace "Save writes everything" with a touched-only patch. Recommended (R1).
- **D2.** Comments: use a Document-based writer (`parseDocument`, `setIn`, `deleteIn`) or accept the loss. V01's run contradicts ADR-0029:74. Prove it with a test before deciding.
- **D3.** One-view file: does the tab `name` follow the label always (the PRD), or only when it equalled the old label?
- **D4.** Where hidden views reach Edit view: the note-list row menu for `.view` files, the collection editor, or a pin context menu (pins have none, `Rail.svelte:138-157`). Should the Behavior section be blocked until that entry exists?
- **D5.** Switching `_rail_view` with touched view fields: block the switch, discard with a warning, or keep a draft per view and write each one.
- **D6.** Keep New view's `_sort: title` preset?
- **D7.** Let "All views" filters be added when the file has none (V10-M5)?
- **D8.** Allow menu-only edits when the YAML parses but a view entry is invalid?
- **D9.** Validate the name only when it is touched (fixes the Duplicate clash)?
- **D10.** Block Save on a preview `filterError`?
- **D11.** Raw expression rows in the panel (`FilterPanel.svelte:73-85`): stay out of scope, or ship as a follow-up?

## 7. Not verified

- The preview's run time on a real vault.
- Whether `IconPicker` and `RailPropertiesPicker` popovers work inside `Dialog.Content`.
- Whether the Document writer keeps comments under the repo's options (ADR-0029:74).
- What the TS parse does with `0x1F` and `inf` against the Rust index in the dialog's displayed values.
- Whether `file-io-audit/32` tracks comment loss. The listing shows `32-app-json-corrupt-overwrite.md`.
- The hotspot count of `type-definitions.service.ts` (`scripts/fix-feat-ratio.mjs` not run).