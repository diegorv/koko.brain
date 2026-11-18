# Verdict: command palette and quick switcher (P55, P56, P57, P159, P160, P179)

Adversarial check of `scout-command-dialogs.md` against `main` at `bb57e6165` (the source files are unchanged since `f2cd7f97b`; last commit on them is `2009ad219`, Issue 042). Read-only; no code was run.

## What held

Every cited line was opened. These claims are correct as written:

- `dialog-content.svelte:30` centres every dialog (`top-[50%] translate-y-[-50%]`); `command-dialog.svelte:31` passes only `overflow-hidden p-0`, so the 5 `Command.Dialog` users (CommandPalette, QuickSwitcher, TemplatePicker, OneOnOnePicker, ModActionPicker) are centred and the input moves when the list height changes. `cn()` is tailwind-merge, so `top-[18vh] translate-y-0` on the `Dialog.Content` in `command-dialog.svelte` replaces the base classes. Tailwind 4 `translate-*` uses the `translate` property, and tw-animate-css 1.4.0 animates `transform`, so the zoom should compose. This is not yet checked in a browser.
- `command-list.svelte:15` `max-h-[300px]`; `command-dialog.svelte:33` descendant selectors force `py-3` and 20px icons; `command-input.svelte:14` `pe-8`; `CommandPalette.svelte:56-60` two-line rows. Row height is 62px (24px padding plus two lines), so about 4.5 rows are visible.
- `QuickSwitcher.svelte:41-60` creates `query + .md` in the vault root, with a bare catch that shows `Failed to create file.`. The Create item renders only in the `{:else if}` branch (`:96-106`).
- bits-ui 2.20.6 `command.svelte.js:957-968`: Enter clicks the selected item whatever the modifiers, and the root `onkeydown` (`:876`) does not check `defaultPrevented`. A Shift+Enter handler therefore has to call `stopPropagation` on the `Command.Input` keydown, which fires before the event bubbles to the root. Capture phase is not needed.
- `fuzzy-match.ts:32-38`: the "cal" scores work out by hand as Calendar: Undo/Redo 5, Go to Calendar 11, Calendar: Go to Today 12. Category is never matched (`command-palette.logic.ts:24` matches `label` only), so changing a category changes only the row text, never the ranking.
- `commands.test.ts:134-137` pins 45; `:180-197` asserts Undo/Redo exist with empty history and toast "Nothing to undo/redo"; `:205` asserts the toggle's category is `Navigation`.
- Overlap Issues: 218 (`ready-for-agent`, ledger `todo`, owner decision 2026-11-06, first wave) and 164 (`ready-for-agent`, ledger `todo`) are open and say what the scout reports. 042 is `resolved` (`2009ad219`) and lists "a create action while some notes match" as out of scope, "separate ticket only if wanted". None of the three has a later comment that changes its scope.

## What the scout got wrong or missed

1. **Wrong reuse point for P179 type icons.** The scout points at `EditorTabs.svelte:2-9`. The codebase already has the exact helper: `fileKind(name)` in `src/lib/features/rail-shell/lens.logic.ts:913` (markdown, canvas, kanban, view, pdf, image, other) and the kind-to-icon map `KIND_ICONS` in `src/lib/features/rail-shell/RailNoteList.svelte:665-673`, which `resolveNoteIcon` (`:652-662`) lays over `resolveIconForPath`. The quick switcher should reuse `fileKind` and one shared kind-icon map moved out of `RailNoteList`, not copy it. A lucide import cannot go into a `.logic.ts` (`pure-logic.test.ts`), so the map belongs in a small `.ts` or `.svelte.ts` module. No import cycle: neither `rail-shell` nor `file-icons` imports `quick-switcher`.
2. **The Archived icon swap conflicts with type icons.** `QuickSwitcher.svelte:80-84` shows archived status by swapping the row icon to `Archive`. Once the row shows a type icon, archived status needs its own marker, so the "Archived" tag is required by the icon change, not an optional extra. The archived 2026-11-04 design system (`.scratch/archived/ux-polish/review-2026-11-04.md` row "Color rules") already says "never `/NN` alpha or `opacity` on informative text", which settles text tag versus dimmed name without asking the owner.
3. **The 480px cap has no basis.** The same archived design system (row "Overlay anatomy") fixed palettes at "one-line `h-9` items with secondary text muted on the right, list `max-h-[min(60vh,400px)]`, key-hint footer", and 218 carries it with an owner decision. At 36px rows, 400px shows about 11 rows, which already meets P56's "about ten visible". Drop 480 and take 400. The open question goes away.
4. **The one-line versus two-line switcher row is not an owner question.** The same rule ("secondary text muted on the right") answers it. The switcher's folder goes right-aligned, muted and truncated, like the palette's category. The real exception is **ModActionPicker**: its action rows render a `description` second line (`ModActionPicker.svelte:178-186`), and its run view has a `pr-6` comment that exists only to clear the close X (`:105`). A fixed `h-9` would clip the description, so the density has to set a minimum height (or let ModActionPicker opt out). Neither the scout's Ticket A nor 218 says this.
5. **P159 gating: "or its tab is active" is wrong.** The review shows Undo/Redo "when the calendar has something to undo or its tab is active". With an active tab and empty history that still lists a no-op command. Gate on `eventCalendarStore.canUndo` / `canRedo` (`event-calendar.store.svelte.ts:104,106`) only. Gating also fixes "cal" only while the history is empty. After a calendar edit in the session, Undo leads again, which is defensible because the user just edited. Precedents for conditional palette commands already exist: `railGoToCommands` skips hidden rail items, and the `mvp-claude` branch's "lists no Claude command while Claude Code is off" test does the same.
6. **The "right" result for "cal" is ambiguous.** "Go to Calendar" (`commands.ts:62`) opens the **rail Calendar navigator** (the periodic-notes mini month, `plugins/calendar/calendar-rail.service.ts:28`). The Calendar **tab** is "Toggle Calendar View". With gating, the "cal" order is Go to Calendar 11, Calendar: Go to Today 12, New Calendar Event 15, Toggle Calendar View 17. Both destinations land in the top four, so no extra ranking work is justified.
7. **Missed overlap: Issue 147.** `.scratch/open-itens/issues/147-usage-stats-view.md:11-14` builds its label lookup and "never used" list from `getBuiltInCommands()`. If Undo/Redo are hidden while idle, 147 lists them as neither used nor never-used, and a recorded `event-calendar:undo` count shows a raw id. The cost is small, but it belongs in the owner question on hiding.
8. **Missed P57 trap: duplicates.** `fs.service.ts:198-203` resolves a name clash with `generateUniqueName`, so a Create row that is always present turns Shift+Enter on "Ideas" (with `Ideas.md` present) into `Ideas 1.md`. The row must disappear when a note with that exact name already exists in the target folder.
9. **No owner decision is needed for P57's target folder.** Today the target is the vault root, and 164 adds "the folder typed in the query". Combining the two (typed folder, else vault root) keeps current behaviour and needs no new rule. The prototype's Inbox/Projects selector is speculative. Asking about the active note's folder or the capture folder is optional, not blocking.
10. **Scope check, no other overlaps.** I grepped every `.scratch/*/issues/*.md` that is not resolved or wontfix for palette, switcher, `command-dialog`, `fuzzyMatch`, `file-entries`, close X and `icon-resolver`. Other hits: 064 (wikilink completion `nameWithoutExt`, different consumer), 199 (Settings focus), 039/096 (canvas absolute paths through `flattenFileTree`, no row display). None overlaps. The `mvp-claude` diff touches `commands.ts` and `commands.test.ts` but not the 45 literal (its commands are gated off by default), so updating that literal does not conflict.

## Ticket breakdown

Order: **T1 (fold into 218)** first. Then **T2** and **T3** can go in either order (T3 also waits for 164). **T4** goes last, because it shares `QuickSwitcher.svelte` with T3 and the row layout with T1.

### T1: Command dialog anatomy, folded into Issue 218

Proposals: P55, P56, P160 footer, P179 close X. Fold into `.scratch/open-itens/issues/218-command-palette-shows-dense-one-line-rows.md`, which already has P56, the footer and no-X with an owner decision. What to add to 218:

- P55: in `command-dialog.svelte`, give `Dialog.Content` `top-[18vh] translate-y-0` (plus `showCloseButton={false}`). `dialog-content.svelte` stays centred for every other dialog.
- Keep `max-h-[min(60vh,400px)]` (not 480).
- Density sets a minimum row height, so ModActionPicker's description rows are not clipped. Remove the `pr-6` close-X allowance at `ModActionPicker.svelte:105` together with the X.
- The footer takes its hints from the caller (snippet or prop), so the switcher can add Shift+Enter in T3. Pickers that pass no hints get no footer.
- Update 218's stale line pointers (`command-list.svelte:15`, `command-dialog.svelte:31-33`).

Acceptance (add to 218):
- Failing test first: a new `src/tests/lib/components/ui/command/command-dialog.test.ts` shows that a `Command.Dialog`'s `[data-slot="dialog-content"]` has `top-[18vh]` and `translate-y-0`, not `top-[50%]`, and renders no `Close` button. `dialog-content.test.ts` gains a case that a plain dialog keeps `top-[50%]` and its close button.
- E2E through `bash scripts/e2e.sh`: the palette input's `boundingBox().y` is the same before and after typing a filter that shrinks the list, and the palette still animates in (`overlay-motion.spec.ts` green).
- The palette row is one line: label left, category muted right, shortcut after it. The list carries `max-h-[min(60vh,400px)]`.
- A ModActionPicker action with a description shows both lines. The run view's Close and Stop still work (`ModActionPicker.test.ts`).
- Escape still closes every command dialog. TemplatePicker, OneOnOnePicker, ModActionPicker, QuickSwitcher and CommandPalette tests stay green.

### T2: Palette lists calendar Undo/Redo only when they can act, files calendar commands under Calendar, and groups the empty query (new)

Proposals: P159 (without the word-start bonus), P160 palette half.

- `commands.ts`: include `event-calendar:undo` only when `eventCalendarStore.canUndo`, and `redo` only when `canRedo`. Reading these inside `getBuiltInCommands()` keeps `AppOverlays.svelte:19` reactive. Ids stay stable for 146/147.
- Category `Calendar` for `event-calendar:new-event`, `today`, `undo` and `redo`. `Toggle Calendar View` stays `Navigation`, next to the other "Toggle X View" commands.
- `command-palette.logic.ts`: for an empty query, return the recent and rest parts separately (shape change, or a second helper). `CommandPalette.svelte` renders `Command.Group heading="Recent"` and `heading="All commands"` (OneOnOnePicker already uses `heading`). With no recents there are no headings. A non-empty query stays one flat ranked list.
- Docs: `help/documentation/06-search-and-navigation.md` (category table and line 36), `27-calendar.md:177`, `20-keyboard-shortcuts.md:119` ("when there is something to undo/redo").

Acceptance:
- Failing test first in `src/tests/lib/app/commands.test.ts`: with empty history there is no `event-calendar:undo` or `redo`. After a recorded calendar change Undo is listed, and after an undo Redo is listed and runs. The count literal at `:137` becomes 43, and the "Nothing to undo" palette test is rewritten for a non-empty history.
- `filterAndRankCommands('cal', getBuiltInCommands(), [])` with idle history contains no Undo/Redo.
- The four commands report category `Calendar`; the toggle test at `:205` stays as it is.
- Failing test first in `command-palette.logic.test.ts`: an empty query returns recents and the rest apart, and the rest is sorted by label. `CommandPalette.test.ts` shows the "Recent" and "All commands" headings with recents, no headings without them, and no headings with a query. Arrow keys still move across the group boundary.
- `fuzzy-match.ts` is unchanged.

Blocked by T1 (218), because both edit the `CommandPalette.svelte` row markup.

### T3: Quick switcher offers Create while notes match, on Shift+Enter, showing the target folder (new)

Proposal: P57. Its "include the cause when creation fails" part, and the folder-path create, are Issue 164 exactly. This ticket builds on 164.

- Render the Create item as the last row after the matches whenever the trimmed query is not empty, unless a note with that exact name (case-insensitive) already exists in the target folder.
- The selection stays on the first match, so Enter opens it. Enter with no match still creates (042).
- `onkeydown` on `Command.Input`: Shift+Enter (not `isComposing`) with a Create row present calls `preventDefault` and `stopPropagation`, then runs `createAndOpenNote`.
- The row shows its target, "in <folder>" or "in vault root", computed by the same function 164 uses to split the path.
- Add the Shift+Enter hint to the switcher's T1 footer. Update `help/documentation/06-search-and-navigation.md:15`.

Acceptance:
- Failing test first in `QuickSwitcher.test.ts`: invert `:215-227`. With `Ideas.md` present, typing "Idea" renders the match and then `Create "Idea"` last, Enter opens `/vault/Ideas.md`, and Shift+Enter creates and opens `/vault/Idea.md`.
- Typing "Ideas" with `Ideas.md` present renders no Create row, and Shift+Enter creates no `Ideas 1.md`.
- `Projects/Idea` shows "in Projects" on the row and creates there (164's path).
- The 042 tests (Enter on no match, both query transitions) stay green.
- Gate: frontend.

Blocked by `.scratch/open-itens/issues/164-quick-switcher-create-folder-path-projects-idea.md` (same function and test file, and it supplies the path split and the error reason) and by T1 (the footer).

### T4: Quick switcher rows show type icon, folder, Archived tag, match highlight and a Recent notes heading (new)

Proposals: P179 except the X (that is T1), and P160 switcher half.

- Row model in `file-entries.logic.ts`: the folder relative to the vault ('' for the root) and the kind from `fileKind()`.
- A separate `fuzzyMatchPositions(query, target)` in `utils/fuzzy-match.ts`, running the same greedy scan. `fuzzyMatch` and its 6 consumers stay untouched.
- Icon: `resolveIconForPath` first, otherwise the kind icon from one kind-icon map shared with `RailNoteList` (moved out, not copied).
- The path line shows only the folder (no name, no `.md`), right-aligned and muted per T1.
- Archived shows as an "Archived" text tag at full muted strength; drop `opacity-50` and the icon swap.
- Highlight the matched characters with a theme-token style that keeps the option's accessible name.
- With an empty query and recents, show a "Recent notes" heading. Update help 06:14 and :18.

Acceptance:
- Failing tests first: `file-entries.logic.test.ts` (folder for nested and root files, kind for `.canvas`, `.kanban`, `.view`, `.md`) and `fuzzy-match.test.ts` (positions agree with `fuzzyMatch` on match and no match).
- `QuickSwitcher.test.ts`: a `.canvas` row shows the canvas icon, not `FileText`. A note with a frontmatter icon shows it. The path line for `/vault/Projects/A.md` reads `Projects`. An archived note shows the "Archived" tag and no `opacity-50`. Typed "wel" puts the matched characters in highlight elements.
- `e2e/specs/quick-switcher.spec.ts` `getByRole('option', { name: /Welcome/i })` still passes.
- The "Recent notes" heading shows only for an empty query with recents.
- `RailNoteList` row icons are unchanged (its tests stay green).
- Source scans green: `chrome-type-scale`, `menu-item-anatomy`, `palette-classes`, `pure-logic`, `layer-rules`, `feature-cycle`.

Blocked by T1 (row density) and T3 (same component).

## Dropped

- **P159 word-start bonus in `fuzzyMatch`:** the review's own validation says it ties the labels. It would change ranking for 6 consumers (palette, switcher, wikilink completion, tag completion, ModDialogHost), and the gating alone carries the fix.
- **P56 480px list cap:** it contradicts the owner-approved 400px in 218 and the archived overlay-anatomy rule. 400px already shows about 11 rows.

## Owner questions

1. T2: hide Calendar Undo/Redo when there is nothing to undo (recommended, matching the Claude and rail precedents), or keep them always listed and accept that "cal" puts them first? Hiding drops them from 147's "never used" list while idle.
2. T3: the Create target is the folder typed in the query, else the vault root (recommended, today's behaviour plus 164). The active note's folder or the Quick Capture folder would need a new rule. Not blocking if the default is accepted.

## Not verified

No code or browser was run. The tailwind-merge override and the composed zoom animation are reasoned from source, the "cal" scores are hand-computed, and the bits-ui Shift+Enter behaviour is read from `node_modules`, not exercised.
