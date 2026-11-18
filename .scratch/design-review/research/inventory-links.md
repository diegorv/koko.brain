# Inventory: Backlinks, outgoing links, tags, file history, graph

Scope: `src/lib/features/backlinks`, `src/lib/features/outgoing-links`, `src/lib/features/tags`, `src/lib/features/file-history`, `src/lib/plugins/graph-view`. Facts only. Read-only scout pass, no source edited, no git state changed.

Read first (per `.claude/rules/indexing-watcher.md`): `docs/agents/indexing-watcher-rules.md` (rules 1-2 and 8 cover the `vaultIndexVersion` consumer pattern and index dedupe used by these panels).

## 1. Components in scope

| # | File | Lines | Renders | shadcn/ui used | Custom markup |
|---|------|------:|---------|----------------|---------------|
| 1 | `src/lib/features/backlinks/BacklinksPanel.svelte` | 106 | Right-sidebar "Backlinks" section: "Linked mentions" and "Relationships" collapsibles | `Collapsible` (L7, L64, L81), `Separator` imported but unused (L6) | `SidebarSection` (core, L55), raw `<button>` rows (L91-97) |
| 2 | `src/lib/features/backlinks/LinkItem.svelte` | 35 | One backlink entry: file name + up to N context snippets with link text highlighted | none | raw `<button>` (L16-33); `ShowInCalendarButton` sibling (L34) |
| 3 | `src/lib/features/outgoing-links/OutgoingLinksPanel.svelte` | 87 | "Outgoing links" sidebar section | `Separator` imported but unused (L6) | `SidebarSection` (L51), raw `<button>` for resolved (L61-72), non-interactive `<div>` for unresolved (L74-80) |
| 4 | `src/lib/features/tags/TagColorDot.svelte` | 19 | Colored dot or `Hash` icon | none | span with inline `style:background-color` (L13-16) |
| 5 | `src/lib/features/tags/TagColorPicker.svelte` | 110 | Popover with "No color" button, preset dots, native color input | `Popover` (L3, L31-70) | `.color-dot` buttons and `<label>` wrapping `<input type="color">` (L37-67); scoped `<style>` block (L72-110) |
| 6 | `src/lib/features/tags/TagItem.svelte` | 71 | Recursive tag tree row (collapsible parent or leaf) | `Collapsible` (L3, L28-54) | raw chevron trigger (L30-32), raw name buttons (L39-45, L63-69) |
| 7 | `src/lib/features/tags/TagsView.svelte` | 91 | Tags pane: toolbar (filter, sort), count header, tree | none | raw toolbar `<button>`s (L58-76), `pane-toolbar` class (L50) |
| 8 | `src/lib/features/file-history/FileHistoryDialog.svelte` | 102 | Modal "File History: {name}", two-pane (list + diff), restore button | `Dialog` (L2, L54-102), `Button` (L3, L96) | `Dialog.Content` sized `h-[80vh] !max-w-5xl` (L55) |
| 9 | `src/lib/features/file-history/SnapshotList.svelte` | 68 | Left pane: snapshots grouped by day, reveal-backup icon per row | `ScrollArea` (L2, L21) | raw row `<button>`s (L38-62) with nested `role="button"` span (L49-58) |
| 10 | `src/lib/features/file-history/DiffViewer.svelte` | 56 | Right pane: line diff table | `ScrollArea` (L2, L29) | raw `<table>` (L39-54) |
| 11 | `src/lib/plugins/graph-view/GraphControls.svelte` | 142 | Floating overlay: mode/zoom/close buttons, search input, orphan toggle, tag and folder selects, arrows toggle | none | all raw `<button>`, `<input>`, `<select>`; `z-10` (L26) |
| 12 | `src/lib/plugins/graph-view/GraphView.svelte` | 464 | Canvas graph (d3-force, d3-zoom, d3-drag), footer count (L462), local-mode empty text (L451-455) | none | `<canvas>` (L450), inline `style` background (L449), `style` set on canvas (L282-283, L367) |

Non-component files in scope with user-visible strings or styling: `graph-view.logic.ts` (fallback palette L190-199, `graphPalette` L207-226), `file-history.logic.ts` (labels L46-50, L87-95), `tags.logic.ts`, `backlinks.service.ts`, `outgoing-links.service.ts`, `tags.service.ts`, `file-history.service.ts`, `graph-view.service.ts`.

Mounting points (for context): `AppShell.svelte:285,288` (panels), `EditorView.svelte:75,77` (TagsView, GraphView), `AppOverlays.svelte:24` (FileHistoryDialog).

## 2. States

### Empty / loading / error

Loading:
- `TagsView.svelte:79-80` "Indexing tags..." via `tagsStore.isLoading` (set in `tags.service.ts` via `setLoading`, reset in `finally`).
- `SnapshotList.svelte:22-25` "Loading history..." (`isLoading`).
- `DiffViewer.svelte:30-33` "Loading diff...".
- `BacklinksPanel.svelte:59-60` "Indexing vault..." only when `vaultStore.isOpen && !vaultStore.indexReady`. No loading text for the backlink fetch itself.
- `OutgoingLinksPanel.svelte`: no loading state at all (no `indexReady` check, no spinner, no text).
- `GraphView.svelte`: no loading state. Before first `buildGraph()` resolves, the canvas is blank with no text (`loadAndRebuild` L81-91 sets no flag).

Empty:
- `BacklinksPanel.svelte:61-62` "No backlinks found" (only shown when `linkedMentions` is empty; relationships are not considered, see L80 nested inside the non-empty branch).
- `OutgoingLinksPanel.svelte:55-56` "No outgoing links".
- `TagsView.svelte:81-82` "No tags found" when `displayedTree` is empty. With `hideRareTags` on (default, `tags.store.svelte.ts:5`), the tree is filtered to tags with count >= 10 (`TagsView.svelte:15,35-39`). The header on L53-55 still shows the total, e.g. "N tags". Result: header can show a non-zero tag count while the body says "No tags found".
- `SnapshotList.svelte:26-29` "No history available" (also shown for a load error, see below).
- `DiffViewer.svelte:34-37` "Select a snapshot to view changes". Also shown when a selected snapshot produces zero diff lines (identical content), L34 checks `diffLines.length === 0` only.
- `GraphView.svelte:451-455` "Open a note to see its local graph" only when `mode === 'local'` and `centerPath` is null. A local graph for an isolated note renders a single node (`getLocalGraph`, `graph-view.logic.ts:103-`), with no text.
- Global graph with zero nodes: no empty state (no check of `simNodes.length`, footer still says "0 notes · 0 links", `GraphView.svelte:462`).
- `TagColorPicker`: none (n/a).
- `OutgoingLinksPanel.svelte:53-54` and `BacklinksPanel.svelte:57-58`: non-markdown active tab shows "Not available" with no reason.

Error:
- No component renders an error state in this area. Every service catches and only logs:
  - `backlinks.service.ts:100-102` (`scan_vault_v2_cached`), `:166-168` (`fetchBacklinksV2`), `:182-184` (`fetchRelationshipBacklinks`), `:224-226` (`computeUnlinkedMentionsForFile`).
  - `outgoing-links.service.ts:87-89`.
  - `tags.service.ts:52-54`.
  - `file-history.service.ts:47-50` (load failure sets `isLoading` false, UI then shows "No history available" from SnapshotList L26-29), `:72-74` (diff failure: DiffViewer shows "Select a snapshot to view changes"), `:101-104` (restore failure: rethrows), `:145-147`, `:174-176`, `:193-195`.
  - `GraphView.svelte:84-86` (`buildGraph` failure: logs, returns, keeps previous graph, no UI).
- `FileHistoryDialog.svelte:50` `await restoreSnapshot(snapshot.id)` has no try/catch; the rethrow from `file-history.service.ts:103` reaches the click handler unhandled (L40-51).

Disabled:
- No disabled states in any component in scope (grep: no `disabled` attribute or `aria-disabled`).

## 3. Interaction

Keyboard:
- Only explicit key handler in scope: `SnapshotList.svelte:55` (`Enter` on the reveal-backup span, `stopPropagation`; `Space` not handled).
- No keyboard handling in GraphView canvas (no `onkeydown`, no `tabindex` on `<canvas>` at `GraphView.svelte:450`). Nodes are not keyboard-reachable; there is no Escape or arrow handling.
- `BacklinksPanel` / `OutgoingLinksPanel` rows and `TagItem` rows are native `<button>`s (keyboard activation works by default); the tag row container `div` (`TagItem.svelte:56`) is not focusable.
- `GraphControls.svelte:78-84` search input: no keyboard shortcut, no Escape clear.

Focus management:
- `FileHistoryDialog.svelte:54`: focus handling is inherited from shadcn `Dialog`. No explicit focus restore or initial focus in component code.
- No `autofocus` anywhere in scope.
- `TagColorPicker.svelte:31-70`: focus inherited from shadcn `Popover`; the custom color `<input>` (L61-66) is inside a `<label>` (L55-67) with `opacity-0` (L63), so it is invisible but focusable.

Hover-only affordances:
- `GraphView.svelte:261`: node labels are drawn only when zoom `k > 0.8` or the node is connected/active. No hover tooltip with the node name exists.
- `TagColorPicker.svelte:93-95`: `:hover` border on preset dots (visual only; no tooltip beyond native `title`).
- `ShowInCalendarButton` (used in `LinkItem.svelte:34`, sibling file outside scope) has `focus-visible:ring-2` (`event-calendar/ShowInCalendarButton.svelte:67`). Visibility condition (hover or always) not checked in this pass.

Drag and drop:
- `GraphView.svelte:319-346`: d3-drag on canvas pins a node (`fx`/`fy`) while dragging. No keyboard or pointer-free equivalent. Pinned position is not persisted (no store write).
- No HTML5 DnD in scope (`draggable`, `ondrop`: none).

Context menus:
- None in scope (no `oncontextmenu`).

Tooltips:
- Native `title` attributes only, no shadcn `Tooltip` component used in scope. Locations: `TagsView.svelte:61,68`; `TagColorPicker.svelte:42,52,59`; `GraphControls.svelte:34,43,53,60,70,91,134`; `SnapshotList.svelte:53`.

Pointer and click handlers on non-buttons:
- `GraphView.svelte:349-350`: `click` and `mousemove` on `<canvas>`. Hit-testing is manual (`findNodeAt` L288-302, radius + 4 px).
- `TagColorPicker.svelte:37`: `onpointerdown={(e) => e.stopPropagation()}` on wrapper `div.color-picker`, with `svelte-ignore a11y_no_static_element_interactions` at L36.
- `SnapshotList.svelte:49-58`: `<span role="button" tabindex="0">` with `onclick` and `onkeydown`, nested inside the row `<button>` (L38-62). Nested interactive controls: a `<button>` containing a `role="button"` element. The `svelte-ignore node_invalid_placement_ssr` comment is at L48.
- `TagColorPicker.svelte:55-67`: `<label>` wrapping `<input type="color">` used as the "custom" swatch.

## 4. Accessibility facts

Icon-only controls and their names:
- `TagItem.svelte:30-32` chevron trigger: no `aria-label`, no `title`. Accessible name empty.
- `TagColorDot` picker trigger (`TagColorPicker.svelte:32`, with children `TagColorDot`): no `aria-label`, no `title`.
- `TagColorPicker.svelte:41-44`: "No color" button has `title="No color"` (no `aria-label`), contains X icon.
- `TagColorPicker.svelte:48-53`: preset buttons use `title={name}` (no `aria-label`), no visible text. Swatch-only.
- `TagColorPicker.svelte:55-67`: custom color label has `title="Custom color"`; input inside has no `aria-label`.
- `TagsView.svelte:58-64` (filter) and `:65-75` (sort): `title` only, no `aria-label`. Pressed/active state conveyed by icon color only (`text-primary` vs `text-muted-foreground`, L63, L71-73). No `aria-pressed`.
- `GraphControls.svelte:29-37, 38-46, 51-56, 57-63, 68-73`: icon-only buttons with `title` only, no `aria-label`. Mode buttons (L30-32, L39-41) show active state with background only; no `aria-pressed`.
- `GraphControls.svelte:86-97` and `:129-140`: the "Orphans" and "Arrows" toggles are `<button>` inside `<label>` (L86, L129). Switch visual is a `<span>`; no `role="switch"`, no `aria-checked`. The `<label>` wraps the button, so clicking the text "Orphans" does not toggle (the label has no `for`/input). Button `title` is "Toggle orphan nodes" (L91) and "Toggle directional arrows" (L134).
- `SnapshotList.svelte:53` reveal-backup: `title="Show backup file in Finder"`, `role="button"`, `tabindex="0"`, no `aria-label`.
- `GraphControls.svelte:78-84` search input: placeholder only, no `<label>`/`aria-label`.
- `GraphControls.svelte:99-110` and `:112-123` selects: no label; first option "All tags" (L105) and "All folders" (L118) are the only visible text.

Roles and landmarks:
- `FileHistoryDialog.svelte:56-58`: `Dialog.Description` with `sr-only` class (accessible).
- `DiffViewer.svelte:39-54`: `<table>` with no `<caption>`, no `<th>`; line-number cells are `<td>`s with no header semantics.
- `GraphView.svelte:450`: `<canvas>` without `role` or `aria-label`; the graph is not exposed to assistive tech. `data-testid="graph-view"` at L449.
- `GraphView.svelte:462` footer text "N notes · M links" has no `aria-live`.

Focus-visible styles:
- No `focus-visible:` classes on any element in scope (grep). Buttons rely on browser default outline or `hover:` styles only.
- `GraphControls.svelte:81, 101, 114`: inputs and selects use `focus:outline-none focus:ring-1 focus:ring-ring` (focus, not focus-visible; outline removed, ring added on focus).
- `TagColorPicker.svelte` `.color-dot` (L80-91): no focus style defined.

Contrast-relevant token use: `text-right-sidebar-muted-fg` on `bg-right-sidebar-accent` hover (`BacklinksPanel.svelte:65`, many). Contrast not measured in this pass.

## 5. Styling facts

Raw colors (hex/rgb) outside theme tokens:
- `TagColorPicker.svelte:58` `'rgba(255, 255, 255, 0.1)'` (fallback swatch background).
- `TagColorPicker.svelte:64` `'#000000'` fallback for the native color input.
- `TagColorPicker.svelte:94` `rgba(255, 255, 255, 0.5)` (hover border).
- `TagColorPicker.svelte:102` `rgba(255, 255, 255, 0.1)` (`.color-dot.none` background).
- `graph-view.logic.ts:190-199` `FALLBACK_GRAPH_PALETTE`: `#1a1a1e`, `#8b8b8b`, `#c084fc`, `rgba(139,139,139,0.2)`, `rgba(160,160,180,0.6)`, `rgba(192,132,252,0.5)`, `#a1a1aa`, `rgba(161,161,170,0.3)`. Used only when theme tokens are missing (`graphPalette` L207-226). Hex values are a fixed dark palette, not theme-derived.
- Canvas font uses `sans-serif` literal: `GraphView.svelte:263`.
- Theme-derived palette: `GraphView.svelte:49-61` reads `--editor-bg`, `--foreground`, `--muted-foreground`, `--primary` via `getComputedStyle`. Refreshed on `appliedThemeStore.revision` (L400-406).

Hard-coded font sizes (arbitrary, not theme scale):
- `TagItem.svelte:43` and `:67` `text-[14px]` (tag name). The theme defines `--text-row: 14px` (`app.css:98`), so these duplicate the row token rather than use `text-row`.
- `GraphView.svelte:263` canvas `${Math.max(10, 11 / k)}px` (canvas text, not CSS).
- Other sizes are Tailwind scale or theme tokens: `text-meta` (12px, `app.css:94`), `text-row` (14px, `app.css:98`), `text-xs`, `text-sm`.

Arbitrary sizing:
- `BacklinksPanel.svelte:56`, `OutgoingLinksPanel.svelte:52`: `max-h-[50vh]`.
- `FileHistoryDialog.svelte:55`: `h-[80vh] !max-w-5xl` (important modifier).
- `GraphControls.svelte:86-97`: switch sized `h-4 w-7`, knob `h-3 w-3`, with `translate-x-3.5` / `translate-x-0.5` (L94, L137).

Inline styles:
- `GraphView.svelte:449` `style="background: {palette.background};"` (dynamic).
- `GraphView.svelte:282-283` canvas `style.width/height` set in JS; `:367` `style.cursor` set in JS.
- `TagColorDot.svelte:15` and `TagColorPicker.svelte:49, 58` `style:background-color` (dynamic per tag color).

Custom CSS:
- `TagColorPicker.svelte:72-110`: scoped `<style>` block (only custom CSS file-equivalent in scope). Uses `var(--foreground)` (L98), `var(--muted-foreground)` (L103); also raw rgba (L94, L102). `transition: border-color 0.15s` (L89).
- No separate stylesheet in scope.

Z-index:
- `GraphControls.svelte:26` `z-10` (overlay above canvas). Dialog z-index from shadcn (not in scope).

Spacing and sizing:
- Non-Tailwind spacing: `TagColorPicker.svelte:73-78` `gap: 4px; padding: 6px 10px;`, `.color-dot` 20 x 20 px (L81-82), border 2px (L84). `TagColorPicker.svelte:35` `sideOffset={4}`.
- `GraphView.svelte:112-114` node-count thresholds (200, 50) with charge/link values; `:128` collide radius +2; `:297` hit-test +4 px.
- `GraphView.svelte:431-438` ResizeObserver restart at alpha 0.3.
- Dark/light token pairs used: `--right-sidebar-*`, `--editor-bg`, `--primary`, `--muted-foreground`, `--destructive`, `--success` (defined in `app.css:162-278` for light and dark variants).

Transitions and animation:
- `transition-colors` (default 150 ms Tailwind) on most rows: `BacklinksPanel.svelte:65, 82, 92`; `LinkItem.svelte:17`; `OutgoingLinksPanel.svelte:62`; `TagItem.svelte:30, 31, 40, 56`; `TagsView.svelte:59, 66`; `TagColorPicker.svelte:32`; `SnapshotList.svelte:39, 52`; `GraphControls.svelte:30, 39, 51, 58, 68, 89, 94, 132, 137`.
- `transition-transform` on chevrons (`BacklinksPanel.svelte:66, 83`; `TagItem.svelte:31`) and toggle knobs (`GraphControls.svelte:94, 137`).
- `TagColorPicker.svelte:89` `transition: border-color 0.15s`.
- Graph canvas animates via d3-force ticks (`GraphView.svelte:135`, `alpha(1).restart()` L137). No duration tokens. Simulation runs on every tick, no stop-on-hover or reduced-motion path.
- Reduced motion: no `prefers-reduced-motion` or `motion-reduce:` anywhere in scope. `app.css` has no `reduced-motion` or `transition` rule (grep).

Theme tokens used in scope (CSS variables / classes):
- Right sidebar: `text-right-sidebar-muted-fg`, `text-right-sidebar-primary`, `hover:bg-right-sidebar-accent`, `bg-right-sidebar-bg` (BacklinksPanel, LinkItem, OutgoingLinksPanel).
- Shared utilities: `text-meta`, `text-row`, `section-label` (`app.css:140`), `pane-toolbar` (`app.css:151`).
- Generic: `bg-background/90`, `backdrop-blur-sm`, `border-border`, `bg-muted`, `text-muted-foreground`, `bg-accent`, `hover:bg-accent`, `text-primary`, `bg-primary`, `bg-success/15`, `text-success`, `bg-destructive/15`, `text-destructive`, `bg-muted/50`, `font-mono`, `opacity-50`, `opacity-60`, `ring-ring`.
- Destructive color on an unresolved link: `OutgoingLinksPanel.svelte:75-76` (`text-destructive`, icon and text, with `opacity-60` on the row L74).

Mixed token families in one panel: `BacklinksPanel`, `OutgoingLinksPanel` and `LinkItem` use `right-sidebar-*` tokens, while `TagsView` and `TagItem` use generic `accent` / `muted-foreground` / `foreground`. `TagsView` sits in the editor area (`EditorView.svelte:75`), not the right sidebar.

## 6. Copy (user-visible strings)

Section and heading names:
- "Backlinks" (`BacklinksPanel.svelte:55`), sub-sections "Linked mentions" (L68) and "Relationships" (L85).
- "Outgoing links" (`OutgoingLinksPanel.svelte:51`). Casing differs: "Outgoing links" vs "Backlinks" (single word), "Linked mentions" (sentence case). Section titles are sentence case except "Backlinks" (also sentence case), "Tags" (L51 `TagsView`), "File History: {name}" (`FileHistoryDialog.svelte:62`, Title Case for the prefix plus a filename).

Empty-state wording:
- "No backlinks found" (`BacklinksPanel.svelte:62`) vs "No outgoing links" (`OutgoingLinksPanel.svelte:56`): different verb pattern ("found" vs none).
- "No tags found" (`TagsView.svelte:82`), "No history available" (`SnapshotList.svelte:28`). Three different empty phrasings.
- "Select a snapshot to view changes" (`DiffViewer.svelte:36`) also appears for identical content (see section 2).
- "Open a note to see its local graph" (`GraphView.svelte:453`).

Loading wording:
- "Indexing vault..." (`BacklinksPanel.svelte:60`), "Indexing tags..." (`TagsView.svelte:80`), "Loading history..." (`SnapshotList.svelte:24`), "Loading diff..." (`DiffViewer.svelte:31`). Ellipsis is three ASCII periods in all four. "Indexing" vs "Loading" used for similar waits.

Not-available wording: "Not available" (`BacklinksPanel.svelte:58`, `OutgoingLinksPanel.svelte:54`), no explanation of why.

Restore dialog and button:
- Native confirm (`FileHistoryDialog.svelte:44-47`): body "Restore this file to the version from {time}? Current content will be replaced.", title "Restore Version", OK "Restore Version", Cancel "Cancel".
- Button label (`FileHistoryDialog.svelte:96`): "Restore This Version". Confirm-title and button wording differ ("Restore Version" vs "Restore This Version").
- Native `ask` (Tauri dialog plugin, L11) is not a shadcn dialog; visual style differs from the rest of the in-app dialogs in this scope.

Snapshot labels:
- `file-history.logic.ts:46-50`: "Current" for index 0, "1 version before current", "N versions before current". Index 0 is the newest snapshot in the list, not the live file content. "Current" wording refers to the snapshot at index 0 while the live file is shown separately.
- Day groups: "Today", "Yesterday", else `toLocaleDateString` (`file-history.logic.ts:87-95`).
- Tooltip "Show backup file in Finder" (`SnapshotList.svelte:53`): macOS-specific wording; the code calls `revealInSystemExplorer` (`FileHistoryDialog.svelte:37`).
- Footer "{n} tags" / "{n} tag" pluralization in `TagsView.svelte:54`.
- Dialog a11y description "View and restore previous versions of this file" (`FileHistoryDialog.svelte:57`).

Tags view controls:
- Filter tooltip: "Show all tags" / "Hide rare tags" (`TagsView.svelte:61`). Describes the action, not state.
- Sort tooltip: "Sort by frequency" / "Sort by name" (`TagsView.svelte:68`). Describes the target sort, lowercase.
- Tag color picker: "No color" (L42), "Custom color" (L59), preset names via `TAG_COLOR_PRESET_ENTRIES` (`TagColorPicker.svelte:46-53`).

Graph view:
- Mode tooltips "Global graph" / "Local graph" (`GraphControls.svelte:34, 43`), "Zoom in" / "Zoom out" (L53, L60), "Close graph" (L70), "Toggle orphan nodes" (L91), "Toggle directional arrows" (L134). Tooltips are sentence case, lowercase noun after "Toggle".
- Visible labels: "Orphans" (L88), "Arrows" (L130), "Display" (L128, `section-label` class). Visible label and tooltip word choice differ ("Orphans" vs "orphan nodes", "Arrows" vs "directional arrows").
- Placeholder "Search nodes..." (L80).
- Select defaults: "All tags" (L105), "All folders" (L118), folder root shown as "/" (L120).
- Footer "{n} notes · {m} links" (`GraphView.svelte:462`), lowercase, uses `&middot;`.
- Graph tab name "Graph View" (`graph-view.service.ts`, `addTab` name), tooltip "Global graph" vs tab name "Graph View" (different noun).

Backlinks panel row text:
- Relationship label derived from `relationshipType.replace('_', ' ')` (`BacklinksPanel.svelte:96`). `String.replace` with a string pattern replaces only the first underscore. Types with two or more underscores display raw underscores. Raw type values are not visible in this pass (type list is in Rust; not verified).

Concepts and terms used across copy:
- "backlinks", "linked mentions", "relationships", "outgoing links", "unlinked mentions" (data exists, see below), "tags", "snapshots", "versions", "history", "graph", "notes", "links". "Snapshot" is the UI term in `SnapshotList` and `DiffViewer`; "version" appears in dialog title and restore button ("Restore This Version", "Restore Version") and in labels ("N versions before current").

Dead data in scope (computed and stored, never rendered):
- `backlinksStore.unlinkedMentions` (`backlinks.store.svelte.ts:5, 12`) is set by `computeUnlinkedMentionsForFile` (`backlinks.service.ts:211-233`). No `.svelte` file in the repo reads it (grep: no match outside tests).
- `outgoingLinksStore.unlinkedMentions` (`outgoing-links.store.svelte.ts:4, 8, 11`) is set by `fetchOutgoingLinksV2` (`outgoing-links.service.ts:75-87`, IPC `get_outgoing_unlinked_mentions_v2`). No `.svelte` file reads it.
- `backlinksStore.markUnlinkedDirty` / `unlinkedDirty` (`backlinks.store.svelte.ts:8, 23`) exist; the only consumer found is in `backlinks.service.ts`. No component renders the unlinked section, so the "Unlinked mentions" section described in the service comment (`backlinks.service.ts`, JSDoc above `computeUnlinkedMentionsForFileInner`, "Called by the BacklinksPanel when the unlinked section is visible") does not exist in `BacklinksPanel.svelte`.

Other dead or unused imports in scope:
- `Separator` imported, not used: `BacklinksPanel.svelte:6`, `OutgoingLinksPanel.svelte:6`.
- `untrack` used: both panels (L2, L48 / L44). `SidebarSection` used (both panels).

## 7. Data and refresh facts (for context)

- All five surfaces refetch on `vaultStore.vaultIndexVersion`: `BacklinksPanel.svelte:46-51`, `OutgoingLinksPanel.svelte:42-47`, `TagsView.svelte:41-46` (calls `scheduleTagIndexRebuild`), `GraphView.svelte:411-416` (calls `loadAndRebuild` which calls `buildGraph` → `get_all_vault_entries_v2`).
- Panels reset on active tab change: `BacklinksPanel.svelte:33-39`, `OutgoingLinksPanel.svelte:29-35` (collapse + `reset()`).
- GraphView filter/mode/center changes re-run `initSimulation` without IPC (`GraphView.svelte:386-396`).
- `TagColorPicker` writes color through `settingsStore.updateTagColors` (`TagsView.svelte:21-23`), not through the tag store.

## 8. Things not checked in this pass

- Visual contrast and rendered appearance (no screenshots taken).
- `SidebarSection` (core) collapse and keyboard behavior, `ShowInCalendarButton` visibility rule.
- `tags.logic.ts` tree build and `graph-view.logic.ts` `buildGraphData` correctness (only structure read).
- Rust relationship type values (what `replace('_', ' ')` actually receives).
- Tests under `src/tests` for these areas.
