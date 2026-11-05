# 21: Default theme overlays sit one step above the editor, and dialogs share the popover surface

**What to build:** ASSUMES OWNER DECISIONS 1 AND 2 (Default popover lighter than the editor with the resulting muted-text lift; modal radius `rounded-xl`). In KokoBrain Default, `popoverBg` is `#171a26` (`src/lib/core/settings/theme.logic.ts` about line 90), the darkest surface in the app, below the sidebar `#21222e` and the editor `#2a2e3d`, so menus sink. Dialogs use a third fill, `bg-background` (`components/ui/dialog/dialog-content.svelte:30`), while `command.svelte:24` paints `bg-popover` inside the palette dialog.

1. Set Default's `popoverBg` to the hex of `mixColors('#2a2e3d', '#F8F8F2', 0.05)` (`utils/color.ts:130`, the editor moved 5% toward the text color in OKLab), written as a literal with a comment saying how it was derived.
2. `dialog-content.svelte:30`: `bg-background` to `bg-popover text-popover-foreground`, and `rounded-lg` to `rounded-xl` (the modal level, 14px).

Consequence (decision 1): Default's muted text `#8a96b1` is at 4.55:1 on the editor today, so any popover lighter than the editor drops it below 4.5 and `readableCore` (`theme-builder.logic.ts` about lines 181-189) lifts `mutedFg` on every surface. `--muted-foreground` and the tokens built from the core muted color (the H2 to H6 heading ramp in `headingAt`, about line 224, and any other `p.mutedFg` reader) get slightly lighter app-wide. That is intended under the decision; the commit lists every variable the snapshot diff changes.

**Blocked by:** 19, 20

**Status:** resolved

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`.

- [x] Failing first, in `src/tests/lib/core/settings/theme.logic.test.ts`: Default's `ui.popover` is lighter than both `ui.editorBg` and `ui.background` (compare `contrastRatio(x, '#000000')`), and `contrastRatio(ui.mutedForeground, ui.popover)` is at least 4.5
- [x] Failing first: a component test in the style of `src/tests/lib/features/type-definitions/ViewDialog.svelte.test.ts` opens a dialog and asserts `[data-slot="dialog-content"]` carries `bg-popover` and `rounded-xl` and not `bg-background` or `rounded-lg`
- [x] The Default snapshot diff changes `--popover` plus only the text tokens the muted lift moves; no other surface or border token changes; the commit lists them
- [ ] Visual check in Default, noted in the commit: the More menu (the `references/ux-polish-2026-11-04/screens/default/13-more-menu.png` case), a tab context menu, the command palette, File History, IconPicker, EventDialog and the Quick Capture composer (`src/routes/composer/+page.svelte:128` reads `--popover`)

## Notes

- **Other tickets:** The contrast guard and semantic color work also touches theme-builder.logic.ts and the theme snapshot; sequence one after the other. This ticket's muted-text lift overlaps that work's goal (brighter Default muted text), so whichever lands second rebases the snapshot.
- **Source:** review section 1 item 5, section 2 "Surfaces" row (dialogs move to `bg-popover`) and "Radius per role" row (`xl` for modals), section 4 Issue 3; `.scratch/ux-polish/work/shadow.md` P1, P12; `.scratch/ux-polish/work/overlays.md` P6.
- **If the owner picks the alternative to decision 1** (keep Default's popover as is), drop step 1 and the first criterion, and keep dialogs on `bg-background`: moving them to the current, darker popover would sink them too. Decision 2 alone then reduces this ticket to the `rounded-xl` swap.
- **Out of scope:** the accent highlight row contrast on the new popover (about 1.2:1 before and after; contrast guard work), the Catppuccin preview overrides in Default (color work), the Settings drawer.
- **Size:** M.

## Comments

- 2026-11-04, branch issue/21-default-popover-and-dialog-surface: Default popover lifted above editor and background (muted text lift keeps 4.5:1), dialogs moved to bg-popover with rounded-xl; app.css .dark heading fallbacks pinned by test. Tests: pnpm check 0/0; full suite at e3891c116 vitest 494 files / 11722 passed, 1 skipped, 1 todo; pnpm build passed (log test-logs/ux-polish/21-deliver.log). Reviews: round 1 APPROVED, round 2 APPROVED (fix round ran). Open: criterion 4 visual check in Default is for the owner (FileHistoryDialog.svelte:86, IconPicker.svelte:163,171, EventShortcutsDialog.svelte:24 first).
