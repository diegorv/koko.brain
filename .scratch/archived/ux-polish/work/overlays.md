# Overlays review (modals, dialogs, popovers, menus, toasts, palettes, pickers)

Scope: `src/` without `src/tests`. Every finding below was checked against the cited file or screenshot. Paths are relative to the worktree root.

## 1. Current state

### Primitives available (`src/lib/components/ui/`)
dialog, command, popover, dropdown-menu, context-menu, select, tooltip. There is no alert-dialog, sheet or hover-card.

### Usage (app code, opening tags counted with a multi-line parser)
| Overlay | Count | Notes |
|---|---|---|
| `DropdownMenuContent` / `DropdownMenu.Content` | 12 | 5 set `max-h-[300px] overflow-y-auto` (CalendarConfigPanel 59/81/129, FilterRow 122, SortPanel 150) |
| `ContextMenu.Content` + `SubContent` | 8 + 7 | widths w-40, w-44, w-48 x2, w-56 x4 |
| `Select.Content` | 8 | none override the default |
| `Popover.Content` / `PopoverContent` | 11 (+2 raw bits-ui in kanban) | padding `p-3` x7, `p-0` x4. None uses the default `p-4` (popover-content.svelte:20). Widths: w-64 x4, w-72 x3, w-80 x2, w-[300px], w-auto |
| `Dialog.Content` | 6 | widths: sm:max-w-md, sm:max-w-lg, sm:max-w-[440px] x2, max-w-[550px], !max-w-5xl. Padding: default p-6, p-5 x2, p-0 x2 |
| `Command.Dialog` | 4 | CommandPalette, QuickSwitcher, TemplatePicker, OneOnOnePicker |
| `Tooltip.Content` | 4, in 2 files | DailyNoteButton, EventCalendarHeader. The other hints are 120 native `title=` attributes in 49 files (a few are component props such as `Command.Dialog title`) |
| Hand-rolled overlays | 7 | SettingsPanel (drawer), CanvasFilePicker, CanvasLinkInput, CanvasContextMenu, KanbanWikilinkSuggestions, `.cm-lp-callout-type-popover` (styles.ts:483), CodeMirror `.cm-tooltip` (editor-theme.ts:66) |
| Native OS confirms (`ask()` from `@tauri-apps/plugin-dialog`) | 9 calls in 8 files | TrashSection 34/49, UpdateSection 202, editor.service 277, delete-note.service 14, exit.service 35, NoteRowMenu 142, FilesNavigator 193, FileHistoryDialog 44 |
| Toasts (svelte-sonner) | 90 calls | `toast.error` 78. Messages open with "Could not" 20 times and "Failed to" 18 times. One `<Toaster richColors theme="dark" />` (AppOverlays.svelte:12) |

### Surfaces, elevation, radius, motion
- **Five overlay surface colors.** Dialog uses `bg-background` (dialog-content.svelte:30). Command, popovers and menus use `bg-popover`. The canvas overlays use `var(--background)`. Settings uses `bg-settings-dialog-bg`. The callout popover uses `--lp-frontmatter-bg`.
- **Theme values** (theme.logic.ts; the runtime vars come from here, not from app.css `.dark`):
  - Default: popover `#171a26` (line 90), background `#21222e`, editor and card `#2a2e3d`, border and accent `#242835` (lines 95 and 120).
  - Lavender: popover `#DDD8E8` (209), page `#F3F0F8`, border `#D5D0E2` (214), accent `#D5D0E2` (237).
- **Measured WCAG contrast between overlay surfaces:**
  - Default: popover vs border/accent 1.18:1, popover vs app background 1.10:1, dialog `bg-background` vs border 1.07:1.
  - Lavender: popover vs accent/border 1.08:1, popover vs page 1.24:1.
  - In both themes the popover is darker than the page, so menus sink below the page instead of rising above it.
- **Shadows:** menus `shadow-md`, sub-menus `shadow-lg`, dialogs `shadow-lg`, Settings `shadow-[-4px_0_12px_rgba(0,0,0,0.15)]` (SettingsPanel.svelte:115), canvas has 3 hand-written box-shadows (0.4 to 0.5 alpha), the callout popover has `0 4px 12px rgba(0,0,0,.2)`, and CodeMirror tooltips have none. The app defines no shadow token.
- **Radii:** menus and popovers `rounded-md` (8px), dialogs `rounded-lg` (10px), canvas overlays 8px in CSS, callout popover 6px, CodeMirror tooltip 0, canvas and picker items 4px, dialog close button `rounded-xs` (2px, Tailwind default, not a token).
- **Scrim:** `bg-black/50` in both themes (dialog-overlay.svelte:16). The canvas uses its own `rgba(0,0,0,.5)` and Settings has none.
- **Motion:** none actually runs (see P1). Settings uses Svelte `fly` (200ms). Nothing in the overlays respects reduced motion.
- **Cross-cutting:** `app.html` hard-codes `class="dark"`, so every shadcn `dark:` variant (for example `dark:data-[variant=destructive]:data-highlighted:bg-destructive/20` in the menu items) also applies in Lavender Haze.

## 2. Problems (verified)

### High
- **P1. No overlay animation runs anywhere.** Every shadcn overlay uses `data-[state=open]:animate-in fade-in-0 zoom-in-95 slide-in-from-*` (dialog-content.svelte:30, popover-content.svelte:20, dropdown-menu-content.svelte:24, context-menu-content.svelte:23, select-content.svelte:30, tooltip-content.svelte:30). Tailwind v4 core does not define these classes. They come from `tw-animate-css`, which is not installed: `src/app.css` imports only `tailwindcss` and katex, and `package.json` has no animate package. The production bundle (`build/_app/immutable/assets/*.css` in the main checkout) contains 0 `animate-in` rules. As a result, dialogs, menus and popovers appear and disappear in a single frame. The 100 to 150ms fade and zoom is a large part of the polish in Linear and Things.
- **P2. Native confirm dialogs show "Yes" and "No".** `ask()` is documented as "Shows a question dialog with `Yes` and `No` buttons" (`node_modules/@tauri-apps/plugin-dialog/dist-js/index.d.ts`, v2.8.4). Only UpdateSection.svelte:202 passes `okLabel`/`cancelLabel`. The other 8 calls (Move to Trash x3, Delete Permanently, Empty Trash, Unsaved Changes x2, Restore Version) ask the user to answer "Yes" to a destructive question. macOS guidance is verb buttons ("Move to Trash" and "Cancel").
- **P3. Right-clicking in the editor drops the selection and offers no Copy or Paste.** `handleContextMenu` dispatches `EditorSelection.cursor(pos)` (MarkdownEditor.svelte:273), so selected text is lost on right-click. The menu (616-626) then offers only "Copy link to block" and "Copy block embed", because the shadcn ContextMenu replaces the native menu. A note editor whose right-click cannot copy the selection looks broken.
- **P4. The Settings drawer is neither a layer nor a modal.** In SettingsPanel.svelte:113-120:
  - There is no scrim, and the edge shadow is 0.15 alpha black, which is invisible on `#21222e`.
  - The width is a fixed inline 820px. It cuts the editor mid-word ("Alpha", "2026-11-0") in default/20-settings-03-rail.png and in lavender/20-settings-00-appearance.png.
  - It has `role="dialog"` but no `aria-modal`, does not move or trap focus on open, does not close on outside click, and its close button (125-131) has no focus-visible style.
  - Escape is a `svelte:window` listener, so it also fires while a Select or popover inside Settings is open. I did not check whether bits-ui stops that event.
  - Tradeoff: the missing scrim lets the Appearance section preview a theme live on the app behind it, and a dark scrim would hide that preview.
- **P5. The canvas overlays are a separate visual system that breaks in Lavender Haze.**
  - CanvasFilePicker, CanvasLinkInput and CanvasContextMenu hard-code `rgba(255,255,255,.08 to .15)` for borders, hover and separators: CanvasFilePicker.svelte:91/103/135, CanvasLinkInput.svelte:90/107/108, CanvasContextMenu.svelte:182/207/238. White-on-lavender hover and borders are invisible.
  - CanvasFilePicker shows `file.path` (63), which is the absolute path (absolute paths everywhere, per CLAUDE.md). QuickSwitcher shows `relativePath`.
  - None of the three has dialog or menu roles, a focus trap, or animation.
  - The pickers have no arrow-key navigation, so Enter cannot pick a result.
  - The canvas menu text is 12px, against 14px in every shadcn menu.
  - The context menu flips on a fixed 200px threshold (CanvasInner.svelte:311-314), not on its measured size, and the node menu with ColorPicker is taller than 200px.
- **P6. Overlay surfaces have no elevation.** See the contrast numbers in section 1:
  - In the default theme the popover is darker than the page, its border is 1.18:1, and black shadows do not show on a dark base, so menus read as holes (default/13-more-menu.png).
  - In Lavender the popover is darker than the page, and the selected row (accent) against the popover is 1.08:1. The highlighted quick-switcher row is barely visible (lavender/06-quick-switcher.png).
  - Dialogs use a third surface (`bg-background`), and their border is 1.07:1 against it.
- **P7. File History has no visible close and shows a stray focus ring.** It passes `showCloseButton={false}` (FileHistoryDialog.svelte:57) and renders its own header without an X (65-67). Dialog content has no `outline-none` (dialog-content.svelte:30). With no focusable child, bits-ui focuses the content, and the whole dialog gets a blue browser focus ring (default/12-cmd-view-file-history.png). The title is also rendered twice, once as sr-only `Dialog.Title` (59) and once as a visible `<h2>` (66).

### Medium
- **P8. Toasts ignore the theme.** `<Toaster richColors theme="dark" />` (AppOverlays.svelte:12) renders dark maroon error toasts on the light Lavender UI (lavender/20-settings-00-appearance.png, bottom right). `richColors` uses Sonner's palette instead of the app tokens. That same screenshot also shows one failure reported twice, inline (AppearanceSection.svelte:253) and as a toast (51).
- **P9. CodeMirror tooltips and autocomplete are square and flat.** `.cm-tooltip` sets only bg, color and border (editor-theme.ts:66-70): no radius, padding or shadow. Wikilink autocomplete is one of the most-used overlays and does not look like the menus.
- **P10. The command palette and quick switcher are sparse and give no keyboard guidance.**
  - command-dialog.svelte:33 forces `py-3` on items, and both lists render two-line rows (CommandPalette.svelte:56-59, QuickSwitcher.svelte:83-90). The result is about 62px rows, and `max-h-[300px]` (command-list.svelte:15) shows only about 4.5 results (default/05, default/06).
  - The second line repeats information: "Calendar: Go to Today" with "Navigation" underneath.
  - There is no footer with key hints. A dialog close X sits in the search row, and `pe-8` in command-input.svelte:14 reserves room for it. Command palettes normally close with Esc only.
- **P11. The quick switcher's "Create" action cannot be reached from the keyboard.** The create button lives inside `Command.Empty` (QuickSwitcher.svelte:95-103). That is not a `Command.Item`, so Enter on a no-match query does nothing, and the user must Tab or click. Obsidian creates the note on Enter (or Shift+Enter).
- **P12. Hand-rolled note pickers.** RelationshipSearch.svelte:51-90 and KanbanWikilinkSuggestions.svelte:79-88 each implement the picker the quick switcher already has:
  - RelationshipSearch: `text-[13px]`/`text-[11px]`, `h-8` input, `hover:bg-accent`, and Escape only (31-36), with no arrow keys or Enter.
  - KanbanWikilinkSuggestions: selected rows use `bg-accent` but hover uses `bg-muted` (82), and it has no animation and no portal (`absolute z-50`).
- **P13. The confirm and destructive pattern is inconsistent.**
  - Deleting a calendar event (EventDialog.svelte:166-172, EventPopover.svelte:125-131) shows an "Event deleted" toast with Undo (event-calendar.service.ts:1462-1474).
  - Moving a note or folder to the reversible Trash blocks on a native confirm (delete-note.service.ts:14, NoteRowMenu.svelte:142, FilesNavigator.svelte:193).
  - The Delete button sits first in EventDialog's footer (210) but last in EventPopover (189).
- **P14. Dialog structure varies per dialog.**
  - TypeNameDialog, ViewDialog and EventDialog use `Dialog.Header`/`Title` (text-lg) with a footer of Cancel (outline) then primary, which is correct.
  - FileHistoryDialog uses a custom `text-sm font-semibold` bar with no close. IconPicker uses a custom `text-sm font-medium` bar with a hand-rolled `Dialog.Close` that has no focus style (IconPicker.svelte:143-147).
  - EventDialog and EventShortcutsDialog override the padding to `p-5`.
  - `IconPicker` sets `max-w-[550px]` (140), but `sm:max-w-lg` from the base class is a different variant, so tailwind-merge keeps both, and from 640px up the dialog is 512px. FileHistory had to use `!max-w-5xl` to win.
  - Dialog content has no max height or scroll (dialog-content.svelte:30). ViewDialog holds FilterPanel, which can grow to 400px (FilterPanel.svelte:94), so in a short window the footer can be pushed off screen.
- **P15. Validation timing in form dialogs differs three ways.**
  - EventForm derives `errors` from the draft at once (EventForm.svelte:38, 73-74), so "New event" opens with the Title field red and "Enter a title." shown (default/12-cmd-new-calendar-event.png).
  - TypeNameDialog hides the error while the field is empty (TypeNameDialog.svelte:30).
  - ViewDialog waits for a `typed` flag (ViewDialog.svelte:191).
- **P16. Native controls inside the event dialog.** A native checkbox (EventDialog.svelte:201) and native `type=date`/`time` inputs sit next to a shadcn Switch and Inputs. The browser glyphs and the white checkbox show clearly in default/12-cmd-new-calendar-event.png. The footer also mixes `size="icon"` (36px, button.svelte:23) and `size="sm"` (32px, button.svelte:21) buttons in one row (EventDialog.svelte:210-216, EventForm.svelte:186-187).

### Low
- **P17. Menu item anatomy drifts.**
  - 11 icons carry `mr-2` on top of the item's `gap-2`, which doubles the gap to 16px (EditorTabs.svelte:84/90, MarkdownEditor.svelte:618/623, KanbanCard.svelte:236/240/245/270, KanbanLane.svelte:271/275/280/297; visible in default/10-context-menu-file.png against 13-more-menu.png).
  - CollectionView's menu wraps each label in `text-xs` (CollectionView.svelte:458-470), so it renders at 12px.
  - Labels mix Title Case ("Pin Tab", "Close Tab", "Card Color", "Remove Color", "Set Card Limit") with the sentence case used elsewhere ("Copy path", "Open in new tab").
  - The More menu puts a separator between single items (NoteActionBar.svelte:197-213), so every item is its own group.
  - The editor menu hard-codes `⌘⇧L` (MarkdownEditor.svelte:620) instead of using `formatShortcut`, and the two labels are not parallel ("Copy link to block" / "Copy block embed").
- **P18. Popover sizing and padding are set per call.** There are four widths for sibling toolbar popovers (CollectionView.svelte:504/531/554/573, RailNoteList.svelte:434/455). The default `p-4` is overridden everywhere. The menu cap `max-h-[300px]` is repeated 5 times.
- **P19. The callout type popover is styled like frontmatter.** It uses `--lp-frontmatter-bg`, a 6px radius, a hex fallback `#1f2330` and option text at 0.75em (styles.ts:483-509), not the menu tokens.
- **P20. Native `title` tooltips are the norm.** That is about 110 hint tooltips (unstyled, slow to appear) against 4 shadcn tooltips. Icon-only buttons in GraphControls.svelte (34, 43, 53, 60, 70, 91) rely on `title` with no `aria-label`.
- **P21. The template picker has no way back.** After a template is picked, Escape closes the whole flow and drops the choice (TemplatePicker.svelte:57-61). The naming step also re-implements the Command input (74-81) and hand-styles `<kbd>` (85). EventShortcutsDialog.svelte:23 styles `<kbd>` a different way.
- **P22. KanbanDatePicker cannot be dismissed with an outside click.** It prevents `onFocusOutside` and `onInteractOutside` (KanbanDatePicker.svelte:102-103) with no rationale; the code dates from the initial commit b7358e712. The sibling tag popover (KanbanCardText.svelte:45-50) does close on an outside click.
- **P23. Toast copy is generic.** For example, "Failed to create file." swallows the cause (QuickSwitcher.svelte:50-51), and the two error voices ("Could not" vs "Failed to") are mixed.

## 3. Recommended standard

**R1. Motion.** Install `tw-animate-css` and add `@import "tw-animate-css";` in `src/app.css`. This activates every existing `animate-in` class unchanged (from memory: the shadcn-svelte Tailwind v4 setup uses tw-animate-css; check its install docs before adding). Keep durations at 150ms for menus and popovers and 200ms for dialogs. Wrap them in `motion-reduce:animate-none`.
- Files: `package.json`, `src/app.css`.

**R2. Elevation tokens.** Add these to `@theme` in app.css and to the theme builder:
- `--shadow-popover: 0 8px 24px -6px rgb(0 0 0 / .35), 0 0 0 1px var(--popover-border)` and `--shadow-dialog: 0 24px 64px -12px rgb(0 0 0 / .5)`.
- A `--popover-border` color that is a visible step from the popover (at least 1.5:1).
- A `--overlay-scrim` per theme: dark `rgb(0 0 0 / .55)`, light `rgb(40 30 60 / .25)`.
- Raise `popoverBg` so the popover sits one step lighter than `panelBg` in dark themes and is white (or lighter than the page) in light themes. Raise `accent` until the highlighted row reaches at least 1.3:1 against the popover.
- Files: `src/app.css`, `src/lib/core/settings/theme-builder.logic.ts` (around 181 and 227-229), `src/lib/core/settings/theme.logic.ts` (90, 95, 120, 209, 214, 237), `dialog-overlay.svelte:16`.

**R3. Menus** (dropdown, context, select, sub-menus, CodeMirror tooltip, callout popover, canvas menu, kanban suggestions):
- Container: `bg-popover rounded-md border p-1 shadow-(--shadow-popover)`, and sub-menus use the same shadow as the root.
- Items: `h-8 px-2 gap-2 text-sm rounded-sm`, icons `size-4` with no margin.
- Width: `min-w-[8rem]`, with only `w-48` (narrow) or `w-56` (default).
- Separators only between groups of two or more items. Sentence case for labels. Shortcuts come from `formatShortcut`.
- Files: the 4 ui menu contents plus the sub-contents, `editor-theme.ts:66-76`, `styles.ts:483-517`, `CanvasContextMenu.svelte` (rebuild on `ContextMenu`), `KanbanWikilinkSuggestions.svelte`, `EditorTabs.svelte`, `MarkdownEditor.svelte`, `KanbanCard.svelte`, `KanbanLane.svelte`, `CollectionView.svelte:454-470`, `NoteActionBar.svelte:188-213`.

**R4. Popovers (panels):**
- Container: `rounded-lg p-3 shadow-(--shadow-popover)`; change the default in popover-content.svelte:20 from `p-4` to `p-3`.
- Two widths: `w-64` (pickers and small forms) and `w-80` (sort, filter, properties and calendar panels).
- One menu cap class, for example `max-h-72`, in place of `max-h-[300px] overflow-y-auto`.
- Files: popover-content.svelte, CollectionView.svelte:504-573, RailNoteList.svelte:434/455, TodoistPopover.svelte:119, CalendarConfigPanel.svelte, FilterRow.svelte, SortPanel.svelte.

**R5. Dialogs:**
- Container: `rounded-xl p-6 shadow-(--shadow-dialog) outline-none max-h-[calc(100dvh-4rem)] overflow-y-auto`.
- Three sizes: `sm:max-w-md` (name and confirm), `sm:max-w-lg` (forms, the default), `max-w-5xl` (two-pane).
- Header: always a visible `Dialog.Title` and the built-in close X, never `showCloseButton={false}` on a plain dialog.
- Footer: `Dialog.Footer` with Cancel (`outline`) then the primary action on the right. The primary uses `variant="destructive"` when destructive. Tertiary or destructive side actions go on the left after `mr-auto`, at the same button size as the rest.
- Validation appears after the first input or submit.
- Files: dialog-content.svelte, FileHistoryDialog.svelte, IconPicker.svelte, EventDialog.svelte, EventShortcutsDialog.svelte, EventForm.svelte, EventPopover.svelte (Delete position).

**R6. Command palettes** (CommandPalette, QuickSwitcher, TemplatePicker, OneOnOnePicker, CanvasFilePicker, RelationshipSearch):
- `Command.Dialog` with `showCloseButton={false}` passed through.
- One-line items `h-9 py-0`, with secondary text muted on the right (path or category).
- List `max-h-[min(60vh,400px)]`.
- A footer hint row using one shared kbd style.
- Create-on-no-match as a real `Command.Item`.
- Non-dialog pickers use `Command` inside a `Popover`.
- Files: command-dialog.svelte:31-33, command-input.svelte:14, command-list.svelte:15, the four palette components, CanvasFilePicker.svelte, RelationshipSearch.svelte, TemplatePicker.svelte (back step).

**R7. Confirmations and toasts:**
- Reversible actions (Move to Trash) get no confirm, only an undo toast, the same as calendar events.
- Irreversible actions (Delete Permanently, Empty Trash, discard unsaved changes, Restore Version) keep a confirm with verb labels.
- `Toaster` takes `theme` from the active theme (`isDarkColor` in utils/color.ts) and drops `richColors` in favor of token classes in `toastOptions`.
- One error voice: "Could not X. <what to do>."
- Files: the 8 `ask()` sites listed in section 1, AppOverlays.svelte:12, QuickSwitcher.svelte:51, AppearanceSection.svelte:51.

**R8. Settings drawer.** Keep it a right drawer, but give it:
- an R2 edge (`border-l` with `--popover-border` plus `--shadow-dialog`);
- a light scrim that is skipped while the Appearance section is active, to keep the live preview;
- `aria-modal`, focus moved to the panel on open and returned on close, and close on outside click;
- a width of `min(820px, 80vw)` in a class rather than inline style.

The alternative is a shadcn-svelte Sheet added through the CLI. Owner decision.
- Files: `src/lib/app/SettingsPanel.svelte`.

## 4. Quick wins and larger changes

### Quick wins (under 1h each)
| Change | Fixes | Effort |
|---|---|---|
| Install `tw-animate-css` and import it in app.css | P1 | 10 min |
| Add `okLabel`/`cancelLabel` verbs to the 8 `ask()` calls | P2 | 20 min |
| Add `outline-none` to dialog-content and re-enable the File History close X; make the sr-only title the visible one | P7 | 15 min |
| Derive Toaster `theme` from the active theme | P8 | 20 min |
| Give `.cm-tooltip` a radius, padding and shadow | P9 | 15 min |
| Remove `mr-2` from 11 menu icons and the `text-xs` spans in CollectionView; sentence-case the 5 labels; trim the More-menu separators | P17 | 30 min |
| Change the Popover default padding to p-3; set the two widths | P18 | 30 min |
| Fix IconPicker width with `sm:max-w-[550px]`, or adopt a standard size | P14 | 5 min |
| Show EventForm errors only after the first input or submit | P15 | 30 min |
| Pass `showCloseButton={false}` from CommandDialog and remove `pe-8` | P10 (part) | 10 min |

### Larger changes
| Change | Fixes | Effort |
|---|---|---|
| Elevation and scrim tokens in app.css and the theme builder, retuned in both built-in themes | P6, P4 (part) | 0.5 to 1 day, plus visual check of both themes and catalog themes |
| Editor context menu: keep the selection on right-click inside it, add Cut, Copy, Paste and Select All, and group the block-link items | P3 | 2 to 3 h |
| Rebuild the canvas picker, link dialog and context menu on Command, Dialog and ContextMenu | P5 | 1 day |
| Command palette redesign: one-line rows, footer hints, keyboard create | P10, P11 | 0.5 day |
| Move RelationshipSearch and KanbanWikilinkSuggestions onto Popover plus Command | P12 | 0.5 day |
| Delete policy: undo toast for trash moves, verb confirms for irreversible actions | P13 | 0.5 day, owner decision |
| Settings drawer modality, focus and edge | P4 | 3 to 4 h, owner decision on the scrim |
| Shadcn date and time pickers plus Checkbox in the event dialog | P16 | 0.5 to 1 day |
| Replace native `title` tooltips on icon-only buttons with Tooltip (one Provider at the app root) | P20 | 1 day, incremental |

## 5. Rejected leads
- #3 Sub-menu overflow: all 7 `SubContent` uses hold 2 to 6 items (Copy path, Card Color, Set Card Limit, Change type), so the clipping is theoretical.
- #4 Tooltip arrow offsets: identical to upstream shadcn-svelte. It is optical tuning, not app drift.
- #5 `⌘` on other platforms: the app ships as a macOS .dmg and `formatShortcut` is Mac-only by design. The real issue (a hard-coded literal) is folded into P17.
- #8 Settings buttons hand-rolled: valid, but it belongs to the controls/forms review, not to overlays.
- #13 Native checkbox in a table cell, #14 missing `role="alert"`, #18 Add formula button, #20 Textarea recipe: not overlays. Pass them to the controls/forms review.
- #21 and #25, "Delete not separated / no confirmation": EventDialog already left-aligns Delete with `ml-auto` on the save group, and both paths offer an Undo toast (event-calendar.service.ts:1462). Only the placement mismatch is kept (P13).
- #33 Types and Views menu ordering: the differences are small and follow different object types. Not worth a rule.
- #37 TemplatePicker `outline-none` as a high a11y issue: it matches `Command.Input` (`outline-hidden`), and palette inputs normally show only the caret. The duplicated input is kept as low (P21).
- #44 "Backdrop barely dims": a `bg-black/50` overlay is present (dialog-overlay.svelte:16). It just does little on a dark base. Merged into the scrim token (R2).
- #46 Tab menu covering the tab: it is a right-click `ContextMenu` (EditorTabs.svelte:82), which opens at the pointer. The screenshot only shows where the pointer was.
- #48 and #49 to #53: duplicates, merged into P7 and P4.

Not verified: runtime Escape propagation from bits-ui layers inside Settings (P4). Contrast figures are WCAG ratios computed from the theme hex values, not measured on screen. The tw-animate-css recommendation comes from memory of shadcn-svelte's Tailwind v4 setup; check its docs before installing.
