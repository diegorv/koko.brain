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
| `toggle` / `boolean` | `` `INPUT[toggle():archived]` `` | On / off switch. |

`number`, `date`, `toggle`, and `boolean` are valid with empty parentheses. All other types currently need at least one option.

Unrecognized input types that have options will fall back to rendering as an inline select.

The `toggle` widget treats these frontmatter values as checked/truthy (case-insensitive): `true`, `yes`, `1`, `on`.

### Option labels

By default each comma-separated argument is used as both the stored value and the displayed label. To show a different label than the stored value, use the `option(value, label)` form:

```
`INPUT[inlineSelect(option(1, very bad), option(2, bad), option(3, ok), option(4, good), option(5, great)):mood]`
```

This stores `1`–`5` in frontmatter while showing the human label in the dropdown.

### Where they work

Inline inputs are parsed line by line, so they work inside paragraphs, table cells, list items, and callouts. They are not parsed inside fenced code blocks.

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

If neither `action` nor `actions` is provided — or if the YAML is malformed — Kokobrain replaces the button with an inline error widget so the editor does not crash.

### Action types

#### `updateMetadata` — write to frontmatter

```yaml
action:
  type: updateMetadata
  prop: status         # or `bindTarget: status` — both keys are accepted
  value: done
```

Sets the named frontmatter property to the given value. Missing keys are created on first run.

#### `open` — open a note or URL

```yaml
action:
  type: open
  link: "[[Project Alpha]]"   # wikilink, or an https://… URL
```

A `[[wikilink]]` opens the resolved note; an `http(s)://` URL opens in your browser. The note opens in the current editor.

#### `createNote` — create a new note

```yaml
action:
  type: createNote
  fileName: New Idea           # without .md
  folderPath: Inbox            # optional, default vault root
```

The new note is created (or opened if it already exists) and opened in the editor.

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
- Meta-bind inputs interact with the same YAML frontmatter you edit elsewhere — changing a value via the Properties panel and via an inline input both produce identical disk writes.
- For complex flows (computed values, queries over many notes), reach for [QueryJS](13-queryjs.md) instead.

## Related

- [Markdown Guide](04-markdown.md) — Markdown syntax reference.
- [Sidebar Panels — Properties](07-sidebar-panels.md) — The visual frontmatter editor.
- [Collection](12-collection.md) — Database-style queries that read the same frontmatter properties.
