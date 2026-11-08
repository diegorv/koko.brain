# Radius review

Scope: `src/` excluding `src/tests`. Values below were measured against Tailwind 4.3.3 by compiling the project's `@theme inline` radius block in a temp directory (outside the repo).

## 1. Current state

### Tokens (src/app.css)

| Class | Source | Resolved value (with `--radius: 0.625rem`, app.css:154) |
|---|---|---|
| `rounded-xs` | Tailwind default `--radius-xs` | 2px (fixed, not tied to `--radius`) |
| bare `rounded` | Tailwind static | **4px, fixed, not tied to `--radius`** |
| `rounded-sm` | app.css:66 `calc(var(--radius) - 4px)` | 6px |
| `rounded-md` | app.css:67 `calc(var(--radius) - 2px)` | 8px |
| `rounded-lg` | app.css:68 `var(--radius)` | 10px |
| `rounded-xl` | app.css:69 `calc(var(--radius) + 4px)` | 14px |

Bare `rounded` (4px) sits below the smallest token (`rounded-sm`, 6px) and does not move if `--radius` changes. No theme overrides `--radius` (no theme file or settings key mentions it), so both themes render identical radii.

Gotcha: the four tokens are declared in `@theme inline`, so utilities inline `calc(var(--radius) ...)` and the compiled output does not emit `--radius-sm/md/lg/xl` as runtime variables. Scoped CSS, CodeMirror `styles.ts` and DOM builders cannot reliably write `var(--radius-md)` today; only `var(--radius)` is guaranteed to exist at runtime. Nothing outside Tailwind references any `var(--radius*)` (0 hits).

### Measured usage

Tailwind radius classes (`.svelte` + `.ts`, false positives such as `const rounded =` removed):

| Class | Count | Notes |
|---|---|---|
| `rounded-md` | 137 | 55 files outside `components/ui` |
| bare `rounded` | ~80 | 36 files; heaviest: GraphControls (8), KanbanView (6), PropertiesPanel (6), NoteRow (5), KanbanLane (4), TodoistPopover (4), PropertyField (4) |
| `rounded-full` | 28 | switches, dots, count badges (consistent) |
| `rounded-lg` | 21 | cards, lanes, dialogs |
| `rounded-sm` | 20 | menu items (stock), some chips |
| `rounded-xs` | 2 | dialog-content.svelte:38 (stock), IconPicker.svelte:145 |
| arbitrary | 2 | `rounded-[4px]` EventPopover.svelte:165, `rounded-[2px]` tooltip arrow (stock) |
| `rounded-xl` | **0** | token defined, no role |

Hardcoded px outside Tailwind:

- Scoped `<style>` / `.css`: `8px` x11, `4px` x8, `6px` x2, `3px` x1, `2px` x1, `0` x2, `12px` x1 (Quick Capture composer root), `50%` x5, `1px` x9 (ThemePreview mini mock, fine). Almost all in `features/canvas/`.
- CodeMirror theme `live-preview/styles.ts`: 23 `borderRadius` literals: `6px` x9, `4px` x8, `3px` x3, `8px` x2, `2px` x1.
- Inline `cssText` in TS DOM builders: `collection-block-widget.ts` (2px pills and bars), `queryjs/kb-ui.ts` (8/6/3/10/12/25%; KBAPI output, `borderRadius` is a public option at kb-api.v1.ts:401).

Literal 6px and 8px happen to equal `rounded-sm` / `rounded-md`, so most of the canvas and editor drift is "right value, not tokenized". The visible drift is 4px vs 8px on the same role and 2/3px one-offs.

### shadcn primitives (stock, internally consistent)

Menus, popovers, select and command surfaces `rounded-md`; their items `rounded-sm`; button and input `rounded-md`; dialog `rounded-lg`; switch and scrollbar `rounded-full`. This is a sound role split and is the baseline the rest of the app should follow. The drift comes from hand-rolled controls: 193 raw `<button>` vs 56 `<Button>`, and 45 raw text `<input>`/`<select>`/`<textarea>` vs 49 `<Input>`.

## 2. Problems (verified)

### P1 [high] Sidebar list rows use 4px on the left and 8px on the right

The same role (a full-width row with hover/active background) gets two radii on either side of the editor, and the 8px rail icon button sits right next to 4px file rows (visible in every shell screenshot, e.g. `default/02-rail-files.png`, `lavender/10-context-menu-file.png`).

- 4px (bare `rounded`): FilesNavigator.svelte:286, TypesNavigator.svelte:265 and :403, NoteRow.svelte:44 and :63, MyPeopleSection.svelte:42, TasksView.svelte:201, EventCalendarNeedsAttention.svelte:44.
- 8px (`rounded-md`): Rail.svelte:79, TableOfContentsPanel.svelte:65 (same `py-[5px]` row geometry as FilesNavigator, different radius), BacklinksPanel.svelte:72/89/99, LinkItem.svelte:17, OutgoingLinksPanel.svelte:71/83, TagItem.svelte:40/56, PropertiesView.svelte:177/246/270, PropertyField.svelte:106, SnapshotList.svelte:39, settings nav.

Why it hurts: list rows are the most repeated shape in the app; two corner sizes read as two design systems.

### P2 [medium] Bare `rounded` is an off-scale radius used ~80 times

4px fixed, below `rounded-sm`, not derived from `--radius`, and mixed with `rounded-md` for identical roles in the same file or panel (P1, P3, P8). Examples: SettingsPanel.svelte:126, EditorTabs.svelte:71, BuildInfo.svelte:42, CollectionView.svelte:430/435/445, CollectionTableView.svelte:89, RelationshipSearch.svelte:44, SearchPanel.svelte:158, SearchResult.svelte:146, GraphView.svelte:441 (stats badge, while sibling floating panels GraphControls.svelte:28/77/127 are `rounded-md`).

Why it hurts: no single place controls the small radius, and any future `--radius` tweak leaves 80 sites behind.

### P3 [medium] Text inputs: 4px vs 8px for the same control

- 4px: NoteRow.svelte:57, FilesNavigator.svelte:458, CollectionView.svelte:430, PropertiesView.svelte:238, KanbanLane.svelte:254/368, KanbanView.svelte:489 (native select) and :501, ThemeColorRow.svelte:64, ThemeEditor.svelte:142.
- 8px: shadcn Input, SentrySection.svelte:69, FormulaRow.svelte:45/70, TasksView.svelte:161, SearchPanel.svelte:154, PropertiesView.svelte:187.

In PropertiesView the add-property input (238, 4px) sits in the same panel as the 8px value field (187). The Kanban toolbar (`default/07-kanban.png`) shows the 4px native select and filter input above 10px lanes.

### P4 [medium] Live-preview blocks and controls drift from each other and from the chrome

`src/lib/core/markdown-editor/extensions/live-preview/styles.ts`:

- Block containers in one note: `.cm-lp-codeblock` 6px (:293), `.cm-lp-embed` 6px (:617), `.cm-lp-mermaid` 6px (:794) vs `.cm-lp-collection-block` 8px (:548), `.cm-lp-qjs-block` 8px (:858). Tables (`border-collapse`) and callouts (left rule) are square by construction, which is acceptable.
- Controls: meta-bind select/button/input 6px (:667/:695/:758), `.cm-lp-qjs-run` 6px (:899), `.cm-lp-qjs-table-nav-btn` 4px (:964), `.cm-lp-codeblock-copy` 3px (:319). The same property edited in the Properties panel uses an 8px field (PropertiesView.svelte:187), so one value has two control shapes a few hundred pixels apart.
- Custom popover: `.cm-lp-callout-type-popover` 6px (:497) with 4px options (:509), vs every shadcn popover/menu at 8px with 6px items.
- Inline chips: `.cm-lp-code` 3px (:264), `.cm-lp-highlight` 2px (:231), `.cm-lp-tag` 4px (:239).

### P5 [medium] Canvas chrome is square and every canvas radius is a px literal

- The left tool stack forces `border-radius: 0` (CanvasToolbar.svelte:67-73) to blend into the xyflow `<Controls>` below it (CanvasInner.svelte:601), and the MiniMap is square too. The rounded 8px nodes next to it (`default/08-canvas.png`) make this the only square chrome in the app.
- Nodes 8px: TextNode.svelte:93, FileNode.svelte:101, LinkNode.svelte:139, ImageNode.svelte:72, GroupNode.svelte:30, CanvasInner.svelte:711/731/749. Inner parts 4px: FileNode.svelte:117, LinkNode.svelte:153/200, CanvasEdge.svelte:69. The nesting order is right; only the tokens are missing.
- Overlays that duplicate shadcn roles with different values: CanvasContextMenu.svelte:184/201 (8px menu, 4px items vs ContextMenu 8/6), CanvasFilePicker.svelte:92/130 (same 8/4), CanvasLinkInput.svelte:92 (8px dialog vs Dialog 10px), :109/:139 (6px input and button vs Input/Button 8px).
- canvas-markdown.css:102 (code 3px), :110 (pre 4px), :139 (mark 2px), :145 (img 4px).

### P6 [medium] Four segmented controls, four constructions

- SearchPanel.svelte:77/80: container `rounded-md p-0.5`, segments 4px.
- EventCalendarHeader.svelte:99/115: container `rounded-md p-0.5`, segments 4px.
- GraphControls.svelte:28/30: container `rounded-md p-1`, buttons 4px (this one is concentric: 8 - 4 = 4).
- KanbanView.svelte:463/465/479: bordered 4px container with `rounded-l`/`rounded-r` children and `gap-0.5`.

With `p-0.5` (2px) inside an 8px container the concentric inner radius is 6px (`rounded-sm`); the 4px segments look undersized, and the Kanban control looks like a different widget.

### P7 [medium] Event chips and bars: 2, 4, 6 and 8px for one role

- Event calendar: EventBlock.svelte:76 and EventMonthGrid.svelte:125 `rounded-md` (8px).
- Collection month view: CollectionCalendarView.svelte:154 `rounded-sm` (6px).
- Collection linear view: CollectionLinearCalendarView.svelte:199 bare `rounded` (4px).
- Embedded collection block calendar: collection-block-widget.ts:372 bars and :244 pills, `border-radius: 2px`.

The same note event renders with four corner sizes depending on which view shows it.

### P8 [low] Inline chips (tags, dates, type badges, keycaps) have no shared radius

- Same table row, two radii: KanbanTableView.svelte:59 tag `rounded-sm` vs :69 date bare `rounded`.
- Kanban card: KanbanCardText.svelte:37/75 `rounded-sm`, :64 bare `rounded`; KanbanDatePicker.svelte:67 `rounded-sm` with a `rounded-full` clear button beside it (:76).
- Elsewhere: NoteRow.svelte:99/109 and SearchResult.svelte:146 4px; AutoMoveSection.svelte:204 `rounded-md`; editor `.cm-lp-tag` 4px.
- Keycaps: EventShortcutsDialog.svelte:24 and TemplatePicker.svelte:85 are both 4px (consistent with each other, no shared component).

### P9 [medium for Kanban, low otherwise] Nested elements with the same radius as their container

- KanbanCard.svelte:167 `rounded-lg` card inside KanbanLane.svelte:215 `rounded-lg` lane with `px-2`: both edges are always visible (border + bg), so the card corners look as round as the column's.
- FormulaRow.svelte:39 `rounded-md` card with `rounded-md` inputs (:45, :70) at `p-2`.
- PropertyField.svelte:169 `rounded-md` list panel inside the :106 `rounded-md` row (the outer bg only shows on hover at /50, so barely visible).

### P10 [low] Hover rows inside popovers use 4px while menu items use 6px

PropertiesPanel.svelte:78 (and its other bare-`rounded` rows), FormulaRow.svelte:78, TodoistPopover.svelte:113/126. These live in popovers next to shadcn menus whose items are `rounded-sm`.

### P11 [low] One-off arbitrary radii

EventPopover.svelte:165 `rounded-[4px]` (12px color square), IconPicker.svelte:145 `rounded-xs` close button (copied from the stock dialog close, dialog-content.svelte:38). Both are invisible at rest (no background), visible only as the focus outline shape.

## 3. Recommended standard

### Token change

Add one token so the existing 4px step joins the scale without a pixel change:

```css
/* app.css @theme inline */
--radius-xs: calc(var(--radius) - 6px); /* 4px */
```

Then `rounded-xs` = 4px (replaces bare `rounded` 1:1), `sm` 6, `md` 8, `lg` 10, `xl` 14. The stock dialog close and IconPicker close move from 2px to 4px (no background, so only the focus outline changes). Also declare the five tokens in `:root` next to `--radius` (app.css:154) so scoped CSS, `styles.ts` and DOM builders can write `var(--radius-md)`; until then they must use `calc(var(--radius) - 2px)`.

Ban in `src/lib` outside `components/ui`: bare `rounded`, `rounded-l`/`-r`/`-t` without a size, `rounded-[...]`, and px literals in `border-radius`/`borderRadius` (except `50%`/`9999px` for dots and pills). A grep test in the style of `layer-rules.test.ts` would keep it from regressing.

### Roles

| Role | Radius | Files to change |
|---|---|---|
| Inline chips in text or rows: tags, dates, type badges, inline code, mark, kbd; checkboxes; icon-only buttons at or under 20px nested in a row | `rounded-xs` (4px) | All ~80 bare `rounded` sites (mechanical rename); KanbanTableView.svelte:59, KanbanCardText.svelte:37/75, KanbanDatePicker.svelte:67/76, AutoMoveSection.svelte:204 (`sm`/`md` -> `xs`); styles.ts:231/264 (2/3px), canvas-markdown.css:102/139; EventPopover.svelte:165 |
| Items inside menus, popovers and command lists; hover rows inside popovers; segments inside a `p-0.5` segmented container | `rounded-sm` (6px) | PropertiesPanel.svelte (bare rows), FormulaRow.svelte:78, TodoistPopover.svelte:113/126, SearchPanel.svelte:80, EventCalendarHeader.svelte:115, KanbanView.svelte:465/479, styles.ts:509, CanvasContextMenu.svelte:201, CanvasFilePicker.svelte:130 |
| Controls: buttons, inputs, selects, triggers, toolbar icon buttons, segmented containers | `rounded-md` (8px) | P3 input list; KanbanView.svelte:463/489/501; KanbanLane.svelte:224/379; styles.ts:319/667/695/744/758/899/964; CanvasLinkInput.svelte:109/139 |
| Floating surfaces: menus, popovers, tooltips, floating canvas/graph chrome | `rounded-md` (8px) | GraphView.svelte:441; styles.ts:497; CanvasContextMenu.svelte:184, CanvasFilePicker.svelte:92 (already 8px, tokenize); CanvasToolbar.svelte + xyflow Controls/MiniMap as one rounded group |
| List rows in sidebars, settings nav and rail | `rounded-md` (8px) | FilesNavigator.svelte:286, TypesNavigator.svelte:265/403, NoteRow.svelte:44/63, MyPeopleSection.svelte:42, TasksView.svelte:201, EventCalendarNeedsAttention.svelte:44 |
| Small cards and embeds: editor block widgets, kanban cards, canvas nodes, event chips/blocks, archive rows | `rounded-md` (8px) | styles.ts:293/617/794 (6 -> 8); KanbanCard.svelte:167 (`lg` -> `md`), KanbanView.svelte:597; CollectionCalendarView.svelte:154, CollectionLinearCalendarView.svelte:199, collection-block-widget.ts:244/372; canvas node literals (tokenize only) |
| Large cards and panels: settings items, theme cards, kanban lanes and archive panel, empty-state dashed cards, dialogs | `rounded-lg` (10px) | Already compliant (SettingItem, AppearanceSection, KanbanLane.svelte:215, KanbanView.svelte:568/579, dialog-content.svelte:30); CanvasLinkInput.svelte:92 (8 -> 10); FormulaRow.svelte:39 (`md` -> `lg`) |
| Window-level surfaces | `rounded-xl` (14px) | No role today. Quick Capture root (composer/+page.svelte:131, 12px) is the only candidate; check it against the native window clip before touching it |
| Count badges, switches, dots, avatars | `rounded-full` | Already compliant |

Nesting rule: an element nested inside a padded container with a visible edge takes at least one step smaller than its container (lg > md > sm > xs). Equal radii are only allowed with zero padding (for example `Popover.Content p-0` wrapping a `Command`).

## 4. Quick wins vs larger changes

### Quick wins

1. Add `--radius-xs`, then rename bare `rounded` -> `rounded-xs` (and `rounded-l`/`-r` -> `rounded-l-xs`/`-r-xs`, `rounded-[4px]` -> `rounded-xs`). About 80 sites in 36 files, zero pixel change, all of them now track `--radius`. About 30 min plus the frontend gate.
2. Left-sidebar rows to `rounded-md` (P1, 8 lines in 6 files). About 15 min. This is the most visible single change.
3. Segmented segments to `rounded-sm` (SearchPanel, EventCalendarHeader) and rebuild the Kanban view switch with the same container/segment pattern. About 20 min.
4. Kanban card `rounded-lg` -> `rounded-md`, archive rows -> `rounded-md`. About 5 min.
5. Popover hover rows to `rounded-sm` (P10). About 10 min.
6. Live-preview literals: 6px blocks -> `calc(var(--radius) - 2px)`, controls the same, callout option 4 -> 6px. About 30 min; re-check the code-block header, which relies on `overflow: hidden`.

### Larger changes

1. Root cause: hand-rolled controls. Move the 45 raw text inputs to `<Input>` (or a shared `size="sm"` variant for the h-6/h-7 inline cases) and the icon-only raw buttons to `<Button variant="ghost" size="icon-*">`, adding an `icon-xs` size for the 20-24px row buttons. 1 to 2 days across features and plugins.
2. Canvas: round the tool stack and the xyflow Controls/MiniMap as one group (`rounded-md` container with `overflow: hidden`, no per-child radius), tokenize every scoped radius, and evaluate replacing CanvasContextMenu, CanvasFilePicker and CanvasLinkInput with shadcn ContextMenu, Command and Dialog. Half a day to 1 day.
3. One chip treatment (a `chip` class or snippet: `rounded-xs px-1.5 py-0.5 text-label`) for tags, dates, type badges and keycaps in kanban, note list, search, collection and the editor `.cm-lp-tag`. Half a day.
4. One event-chip treatment shared by the event calendar and the three collection calendar renderers (P7). Half a day, including the DOM-built bars in `collection-block-widget.ts`.
5. Emit the radius tokens in `:root` and migrate `styles.ts`, canvas CSS and DOM builders to `var(--radius-*)`. Leave `queryjs/kb-ui.ts` defaults unchanged unless you decide to change them: they are KBAPI output, so changing them changes users' dashboards.

## 5. Rejected leads

- 2 (button shadow vs menu shadow): elevation, not radius; covered by the shadow review.
- 3 (dialog `rounded-lg` vs menus `rounded-md`): a correct role split in stock shadcn. Kept as the standard.
- 4 and 28 (`rounded-xs` close buttons): stock shadcn and invisible at rest. Folded into the `--radius-xs` token change (P11), not a standalone fix.
- 5, tooltip arrow `rounded-[2px]`: stock shadcn rotated square, not perceptible. The tab close button part is folded into P2.
- 6 (BuildInfo pill inside `rounded-md`): a 4px pill inside an 8px card nests correctly. Only the token rename (P2) applies.
- 7, height part (h-7 vs h-8): sizing, not radius. The radius part is kept in P3.
- 8 (AutoMoveRuleRow vs UpdateSection padding and border): both are `rounded-lg`. Padding and border belong to the spacing review.
- 9 ("three radii in one section"): empty card, chip and inline code are three different roles, so three radii is correct. Only the inline-code token applies (P8).
- 13, `transition: all` part: motion, not radius. The square-corner part is kept in P5.
- 14, suggestion `var(--radius-lg)`: under `@theme inline` that variable does not exist at runtime. See the gotcha in section 1.
- 16, white text and brightness hover: color, not radius. The radius part is kept in P7.
- 17 (canvas markdown padding): spacing.
- 22 (NeedsAttention pill vs event chips): count and status badges are pills everywhere (TrashSection.svelte:68, FilterPanel.svelte:102/164, Rail.svelte:131). That is consistent.
- 25 (kbd): both keycap sites use 4px, so they are consistent with each other. Folded into the chip rule (P8).
- 26 (week-strip day disc vs now dot): different concepts. The month grid day marker (EventMonthGrid.svelte:104, `rounded-md` at 24px) matches the week strip (`rounded-lg` at 28px) proportionally.
- 27 (create ghost `rounded-md` vs day buttons `rounded-lg`): the ghost previews an event block, which is also `rounded-md` (EventBlock.svelte:76). Correct.
- 32: kept only as a low note in P9, because the outer background appears only on hover.
- 34, nesting claim: a 4px toggle inside a 4px row stops being an issue once rows move to 8px (P1).
- 35 (rail settings icon button size): sizing, not radius.
- 36 (TypesNavigator "New type" `rounded-md`): matches the sibling header actions in RailNoteList.svelte:470/482. The text size belongs to the typography review.
- 37, `py-[5px]` part: spacing. The row radius part is kept in P1.
- 39 (TagItem chevron, label and picker): a smaller radius on the smaller picker dot is correct nesting. Hover intensity is color.
- 42 (GraphControls nested radii): 8px container with `p-1` and 4px buttons is exactly concentric. The padding difference is spacing.
- 50 (Today row chevron alignment in rail settings): layout alignment, not radius.
- Quick Capture composer 12px root: tied to the transparent window shape. Left out until checked against the native window corner.
