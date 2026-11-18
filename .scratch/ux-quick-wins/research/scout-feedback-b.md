# Scout: feedback-b (P153 P86 P87 P90 P92 P93 P94 P171 P172 P174 P175)

Checked at HEAD 085b23c5d (main), review `.scratch/design-review/review.md`, prototype `.scratch/design-review/prototypes/feedback-components.html`. Read-only research. MVP-branch file list from `git diff --name-only origin/main...origin/mvp-claude`: of the UI files in this slice only `src/lib/app/SettingsPanel.svelte` (and `AppShell.svelte`, `layout.service.ts`) are on it, so anything in SettingsPanel is excluded.

## 1. Summary table

| Id | Call | Size | One-line reason |
|----|------|------|-----------------|
| P153 | QUICK-PART | S | Ship header copy, drop the epoch, "Latest saved version" label, +/- chips, column headers; Previous/Next change navigation waits (M, scroll and focus management). |
| P86 | QUICK-PART | S | Search half is already built; ship `aria-pressed` and names on the kanban view switch and graph mode pair; the one SegmentedControl component is M and visual. |
| P87 | QUICK-PART | S | Ship the theme-row keydown guard (real bug) and the snapshot-list nested button; NoteRow pills and CollectionView part are elsewhere. |
| P90 | QUICK-PART | S | Ship a busy confirm that keeps the dialog open until `onConfirm` settles; "failure keeps the name" needs services to report failure, which waits. |
| P92 | QUICK-PART | S | Ship the three hand-built canvas overlays onto `--shadow-md` / `--shadow-xl`; SettingsPanel shadow is MVP-branch, Dialog size prop is M. |
| P93 | DEFER | M | New Badge primitive with adoption in NoteRow (shell-sidebars-ux) and kanban; no UX gain until call sites move; open-itens 204 keeps the Badge half. |
| P94 | QUICK | S | Graph selects already migrated (7e0a314ea); one native `<select>` is left, the kanban sort, a single-site swap onto the existing Select primitive. |
| P171 | QUICK-PART | S | Ship the base `prefers-reduced-motion` CSS block for `animate-spin` / `animate-pulse`; Svelte `fly` is only in SettingsPanel (MVP-branch), smooth-scroll JS sites belong to other groups. |
| P172 | QUICK-PART | S | Ship plural/zero count copy (WordCount, GraphView footer = open-itens 213); the all-toasts "Failed to / Could not" sweep is M and cross-cutting. |
| P174 | QUICK-PART | S | Only the two unused `Separator` imports are separable and they sit in files shell-sidebars-ux ticket 06 rewrites; tokens and lint extension are M or need a baseline over other groups' files. |
| P175 | DEFER | S | Pressed fill needs the shared state tokens from color-group P85; cursor policy is an owner call and a 148-site sweep (90 pointer, 58 default) across every group's files. |

Totals: QUICK 1, QUICK-PART 8, DEFER 2, DONE 0, DROP 0 (two proposals have a built half, see P86 and P94).

## 2. Per-proposal detail

### P153. The File History diff lacks orientation - QUICK-PART (S)

HEAD facts: `FileHistoryDialog.svelte:83-84` renders `formatSnapshotDateTime(...)` plus the raw epoch `({timestamp})`; `:85` renders `formatSnapshotLabel(selectedSnapshotIndex)`, which returns "Current" for index 0 (`file-history.logic.ts:46-50`), but the snapshot list's newest entry is the latest saved version, not the note. The diff is `compute_diff(old = snapshot, new = current note)` (`file-history.service.ts:62-68`), so left line numbers are the snapshot and right are the note. `DiffViewer.svelte:43-48` has two unlabelled number columns and no `thead`. Premise true.

Ship (QUICK slice):
- Header left: "Compared with current note" followed by the snapshot's `formatSnapshotDateTime`. Remove the epoch span.
- `formatSnapshotLabel`: index 0 "Latest saved version", 1 "1 version before the latest", n "n versions before the latest" (one noun, "version").
- A pure `diffSummary(lines)` in `file-history.logic.ts` returning `{ added, removed }`; two chips in the header ("+3" success tone, "-1" destructive tone, same `bg-success/15` / `bg-destructive/15` tokens as `DiffViewer.lineClass`).
- `DiffViewer.svelte`: a sticky `thead` with "Saved" over the old number column and "Now" over the new one (title attributes spell it out: "Line in the saved version", "Line in the current note").

Waits (DEFER part): Previous/Next change buttons (needs scroll-into-view inside `ScrollArea`, a current-hunk index and focus handling, M).

Files: `src/lib/features/file-history/FileHistoryDialog.svelte`, `DiffViewer.svelte`, `file-history.logic.ts`; tests `src/tests/lib/features/file-history/file-history.logic.test.ts`, `FileHistoryDialog.test.ts`.
Test seam: real `fileHistoryStore` (`setSelectedSnapshot`, `setDiffLines`); mock only Tauri (`call`) and `@tauri-apps/plugin-dialog` as the existing dialog test does. `diffSummary` is pure `.logic.ts`.
Data risk: none (read-only view; the Restore path is not touched).
Overlap: same dialog as P77 and P16 (feedback-a). Merge into one File History ticket, see section 4.

### P86. Six segmented controls, five selected looks, only one has ARIA - QUICK-PART (S)

HEAD facts, per control:
- Search modes: already built. `SearchPanel.svelte:242-260` is a `role="group"` with `aria-pressed`, `aria-disabled`, a `title` carrying the unavailable reason and an inline note (`:121-135`). Treat that half as DONE (finders-ux).
- Calendar D/W/M: already built as a `role="tablist"` with `aria-selected`, `aria-label`, `aria-keyshortcuts`, roving `tabindex` and arrow handling (`EventCalendarHeader.svelte:100-123`). DONE.
- Kanban view switch (`KanbanView.svelte:466-483`): three icon buttons, `title` only, no `aria-pressed`. Still missing.
- Graph mode pair (`GraphControls.svelte:43-62`): has `aria-label`, no `aria-pressed`. Still missing.
- Collection view tabs (`CollectionView.svelte:536`) and ThemeEditor group tabs (`ThemeEditor.svelte:172-180`): plain buttons, no tab semantics. Collection is inside shell-sidebars-ux 16; ThemeEditor tab semantics need a roving keyboard model, so not quick.

Ship: `aria-pressed={...}` on the kanban three buttons and the graph two buttons; add `aria-label` equal to the existing `title` on the kanban three (keep `title`, `KanbanView.test.ts:71-73` selects by it).
Waits: the one SegmentedControl component (M, restyles six surfaces, owner design call on the selected look), ThemeEditor/Collection tab semantics.

Files: `src/lib/plugins/kanban/KanbanView.svelte`, `src/lib/plugins/graph-view/GraphControls.svelte`; tests `src/tests/lib/plugins/kanban/KanbanView.test.ts`, `src/tests/lib/plugins/graph-view/GraphControls.test.ts` (already asserts the four button names at `:293`).
Test seam: real kanban/graph stores; only Tauri mocked.
Overlap: `KanbanView.svelte` is also edited by the kanban slice; fold into one kanban toolbar ticket.

### P87. Interactive controls nested in interactive controls - QUICK-PART (S)

HEAD facts and split:
- Theme row (`AppearanceSection.svelte:171-178`): `div role="button"` with `onkeydown` that calls `selectTheme(theme.name)` on Enter or Space with no check of `e.target`. A keydown from the Edit/Duplicate/Uninstall buttons inside the row bubbles to it, so pressing Enter on Edit also activates and persists that theme (`settingsStore.updateAppearance({ activeTheme })`, `:93-96`). `handleEdit` only stops the click, not the keydown. Real bug, confirmed by reading. SHIP: return early unless `e.target === e.currentTarget`.
- Snapshot list (`SnapshotList.svelte:49-58`): a `span role="button"` inside the row `<button>`, with a hand-written Enter handler and no Space. SHIP: make the row a `div` wrapper with the select `<button>` and a sibling reveal `<button>` (with `aria-label="Show backup file in Finder"`); selected and hover background move to the wrapper.
- `NoteRow.svelte:113-122` wikilink pills (`role="link"` span inside the row button): note-list is a shell-sidebars-ux surface, and the fix needs a restructure; DEFER.
- `CollectionView.svelte:594-670`: already ticketed in `.scratch/shell-sidebars-ux/issues/16-filters-count-clear-view-triggers.md:38`. Not mine.
- Hover-only actions: already fixed by finders/Issue 67 (`group-focus-within:opacity-100`, `AppearanceSection.svelte:191`).

Files: `src/lib/core/settings/sections/AppearanceSection.svelte`, `src/lib/features/file-history/SnapshotList.svelte`; tests `src/tests/lib/core/settings/AppearanceSection.test.ts` (has a click test at `:418`, needs a keydown twin), `FileHistoryDialog.test.ts`.
Test seam: real `settingsStore`; the keydown test dispatches `KeyboardEvent('keydown', { key: 'Enter', bubbles: true })` on the Edit button and asserts `settingsStore.appearance.activeTheme` is unchanged.
Data risk: none; the fix removes an unintended settings write.
Overlap: `AppearanceSection.svelte` is also named by color-group P85 (selected states, `:173`) and may be in settings slices. Keep the diff to the keydown line.

### P90. Async dialogs have no pending-to-done loop - QUICK-PART (S)

HEAD facts: `TypeNameDialog.svelte:40-45` sets `open = false` before `await onConfirm(name)`, so the dialog is gone while `renameType` (`type-definitions.service.ts:185`, definition rename plus `propagate_type_rename` across member notes) runs. Both callers swallow their own errors and toast (`createTypeDefinition` returns `null` after a toast, `:182-196`; `renameType` toasts at `:244`), so a thrown error never reaches the dialog today. The ViewDialog and Trash are already fine (review validation).

Ship: `TypeNameDialog` gets `let busy = $state(false)`; `confirm()` sets `busy`, awaits `onConfirm`, then closes; confirm button is disabled and reads a busy label (new optional prop `busyLabel`, e.g. "Updating notes..." passed by the rename caller, default "Working..."); Cancel, Escape and overlay close are ignored while busy; if `onConfirm` rejects the dialog stays open with an inline error and the typed name. Keep Enter-to-confirm.
Waits: making failure keep the typed name for the two real callers needs `createTypeDefinition` / `renameType` to signal failure (they toast and resolve). That touches the type-rename write path (frontmatter propagation across the vault) and is not a quick call; leave as a follow-up decision.

Files: `src/lib/features/type-definitions/TypeNameDialog.svelte`, optionally `src/lib/features/rail-shell/TypesNavigator.svelte:485-494` (pass `busyLabel`; that file is also edited by shell-sidebars-ux 10); new test `src/tests/lib/features/type-definitions/TypeNameDialog.test.ts`.
Test seam: mount the real dialog with a controllable promise as `onConfirm` (a plain function, not a store or logic file).
Overlap: P91 (feedback-a) touches the same file (`:29-30,66,68` error timing and style). One ticket for the file.

### P92. Floating surfaces bypass the elevation tokens, dialogs come in several widths - QUICK-PART (S)

HEAD facts: tokens exist (`app.css:126-130`, `--shadow-xs/sm/md/xl` with `--elev-*`). Literal shadows: `SettingsPanel.svelte:116` (`shadow-[-4px_0_12px_rgba(0,0,0,0.15)]`), `CanvasContextMenu.svelte:187` (`0 4px 16px rgba(0,0,0,.4)`), `CanvasFilePicker.svelte:97` and `CanvasLinkInput.svelte:94` (`0 8px 32px rgba(0,0,0,.5)`). Dialog widths: `sm:max-w-[440px]` x2, `sm:max-w-md`, `[720px]`, `[550px]`, `max-w-5xl` (six values in `Dialog.Content` call sites).

Ship: replace the three canvas box-shadows with `var(--shadow-md)` (context menu) and `var(--shadow-xl)` (file picker, link dialog). Nothing else in those rules.
Waits: SettingsPanel shadow (file is on `mvp-claude`; do it after that merges); Dialog `size` prop sm/md/lg (M, touches every dialog); Settings scrim (owner decision, see open-itens 200).

Files: `src/lib/features/canvas/CanvasContextMenu.svelte`, `CanvasFilePicker.svelte`, `CanvasLinkInput.svelte`; test: a source-scan test next to the existing CSS scan precedent (`src/tests/lib/features/canvas/canvas-markdown-css.test.ts`, `src/tests/lib/chrome-type-scale.test.ts` style) that fails while any of the three files has an `rgba(` inside a `box-shadow` declaration.
Honest limit: the scan proves the literal is gone, not how it looks; a light-theme visual check of the three overlays is part of acceptance.
Overlap: open-itens 196 (canvas menus use theme tokens, ready-for-agent, blocked by 195) edits the same declaration blocks (border `rgba(255,255,255,.15)` at `:183` of the menu). `--shadow-md/xl` already carry a 1px `--elev-ring`, so the border part can follow 196. Also P95 (canvas slice) edits `CanvasContextMenu.svelte:115`.

### P93. Badge primitive - DEFER (M)

HEAD: `components/ui/` has no badge directory. The call sites named are `NoteRow.svelte:103,114,124` (`bg-primary/10 ... text-[11px]`, shell-sidebars-ux surface), `KanbanCardText.svelte:37-38` and `Rail.svelte`. A primitive with no migrated call site changes nothing the user sees, and adoption touches note list, kanban and rail. Review itself says "adopted when code is next touched". Open-itens 204 already holds the Badge and InlineAlert halves (ready-for-agent, abandoned folder); leave it there (the review points 204 at P93).

### P94. Themed Select in place of native selects - QUICK (S)

HEAD facts: `rg '<select' src/lib` finds one hit, `KanbanView.svelte:488`. The graph filters were migrated (`GraphControls.svelte:134-` use `Select.Root`, commit 7e0a314ea "graph controls on shadcn switch/select", and open-itens 208 is `wontfix`). So the proposal's "four native selects" is now one. Checkbox/Textarea are explicitly deferred by the proposal.

Behaviour: the kanban sort control becomes `Select.Root type="single"` with `Select.Trigger size="sm"` (same recipe as `GraphControls.svelte:134-148`, `aria-label="Sort cards"`) and one `Select.Item` per `SORT_LABELS` entry; `onValueChange` calls the existing `handleSetSortMode` (`KanbanView.svelte:175`), unchanged. The trigger text is `SORT_LABELS[currentSortMode] ?? SORT_LABELS.manual` because a board file can carry an unknown `sortMode` (open-itens 225 shows `"unchecked"` in `help/examples/kanban-features/personal-week.kanban`), which a native select tolerates and `Select` would show blank.

Files: `src/lib/plugins/kanban/KanbanView.svelte`; test `src/tests/lib/plugins/kanban/KanbanView.test.ts` using the open-and-choose helper pattern from `GraphControls.test.ts:81-103`.
Data risk (kanban is daily-use): the sort writes the board settings through `applyChange(setSortMode(...))`. The write path is not touched, but the swap must not write on mount or when the current value is re-picked; both are acceptance criteria below.
Overlap: P21 (feedback-a, toolbar kit) proposes a bigger kanban toolbar rebuild; this is the interim. `KanbanView.svelte` is also in the kanban slice.

### P171. Motion has no tokens; reduced motion honoured in one place - QUICK-PART (S)

HEAD facts: only `EventCalendarView.svelte:284` has `prefers-reduced-motion`. `animate-spin` appears on 13 spinners (e.g. `SearchPanel.svelte:343`, `RailListSearch.svelte:103`, `TasksView.svelte:912`), `animate-pulse` on the Rail busy dot (`Rail.svelte:399`); `tw-animate-css` is imported (`app.css:2`). The Svelte `fly` transition exists once, `SettingsPanel.svelte:117` (MVP-branch file). JS smooth scroll: `EventTimeGrid.svelte:233` (calendar slice) and `PropertiesPanel.svelte:69` (collection slice).

Ship: one block in `src/app.css`, outside any `@layer` so it beats the Tailwind utilities: under `@media (prefers-reduced-motion: reduce)` set `.animate-pulse { animation: none }` and slow `.animate-spin` (`animation-duration: 3s`) so a busy spinner still reads as busy. Design call to confirm with the owner: slow spin versus `animation: none` (a static spinner can look stuck where no label accompanies it, e.g. `RailListSearch.svelte:103`).
Waits: `SettingsPanel` fly gating (after mvp-claude merges), smooth-scroll sites (their groups).

Files: `src/app.css`; test: a source-scan test asserting the block exists and names both classes (`src/tests/lib/` next to `chrome-type-scale.test.ts`). Honest limit: jsdom cannot evaluate media queries, so the scan cannot prove rendering; add a manual check with macOS "Reduce motion" on, or a Playwright `emulateMedia({ reducedMotion: 'reduce' })` computed-style check if an `.animate-pulse` element is reachable in an e2e spec.
Overlap: `app.css` is also edited by color-group P23 (focus ring base rule) and P85; additive blocks, expect trivial merges.

### P172. Copy and casing drift - QUICK-PART (S)

HEAD facts: toasts use "Failed to" 19 times and "Could not" 29 times across services and components (`editor.service.ts:196,250`, `tasks.service.ts:325,421`, `copy-block-link.service.ts:39,61`, `TemplatePicker.svelte:44`, `QuickSwitcher.svelte:105`...). Matching tests assert exact strings across many files, so a voice sweep is M. "1 words" is real: `WordCount.svelte:33` prints `{words} words ... {characters} characters ... {readingTime} min read` with no singular or zero handling; `GraphView.svelte:556` prints `{simNodes.length} notes · {simLinks.length} links`. The "(Cmd+D)" hints are `NoteActionBar.svelte:148,157,175`, listed by canvas-slice P95; "Source mode" strings are in `EditorView.svelte:101-128`, which shell-sidebars-ux 25 replaces.

Ship the count copy, which is exactly open-itens 213: "1 word", "1 character", hide the reading-time segment at 0 words (`estimateReadingTime` and its pinned test unchanged), and a pure `formatGraphStats(noteCount, linkCount)` in `graph-view.logic.ts` returning "1 note · 1 link", "2 notes · 3 links".
Waits: the Failed/Could-not sweep (needs an owner choice of one voice, then a repo-wide string and test pass), the two `…` vs `...` stragglers (`SentrySection.svelte:83`, `SearchSection.svelte:141`, in settings slices), shortcut hints (P95).

Files: `src/lib/plugins/word-count/WordCount.svelte`, `src/lib/plugins/graph-view/GraphView.svelte`, `src/lib/plugins/graph-view/graph-view.logic.ts`; tests new `src/tests/lib/plugins/word-count/WordCount.test.ts`, extend `graph-view.logic.test.ts`.
Test seam: real `editorStore` with an active `.md` tab and fake timers (WordCount debounces 500 ms); pure logic for the graph string.

### P174. Token hygiene - QUICK-PART (S), fold into another ticket

HEAD facts: 29 raw `text-[Npx]` sites in 15 files (`NoteRow.svelte` 4, `EventBlock.svelte` 4, `RelationshipSearch.svelte` 4, collection and calendar views...), mostly other groups' files; the 11 px floor lint already exists (`src/tests/lib/chrome-type-scale.test.ts`). The unused `Separator` imports are real: `BacklinksPanel.svelte:6` and `OutgoingLinksPanel.svelte:6` import it and never use it.
Quick slice: delete those two import lines (no behaviour change; existing tests are the check, no new test needed per the repo's rule for pure cleanup). Because shell-sidebars-ux ticket 06 (`06-backlinks-outgoing-stay-open-readable-rows.md`) rewrites both panels, do not open a ticket for two lines: add the removal to 06's checklist, or do it right after 06.
Waits: extending the lint to forbid `text-[Npx]` (needs a per-file baseline over files owned by other groups, plus 29 migrations), radius and z-index tokens (theme-system change, M), the dark-fallback and stale-today items (the review already says to ticket them separately).

### P175. Pressed state and the cursor policy - DEFER (S in review, larger in fact)

HEAD facts: premise holds, `active:` appears 10 times (cursor-grabbing and similar, no pressed fills), `cursor-pointer` 90 and `cursor-default` 58 under `src/lib`. `button.svelte` (shadcn) has no `active:` variants. The prototype's pressed fill is `--hov` over `--acc` hover (`feedback-components.html:387-388`), i.e. it depends on the shared `--state-hover/--state-selected` tokens proposed in color-group P85. Inventing pressed colors per Button variant now would fork that. The cursor rule (arrow on chrome, hand only on links) is a policy that needs a sweep of ~148 sites in every group's components, and the owner has not set the policy. Revisit after P85.

## 3. Candidate quick tickets (grouped by component)

### Q1. File History dialog orientation and nested button (P153 slice + P87 SnapshotList) - S
Merge with feedback-a's P77/P16 File History ticket if that scout proposes one (same files).
Files: `FileHistoryDialog.svelte`, `DiffViewer.svelte`, `SnapshotList.svelte`, `file-history.logic.ts`; tests `file-history.logic.test.ts`, `FileHistoryDialog.test.ts`.
Acceptance criteria:
1. Failing test first: `diffSummary` returns `{ added, removed }` for insert/delete/equal lines and `{0,0}` for an empty list; `formatSnapshotLabel(0)` is "Latest saved version" and 2 is "2 versions before the latest" (replaces the "Current" cases in `file-history.logic.test.ts:79-92`).
2. Dialog test: with a selected snapshot the header text contains "Compared with current note", shows "+N" and "-M" chips from the store's diff lines, and contains no 13-digit epoch.
3. Diff table has a `thead` whose two number columns read "Saved" and "Now".
4. `SnapshotList` has no `[role="button"]` inside a `button`; the reveal control is a sibling `<button>` with an accessible name and activates on Enter and Space; clicking it does not select the row.
5. Restore flow and `selectSnapshot` behave as before (existing tests green); Previous/Next change navigation is not part of this ticket.

### Q2. Kanban and graph toolbar controls (P94 + P86 kanban/graph part) - S
Files: `KanbanView.svelte`, `GraphControls.svelte`; tests `KanbanView.test.ts`, `GraphControls.test.ts`. Fold into the kanban slice's toolbar ticket if one exists.
Acceptance criteria:
1. Failing test first: in `KanbanView.test.ts`, no `<select>` exists in the toolbar; opening the "Sort cards" Select lists the six `SORT_LABELS` options in order, and choosing "Text (A→Z)" results in `board.settings.sortMode === 'text-asc'` through the real save path (Tauri mocked).
2. Mounting the board, and re-choosing the current sort, perform no save (assert the mocked write is not called).
3. A board whose settings carry an unknown `sortMode` renders the trigger as "Manual" and does not rewrite the file on mount.
4. The three kanban view buttons expose `aria-pressed` true only for the current mode and keep their `title` ("Board view", "List view", "Table view"); the two graph mode buttons expose `aria-pressed` for the current mode.
5. `pnpm check` and the kanban and graph-view vitest folders green.

### Q3. Keyboard and pending-state fixes (P87 theme row + P90 TypeNameDialog) - S
Two components, no shared code; split if the runner prefers one component per ticket.
Files: `AppearanceSection.svelte`, `TypeNameDialog.svelte` (+ optional `busyLabel` pass-through in `TypesNavigator.svelte`); tests `AppearanceSection.test.ts`, new `TypeNameDialog.test.ts`.
Acceptance criteria:
1. Failing test first: a bubbling Enter and a Space `keydown` on the Edit/Duplicate button of a non-active theme row leave `settingsStore.appearance.activeTheme` unchanged; Enter on the row itself still selects it.
2. Failing test first: with `onConfirm` returning an unresolved promise, the dialog stays open, the confirm button is disabled and shows the busy label, Cancel and Escape do not close it; after the promise resolves the dialog closes.
3. When `onConfirm` rejects, the dialog stays open, keeps the typed value and shows the failure inline.
4. Enter in the input still confirms once (no double submit while busy).
5. Existing `TypesNavigator.test.ts` rename and new-type flows stay green.

### Q4. Canvas overlays on elevation tokens (P92 slice) - S
Files: `CanvasContextMenu.svelte`, `CanvasFilePicker.svelte`, `CanvasLinkInput.svelte`; one new source-scan test.
Acceptance criteria:
1. Failing test first: a scan of the three files finds no `rgba(` inside a `box-shadow` declaration (fails today at `CanvasContextMenu.svelte:187`, `CanvasFilePicker.svelte:97`, `CanvasLinkInput.svelte:94`).
2. The menu uses `var(--shadow-md)`, the picker and link dialog `var(--shadow-xl)`; no other declaration in those rules changes.
3. Manual check recorded in the ticket: the three overlays in a light theme and in Lavender Haze show an edge/elevation.
4. Canvas vitest folder green. Coordinate with open-itens 196 (border/hover colors in the same blocks).

### Q5. Count copy (P172 slice = open-itens 213) - S
Files: `WordCount.svelte`, `GraphView.svelte`, `graph-view.logic.ts`; tests `WordCount.test.ts` (new), `graph-view.logic.test.ts`.
Acceptance criteria:
1. Failing test first: `formatGraphStats` cases (0,0) "0 notes · 0 links", (1,1) "1 note · 1 link", (2,3) "2 notes · 3 links".
2. Failing test first: `WordCount` with real `editorStore` and fake timers: empty note shows "0 words" and no "min read"; "hello" shows "1 word", "5 characters", "1 min read"; a 250-word body shows "2 min read".
3. `estimateReadingTime` and its tests unchanged.
4. `GraphView.svelte` footer calls `formatGraphStats`; no inline pluralization left.
5. `e2e/specs/word-count.spec.ts` still passes (`bash scripts/e2e.sh e2e/specs/word-count.spec.ts`).

### Q6. Reduced-motion base rule (P171 slice) - S
Files: `src/app.css`; one source-scan test.
Acceptance criteria:
1. Failing test first: `app.css` contains a `@media (prefers-reduced-motion: reduce)` block that targets `.animate-pulse` and `.animate-spin` (fails today; only `EventCalendarView.svelte:284` has one).
2. The block sits outside `@layer` so it overrides the Tailwind utilities (check the built CSS order once).
3. Owner confirms spin treatment (slow versus none) before merge; default is slow spin 3 s and no pulse.
4. Manual check with macOS Reduce motion on: Rail busy dot static, a search spinner still reads as busy.
5. `EventCalendarView`'s own rule and the existing tests are untouched.

## 4. Overlaps found

- Same-file clusters with other scouts (merge, do not duplicate): File History (P77, P16 in feedback-a with P153/P87 here); `TypeNameDialog.svelte` (P91 feedback-a with P90); `KanbanView.svelte` (kanban slice, P21 feedback-a, P94/P86 here); `AppearanceSection.svelte` (color P85, settings slices); `app.css` (color P23/P85); canvas overlays (canvas P95, open-itens 196).
- open-itens 213 (word count and graph stats) is fully covered by Q5: mark `wontfix` with a pointer to the ticket.
- open-itens 204 (EmptyState/InlineAlert/Badge primitives) stays open for the Badge half (P93 DEFER) and InlineAlert; no quick ticket replaces it.
- open-itens 208 (graph controls shadcn) is already `wontfix`, consistent with the graph selects being done in finders-ux (7e0a314ea).
- open-itens 196 (canvas overlay theme tokens, blocked by 195) overlaps Q4 on the same blocks; Q4 takes only the shadows and 196 keeps borders and hovers.
- open-itens 200 (settings modal scrim) is the owner decision named in P92; untouched.
- Dependencies, not replacements: shell-sidebars-ux 06 (Backlinks/Outgoing panels: carries the P174 unused imports), 10 (`TypesNavigator.svelte`), 16 (CollectionView P87 part), 25 (EditorView source-mode strings), 12 and NoteRow work (P87/P93 NoteRow parts). finders-ux is done and already delivered the search-mode ARIA and graph Select migration.
- MVP branch: `SettingsPanel.svelte` is on `mvp-claude`, so the P92 Settings shadow and the P171 `fly` gating wait for it.

## 5. Not checked

Visual result of any CSS change (jsdom cannot render), real bits-ui Select behavior inside the kanban toolbar beyond the graph precedent, and whether the Claude MVP branch changes `KanbanView.svelte` or canvas files (the diff list shows none).
