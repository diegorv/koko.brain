# 135: Behavior section

**Origin:** `view-editor` Issue 07, moved here on 2026-11-08. Its PRD, raw evidence and closed siblings stay in `.scratch/view-editor/`. Bare Issue numbers in the text below use that feature's numbering; `priority-2026-11-08.md` in this folder maps them to the numbers here.

**What to build:** where the view shows, how a click opens it, and which of its views the rail runs. No UI sets `_visible: false`, `_open_in_editor: true` on an existing file, or `_rail_view` today.

| Field | Key | Control | Read | Write |
|---|---|---|---|---|
| Show in Views | `_visible` (alias `visible`) | checkbox | only the boolean `false` hides (`type-sidebar.logic.ts:378-380`); `"false"` reads as shown, with the ignored note | checked deletes `_visible` and `visible`; unchecked writes `false` |
| Pin to rail | `_rail` | checkbox | only the boolean `true` pins (`lens.logic.ts:222`) | checked writes `true`; unchecked deletes the key |
| Click opens the editor | `_open_in_editor` | checkbox | only the boolean `true` (`type-sidebar.logic.ts:360-362`) | checked writes `true`; unchecked deletes the key |
| Note list runs | `_rail_view` | select, shown with 2 or more views or when a stale value is set | `railViewIndex` plus `railViewNameNote` | "First view (<name>)" deletes the key; a view writes its exact `name` |

- Unchecking Show in Views shows where to reopen the view: the Files navigator row menu and the pin menu (04).
- The select disables a view whose name repeats an earlier one ("same name as view N": `_rail_view` resolves to the first match, `yaml-parser.ts:131-144`). A stale value is kept, with its note, until the user picks.
- Picking another view re-seeds This view's filters, the view sort and the limit from `views[newIdx]`, and the preview re-runs. When those fields were touched, an inline warning says they will be discarded, and a second pick confirms (PRD default D5).
- Hint under the select: "Only the rail reads this; the `.view` tab and inline blocks start on the first view."
- New view: the three checkboxes, no select. Create with "Click opens the editor" checked opens the new `.view` in the editor instead of picking it (as a click on its row would).
- Collapsed summary: `pinned, hidden, opens editor, runs "Board"`.

**Blocked by:** 134

**Status:** ready-for-agent

**Gate:** frontend: `pnpm check` + `pnpm vitest run`; then `bash scripts/e2e.sh` for `rail-shell.spec.ts`.

- [ ] Failing tests first:
  - `src/tests/lib/features/type-definitions/view-dialog.logic.test.ts`: the `visible` alias is dropped on write; checking Show in Views deletes the key; `_rail: "true"` reads as ignored and is kept when untouched; a stale `_rail_view` is kept; a duplicate name is disabled.
  - `src/tests/lib/features/type-definitions/ViewDialog.svelte.test.ts`:
    - Unchecking Show in Views and saving writes `_visible: false`.
    - Picking view "Board" renders Board's filter rows and its preview count.
    - Picking a view after touching the filters renders the discard warning first.
- [ ] `e2e/specs/rail-shell.spec.ts`: hide a view through the dialog; its Views row goes; reopen it from the Files row menu; show it again; the Views row returns.
- [ ] `help/documentation/25-types-and-relationships.md`: § Pinned Rail Items (:155 says a `_rail: "true"` view is marked on its row, which is false for a hidden view: fix it), § View Files (:360), View Metadata Fields (`_visible`, `_open_in_editor`, `_rail`, `_rail_view` rows), § Multiple Views (the dialog's select).

## Notes

- `editView` already passes `promptIndexRefresh`, so Views and the pins update without the throttle.
- **Size:** M.
