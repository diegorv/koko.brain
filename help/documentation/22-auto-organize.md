# Auto Organize

Formerly called Auto Move.

Automatically move notes into folders and set their properties, icons and colors when they are saved, based on rules you define.

**Open:** `Cmd+,` → **Auto Organize** section in Settings.

---

## Overview

Auto Organize watches every file save. When a note is saved, Kokobrain evaluates your rules against that note's content and properties. A rule is a **filter** (which notes it applies to) plus one or more **actions**: rename the note, move it to a folder, set properties in its frontmatter, create another note, run a mod action, or any mix of them. No manual drag-and-drop or typing. A `.view` file is never moved, even when a rule matches it.

This rule, as stored in `.kokobrain/auto-organize-rules.json`, reads: **when** a note's type is Project and its status is `done`, **move it to** `Projects/Done/<current year>` **and set** its icon to a check mark and the icon's color to green.

```json
{
  "id": "rule-1710000000000-p1d2n",
  "name": "Finished projects",
  "expression": "type == \"project\" && status == \"done\"",
  "destination": "Projects/Done/{year}",
  "properties": [
    { "key": "_icon", "value": "lucide:circle-check", "mode": "always" },
    { "key": "_color", "value": "green", "mode": "always" }
  ],
  "enabled": true
}
```

The rest of this page covers [Filters](#filters), [Actions](#actions) and complete [Examples](#examples).

## Enabling Auto Organize

1. Open **Settings** (`Cmd+,`).
2. Go to the **Auto Organize** section.
3. Toggle **Enable Auto Organize** on.

When disabled, no files are ever moved or changed, regardless of how many rules you have configured.

## How Rules Work

Rules are evaluated in order, top to bottom, against the note as it is a few seconds after the save (see [Debounce Delay](#debounce-delay)). **Every matching rule applies its properties**, **the first matching rule with a new name renames the note**, and **the first matching rule with a destination moves it**. A later rule with a name or a destination does not rename or move it again. In one save the note is renamed first, then moved, then its properties are written at its final path, then the notes to create are created. Last, **the first matching rule with a mod action runs it** on the note at its final path.

Each rule consists of:

| Field | Description |
|-------|-------------|
| **Name** | A human-readable label for the rule (e.g. "Archive completed projects") |
| **Filter** | The notes the rule applies to, built with the same filter builder as a view (see [Filters](#filters)) |
| **Rename** (optional) | The note's new name, from a name template or an expression (see [Renaming notes](#renaming-notes)) |
| **Move to folder** (optional) | Target folder path, relative to the vault root. Supports `{variable}` templates (see [Dynamic Destinations](#dynamic-destinations)). Leave it empty for a rule that does not move the note |
| **Properties** (optional) | Properties written to the note's frontmatter when the rule matches (see [Set properties](#set-properties)) |
| **Create note** (optional) | Another note created when the rule matches, if it does not exist yet (see [Creating notes](#creating-notes)) |
| **Run mod action** (optional) | A vault mod's action run on the note (see [Running a mod action](#running-a-mod-action)) |
| **Enabled** | Individual toggle: you can disable a rule without deleting it. A new rule starts disabled |
| **Icon** (optional, legacy) | An icon applied to the file after it is moved (see [Icon (legacy)](#icon-legacy)) |

## Creating a Rule in Settings

1. Open **Settings** (`Cmd+,`) → **Auto Organize** and click **Add rule**. The new rule starts **disabled**, so it changes nothing while you write it.
2. Give it a **name** and build its **Filter**. Adding, removing or changing a condition is saved at once; a value you type is saved when you leave the field or press Enter, not on every keystroke. A condition with no value is not saved, and Settings shows **Every filter needs a value** until you fill it in. Under the filter, **Matches N notes now** counts the notes it matches right now. Check it: a count close to all your notes usually means a typo, such as a misspelled property name.
3. Under **Then**, pick what the rule does:
   - **Rename:** pick **Name** for a name template such as `{year}-{month} Meeting`, or **Expression** to compute the name, such as `title`. Leave it empty for a rule that does not rename notes. A name built from the note's own name is not saved, and Settings says why (see [Renaming notes](#renaming-notes)).
   - **Move to folder:** the destination folder. Leave it empty for a rule that does not move notes.
   - **Create note:** the path of a note to create, such as `{folder}/{basename} follow-up.md`. Leave it empty for a rule that creates nothing. Once a path is set, pick a **template**, add the new note's properties with **Add note property**, and turn on **Open it** to open the note in a tab (see [Creating notes](#creating-notes)).
   - **Run mod action:** pick an action of a loaded mod, or **None**. Only the actions a mod offers to rules are listed (see [Running a mod action](#running-a-mod-action)).
   - **Set properties:** click **Add property** for each property. Type or pick the **key** (the field suggests the properties your notes already use), set the **value** or switch the row to an **Expression** (see [Computed values](#computed-values)), and pick the mode: **if missing** (the default), **always**, **remove** or **add to list** (see [Set properties](#set-properties)). A **remove** row has no value field; an **add to list** row takes the items separated by commas. The **×** button deletes the row from the rule.
4. Turn the rule's toggle on when it is ready.

A rule with no new name, no folder, no property, no note to create and no mod action does nothing. Settings says so under the rule, and still saves it.

> [!TIP]
> Open [Collection](12-collection.md) to experiment with a filter before adding it as a rule. A Collection view uses the same expression engine, so you can check which notes it matches there first.

## Filters

A filter decides which notes a rule applies to. It uses the same language as [Collection](12-collection.md) filters, evaluated against the note's frontmatter properties and file metadata.

### The filter builder

The filter is edited with the same builder as a [Collection](12-collection.md) view's filters. Click **Add filter** to add a condition, pick a property and an operator, and type a value. Conditions sit in a group, and the group's menu says how they combine:

| Group | The rule matches a note when | Saved as |
|-------|------------------------------|----------|
| **All the following are true** | every condition is true | `"and": [...]` |
| **Any of the following are true** | at least one condition is true | `"or": [...]` |
| **None of the following are true** | no condition is true | `"not": [...]` |

The exception: a filter whose only group is **All** or **Any** and holds a single condition is saved as that condition's plain string, and opens again as **All**.

One example of each, as stored in `.kokobrain/auto-organize-rules.json`:

```json
"expression": { "and": ["status == 'done'", "file.hasTag('project')"] }
```
Finished notes tagged `project`.

```json
"expression": { "or": ["status == 'done'", "status == 'dropped'"] }
```
Notes that are done or dropped.

```json
"expression": { "not": ["file.hasTag('keep')"] }
```
Notes without the tag `keep`.

For a condition the property, operator and value fields cannot express, such as `file.hasTag('project')` or `file.inFolder('Inbox')`, click **Add expression** below the builder and type the condition as text. The row joins the first group, or starts an **All** group when there is none, and is saved when you leave the field.

When a filter has several groups, a note must pass all of them. To mix "and" and "or" in one condition, such as `(A and B) or C`, write it as an expression row:

```
(status == "done" && type == "project") || file.hasTag("archive")
```

A condition the builder cannot show as property, operator and value, such as the one above, appears as an expression row you edit as text. A rule saved with a plain expression string keeps working and shows as one row.

A filter with no conditions matches no note, and so does one with a condition that does not parse or has no value. Kokobrain logs such a rule as failed instead of applying it to every note.

### What a filter can use

Each condition, and each expression row, is one expression. The most useful parts for rules, with one example each:

| What | Example | Matches notes where |
|------|---------|---------------------|
| Comparison: `==`, `!=`, `<`, `>`, `<=`, `>=` | `priority >= 2` | `priority` is 2 or more |
| Combining: `&&` (and), `\|\|` (or), `!` (not), parentheses | `!(status == "done" \|\| status == "dropped")` | the status is neither `done` nor `dropped` |
| `file.name`, `file.basename` | `file.basename == "Index"` | the file is named `Index.md` (`file.name` includes the extension) |
| `file.folder`, `file.path` | `file.folder.endsWith("/Inbox")` | the note sits directly in a folder named `Inbox`. Both are absolute paths, so compare their end |
| `file.ext` | `file.ext == ".md"` | the extension, with its dot |
| `file.tags` | `file.tags.contains("project")` | the note has the tag `project` in its frontmatter or body |
| `file.hasTag(tag, ...)` | `file.hasTag("project", "client")` | the note has any of the tags (case-insensitive) |
| `file.inFolder(folder)` | `file.inFolder("work/clients")` | the note is in `work/clients` or a subfolder. The folder is vault-relative (see [`file.inFolder()`](12-collection.md#fileinfolder-takes-a-vault-relative-folder)) |
| `file.hasProperty(key)` | `file.hasProperty("due")` | the frontmatter has a `due` key, whatever its value |
| `contains()` | `contains(file.path, "meetings")` | the path contains `meetings` (case-insensitive). On a list, `tags.contains("x")` checks for an item |
| `startsWith()` | `startsWith(file.basename, "Meeting")` | the name starts with `Meeting` (case-insensitive) |
| `isEmpty()` | `isEmpty(owner)` | `owner` is missing, `""` or an empty list |
| `today()`, `now()` | `due < today()` | `due` is before today. `today()` is midnight, `now()` the current moment |
| `date()` | `due >= date("2026-01-01")` | `due` is on or after 1 January 2026 |
| Durations | `due <= today() + "7d"` | `due` is within the next 7 days. `"1h 30m"`, `"2 weeks"` and `"1M"` work too |

For every function, method and operator, see the [Expression Language Reference](12-collection.md#expression-language-reference).

### Traps

Each trap below shows a filter that looks right but is wrong, and the form that works.

**Icon and color keys need their underscore.** In a note's frontmatter `icon: lucide:star` is stored as `_icon`, but a filter reads the name exactly as you write it.

| Wrong | Right |
|-------|-------|
| `color == "red"` | `_color == "red"` |
| `icon == "lucide:star"` | `_icon == "lucide:star"` |
| `title_color == "gray"` | `_title_color == "gray"` |

`type` is the one alias a filter understands: `type == "meeting"` and `_type == "meeting"` are the same.

**Archived, organized and favorite have two spellings.** `archived`, `organized` and `favorite` are always present as `true` or `false`, even on a note that never wrote the key. `_archived`, `_organized` and `_favorite` are the raw frontmatter values, `null` when absent. Use the flag spelling for "is it archived" (see [Collection](12-collection.md#archived-and-_archived-are-different-fields-not-aliases)).

| Wrong | Right |
|-------|-------|
| `_archived == false` (misses every note without the key) | `!archived` or `archived == false` |

**A misspelled property is empty, not an error.** A property the note lacks reads as `null`, so a typo never fails: it matches everything or nothing. `stauts == null` is true for every note. Check **Matches N notes now** under the builder before you turn a rule on.

| Wrong | Right |
|-------|-------|
| `stauts == null` | `status == null` |

**A method on a missing property fails.** `status.lower() == "done"` throws on a note without `status`, because there is no value to call `.lower()` on. The rule is skipped for that note and the failure is logged, whether the filter is a single expression or built in the builder, and even inside **None of the following are true**. Notes that have `status` are still checked as usual. A misspelled method such as `status.lowr()` fails the same way, on every note, and **Matches N notes now** shows 0.

A Collection view counts such a condition as false instead, so inside **None of the following are true** the view shows every note without the property.

| Wrong | Right |
|-------|-------|
| `status.lower() == "done"` | `status == "done"`, or `!isEmpty(status) && status.lower() == "done"` |

**Property names in a filter are limited.** A name may hold letters, digits, `_`, and a hyphen followed by a letter (`due-date`). It may not start with a digit, and may not hold spaces, accents or other symbols. A property named `título` or `2nd review` cannot be compared in a filter, though `file.hasProperty("título")` still checks that it exists. Because `a-b` reads as one name, write subtraction with spaces.

| Wrong | Right |
|-------|-------|
| `total-spent > 100` (reads a property named `total-spent`) | `total - spent > 100` |

**The file's dates and size lag one save behind.** A rule reads `file.mtime`, `file.ctime` and `file.size` from the note's entry in the vault index, as of its last refresh: usually the previous save, not this one. A note the index has not picked up yet, such as one created a few seconds ago, gets the moment of the save for both dates and its current length for the size. Do not filter rules on `file.mtime`: the save that makes a note fresh still sees its old date.

| Wrong | Right |
|-------|-------|
| `file.mtime < today() - "30d"` (also matches the note you are editing) | a frontmatter date, such as `reviewed < today() - "30d"` |

**Date conditions are checked only when the note is saved.** `due < today()` does not fire at midnight: a note whose `due` passes overnight is organized at its next save.

## Actions

A rule can do these things when its filter matches, in any combination:

- **[Rename](#renaming-notes):** renames the note from a name template or an expression, such as `2026-11 Meeting` for a meeting note. Links to it are updated.
- **[Move to folder](#move-to-folder):** moves the note to a destination folder, which can depend on the note ([Dynamic Destinations](#dynamic-destinations)). Notes in [Excluded Folders](#excluded-folders) are never checked.
- **[Set properties](#set-properties):** writes frontmatter properties (`if-missing` or `always`), removes them (`remove`) or adds items to a list (`add`). A value can be [computed](#computed-values) from the note. Icons and colors are properties (`_icon`, `_color`, `_title_color`).
- **[Create note](#creating-notes):** creates another note, such as a meeting follow-up, when it does not exist yet, from a template and with its own properties.
- **[Run mod action](#running-a-mod-action):** runs an action of a [vault mod](28-mods.md) on the note, for what the built-in actions cannot do.
- **[Icon (legacy)](#icon-legacy):** the older way to give a moved note an icon. Use properties instead.

### Move to folder

The destination is a folder path relative to the vault root. An empty destination does not move the note. A destination template that resolves to an empty path, such as `{parent}` on a note in a top-level folder, moves the note to the vault root.

If the note is already in the destination folder, Kokobrain skips the move but still writes the rule's properties and legacy icon.

#### Dynamic Destinations

Destination paths support `{variable}` templates that are resolved at move time based on the note's properties and location. This works in **all rules**: both user-defined rules and auto-generated [lifecycle rules](#type-driven-lifecycle-rules).

| Variable | Value | Example |
|----------|-------|---------|
| `{folder}` | Current vault-relative folder of the note | `work/squad-payments` |
| `{parent}` | Parent of the current folder | `work` |
| `{basename}` | Filename without extension | `Migrate-Gateway` |
| `{type}` | Frontmatter `_type` property (the note's type), first letter uppercased (`type: project` gives `Project`) | `Project` |
| `{status}` | Frontmatter `status` property | `done` |
| `{year}` | Current year | `2026` |
| `{month}` | Current month (zero-padded) | `05` |

Examples:

```
{folder}/_archive
```
Move to an `_archive` subfolder within the note's current folder. A note in `work/squad-payments/` moves to `work/squad-payments/_archive/`.

```
Archive/{type}/{year}
```
Move to a type-organized archive by year. A project archived in 2026 moves to `Archive/Project/2026/`.

```
{folder}/_archive/{status}
```
Combine folder-relative archiving with status. A done project in `work/` moves to `work/_archive/done/`.

Unknown variables are left as-is in the path.

#### Excluded Folders

You can define folders that are **never** evaluated by Auto Organize, even if a rule would match. This is useful for:

- Template folders (`_templates`)
- Daily notes folder (`_notes`)
- Any folder you want to keep static

Files inside excluded folders are skipped entirely: no evaluation, no moves, no property writes.

### Set properties

A rule can set properties on the notes it matches, with or without moving them. Each property has a **key**, a **value** and a **mode**:

| Mode | Changes the note when |
|------|----------------------|
| `if-missing` | the note does not have the property, or it is empty (`""`, an empty list, or no value). `false` and `0` count as set |
| `always` | the note's value is different. A list is replaced as a whole |
| `remove` | the note has the property, whatever its value. The property is deleted. A `remove` has no value, and any value it has is ignored |
| `add` | an item is missing from the list. Each missing item is appended, and the items already there keep their order |

The value is written with its own type: `true` and `false` as booleans, numbers as numbers, `["a", "b"]` as a list, and anything in quotes as text. A link such as `[[AWS]]` is written in quotes, so it stays a link.

**`remove`** deletes the property:

```json
{ "key": "status", "mode": "remove" }
```

A note with `status: draft` loses the `status` line. A note without `status` is not written.

**`add`** adds items to a list property without replacing it. Its value is one item (`"work"`) or a list of items (`["work", "q3"]`):

```json
{ "key": "tags", "value": "work", "mode": "add" }
```

`tags: [a]` becomes `tags: [a, work]`, and `tags: [a, work]` is left unchanged. Items compare as exact text. If the note has no value, a new list is created with the items; a single text value becomes a list, that value first. A number or a yes/no value is never turned into a list: the rule writes nothing to it, and Kokobrain logs it once per rule. Items are trimmed and blank items are ignored, and an `add` with no item left is ignored.

On `tags`, `add` compares tags without a leading `#`, so `#work` and `work` are the same tag, and adds them without it. Both `add` and `remove` change only the frontmatter `tags` list: inline `#tags` in the note's body are never touched.

> [!WARNING]
> `remove` on `tags` deletes **every** frontmatter tag, not one tag. Removing a single tag is not supported. `{ "key": "tags", "value": "draft", "mode": "remove" }` does not remove `draft`: it ignores the value and clears the whole `tags` list.

`remove` on `_organized`, `_archived` or `_favorite` puts the note back to the default: organized, not archived, not a favorite. It does not move a note out of its type's archive folder: the [unarchive rule](#automatic-unarchiving) looks for `_archived: false`, and a note without the key does not have it. To unarchive a note, use `always` with `_archived: false`.

#### Computed values

Instead of a `value`, a property can have an `expr`: an expression, written in the same language as the [filter](#what-a-filter-can-use) and evaluated against the same note. Its result is written. An entry has a `value` or an `expr`, never both; one with both or neither is ignored.

```json
{ "key": "due", "expr": "today() + \"7d\"", "mode": "if-missing" }
```

```json
{ "key": "title", "expr": "file.basename", "mode": "if-missing" }
```

```json
{ "key": "area", "expr": "file.folder.split(\"/\").slice(-1).join(\"\")", "mode": "always" }
```

The first gives a new note a due date one week ahead, the second copies the file name into `title`, and the third writes the name of the note's folder (`Alpha` for `projects/Alpha/note.md`).

The result is written with its own type: text, a number, `true` / `false` and a list of text as they are. A date is written as the local day, `2026-06-17`. When the expression uses `now()`, the time is written too: `2026-06-10T15:04:05`. With `add`, the result must be text or a list of text, and its items are added. On `_organized`, `_archived` and `_favorite`, only a `true` / `false` result is written.

When the expression fails, nothing is written to that property, and Kokobrain logs it once per rule. It fails when it has an error (an unknown method such as `.last()`), when its result is empty (a property the note does not have), when it is not a number (`NaN`), when it is an invalid date (`date("junk")`), or when it has the wrong type for the key or the mode. The property still belongs to the rule, so a lower rule does not write it either.

**Values that change on every save** work only with `if-missing`. An expression that uses `now()`, `file.mtime`, `file.ctime` or `file.size` would rewrite the note on every save with `always`, and append an item on every save with `add`. Such an entry is ignored, and logged, when the rules load, and Settings does not save it. With `if-missing` it is written once, for example to stamp a creation date:

```json
{ "key": "created", "expr": "file.ctime", "mode": "if-missing" }
```

Things to know:

- `+` adds numbers and durations, not text: `"Note " + file.basename` is `NaN`, so nothing is written. Build text with a list: `["Note ", file.basename].join("")`.
- Durations are fixed lengths: across a daylight-saving change, `today() + "7d"` can land one day early.
- The expression sees the note as the filter does, before the rule moves it. In a rule that also moves the note, `file.folder` and `file.path` are the old location.
- `file.mtime`, `file.ctime` and `file.size` lag one save behind (see [Traps](#traps)).

In Settings, the menu next to the key switches a row between **Value** and **Expression**. An expression is checked when you leave the field: an error, or a value that changes on every save with **always** or **add to list**, is shown under the row and not saved. Under a valid expression, a line such as **Result for Alpha: projects** shows what it gives for the note open in the editor (here `Alpha`), or **no value** when it fails there.

In Settings, the value field adapts to the key:

| Key | Value field |
|-----|-------------|
| `_organized`, `_archived`, `_favorite` | A yes/no toggle. These keys accept only `true` or `false` |
| `_icon` | **Pick icon** opens the icon picker. The icon is saved as `pack:name`, such as `lucide:cloud` |
| `_color`, `_title_color` | **Pick color** opens the icon picker's colors. On a `_color` row, pick from the **Icon** colors; on a `_title_color` row, from the **Text** colors |
| Any other key | Text. Pick **Yes/no** in the type menu next to the key for a `true` / `false` value |

A **remove** row has no value field. An **add to list** row has one text field, whatever the key: type the items separated by commas, such as `work, q3`.

For **if missing** and **always**, numbers and lists have no editor in Settings. Write them in `.kokobrain/auto-organize-rules.json` (see [Configuration File](#configuration-file)); Settings shows them read-only.

**Icons and colors** are properties like any other: `_icon` (`pack:name`), `_color` (the icon's color: a palette name such as `red`, `green` or `gray`, or a CSS color; on a note with no `_icon` it colors the default note icon) and `_title_color` (the title's color). See [File Icons](02-file-explorer.md#frontmatter-icons).

How properties combine:

- Every matching rule applies its properties, top to bottom. When two matching rules set the same property, the higher rule wins, even when its `if-missing` writes nothing because the note already has a value. This holds for every mode: two rules cannot both `add` to one property, and only the higher one's items are added.
- `icon` and `_icon` (and the other [frontmatter key aliases](25-types-and-relationships.md#frontmatter-key-aliases)) are the same property.
- When the rule also moves the note, the move happens first and the properties are written at the new location. If the move fails, nothing is written.
- A note the rules leave unchanged is never rewritten.
- `todoist_project` cannot be set or removed by a rule, and `_organized`, `_archived` and `_favorite` accept only `true` or `false` (or `remove`). Entries that break these rules are ignored.

Rules never write properties to:

- files that are not Markdown notes (canvas, Kanban boards and other files);
- notes in the system folder (`_system` by default) or the templates folder;
- type definitions (notes with `type: Type`), because every note of the type inherits their icon and color;
- notes whose frontmatter Kokobrain cannot rewrite without losing something (comments, nested values, duplicate keys) or whose `---` block is broken.

> [!WARNING]
> Rules run on **any** save of a note: yours, and those made by Todoist sync, the calendar, the Inbox and Archive buttons, and mods. A broad filter, or a typo in a property name, stamps every note that any of them saves. `stauts == null` is true for every note, so a rule with that filter would write to every note anyone saves.

Things to know:

- `always` rewrites a manual change within seconds, because editing a property in the Properties panel is a save. Do not use `always` on properties the calendar, meta-bind or the Inbox and Archive buttons set, unless the rule should win over them.
- `if-missing` on `_organized` or `_archived` sends notes to the Inbox or the Archive. A note given `_archived: true` by a rule moves to its archive folder only at its next save.
- A new rule applies to a note at that note's next save. It never touches notes nobody saves.
- A rule never runs because of another rule's write. If rule B's filter checks a property rule A sets, B applies at the note's next save.
- A rule's write cannot be undone with `Cmd+Z`. To restore a version from [File History](15-file-history.md), disable the rule first, or it writes again at the next save.
- Renaming a note or a type does not update the values inside rules. A `[[link]]` value goes stale.
- A mod that writes the same property as an `always` rule when a note is saved will fight it.

### Creating notes

A rule can create another note when a note matches: a meeting follow-up, a project's tasks page, a hub note for a topic. Its `createNote` has a `path`, and optionally a `template`, `properties` and `open`:

```json
{
  "id": "rule-1710000000000-f0l1w",
  "name": "Meeting follow-ups",
  "expression": "type == \"meeting\"",
  "destination": "",
  "createNote": {
    "path": "{folder}/{basename} follow-up.md",
    "template": "_system/templates/Follow-up.md",
    "properties": [
      { "key": "status", "value": "todo", "mode": "if-missing" },
      { "key": "meeting", "expr": "[\"[[\", file.basename, \"]]\"].join(\"\")", "mode": "if-missing" }
    ],
    "open": true
  },
  "enabled": true
}
```

Saving `work/Standup.md` with `type: meeting` creates `work/Standup follow-up.md` from the template, with `status: todo` and `meeting: "[[Standup]]"`, and opens it in a tab behind the one you are in.

- **`path`** is relative to the vault root and ends in `.md`. It takes the same `{variable}` templates as a destination (see [Dynamic Destinations](#dynamic-destinations)), read from the saved note. Use `{folder}` for the saved note's folder: `{parent}` is the folder above it. A missing folder is created.
- **`template`** is the path of a note, relative to the vault root, whose content the new note starts with. Its `<% %>` expressions are filled in as for any [template](09-quick-notes-and-templates.md), with the new note's name as its title. If the template does not exist, nothing is created, and Kokobrain logs it once per rule.
- **`properties`** are written to the new note's frontmatter, over the template's, with the same modes as [Set properties](#set-properties), except `remove`. A [computed value](#computed-values) and its `file.*` fields read the **saved note**, not the new one.
- **`open`**: `true` opens the new note in a tab without leaving the one you are in. It is `false` by default.

**Only when missing.** If a note exists at the path, nothing is created and the existing note is not changed. That is why the next save of the meeting does not create a second follow-up.

Things to know:

- Every matching rule creates its note. One save creates at most **5** notes; past that, the rest are not created, and Kokobrain logs it once per rule.
- A note is never created inside the system folder (`_system` by default), the templates folder or an [excluded folder](#excluded-folders), or at a path that leaves the vault (a `..` in the path, which a property such as `{status}` can bring in), or at a path with no file name (`{status}.md` on a note without `status`). A path or template that starts with `/`, or a template with a `..`, creates nothing. Settings shows why next to one written in the file, and does not save one typed there.
- A rule creates nothing for a note it would not write properties to (see [Set properties](#set-properties)): the system and templates folders, type definitions and frontmatter Kokobrain cannot rewrite.
- **The new note is not checked against the rules when it is created.** The rules check it at its first save, like any other note.
- **A note that would match its own rule is not created.** With a filter such as `type == "meeting"` and a template that sets `type: meeting`, or a path inside the folder the filter checks, every follow-up would create its own follow-up. Kokobrain creates nothing and logs it once per rule. Give the follow-up a different type, or put it outside the filtered folder.
- When the rule also moves the note, the move happens first, and the path is read from the note at its new location. If the move fails, nothing is created.

In Settings, under the filter, **Would create N notes now** estimates the notes the rule would create right now: the different paths its matching notes outside the protected and excluded folders give that do not exist yet and are not in a protected or excluded folder. It reads each path at the note's current folder, before any move the rule makes, so it can differ from what a save creates.

**Linking the two notes** is not automatic. The new note can link back with a computed property, as `meeting` does above. For a link from the saved note to the new one, add a property to the same rule, which the saved note gets:

```json
{ "key": "follow_up", "expr": "[\"[[\", file.basename, \" follow-up]]\"].join(\"\")", "mode": "if-missing" }
```

### Renaming notes

A rule can rename a note when it matches. Its `rename` has either a `name`, a file-name template with the same `{variable}`s as a destination (see [Dynamic Destinations](#dynamic-destinations)), or an `expr`, an expression computed from the note like a [computed value](#computed-values). The note keeps its extension (`.md`).

```json
{
  "id": "rule-1710000000000-m3t1n",
  "name": "Name meetings by month",
  "expression": "type == \"meeting\"",
  "destination": "",
  "rename": { "name": "{year}-{month} Meeting" },
  "enabled": true
}
```

Saving `work/standup.md` with `type: meeting` in November 2026 renames it to `work/2026-11 Meeting.md`. `{year}` and `{month}` are the month of the save, not of the note: saved again in December, the same note is renamed to `2026-12 Meeting.md`. A name from a property works the same way: `"rename": { "expr": "title" }` names the note after its `title`, and a name built from a date property, such as `"expr": "meeting_date"`, stays the same whenever the note is saved.

- **Links follow.** Every `[[link]]` to the note is updated, and an open tab follows it. The notes whose links are updated are not checked against the rules for that.
- **Order:** the rename comes first, then the move, then the properties, then the notes to create, all in the same save. Every later step reads the **new** name: a destination with `{basename}`, a computed `file.basename` and a create-note path all use it.
- **A name that is taken** gets a number: `2026-11 Meeting 2.md`, then `2026-11 Meeting 3.md`, the first free one. When the rule also moves the note, the name must be free in the folder the note ends in, so the move never fails on it.
- **Already named.** A note named `<name>.md` or `<name> N.md`, in any letter case, is left alone, so `2026-11 Meeting 2` is not renamed again at its next save. A note you named `2026-11 Meeting 5` yourself counts as named too.
- **Never from its own name.** A name that uses `{basename}`, or an expression that reads `file.basename`, `file.name` or `file.path`, would rename the note again at every save, and the name would keep growing. Such a rename renames nothing. Settings shows why next to one written in the file, and does not save one typed there.
- **Characters** a file name cannot hold (`/ \ : * ? " < > |`) become `-`, spaces at both ends are trimmed, and leading dots are dropped. A name that ends up empty, such as `{status}` on a note without `status`, renames nothing.
- **Expression results:** text is used as is, a number as its digits, a date as `YYYY-MM-DD`, and with `now()` as `YYYY-MM-DD HH-mm`. A list, yes/no or no value renames nothing, and Kokobrain logs it once per rule.
- **The note you are typing in** is not renamed while it has unsaved edits. It is renamed at a later save, once nothing is pending. The rest of the rule still runs.
- **Names that change on their own.** A name built from `now()` or `file.mtime` is different at every save, so the note is renamed at every save, and one built from `{year}` or `{month}` changes when the month of the save does. That is allowed. Combined with a [create note](#creating-notes) whose path uses `{basename}`, it creates a new note at every save.
- A note is never renamed in the system folder (`_system` by default) or the templates folder, nor when it is a type definition, a note with a `todoist_project` property (Todoist would rename the project), a file that is not Markdown, or frontmatter Kokobrain cannot rewrite (the notes [Set properties](#set-properties) skips).
- If the rename fails, nothing else in the rule runs for that save.

### Running a mod action

A rule can run an action of a [vault mod](28-mods.md) on the note it matched. Its `runAction` names the action by its id, `mod:<mod id>:action:<action id>`:

```json
{
  "id": "rule-1710000000000-s5m4r",
  "name": "Summarize finished meetings",
  "expression": "type == \"meeting\" && status == \"done\" && summarized != true",
  "destination": "",
  "runAction": { "id": "mod:ai-tools:action:summarize" },
  "enabled": true
}
```

- **Only actions a mod offers to rules.** The mod lists them in its `manifest.json` under `ruleActions` (see [Actions a rule can run](mods/02-actions-and-entry-points.md#actions-a-rule-can-run)). Settings lists only those, from the mods that are loaded.
- **When:** last, after the rename, the move, the properties and the notes to create, once per save. Only the **first** matching rule with a mod action runs it; a later rule's action does not run in its place.
- **The note** reaches the action as `run.target`, `{ on: "note", path }`, with the vault-relative path where the note ends the save.
- **Not loaded.** When no loaded mod offers the action (the mod is off, failed to load, or does not list the action), the rule skips it and Kokobrain logs it once per rule. Settings shows the id with **(not loaded)**. The rest of the rule still runs.
- **Already running.** An action runs once at a time. When a save matches while it is still running, it is not started again for that save.
- **Never on** a note in the system folder (`_system` by default) or the templates folder, a type definition, a file that is not Markdown, or frontmatter Kokobrain cannot rewrite (the notes [Set properties](#set-properties) skips). If the rename or the move fails, the action does not run.
- **Nobody is at the keyboard.** The action runs a few seconds after you save, so it must not open dialogs. The rule does not wait for it: an action that waits for an answer, or runs for minutes, never holds up the save or the next one.
- **A failing action** shows the mod's error toast, as when you start it from the palette.

> [!WARNING]
> **An action that writes the note it was run on runs again.** Its write is an ordinary save, so the rules check the note again a few seconds later, and while the note still matches, the action runs again. An action that appends text (a log line, a summary) grows the note at every round, and with an `always` rule on a key the action writes, the two rewrite each other. Break the loop in one of two ways:
> - **A marker.** The action sets a property, such as `summarized: true`, and the rule's filter excludes it, as in `summarized != true` above.
> - **No change, no write.** The action writes only when the text it computes differs from the note's. Writing the same text still counts as a save.
>
> Never let the action write a key that an `always` rule owns.

### Icon (legacy)

Legacy: older rules can assign an icon to the moved file. Only the rule that moves the note applies its icon, and it clears the colors it does not set. To set an icon or color from any rule, use [properties](#set-properties) instead. The icon integrates with [File Icons](02-file-explorer.md#custom-file-icons): an icon pack, icon name, and optional colors, applied to the file at its new path after the move completes.

## Examples

Each example is a complete rule, as stored in `.kokobrain/auto-organize-rules.json`. Copy one into the file's `rules` list, or rebuild it in Settings.

### Only set a property: a folder's notes belong to a topic

**When** a note is in `work/topics/AWS` or a subfolder, **set** `_belongs_to` to `[[AWS]]` if it has none. The note stays where it is.

```json
{
  "id": "rule-1710000000001-a1w2s",
  "name": "AWS topic notes",
  "expression": "file.inFolder(\"work/topics/AWS\")",
  "destination": "",
  "properties": [
    { "key": "_belongs_to", "value": "[[AWS]]", "mode": "if-missing" }
  ],
  "enabled": true
}
```

### Only set an icon and color: blocked notes stand out

**When** a note's status is `blocked`, **set** its icon to `lucide:ban` and the icon's color to red. When the status changes, the icon stays: add a second rule for the other statuses to reset it (see [Switching a value back](#switching-a-value-back)).

```json
{
  "id": "rule-1710000000002-b1l2k",
  "name": "Blocked notes in red",
  "expression": "status == \"blocked\"",
  "destination": "",
  "properties": [
    { "key": "_icon", "value": "lucide:ban", "mode": "always" },
    { "key": "_color", "value": "red", "mode": "always" }
  ],
  "enabled": true
}
```

### Set properties by type or tag: meeting notes

**When** a note's type is meeting **or** it has the tag `1on1`, **set** its icon to `lucide:users` and `_belongs_to` to `[[Meetings]]`, each only if missing.

```json
{
  "id": "rule-1710000000003-m1t2g",
  "name": "Meeting notes",
  "expression": "type == \"meeting\" || file.hasTag(\"1on1\")",
  "destination": "",
  "properties": [
    { "key": "_icon", "value": "lucide:users", "mode": "if-missing" },
    { "key": "_belongs_to", "value": "[[Meetings]]", "mode": "if-missing" }
  ],
  "enabled": true
}
```

### Move and set together: archive finished notes

**When** a note's status is `done`, **move it to** `Archive/` **and set** its icon color to gray. This filter matches done notes anywhere in the vault; add a folder condition, such as `&& file.inFolder("work")`, to narrow it.

```json
{
  "id": "rule-1710000000004-d1n2e",
  "name": "Archive done notes",
  "expression": "status == \"done\"",
  "destination": "Archive",
  "properties": [
    { "key": "_color", "value": "gray", "mode": "always" }
  ],
  "enabled": true
}
```

### An "any" filter: done or dropped

**When** a note's status is `done` **or** `dropped` (the builder's **Any of the following are true**), **set** its title color to gray.

```json
{
  "id": "rule-1710000000005-c1l2d",
  "name": "Closed notes",
  "expression": { "or": ["status == \"done\"", "status == \"dropped\""] },
  "destination": "",
  "properties": [
    { "key": "_title_color", "value": "gray", "mode": "always" }
  ],
  "enabled": true
}
```

## Switching a value back

A rule never undoes what it wrote. When a note stops matching, for example when its status goes from `blocked` to `active`, the color the rule set stays. To switch it back, add a second rule for the opposite state:

```
status == "blocked"   ->  _color: red      (always)
status != "blocked"   ->  remove _color    (remove)
```

The first rule colors blocked notes red. The second removes the color from every other note at its next save.

As complete rules, limited to projects (see [When the pattern does not work](#when-the-pattern-does-not-work) for why):

```json
{
  "id": "rule-1710000000006-r1e2d",
  "name": "Blocked projects in red",
  "expression": "type == \"project\" && status == \"blocked\"",
  "destination": "",
  "properties": [
    { "key": "_color", "value": "red", "mode": "always" }
  ],
  "enabled": true
}
```

```json
{
  "id": "rule-1710000000007-n1r2d",
  "name": "Other projects lose the red",
  "expression": "type == \"project\" && status != \"blocked\"",
  "destination": "",
  "properties": [
    { "key": "_color", "mode": "remove" }
  ],
  "enabled": true
}
```

A project with `status: blocked` gets `_color: red`. Change its status to `active` and save: the second rule matches instead and removes `_color`. A project with no `status` matches the second rule too, because a missing status is not `"blocked"`.

### Setting a default instead

When the value should go back to a known default instead of disappearing, the second rule sets that default with `always`. Here a blocked project shows a ban icon, and every other project a folder icon:

```json
{
  "id": "rule-1710000000008-b1a2n",
  "name": "Blocked projects get a ban icon",
  "expression": "type == \"project\" && status == \"blocked\"",
  "destination": "",
  "properties": [
    { "key": "_icon", "value": "lucide:ban", "mode": "always" }
  ],
  "enabled": true
}
```

```json
{
  "id": "rule-1710000000009-f1l2d",
  "name": "Other projects get the folder icon",
  "expression": "type == \"project\" && !(status == \"blocked\")",
  "destination": "",
  "properties": [
    { "key": "_icon", "value": "lucide:folder", "mode": "always" }
  ],
  "enabled": true
}
```

### Keep the two filters exclusive

When two matching rules set the same property, the higher rule wins (see [Set properties](#set-properties)). If both filters of a pair can match the same note, the higher rule's value is the one the note keeps, and the pair does not switch. Write the second filter as the opposite of the first, in one of two ways:

- with `!=`: `status != "blocked"` is the opposite of `status == "blocked"`;
- with `!( )` around the condition: `!(status == "blocked")`. This works for any condition, such as `!file.hasTag("blocked")`.

Keep a shared part, such as `type == "project"`, outside the `!( )`. `!(type == "project" && status == "blocked")` also matches every note that is not a project.

Another rule that sets the same property takes part too, and its place in the list decides. The [examples](#examples) "Blocked notes in red" and "Archive done notes" set `_color` on blocked and done notes. Placed above the pair, "Archive done notes" keeps its gray on a done project. Placed below it, "Other projects lose the red" owns `_color` on that project and removes the gray.

### When the pattern does not work

The second rule does not know the value a note had before the first rule changed it. It removes or overwrites whatever is there. A color you picked by hand, such as `_color: blue` on an active project, is removed at the project's next save, because the project is not blocked. In the default variant, an icon you picked by hand becomes the folder icon.

So use a pair only on a property that no one sets by hand on the notes its filters match. Keep the filters narrow, as `type == "project"` does above: `status != "blocked"` alone is true for every note without a `status`, so that rule would remove the icon color of every note anyone saves that is not blocked.

## Debounce Delay

Auto Organize does not run instantly on every keystroke. It waits a configurable number of seconds after the last save before evaluating rules. This prevents unnecessary moves while you are actively editing a note.

The default is `3000 ms` (3 seconds). The Settings field is entered in seconds and accepts a range of 0.5 to 30 seconds. Increase it if you find moves happening too eagerly; decrease it for a more responsive experience.

## Type-Driven Lifecycle Rules

Type definitions can declare an `_archive_to` field in their frontmatter. When present, Kokobrain automatically generates an Auto Organize rule for that type, with no manual rule needed.

> [!IMPORTANT]
> These rules run only while **Enable Auto Organize** is on, like every other rule. Auto Organize is off by default, so `_archive_to` moves nothing until you turn it on. The generated rules are not listed under **Rules** in Settings: the type definitions are where you see and change them.

### Example type definition

```yaml
---
type: Type
_icon: rocket
_color: red
_archive_to: "{folder}/_archive"
---
# Project
```

With this definition, any note with `type: Project` and `_archived: true` will be automatically moved to `_archive/` within its current folder.

### How it works

1. Kokobrain reads all type definitions (notes with `type: Type`)
2. For each type with `_archive_to`, a rule is generated: `type == "TypeName" && _archived == true` (the type match is case-insensitive)
3. The destination supports [dynamic templates](#dynamic-destinations) (e.g. `{folder}/_archive`)
4. Generated rules run **after** user-defined rules, so user rules take priority

This means you can define archive behavior once in the type definition, and it applies to all notes of that type across the entire vault.

### Automatic unarchiving

When `_archive_to` has the simple shape `{folder}/<name>` (a single subfolder of the note's folder, such as `{folder}/_archive`), Kokobrain also generates a matching **unarchive** rule. Setting `_archived: false` again on a note that currently sits in the archive subfolder moves it back to its parent folder (the `{parent}` destination).

Unarchive rules are only generated for the `{folder}/<name>` shape. For any other `_archive_to` (for example `Archive/{type}/{year}`), the original location cannot be recovered, so no automatic unarchive rule is created.

## Configuration File

Rules and excluded folders are stored in `.kokobrain/auto-organize-rules.json` inside your vault (separate from the main `settings.json`). The enabled/disabled toggle and debounce delay are stored in `settings.json` under `autoOrganize`.

You can inspect or back up the rules file manually:

```json
{
  "rules": [
    {
      "id": "rule-1710000000000-a1b2c",
      "name": "Archive completed",
      "expression": "status == \"done\"",
      "destination": "Archive",
      "properties": [
        { "key": "_organized", "value": true, "mode": "if-missing" }
      ],
      "enabled": true
    },
    {
      "id": "rule-1710000000000-x1y2z",
      "name": "AWS topic notes",
      "expression": "file.inFolder(\"work/topics/AWS\")",
      "destination": "",
      "properties": [
        { "key": "_belongs_to", "value": "[[AWS]]", "mode": "if-missing" }
      ],
      "enabled": true
    },
    {
      "id": "rule-1710000000000-s5m4r",
      "name": "Summarize finished meetings",
      "expression": "type == \"meeting\" && status == \"done\" && summarized != true",
      "destination": "",
      "runAction": { "id": "mod:ai-tools:action:summarize" },
      "enabled": true
    }
  ],
  "excludedFolders": [
    "_templates",
    "_notes"
  ]
}
```

> [!WARNING]
> Auto Organize performs real file moves on disk. A note moved by a rule will disappear from its original location. Use the [Trash](18-trash.md) or [File History](15-file-history.md) if you need to recover a mistakenly moved file.

> [!NOTE]
> Auto Organize only evaluates `.md` files. Canvas files (`.canvas`), Kanban boards (`.kanban`), and other file types are never moved, and rules never write properties to them.

---

## Next Steps

- [Collection](12-collection.md): the expression language used for rule filters
- [File Icons](02-file-explorer.md#custom-file-icons): assign icons to files and folders
- [File History](15-file-history.md): recover previous versions if a move goes wrong
