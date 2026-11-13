# Meta-Bind

Embed interactive form controls and action buttons directly inside your notes. Meta-bind elements read from and write to the note's frontmatter, so a dropdown in the body of the note can change a `status:` value without opening the Properties panel.

Two flavors ship today:

- **Inline inputs** — `` `INPUT[type(args):property]` `` written on any line.
- **Button blocks** — fenced ` ```meta-bind-button ` code blocks with a YAML configuration.

> [!TIP]
> Runnable samples for every shape below live in `help/examples/markdown-editor-vault/19-meta-bind.md`. Open that file in Kokobrain to interact with the widgets.

---

## Inline Inputs

Wrap an `INPUT[...]` expression in backticks anywhere on a line:

```
Status: `INPUT[inlineSelect(todo, doing, done):status]`
```

When your cursor is outside the backticks, the expression renders as an interactive control bound to the `status` frontmatter property. When your cursor is inside, you see the raw syntax so you can edit it.

### Syntax

```
`INPUT[<type>(<args>):<property>]`
```

| Part | Meaning |
|------|---------|
| `<type>` | Input flavor — see the table below. |
| `<args>` | Type-specific arguments inside parentheses. May be empty for types that don't take options (`number()`, `date()`, etc.). |
| `<property>` | The frontmatter key to read from and write to. Missing keys are created automatically the first time you change the value. |

### Supported types

| Type | Example | Renders as |
|------|---------|-----------|
| `inlineSelect` | `` `INPUT[inlineSelect(todo, doing, done):status]` `` | A compact dropdown. |
| `number` | `` `INPUT[number():score]` `` | Numeric input. |
| `date` | `` `INPUT[date():dueAt]` `` | Date picker. |
| `toggle` / `boolean` | `` `INPUT[toggle():archived]` `` | On / off switch. Writes `_archived: true` / `_archived: false`. |

`number`, `date`, `toggle`, and `boolean` are valid with empty parentheses. All other types currently need at least one option.

Unrecognized input types that have options will fall back to rendering as an inline select.

The `toggle` widget treats these frontmatter values as checked/truthy (case-insensitive): `true`, `yes`, `1`, `on`.

### What gets written

Each control writes a typed YAML value, so the note reads the same way the Properties panel and the app's lists read it:

- A **toggle** writes the booleans `true` / `false` (never the quoted strings `"true"` / `"false"`).
- A **number** input writes a number (`count: 7`). Clearing it writes an empty value (`count: ""`), never `0`. Typing the same number with another spelling (`5.0` over `5`) leaves the note as it was.
- A **date** input writes the date as text (`due: 2026-02-03`).
- An **inline select** writes an option as a boolean when it is exactly `true` or `false`, as a number when it is a plain decimal such as `1`, `-2` or `1.5`, and as text otherwise. So `option(3, good)` writes `mood: 3`, while `007`, `1.50`, `1e3` and `yes` are written as the text you typed.

### System keys and aliases

A few keys the app reads have a short alias: `archived`, `favorite`, `type` and `order` stand for `_archived`, `_favorite`, `_type` and `_order`. A control bound to an alias reads and writes the underscored key, so `` `INPUT[toggle():archived]` `` shows the stored `_archived` and ticking it writes `_archived: true`, which moves the note to Archive. The same goes for `favorite` and Favorites.

> [!NOTE]
> A note that already holds the quoted string `_archived: "true"` or `_favorite: "true"` (written by an older version) shows the toggle checked but stays out of Archive or Favorites until you use the toggle once, which rewrites it as a boolean.

### Option labels

By default each comma-separated argument is used as both the stored value and the displayed label. To show a different label than the stored value, use the `option(value, label)` form:

```
`INPUT[inlineSelect(option(1, very bad), option(2, bad), option(3, ok), option(4, good), option(5, great)):mood]`
```

This stores `1`–`5` in frontmatter while showing the human label in the dropdown.

### Values that are not an option

If the note holds a value that is not one of the select's options (for example `status: archived` for `inlineSelect(active, done)`), the select shows that value greyed out as its current choice instead of pretending to hold the first option. Picking a real option writes it.

### Accessible names

Every select, number / date input and toggle is named after the property it writes: screen readers announce it (for example "status") and hovering the control shows the same name as a tooltip.

### Where they work

Inline inputs are parsed line by line, so they work inside paragraphs, table cells, list items, and callouts. They are not parsed inside fenced code blocks.

In a table cell, every input type renders the same control it renders in a paragraph (a toggle is a checkbox, a number input a number field) and writes the same value.

---

## Button Blocks

Wrap a YAML configuration in a fenced ` ```meta-bind-button ` block to render a clickable button. Clicking the button triggers one or more actions.

````
```meta-bind-button
label: Mark as done
style: primary
action:
  type: updateMetadata
  prop: status
  value: done
```
````

### Top-level fields

| Field | Required | Description |
|-------|----------|-------------|
| `label` | yes | The text shown on the button. |
| `style` | no | `default`, `primary`, `destructive`, or `plain`. Defaults to `default`. |
| `tooltip` | no | Hover tooltip. |
| `action` | one of | A single action object. Mutually exclusive with `actions`. |
| `actions` | one of | An array of action objects executed in sequence. Mutually exclusive with `action`. |

If neither `action` nor `actions` is provided — or if the YAML is malformed — Kokobrain replaces the button with an inline error widget so the editor does not crash. The widget names the problem, for example `Invalid button: label missing`, `Invalid button: unknown action type "launch"` or `Invalid button: updateMetadata needs prop and value`.

> [!NOTE]
> Only the fields on this page are read. Obsidian Meta Bind's `id` and `hidden` (inline button references and hidden blocks), `newTab` on an `open` action and `openNote` on a `createNote` action are not supported: a button that sets them ignores them and renders as usual. An `open` action follows its link as described below, and `createNote` always opens the note it creates.

### Action types

#### `updateMetadata` — write to frontmatter

```yaml
action:
  type: updateMetadata
  prop: status         # or `bindTarget: status` — both keys are accepted
  value: done
```

Sets the named frontmatter property to the given value. Missing keys are created on first run.

The value is written as typed in the block: `value: 3` writes the number `3`, `value: true` the boolean `true`, and `value: "3"` (quoted) the text `"3"`. A list, a map or an empty value is not accepted.

#### `open` — open a note or URL

```yaml
action:
  type: open
  link: "[[Project Alpha]]"   # wikilink, or an https://… URL
```

A `[[wikilink]]` is followed exactly as a wikilink in the note body: `[[Note|shown text]]` opens `Note`, `[[Note#Heading]]` opens `Note` at that heading, `[[#Heading]]` jumps within the current note, and a link to a note that does not exist creates it. An `http(s)://` URL opens in your browser. The note opens in a new editor tab (or focuses the tab if the note is already open).

An empty link, a `[[...]]` with nothing to follow, an unsafe URL or any other text shows an error message and stops the button's remaining actions.

`open` never opens a view: a wikilink never points to a `.view` file (see [Views are never link targets](05-wikilinks.md#views-are-never-link-targets)). If only a view is called `Projects`, `link: "[[Projects]]"` creates the note `Projects.md`, as any link to a missing note does. Use [`openView`](#openview--open-a-view) to open a view.

#### `createNote` — create a new note

```yaml
action:
  type: createNote
  fileName: New Idea           # without .md
  folderPath: Inbox            # optional, default vault root
```

The new note is created (or opened if it already exists) and opened in the editor.

#### `openView` — open a view

```yaml
action:
  type: openView
  path: _system/views/Projects.view   # vault-relative path of a .view file
```

Opens the view as a click on its row under Views does: a view with `_open_in_editor: true` opens in an editor tab, and any other view is picked in the Types navigator and fills the note list. This also works for a view with `_visible: false`, which has no row.

A missing `path`, a path that does not end in `.view` or one that leaves the vault (`../`) replaces the button with an inline error, for example `Invalid button: openView needs a .view path`. The path is case-sensitive: it must spell the file's name exactly as the vault does. If no file exists at the path, clicking the button shows an error message, creates nothing and stops the button's remaining actions.

Renaming or moving the view does not update the `path` in your buttons: the error message is how you find out.

### Multiple actions

Use `actions:` to chain steps. They run top to bottom.

````
```meta-bind-button
label: Close issue
style: destructive
actions:
  - type: updateMetadata
    prop: status
    value: closed
  - type: updateMetadata
    prop: closedAt
    value: "2026-04-08"
```
````

### Button styles

| `style` | Use case |
|---------|----------|
| `default` | Neutral action — the typical choice. |
| `primary` | The main action of the block (highlighted in the accent color). |
| `destructive` | Irreversible or risky action (red). |
| `plain` | Borderless minimal button. |

---

## Tips

- The Properties panel ([Sidebar Panels → Properties](07-sidebar-panels.md)) is still the right tool for one-off edits. Use meta-bind when you want the control to live alongside the content, e.g. a status toggle at the top of a project note.
- Meta-bind inputs interact with the same YAML frontmatter you edit elsewhere. The Properties panel types a value by the property's type, while an inline input types it by the control (see [What gets written](#what-gets-written)), so the two can write a value differently: a select option `3` is always written as a number, even on a property the panel treats as text.
- For complex flows (computed values, queries over many notes), reach for [QueryJS](13-queryjs.md) instead.

## Related

- [Markdown Guide](04-markdown.md) — Markdown syntax reference.
- [Sidebar Panels — Properties](07-sidebar-panels.md) — The visual frontmatter editor.
- [Views](12-views.md) — Database-style queries that read the same frontmatter properties.
