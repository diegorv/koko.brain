# 28: Settings drawer sits above the status bar, with one header band, a real close button and a distinct selected nav item

**What to build:** The Settings drawer stops at the top of the status bar instead of covering its top 8px, the "Settings" title and the close button share one header band across both columns, the close button is a focusable shadcn ghost icon button at the content column's top right, and the selected nav item looks different from a hovered one.

In `src/lib/app/SettingsPanel.svelte`:
- Root (about lines 114-117): drop the inline `style`; width as the class `w-[min(820px,80vw)]`; bottom from a shared variable, `bottom-(--status-bar-height)`. Define `--status-bar-height: 32px` in the first `:root` block of `src/app.css` (about line 106) and use it in `src/lib/core/status-bar/StatusBar.svelte:8` (`h-(--status-bar-height)` instead of `h-[32px]`). Leave the shadow and the `fly` transition as they are.
- Nav column (about line 122): the header row becomes `flex h-14 shrink-0 items-center px-3` holding the `h2` "Settings" (classes unchanged, `SettingsPanel.test.ts:55-61` checks them); the nav's vertical padding becomes `pb-5` (no top padding), and the close button leaves the nav.
- Content column: wrap the `ScrollArea` in `flex min-w-0 flex-1 flex-col`; its first child is a `flex h-14 shrink-0 items-center justify-end px-4` band holding `<Button variant="ghost" size="icon-sm" aria-label="Close settings" onclick={() => settingsPanelStore.close()}><XIcon /></Button>`; the `ScrollArea` gets `min-h-0 flex-1` and its inner div `max-w-3xl px-10 pb-8` (no top padding), so the page title starts at the same y as the first nav group label.
- Nav item (about line 141): `aria-current={active ? 'page' : undefined}`; selected classes `bg-settings-hover-bg font-medium`; the hover class `hover:bg-settings-hover-bg/60` applies only to items that are not selected, so a selected item never changes on hover; add `focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50`. Remove `!bg-settings-hover-bg` and the dead `bg-accent`.

**Blocked by:** 10

**Status:** ready-for-agent

**Gate:** frontend only: `pnpm check` + `pnpm vitest run` + `pnpm build`, plus `bash scripts/e2e.sh e2e/specs/settings.spec.ts e2e/specs/keyboard-shortcuts.spec.ts e2e/specs/event-calendar.spec.ts`.

- [ ] Failing first, in `src/tests/lib/app/SettingsPanel.test.ts` (mounted with the real `settingsPanelStore`, as the existing type-scale block does): exactly one nav button has `aria-current="page"` and it is the active section's; after `settingsPanelStore.setSection('editor')` it moves to Editor; the selected item's class list has `font-medium` and no token starting with `!`; unselected items carry `hover:bg-settings-hover-bg/60` and the selected one does not
- [ ] Failing first, same file: the button labelled "Close settings" is not inside `nav`, has `data-slot="button"`, and clicking it sets `settingsPanelStore.isOpen` to false
- [ ] Same file: the dialog root has no inline `bottom` or `width` style
- [ ] The existing type-scale and group-label tests in `SettingsPanel.test.ts` stay green unchanged
- [ ] E2E in `settings.spec.ts`: the panel's bottom edge equals the status bar's top edge (`boundingBox()` of `[role="dialog"][aria-label="Settings"]` versus the status bar root); fails today by 8px
- [ ] E2E specs that open Settings (`settings.spec.ts`, `keyboard-shortcuts.spec.ts:21`, `event-calendar.spec.ts:813-830`) stay green

## Notes

- **Other tickets:** Soft: the layout primitives cluster (review section 4 Issue 5) also lists `--status-bar-height`. If it already exists in `src/app.css` when this ticket starts, use it instead of adding one. Not a hard blocker.
- **Status bar overlap:** Issue 10 fixes the 8px overlap. If `--status-bar-height` (or its equivalent) already exists when this ticket starts, reuse it and drop the root-bottom and StatusBar steps above instead of adding a second variable.
- Source: review section 3 Settings rows "Drawer chrome" and "Selected nav equals hover", section 3 Shell layout row "Status bar and Settings constants disagree"; `.scratch/ux-polish/work/settings.md` P2 and P9; `.scratch/ux-polish/work/typespacing.md` M1; `.scratch/ux-polish/work/states.md` P5.
- Cross-cluster: the layout primitives Issue (review section 4 Issue 5) also lists `--status-bar-height`; if it already exists in `src/app.css`, use it and do not add a second one. The interaction-state cluster should leave `SettingsPanel.svelte:141` to this ticket.
- No new colour token: the selected step reuses `settings-hover-bg` at full strength with hover at 60%, plus weight and `aria-current`. A dedicated `settings-selected-bg` token would touch `ThemeColors`, both built-in themes, the theme builder and saved user themes; not worth it for this fix.
- Assumes the owner keeps the right drawer (not a centered modal).
- Out of scope: the drawer shadow (elevation cluster), the `text-heading` role and `icon-chrome` Button size (primitives cluster), motion-reduce on the `fly` (motion cluster), focus handling and the scrim (later tickets in this cluster).
- Size: S.
