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

## Inside a large vault

Auto-move rules run on every note in the vault, so each example rule is
scoped to this folder:

- Every `expression` ends with
  `file.folder.endsWith('/auto-move-features/Inbox')`, so a rule only
  matches notes directly in this folder's `Inbox/`. Your own notes with a
  `#recipe` or `#project` tag are never moved.
- Every `destination` is relative to the note: `{parent}/Cooking` resolves
  to `auto-move-features/Cooking`, wherever this folder sits in the vault.
  The bug rule uses `{folder}/Bugs`, which resolves to `Inbox/Bugs`.
- `excludedFolders` are vault-relative (`Templates`, `_system`, `Archive`
  at the vault root). They only stop rules from running there and never
  move anything.

Limits: the scope matches the folder by name, so the rules stop matching
if you rename `auto-move-features/` or open it as a vault of its own, and
an unrelated `.../auto-move-features/Inbox/` elsewhere in the vault would
match too. Write your own rules without the folder condition, or with your
own folder in it.

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
   If that file already holds your own rules, add these to its `rules`
   array instead of replacing it.
2. Keep this folder (with its `Inbox/`) anywhere in your vault, under the
   name `auto-move-features`.
3. In **Settings → Auto Move**, flip **Enabled** on.
4. Open each note in `Inbox/` and press `Cmd+S` (no edits needed). After
   the debounce delay the file moves to its destination inside
   `auto-move-features/` (`Archive/Projects`, `Cooking` or `Inbox/Bugs`).

See [Auto Move](../../documentation/22-auto-move.md) for the full feature
guide and the expression language reference.
