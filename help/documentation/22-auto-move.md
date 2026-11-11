# Auto Move

Automatically organize notes into folders and set their properties when they are saved, based on rules you define.

**Open:** `Cmd+,` → **Auto Move** section in Settings.

---

## Overview

Auto Move watches every file save. When a note is saved, Kokobrain evaluates your rules against that note's content and properties. A matching rule can move the file to a destination folder, set properties in its frontmatter, or both, with no manual drag-and-drop or typing. A `.view` file is never moved, even when a rule matches it.

## Enabling Auto Move

1. Open **Settings** (`Cmd+,`).
2. Go to the **Auto Move** section.
3. Toggle **Enable Auto Move** on.

When disabled, no files are ever moved or changed, regardless of how many rules you have configured.

## How Rules Work

Rules are evaluated in order, top to bottom, against the note as it is a few seconds after the save (see [Debounce Delay](#debounce-delay)). **Every matching rule applies its properties**, and **the first matching rule with a destination moves the note**. A later rule with a destination does not move it again.

Each rule consists of:

| Field | Description |
|-------|-------------|
| **Name** | A human-readable label for the rule (e.g. "Archive completed projects") |
| **Expression** | A condition written in the Collection expression language (see below) |
| **Move to folder** (optional) | Target folder path, relative to the vault root. Supports `{variable}` templates (see below). Leave it empty for a rule that does not move the note |
| **Properties** (optional) | Properties written to the note's frontmatter when the rule matches (see [Setting Properties](#setting-properties)) |
| **Enabled** | Individual toggle — you can disable a rule without deleting it. A new rule starts disabled |
| **Icon** (optional) | An icon applied to the file after it is moved |

An empty destination does not move the note. A destination template that resolves to an empty path, such as `{parent}` on a note in a top-level folder, moves the note to the vault root.

If the note is already in the destination folder, Kokobrain skips the move but still applies the icon if one is configured.

## Creating a Rule in Settings

1. Open **Settings** (`Cmd+,`) → **Auto Move** and click **Add rule**. The new rule starts **disabled**, so it changes nothing while you write it.
2. Give it a **name** and type its **Expression**. The field is saved when you leave it or press Enter, not on every keystroke. Under it, **Matches N notes now** counts the notes the filter matches right now. Check it: a count close to all your notes usually means a typo, such as a misspelled property name.
3. Under **Then**, pick what the rule does:
   - **Move to folder:** the destination folder. Leave it empty for a rule that does not move notes.
   - **Set properties:** click **Add property** for each property. Type or pick the **key** (the field suggests the properties your notes already use), set the **value**, and pick the mode, **if missing** (the default) or **always**. The **×** button removes the property.
4. Turn the rule's toggle on when it is ready.

A rule with no folder and no property does nothing. Settings says so under the rule, and still saves it.

The value field adapts to the key:

| Key | Value field |
|-----|-------------|
| `_organized`, `_archived`, `_favorite` | A yes/no toggle. These keys accept only `true` or `false` |
| `_icon` | **Pick icon** opens the icon picker. The icon is saved as `pack:name`, such as `lucide:cloud` |
| `_color`, `_title_color` | **Pick color** opens the icon picker's colors. On a `_color` row, pick from the **Icon** colors; on a `_title_color` row, from the **Text** colors |
| Any other key | Text. Pick **Yes/no** in the type menu next to the key for a `true` / `false` value |

Numbers and lists have no editor in Settings. Write them in `.kokobrain/auto-move-rules.json` (see below); Settings shows them read-only.

## Setting Properties

A rule can set properties on the notes it matches, with or without moving them. This rule gives every note in `work/topics/AWS` a link to the AWS note and a cloud icon, and leaves the note where it is:

```json
{
  "id": "rule-1710000000000-x1y2z",
  "name": "AWS topic notes",
  "expression": "file.folder.endsWith(\"/work/topics/AWS\")",
  "destination": "",
  "properties": [
    { "key": "_belongs_to", "value": "[[AWS]]", "mode": "if-missing" },
    { "key": "_icon", "value": "lucide:cloud", "mode": "always" }
  ],
  "enabled": true
}
```

Each property has a **key**, a **value** and a **mode**:

| Mode | Writes the value when |
|------|----------------------|
| `if-missing` | the note does not have the property, or it is empty (`""`, an empty list, or no value). `false` and `0` count as set |
| `always` | the note's value is different. A list is replaced as a whole |

The value is written with its own type: `true` and `false` as booleans, numbers as numbers, `["a", "b"]` as a list, and anything in quotes as text. A link such as `[[AWS]]` is written in quotes, so it stays a link.

How properties combine:

- Every matching rule applies its properties, top to bottom. When two matching rules set the same property, the higher rule wins, even when its `if-missing` writes nothing because the note already has a value.
- `icon` and `_icon` (and the other [frontmatter key aliases](25-types-and-relationships.md#frontmatter-key-aliases)) are the same property.
- When the rule also moves the note, the move happens first and the properties are written at the new location. If the move fails, nothing is written.
- A note the rules leave unchanged is never rewritten.
- `todoist_project` cannot be set by a rule, and `_organized`, `_archived` and `_favorite` accept only `true` or `false`. Entries that break these rules are ignored.

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
- Icons and colors are best set with properties (`_icon`, `_color`, `_title_color`). The legacy **Icon** option of a rule clears the colors it does not set.

## Writing Expressions

Expressions use the same language as [Collection](12-collection.md) filters. They are evaluated against the note's frontmatter properties and metadata.

### Common examples

```
status == "done"
```
Move notes where the `status` property equals `"done"`.

```
file.hasTag("archived")
```
Move notes that have the tag `archived`.

```
file.inFolder("Inbox") && status == "done"
```
Move finished notes out of the `Inbox` folder (and its subfolders). The folder is relative to the vault root, like the destination; `Inbox` does not match `Inbox-old`. See [`file.inFolder()`](12-collection.md#fileinfolder-takes-a-vault-relative-folder).

```
priority == "high" && project == "work"
```
Move notes matching both conditions.

```
due < today()
```
Move notes with a `due` date in the past.

> [!TIP]
> Open [Collection](12-collection.md) to experiment with expressions before adding them as Auto Move rules. The Collection table view uses the same expression engine, so you can validate your filter there first.

## Dynamic Destinations

Destination paths support `{variable}` templates that are resolved at move time based on the note's properties and location. This works in **all rules** — both user-defined rules and auto-generated [lifecycle rules](#type-driven-lifecycle-rules).

| Variable | Value | Example |
|----------|-------|---------|
| `{folder}` | Current vault-relative folder of the note | `work/squad-payments` |
| `{parent}` | Parent of the current folder | `work` |
| `{basename}` | Filename without extension | `Migrate-Gateway` |
| `{type}` | Frontmatter `_type` property (the note's type), first letter uppercased (`type: project` gives `Project`) | `Project` |
| `{status}` | Frontmatter `status` property | `done` |
| `{year}` | Current year | `2026` |
| `{month}` | Current month (zero-padded) | `05` |

### Examples

```
{folder}/_archive
```
Move to an `_archive` subfolder within the note's current folder. A note in `work/squad-payments/` moves to `work/squad-payments/_archive/`.

```
Archive/{type}/{year}
```
Move to a type-organized archive by year. A project archived in 2026 moves to `Archive/project/2026/`.

```
{folder}/_archive/{status}
```
Combine folder-relative archiving with status. A done project in `work/` moves to `work/_archive/done/`.

Unknown variables are left as-is in the path.

## Excluded Folders

You can define folders that are **never** evaluated for Auto Move, even if a rule would match. This is useful for:

- Template folders (`_templates`)
- Daily notes folder (`_notes`)
- Any folder you want to keep static

Files inside excluded folders are skipped entirely — no evaluation, no moves.

## Debounce Delay

Auto Move does not run instantly on every keystroke. It waits a configurable number of seconds after the last save before evaluating rules. This prevents unnecessary moves while you are actively editing a note.

The default is `3000 ms` (3 seconds). The Settings field is entered in seconds and accepts a range of 0.5 to 30 seconds. Increase it if you find moves happening too eagerly; decrease it for a more responsive experience.

## Applying Icons After Move

Each rule can optionally assign an icon to the moved file. Only the rule that moves the note applies its icon. To set an icon or color from any rule, use [properties](#setting-properties) instead. This integrates with [File Icons](02-file-explorer.md#custom-file-icons) — you pick an icon pack, icon name, and optional colors. The icon is applied to the file at its new path after the move completes.

## Type-Driven Lifecycle Rules

Type definitions can declare an `_archive_to` field in their frontmatter. When present, Kokobrain automatically generates an auto-move rule for that type — no manual rule needed.

> [!IMPORTANT]
> These rules run only while **Enable Auto Move** is on, like every other rule. Auto Move is off by default, so `_archive_to` moves nothing until you turn it on. The generated rules are not listed under **Rules** in Settings: the type definitions are where you see and change them.

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
4. Generated rules run **after** user-defined rules — user rules take priority

This means you can define archive behavior once in the type definition, and it applies to all notes of that type across the entire vault.

### Automatic unarchiving

When `_archive_to` has the simple shape `{folder}/<name>` (a single subfolder of the note's folder, such as `{folder}/_archive`), Kokobrain also generates a matching **unarchive** rule. Setting `_archived: false` again on a note that currently sits in the archive subfolder moves it back to its parent folder (the `{parent}` destination).

Unarchive rules are only generated for the `{folder}/<name>` shape. For any other `_archive_to` (for example `Archive/{type}/{year}`), the original location cannot be recovered, so no automatic unarchive rule is created.

## Configuration File

Rules and excluded folders are stored in `.kokobrain/auto-move-rules.json` inside your vault (separate from the main `settings.json`). The enabled/disabled toggle and debounce delay are stored in `settings.json`.

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
      "expression": "file.folder.endsWith(\"/work/topics/AWS\")",
      "destination": "",
      "properties": [
        { "key": "_belongs_to", "value": "[[AWS]]", "mode": "if-missing" }
      ],
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
> Auto Move performs real file moves on disk. A note moved by a rule will disappear from its original location. Use the [Trash](18-trash.md) or [File History](15-file-history.md) if you need to recover a mistakenly moved file.

> [!NOTE]
> Auto Move only evaluates `.md` files. Canvas files (`.canvas`), Kanban boards (`.kanban`), and other file types are never moved, and rules never write properties to them.

---

## Next Steps

- [Collection](12-collection.md) — Learn the expression language used for rule conditions
- [File Icons](02-file-explorer.md#custom-file-icons) — Assign icons to files and folders
- [File History](15-file-history.md) — Recover previous versions if a move goes wrong
