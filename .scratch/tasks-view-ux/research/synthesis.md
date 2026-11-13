# Tasks view UX: synthesis and ticket plan

Judge and synthesizer pass over `validated-01.md` to `validated-10.md` (cited V1 to V10) and the three proposals (A polish first, B information architecture, C workflow power user). Read-only. Nothing was run, rendered or tested. Line numbers are from `main` at `23f6c1f91`. **Fact** means verified in code or in a validated report, with path:line. **Opinion** is labelled.

## 0. The finding that frames everything

**Fact.** Every validator found that this redesign already has an owner-answered PRD and a ticket chain:

- PRD: `.scratch/archived/tasks-view/PRD.md`. Owner answers dated 2026-11-06 at PRD:54-69, and "No assumption (A1 to A12) was vetoed".
- Issues in `.scratch/open-itens/issues/`: 108 to 113 are `ready-for-agent`, chained 108 -> 109 -> 110 -> 111 -> 112 -> 113. Also 074, 075, 115 to 126, 129, 198, 204 and 227 (V3 "Missed" 1, V5 "Missed" 1, V7 "Missed" 1, V8 "Missed" 1).
- Their line citations are stale: the file shrank from 305 to 223 lines in `5417b0501` (V10 "Missed" 8). Relay can auto-launch `ready-for-agent` Issues as they are.

Owner decisions that bind every ticket below unless re-asked:

| Decision | Answer |
|---|---|
| B1 (a) | Default "All open" plus a seeded "To list" view, delivered by 124. Until then `#to-list` stays the default and is made visible |
| B2 (a) | Done and cancelled are closed, every other status is open |
| B5 | Few tasks carry dates: date-first layouts are options, not defaults |
| B6 (a) | Rust records headings (074), and the section disk scan goes away (121) |
| A2 | The date filter means the due date. Mtime survives only as "Note edited in the last N days" |
| A3 | One grouping level. Note groups sort by path, not mtime |
| A7 | Row edits cover status, due and priority. No done-date stamp, no recurrence spawn |
| A8 | Arrows, Home/End, Space, Enter and two palette commands. No bare-letter shortcuts in v1 |
| A9 | No virtualization. 50 rows per group, then "Show N more" |

**Consequence (opinion).** The deliverable is a reconciled backlog, not a parallel one. Each ticket below is marked **new** or **amends Issue N**. Step 0 (section 3) must happen before any relay run.

## 1. Proposal scores

Scale 1 to 5, higher is better. For Risk, 5 means lowest risk. For Effort, 5 means least effort.

| | User value | Risk | Fit with codebase rules | Effort | Total |
|---|---|---|---|---|---|
| **A. Polish first** | 3: fixes the "ugly" half and the three feel defects (blink, jump, contradictory rows). Leaves "simple" untouched: filters stay on mtime and the section tag stays free text | 5: frontend only, contradicts no owner answer | 4: respects the pane-toolbar test, tokens and layers. Its P3 restyles the date pills and eye toggle, which 111 deletes. It also restyles the section tag box, which V4 net 6 says to leave alone until 116 | 4: about 8 small slices | **16** |
| **B. Information architecture** | 5: covers both halves of the complaint along the PRD the owner already answered. Finds the real gaps: header anatomy, place-keeping, collapse dying on remount, a toolbar that cannot hold the filters | 4: the persistence split touches `core/settings` (opaque key, after Issue 030). Many Issue amendments | 5: matches the PRD, the toolbar test (filter row outside `pane-toolbar`), the remount facts (state in `tasksStore`), ADR-0034 getters and layer rules | 3: long chain, several M slices | **17** |
| **C. Workflow power user** | 3: strong for a keyboard user, but the owner never asked for that persona. Two good grafts: the cursor in the store, and status actions with no Rust change | 2: new Rust command (Both gate), a write race guard, Cmd+F webview behavior unverified, and it reopens A7 and A8 | 3: good on store-owned cursor, guarded writes and the patcher-home question. It leans on bare keys, inline text edit and many palette commands that the PRD scoped out | 2: 11 slices including Rust | **11** |

**Verdict (opinion).** B is the spine: it is the owner's own plan, with the gaps filled in. A supplies the **order**: feel and correctness first, so the view stops looking broken within a few small deliveries. A also supplies the test-hook prefactor and the "do 110 before 109" re-sequencing. C supplies three grafts:

- the keyboard cursor lives in `tasksStore` and reconciles after a refetch;
- status changes from a row menu, using `toggle_task_status`'s existing `target` (no Rust), carved out of 122;
- an idempotent "Tasks: Open" palette command.

## 2. Recommended design

### 2.1 Principles (opinion, each grounded in a fact)

1. **Calm list first.** Three defects make the view feel broken whatever the styling:
   - the list blanks on every refetch (`tasks.service.ts:67`, `TasksView.svelte:139-140`);
   - the toggled note jumps to the top (`commands/vault.rs:802-804`, `index.rs:1082`);
   - `[/] [?] [>] [!]` rows show an open circle next to struck-through text and are hidden by default (`TasksView.svelte:171`, `:191`; `tasks.logic.ts:40`; V1 "Refuted" 5).

   These go before any color work.
2. **State that must survive lives in `tasksStore`.** `TasksView` unmounts on every tab switch (`src/lib/app/EditorView.svelte:72-73`; V4 "Missed" 1). Scroll, collapse and the keyboard cursor reset unless the store owns them.
3. **Toolbar is identity, the filter row is the query.** `pane-toolbar` is one fixed 40 px row with no wrap, height, padding or gap overrides (`src/tests/lib/pane-toolbar.test.ts:30`, `:46-50`). Title, count, spinner, search and Display go there. Status, Due, Priority, Tag and Reset go in a plain row below it, which is the PRD mockup's own layout (V3 "Missed" 4).
4. **Do not polish what the next slice deletes.** 111 replaces the date pills and the eye toggle, and 116 replaces the section tag box. They get accessibility basics only (labels), not a restyle.
5. **Tokens only.** No raw palette classes, because 198's guard test would fail on them. No new `ThemeColors` key, because user themes would need a migration (V9 "Refuted" Scout 18 item 7). Tone goes on icons, because `warning` and `destructive` are not guaranteed 4.5:1 text pairs on card or editor (V9 "Refuted" Scout 18 item 1).
6. **Every write goes through a guarded Rust command plus `settleTaskWrite`** (indexing rule 6). Display text never replaces the raw `task.text` the toggle guard compares (`tasks.service.ts:150`).

### 2.2 Mockup after wave 1 (T01 to T07: same model, calm and clean)

Default dark theme, editor pane about 900 px. The existing filters are still present, with labels added and no restyle.

```
+------------------------------------------------------------------------------------------+
| Tasks  12 open in 4 notes        [All time][Last 7 days][Last 30 days] [eye] [# to-list ] (.) |
+------------------------------------------------------------------------------------------+
|  Open tasks under headings containing #to-list.  Clear                                   |
|                                                                                          |
|  [icon] ACME kickoff            Projects/ACME                              2 of 5 open    |
|  ---------------------------------------------------------------------------------------  |
|    ( )  Send invoice to ACME                        [! Nov 3] [high] [#work]              |
|    (/)  Draft Q4 plan                               [Nov 14]                              |
|         ( )  Collect last quarter numbers           [every week]                          |
|    (!)  Call the accountant                                                               |
|                                                                                          |
|  [icon] Reading list            Areas/Learning                             1 of 3 open    |
|  ---------------------------------------------------------------------------------------  |
|    (?)  Finish [[Book#Chapter 2]]                                                         |
+------------------------------------------------------------------------------------------+
  (.)  refresh spinner, only while a refetch runs over a list already on screen (108)
  The "# to-list" box loses its duplicate Hash icon and gains aria-label "Section tag"
  A failed refresh shows an inline alert with Retry above the list; the list stays
```

### 2.3 Target mockup (after wave 2, T08 to T11)

```
+------------------------------------------------------------------------------------------+
| Tasks  38 open                                (.)   [ Search tasks           ] [Display v] |  pane-toolbar
+------------------------------------------------------------------------------------------+
| [Status: open v] [Due: any v] [Priority v] [Tag v]   [# to-list      ]            Reset   |  filter row
| Open tasks under headings containing #to-list.  Clear                                     |  rule sentence
+------------------------------------------------------------------------------------------+
| v [icon] ACME kickoff                 Projects/ACME                         2 of 5 open    |
|     ( )  Send invoice to ACME                   [! Nov 3] [high] [#work]           [...]   |
| >   (/)  Draft Q4 plan                          [Nov 14]                           [...]   |
|          ( )  Outline risks                     [every week]                       [...]   |
| > [icon] 2026-11-05                   Daily                                 4 of 4 open    |
| v [icon] Reading list                 Areas/Learning                        1 of 3 open    |
|     (?)  Finish [[Book#Chapter 2]]                                         [...]   |
|     Show 12 more                                                                         |
+------------------------------------------------------------------------------------------+

Row menu ([...] button or right click; one shared menu):
+-------------------------------+
| Open at line                  |
| Copy task text                |
|-------------------------------|
| Status  >  Todo               |
|            In progress        |
|            Done               |
|            Cancelled          |
+-------------------------------+   (Due and Priority sub-menus arrive with T14)

Glyphs: ( ) todo  (/) in progress  (?) question  (!) important  (>) forwarded  (x) done  (-) cancelled
v / >   group chevron (a separate button with aria-expanded; the title button still opens the note)
>       at row start: keyboard cursor row (a focus ring in the real UI, not a glyph)
[! Nov 3]  overdue due chip: tone on the icon, label in foreground
Below 560 px container width: the menus fold into "Filters (n)", the folder subtitle hides,
chips wrap onto a meta line under the text (109, 111). Checked only in e2e with a viewport size.
```

### 2.4 Area decisions

| Area | Decision | Evidence |
|---|---|---|
| Surface | The root drops `bg-card` and inherits the editor background, like TagsView. Lavender Haze and builder themes make the two differ | `TasksView.svelte:90`; `EditorView.svelte:70`; V4 "Refuted" Scout 07 item 7 |
| Toolbar | Title "Tasks" plus the open count (`min-w-0 truncate`, Calendar header pattern), spinner, then actions. Hints stay `title=`: a bits-ui Tooltip throws without `Tooltip.Provider` | `EventCalendarHeader.svelte:36-39`; V3 "Refuted" 1 |
| Group header | Chevron button, file icon from the file-icons resolver, title in `text-foreground font-medium` (drops `text-purple-400`, about 2.3:1 on Lavender Haze), folder subtitle in `text-meta` muted, "N of M open" right-aligned. Mtime moves to the title's `title=`, formatted by the app's date utility | V9 net 5; V3 "Missed" 6; V10 "Missed" 9 |
| Row | Toggle gets a 24 px hit target and the NoteRow focus ring. Circle glyph per status with token tone (109 table). Text from 109's `taskDisplayText`, amended to drop a trailing `^blockid` and the `🆔 td-` anchor. Chips at `text-label` | `NoteRow.svelte:70`; V1 "Refuted" 8; V6 "Missed" 5 |
| Open rule | `isTaskOpen` (done and cancelled closed) drives hiding, strike-through, stats and the calendar chip. Rust `checked` and QueryJS `completed` keep their meaning | Issue 110; V5 net 2 |
| Order | Note groups by vault-relative path, client-side. 112's `groupTaskRows` later replaces the helper | PRD A3; V2 "Missed" |
| Place-keeping | `scrollTop`, the collapsed set and the cursor key live in `tasksStore`. Scroll is restored through the ScrollArea's bindable viewport ref. The section tag debounce is flushed on destroy, not dropped, and the textbox follows the store | `scroll-area.svelte:8`, `:30`; `TasksView.svelte:31`, `:42-44`; V2 "Refuted" 6 |
| Errors | A failed fetch keeps the last list and shows an inline `role="alert"` with Retry (CLAUDE.md Error Handling / Components). Uses 204's `InlineAlert` if it has landed | `tasks.service.ts:81-83`; `CollectionView.svelte:687-693` |
| Status edits | The row menu calls `toggle_task_status` with an explicit `target`, through a `setTaskStatus` service that keeps `toggleTask`'s dirty-buffer protocol and the stale handling. One-level undo as a sonner toast action | `contracts/commands.ts:108-111`; `tasks.service.ts:130-179`; `event-calendar.service.ts:1472` |
| Keyboard | 113's roving model (`role="list"` per group, `role="listitem"` rows), with the current row key held in `tasksStore` and reconciled to the next surviving row after a refetch | V6 net 5-6 |
| Layers | No `features -> plugins` import (Kanban's proximity helper stays put). No `tasks -> event-calendar` import, which would form a cycle with 110's `event-calendar -> tasks` edge. A `tasks -> file-icons` pair is allowed and goes into the cycle baseline | V3 "Refuted" 3; V5 "Refuted" 2 |

## 3. Ticket breakdown

### Step 0 (main session, docs only, not a slice)

Before the next relay run:

- Re-anchor the stale line citations in 108, 109, 110, 111, 112, 113, 122 and 198.
- Write in the amendments named below.
- Re-point the blockers named below.
- Until that is done, move 108 to 113 to `needs-triage` so auto-launch cannot pick them up (owner question Q0).

The facts in V1 to V10 serve as the refresh source.

### Common acceptance criteria (every ticket)

- A failing test comes first. Component tests use the real Tasks store and mock only Tauri IPC (no store or pure-logic mocks).
- The help guide page for Tasks describes the new behavior in the same delivery (PRD A12).
- The e2e suite runs when toolbar or row markup the spec reads changes. Exact unit assertions that change are changed on purpose and named in the commit.
- Any new store getter has a store test. A derived getter also gets the ADR-0034 test.
- No raw palette class, no new theme key, and exactly one pane toolbar element with no overrides.

### Wave 1: calm, correct, clean (same information model)

**T01. Stable row test hooks and one shared task fixture** (new, prefactor)
- Blocked by: none
- Delivers: nothing visible. Later row changes can add chips, chevrons and menu buttons without silently retargeting tests.
- Acceptance:
  1. Component tests find the toggle and the task text through dedicated hooks, not by "first span" or "first button" in a row.
  2. The status shown by the toggle is asserted through a status attribute, not by the presence of an SVG circle.
  3. One shared fixture builder with realistic metadata (due, scheduled, priority, recurrence, tags) and all seven statuses replaces the two duplicated group builders in the component and service tests.
  4. The duplicated e2e listing test is removed, and fixed sleeps in the Tasks e2e spec become auto-waits.
  5. No existing assertion changes meaning.

**T02. The list stays mounted and the rule explains itself** (amends Issue 108)
- Blocked by: T01
- Delivers: ticking a task no longer blanks the list. A sentence says which tasks are listed and offers Clear. The empty state names its cause. The view sits on the editor surface.
- Acceptance:
  1. During a refetch over an existing list the rows, focus and scroll stay, and a "Refreshing tasks" spinner shows in the toolbar. "Indexing tasks..." shows only when no list has loaded yet.
  2. A rule sentence above the list describes the section tag, the hide-completed state and the date range. A Clear action empties the section tag and the textbox.
  3. The empty state names the first cause that emptied the list (no task under the tag, all completed, date range) and offers the one action that undoes it.
  4. The section tag box has an accessible name "Section tag" and no duplicate Hash icon. The view root uses the editor background.
  5. Returning to the Tasks tab shows the previous list at once, without the loading text.

**T03. The list keeps your place** (new, pulls PRD A3 forward from 112)
- Blocked by: T02
- Delivers: ticking a task in the fifth note leaves that note fifth. Switching to a note and back restores the scroll position. A tag typed just before a tab switch still applies.
- Acceptance:
  1. Note groups are ordered by vault-relative path whatever their modification time. A note outside the vault path falls back to its absolute path.
  2. After a toggle whose refetch returns the toggled note first by mtime, the note still renders in its path position.
  3. The scroll position is held by the Tasks store and restored after the view remounts on tab activation.
  4. A section tag typed less than 400 ms before the view unmounts is applied, not dropped.
  5. When the section tag changes from outside the textbox (Clear, a future command), the textbox shows the new value.

**T04. Open means not done and not cancelled** (amends Issue 110; blocker re-pointed from 109 to T02)
- Blocked by: T02
- Delivers: in-progress, question, important and forwarded tasks are listed by default and never struck through. Counts say "open".
- Acceptance:
  1. With hide-completed on, todo, in-progress, question, important and forwarded rows stay visible. Done and cancelled rows are hidden.
  2. Strike-through and closed styling follow the open rule, not the checkbox character. A closed parent with an open child stays visible.
  3. Clicking the circle on any open status writes done, and on a closed status writes todo.
  4. The calendar task chip uses the same rule. The hide toggle's title says "closed", and the e2e selector follows it.
  5. The count line reads "N open in M notes".
  6. The pinned "anything but todo is completed" cases change on purpose, and the commit says so.

**T05. A header that reads like a note, and type that matches the app** (new; absorbs the Tasks view part of 198)
- Blocked by: T03, T04
- Delivers: the toolbar starts with "Tasks" and the open count. Each group header shows the note's icon, its title, its folder and "2 of 5 open". The raw purple is gone. The circle has a real hit target and a visible focus ring.
- Acceptance:
  1. A note at `Projects/Clients/ACME` renders the title "ACME", the subtitle "Projects/Clients" and its open-of-total count. A root note has no subtitle.
  2. The header uses the note's resolved file icon, and the new feature dependency is recorded in the feature cycle baseline.
  3. The modification date appears only as a hover hint on the title, formatted by the app's date utility (no year for the current year).
  4. The toolbar shows the "Tasks" title and the open count and truncates the title first. The count moves out of the list body.
  5. Text uses the chrome type roles. The toggle has a larger hit target and the shared focus ring. No raw palette class remains in the Tasks feature.
  6. Issue 198 drops its Tasks view site in the delivery comment.

**T06. Rows show status glyphs, clean text and chips** (amends Issue 109; blocker re-pointed to T01 and T05)
- Blocked by: T01, T05
- Delivers: each status has its own glyph and tone. "Send invoice 📅 2026-11-03 ⏫ #work" reads "Send invoice [! Nov 3] [high] [#work]".
- Acceptance:
  1. The seven statuses render seven distinct circle glyphs with token tones. The toggle's accessible name includes the status word.
  2. The row text drops emoji signifiers, a trailing block id and the Todoist anchor. It falls back to the raw text for heading wikilinks, URL fragments and tag-only tasks.
  3. Due, scheduled, start, priority, recurrence and tag chips appear in that order. An overdue due date is marked against today, and a different year adds the year.
  4. The toggle still sends the raw task text and status to the write guard.
  5. Below 560 px container width the chips wrap under the text (manual check plus an e2e viewport test).
  6. The amendment removes 109's note that strike-through stays on the checkbox character, which T04 already changed.

**T07. A failed refresh says so** (new)
- Blocked by: T02
- Delivers: when loading tasks fails, the view says so and offers Retry instead of silently showing a stale or empty list.
- Acceptance:
  1. A failed fetch keeps the last list and shows an inline alert with the reason and a Retry action.
  2. With no list loaded yet, the alert takes the empty state's place.
  3. The next successful fetch clears the alert. A superseded request never sets it.
  4. The Tasks store exposes the error through a getter, covered by a store test.

### Wave 2: the view becomes capable (PRD chain, amended)

**T08. Quick filters on status, due, priority and search, in a filter row** (amends Issue 111)
- Blocked by: T06
- Delivers: the mtime date pills and the eye toggle are replaced by Status, Due, Priority and search. The filters sit in their own row under the toolbar.
- Acceptance:
  1. A Status menu offers Open, Closed or All plus per-status choices. A Due menu offers Any, Overdue, Today, Next 7 days, No date and the two "Note edited in the last N days" options. A Priority menu offers the levels, and a search box filters in memory.
  2. Status, Due, Priority, the section tag box and Reset live in a row under the toolbar. The toolbar keeps the title, count, spinner and search.
  3. The rule sentence and the empty-state causes describe the quick filters instead of hide-completed and the date range.
  4. A filtered-out parent with a passing child stays visible and dimmed.
  5. Below 560 px container width the menus fold into "Filters (n)" (e2e viewport test). The e2e spec is updated for the removed eye toggle.

**T09. Change a task's status from the row, with undo** (new; carves the status part out of Issue 122, no Rust change)
- Blocked by: T04, T06
- Delivers: a visible row action button (and right click) opens a menu with Open at line, Copy task text and Status (todo, in progress, done, cancelled). An Undo toast restores the previous status.
- Acceptance:
  1. Choosing a status writes it through the existing guarded toggle command and the row updates after the refetch.
  2. A stale line (the note changed underneath) shows the existing "changed on disk" message and writes nothing.
  3. Undo writes the previous status back through the same guarded path. Only the last write from the view can be undone.
  4. The row action button is always visible and has an accessible name. The menu follows the shared menu-item anatomy rules.
  5. Issue 122 is amended to keep only due and priority.

**T10. Group and sort, with collapse that survives tab switches** (amends Issue 112)
- Blocked by: T08
- Delivers: a Display menu groups by note, folder, due date, priority or status. Groups collapse and stay collapsed when the owner glances at a note and comes back. Long groups cap at 50 rows with "Show N more".
- Acceptance:
  1. Group by Note (default), Folder, Due date, Priority or Status, with the bucket orders 112 specifies. Non-note groupings show flat rows with a parent breadcrumb.
  2. The collapsed set lives in the Tasks store, and a collapsed group stays collapsed across an unmount and remount.
  3. The Display menu offers Collapse all and Expand all. Every grouping uses T05's header anatomy.
  4. A group shows 50 rows, then "Show N more".
  5. T03's path-order helper is removed in favor of the grouping logic, with the same order for note groups.

**T11. Keyboard navigation and a safe palette entry** (amends Issue 113; blocker re-pointed from 112 to T08)
- Blocked by: T08
- Delivers: Up/Down, Home/End, Space and Enter work on rows. The current row survives refreshes and tab switches. "Tasks: Open" opens or focuses the view without ever closing it.
- Acceptance:
  1. Arrows, Home and End move a roving focus across rendered rows. Space toggles once, whether on the row or the circle. Enter opens the note at the task's line.
  2. The current row is held in the Tasks store by note and line. After a refetch removes it, the cursor moves to the next surviving row, then the previous one.
  3. Rows are list items inside one list per group. The circle's accessible name includes the task text and the status word.
  4. On open, focus goes where the owner decides (Q5).
  5. "Tasks: Open" (idempotent) and 113's status-filter command appear in the palette. "Toggle Tasks View" keeps its behavior.
  6. If T09 has landed, Shift+F10 and the ContextMenu key open the row menu.

### Wave 3: gated on owner answers

**T12. Due summary on the rule line** (new; gated by Q9)
- Blocked by: T08
- Delivers: when open tasks are overdue or due today, the rule sentence ends with "3 overdue, 1 due today". Clicking a part applies that Due filter. With no dated tasks nothing changes.
- Acceptance:
  1. The counts come from open tasks before quick filters, with today from the app clock, and ignore invalid day keys.
  2. A part renders only when its count is above zero.
  3. Clicking a part sets the Due filter, and the sentence says so.
  4. The derived summary sits behind a store getter, with a store test.

**T13. Filters and grouping survive a restart** (new; split of Issue 123; gated by Q10)
- Blocked by: T10, Issue 030
- Delivers: the chosen quick filters and grouping come back after an app restart, per vault.
- Acceptance:
  1. A per-vault Tasks view entry in the vault settings holds the quick filters and grouping, opaque to core and parsed by the Tasks feature.
  2. An unreadable or foreign value falls back to defaults without being written back until the user changes the view.
  3. Unknown keys survive a round trip, so 123's sources can join later.
  4. Collapse stays session-only unless Q10 says otherwise.

**T14. Set due and priority from the row** (amends Issue 122 remainder; Rust; gated by Q8)
- Blocked by: T09, T10, Issue 085
- Delivers: the row menu gains Due (today, tomorrow, in a week, pick a date, clear) and Priority, each with Undo.
- Acceptance:
  1. A guarded line-rewrite command addresses any task line by line number, expected text and expected status, without requiring an anchor. It is confined to the open vault and goes through the shared task-write step.
  2. A trailing block id and the Todoist anchor stay in place after an edit.
  3. Undo restores the previous line through the same command.
  4. The e2e mock writes through the mock index, so an e2e run can assert the updated chip.
  5. The token patchers live in one place (Q8), with no third regex mirror.

**T15. A just-closed row lingers until you move on** (new; gated by Q2)
- Blocked by: T08, T09
- Delivers: a task closed from the view stays visible, struck through and dimmed, until the filter changes or the tab is left, so the list does not shift under the pointer.
- Acceptance:
  1. A session-only set in the Tasks store keeps rows closed from the view visible under the Open filter.
  2. The set clears on a filter change, on leaving the tab and on vault switch.
  3. Undo from the toast removes the linger state together with the write.
  4. Rows closed outside the view (editor, Todoist sync) never linger.

### Untouched existing chain (after or beside the waves)

- Run in parallel with the frontend chain (one cargo build at a time): 074 (Rust headings) -> 115 (entries snapshot) -> 116 (sources panel, retires the section tag box from the filter row) -> 117 -> 118 / 119. Also 115 -> 121 (remove the section command) and 075 (task tag rule).
- 120 (task tag filter) after T08.
- 123 (remainder: sources) -> 124 (saved views and the B1 default flip) -> 125 and 126.
- 129 (Todoist row state) stays `needs-triage`.
- 198 keeps its non-Tasks sites, still blocked by 151.
- 227 (help text) can ride with T02.

### Blocking graph

```
T01 --> T02 --+--> T03 --+
              |          +--> T05 --> T06 --+--> T08 --+--> T10 --+--> T13 (Q10, +030)
              +--> T04 --+                  |          |          +--> T14 (Q8, +T09, +085)
              |                             +--> T09 --+--> T11 (needs T08)
              +--> T07                      (T09 needs T04, T06)
                                                       +--> T12 (Q9)
                                                       +--> T15 (Q2, needs T09)
074 --> 115 --> 116 --> 117 --> 118/119 ;  115 --> 121 ;  T10 + 116 + 030 --> 123 --> 124 --> 125/126
```

Every ticket that touches the Tasks view component runs in series: it is a hot file shared with 129, 198 and 227 (`.scratch/open-itens/priority-2026-11-08.md:60`). T03, T04 and T07 have no data dependency on each other and can go in any order after T02. Sizes (opinion): T01, T03, T04, T07, T12 and T15 are S. T02, T05, T06, T09 and T11 are S to M. T08, T10, T13 and T14 are M.

## 4. Owner decisions the research cannot answer

| # | Question | Options | Recommendation |
|---|---|---|---|
| Q0 | Protect the stale `ready-for-agent` Issues from auto-launch until Step 0 is done? | (a) Flip 108-113 to `needs-triage` now. (b) Leave them, and refresh before the next run | (a). They cite lines from a 305-line file that no longer exists (V10 "Missed" 8) |
| Q1 | Accept the re-sequencing? Feel fixes first, 110 before 109, new T03/T05/T07 inserted, 113 after 111 instead of 112 | (a) Yes. (b) Keep the written chain and add the new tickets at its end | (a). The view stops looking broken after 4 to 5 small deliveries instead of after the full chain |
| Q2 | A task ticked under the Open filter | (a) Vanishes at once (today). (b) Lingers dimmed until the filter changes or the tab is left (T15). (c) Lingers until the cursor moves two rows away | (b). It is simple session state, and it stops the list shifting under the pointer. (c) adds cursor coupling for little gain |
| Q3 | Group order | (a) Path order (PRD A3). (b) Mtime order frozen for the session | (a). It is already accepted and is stable across restarts |
| Q4 | Group header identity | (a) File icon, neutral title. (b) File icon plus the resolver's title color. (c) Name only | (a). It matches tabs and note rows without tinting every header |
| Q5 | Focus when the Tasks tab opens | (a) Search box (113 as written). (b) First row | (b). Space and Enter work at once, and search is one Tab away. Typing a letter into an unfocused list does nothing harmful under A8 |
| Q6 | Reopen A8 (bare-letter shortcuts)? | (a) Keep A8 for v1. (b) Add a Calendar-style bare-key layer | (a). Revisit after T11 ships and the owner has used it |
| Q7 | Carve status changes out of 122 into T09? | (a) Yes, frontend only. (b) Keep everything in 122 behind the locator decision | (a). Status needs no Rust (`toggle_task_status` takes any `target`) and is inside A7 |
| Q8 | Due and priority writes (T14) | Locator: (a) a new guarded line-rewrite command, or (b) give lines a `🆔` anchor first. Patcher home: (c) move Todoist's token patchers to a shared pure module, or (d) import them from Todoist sync | (a) + (c). (b) collides with the Obsidian Tasks dependency id and with ADR-0037. (d) adds a feature pair that `settleTaskWrite` was placed in core to avoid |
| Q9 | Due summary on the rule line (T12) | (a) Yes, only when non-zero. (b) No, wait for the Today/Overdue smart lists | (a), low priority. It is invisible in a vault with few dates (B5) |
| Q10 | Persist filters and grouping before Sources exist (T13)? | (a) Yes, a schema that grows later, collapse session-only. (b) Yes, including collapse (needs rename following and pruning). (c) No, wait for 123 | (a) |
| Q11 | Checkbox shape | (a) Circles per status (109, calendar). (b) The editor's rounded square | (a). Seven statuses need seven glyphs, and the editor cannot render the extended statuses at all (V9 "Refuted" Scout 17 item 2) |
| Q12 | Overdue color | (a) Tone on the chip icon only, label in foreground. (b) Tone on the date text too (about 3.4:1 on the default card) | (a). It is contrast-safe. 109's text currently says (b), so amend it if (a) |
| Q13 | Virtualization | (a) Keep A9's 50-row cap. (b) Virtualize | (a). Revisit with real numbers from the session log ("buildTaskIndex completed in", "Tasks: N files, M tasks") |
| Q14 | A Tasks rail entry | (a) No, palette and Cmd+Shift+T only. (b) A built-in rail action (needs an ADR-0033 amendment) | (a) |

## 5. Deliberately left out

| Item | Why |
|---|---|
| Restyling the date pills, eye toggle and section tag box (A's P3 beyond labels) | 111 deletes the pills and toggle, and 116 retires the tag box (V4 net 6). Polish there is throwaway |
| Rendering `metadata.description` as the row text | Lossy: the tag strip breaks `[[Note#Heading]]` and URL fragments, and empties tag-only tasks (V1 "Refuted" 8). 109's `taskDisplayText` fallback is used instead. The parser fix is 075 |
| Kanban's date proximity palette and helper | Raw palette classes, and `features -> plugins` is forbidden (V3 "Refuted" 3) |
| Tooltips | A bits-ui Tooltip needs a Provider or the view throws (V3 "Refuted" 1). `title=` is the convention, and an e2e selector relies on it |
| Square checkbox, renaming `--lp-task-*` | The rename orphans saved user themes (V5 "Refuted" 8). Shape is Q11 |
| Virtualization | PRD non-goal and A9. It would replace ScrollArea and break the e2e scroll test (V7 "Refuted" 7) |
| Done-date stamping, recurrence spawning | PRD A7, and it collides with ADR-0037 for synced recurring tasks (V1 "Refuted" 12) |
| Quick add, natural-language dates, drag and cross-note moves, multi-select and bulk | PRD non-goals. A half-failed move duplicates a `td-` anchor and freezes the link (V10 "Conflicts") |
| Inline text edit (C S11) | Outside A7 |
| Bare-key layer, shortcuts dialog, hint strip (C S4, S10) | A8. With five keys, the help page is enough. Revisit with Q6 |
| Palette presets, group presets and cursor-scoped row commands (C S6, S9) | Saved views (124) cover presets. Row commands duplicate the row menu. Only "Tasks: Open" and 113's status filter stay |
| Write queue or per-row in-flight guard (C 4.5) | A rare race that the existing stale guard already reports. CLAUDE.md "simplicity first" |
| Optimistic patch that drops the immediate refetch | Documented and pinned (`tasks.service.ts:114-116`, `tasks.service.test.ts:277`). The full fix is 115's overlay |
| Making `get_all_tasks_v2` async, a store equality check before writes | No measurement. After 115 the view stops calling it (V7 net 7-8) |
| Editor parity for `[/] [-] [?] [!] [>]` | A `core/` live-preview change and an owner call, not a Tasks view slice (V5 net 6) |
| Fixing the section match semantics in Rust | 115 does it in TS, and 121 deletes the Rust command (V4 net 7) |
| Todoist state on rows | 129 stays `needs-triage`: the "pending" definition and the "Open in Todoist" link conflict are unresolved (V6 net 8) |
| Live midnight rollover | 111 already chose "refresh on next refetch". A live clock would need the calendar clock (a cycle) or a new tick |
| Sticky group headers | Whether `position: sticky` works inside the bits-ui ScrollArea viewport is unverified |

## 6. Not checked

Nothing was rendered or run. Widths (toolbar fit, the 560 px fold), contrast and the scroll restore timing come from code reading and V9's hand calculations; a restore before the first rows render may need a frame delay. I read Issues 108 to 110 in full and only the first part of 111 to 113, 122, 123, 125, 198, 204 and 227. Issues 116 to 121, 124, 126 and 129 were read only through their status and blocker lines. The PRD was read through its decisions and target layout (lines 1 to 180), not end to end.
