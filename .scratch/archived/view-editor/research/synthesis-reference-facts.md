**Summary**
1. A `.view` is one bare YAML map with no `---` fences, so the closing `---` of a fenced file starts a second document. A view needs a non-empty `views` list, and each entry needs a string `type` (`table`, `calendar` or `linear-calendar`) and a string `name`. One bad entry fails the whole file (`yaml-parser.ts:13-123`).
2. Two parsers read the same file. Rust gives the menu keys: aliases folded, duplicate keys last-wins, maps projected to null. TS `yaml` gives the query: duplicate keys throw. The two can disagree on the same file.
3. Only the canonical boolean `true` works for `_rail` and `_open_in_editor`, and only `false` for `_visible`. `_order` must be a bare number. Quoted values are ignored, and only 7 keys get a mark when ignored.
4. Filters fail silently in four ways. A YAML list or an unknown map key matches every note. An unknown or wrong-type method matches 0 notes. A throw on one note drops that note. A NaN result keeps the row. `validateExpression` checks only parsing and plain function names.
5. Column and sort keys resolve only `file.name|basename|path|folder|ext|size|ctime|mtime`, `formula.<name>` or the exact stored key. A DESC sort puts notes with no value first.
6. Row rule: system folder, type definitions, `.view` files and uncited archived notes are left out. A view `sort` turns off `_sort` and the `_order` pins. `limit` is applied last. The rail and the editor run the filter after a lossy round-trip through filter groups, while inline blocks run the raw value and always `views[0]`.
7. Every app writer re-serializes the file, so comments are lost. Only New view and Edit view write with `lineWidth: 0`. Edit view always renames the view it edits to the label and has no conflict check. Tab rename and delete leave `_rail_view` stale.
8. Picking up an outside write takes about 3 to 12 s: watcher debounce, a full rebuild for a batch of only `.view` files, then a 2 s / 10 s throttle. A tab with unsaved edits wins over the outside write.
9. I checked 21 high-risk facts against the code myself; they are listed in section 11. One validated claim does not hold for `.view` files: wikilinks in `_group` and other system keys do not become relationship fields there.
10. There are 10 recipes and a list of pitfalls. The open items are in section 12.

---

# Fact sheet for docs/agents/view-files.md

Abbreviations: YP = `src/lib/features/collection/yaml-parser.ts`, CL = `src/lib/features/collection/collection.logic.ts`, E = `src/lib/features/collection/expression/evaluator.ts`, M = `.../expression/methods.logic.ts`, T = `.../expression/tokenizer.ts`, P = `.../expression/parser.ts`, LL = `src/lib/features/rail-shell/lens.logic.ts`, TSL = `src/lib/features/type-definitions/type-sidebar.logic.ts`, TNL = `.../type-note-list.logic.ts`, TDS = `.../type-definitions.service.ts`, F = `src/lib/features/collection/toolbar/filter.logic.ts`, CBW = `src/lib/features/collection/collection-block-widget.ts`, DOC25 = `help/documentation/25-types-and-relationships.md`, DOC12 = `help/documentation/12-collection.md`.

Tags: [S] = I checked it in code in this pass. [V] = CONFIRMED or CORRECTED by a validator and not re-checked here. [NV] = not verified.

## 1. File anatomy
- **Format.** One YAML document with no `---` fences. Menu keys, `views`, `filters`, `formulas` and `properties` all sit at the top level (DOC25:381,403) [S].
- **Fences break the file.** With fences, the closing `---` starts a second document. TS `yaml` then throws, and Rust falls back to a line subset parser (`src-tauri/src/vault/parsing.rs:596-607`) [V].
- **Location.** Any folder works, and the extension is case-insensitive (`src-tauri/src/utils/fs.rs:146-148`, `src/lib/core/filesystem/fs.logic.ts:71-73`) [S].
- **Dot folders** are invisible to the tree, the watcher and the index (`src-tauri/src/commands/vault.rs:146`) [V].
- **The system folder is not excluded.** A `.view` in it is still listed in Views and can be pinned (LL:209-217, 643-658) [S].
- **TS parse** (the query side): `parseCollectionYaml` (YP:13-123) [S].
  - Duplicate keys throw at any depth. So do multiple documents and tab indentation (run by V01).
- **Rust parse** (the menu side): the whole file goes through `parse_frontmatter_raw_yaml`, then `from_view_frontmatter` (`src-tauri/src/vault/entry.rs:241-243, 294-313`) [S].
  - That entry leaves `is_a`, links, tags, tasks and relationships at their defaults (`..Default::default()`) [S].
  - Aliases fold at the root only. Duplicate keys are last-wins.
  - Any map becomes `null`, so `views` in the index is an array of nulls.
  - An unquoted `[[X]]` becomes the string `"[[X]]"` (parsing.rs:815-834) [V].
- **Rust value rules** (parsing.rs ~805-972) [V]:
  - Empty, `null` and `~` become null.
  - Only `true/True/TRUE` and `false/False/FALSE` are booleans.
  - Integers and finite decimals are numbers. `0x1F`, `.inf` and `NaN` stay strings, while TS reads `0x1F` as 31.
  - A quoted scalar is always a string.

## 2. Top-level menu keys (read from the Rust index entry)
Aliases come from `src-tauri/src/vault/aliases.rs:9-28` [S]: `order`, `sort`, `icon`, `color`, `title_color`, `sidebar_label`, `sidebar label`, `visible`, `list_properties_display`, plus `type`, `organized`, `archived`, `favorite`, `favorite_index`, `template` and `view`. No alias exists for `_group`, `_rail`, `_rail_view` or `_open_in_editor`. Never write an alias next to its canonical key: the later spelling wins.

| Key | Valid value | Default | Invalid value | Consumers |
|---|---|---|---|---|
| `_sidebar_label` | non-empty string | file name without `.view` | ignored, no mark. Whitespace-only passes. Unquoted `2024` or `true` is ignored (TSL:337-340) [S] | Views row, pin, list header, palette |
| `_order` | number only | 50 (TSL:453-456) [S] | `"1"` ignored, with a mark (TSL:409) [S] | position in Views (inside its group) and among pins. Not the list order |
| `_sort` | `modified`, `created`, `modified-asc`, `created-asc`, `title` (TSL:395) [S] | `modified` (TSL:462-465) | default, with a mark | list order only when the running view has no `sort` (TNL:96-98) [S] |
| `_group` | string, trimmed, blank means none (TSL:368-372) [S] | ungrouped | mark if not text | ungrouped views first, then groups in natural order, compared exactly (LL:660-665) [S] |
| `_visible` | only boolean `false` hides (TSL:378-380) [S] | shown | mark if not boolean | Views and the palette. Pins ignore it (LL:209-217) [S] |
| `_open_in_editor` | only boolean `true` (TSL:360-362) [S] | false | mark | row, pin and palette clicks open the editor |
| `_rail` | only boolean `true` (LL:222) [S] | unpinned | mark if not boolean. `false` passes and does nothing | rail pins, sorted by `_order` then label then path (LL:236) [S] |
| `_rail_view` | string equal to a view's `name`. Exact, case-sensitive, not trimmed. First match wins (YP:125-144) [S] | `views[0]` | blank: dropped silently. Non-string: `railViewIgnored`. Unknown name: runs `views[0]`, with a mark after the count runs (YP:118-120, TSL:426-441) [S] | rail list, navigator count, rail toolbar, Edit view. The editor and inline blocks never read it |
| `_icon` | Lucide name or `pack:name` | Table icon | unknown pack or name: Table icon [V] | Views row, pin, Files navigator, tabs |
| `_color` | palette name or CSS color | none | no effect without `_icon` [V] | icon color |
| `_title_color` | CSS color, quoted if it starts with `#` | none | unquoted `#...` is a YAML comment, so the value is null [V, YAML spec] | row text color, works without `_icon` |
| `_list_properties_display` | list of strings, non-strings dropped (TSL:477-481) [S] | none | | pills on the rail rows. Shows `note.frontmatter[key]` only, so `file.*` and formula pills never render [V] |

- The ignored-value mark exists only for `_order`, `_open_in_editor`, `_sort`, `_visible`, `_group`, `_rail` and `_rail_view` (TSL:408-424) [S]. It checks only the kind of value, not whether the value works (TSL:402-406) [S].
- Unknown and misspelled root keys are ignored with no note. Example: `rail: true` [V].

## 3. Query keys (TS parse)
**Top level**
- `filters`: an expression string, or a map with `and`, `or` and `not` lists. It is not checked at parse time (YP:101-103) and is checked when the view runs (CL:136-141, 227-250) [S]. A falsy value counts as no filter (CL:228) [S]. It is ANDed with each view's own `filters` (CL:161-170) [S].
- `formulas`: a map of name to expression string. A non-string value fails the parse (YP:104-114) [S]. A formula that fails to parse or throws gives `null`, with no message (CL:147-155, 176-189) [S].
- `properties`: a map of column to `{displayName}`, used only as table headers (CL:454-457) [S]. No UI writes it [V].

**Per view (each entry of `views`)** (YP:40-95) [S]
- `type` (required): exactly `table`, `calendar` or `linear-calendar` (YP:333).
- `name` (required): a non-empty YAML string. Unquoted `2026` or `true` fails with `missing "name"`.
- `filters`: same rules as the top level.
- `sort`: a list of `{column, direction}`, where `direction` must be exactly `ASC` or `DESC` and is required. `property` is accepted in place of `column` (YP:70-74). The column name itself is not checked.
- `order`: must be a list. Its items are not checked. It sets the table columns. Without it, the columns are `file.name` plus every key of every matched record, including `organized`, `archived`, `favorite`, `tags` and every `_*` key (CL:459-477, 63-69) [S]. Always write `order`.
- `limit`: a number of at least 1 (YP:86-88) [S]. A quoted value fails. `2.5` keeps 2 rows. `.nan` passes and applies no limit, and `.inf` returns everything (run by V01).
- `columnSize`: must be a map, and nothing reads it. `groupBy` and `summaries` are kept and ignored (`collection.types.ts:43-49`) [S].
- Calendar keys, never validated [S types / V behavior]:
  - `dateProperty`: required by the calendar types to render. A non-string value throws in `getPropertyValue` (CL:407) [V].
  - `endDateProperty`.
  - `weekStartDay`: integer 0 to 6, default 1. A quoted `"1"` breaks the weekday labels (`calendar.logic.ts:40,169`) [V].
  - `colorProperty`: `linear-calendar` only.
- Unknown keys survive every writer, because the writers re-parse the raw YAML [S, YP:175-261].

**Parse error messages** (YP:18-111) [S]: `Invalid YAML: ...`, `YAML must be an object`, `Missing required field: views`, `Field "views" must be an array` / `must not be empty`, `View at index N is missing "type"` / `has unknown type`, `View at index N is missing "name"`, and the sort, order, limit and columnSize messages. Messages name a view index, not a line [V].

## 4. Filter expression language
**Tokens** (T:21-165) [S]
- Operators: `+ - * / % == != > < >= <= && || !`. There is no `===`: it tokenizes as `==` plus `=` and throws.
- Strings take `'` or `"`, and typographic quotes match their ASCII pair. `\` escapes the next character.
- Numbers are digit runs that may contain `.`. A leading `.5` fails.
- Identifiers use ASCII letters, digits and `_`. A `-` followed by a letter continues the identifier, so `due-date` is one name while `a-1` is a subtraction. Non-ASCII letters throw.
- `true` and `false` are booleans. `null` is an identifier that resolves to null (E:149).

**Grammar** (P:30-209) [S]
- Precedence, from lowest: `||`, `&&`, comparison, `+ -`, `* / %`, unary `! -`, postfix `.` and `()`, then primary.
- `!` binds tighter than `==`, so `!status == 'done'` means `(!status) == 'done'`.
- Array literals exist. There is no indexing, ternary, `??` or `in`.

**Semantics** (E:229-288, 623-715) [S]
- `&&` and `||` return one of their operands.
- Arithmetic coerces to numbers. Dividing by zero gives `null`.
- `Date ± duration-string` gives a Date, for example `today() - '7d'`. `Date - Date` gives milliseconds.
- A frontmatter date is a string, so `due - today()` is NaN. Use `date(due) - today()` [S for the arithmetic, V that dates arrive as strings].
- `==` is JS `==`. So `p == false` also matches `0`, `''` and `'0'`.
- A comparison with a Date on either side parses ISO strings. Null or non-ISO values become NaN, so the comparison is false, and `due < today()` drops notes with no `due`. Without a Date, null counts as 0.
- `date('YYYY-MM-DD')` compares at day precision (E:368-377, 643-711).
- `type` is the only identifier alias, for `_type`. Comparing `type` or `_type` to a literal ignores case (E:93-100, 263-272).
- Dotted names read literal keys: `meta.title` looks up the key `"meta.title"` (E:179-181, 590-597).
- NaN is truthy (E:632-636), so a filter that evaluates to NaN keeps every row.

**Plain functions** (E:294-298, 353-468) [S]
- `if`, `now`, `today`, `date`, `number`, `contains`, `startsWith`, `endsWith`, `isEmpty`, `max`, `min`, `list`, `duration`, `link`, `image`, `icon`, `html`, `badge`, `progress`, `color`, `escapeHTML`.
- `contains`, `startsWith` and `endsWith` are case-insensitive and stringify their first argument, so `contains(list, 'x')` is a substring test over the joined list.
- `max` and `min` treat null as 0.
- `duration('7d')` returns milliseconds as a number, not a Date. Use the string form `today() + '7d'`.

**`file.*` fields** (E:194-213) [S]: `name` (with extension), `basename`, `path`, `folder` (absolute), `ext`, `size`, `ctime`, `mtime` (both Dates), `tags`, `properties`. Anything else is null.
- `file.links` is null. `file.mtime` and `file.ctime` are 0 (1970) for a just-created note until Rust catches up [V].

**`file.*` methods** (E:563-587) [S]
- `hasTag(a, b, ...)`: case-insensitive exact match on any tag. Tags are stored without `#` (`src/lib/utils/tag-extraction.ts:61,67,76`), so write `'meeting'`, not `'#meeting'`. Nested tags do not match.
- `inFolder(x)`: a case-insensitive prefix test on the absolute folder, so `/v/Proj` also matches `/v/Projects2`.
- `hasProperty(k)`: always true for `archived`, `organized`, `favorite` and `tags`, which every record carries (CL:63-69). It does not apply aliases.
- `asLink()`: returns a plain `[[absolute path]]` string.
- Any other name throws `Unknown file method`, and that note is silently dropped.

**Value methods** (M:62-226, dispatched by runtime type, then `any`, else a throw, M:255-269) [S]
- string: `lower`, `title`, `trim`, `replace` (first match only), `split`, `slice`, `matches` (regex, case-insensitive).
- number: `abs`, `round`, `ceil`, `floor`, `toFixed`.
- date: `format` (tokens `YYYY MMM MM DD HH mm ss ddd`, each replaced once, so `dddd` gives `Mond`), `relative`, `date`, `time`.
- list: `contains` (exact element, case-insensitive), `sort` (as text), `unique`, `join`, `flat`, `slice`, plus `filter(expr)` and `map(expr)` with `value` and `index`.
- object: `keys`, `values`, `isEmpty`.
- any: `contains`, `startsWith`, `endsWith`, `isEmpty`, `isTruthy`, `isType`, `toString`.
- Fields: string `.length`; date `.year .month .day .hour .minute .second .millisecond`; list `.length`.
- A method absent for the value's runtime type throws, so `status.lower()` drops every note where `status` is a number, a list or null.
- Not available: `hasLink`, `links`, `reduce`, `reverse`, `containsAll`, `containsAny`, `repeat`, regex literals, `this`.

**Which errors show** (E:300-336; CL:232-250, 347-358) [S]
- An error box appears only for a parse failure, an unknown plain function, a non-list `and`/`or`/`not`, or an item that is neither a string nor an object.
- An unknown method, or a throw on one note, silently excludes that note. Inside `not:` the excluded item keeps the note instead (CL:370-371).

## 5. Row rule (which notes a `.view` lists)
- **`.view` row set** (`viewRowSet`, LL:704-721) [S], shared by the rail, the navigator count and the editor tabs:
  - The query matches records and applies the view's `sort` (CL:193-205).
  - It keeps entries that are not in the system folder, not type definitions and not `.view` files. Archived notes are dropped unless a filter cites `archived` or `_archived` (CL:252-312).
  - Order: with a view `sort`, the query order stays and no pins apply. Otherwise `_sort` orders the list, with each note's `_order` pin on top. A note's `_order` accepts a quoted number (TSL:137-140).
  - `limit` is applied last. Records with no index entry are dropped.
- **Archived trap.** `file.hasProperty('archived')` counts as citing archived and matches every note, so it lets archived notes back in (CL:296) [S].
- **Sort nulls.** Nulls sort last in ASC, and DESC negates the comparison, so notes with no value come first in DESC (CL:193-204, 426-433) [S]. A test pins this as known behavior [V].
- **The round-trip.** The rail and the editor run the filter after `filterGroupsToFilter(parseFilterToGroups(...))` (LL:792-797; F:94-177) [S]. Inline blocks run the raw value. Effects:
  - `{and: []}` becomes JSON text, which shows an error in the rail.
  - A YAML list becomes a truthy array literal.
  - `filters: 5` is an error in a block and no filter in the rail.
  - An empty `or: []` is dropped.
- **The `.view` entry.** It changes only through the throttled refresh, so a `_sort` edit takes effect later than `filters`, `sort` or `limit` edits, which come from the disk parse [V].

## 6. How app writers behave
- **Serialization.** Every writer parses, changes and re-stringifies the file, so comments and formatting are lost.
  - `lineWidth: 0` is used only by `buildNewViewYaml` (TSL:353) and `updateViewEditYaml` (YP:329) [S].
  - The other writers use the default width of 80 (YP:261, 355, 378, 406, 429; TSL:542, 569, 590, 613, 635) [S]. The folding is likely cosmetic: values parse back the same [V from memory].
- **No-op guards.** Icon and colors return the input when nothing changed (TSL:520-570), and so does Show in Views (TSL:610-611) [S]. Edit view always rewrites (YP:329) [S]. `rewriteViewFile` skips the write only when the bytes are identical (TDS:390) [S].
- **Alias dropping:**
  - `icon`, `color` and `title_color` (TSL:539-541, 567-568).
  - `visible` (TSL:610) and `list_properties_display` (TSL:632).
  - Edit view drops `sidebar_label` and `sidebar label` (YP:315-317).
  - Nothing drops `sort` or `order`, and nothing writes them [S].
- **Failure modes on bad YAML:**
  - Icon and color writers return the input silently (TSL:533-537, 558-560).
  - Pin, Show in Views and list properties throw (TSL:583-586, 605-608, 625-629).
  - Edit view returns `{ok:false}` (YP:286-310).
  - `updateCollectionYaml`, `addView`, `removeView`, `renameView` and `setViewType` return the input unchanged [S].
- **Edit view** (`updateViewEditYaml`, YP:286-330) [S]:
  - It edits `views[railViewIndex]`.
  - It sets `_sidebar_label`, sets that view's `name` to the label (YP:318), and sets `_rail_view` only if it already resolved (YP:319).
  - It checks for duplicate names inside the file only when `_rail_view` resolves (YP:308).
  - The dialog always sends `viewFilters` (`ViewDialog.svelte:145-149`) [S], so every Save round-trips the filters and drops comments.
  - It has no conflict check.
- **Tab operations:**
  - `renameView` trims the name and silently refuses an empty, unchanged or duplicate name (YP:388-407).
  - `removeView` refuses to remove the last view.
  - `addView` appends `{type: table, name: Untitled}` with no duplicate check (YP:344-356).
  - Rename and delete never update `_rail_view`, so the rail silently falls back to `views[0]` [S].
- **Conflict checks.** The rail toolbar refuses an edit when the key's value changed since it was read (TNL:180-199; TDS:518-533) [S]. The collection editor does the same (`key-edit.logic.ts:47-51`) [V]. Edit view has none.
- **Write base.** A tab with unsaved edits is the base for every in-app writer (TDS:388) [S].
- **Two creators, two shapes:**
  - New view writes `_sidebar_label`, `_sort: title` and one table view with its filters (TSL:351-354) [S].
  - New table writes `_visible: false`, `_open_in_editor: true` and one table view named `All` (`collection.service.ts:18-23`) [S].
- **No UI writes** `limit`, `_sort`, `_order`, `_group` or `_rail_view`, or sets `_visible: false` or `_open_in_editor: true` on an existing file [V].

## 7. Picking up a `.view` written from outside, and timing
- **Watcher debounce.** 500 ms in Rust (`src-tauri/src/vault/watcher.rs:34`) [S], then about 0.3 s on the frontend [V].
- **Rebuild.** A batch with no markdown files goes to a full rebuild (`watcher-handler.service.ts:51-74`) [S]. That rebuild uses `scan_vault_v2_cached`, which re-reads only files whose mtime changed [V].
- **Entries refresh throttle.** 2 s after an isolated event, at most one per 10 s during a burst, and at once after `requestPromptIndexRefresh` (`src/lib/core/vault/vault-entries.service.ts:15-17`) [S].
- **Count debounce.** About 1 s [V].
- **Total.** About 3 to 12 s before the label, group, visibility and pin update. A new file shows default metadata first [V].
- **Tabs with unsaved edits win.** They are not reloaded, and their buffer is saved on the next autosave, overwriting the outside write (`src/lib/core/editor/editor.service.ts:418-428`) [S].
- **Deep link.** `kokobrain://new?...&silent=true` writes the content as given (`deep-link.service.ts:322-338`) [V]. What the non-silent path does to plain YAML is [NV].
- **Renames from outside are not followed.** A pin or rail pick goes stale, and the list says "This view no longer exists" [V].

## 8. Inline ` ```collection ` block differences
- It runs only `views[0]` and ignores `_rail_view` (CBW:109) [S]. Errors in any other view still break the block.
- It reads none of the underscore keys.
- Its row set uses records only, keeps the query order, has no `_sort` or pins, and applies `limit` after the same exclusions (LL:736-750) [S].
- It keeps records that have no index entry yet [S, LL:732-734].
- The table caps at 50 rows, and the linear calendar at 3 lanes. Calendars are frozen to the current month or year with no navigation [V].
- It runs the raw filter, without the round-trip [S].
- It loses `file.basename` as a column [V].

## 9. Recipes (canonical keys, every name and filter quoted, no comments)
Every filter here uses only functions or methods checked in sections 4 and 5. None of these was run in the app.

1. Active projects by type. Use an `and:` list rather than one `&&` string, so the panels can edit it and New here creates a typed note (LL:879-893; a `&&` string becomes a raw row, F:30, P:46-53).
```yaml
_sidebar_label: "Active Projects"
_sort: title
_icon: rocket
views:
  - type: table
    name: "Active Projects"
    order: [file.basename, status, priority, file.mtime]
    filters:
      and:
        - "_type == 'Project'"
        - "status == 'active'"
```
2. Tagged notes (no `#`):
```yaml
_sidebar_label: "Meetings"
views:
  - type: table
    name: "Meetings"
    order: [file.basename, file.ctime]
    filters: "file.hasTag('meeting')"
```
3. Recently modified, last 7 days, newest 20:
```yaml
_sidebar_label: "Recent"
views:
  - type: table
    name: "Recent"
    order: [file.basename, file.mtime]
    filters: "file.mtime >= today() - '7d'"
    sort:
      - column: file.mtime
        direction: DESC
    limit: 20
```
4. Due in the next 7 days. Notes without `due` drop out, and ASC keeps nulls last:
```yaml
_sidebar_label: "Due Soon"
views:
  - type: table
    name: "Due Soon"
    order: [file.basename, due, status]
    filters:
      and:
        - "due >= today()"
        - "due <= today() + '7d'"
        - "status != 'done'"
    sort:
      - column: due
        direction: ASC
```
5. Folder scope. Use a separator-bounded substring rather than a relative `inFolder`:
```yaml
_sidebar_label: "Work Area"
views:
  - type: table
    name: "Work Area"
    order: [file.basename, file.folder]
    filters: "contains(file.path, '/Areas/Work/')"
```
6. Several views, with the rail picking the list. Open the file in the editor for the calendar:
```yaml
_sidebar_label: "Events"
_rail_view: "List"
filters: "_type == 'Event'"
views:
  - type: table
    name: "List"
    order: [file.basename, date]
    sort:
      - column: date
        direction: DESC
  - type: calendar
    name: "Calendar"
    dateProperty: date
    endDateProperty: endDate
    weekStartDay: 1
```
7. Linear calendar colored by status, kept in the editor and out of Views:
```yaml
_visible: false
_open_in_editor: true
views:
  - type: linear-calendar
    name: "Timeline"
    dateProperty: start
    endDateProperty: end
    colorProperty: status
    filters: "_type == 'Project'"
```
8. Archive. Citing `archived` lets the filter decide on archived notes:
```yaml
_sidebar_label: "Archive"
_sort: modified
views:
  - type: table
    name: "Archive"
    filters: "archived == true"
```
9. Pinned and grouped:
```yaml
_sidebar_label: "Inbox Tasks"
_group: "Work"
_order: 1
_rail: true
_icon: inbox
_title_color: "#3498db"
_list_properties_display: [status, priority]
views:
  - type: table
    name: "Inbox Tasks"
    filters:
      and:
        - "_type == 'Task'"
        - "!isEmpty(status)"
        - "status != 'done'"
```
10. Formula column (days left). Go through `date()`, since raw strings give NaN:
```yaml
_sidebar_label: "Deadlines"
formulas:
  daysLeft: "if(due, (date(due) - today()) / 86400000, null)"
properties:
  formula.daysLeft:
    displayName: "Days left"
views:
  - type: table
    name: "Deadlines"
    order: [file.basename, due, formula.daysLeft]
    filters: "!isEmpty(due)"
    sort:
      - column: due
        direction: ASC
```

## 10. Pitfalls that silently break a view
1. A `---` fence or a second document: the parse fails.
2. Duplicate keys: TS throws while Rust keeps the row's label, icon and pin, so the menu looks fine but the list shows an error.
3. An unquoted numeric or boolean `name`: the parse fails. An unquoted `_sidebar_label: 2024`: ignored.
4. Quoted booleans or numbers in `_rail`, `_visible`, `_open_in_editor` or `_order`: ignored.
5. Unquoted `_color: #fff`: read as a comment, so the value is null.
6. Lowercase `asc`/`desc`, or a missing `direction`: the parse fails.
7. A top-level list of `_sort` values or a bare `sort:` at the top level: folded into `_sort` (aliases.rs:17). Put query sorts inside `views[]`.
8. `filters:` written as a YAML list, a map with no `and`/`or`/`not`, or an Obsidian `{property, operator, value}` map: matches every note with no error (CL:240-249, 361-374).
9. An unknown method (`hasLink`, `reverse`), or a method on the wrong type (`status.lower()` on a number): 0 rows or missing rows, with no error (E:300-336, 585-586; M:269).
10. `file.hasTag('#x')`: never matches. `file.inFolder('Projects')`: relative, so it never matches.
11. Column or sort keys such as `file.tags`, `file.properties`, `note.x`, `property.x` or the alias `type`: null in tables and sorts (CL:406-424).
12. Date arithmetic on raw frontmatter strings (`due - today()`): NaN. A NaN filter keeps every row.
13. `p == true` / `p != true`: JS coercion. `!a == b` parses as `(!a) == b`. `===` is a parse error.
14. A DESC sort: notes without the value come first, including in a "top N" `limit`.
15. Renaming or deleting the tab `_rail_view` names: the rail silently runs `views[0]`.
16. Editing a `.view` that is open with unsaved edits in the app: the outside write is overwritten.
17. `file.hasProperty('archived')`: matches every note and lets archived notes in.
18. Calendar keys: a non-string `dateProperty` throws, and `weekStartDay` outside 0 to 6 or quoted skews the calendar.

## 11. Facts I checked in code this pass
1. Parser rules and messages: YP:13-123.
2. The alias map: aliases.rs:9-28.
3. `_rail_view` is not trimmed, a blank one is dropped, and the first match wins: YP:118-144.
4. `renameView` and `removeView` ignore `_rail_view`, and `addView` has no duplicate check: YP:344-407.
5. Edit view renames the view to the label, guards duplicates only when `_rail_view` resolves, and uses `lineWidth: 0`: YP:308-329.
6. Column and sort resolution: CL:406-424.
7. Nulls sort last in ASC and first in DESC: CL:193-204, 426-433.
8. A list filter gives no error and matches all: CL:232-250, 361-374.
9. Methods are not validated, and their throws are swallowed: E:300-336, 585-586; CL:347-358; M:255-270.
10. Inline blocks use `views[0]`: CBW:109.
11. A view `sort` turns off `_sort` and the pins: TNL:96-98.
12. `limit` is applied last in `viewRowSet` and `blockRowSet`: LL:704-750.
13. `_rail` pins only on `=== true`: LL:222.
14. Token rules and `!` precedence: T:21-165, P:94-105.
15. `format` replaces each token once: M:11-21.
16. Date arithmetic and comparisons: E:246-253, 675-715.
17. The list `contains` method vs the `contains()` function: M:141-145, E:385-389.
18. `hasTag`, `inFolder` and `hasProperty`: E:565-579. Tags lose their `#`: `tag-extraction.ts:61,67,76`.
19. The NEW_TABLE template: `collection.service.ts:18-23`.
20. Watcher and throttle timing: `watcher.rs:34`, `watcher-handler.service.ts:51-74`, `vault-entries.service.ts:15-17`.
21. The write base and the dirty-tab reload rule: TDS:384-390, `editor.service.ts:418-428`.

One correction from this pass: V10/A14 said wikilinks in `_group`, `_rail`, `_rail_view` and `_open_in_editor` become relationship fields. That is true for `.md` type definitions, where `SYSTEM_KEYS` lacks those keys (`entry.rs:438-445`). It does not happen for `.view` files: `from_view_frontmatter` never calls `extract_all_relationships` and leaves relationships at their defaults (`entry.rs:294-313`).

## 12. Not verified
- Whether `parseDocument` round-trips keep comments with the repo's options. V01 ran it and comments survived; ADR 0029:74 says they do not.
- Whether frontmatter dates reach the evaluator as strings on the Rust projection path.
- The lifecycle debounce of 0.3 s and the count debounce of 1 s.
- What a non-silent deep-link `new` does to plain YAML.
- Whether an error boundary catches a non-string `dateProperty` throw.
- The self-save temp-file name pattern `*.tmp-<digits>-<digits>`.
- Anything that needs a running app: the recipes, the timings and the rendering.