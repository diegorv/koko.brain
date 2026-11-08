# 134: Display section

**Origin:** `view-editor` Issue 06, moved here on 2026-11-08. Its PRD, raw evidence and closed siblings stay in `.scratch/archived/view-editor/`. Bare Issue numbers in the text below use that feature's numbering; `priority-2026-11-08.md` in this folder maps them to the numbers here.

**What to build:** how the view looks in Views, on its pin and on its rows. No UI writes `_order` or `_group` today.

| Field | Key | Control | Read | Write |
|---|---|---|---|---|
| Icon and colors | `_icon`, `_color`, `_title_color` (aliases `icon`, `color`, `title_color`) | a button showing the current icon that opens `IconPicker` (`src/lib/features/file-icons/IconPicker.svelte`) and stores the pick in the draft without writing | `extractViewIcon(yaml)`; a rejected `_icon` shows "not recognised; the default icon shows" | the key rules of `updateViewIconYaml` (`type-sidebar.logic.ts:520-543`); Remove deletes the three keys and their aliases; a color needs an icon, a title color does not |
| Group | `_group` (no alias) | input with a datalist of the groups in use (the `group` of `viewNavigatorRows(...)`) | `getViewGroup`: trimmed, blank is not set | trimmed; blank deletes the key |
| Position | `_order` (alias root `order`) | number input, placeholder 50 | `getViewOrder`: only a number is set; `"1"` or a root list is ignored | a finite number; empty deletes `_order` and `order` |
| Row properties | `_list_properties_display` (alias) | `RailPropertiesPicker` (`src/lib/features/rail-shell/RailPropertiesPicker.svelte`: `available`, `selected`, `onChange`) | `getViewListProperties` | the list; empty deletes the key and its alias |

- Help text under Position: "Position in Views and among rail pins; not the order of the notes".
- Row properties `available`: the frontmatter keys of the vault's property index, not only of the listed rows, and without `file.*`, `formula.*` and the keys the property index adds to every record (`archived`, `organized`, `favorite`, `tags`; `collection.logic.ts:63-69`): pills render `note.frontmatter[key]` from the Rust entry (`NoteRow.svelte:100`), where those keys are canonical (`_archived`) or absent.
- Collapsed summary: `rocket, Work, #5`.

**Blocked by:** 133

**Status:** ready-for-agent

**Gate:** frontend: `pnpm check` + `pnpm vitest run`.

- [ ] Failing tests first:
  - `src/tests/lib/features/type-definitions/view-dialog.logic.test.ts`: the `icon:` alias is read and dropped on write; Remove deletes all six spellings; `_order: "1"` is ignored and kept when untouched; `_group: "  "` reads as absent.
  - `src/tests/lib/features/type-definitions/ViewDialog.svelte.test.ts`:
    - Choosing an icon in the nested picker writes nothing until Save. This also proves that a bits-ui dialog opens inside the dialog, which is not verified; if it does not, stop and report in the Comments instead of working around it.
    - Save writes `_icon` and `_group`.
    - The row-property picker offers a vault key that no listed row has.
- [ ] `help/documentation/25-types-and-relationships.md` § View Metadata Fields: the `_icon`, `_color`, `_title_color`, `_group`, `_order`, `_list_properties_display` rows name the dialog.

## Notes

- Shares `type-sidebar.logic.ts` with `view-engine-fixes/12`; chain that after this Issue.
- **Size:** M.
