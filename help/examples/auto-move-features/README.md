# Auto-move examples

A sample `auto-move-rules.json` plus three notes that each match a
different rule. Use this to see how rules, expressions, icons, and
excluded folders fit together before wiring up your own.

## What's here

| File | Demonstrates |
|------|--------------|
| `auto-move-rules.json` | Five rules (one disabled), each with a different expression shape and three with custom icon assignments. Three excluded folders. |
| `Inbox/project-done-example.md` | Matches **"Archive done projects"** — combines a frontmatter property and a tag, demonstrates the `&&` operator. |
| `Inbox/recipe-overnight-oats.md` | Matches **"Move recipes to Cooking folder"** — single-tag expression with an emoji icon. |
| `Inbox/bug-double-save-on-rename.md` | Matches **"Tag-as-bug → Bug Tracker"** — combines a tag with an inequality (`status != 'closed'`), demonstrates conditional routing as state changes. |

## How auto-move evaluates the rules

1. After every save (debounced by `autoMove.debounceMs`, default 2000 ms),
   the file is checked against each rule **in order**.
2. The **first matching rule wins** — later rules are skipped.
3. If a rule's `expression` evaluates to `true` for the file's
   `NoteRecord`, the file is moved to `destination` and the optional
   `icon` is applied.
4. Files in any `excludedFolders` path are never considered.

## Trying it locally

To exercise these rules:

1. Copy `auto-move-rules.json` to `<your vault>/.kokobrain/auto-move-rules.json`.
2. Copy the three notes from `Inbox/` into your vault's root or any
   non-excluded folder.
3. In **Settings → Auto Move**, flip **Enabled** on.
4. Open each note and press `Cmd+S` (no edits needed). After the debounce
   delay the file will move to its destination folder.

See [Auto Move](../../documentation/22-auto-move.md) for the full feature
guide and the expression language reference.
