# `.view` files: agent reference

How to create and edit a Kokobrain `.view` file by hand (outside the app), so that it parses, lists the notes you meant, and shows where you meant. This is the source for a future view-authoring skill.

`.view` is the only file kind for saved queries. The older `.collection` extension is retired and opens as plain text. One `.view` is both a **menu entry** (listed under Types > Views, pinnable to the rail) and a **table, calendar or linear-calendar** you open in an editor tab. An inline ` ```collection ` block in a note embeds the same format.

Behavior described here is the code at `5f8003d67`. Items marked **(changes: open-itens/NNN)** are scheduled to change in `.scratch/open-itens/issues/NNN-*.md`. When that Issue is done, update the item.

## Vocabulary

- **Menu keys** are the underscore keys at the top level (`_sidebar_label`, `_rail`, ...). The Rust index reads them. Inline blocks ignore them.
- **Query keys** are `filters`, `formulas`, `properties` and `views`. The TypeScript parser (`parseCollectionYaml` in `src/lib/features/collection/yaml-parser.ts`) reads them.
- **The rail list** is the note list shown when a view is picked in the rail. It runs **one** entry of `views`: the one `_rail_view` names, else the first.
- **The `.view` tab** is the file opened in the editor. It shows every entry of `views` as a tab.

## Create a view

1. **Pick the location.** Any folder of the vault except dot folders (`.git`, `.obsidian`), which the index never sees. The file name without `.view` is the label when `_sidebar_label` is absent. Extensions match case-insensitively.
2. **Write the file** to the contract below. Start from the closest recipe in § Recipes.
3. **Check it** with the command in § Check. Done when it prints `OK`.
4. **Review the pitfalls.** Go through every item of § Pitfalls against the file. Done when none applies.
5. **Expect the app 3 to 12 s later** (see § How the app picks up a file). You will not see it sooner, and that is not a failure.

## Edit a view

1. **Read the whole file first.** Keep its comments, key order and quoting. Change only the lines you mean to change, and write the text back. Parsing and re-serializing the YAML drops every comment.
2. **Keep one spelling per key.** If the file uses an alias (`icon:`, `sort:`, `visible:`, ...; see § Menu keys), either edit that alias or replace it with the canonical key. Writing both makes the later one win in the menu.
3. **Keep `_rail_view` in sync.** When you rename or remove the entry of `views` that `_rail_view` names, update or delete `_rail_view` in the same edit. Otherwise the rail silently runs `views[0]`.
4. **Edit only a file the user does not have open with unsaved changes in the app.** The app's autosave writes its buffer over your edit.
5. **Check and review** as in Create, steps 3 and 4.

## The contract

- One YAML document: a top-level map with **no `---` fences**. The closing `---` starts a second document, and the parse fails.
- Indent with spaces, never tabs. Every key appears once at its level: a duplicate key fails the TypeScript parse, while the menu (Rust) quietly keeps the last value, so the row's label and icon look fine while its count shows the red error mark and the list shows the error.
- `views` is required: a non-empty list. Each entry needs:
  - `type`: exactly `table`, `calendar` or `linear-calendar`.
  - `name`: a non-empty **string**. Quote names YAML would read as another type (`"2026"`, `"true"`, `"#tag"`).
- One invalid entry fails the whole file, not just that view.
- Quote every filter and formula expression, since they contain `'`, `"`, `:` and `#`.

## Menu keys (top level)

Only the exact value types below work. Any other value is ignored, and the default applies. For `_order`, `_sort`, `_group`, `_visible`, `_open_in_editor`, `_rail` and `_rail_view`, Views also shows a grey mark on the row whose tooltip names the key; the other keys fail silently.

| Key | Works with | Default | Effect | Alias |
|---|---|---|---|---|
| `_sidebar_label` | non-empty string | file name without `.view` | label of the Views row, the pin, the list header and the palette's Open view | `sidebar_label`, `sidebar label` |
| `_order` | a bare number (`1`, not `"1"`) | `50` | position in Views, within the view's group, and among rail pins. It does not order the notes | `order` |
| `_sort` | `modified`, `created`, `modified-asc`, `created-asc`, `title` | `modified` | order of the rail list, but only when the running entry of `views` has no `sort` | `sort` |
| `_group` | string (trimmed; blank means none) | ungrouped | the subheading in Views. Ungrouped views come first, then groups in natural order (`Week 2` before `Week 10`, ignoring case). Two views share a group only when their `_group` values are exactly equal, case included | |
| `_visible` | boolean `false` hides | shown | `false` keeps the view out of Views and the palette. It stays a file: the Files navigator and Quick Switcher still find it, a pin keeps it on the rail, and its label stays taken | `visible` |
| `_open_in_editor` | boolean `true` | `false` | a click on the row, the pin or the palette command opens the `.view` tab instead of the rail list | |
| `_rail` | boolean `true` | unpinned | pins the view to the rail, whatever `_visible` says. Pins sort by `_order`, then label, then path | |
| `_rail_view` | a string equal to one entry's `name`, exact and case-sensitive | the first entry | which entry the rail list, the navigator count, the rail's Sort and Filter and Edit view run. The first entry of that name wins. A name no entry has runs `views[0]`, and the row gets a mark. The `.view` tab and inline blocks never read it | |
| `_icon` | a Lucide icon name (`rocket`) or `pack:name` | table icon | icon of the row and the pin. An unknown name shows the default icon | `icon` |
| `_color` | palette name or CSS color | none | icon color. Without `_icon` it colors the default table icon | `color` |
| `_title_color` | CSS color, **quoted** (`"#3498db"`) | none | text color of the row. It works without `_icon`. An unquoted `#...` is a YAML comment, so the value is empty | `title_color` |
| `_list_properties_display` | list of property names | none | value pills on the rail list rows. It reads only frontmatter keys, so `file.*` and `formula.*` never render | `list_properties_display` |

- Booleans are `true`/`false` without quotes. `"true"` is a string and is ignored.
- A misspelled key (`rail: true`) is ignored with no mark.
- Aliases fold only at the top level, and the later spelling wins. `_group`, `_rail`, `_rail_view` and `_open_in_editor` have no alias.

## Query keys

**Top level**

| Key | Value | Effect |
|---|---|---|
| `filters` | an expression string, or a map of `and:` / `or:` / `not:` lists whose items are expressions or nested maps | applies to every entry of `views`, ANDed with each entry's own `filters`. It is checked when the view runs, not at parse time |
| `formulas` | map of name to expression **string** | computed columns `formula.<name>`. A non-string value fails the parse. A formula that fails returns empty, with no message |
| `properties` | map of column to `{ displayName: "..." }` | table header text only |

**Per entry of `views`**

| Key | Value | Effect |
|---|---|---|
| `type`, `name` | see the contract | required |
| `filters` | as at the top level | this entry only |
| `sort` | list of `{ column, direction }`, where `direction` is exactly `ASC` or `DESC` (uppercase, required). `property` is accepted for `column` | order of the rows. It replaces `_sort` and the notes' `_order` pins |
| `limit` | an integer of at least 1 | applied last, after the row rule and the order. `2.5` keeps 2 rows, `.nan` applies no limit, `.inf` returns everything **(changes: open-itens/069)** |
| `order` | list of column keys | the table columns, in order. Without it the table shows `file.name` plus **every** key of every matched note, `_*` keys included, so always write `order` |
| `dateProperty` | property name | start date. Required by `calendar` and `linear-calendar` |
| `endDateProperty` | property name | end date of multi-day notes |
| `weekStartDay` | bare integer 0 (Sunday) to 6 | first weekday of `calendar`. Default `1`. A quoted or out-of-range value skews the labels |
| `colorProperty` | property name | bar color, `linear-calendar` only |
| `columnSize`, `groupBy`, `summaries` | | accepted and unused (`columnSize` must be a map) |

**Column and sort keys** resolve only:
- `file.name`, `file.basename`, `file.path`, `file.folder`, `file.ext`, `file.size`, `file.ctime`, `file.mtime`;
- `formula.<name>`;
- the exact frontmatter key.

`file.tags`, `file.properties`, `note.x`, `property.x` and the alias `type` read empty in columns and sorts, though filters resolve them **(changes: open-itens/067)**. Sort by `_type`, not `type`.

**DESC puts notes without the value first**, including inside a "top N" `limit` **(changes: open-itens/068)**. For a top N, filter out empty values (`"!isEmpty(priority)"`).

## Filter expressions

**Syntax**
- Operators: `== != > < >= <= && || ! + - * / %`. There is no `===`, which is a parse error.
- Strings take `'` or `"`, with `\` to escape. Numbers need a leading digit (`0.5`, not `.5`). `true`/`false` are booleans. There is no `null` literal: `null` reads a property named `null`, which is empty, so `x == null` works only while no note has a `null` key. Prefer `isEmpty(x)`.
- Identifiers use ASCII letters, digits, `_`, and `-` followed by a letter: `due-date` is one name, `a-1` is a subtraction. A property whose name has a space or a non-ASCII letter cannot be referenced: `file.hasProperty('due date')` tests only that the key exists, and its value cannot be read in a filter.
- `!` binds tighter than `==`: write `!(status == 'done')` or `status != 'done'`.
- Array literals exist. There is no indexing, ternary, `??` or `in`.
- `note.x` and `property.x` read the frontmatter key `x`. A dotted name like `meta.title` reads a key literally named `meta.title`.

**Semantics**
- `type` is an alias of `_type` (the only identifier alias). Comparing either to a literal ignores case: `type == 'project'` matches `Project`.
- `organized`, `archived`, `favorite` are always-present booleans (`organized` defaults to `true`). They are not aliases of `_organized` / `_archived` / `_favorite`.
- `==` is JavaScript's loose `==`, so `p == false` also matches `0`, `''` and `'0'`.
- Frontmatter dates are strings. Wrap them in `date()` for arithmetic: `date(due) - today()` is milliseconds, while `due - today()` is NaN. Comparisons with a Date on one side (`due < today()`) parse ISO strings. A missing or non-ISO value makes them false, so the note drops out.
- `today() - '7d'` and `today() + '2w'` shift a date by a duration string. `duration('7d')` is a number of milliseconds, not a date.
- Dividing by zero gives null. A filter that evaluates to NaN keeps the row.

**Functions:** `if`, `now`, `today`, `date`, `number`, `contains`, `startsWith`, `endsWith`, `isEmpty`, `max`, `min`, `list`, `duration`, plus the display helpers `link`, `image`, `icon`, `html`, `badge`, `progress`, `color`, `escapeHTML`. `contains`, `startsWith` and `endsWith` are case-insensitive and stringify their first argument, so `contains(tags, 'x')` is a substring test.

**`file.*`**
- Fields: `name` (with extension), `basename`, `path`, `folder` (absolute), `ext`, `size`, `ctime`, `mtime` (Dates), `tags`, `properties`. A just-created note's `ctime`/`mtime` read as 1970 until the index catches up.
- `file.hasTag('a', 'b')` matches any listed tag exactly, ignoring case. Write tags **without `#`**. Nested tags do not match their parent.
- `file.inFolder(path)` takes a **vault-relative** folder (`'Areas/Work'`) and matches that folder and its subfolders, ignoring case and a trailing `/`. The match stops at folder boundaries (`'Proj'` does not match `Projects2/`). An absolute path (starting with `/`) also works, with the same boundary rule.
- `file.hasProperty(key)` is always true for `archived`, `organized`, `favorite` and `tags`.
- `file.asLink(display?)` returns the note as a `[[path]]` string.
- Any other `file.` method does not exist (`hasLink`, `links`).

**Methods** run on the value's runtime type:
- string: `lower`, `title`, `trim`, `replace` (first match), `split`, `slice`, `matches` (regex, case-insensitive), `.length`.
- number: `abs`, `round`, `ceil`, `floor`, `toFixed`.
- date: `format` (`YYYY MMM MM DD HH mm ss ddd`), `relative`, `date`, `time`, `.year` ... `.millisecond`.
- list: `contains` (exact element, case-insensitive), `sort`, `unique`, `join`, `flat`, `slice`, `filter(expr)`, `map(expr)` (with `value`, `index`), `.length`.
- object: `keys`, `values`, `isEmpty`.
- any: `contains`, `startsWith`, `endsWith`, `isEmpty`, `isTruthy`, `isType`, `toString`.

**Errors you see, errors you do not.**
- An error box shows only for a parse error, an unknown plain function, or a malformed `and`/`or`/`not`.
- A method that does not exist for the value's type throws on that note, and the note is silently left out (kept, inside `not:`). So `status.lower()` drops every note whose `status` is a number, a list or empty. Guard it with `isType` or `isEmpty`, or compare without methods **(changes: open-itens/010)**.
- A YAML **list** of strings under `filters:` matches **every** note on every surface, with no error. A map without `and`/`or`/`not` (an Obsidian `{property, operator, value}` shape) is a filter error in the rail and the `.view` tab and matches every note in inline blocks **(changes: open-itens/141)**.

**Prefer `and:` lists to one `&&` string.** The app's Filter panel edits list items one row each. A compound `&&` string becomes one raw row, and New here then cannot tell the note type **(changes: open-itens/142)**.

## Which notes a view lists

- **Always out:** notes in the system folder (Settings > Files & Folders), type definitions (`_type: Type`), and other `.view` files.
- **Archived** notes are out unless a filter (top level or the entry's) cites `archived` or `_archived`. Then the filters decide. `file.hasProperty('archived')` counts as a citation and matches every note, which lets all archived notes back in.
- **Order:** with an entry `sort`, that order, and no pins. Without it, `_sort` (default `modified`, newest first), with each note's `_order` pin on top.
- **`limit`** is applied last.
- **The rail and the `.view` tab** run the filter after a conversion to the Filter panel's rows that is not exact. `x != true` becomes `x == false` (and `x != false` becomes `x == true`), so notes without `x` drop out there but stay in inline blocks. `x == date('X')` becomes `x == 'X'`. `x > '5'` becomes `x > 5`. `{and: []}` becomes an error. An empty `or: []` disappears. **Inline blocks** run the filter as written **(changes: open-itens/141)**. Stick to the plain shapes in § Recipes, and both agree.
- **Inline blocks** run `views[0]` only, read no underscore key, keep the query order (no `_sort`, no pins), cap the table at 50 rows and the linear calendar at 3 lanes, show calendars for the current month or year only **(changes: open-itens/143)**, and render `file.basename` cells empty **(changes: open-itens/067)**.

## How the app picks up a file

- **Timing.** A new or changed `.view` reaches Views, its count and its pin in about 3 to 12 s: the file watcher, a rebuild, then a throttled refresh of 2 s, at most once per 10 s in a burst. A new file can show its default label and icon first.
- **Open tabs win.** A `.view` open with unsaved edits in the app is not reloaded, and its next autosave overwrites the file.
- **Renames are not followed.** Renaming or moving a `.view` from outside breaks a rail pin or pick that names it. The list then says "This view no longer exists".
- **When a view cannot run,** the rail list says why: "This view cannot be shown" with the parse or filter error, and an **Open view** button. In Views, a red mark replaces the count. A grey mark lists the menu keys whose values are ignored.
- **App writes re-serialize the file.** Pin to rail, Change icon, the rail's Sort and Filter, Show in Views and Edit view all drop comments and normalize formatting. Do not rely on comments in a view the user also edits in the app.

## Check

Run this from the repo root, with the `.view` path as the argument. It uses the app's own YAML library and mirrors the checks of `parseCollectionYaml`: fences, duplicate keys, tabs, a missing or empty `views`, a bad `type`, a non-string `name`, a malformed `sort`, `order` or `columnSize`, and non-string `formulas`. It is stricter than the app on `limit`: it wants an integer of at least 1, where the app also accepts `2.5`, `.nan` and `.inf` with surprising results. It does not check filter expressions or menu-key values: review those against § Pitfalls. A full checker is planned in `view-engine-fixes/18`.

```bash
node --input-type=module -e "
import { readFileSync } from 'node:fs';
import { parse } from './node_modules/yaml/dist/index.js';
const errs = [];
try {
  const raw = parse(readFileSync(process.argv[1], 'utf8'));
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) errs.push('top level must be a map');
  else if (!Array.isArray(raw.views) || raw.views.length === 0) errs.push('views must be a non-empty list');
  else raw.views.forEach((v, i) => {
    if (!['table', 'calendar', 'linear-calendar'].includes(v?.type)) errs.push('views[' + i + '].type must be table, calendar or linear-calendar');
    if (typeof v?.name !== 'string' || !v.name) errs.push('views[' + i + '].name must be a non-empty string');
    if (v?.sort !== undefined && !Array.isArray(v.sort)) errs.push('views[' + i + '].sort must be a list');
    else for (const s of v?.sort ?? []) {
      if (typeof (s?.column ?? s?.property) !== 'string' || !(s?.column ?? s?.property)) errs.push('views[' + i + '].sort items need a column');
      if (s?.direction !== 'ASC' && s?.direction !== 'DESC') errs.push('views[' + i + '].sort direction must be ASC or DESC');
    }
    if (v?.order !== undefined && !Array.isArray(v.order)) errs.push('views[' + i + '].order must be a list');
    if (v?.columnSize !== undefined && (typeof v.columnSize !== 'object' || v.columnSize === null || Array.isArray(v.columnSize))) errs.push('views[' + i + '].columnSize must be a map');
    if (v?.limit !== undefined && !(Number.isInteger(v.limit) && v.limit >= 1)) errs.push('views[' + i + '].limit must be an integer of at least 1');
  });
  if (raw && raw.formulas !== undefined && (typeof raw.formulas !== 'object' || raw.formulas === null || Array.isArray(raw.formulas) || Object.values(raw.formulas).some((f) => typeof f !== 'string'))) errs.push('formulas must be a map of name to expression string');
} catch (e) { errs.push(e.message.split('\n')[0]); }
console.log(errs.length ? 'FAIL ' + errs.join('; ') : 'OK');
" path/to/file.view
```

## Recipes

Each recipe uses canonical keys, quotes every name and expression, and has no comments. None was run in the app. Check each one before use.

**Active projects.** An `and:` list keeps each condition editable, and lets New here create a `Project`.
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

**Tagged notes.** Tags go without `#`.
```yaml
_sidebar_label: "Meetings"
views:
  - type: table
    name: "Meetings"
    order: [file.basename, file.ctime]
    filters: "file.hasTag('meeting')"
```

**Recently modified,** the last 7 days, newest 20.
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

**Due in the next 7 days.** Notes without `due` drop out, and ASC keeps empty values last.
```yaml
_sidebar_label: "Due Soon"
views:
  - type: table
    name: "Due Soon"
    order: [file.basename, due, status]
    filters:
      and:
        - "date(due) >= today()"
        - "date(due) <= today() + '7d'"
        - "status != 'done'"
    sort:
      - column: due
        direction: ASC
```

**Folder scope.** Use a vault-relative substring with separators on both sides.
```yaml
_sidebar_label: "Work Area"
views:
  - type: table
    name: "Work Area"
    order: [file.basename, file.folder]
    filters: "contains(file.path, '/Areas/Work/')"
```

**A list in the rail, a calendar in the tab.** `_rail_view` picks the entry the rail runs.
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

**A linear calendar kept out of Views** that opens in the editor (the two keys New table writes).
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

**Archive.** Citing `archived` lets the filter decide.
```yaml
_sidebar_label: "Archive"
_sort: modified
views:
  - type: table
    name: "Archive"
    filters: "archived == true"
```

**Pinned, grouped, with row pills.**
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

**A formula column.** Dates go through `date()`.
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

## Pitfalls

Each of these breaks a view or changes what it lists, usually with no error. Review every one before you finish.

1. A `---` fence or a second document: the parse fails.
2. A duplicate key: the list and the row's count show an error, while the row's label and icon look fine.
3. An unquoted numeric or boolean `name`: the parse fails. An unquoted numeric `_sidebar_label`: ignored.
4. A quoted boolean or number in `_rail`, `_visible`, `_open_in_editor` or `_order`: ignored.
5. An unquoted `_title_color: #fff` or `_color: #fff`: the value is a comment, so it is empty.
6. Lowercase `asc`/`desc`, or a missing `direction`: the parse fails.
7. A query `sort:` list or `order:` list at the **top level**: it folds into `_sort` / `_order` and is ignored. Put them inside an entry of `views`.
8. `filters:` written as a YAML list of strings (every note matches), or as a map without `and`/`or`/`not` (an error in the rail, every note inline).
9. A method that does not exist (`hasLink`, `reverse`, `containsAll`) or does not exist for the value's type: notes silently drop out.
10. `file.hasTag('#x')` never matches.
11. A column or sort key `file.tags`, `note.x`, `property.x` or `type`: empty cells, no ordering.
12. Arithmetic on a raw frontmatter date (`due - today()`): NaN, and a NaN filter keeps every row.
13. `!a == b` parses as `(!a) == b`, and `===` is a parse error.
14. DESC with `limit`: notes without the value fill the top.
15. Renaming or removing the entry `_rail_view` names, without updating `_rail_view`: the rail runs `views[0]`.
16. Writing a `.view` the user has open with unsaved changes: the app overwrites your edit.
17. `file.hasProperty('archived')` in a filter: every archived note comes back.
18. A non-string `dateProperty`, or a quoted or out-of-range `weekStartDay`: the calendar breaks or skews.
19. No `order` on a table: every frontmatter key of every note becomes a column.
20. A formula named like a property (`status`): in filters and other formulas, the name reads the formula, not the property.

## Sources

Read these when this reference and the app disagree. Then fix this file.
- Format and parse errors: `src/lib/features/collection/yaml-parser.ts` (`parseCollectionYaml`, `railViewIndex`).
- Menu-key readers and the ignored-value marks: `src/lib/features/type-definitions/type-sidebar.logic.ts` (`getView*`, `RESERVED_KEY_RULES`). The rail pins: `pinnedRailItems` in `src/lib/features/rail-shell/lens.logic.ts`.
- Aliases: `src-tauri/src/vault/aliases.rs`, and its TS mirror `src/lib/utils/frontmatter-aliases.ts`.
- Expressions: `src/lib/features/collection/expression/` (`tokenizer.ts`, `parser.ts`, `evaluator.ts`, `methods.logic.ts`).
- Query, columns and sort: `src/lib/features/collection/collection.logic.ts` (`executeQuery`, `getPropertyValue`).
- Row rule: `viewRowSet` and `blockRowSet` in `src/lib/features/rail-shell/lens.logic.ts`.
- User docs: `help/documentation/25-types-and-relationships.md` § View Files, and `help/documentation/12-collection.md`.
- The research behind this file: `.scratch/archived/view-editor/research/synthesis-reference-facts.md`.
