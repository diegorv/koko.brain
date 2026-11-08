# Scout 10: .view filter engine and filter builder

Scope: `src/lib/features/collection/`, `src/lib/features/type-definitions/ViewDialog.svelte`, `src/lib/features/rail-shell/lens.logic.ts` (row set), Rust `get_all_property_records` and `get_all_tasks_v2`. Read-only. Everything below was read in source this session unless marked "from memory". Line numbers are from the files as they stand on `main` (5f8003d67).

## Facts

### Document model (YAML)

- Root keys: `filters`, `formulas`, `properties`, `views` (non-empty array), `_rail_view`, plus `_sidebar_label` written by the dialog. `parseCollectionYaml` at `src/lib/features/collection/yaml-parser.ts:13`. Required: `views`, each view needs `type` and `name`. Validation covers `sort`, `order`, `limit`, `columnSize` only (`yaml-parser.ts:61-91`). `filters` and `properties` are NOT validated here.
- `CollectionDefinition` / `CollectionViewDef`: `src/lib/features/collection/collection.types.ts:31-74`.
- View types: `VIEW_TYPES = ['table', 'calendar', 'linear-calendar']` (`yaml-parser.ts:333`). Anything else is rejected.
- Sort alias: `property` is accepted as `column` (`yaml-parser.ts:70-73`). Direction must be `ASC` or `DESC`.
- `groupBy` and `summaries` are typed `unknown` and "Ignored in v1" (`collection.types.ts:47-49`). Grep for `groupBy` in `src/lib/features/collection` and `rail-shell` finds only that line, so grouping is not implemented.
- Calendar fields: `dateProperty`, `endDateProperty`, `weekStartDay`, `colorProperty` (`collection.types.ts:51-57`).
- Filter shape `CollectionFilter = { and?, or?, not? }`, each a list of `FilterItem = CollectionFilter | string` (`collection.types.ts:3-14`). A filter may also be a single string.
- Which root and view filters are combined: global `filters` AND view `filters` (`collection.logic.ts:161-170`).
- Within one object, the `and`, `or` and `not` keys are ANDed (`evaluateFilter`, `collection.logic.ts:317-341`). `and` = every item, `or` = some item, `not` = no item true.
- Multi-view and rail selection: `railViewIndex` picks the view named by `_rail_view`, else index 0 (`yaml-parser.ts:142-144`).
- YAML rewriting: `updateCollectionYaml` (`yaml-parser.ts:175`), `updateViewEditYaml` (`yaml-parser.ts:286`), `addView`, `removeView`, `renameView`, `setViewType`. All re-serialize the whole document with `stringifyYaml`, so comments and formatting are lost (`yaml-parser.ts:328-329` says so for the dialog path).

### Expression language

- Tokenizer and parser: `expression/tokenizer.ts`, `expression/parser.ts:8` (`parse`). AST node types in `expression/expression.types.ts`. Node kinds seen in `collection.logic.ts:282-311`: identifier, member, call, methodCall, binary, unary, array, number, string, boolean.
- Evaluator: `expression/evaluator.ts`, `evaluate` at `:38`.
- Plain functions (validated, `evaluator.ts:294-298`): `if, now, today, date, number, contains, startsWith, endsWith, isEmpty, max, min, list, duration, link, image, icon, html, badge, progress, color, escapeHTML`.
- `file.*` methods (`evaluator.ts:565-586`): `file.hasTag(...)` (variadic, matches the merged frontmatter and inline `tags`), `file.inFolder(p)` (prefix, case-insensitive), `file.hasProperty(name)`, `file.asLink(display?)`. Default branch throws `Unknown file method`.
- Fields: `file.name, basename, path, folder, ext, size, ctime, mtime` (`evaluator.ts:194-205`), `note.X` / `property.X` / bare `X` for frontmatter, `formula.X` for formulas. Alias `type` resolves to `_type` (`evaluator.ts:98-100`, `:102-118`).
- Method registry (`expression/methods.logic.ts:62-227`): `string` (lower, title, trim, replace, split, slice, matches), `number` (abs, round, ceil, floor, toFixed), `date` (format, relative, date, time), `list` (contains, sort, unique, join, flat, slice), `object` (keys, values, isEmpty), `any` (contains, startsWith, endsWith, isEmpty, isTruthy, isType, toString).
- Date literals: `date('YYYY-MM-DD')` is day precision (`evaluator.ts:644-653`, `:368-377`). Date + duration string arithmetic exists (`evaluator.ts:245-251`).
- Formulas: `definition.formulas` map of name to expression, precomputed per record before sort (`collection.logic.ts:147-190`). Formula errors store `null` silently (`collection.logic.ts:183-187`). Circular formula refs throw (`evaluator.ts:219`).

### Execution pipeline

`executeQuery` at `src/lib/features/collection/collection.logic.ts:128-218`:
1. Pre-validate global and view filters (`findFilterError`, `:138-141`). A failing filter returns `filterError` with empty records, before any record is read.
2. Collect all `PropertyIndexRecord`s from the index.
3. Filter: global AND view (`:161-170`), with a shared parse cache (`evaluateFilterCached`, `:347-375`).
4. Formulas: clone records, then set `formula.*` (`:173-190`).
5. Sort by `view.sort` in order; nulls sort last; dates before non-dates (`compareForSort`, `:427-446`).
6. Limit. A `rowSet` callback replaces this step when given (`:207-212`).
7. Columns: `view.order`, else keys inferred from records (`resolveColumns`, `:449-478`).

Validation (`findItemError`, `:232-250`) checks each string with `validateExpression`, which checks only plain function names. It does not check `file.*` methods or `methodCall` names (`evaluator.ts:303` says so). Runtime evaluation errors are caught and turn the record into `false` (`collection.logic.ts:320-324` and `:351-355`), so a misspelt `file.hasTga("x")` silently matches nothing.

### Record model (the row unit)

- `PropertyIndexRecord` (`collection.types.ts:77-96`): one per NOTE, keyed by absolute path. Fields `path, name, basename, folder, ext, mtime, ctime, size, properties: Map`.
- `buildNoteRecord` (`collection.logic.ts:22-43`) parses frontmatter and projects derived keys (`projectDerivedProperties`, `:53-77`): `_type` casing, `organized` (default true), `archived` and `favorite` (default false), `tags` (frontmatter plus inline, via `extractAllTags`), and `_belongs_to`, `_related_to`, `_has_many` as wikilink target arrays. The comment says this must match Rust `project_note_record` (`src-tauri/src/commands/vault.rs`), pinned by `src-tauri/tests/fixtures/note-record-projection.json`.
- Source of the index: `buildPropertyIndex` calls `get_all_property_records` (`src/lib/features/collection/collection.service.ts:90-107`). Rust returns `Vec<NoteRecord>` built from `idx.entries()` (`src-tauri/src/commands/vault.rs:895-906`). Notes only. Incremental patches arrive by path (`applyPropertyDelta`, `collection.service.ts:132`).
- Views (`.view` files) stay in the index but are excluded from property and type inference (`filter.logic.ts:218-238` and `:260-262`, via `isViewFile`).

### Row set (who is listed, in what order)

- `viewRowSet` (`src/lib/features/rail-shell/lens.logic.ts:704-721`) is the single owner for `.view` rows, used by the editor (through `ViewRowSetPort`, `src/lib/features/collection/view-row-set.port.ts:13-46`), the rail, and the navigator count. It drops: system-folder notes, type definitions, `.view` files, and archived notes unless the filters cite `archived` (`filterCitesArchived`, `collection.logic.ts:266-312`). It also drops records with no `NoteEntry` (`:711-719`). Then it orders by the view's sort or `_sort`, with `_order` pins, then applies `limit`.
- `blockRowSet` (`lens.logic.ts:736-750`) is the same rule for inline ` ```collection ` blocks, read from records alone.
- Default exclusion of archived is hidden policy: it appears only as the suffix ", not archived" in `describeViewFilters` (`lens.logic.ts:853-863`).
- Fixed lenses that use the same notion of "not archived" are at `lens.logic.ts:305-310` (Inbox = not organized and not archived; Favorites = favorite and not archived; Archive = archived).

### Filter-builder model (visual layer)

- Row type `FilterRow { id, property, operator, value: string, raw?, item? }` (`src/lib/features/collection/toolbar/toolbar.types.ts:66-84`). `raw` is a free expression. `item` keeps a nested object as written when the row's text is unchanged.
- Groups: `FilterGroup { conjunction: 'and'|'or'|'not', rows }` (`toolbar.types.ts:87-92`). Labels: "All the following are true", "Any of the following are true", "None of the following are true" (`toolbar.types.ts:59-63`).
- Operators (`toolbar.types.ts:4-29`): text (is, is_not, contains, does_not_contain, starts_with, ends_with), number (eq, neq, gt, lt, gte, lte), date (is, before, after, on_or_before, on_or_after), boolean (is_true, is_false), universal (is_empty, is_not_empty). Per-type operator lists in `getOperatorsForType` (`filter.logic.ts:182-195`).
- Type inference: `inferPropertyType` (`filter.logic.ts:244-277`) takes the FIRST record with a non-null value for the property. A `YYYY-MM-DD` prefix means date, any other string means text. Map iteration order decides which note counts.
- Expression to row (`parseExpressionToRow`, `filter.logic.ts:22-31`) and row to expression (`filterRowToExpression`, `:38-88`). Round-trip is designed to be a fixed point. `quoteUnlessNumber` (`:544-546`) avoids identifier corruption. Rows that do not map to a simple shape keep `raw` (fallback).
- Groups to filter (`filterGroupsToFilter`, `filter.logic.ts:146-177`): blank raw rows are dropped; one non-`not` row becomes a plain string; otherwise `and`, `or`, `not` lists.
- Nested objects load as a `raw` text row that keeps the object (`itemToRow`, `filter.logic.ts:295-309`). Null or malformed items show as JSON text (`jsonRow`, `:312-314`).
- `FilterPanel.svelte` (216 lines): two collapsible sections, "All views" (top-level `filters`) and "This view" (view `filters`), each a list of groups. Props at `:23-38`. "Add filter" appends to the first group (`addFilter`, `:73-85`). Conjunction dropdown per group.
- `FilterRow.svelte` (188 lines): property dropdown grouped File / Note / Formula (`:113-152`, `propertyGroups` `:54-68`), operator dropdown (`:155-171`), plain text value input (`:174-181`, no date picker, no number validation), raw expression input with live `validateExpression` error (`:89-108`, `rawError` `:43-46`).
- Property list: `getAllKnownProperties` (`filter.logic.ts:223-238`) = `file.*` followed by sorted frontmatter keys seen in the index. Flat, no search.
- `ViewDialog.svelte` (221 lines): one dialog for New view and Edit view. Name field plus `FilterPanel` (`:202`). Edit loads a fresh read (`load`, `:74`), prefills `groups` from `railViewIndex` filters and `globalGroups` from top-level filters (`:74-116`), shows "All views" only when top-level filters exist (`showGlobal`, `:50`). Blocks Save while a non-unary row has an empty value (`blankValue`, `:53-60`, `blocked`, `:65`). Submit path: `createView` (`type-definitions.service.ts:271`) or `editView` (`:541`). No live match count, no preview of matched notes (verified: none in ViewDialog or FilterPanel).
- Sort UI: `toolbar/SortPanel.svelte` (159 lines) and `sort.logic.ts` (54 lines). Not read in full this session. Sort is `{column, direction}` only (`collection.types.ts:17-22`).
- Other toolbar parts exist: `PropertiesPanel.svelte`, `FormulaRow.svelte` and `formula.logic.ts`, `CalendarConfigPanel.svelte`. Not read in full (from memory: they edit `properties`, `formulas` and calendar keys).

### Calendar and table

- Calendar row placement: `extractDateFromRecord` (`src/lib/features/collection/calendar.logic.ts:68`) reads `dateProperty` through `getPropertyValue`. `groupRecordsByDate` (`:102`). Linear calendar in `linear-calendar.logic.ts` (322 lines, not read).
- `CollectionView.svelte` (734 lines) renders the three view types. View-type switch menu at `:563-569`. Calendar config branch at `:590-611`.

### Tasks side (for the row-source question)

- Rust task model: `src-tauri/src/vault/task.rs:22` `Task { text, checked, indent, line_number, status, metadata, ... }`. `TaskStatus` enum has 7 variants: Todo, Done, Cancelled, InProgress, Question, Forwarded, Important (`task.rs:42-51`). `TaskMetadata` at `task.rs:82`: `description, due_date, scheduled_date, start_date, created_date, done_date, cancelled_date, priority, recurrence, id, depends_on, on_completion, tags` (`task.rs:84-130`).
- `FileTaskGroup { file_path, file_name, modified_at, tasks }` at `task.rs:154-165`, returned by `get_all_tasks_v2` (`src-tauri/src/commands/vault.rs:647`).
- Tasks are NOT in `get_all_property_records` (`vault.rs:895-906`), so they are not in the `.view` index. A task is a line inside a note, with identity `path + line_number` (not a path), and its own `tags` and `status`.

## Problems and gaps

1. Row unit is the note. `PropertyIndexRecord` is keyed by path (`collection.types.ts:77-96`) and `viewRowSet` requires a `NoteEntry` for each row (`lens.logic.ts:711-719`). A task row has no entry, so tasks would be silently dropped by the current rule. Both the port and `blockRowSet` would need a task branch.
2. No task identity in the engine. A task key would be `file#line`, which changes whenever lines move. Todoist sent-tracking already uses `filePath + task text` (per owner brief). A task row needs a stable key decision before it can be sorted, cached or patched.
3. Silent failures. Misspelt `file.*` methods and runtime errors become "no match" (`collection.logic.ts:320-324`, `:351-355`; `evaluator.ts:586` throws). Formula errors become `null` silently (`collection.logic.ts:183-187`). Only plain-function typos are caught up front (`evaluator.ts:303`).
4. Type inference is first-hit (`filter.logic.ts:260-274`). Two notes with the same property but different types can give different operators depending on Map order.
5. No nesting UI. One level of groups (each with one conjunction). `and/or/not` at the top level are ANDed. Any other nesting is raw text (`filter.logic.ts:295-309`). A task rule like "(due before X or priority high) and tag is Y" would need nesting that the builder cannot show.
6. Date and number inputs are free text (`FilterRow.svelte:174-181`). No date picker, no range helper, no "relative date" operators (e.g. "in the last 7 days"); the owner uses 7d/30d today in TasksView.
7. No preview. ViewDialog shows no matched count or sample rows (verified in source). Rule correctness is only visible after save.
8. Hidden archived rule. Default exclusion is applied in the row set (`lens.logic.ts:745-747`) and shown only as a suffix in the description (`:862`). Users can't turn it off except by citing `archived` in a filter.
9. Comments and formatting lost on every save, since YAML is re-stringified (`yaml-parser.ts:261`, `:329`, `:355`, `:378`, `:406`, `:429`).
10. `groupBy` and `summaries` are ignored (`collection.types.ts:47-49`). The only grouping is by calendar date or by `.view` list order.
11. Validation of `filters` and `properties` is absent from `parseCollectionYaml` (`yaml-parser.ts:101-117`). Bad shapes are caught later by `findItemError` (`collection.logic.ts:232-250`) and shown as `filterError`.
12. Property list is flat (`filter.logic.ts:223-238`). Large vaults with many keys have no grouping or search in the picker.
13. The Rust/TS record projection is a mirror with a golden fixture (`collection.logic.ts:45-51`). Any new derived key (for example a task-derived flag) has to be added in two places.

## Ideas worth keeping

- Keep the rule grammar: string expression or `{and, or, not}` tree, stored as YAML. It is already round-trip safe, has a raw escape hatch, and is documented by tests in `filter.logic.ts` (round-trip and fixed-point claims, `:57-58`).
- Reuse the `FilterRow` / `FilterGroup` model and `filterGroupsToFilter` / `parseFilterToGroups` as the rule-builder core. The conjunction-per-group UI (`FilterPanel.svelte`) maps well to "source rules" (top-level, "All views") and "task filters" ("This view").
- Live validation text on raw rows (`FilterRow.svelte:43-46`, `:105-107`) is a cheap improvement to copy.
- `describeViewFilters` (`lens.logic.ts:853-863`) turns a filter into a sentence. Good for a task-rule summary line, and for surfacing the hidden archived rule.
- Port pattern (`view-row-set.port.ts`): the feature declares what it needs (`blockRows`, `rows`, `entriesLoaded`, `sortLabel`) and the app injects it. A task row source can use the same seam without a cycle.
- One owner for the row rule (`viewRowSet`, `blockRowSet`). A task rule would be a third owner of the same kind, so it should be a sibling function, not a branch inside these two.
- Pure logic is well separated (`filter.logic.ts`, `collection.logic.ts`, `yaml-parser.ts`), so a task rule engine could be tested without Svelte. Matches the repo's `.logic.ts` rule.
- Parse cache per query (`collection.logic.ts:157-158`) and precomputed formulas (`:147-190`) are cheap wins to keep.

## Open questions

1. Should a task be a row kind of `.view` (new view type, e.g. `tasks`), or a separate rule type that reuses only the expression grammar? The first needs `PropertyIndexRecord` (or a sibling) keyed by `path#line`, a task branch in `viewRowSet`, and a new `VIEW_TYPES` entry. The second keeps `.view` note-centric.
2. Two-level predicates: note-level (`file.*`, `_type`, `file.hasTag`, `file.inFolder`) decide which notes are sources, and task-level (`status`, `due`, `priority`, `tags`) decide which tasks pass. Is that the model the owner wants, and should it be one expression with a prefix, or two fields?
3. Do task rules live in the `.view` YAML (versioned with the view) or in settings? Settings are not covered by this scout.
4. Is nested boolean logic needed in the UI, or are raw expressions acceptable for power users? The owner asked for "specific rules", which suggests yes.
5. Task status is a 7-value enum (`task.rs:42-51`). The builder today offers only text operators on a property. Does the task rule need a status picker, with the enum values listed?
6. Date rules: 7d/30d are file `mtime` in TasksView today. Should the builder add relative-date operators (`file.mtime`, `due`), and does `date()` with day precision (`evaluator.ts:644-653`) cover due dates?
7. Should the editing UI keep the "All views / This view" split for tasks, or a "sources / filters / categories" split? Categorization (`groupBy`) is not implemented in `.view` and would be new work.
8. From memory, `SortPanel.svelte`, `PropertiesPanel.svelte`, `linear-calendar.logic.ts` and `CollectionView.svelte` were not read in full. Treat their details as unverified.
