# Shadow and elevation review

Scope: `src/` excluding `src/tests`, plus the screenshots in `references/ux-polish-2026-11-04/screens/default` and `references/ux-polish-2026-11-04/screens/lavender`. Every claim below was checked against the file or the PNG.

## 1. Current state

**Tokens**
- `src/app.css` defines no `--shadow-*`, elevation, scrim or z-index tokens. All `shadow-*` utilities fall through to the Tailwind 4.3 defaults (`node_modules/tailwindcss/theme.css:407-412`). Every level is pure black at 5 to 10% (`shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)`), and only `2xl` reaches 25%.
- At runtime, theme colors come from `themeColorsToCssVars` (`core/settings/theme.logic.ts:32`) via `applyTheme` (`theme.service.ts:25`). The `:root`/`.dark` values in `app.css` are only the pre-theme defaults.
- `src/app.html:2` hardcodes `<html class="dark">` for every theme, Lavender Haze included. Any `dark:` variant therefore also applies to the light theme. Per-theme elevation cannot go through `dark:`, so it has to come from theme vars.
- Surface fills that decide elevation (from `theme.logic.ts` palettes and `theme-builder.logic.ts:227-235`):

| Token | KokoBrain Default (dark) | Lavender Haze (light) |
|---|---|---|
| editor bg | `#2a2e3d` | `#F3F0F8` |
| `--background` (dialogs) | `#21222e` | `#F3F0F8` |
| `--popover` (menus) | `#171a26` (darkest surface) | `#DDD8E8` (same as `settingItemBg`, `codeblockBg`, `frontmatterBg`, `embedBg`, `tableHeaderBg`) |
| `--border` | `#242835` (darker than the editor) | `#D5D0E2` |
| `--settings-dialog-bg` | `#313549` | n/a (inherits) |

**Measured usage**
- Tailwind shadow utilities: 26 uses. `shadow-xs` x9 (button x4, input x2, select-trigger, switch, EventForm), `shadow-md` x9 (popover, select, context-menu, dropdown-menu, KanbanDatePicker:99, KanbanCardText:46, KanbanWikilinkSuggestions:79, `routes/(app)/+page.svelte:31,50` hover), `shadow-sm` x3 (KanbanCard:167, SearchPanel:81 segmented control, CollectionLinearCalendarView:199), `shadow-lg` x3 (dialog-content:30, context-menu-sub-content:16, dropdown-menu-sub-content:16), `shadow-none` x1, arbitrary x1 (`SettingsPanel.svelte:115`).
- Raw `box-shadow`/`boxShadow` with hardcoded black: 7 declarations, 6 distinct recipes, none themed:
  - `SettingsPanel.svelte:115` `-4px 0 12px rgba(0,0,0,0.15)`
  - `live-preview/styles.ts:498` `0 4px 12px rgba(0,0,0,0.2)`
  - `CanvasContextMenu.svelte:187` `0 4px 16px rgba(0,0,0,0.4)`
  - `CanvasFilePicker.svelte:97` and `CanvasLinkInput.svelte:94` `0 8px 32px rgba(0,0,0,0.5)`
  - `CanvasInner.svelte:761,765` `0 2px 8px rgba(0,0,0,0.3)`
- Inset-shadow dividers (`inset 0 -1px 0 var(--divider)`): 8 sites. `AppShell.svelte:253,273`, `CalendarNavigator.svelte:89`, `RailNoteList.svelte:417`, `FilesNavigator.svelte:296`, `SearchPanel.svelte:69` and `TypesNavigator.svelte:202` set it inline; `EditorTabs.svelte:102` sets it in CSS. Only 2 sites use `border-divider`. This is a consistent convention, not drift.
- Focus-ring shadows: `EventCalendarView.svelte:276,279` and `composer/+page.svelte:136` are fine. `styles.ts:684,767` are broken (see P5).
- Call sites never override shadow, radius or fill on shadcn floating content: 44 `*.Content` uses, and the overrides are width/padding only. Elevation is centralized in 9 primitives under `components/ui/`, so fixing those fixes most of the app.
- z-index: Tailwind `z-50` x13 (all shadcn overlays plus 3 kanban popovers), `z-10` x10, `z-20` x3, `z-40` x3, `z-30` x1. CSS literals: 50 (CanvasFilePicker:82, CanvasLinkInput:82), 20 (styles.ts:487), 10 (CanvasContextMenu:181, CanvasInner:702), 5 (CanvasToolbar:47), 1, and computed `10+n` (EventBlock:51). No scale or token. Sonner uses its own very high z-index.
- Toasts: `AppOverlays.svelte:12` `<Toaster richColors theme="dark" />`, with no `toastOptions`/classes. Sonner's built-in shadow, radius and colors apply.

## 2. Problems (verified)

**P1 [high] Floating menus have no visible elevation in the dark theme and read as holes.** `dropdown-menu-content.svelte:24`, `context-menu-content.svelte:23`, `popover-content.svelte:20` and `select-content.svelte:30` all use `bg-popover border shadow-md`. In the default theme that means fill `#171a26` on editor `#2a2e3d`, a border `#242835` that is darker than the editor, and a 10% black shadow that cannot show on a dark surface. Screenshots: `default/13-more-menu.png` (NoteActionBar dropdown at x880-1103, y77-198) and `default/10-context-menu-file.png` (tab context menu) both show a darker recessed box with no edge or lift, while `lavender/13-more-menu.png` shows a faint shadow. Linear, Things and Craft do the opposite in dark mode: the floating surface is a step lighter than the canvas and has a hairline light ring. Polish cost: menus look like inline content, and the two themes disagree.

**P2 [high] Light-theme popovers share their fill with inline content blocks.** In Lavender, `--popover` is `#DDD8E8`, the same value as code blocks, frontmatter, embeds, table headers and setting rows (`theme.logic.ts`, Lavender `ui` block). Menus, the palette and the callout popover come out darker than the `#F3F0F8` editor and visually identical to content chrome. Light-theme convention is a lighter-than-canvas surface plus a soft tinted shadow.

**P3 [high] Canvas is styled for dark only and is visibly wrong on Lavender.** `CanvasInner.svelte:726-743` ("Override Svelte Flow theme for dark mode") hardcodes `--xy-node-border-color: rgba(255,255,255,0.15)`, `--xy-edge-stroke: rgba(255,255,255,0.3)`, `--xy-minimap-mask-background-color: rgba(0,0,0,0.6)`, `--xy-controls-button-border-color` and `--xy-background-pattern-color` as white or black alphas, plus the node shadow `0 2px 8px rgba(0,0,0,0.3)` (761, duplicated in the selected rule at 765). `lavender/08-canvas.png` shows heavy grey node shadows, edges that are close to invisible, and a dark grey minimap mask block. The three hand-rolled canvas overlays use `rgba(255,255,255,0.15)` borders, which disappear on light, and their own black shadows and scrims: `CanvasContextMenu.svelte:181-187`, `CanvasFilePicker.svelte:76-97` and `CanvasLinkInput.svelte:76-94`.

**P4 [medium] Settings drawer elevation is a one-off and does not separate in either theme.** `SettingsPanel.svelte:115` uses `shadow-[-4px_0_12px_rgba(0,0,0,0.15)]`, `border-l border-border` and `z-40`, with no scrim. In `default/20-settings-03-rail.png` the drawer edge at x620 is only a fill change (`#313549` vs editor). In `lavender/20-settings-03-rail.png` the shadow is faint, and the content behind stays at full strength, so the panel reads as a fourth column rather than a sheet. It is the only side sheet, and its elevation matches neither the menus (`shadow-md`) nor the dialogs (`shadow-lg`).

**P5 [medium] The meta-bind focus ring is invalid CSS, so focus shows a currentColor border and no ring.** `live-preview/styles.ts:683-684` and `766-767` use `borderColor: 'hsl(var(--primary))'` and `boxShadow: '0 0 0 1px hsl(var(--primary) / 0.3)'`. `--primary` is oklch in `app.css:112,164` and hex at runtime (`#9ba3da`, `#6848A8`), so `hsl(...)` is invalid at computed-value time. The border falls back to `currentcolor` and the shadow to none. `styles.ts:788` `accentColor: 'hsl(var(--primary))'` falls back to the native accent in the same way. The owner uses meta-bind daily.

**P6 [medium] Editor tooltips and autocomplete are sharp, flat boxes.** `setup/editor-theme.ts:66-70` `.cm-tooltip` sets the popover bg, fg and a 1px border, with no `borderRadius` and no `boxShadow`. Wikilink and tag autocomplete therefore look like a different system from every shadcn popover (`rounded-md shadow-md`).

**P7 [medium] The callout-type popover uses its own recipe.** `styles.ts:485-498` uses fill `var(--lp-frontmatter-bg)` (a content-block color, not `--popover`), `borderRadius: '6px'` (equal to `--radius-sm` today but hardcoded, and smaller than the `rounded-md` 8px of every other menu) and `boxShadow: '0 4px 12px rgba(0,0,0,0.2)'`. It is a floating menu and should use the menu tokens.

**P8 [medium] The modal scrim is the same 50% black in both themes and is duplicated by hand.** `dialog-overlay.svelte:16` `bg-black/50`, with `CanvasFilePicker.svelte:81` and `CanvasLinkInput.svelte:81` repeating `rgba(0,0,0,0.5)`. On Lavender it turns the workspace a muddy grey (`lavender/05-command-palette.png`, `lavender/12-cmd-empty-trash.png`, `lavender/12-cmd-view-file-history.png`). Light-theme apps use a lighter, tinted scrim (roughly 20 to 30% of the theme's dark ink) so the modal lifts without the page going dead.

**P9 [medium] Toasts ignore the active theme.** `AppOverlays.svelte:12` sets `theme="dark" richColors`, so Lavender gets a near-black toast with saturated red (`lavender/20-settings-03-rail.png`, bottom right). The toast text in the shot is a mock-vault error, but the styling is real. Toast shadow, radius and border come from Sonner rather than the app's overlay tokens.

**P10 [medium] Dialog content shows a browser focus outline on top of its border.** `dialog-content.svelte:30` has no `outline-none`/`outline-hidden`. The only `outline` class in the file is on the close button at line 38. `lavender/12-cmd-view-file-history.png` shows a blue ring around the whole File History dialog, doubling the border. Plausibly bits-ui focusing the content when no tabbable child exists (`FileHistoryDialog.svelte:55-57`, `showCloseButton={false}`).

**P11 [low] Menu and sub-menu elevations differ.** The sub-contents use `shadow-lg` (`context-menu-sub-content.svelte:16`, `dropdown-menu-sub-content.svelte:16`) while parent menus use `shadow-md`. This is the shadcn upstream default, and it only shows once shadows are visible (after P1). Pick one level for the whole menu family.

**P12 [low] Overlays use two surface fills.** Dialogs and the command palette shell use `bg-background` (`dialog-content.svelte:30`), menus use `bg-popover`, and `command.svelte:24` paints `bg-popover` inside the `bg-background` dialog. In the dark theme that is `#21222e` vs `#171a26`, so there are two "overlay" colors and neither sits above the editor.

**P13 [low] Pane-header dividers are inline style strings.** The same `style="box-shadow: inset 0 -1px 0 var(--divider)"` is pasted at 7 sites (listed in section 1) plus one CSS rule. The convention is consistent, and the inset is a sensible way to keep `h-10` exact, but a string copied 8 times is easy to drift.

**P14 [low] No z-index scale.** Canvas uses 5/10/50 literals, and the canvas overlays sit at `z-50` (fixed, full-screen), the same layer as shadcn dialogs. The Settings drawer is `z-40` and the event grid uses 10 to 40 locally. Nothing is broken today, but the order is implicit.

**P15 [low] Graph overlay cards have no elevation.** `GraphControls.svelte:28,77,127` and `GraphView.svelte:441` use `border bg-background/90 backdrop-blur-sm` with no shadow. In `default/12-cmd-toggle-graph-view.png` they are three flat stacked cards. Acceptable as e1 chrome, but they should take the same token as other floating canvas chrome.

## 3. Recommended standard

**Tokens.** Add these to `app.css` in a non-inline `@theme` (or `:root`) block that reads two runtime vars. Overriding `--shadow-*` keeps every existing `shadow-*` class working:

```css
--shadow-xs: 0 1px 2px 0 var(--elev-shadow-1);
--shadow-sm: 0 1px 3px 0 var(--elev-shadow-1), 0 1px 2px -1px var(--elev-shadow-1);
--shadow-md: 0 0 0 1px var(--elev-ring), 0 4px 12px -2px var(--elev-shadow-2), 0 2px 4px -2px var(--elev-shadow-1);
--shadow-xl: 0 0 0 1px var(--elev-ring), 0 16px 40px -8px var(--elev-shadow-3), 0 4px 12px -4px var(--elev-shadow-2);
--overlay-scrim: var(--elev-scrim);
```

Emit `--elev-shadow-1/2/3`, `--elev-ring` and `--elev-scrim` from `themeColorsToCssVars` (`theme.logic.ts:32`), chosen by `isDarkColor(editorBg)` (`utils/color.ts:49`). Doing it there keeps `ThemeColors` and custom-theme validation unchanged, and the composer window gets the values through the existing localStorage mirror. Suggested values:
- Dark: shadow alphas black 0.25 / 0.45 / 0.6; ring `rgb(255 255 255 / 0.06)`; scrim `rgb(0 0 0 / 0.55)`.
- Light: shadow alphas tinted toward `fg` (`#302840`) at 0.06 / 0.10 / 0.16; ring `rgb(48 40 64 / 0.08)`; scrim `rgb(48 40 64 / 0.25)`.

**Surfaces.** The theme builder should derive `--popover` as a step above the editor: dark = editor mixed with fg about 4 to 6%; light = editor mixed with white about 60% (or `#FFFFFF`). It should stop sharing the value with content blocks. Change the derivation in `theme-builder.logic.ts:229` and the two built-in palettes (`popoverBg`). Dialogs use the same `bg-popover`.

**Levels (one rule per role):**

| Level | Role | Rule | Files |
|---|---|---|---|
| e0 | Panes, headers | No shadow. Divider via one `@utility divider-b { box-shadow: inset 0 -1px 0 var(--divider) }` | AppShell:253,273; CalendarNavigator:89; RailNoteList:417; FilesNavigator:296; SearchPanel:69; TypesNavigator:202; EditorTabs:102 |
| e1 | Raised in content (buttons, inputs, kanban card, canvas node, segmented control, graph chrome) | `shadow-xs` or `shadow-sm` only | button, input, switch, select-trigger (keep); KanbanCard:167 (keep); CanvasInner:761,765 -> `var(--shadow-sm)`, selected = `0 0 0 2px var(--primary), var(--shadow-sm)`; GraphControls:28,77,127 and GraphView:441 add `shadow-sm` |
| e2 | Floating menus: popover, dropdown, context menu, sub-menus, select, editor tooltip and autocomplete, callout-type popover, kanban popovers, canvas context menu | `bg-popover rounded-md border shadow-md p-1` (popover keeps `p-4`); sub-content uses `shadow-md`, same as its parent | dropdown-menu-sub-content:16, context-menu-sub-content:16 (`shadow-lg` -> `shadow-md`); editor-theme.ts:66 add `borderRadius: 'var(--radius-md)'`, `boxShadow: 'var(--shadow-md)'`; styles.ts:494-498 use `var(--popover)`, `var(--border)`, `var(--radius-md)`, `var(--shadow-md)`; CanvasContextMenu:181-187 move to shadcn `ContextMenu` or the same vars |
| e3 | Modal: dialog, command palette, settings drawer, canvas picker and link dialogs, toast | `bg-popover rounded-xl border shadow-xl outline-none`; scrim `bg-(--overlay-scrim)` | dialog-content:30 (`shadow-lg` -> `shadow-xl`, add `outline-none`, `bg-background` -> `bg-popover`); dialog-overlay:16; SettingsPanel:115 (`shadow-xl`, keep `border-l`, optional scrim); CanvasFilePicker:76-97 and CanvasLinkInput:76-94 (move to `Dialog`, or use the vars); AppOverlays:12 (theme from active mode, `toastOptions.class` with `bg-popover border shadow-xl rounded-lg`) |

**Canvas theme.** Replace the white and black alphas at `CanvasInner.svelte:730-743` with tokens: node border `var(--border)`, edge stroke `color-mix(in oklab, var(--foreground) 35%, transparent)`, minimap mask `color-mix(in oklab, var(--background) 60%, transparent)`, control border `var(--border)`, pattern `color-mix(in oklab, var(--foreground) 6%, transparent)`. Also fix `.add-card-btn` at 720-723.

**Focus.** Change `styles.ts:683-684,766-767,788` to `var(--primary)` and `color-mix(in oklab, var(--primary) 30%, transparent)`.

**z-index scale.** Add one to `@theme`: `--z-raised: 10` (in-pane chrome), `--z-sticky: 20`, `--z-drawer: 40`, `--z-overlay: 50` (scrim, dialog, popover, menu), `--z-toast: 60`. Canvas-local values (5/10) stay local to the canvas stacking context but get a comment. Move the canvas fixed overlays onto the overlay layer through `Dialog` rather than raw `z-index: 50`.

## 4. Quick wins vs larger changes

**Quick wins (each 15 to 45 min, no architecture):**
1. P5: fix the 5 `hsl(var(--primary))` uses in `styles.ts`. 10 min, real bug.
2. P10: add `outline-none` to `dialog-content.svelte:30`. 5 min.
3. P11: sub-content `shadow-lg` -> `shadow-md` (2 files). 5 min.
4. P6: add radius and `var(--shadow-md)` to `.cm-tooltip` in `editor-theme.ts:66`. 10 min.
5. P7: point the callout popover at `--popover`/`--border`/`--radius-md`/`--shadow-md`. 15 min.
6. P13: add `@utility divider-b` and replace the 8 sites. 20 min.
7. P9: derive the Toaster `theme` from the active theme mode. 20 min.

**Larger changes:**
1. P1, P2, P4, P8: elevation and scrim vars from `themeColorsToCssVars`, `--shadow-*` overrides in `app.css`, popover derivation in `theme-builder.logic.ts`, and new built-in `popoverBg` values. About half a day plus visual pass on both themes. The theme tests that snapshot derived colors need updating.
2. P3: canvas tokenization (CanvasInner theme block, node shadow, and moving the two dialogs to `Dialog` and the context menu to shadcn `ContextMenu`). About half a day.
3. P12: unify dialog fill on `bg-popover`, check the palette and IconPicker. 1 to 2 h.
4. P14: z-index scale in `@theme` and migration of literals. 1 to 2 h, low risk.
5. Optional: make `<html class="dark">` follow the theme mode (`app.html:2`, `applyTheme`). Without it, the 20 `dark:` utilities in `.svelte` files also apply on Lavender. Audit those before flipping it. 2 to 3 h.

## 5. Rejected leads

- #2 and #3 (dropdown/popover/select at two elevations): only the sub-contents differ, and that is the shadcn default. Kept as low P11. Popover, select, dropdown and context content already agree on `shadow-md`.
- #6 (canvas `.empty-hint` z-10): local to the canvas container and harmless. Folded into P14.
- #8 (FilesNavigator inline inset divider "only one in the file"): it is the app-wide convention at 8 sites. Reframed as P13 (consolidate, do not replace with `border-b`).
- #9 (TypesNavigator `w-56`): width, not elevation. `w-56` is also used by NoteRowMenu, FilesNavigator and MarkdownEditor menus, so it is consistent.
- #10 (CalendarNavigator inset vs `border border-divider` at 154): the two do different jobs (a header divider and a boxed control). Merged into P13.
- #12 (kanban archive header typography): typography, not elevation. Out of scope.
- #13 (composer root has no border or shadow): the composer is its own transparent Tauri window with `.shadow(true)` (`src-tauri/src/lib.rs:145-148`), so the OS draws the shadow, and a CSS shadow on a 100vw x 100vh root would be clipped. The 12px radius is a radius-theme item.
- #14 (light popover and card pure white in `app.css:109-110`): those are pre-theme defaults that `applyTheme` overrides. At runtime Lavender's popover is `#DDD8E8`, not white, which is the opposite problem (P2). The "no shadow tokens" half is kept in section 1 and P1.
- #17 (lavender palette edges blend into the backdrop): wrong. The palette edge is clear against the scrim in `lavender/05` and `lavender/12-cmd-empty-trash`. The real defect is the muddy scrim (P8) and the missing shadow (P1). "No commands found" for Empty Trash is not an elevation issue.
- #18 (dark palette has no elevation): partly right. The border shows against the darkened scrim in `default/05-command-palette.png`, but the shadow is invisible. Merged into P1 and P12.
- #19 (graph controls as three cards should be one panel): layout preference. Only the missing elevation is kept (P15).
- #20: verified and kept as P1.
- #21: verified and kept as P4. The nav/content split already has `border-r border-border` (`SettingsPanel.svelte:122`) and is faint but present, so no new divider is needed.
- #1, #4, #5, #7, #11, #15, #16: verified and merged into P4, P3, P3, P3/P14, P15, P7 and P6 respectively.

Not verified: Sonner's internal default shadow and z-index values (from memory, not read from `node_modules`); whether bits-ui focuses `Dialog.Content` in every dialog, or only in the ones with no tabbable child (P10).
