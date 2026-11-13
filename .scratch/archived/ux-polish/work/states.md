# UX polish review: interaction states and motion

Scope: hover, active, selected, focus-visible, disabled, cursor, transitions, animation, visible keyboard affordances. This is a read-only review of worktree `ux-polish-review` at `dd4f06376`. Counts cover `src/` minus `src/tests`.

## 1. Current state

**Tokens that drive states**
- `--ring` exists (app.css:124 light, :176 dark) and only the shadcn primitives use it. The `@layer base` block (app.css:379-395) applies `border-border` and nothing else. The `outline-ring/50` that upstream shadcn v4 puts in the base `*` rule was dropped, so any element without its own focus style gets the WebKit system focus ring.
- The theme palette has separate `hover` and `selected` colors (theme.logic.ts:97-98 default, :216-217 Lavender). `theme-builder.logic.ts:231-233` maps them as `muted = secondary = hover` and `accent = selected`. In the static app.css fallbacks, secondary, muted and accent are all the same value (app.css:114/116/118 and :166/168/170).
- `dark:` is never redefined. `src/app.html:2` hard-codes `class="dark"` and app.css has no `@custom-variant dark`. Tailwind 4.3.3 defaults `dark:` to `@media (prefers-color-scheme: dark)` (`node_modules/tailwindcss/dist/lib.js`), so `dark:` follows the macOS appearance setting. It does not follow the selected app theme.
- The project has no motion tokens. It defines no duration or easing variables and has no animation plugin. `tw-animate-css` and `tailwindcss-animate` are absent from package.json and app.css.

**Measured usage**

| Pattern | Occurrences / files | Notes |
|---|---|---|
| raw `<button>` outside `components/ui` | 193 / 74 | 144 of them sit in 55 files that have no `focus:` or `focus-visible:` class at all |
| `focus-visible:` | 57 / 20 | 6 files are ui primitives. Most of the rest are event-calendar (10 files) and collection toolbar |
| focus recipes in use | 5 | `ring-[3px] ring-ring/50` (button, input, select, switch), `ring-2 ring-ring` (event-calendar), `ring-2 ring-offset-2` (EventColorSwatches), `ring-1 ring-offset-1` (resizable-handle), `ring-4` + `outline-1` (scroll-area). There are also 14 `focus:ring` and 9 `focus:outline-none` that use `focus:` instead of `focus-visible:` |
| `transition-colors` | 117 / 43 | Never given a duration, so Tailwind's default 150ms applies |
| `transition-all` | 11 / 7 | Plus 4 CSS `transition: all` (CanvasInner:717, styles.ts:200, :700, and others) |
| explicit `duration-*` | 3 | dialog-content `duration-200` and resizable-handle `duration-150` (2) |
| raw CSS durations | 0.15s `ease` x14, `100ms ease-out` (composer:132), fly `200` (SettingsPanel:117), `1.4s ease-out` pulse (EventCalendarView:270) | The CSS keyword `ease` and Tailwind's default curve are different curves |
| `cursor-default` vs `cursor-pointer` | 41 / 24 vs 73 / 31 | Panes split. Rail, navigators, NoteRow, CalendarNavigator and the ui menu items use default. The right sidebar, tags, tasks, properties, CalendarGrid and collection views use pointer |
| hover fills | `hover:bg-accent` 46, `hover:bg-muted` 30, `hover:bg-file-explorer-accent` 16, `hover:bg-right-sidebar-accent` 8, `/50` 6, `hover:bg-file-explorer-primary/10` 5, plus 15 more variants | 22 distinct hover recipes |
| selected fills | 14 recipes | `bg-primary/10,/15,/20,/25,/30`, `bg-file-explorer-primary/10,/15,/20,/25`, `ring-2 ring-primary`, `ring-2 ring-primary/70`, `bg-accent ring-1 ring-primary`, solid `bg-primary text-primary-foreground` |
| hover-only reveal (`opacity-0 group-hover`) | 12 sites | 0 uses of `group-focus-within`. Only KanbanLane:358 (`focus-within:opacity-100`) and EventDailyNoteButton:30 also reveal on focus |
| `disabled:` outside ui | 4 | Raw buttons that set `disabled` but have no disabled style: KanbanLane:377, CanvasLinkInput:68, SearchPanel:79 |
| `data-[state=open]` outside ui | 0 | No custom trigger shows an open state |
| `aria-pressed` | 32 / 9 | Several different pressed visuals (see P8) |
| reduced motion | `motion-reduce:` 0, `prefers-reduced-motion` 1 (EventCalendarView:285) | 11 `animate-spin`, 8 `hover:scale` |
| keyboard hints | `aria-keyshortcuts` 4, `<kbd>` 3 files. ContextMenu/DropdownMenu Shortcut components are used only in NoteRowMenu and MarkdownEditor | The command palette shows shortcuts (05-command-palette.png shows the `⌘W` chip) |

## 2. Problems (verified)

### High

**P1. No overlay animates, because the animation utilities are never generated.** dialog-content.svelte:30, dialog-overlay.svelte:16, dropdown-menu-content, dropdown-menu-sub-content, context-menu-content, context-menu-sub-content, popover-content, select-content and tooltip-content (9 files) use `animate-in`, `fade-in-0`, `zoom-in-95` and `slide-in-from-*-2`. Without tw-animate-css none of these classes exist. I compiled them against the repo's tailwindcss 4.3.3 and all four produced no CSS (`animate-spin`, a core utility, did). As a result every menu, popover, select, tooltip and dialog appears and disappears in a single frame. The only animated surface is the settings drawer (svelte `fly`, 200ms). The custom canvas overlays (CanvasContextMenu, CanvasFilePicker) have no motion either. This is the largest single gap compared with Linear or Things, where every overlay fades and scales in over 100-150ms.

**P2. Five focus systems, and an off-palette system ring as the fallback.** The base layer sets no outline color, so focused raw buttons (144 in 55 files) and focusable containers get the WebKit default ring. The screenshot `default/12-cmd-view-file-history.png` shows it: a 2px system-blue ring around the whole dialog. dialog-content.svelte:30 has no `outline-none`, and FileHistoryDialog.svelte:57 hides the close button, so bits-ui focuses the content element itself. The lavender capture shows the same ring. Elsewhere the app uses four other recipes (see the table). Examples: EventColorSwatches:49 adds a 2px offset, EventWeekStrip:40 and EventDayHeaders:29 use only a `bg-muted` tint, and EditorSection:53 uses `focus:` so the ring also appears when the popover returns focus after a mouse click. Note that WebKit only sends Tab to buttons when macOS Full Keyboard Access is on. Even so, programmatic focus (dialogs, popover focus return) shows the ring to every user.

**P3. `dark:` variants follow the OS, not the theme.** There are 20 occurrences in 10 files: button outline and ghost (`dark:hover:bg-accent/50`, `dark:bg-input/30`), select-trigger, switch, input, context-menu-item, dropdown-menu-item, scroll-area, AppShell.svelte:188 and BuildInfo:31. With macOS in Light mode, the default dark theme loses all of them (for example, ghost hover becomes full-strength accent). With macOS in Dark mode, Lavender Haze picks them up. Hover strength, input fill and the destructive focus ring therefore depend on a setting the theme cannot control. This is also why select-trigger has no hover in light (lead 13): its only hover rule is `dark:hover:bg-input/50`.

**P4. Meta-bind focus and accent colors are invalid CSS.** styles.ts:683-684, :766-767 and :788 use `hsl(var(--primary))`. `--primary` is a hex value (theme.logic.ts:99 `#9ba3da`, :218 `#6848A8`) or oklch (app.css:112), so `hsl(#9ba3da)` is invalid at computed-value time. When the select or input is focused, its border falls back to `currentColor`, the 30% ring disappears, and the toggle checkbox `accent-color` falls back to the system blue. `.cm-lp-meta-bind-btn` (styles.ts:690-703) sets `outline: none` and has no focus rule at all. The owner uses meta-bind daily.

**P5. Hover, selected and the palette's own `selected` token are mixed up.** The palette gives `accent` the *selected* color, yet 46 sites use `hover:bg-accent` for plain hover, and several lists then use the same `bg-accent` for selected:
- SnapshotList.svelte:39: hover and selected are both `bg-accent`, so a selected row looks like a hovered one.
- SettingsPanel.svelte:141: selected nav is `!bg-settings-hover-bg`, the same as its hover.
- NoteRow.svelte:63: `hover:bg-primary/10` and the active `bg-primary/25` sit on the same element, and Tailwind emits the hover rule after the base rule, so hovering the open note *lightens* it. TypesNavigator:265 avoids this with a ternary.
- Selection uses a different color per pane in one window. In `lavender/20-settings-15-todoist.png` and `lavender/20-settings-08-types.png` the settings nav is a grey pill while the file tree and note list are purple tints. Rail:80, TypesNavigator:266 and FilesNavigator use `file-explorer-primary/25`. CollectionView:435 uses `primary/15`, IconPicker:163 solid `bg-primary`, IconPicker:198 `bg-accent ring-1 ring-primary`, AppearanceSection:172 `ring-2 ring-primary`, plus the "Active" label at :184 and a check at :209.

**P6. The new-event form opens in an error state.** EventForm.svelte:38 runs `validateDraft` eagerly and :73 shows "Enter a title." with `aria-invalid` the moment the dialog mounts. Both screenshots show this: `default/12-cmd-new-calendar-event.png` and the lavender one. The first frame of a create flow reads as a failure.

### Medium

**P7. Controls that appear only on hover cannot be found by keyboard.** These sites have no focus reveal: EditorTabs:71 (close button on inactive tabs), AppearanceSection:189 (Edit and Duplicate), PropertyField:148, :159 and :176 (delete), PropertiesView:290, TodoistPopover:113, KanbanCard:227 and KanbanLane:236 (grips), resizable-handle:31 and routes/(app)/+page.svelte:57 (remove recent vault). Two sites already do it right: KanbanLane:358 (`focus-within:opacity-100`) and EventDailyNoteButton:30.

**P8. Toggle buttons use different visuals for "on".** NoteActionBar:146-178 has four `aria-pressed` buttons. Favorite and organized switch to a hue (`text-type-yellow` or `text-type-green`). Raw and sidebar only brighten to `text-editor-fg`, with no fill. TagsView:59 changes only the icon color, and its sort button has no on state. In CollectionView:524, sort, filter and calendar turn `text-primary` when active, but Properties (:569) stays muted even when columns are customized. GraphControls:31 marks a selected segment with `bg-muted`, while its switches (:89) use `bg-primary`. KanbanView:465 uses `bg-primary/10 text-primary`, and SearchPanel:81 uses a raised `bg-background shadow-sm` segment. That makes 6 encodings for one state.

**P9. Triggers never show an open state.** No custom trigger styles `data-[state=open]` or `aria-expanded`. In `default/13-more-menu.png` the `...` trigger looks idle while its menu is open. The same applies to NoteActionBar:185, CollectionView toolbar popovers, RelationshipSearch:42 and TodoistPopover:113.

**P10. Off-state switches are nearly invisible.** `--switch-unchecked-bg` reaches 1.12:1 against the card in Lavender (`#D2CCE0` on `#DDD8E8`, theme.logic.ts:252/254) and 1.74:1 in Default (`#444660` on `#20212d`). WCAG 1.4.11 asks for 3:1. In `lavender/20-settings-08-types.png` both off toggles almost disappear. In Lavender the unchecked track also equals `settingsHoverBg` (:251).

**P11. Motion timing is ad hoc and sometimes missing.**
- 117 `transition-colors` use Tailwind's curve, while 14 scoped CSS rules use `0.15s ease` (canvas, TagColorPicker:89, editor styles.ts), which is a different curve.
- `transition-all` (11 classes plus 4 CSS rules) animates layout and transform. Examples: PropertyField:159, TodoistPopover:113, Switch, the Button base and +page.svelte:50 together with `hover:scale-[1.02]`, which makes stacked rows overlap.
- Some hovers have no transition at all: Rail.svelte:79 `buttonClass`, CollectionView:435 tabs, TypesNavigator:265 rows and NoteRow:63. These snap, while the neighboring sidebar rows fade.
- resizable-handle.svelte:20 transitions `background` from a gradient (:42) to a flat color-mix (:45). Gradients cannot interpolate, so the 150ms transition does nothing.

**P12. Reduced motion is respected in only one place.** The only `prefers-reduced-motion` rule is EventCalendarView:285. The settings drawer fly, 11 spinners (`SemanticIndexStatus:63` and others) and 8 `hover:scale` effects ignore it.

**P13. Disabled states look enabled or contradict themselves.**
- KanbanLane:377 and CanvasLinkInput:68 set `disabled` with no disabled style, so they look clickable.
- SearchPanel:80 puts `cursor-pointer` and `cursor-not-allowed` on the same element, and the dimmed Semantic and Hybrid segments give no reason (`default/02-rail-search.png`).
- TroubleshootingSection:91-93: the "requires log to file" switch stays enabled while `debugLogToFile` is off.
- command-link-item.svelte:16 uses `data-[disabled=true]`, but bits-ui 2.20.2 sets `data-disabled=""` (`boolToEmptyStrOrUndef`, command.svelte.js:1227), so a disabled link item never dims. The component is exported but currently unused.

**P14. Some actions work only by mouse.**
- KanbanCardText:56 and :65: the tag color swatches and Reset act on `onmousedown` only. Enter or Space on a focused swatch does nothing.
- CollectionTableView:45: sortable `<th onclick>` headers have no tabindex, key handler or `aria-sort`.
- CollectionTableView:56: clickable `<tr>` rows have no tabindex or key handler.
- CollectionView:437: view rename (double-click) and its menu (right-click) have no keyboard path.
- CollectionCalendarView:92: "go to today" requires a double-click on the label.
- RelationshipSearch:31: the keydown handler handles only Escape, so results have no arrow or Enter selection, unlike QuickSwitcher and the command palette.

**P15. Inactive tab text is hard to read.** `--tab-text-inactive #9ca3c7` on `--tab-bar #5a5c79` is 2.62:1 (app.css:191-192 and :153). The active tab is fine at 7.9:1. Inactive tabs are the primary navigation targets.

**P16. Hand-rolled inputs use a weaker focus and ignore the invalid state.** SentrySection:69 and TodoistSection:27 and :50 show focus only as `focus:border-primary/50`, and their placeholder is set to `/50`. SentrySection sets `aria-invalid` but the field has no aria-invalid style. TasksView:161 has the same pattern. KanbanView:489 (`<select>`) has `outline-none` and no replacement. The shadcn `Input` used in TemplatesSection and EventForm gets all of this right.

### Low

- **P17.** The CalendarGrid:68 note-count dots use `bg-file-explorer-primary`, the same color as the selected-day fill at :60, so they disappear on the selected day.
- **P18.** EventBlock:75 and EventAllDayLane:78 draw selection as `ring-2 ring-primary/70` and focus as `ring-2 ring-ring`, two nearly identical rings. EventCalendarView:285 swaps the 3px box-shadow pulse for a 2px outline under reduced motion.
- **P19.** The lane-header drag grip at KanbanLane:236 uses plain `group-hover`, but its root is `group/lane` (:215) and no unnamed `.group` ancestor exists in the kanban or app shell files. The grip probably never appears. Please confirm in the app.
- **P20.** SortPanel:45 tracks `dragIndex`, but the template (:80-88) never renders it, so drag reorder shows no source or target state.
- **P21.** Collapsible content snaps open while its chevron rotates (collapsible-content.svelte is a bare passthrough; OutgoingLinksPanel:57-60, BacklinksPanel and FilesNavigator:446).
- **P22.** The section header hover is `/50` while row hover is full strength in the same panel (BacklinksPanel:56 vs :72, OutgoingLinksPanel:54 vs :71). This is defensible as hierarchy, but no rule documents it.
- **P23.** UpdateSection:293 uses `focus-visible:outline-none` and shows focus only as an underline on text-styled buttons.

## 3. Recommended standard

**R1. Motion tokens and overlay motion** (fixes P1, P11, P12)
- Add `tw-animate-css` (the shadcn-svelte Tailwind v4 default) via `@import "tw-animate-css";` in app.css, which revives the existing classes in the 9 ui files. Alternatively, define `--animate-in` keyframes yourself.
- Add tokens to `@theme`: `--ease-out-ui: cubic-bezier(0.2, 0, 0, 1)`, `--duration-fast: 100ms` (hover, press), `--duration-base: 150ms` (menus, popovers, tooltips, disclosure), `--duration-slow: 200ms` (dialogs, drawers). Use the same duration for the overlay and its content: dialog content and overlay both `duration-200`, menus and popovers `duration-150`.
- Interactive rows and buttons: `transition-colors duration-100`, never `transition-all`. Reveal states use `transition-opacity`. Drop `hover:scale`.
- Wrap every non-essential animation: `motion-reduce:animate-none motion-reduce:transition-none` on spinners and overlays. SettingsPanel `fly` should pass `duration: reduced ? 0 : 200`.
- Files: app.css, package.json, the 9 ui overlay files, SettingsPanel.svelte, CanvasContextMenu, CanvasFilePicker, Rail.svelte, TypesNavigator, NoteRow, CollectionView, resizable-handle, routes/(app)/+page.svelte, live-preview/styles.ts, canvas `<style>` blocks, TagColorPicker.

**R2. One focus ring** (fixes P2, P4, P16, P23)
- Base layer: `* { @apply border-border outline-ring/50; }`, as upstream shadcn v4 does, so every fallback ring uses the theme color instead of system blue.
- Controls: `outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50` (the Button and Input recipe). Dense rows and tree items: `focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset` so the ring is not clipped. Never use `focus:` for rings.
- Large focusable containers (dialog content, panes) get `outline-none`.
- Editor widgets: replace `hsl(var(--primary))` with `var(--primary)` and `color-mix(in oklab, var(--primary) 30%, transparent)`, and add `:focus-visible` to `.cm-lp-meta-bind-btn`.
- Hand-rolled inputs become the shadcn `Input`.
- Files: app.css, dialog-content.svelte, live-preview/styles.ts (683-684, 702, 766-767, 788), SentrySection, TodoistSection, TasksView:161, KanbanView:489, EditorSection:53, UpdateSection:293, EventWeekStrip:40, EventDayHeaders:29, EventColorSwatches:49, scroll-area.svelte:32, resizable-handle.svelte:24.

**R3. Make `dark:` follow the theme** (fixes P3)
- Add `@custom-variant dark (&:where(.dark, .dark *));` to app.css and have the theme applier toggle `.dark` on `<html>` by theme brightness, removing the static `class="dark"` from app.html. Alternatively, delete the `dark:` variants and express the differences through tokens.
- Files: app.css, app.html, the theme apply service in core/settings, and the 10 files that use `dark:`.

**R4. Hover, selected and pressed tokens** (fixes P5, P8, P9)
- Hover: `bg-muted` (palette `hover`). Selected or current: `bg-accent text-accent-foreground` (palette `selected`) plus `aria-current` or `aria-selected`. Never apply hover to a selected element (`{active ? sel : 'hover:bg-muted'}`).
- Pane variants follow the same mapping: in file-explorer and right-sidebar, hover is `*-hover` and selected is `*-accent`. Add `--file-explorer-hover` and `--right-sidebar-hover` if needed, and retire the five `*-primary/10-25` selected fills.
- Pressed toggles: `aria-pressed:bg-muted aria-pressed:text-foreground`. Semantic hue only for favorite and organized indicators.
- Menu or popover triggers: `data-[state=open]:bg-muted data-[state=open]:text-foreground`.
- Segmented controls: the SearchPanel raised-segment style, used for GraphControls and the KanbanView mode switch too.
- One selected marker per row: drop AppearanceSection's ring and "Active" label and keep the check.
- Files: NoteRow, SnapshotList, SettingsPanel:141, Rail, TypesNavigator, FilesNavigator, CollectionView, IconPicker, AppearanceSection, NoteActionBar, TagsView, GraphControls, KanbanView, CalendarGrid, EventBlock and EventAllDayLane (selection as an inset bar or tinted fill, ring reserved for focus), app.css and theme-builder.logic.ts.

**R5. Reveal on focus as well as hover** (fixes P7, P19)
- Every `group-hover:opacity-100` gets `group-focus-within:opacity-100 focus-visible:opacity-100`. Keep the active-tab close button always visible.
- Use the named group form wherever a parent is named (KanbanLane:236 becomes `group-hover/lane`).
- Files: the 12 sites listed in P7.

**R6. Cursor and disabled** (fixes P13)
- Cursor policy for a native macOS app: `cursor-default` on all chrome (rows, tabs, icon buttons, menu items). `cursor-pointer` only on in-content links. The ui menu items already follow this. 73 `cursor-pointer` sites in 31 files would change.
- Disabled: `disabled:pointer-events-none disabled:opacity-50` on every raw button that can be disabled, and a `title` that gives the reason. Use `data-[disabled]:` with bits-ui items, never `data-[disabled=true]:`.
- Files: KanbanLane:377, CanvasLinkInput:68, SearchPanel:80, TroubleshootingSection:93, command-link-item.svelte:16, plus the cursor sweep.

**R7. Validation and state legibility** (fixes P6, P10, P15, P17)
- Show field errors after blur or after the first submit attempt (`touched` set in EventForm).
- Off-switch track at 3:1 or more against the card: give `switchUncheckedBg` its own token in both palettes, not `borderStrong` or `settingsHoverBg`.
- Inactive tab text at 4.5:1 or more on `--tab-bar`.
- Calendar dots on a selected cell use `bg-current`.

**R8. Keyboard paths** (fixes P14)
- `onclick` instead of `onmousedown` (use `preventDefault` on `pointerdown` if blur is the concern).
- Sortable headers become `<button>` elements inside `<th>` with `aria-sort`.
- Enter or F2 renames a focused view tab, and Shift+F10 opens its menu.
- A visible Today button in CollectionCalendarView.
- RelationshipSearch should reuse `Command` so arrow and Enter work.
- Show shortcuts in menus through the existing `*MenuShortcut` components, and add Tooltip "Day (D)" and similar labels on the EventCalendarHeader D/W/M tabs.

## 4. Quick wins vs larger changes

**Quick wins (under 1 hour each)**
1. Import `tw-animate-css` so all overlays animate (P1). About 15 minutes plus a visual check of the 9 overlay types.
2. Add `outline-ring/50` to the base `*` rule and `outline-none` to dialog-content, which removes the system-blue rings (P2). About 10 minutes.
3. Fix the `hsl(var(--primary))` lines in styles.ts (P4). About 10 minutes.
4. Make NoteRow, SnapshotList and SettingsPanel nav keep selected on hover with a distinct selected fill (P5 subset). About 30 minutes.
5. EventForm: show errors only after touch or submit (P6). About 30 minutes, with a test.
6. Add `group-focus-within`/`focus-visible` reveal to the 12 hover-only sites and fix the KanbanLane:236 group name (P7, P19). About 45 minutes.
7. Disabled styles on 3 raw buttons, the SearchPanel cursor conflict with a tooltip reason, command-link-item `data-[disabled]` (P13). About 30 minutes.
8. `data-[state=open]` style on the NoteActionBar `...` trigger and the collection toolbar triggers (P9). About 20 minutes.
9. Switch off-track tokens and inactive tab text values in both palettes (P10, P15). About 30 minutes, color picking included.
10. KanbanCardText `onmousedown` to `onclick` (P14 subset). About 10 minutes.

**Larger changes**
1. `dark:` custom variant plus theme-driven `.dark` toggle, then a review of every `dark:` utility in both themes and both OS appearances (P3). Half a day.
2. Hover and selected token unification across the 46 `hover:bg-accent` sites and 14 selected recipes, plus pane tokens (P5, R4). 1 to 1.5 days, touching about 30 files. Best done with a shared `rowClass(active)` helper or snippet per pane.
3. Focus-visible sweep over the 55 files with raw buttons and no focus style. Prefer moving icon buttons to `Button variant="ghost" size="icon-sm"` (P2). 1 day.
4. Motion tokens and replacing `transition-all` and scoped `0.15s ease` CSS, plus `motion-reduce` coverage (P11, P12). Half a day.
5. Toggle and segmented-control unification (P8). Half a day.
6. Keyboard paths for the collection table, view tabs and RelationshipSearch (P14). 1 day including tests.
7. Cursor policy sweep (R6). 2 hours, mechanical, but it needs an owner decision on default vs pointer first.

## 5. Rejected leads

- 1: AppShell toggle `cursor-default` matches the chrome policy in R6. The `dark:` part is real and merged into P3.
- 2: the toggle has `title`. Missing focus styles are merged into P2.
- 3: the fly offset overshoots only when the window is narrower than 1025px, by 20px or less of travel. Trivial. Reduced motion is in P12.
- 4: kept as a P13 note. The attribute value was confirmed in bits-ui source, but `CommandLinkItem` is unused.
- 5, 7, 39: rewritten as P1. The cause is missing utilities, not mismatched timings.
- 6: the dialog close button uses `focus:`, but a mouse click closes the dialog, so the ring is never seen.
- 8, 18, 24, 72, 76: merged into P2 and P16.
- 9: kept as part of P11.
- 10: an icon-box size issue from upstream shadcn, not a state problem.
- 11, 12: tab focus is merged into P2 and the close reveal into P7. The `opacity-0`/`opacity-100` pair works, since the screenshots show the close X on the active tab.
- 14: `transition-all` on the switch is upstream shadcn. Covered by R1.
- 15: kept as P15, measured at 2.62:1.
- 16: `borderStrong` equal to `border` is a color-token issue for the color review.
- 20, 22, 23, 56, 79: loading, copy and validation-hint content are outside this theme.
- 21: the missing disclosure chevron and hover are real but low. Folded into R2 and R4 (summary rows).
- 25, 83, 117: native color inputs inside labels. The fallback ring after R2's base rule covers keyboard focus, and the hit area is the visible swatch.
- 29, 31, 33, 34, 60, 62-64, 105, 127, 144: accessible names and icon sizes belong to the a11y and density review.
- 30, 148: destructive weight and confirmation are flow and IA issues, not interaction states.
- 38, 43: hardcoded `rgba(255,255,255,…)` hovers are real (63 occurrences in 23 files) but belong to the color-token review. Noted here because they vanish on Lavender.
- 41, 44: canvas handles and the open icon appearing only on hover are standard for svelte-flow and file nodes. Selected nodes already show a ring (CanvasInner.svelte:764).
- 46: wrong. Selection is styled globally at CanvasInner.svelte:764 (`box-shadow: 0 0 0 2px var(--primary)`).
- 66: the edit and view row height change is a layout issue, not a state issue.
- 78: the accent vs muted choice is merged into P5 and R4.
- 84: "Finder" wording is copy. The span nested in a button is an a11y issue.
- 93: a copy-path toast is feedback copy and out of scope.
- 102, 104, 110: the chevron size and reorder icon are iconography. The missing Rail transition is in P11.
- 107, 115, 132: button recipe consolidation belongs to the components review. The focus part is in R2.
- 108, 109: SettingItem rows are static containers. The default disabled Button style is visible.
- 116: merged into P13.
- 125, 126: link underline and text-click toggling are content interaction. Low value.
- 134: wrong. A 28px track, a 12px knob and translate 2px or 14px give a 2px inset on both sides.
- 154: stale word count is data freshness, not an interaction state.
- 157, 158, 160: the editor control transitions are in P11. CodeMirror widgets cannot take keyboard focus by design, since they stop mousedown propagation. An editor pane without a focus ring is standard (Obsidian, Craft).
- 161: merged into P13.
- 162: the empty grey title box belongs to the editor or empty-state review.
- 163: the 2-item tab context menu has no shortcuts to show. Pin and Close are not destructive.
- 165, 166: wrong cause. Both themes use `variant="outline"` (EventForm:186). The default theme's `--border` and `--input` (oklch 0.28) almost match the popover surface, so it is a color-token issue.
- 167: the empty palette state is a content issue, and the keyboard footer is an enhancement.
- 168: kept as P2 evidence. The ring is the WebKit default on the focused dialog content.
- 169, 170: merged into P10.
- 171: not verifiable from the capture (swatch selection is code-driven). EventColorSwatches marks the checked swatch with a `border-foreground` ring at :49.
- 172: merged into P5.
- Not checked: hover captures other than `15-tab-icon-hover.png`, and live keyboard traversal in the Tauri WebKit. Every focus claim comes from code, apart from the two screenshot-confirmed rings.
