# 15: IconPicker presets stay readable on tabs, Tasks, Properties and the organize check

**Origin:** Issue 02 review, finding 1 (`.scratch/color-audit/work/02/review.md`). Issue 02 lifts the IconPicker Text/Icon presets in the navigators, NoteRow and the quick switcher with `readableIconColor` / `readableOn` (`file-icons.logic.ts`, `theme-surfaces.logic.ts`). These consumers still render the raw preset hex, tuned for dark themes.

**What to build:**

1. `src/lib/app/EditorView.svelte:59,61`: the editor tab icon (`fileTabIcon`) is lifted to 3:1 on the tab bar (active and inactive tab surfaces).
2. `src/lib/app/EditorView.svelte:67`: `tabTitleColor` passed to `EditorTabs` is lifted to 4.5:1 on the same surfaces. A yellow title on a light-theme tab measures about 1.5:1 today.
3. `src/lib/features/tasks/TasksView.svelte:789`: the Tasks row icon, 3:1 on editor-bg and its hover row.
4. `src/lib/features/properties/PropertiesView.svelte:179,193,266`: the type and link icons in the Properties panel, 3:1 on right-sidebar-bg.
5. `src/lib/features/auto-organize/AutoOrganizeRuleRow.svelte:593`: the preset icon in the rule row, 3:1 on its surface.
6. `src/lib/features/note-list/NoteRow.svelte:90` area: the organize check (`hover:text-type-green` on `hover:bg-primary/15`), named in the audit finding for `theme-builder.logic.ts:123`, reaches 3:1 on the hovered tint.

The stored value in the vault does not change. Reuse the Issue 02 helpers; no new token.

**Size:** S

**Blocked by:** none

**Status:** needs-triage

**Gate:** pnpm check + pnpm vitest run.

- [ ] Each consumer above has a test that the rendered color reaches its target on a light applied theme (Lavender Haze) and the raw yellow preset does not.
- [ ] The frontend gate passes.

## Comments
