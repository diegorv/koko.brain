# Kokobrain Type & Editor Features

Three new features pulled from the Todoist `kokobrain` label, plus the type-management work that grew out of
grilling the right-click bug. Do this plan **after** `kokobrain-bugfixes.md` (task B2 must land first - F3 adds
the empty-area "New type" menu item to the menu B2 makes correct).

Task order respects dependencies: F2 reuses the dialog built in F3.

## Tasks

- [x] F1: Inline rename for notes in the type note list (no jump to File Explorer)
- [x] F3: "New type" creation via a dialog, from a "+" button on the TYPES header (approach changed by user from the empty-area context menu)
- [ ] F2: Rename a type - true rename + `_type:` member propagation - via a dialog
- [ ] F4: `@today` / `@tomorrow` / `@yesterday` date autocomplete in the editor
- [ ] F5: Cycle-sidebar-view keyboard shortcut (Cmd+Shift+E) + command-palette command

## Data model (applies to F1/F2/F3)

- A **type** is a note with `_type: Type` frontmatter; its **name = the note's `title`**, and
  `title = filename without extension` (`type-definitions.logic.ts:90`, `entry.rs:230,280`).
- **Member notes link by the exact name string**: `createNoteOfType` writes `_type: {name}` (`service.ts:37`);
  grouping is by `entry.isA` (the parsed `_type`), `type-sidebar.logic.ts:271-283`.
- `_sidebar_label` is cosmetic and defaults to `{name}s` (`logic.ts:99`), so it auto-follows a rename.

## F1 - inline rename for notes in the type note list (Todoist 6gqPHRX4Wj96c9Jm)

**Today:** the note-list "Rename" item calls `handleStartRename` (`TypeNoteList.svelte:288-291`) which sets
`fsStore.setRenamingPath` **and** `sidebarMode: 'files'`, yanking the user into the File Explorer.

**Want:** rename **in place** in the note list.

**Approach:** reuse `fsStore.setRenamingPath` but render the inline editable field inside `TypeNoteList`
(mirror the File Explorer's inline field, `FileTreeItem.svelte`), and **drop** the `sidebarMode: 'files'`
redirect. Commit via `renameItem` (`fs.service.ts:201`) - which already rewrites inbound `[[wikilinks]]` and
updates the open tab via `updateLinksAfterRename` (`:222`). Keep the context-menu "Rename" item and F2 shortcut
as the trigger.

**Verify:** `pnpm check` + `pnpm vitest run` (rename commit + cancel/escape). Manual: F2 / context-menu Rename
in the note list edits in place, no jump to File Explorer; wikilinks to the renamed note still resolve.

## F3 - "New type" via dialog, from a "+" button on the TYPES header

**Want (user, revised mid-plan):** a small **"+" button next to the TYPES header**, mirroring the existing
VIEWS "+" button - NOT an empty-area context-menu item (the empty-area right-click keeps showing nothing).

**Approach:**
- Build a small **reusable type-name dialog** from the existing `dialog` + `input` primitives
  (`components/ui/dialog`, `components/ui/input`) - shared with F2. Text input + confirm; inline validation.
- Add a **"+" button** to the TYPES header in `TypeSidebar` (same idiom as the VIEWS header button) that
  opens the dialog. On confirm -> `createTypeDefinition(name, { select: true })`.
- **After creation: select the new (empty) type in the sidebar** (like `createView` selects its view).
  Do **not** auto-open the raw definition `.md`.
- **Validation:** non-empty, legal filename, and **block on collision** with an existing type (inline error,
  case-insensitive - `validateTypeName` in `type-definitions.logic.ts`).

**Verify:** `pnpm check` + `pnpm vitest run` (creation, collision-blocked, empty-name-blocked). Manual:
click "+" next to TYPES -> dialog -> new type appears selected and empty.

## F2 - rename a type (true rename + member propagation)

**Decision (locked): true rename (option B), not label-only.** Renaming `Project` -> `Initiative`:
1. `renameItem(defPath, 'Initiative.md')` (`fs.service.ts:201`) - renames the definition file and gets inbound
   `[[Project]]` wikilink rewrite + tab/index update for free.
2. New **Rust command** (e.g. `propagate_type_rename(old, new)`) - rewrite `_type: Project` -> `_type: Initiative`
   in **every member note** in one pass, then reindex. (Keeps hundreds-of-files IO in Rust.)

**UX:** add a **"Rename"** item to the type context menu -> opens the shared dialog (prefilled with current
name). The dialog **always shows "This will update N notes"**, which doubles as the confirmation (no separate
threshold/prompt). **Block on collision** with an existing type name.

**Verify:**
- `cargo test --manifest-path src-tauri/Cargo.toml` for the propagation command (members rewritten, def renamed,
  non-members untouched, collision rejected).
- `pnpm check` + `pnpm vitest run` for the dialog + service wiring.
- Manual: rename a small type, confirm member notes' `_type` updated, sidebar label follows, `[[oldName]]`
  links rewritten; rename to an existing type name is blocked.

## F4 - `@today` date autocomplete (Todoist 6gqPJ88hqGXRJV9F)

**Pattern:** copy the `[[` wikilink completion (`@codemirror/autocomplete`, registered in
`editor-extensions.ts:72`). Date util `today()` returns `YYYY-MM-DD` (`utils/date.ts:14`).

**Decision (locked):**
- Tokens: **`@today`, `@tomorrow`, `@yesterday`**.
- Insert a **plain `YYYY-MM-DD` string** (not a daily-note wikilink).
- **Only activate** when `@` is at a word boundary and the following chars prefix-match a known token, so
  emails (`eu@diegorv...`) never trigger the popup (return `null` -> no popup).

**Where:** new `extensions/date-shortcut/` with `completion.ts` (extension) + `completion.logic.ts` (pure
detect + build), registered near `editor-extensions.ts:72`.

**Verify:** `pnpm check` + `pnpm vitest run` (logic: `@tod` -> today option; `@x` -> null; `@` mid-email ->
null; inserted value = formatted date). Manual: type `@today` in the editor -> popup -> inserts today's date.

## F5 - cycle-sidebar-view shortcut (Todoist 6gqPHVPpV5Jf28MF)

The three views are `settingsStore.layout.sidebarMode: 'files' | 'types' | 'calendar'`;
`SidebarModeToggle.switchTo(mode)` flips + persists. Keybindings registered in `global-keybindings.ts`.

**Decision (locked):**
- **One cycling shortcut on Cmd+Shift+E** (free; avoids existing Cmd+P/O/S/W/K/B/G/`,`, Cmd+Shift+[ /] /F/T/B/N/H,
  zoom): advances files -> types -> calendar -> files, and **shows the left sidebar if hidden**
  (`leftSidebarVisible`).
- Also register a **command-palette command** "Cycle sidebar view" (`command-palette.service.ts`) so the binding
  is discoverable.

**Verify:** `pnpm check` + `pnpm vitest run` (cycle order logic; shows sidebar when hidden). Manual: Cmd+Shift+E
cycles the three views and reveals the sidebar if collapsed.

## Notes

- One commit per task, in order F1 -> F3 -> F2 -> F4 -> F5, full Conventional Commit format.
- F3 builds the shared dialog; F2 reuses it. F2 adds the only new Rust surface (propagation command).
- Cross-plan: B2 (bugfixes) must land before F3 (the empty-area menu item).
