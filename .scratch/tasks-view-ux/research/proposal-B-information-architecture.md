# Proposal B: Tasks view redesign, information architecture first

Angle: decide what the view shows and in what order (list, rule, filters, groups, rows, metadata) before any styling. Inputs: `validated-01.md` to `validated-10.md` (they win on conflict), the raw scouts for detail, the archived PRD `.scratch/archived/tasks-view/PRD.md` and the open Issues in `.scratch/open-itens/issues/`. Read-only research. Nothing was run, rendered or tested. Line numbers are from `main` at `23f6c1f91`.

Labels: **Fact** means read in code or repo files, with path:line. **Opinion** means a design judgment.

## 0. The constraint that shapes everything

**Fact.** This redesign already has an owner-answered PRD (owner answers dated 2026-11-06, `.scratch/archived/tasks-view/PRD.md:54-69`, "No assumption (A1 to A12) was vetoed") and a `ready-for-agent` Issue chain: 108 -> 109 -> 110 -> 111 -> 112 -> 113, plus 074, 115-126 and 129 (`.scratch/open-itens/ledger.md:111-166`; validated-05 "Missed by scouts" 1, validated-07 "Missed" 1, validated-08 "Missed" 1). The PRD already defines a query model (sources, excludes, quick filters, one grouping level, fixed sort, saved views) and a mockup (`PRD.md:156-170`).

**Consequence for this proposal (opinion).** A parallel IA would duplicate decided work and contradict owner answers. So this proposal does three things:

1. States the target IA as one coherent picture, mapped onto the existing Issues.
2. Names the IA **gaps and defects in those Issues** that the validation rounds found (collapse state dies on every tab switch, no place-keeping, group headers stay as they are, filters crowd a fixed 40 px toolbar, ticked rows vanish).
3. Proposes a small number of **new or amended slices** that fill those gaps, and a re-sequencing that gets the visible "ugly and simple" defects out first.

Owner decisions that bind this proposal (from `PRD.md:56-67` and assumptions `:121-132`): B1 (a) default list "All open" plus a seeded "To list" view; B2 (a) done and cancelled are closed; B5 few tasks carry dates, so date-first layouts are options, not defaults; B6 (a) Rust records headings; A2 the date filter means due date, mtime survives only as "Note edited in the last N days"; A3 one grouping level, note groups sort by path; A8 no bare-letter shortcuts; A9 no virtualization, 50 rows per group then "Show N more".

## 1. What the view shows today, as an IA audit

| IA layer | Today (fact) | Problem (fact unless marked) |
|---|---|---|
| Which tasks (source) | A free-text heading substring, default `#to-list`, in memory only (`tasks.store.svelte.ts:8`, `:30`); case-sensitive `contains` on heading text (`parsing.rs:1755`) | Hidden rule: a vault without that heading shows "No tasks found" (`TasksView.svelte:141-142`); `#to-list` matches `#to-listing` (validated-02 "Missed"; validated-04 Scout 08 confirmed) |
| Which tasks (filter) | Date pills filter on file mtime (`tasks.logic.ts:76-88`); hide-completed eye keys on `checked` (`tasks.logic.ts:40`) | Mtime is not a task property, and every toggle or Todoist write bumps it (validated-05 Scout 09 table). `checked` is true for `[/] [?] [>] [!]`, so in-progress and important tasks are hidden by default (validated-01 Confirmed, data model P1) |
| Grouping | By file only (`TasksView.svelte:149`) | No alternative grouping, no collapse |
| Order | Groups by `modified_at` desc in Rust (`src-tauri/src/vault/index.rs:1082`, `commands/vault.rs:728`) | A toggle rewrites the file, so its group jumps to the top (validated-01 "Missed" 1; validated-10 "Missed" 1) |
| Group header | File name in `text-purple-400`, `(date)` and `(count)` in parentheses (`TasksView.svelte:152-165`); `formatDate` hardcodes `en-US` (`:80-87`) | Raw palette class, the only one in the file; no folder context; mtime shown as if meaningful; count is total, not open |
| Row content | Raw `task.text` through `parseTaskTextSegments` (`TasksView.svelte:194`); `metadata` (13 fields) copied and never read (`tasks.service.ts:20-48`) | Emoji signifiers and `#tags` render as raw text; due, priority, recurrence invisible |
| Row state | Circle follows `toggleTarget`, strike-through follows `checked` (`:171`, `:191`) | `[/] [?] [>] [!]` show an open circle next to struck text (validated-01 Refuted 5) |
| Summary | `N tasks in M files` (`:144-146`) | `computeTaskStats` also returns completed and pending, unused (validated-01 Confirmed) |
| Feedback | Every refetch swaps the list for "Indexing tasks..." (`tasks.service.ts:67`, `TasksView.svelte:139-140`); errors only logged (`tasks.service.ts:81-83`) | Two flashes per toggle (validated-01 "Missed" 2); scroll and focus lost |
| Persistence | Module `$state`, survives tab close, lost on restart and vault switch (`tasks.store.svelte.ts:4-33`; validated-08 Refuted 1) | The component remounts on every tab activation (`src/lib/app/EditorView.svelte:72-73`), so any component-local state (scroll, debounce, future collapse) resets on every tab switch (validated-04 "Missed" 1) |

## 2. Target information architecture

### 2.1 Hierarchy, top to bottom

1. **Toolbar** (the one `pane-toolbar` row): what this is and how big it is. Title "Tasks", open count, refresh spinner, search, Display menu.
2. **Filter row** (a plain element under the toolbar, not `pane-toolbar`): the task-level quick filters (Status, Due, Priority, Tag) and Reset. Until Issue 116 the heading-tag textbox lives here too.
3. **Rule line**: one sentence that says which tasks are listed and why (Issue 108, extended by 111 and 120), followed by an optional due summary (new, section 2.5).
4. **Groups**: one grouping level (Issue 112). Each header: chevron, identity (icon, title, subtitle), open-of-total count.
5. **Rows**: status glyph, display text, metadata chips (Issue 109), with dimmed parents and breadcrumbs where the grouping needs them (111, 112).
6. **Empty and error states** in place of groups, naming the cause and offering the one action that undoes it (108, 111, 125).

Rationale (opinion): the toolbar is fixed at 40 px and bans `flex-wrap`, height, padding and gap overrides (`src/app.css:141-150`; `src/tests/lib/pane-toolbar.test.ts:30`, `:46-50`; validated-04 Confirmed). Status, Due, Priority, Tag, search, Display, spinner, title and count do not fit in one row on a narrow center pane (validated-03 "Missed" 4). Splitting "identity and global actions" (toolbar) from "what is filtered" (filter row) is the cut that keeps the toolbar test untouched and gives the filters room. This matches the PRD mockup, which already places the quick filters on a row below the toolbar (`PRD.md:158-164`).

### 2.2 Source vs filter vs display: one place per question

The PRD's split is the right IA and this proposal keeps it (`PRD.md:187-196`):

| Question the owner asks | Control | Owner of the state | Issue |
|---|---|---|---|
| Which notes supply tasks? | Sources (heading tag today, source cards later) | query `sources` / `exclude` | 108 (sentence + Clear), 116, 117, 119 |
| Which of those tasks do I want now? | Quick filters: Status, Due, Priority, Tag, search | query `quick` | 111, 120 |
| How are they arranged? | Display menu: Group by; collapse | query `group`, `sort`; session collapse set | 112 (+ amendment below) |
| Which saved arrangement am I on? | List column / dropdown | `tasksView.activeList` | 124, 125, 126 |

Retiring today's controls (fact, from the Issues):

- **Mtime date pills** become the Due menu; mtime survives only as "Note edited in the last 7/30 days" inside it (Issue 111, PRD A2).
- **Eye toggle** becomes the Status menu (Open / Closed / All, plus per-status checkboxes) (Issue 111).
- **Free-text section tag** stays (with `aria-label="Section tag"`, Issue 108) until the TS heading rule exists (Issue 115, which needs Rust Issue 074), then becomes a heading clause in a source card (Issue 116). Validated-04 net 6: do not restyle or retire it earlier, because the replacement needs 074's schema bump.

### 2.3 Grouping

- **Default: by note** (B5, Issue 112). Note groups sort by `relPath`, not mtime, so a toggle never moves a group (PRD A3; validated-08 net 3).
- **Options** (Issue 112): Folder, Due date (Overdue, Today, Tomorrow, This week, Later, No date), Priority (Highest, High, Medium, No priority, Low, Lowest), Status (Todo ... Cancelled). After 074/115/117: note type, note property, heading (Issue 118).
- **Rows in note groups** keep document order and the indent tree, with failing parents kept dimmed (Issue 111's `applyQuickFilters`). **Rows in other groupings** are flat, sorted due, priority, path, line, and a child shows its parent's description as a breadcrumb (Issue 112). This settles validated-05 "Missed" 8 (parent vs own date): the child goes by its own date and carries its parent as context.
- **Sorting**: fixed at `['due', 'priority', 'path']`, no control in v1 (Issue 112 puts `sort` in the store only so 123/126 can persist and compare it). Opinion: correct for v1; a Sort control is an owner question (Q7).

### 2.4 Group header anatomy (gap: no Issue owns it)

Issue 112 says the note header "keeps today's look" (`112-group-and-sort.md`, "Groups"), and Issue 198 only swaps the purple class. Nobody redesigns the header, yet it is the most repeated element on screen. Proposed anatomy (opinion, grounded below):

```
[v] [icon] Note title                 Folder/Sub/path          2 of 5 open
 ^    ^        ^                            ^                       ^
 |    |        text-row font-medium          text-meta muted         text-meta muted tabular-nums, ml-auto
 |    resolveIconForPath(filePath) icon, as tabs and NoteRow
 chevron button, aria-expanded (separate from the title button)
```

- **Title**: `text-foreground font-medium`, replacing `text-purple-400` (validated-09 net 5; contrast of the purple is about 2.3:1 on the shipped light theme, validated-09 Refuted 5). Clicking it opens the note (today's behavior, `TasksView.svelte:153-158`).
- **Icon**: `resolveIconForPath` from `features/file-icons` (`src/lib/features/file-icons/icon-resolver.ts:64`), used by the tab strip (`EditorView.svelte:60-67`) and `NoteRow`. `features/tasks -> features/file-icons` is allowed while acyclic and `file-icons` imports nothing from `tasks` (validated-03 "Missed" 6; validated-01 "Missed" 6). The new pair lands in `feature-cycle-baseline.json`, committed with the slice.
- **Subtitle: folder path**, not mtime. Opinion: the folder answers "which project is this", which a daily note title such as `2026-11-05` cannot. Mtime moves to the title's `title=` attribute, formatted with `#lib/utils/date.js` instead of the hardcoded `en-US` (validated-10 "Missed" 9). The subtitle truncates first (`min-w-0 truncate`, the Calendar header pattern at `EventCalendarHeader.svelte:36-39`, validated-03 "Missed" 4).
- **Count: "2 of 5 open"** when closed tasks are hidden, "5" otherwise. Opinion: "open of total" tells the owner that a group has hidden closed tasks, which today's `(count)` does not. The open rule is `isTaskOpen` (Issue 110).
- **Chevron**: a separate `Collapsible`-free button with `aria-expanded`, next to the title button, because a button cannot nest in a button (validated-03 Refuted 9, the `TagItem.svelte:28-44` model). Collapse is a filter over rows, not `Collapsible.Content`, so it stays compatible with the 50-row cap and any later windowing (validated-03 "Missed" 3).
- **Non-note groupings** reuse the same header with label + count and no icon or subtitle.

### 2.5 Due summary on the rule line (gap; owner question Q2)

Opinion: B5 says few tasks carry dates, which argues against a date-first default, not against surfacing the few that are urgent. Proposal: after the rule sentence, show `3 overdue . 1 due today` as two small buttons, **only when the count is non-zero**. Clicking one sets `quick.due` to `overdue` / `today` (Issue 111's `DueRange`). With zero dated tasks the line is unchanged, so a vault with no dates sees nothing new.

- Counts come from a pure `dueSummary(rows, today)` in `task-query.logic.ts`, over `tasksStore.rows` before quick filters (so the numbers do not drop to zero once a filter is applied), with today from `formatNow('YYYY-MM-DD')` (`src/lib/utils/date.ts:15`), never from the calendar store (validated-05 Refuted 1 and 2: a `tasks -> event-calendar` import would close a cycle with Issue 110's `event-calendar -> tasks` edge).
- Colors: overdue on an icon or border in `text-destructive`, label in `text-foreground`, because neither `destructive` nor `warning` is a guaranteed 4.5:1 text pair on card or editor background (validated-09 net 4, Refuted 1).
- It respects the Calendar's closed rule (validated-01 "Missed" 11), because it counts only `open` rows.

### 2.6 Rows (Issue 109, with two amendments)

```
( )  Send invoice to ACME            [! Nov 3] [high] [every week] [#work]
     ^ statusGlyph icon+tone           ^ chips from taskChips(metadata, today), text-label
```

- Status glyph per status with token tones (Issue 109 table). Circles stay (Issue 109 decided; the editor uses squares, validated-03 Refuted 4, validated-05 Refuted 8). Strike-through follows `isTaskOpen` (Issue 110).
- Display text through `taskDisplayText(task)` with the raw-text fallback for heading wikilinks, URL fragments and empty descriptions (Issue 109). Never `metadata.description` alone (validated-01 Refuted 8; validated-03 Refuted 2).
- **Amendment A (gap):** `taskDisplayText` also strips a trailing block id `^abc` (the Rust description keeps it, `src/lib/features/todoist-sync/task-line.logic.ts:290-297`) and never shows the Todoist anchor `🆔 td-...` (validated-06 "Missed" 5; validated-01 "Missed" 9). The toggle keeps sending raw `task.text` (`tasks.service.ts:150`; validated-09 "Missed" 3).
- **Amendment B (gap):** chips use the chrome role `text-label` (11 px) instead of `text-xs` (validated-09 net 6; `src/app.css:89-99`; the NoteRow chip uses an arbitrary `text-[11px]`, validated-09 Refuted 8).
- Below 560 px container width the chips wrap to a meta line under the text (Issue 109, `@container`).

### 2.7 Place-keeping (gap: no Issue owns it fully)

Three defects make the list feel broken regardless of styling (opinion, each a fact in code):

1. **The list blanks on refetch.** Issue 108 fixes it (render the loading text only when there is no data).
2. **The clicked group jumps to the top.** Issue 112 fixes it by sorting note groups by path, but 112 is fifth in the chain. Proposal: pull the stable path order forward into its own tiny slice right after 108 (S2 below). 112 then replaces the helper with `groupTaskRows`.
3. **Scroll and collapse reset on every tab switch.** `TasksView` remounts on activation (`EditorView.svelte:72-73`), and Issue 112 puts the collapsed set in a component `$state` ("session only; the view remounts", `112-group-and-sort.md`, "Collapse"). That means collapse state is lost each time the owner glances at a note and comes back, not only on restart. Proposal: keep `scrollTop` and the collapsed set in `tasksStore` (getter/setter pattern), restore scroll through the existing bindable `viewportRef` of the ScrollArea wrapper (`src/lib/components/ui/scroll-area/scroll-area.svelte:8`, `:30`). Validated-04 net 8, validated-06 "Missed" 3 and validated-08 "Missed" 4 all reach the same conclusion.

Also: a ticked task vanishes at once under the default Open filter, and its group goes too if it was the last open row (validated-10 "Missed" 2; `tasks.logic.ts:59-69`). Keeping it visible and dimmed until the next filter change is a behavior change, so it is owner question Q3, not a slice by default.

### 2.8 Persistence

- **Session**: everything in `tasksStore` (module state survives tab close, fact, `tasks.store.svelte.ts:4-33`). Add collapse and scroll as above.
- **Across restarts**: per-vault `tasksView` in `.kokobrain/settings.json`, opaque in `core/settings`, parsed in `features/tasks` (Issue 123, PRD A6). Validated-08 Refuted 11 found Issue 123's own wording inconsistent: it says "merge like `todoist`" (a spread, `settings.service.ts:160-163`) but also "not overwritten until the user changes the view", which only a raw passthrough satisfies (the `dockBadgeInboxCount` shape, `settings.service.ts:195`). Write the slice by assigning the whole value, not `Object.assign` (validated-08 Refuted 10). Sequence after Issue 030 (a failed settings load must not be saved over, validated-08 Confirmed).
- **Re-sequencing proposal (owner question Q5):** Issue 123 is blocked by 116 (Sources) and so transitively by 115 and Rust 074. The display state (quick filters, group, collapsed groups) does not depend on sources. A split "123a: display state survives a restart" blocked only by 112 and 030 would give the owner remembered filters and grouping weeks earlier. The `tasksView.version: 1` schema then gains `sources`/`globalExcludes` in 123 proper, and 124's migration reads whatever is there. Collapsed keys persisted across restarts must be `relPath`-based and pruned once per vault open, and follow renames, copying the `railExpandedFolders` pattern in full (validated-08 Refuted 8). That is extra machinery, so persisting collapse is optional inside Q5.

## 3. ASCII mockups

### 3.1 Main view, wide pane, default list, grouped by note

```
+----------------------------------------------------------------------------------+
| Tasks  38 open                          (spin)  [ Search tasks          ] [Display v] |  pane-toolbar (h-10, untouched)
+----------------------------------------------------------------------------------+
| [Status: open v] [Due: any v] [Priority v] [Tag v]   [# to-list      ]     Reset  |  filter row (own element)
| Open tasks under headings containing #to-list.  (!) 3 overdue  .  1 due today   |  rule line + due summary
+----------------------------------------------------------------------------------+
| v [icon] ACME kickoff                  Projects/ACME                2 of 5 open  |
|     ( )  Send invoice to ACME                 [! Nov 3] [high] [#work]           |
|     (/)  Draft Q4 plan                         [Nov 14]                          |
|          ( ) Outline risks                     [every week]                      |
| > [icon] 2026-11-05                    Daily                        4 of 4 open  |
| v [icon] Reading list                  Areas/Learning               1 of 3 open  |
|     (?)  Finish [[Book#Chapter 2]]                                               |
|     ...  Show 12 more                                                            |
+----------------------------------------------------------------------------------+
```

`( )` todo, `(/)` in progress, `(?)` question, `(!)` important, `(>)` forwarded, `(x)` done, `(-)` cancelled. `[! Nov 3]` is an overdue due chip (icon tinted `text-destructive`). `v` / `>` is the chevron. After Issue 116 the `[# to-list]` textbox becomes `[Sources: #to-list v] [Edit]`; after Issue 124 a list column (All open, No date, To list, + Save view) sits left of this, folding to a dropdown below 720 px (`PRD.md:174`).

### 3.2 Same data, Display > Group by > Due date

```
| v Overdue                                                              1 |
|     ( )  Send invoice to ACME        ACME kickoff     [Nov 3] [high]    |
| v Later                                                                1 |
|     ( )  Outline risks               ACME kickoff     [Nov 30]           |
|          > Draft Q4 plan                                (breadcrumb)     |
| > No date                                                             36 |
```

Flat rows, note title as a muted column, the parent as a breadcrumb (Issue 112). Collapsing "No date" is what makes this grouping useful in a mostly undated vault (opinion).

### 3.3 Narrow pane (below 560 px container width)

```
| Tasks  38 open       [ Search    ] [Display v] |
| [Filters (1) v]  [# to-list ]          Reset   |
| Open tasks under #to-list. (!) 3 overdue       |
| v [icon] ACME kickoff              2 of 5 open |
|     ( )  Send invoice to ACME                  |
|          [! Nov 3] [high] [#work]              |
```

The four menus fold into `Filters (n)` (Issue 111), the folder subtitle hides, chips wrap under the text (Issue 109). Layout at width can only be checked in e2e with `setViewportSize`, not jsdom (validated-04 Refuted 8).

## 4. Architecture and rules compliance

- **Layers (ADR-0003).** Everything new lives in `features/tasks`. Allowed imports: `utils/` (`formatNow`, `formatDate`), `core/` stores and services, `components/ui/`, and `features/file-icons` (new acyclic pair, baseline JSON committed). Forbidden: `plugins/kanban` (`getDateProximity`, validated-03 Confirmed: `layer-baseline.json` has no feature->plugin entries) and `features/event-calendar` (cycle with Issue 110). Due proximity is a string compare against `today`, no helper import (validated-03 Refuted 3).
- **ADR-0002 (shadcn-svelte).** Uses only existing primitives: `DropdownMenu` (radio and checkbox items) for Status, Due, Priority, Tag and Display; `Button` `ghost`/`icon-sm` for toolbar actions; `Input` with a height override for search (the ban is on the `pane-toolbar` element only, validated-03 Confirmed). No raw palette classes (Issue 198's guard). `Badge` from Issue 204 only if it has landed. Any Tooltip needs a `Tooltip.Provider` ancestor or the view throws on mount (validated-03 Refuted 1); default to `title=`, the repo's dominant hint convention and what an e2e selector relies on.
- **ADR-0033.** Tasks stays a singleton editor tab, no rail lens or navigator; a rail entry point is an owner question needing an amendment (validated-02 rule constraints; validated-04 net 1). Not proposed here.
- **Store/getter pattern, ADR-0034.** New state (`collapsed`, `scrollTop`) is plain `$state` behind getters with setters. Computed views (`visibleRows`, `groups` from 111/112, `dueSummary`) are module-level `$derived` behind getters, each with a store test (CLAUDE.md rule 3). `today` read inside the derived; midnight rollover on next refetch (Issue 111).
- **Pure logic.** New functions (`orderGroupsByPath`, `groupHeaderInfo`, `dueSummary`) go in `.logic.ts` files with no framework or `utils/debug` imports (`pure-logic.test.ts`, Issue 112 note).
- **Indexing rules.** Keep the `$effect` + `untrack()` + `vaultIndexVersion` refetch (rule 2) and the immediate refetch in `afterTaskWrite` (validated-07 Refuted 4: it is documented and pinned by `tasks.service.test.ts:277`). No TS mirror of the task index (rule 1). Nothing here writes a note.
- **Testing.** Real stores, no mocks of stores or `.logic.ts`; mock only `invoke`/`plugin-fs` (TESTING.md; validated-07 Confirmed). Positional selectors in `TasksView.test.ts:96`, `:133`, `:145`, `:157` break as soon as a chip span or chevron button precedes the text or toggle (validated-01 "Missed" 5; validated-09 "Missed" 8), so they are replaced first (S0). E2E runs whenever toolbar or row markup the spec reads changes (`e2e/specs/tasks-view.spec.ts:20`, `:47`, `:52-54`).
- **Help doc.** Each slice updates `help/documentation/10-tasks-and-todoist.md` (PRD A12; Issue 227).

## 5. Rust/IPC vs frontend only

| Work | Rust / IPC? | Evidence |
|---|---|---|
| Everything in S0-S9 below (place-keeping, headers, chips, open rule, quick filters, grouping, due summary, display persistence) | **Frontend only** | `metadata` already arrives (`tasks.service.ts:20-48`); `toggle_task_status` takes any `target` (`src/lib/contracts/commands.ts:108-111`) |
| Display persistence (S9 / 123a) | Frontend only, but touches `core/settings` (opaque key) | validated-08 net 4 |
| Heading rule in TS, Sources, heading/type/property grouping | **Rust**: Issue 074 adds `TaskHeading`, `NoteEntry.task_headings`, `Task.heading`, bumps `INDEX_SCHEMA_VERSION` (DTO change, Both gate) | `074-rust-task-headings.md`; validated-04 Refuted 1 (Scout 08) |
| Removing `get_tasks_in_section_v2` | Rust (Issue 121) | validated-04 Refuted 3 |
| Row edits of due and priority | Undecided at triage: `write_task_lines` needs a `🆔` anchor; validated-10 recommends a guarded sibling of `toggle_task_status` (DTO change) | `122-row-menu-edits-with-undo.md`; validated-10 net 5 |
| Fixing `TASK_TAG_RE` link stripping | Rust parser + schema bump (Issue 075) | validated-09 net 10 |

## 6. Vertical slices

Each slice is demoable alone, ships with tests per CLAUDE.md rules 6 and 11, and updates the help doc. "Existing" means an Issue in `.scratch/open-itens/issues/`; "amend" means edit that Issue's text before any run. All slices touching `TasksView.svelte` run in series (the hot-file group, `priority-2026-11-08.md:60`).

### Prefactoring

**P1. Re-anchor and amend the existing Issues (docs only, no gate).** 108-113 cite lines from the 305-line file before `5417b0501` (validated-10 "Missed" 8; validated-07 "Missed" 3). They are `ready-for-agent`, and the relay auto-launch policy can pick them up as is. Refresh the citations and write in the amendments listed under S3, S6, S7 and S10. Blocks every slice below in the sense that it must precede the next relay run.

**S0. Stable test hooks and a shared task fixture (test-only refactor, no behavior change).** Add `data-task-text` and `data-task-toggle` to the row, replace the first-`span` / first-`button` / `svg circle` lookups in `TasksView.test.ts`, add a fixture builder under `src/tests/fixtures/` with realistic metadata (due, scheduled, priority, tags, all seven statuses) replacing the duplicated `group()` builders (`TasksView.test.ts:34-48`, `tasks.service.test.ts:45-59`), delete the duplicate e2e test 3 and its fixed sleeps (validated-07 net 3, 4; Refuted 3). Demo: the suite is green and no assertion changed meaning. Blocked by: P1.

### Visible fixes, in order

**S1 = Issue 108 (existing).** List stays mounted with a toolbar spinner; rule sentence with Clear; cause-naming empty state; `aria-label="Section tag"`. Add two one-liners validated as safe: root `bg-card` becomes `bg-editor-bg` or no background (validated-04 net 4; validated-09 net 5), and drop the duplicate `Hash` icon before `#to-list` (validated-10 "Missed" 4). Demo: tick a task, the list does not blank. Blocked by: S0.

**S2 (new, S). "The list keeps your place."** (a) Note groups ordered by path: a pure `orderGroupsByPath(groups, vaultPath)` in `tasks.logic.ts`, applied in the view's derived (PRD A3 is already decided; 112 later replaces it with `groupTaskRows` and deletes it). (b) `tasksStore.scrollTop` getter/setter, saved from `viewportRef` on destroy and restored on mount. (c) Flush the section-tag debounce on destroy instead of dropping it (validated-08 net 5). Tests: logic test that order ignores `modifiedAt`; store test for `scrollTop`; component test that a toggle followed by a refetch with a newer `modifiedAt` keeps group order; component test that unmount within 400 ms still applies the typed tag. Demo: tick a task in the fifth note, it stays fifth; switch to a note and back, the scroll position holds. Blocked by: S1.

**S3 = Issue 109 (existing, amend).** Status glyphs, `taskDisplayText`, chips. Amendments A and B from section 2.6 (strip trailing `^blockid`, hide the `🆔 td-` token; chips use `text-label`). Blocked by: S1 (and 021, resolved).

**S4 (new, S to M). Group header anatomy.** Extract `TaskGroupHeader.svelte` (props: label, subtitle?, iconPath?, open, total, expanded?, onOpen?, onToggle?) and a pure `groupHeaderInfo(group, vaultPath)` returning title, folder subtitle and open/total counts. File icon via `resolveIconForPath`; title `text-foreground font-medium`; subtitle and count `text-meta text-muted-foreground tabular-nums`; mtime moves to `title=` through `#lib/utils/date.js`. Covers the TasksView part of Issue 198 (say so in the delivery comment so 198 drops that line). Until Issue 110 lands the open count uses `!checked`; S5 switches it to `isTaskOpen` with the other call sites. Tests: `groupHeaderInfo` logic test (root note gives empty folder, nested note gives `Projects/ACME`, counts); component test that the header shows `2 of 5 open` and no `text-purple-400`; `feature-cycle-baseline.json` gains `tasks -> file-icons`. Demo: headers read as a note title with its folder and progress. Blocked by: S1. Runs in series with S3.

**S5 = Issue 110 (existing).** Open means not done and not cancelled; plus the S4 header count switches to `isTaskOpen`. Blocked by: S3, S4.

**S6 = Issue 111 (existing, amend).** Quick filters. Amendment: the four menus, Reset and the heading-tag textbox live in a **filter row** element under the toolbar; the toolbar holds title + open count, spinner, search, and (from S7) Display. The toolbar title uses `min-w-0 truncate`. The `pane-toolbar.test.ts` `TOOLBARS` entry is unchanged because the filter row does not carry the class. Blocked by: S5.

**S7 = Issue 112 (existing, amend).** Group and sort. Amendments: (1) the collapsed set lives in `tasksStore` (`collapsed: Set<string>` keyed `<group kind>:<group key>`, with `toggleCollapsed`, cleared by `reset()`), not a component `$state`, because the view remounts on every tab activation; (2) the Display menu adds "Collapse all" / "Expand all"; (3) every grouping uses S4's `TaskGroupHeader`; (4) `orderGroupsByPath` from S2 is deleted in favor of `groupTaskRows`. Extra test: collapse a group, unmount and remount the view, the group is still collapsed. Blocked by: S6.

**S8 (new, S). Due summary on the rule line.** `dueSummary(rows, today)` in `task-query.logic.ts` and a `dueSummary` store getter over a module-level `$derived` of `rows` (ADR-0034, with a store test); two buttons shown only when non-zero, setting `quick.due`. Tests: logic test with today `2026-11-05` (invalid day keys and closed tasks not counted); component test that clicking "3 overdue" applies the Due filter and the sentence says "overdue"; component test that with no dated tasks nothing renders. Demo: an overdue task surfaces without changing the default grouping. Blocked by: S6. Gated by owner question Q2.

**S9 (new, split of Issue 123, M). Display state survives a restart.** `tasksView: { version: 1, quick, group, collapsed? }` per vault, opaque in `core/settings` with raw passthrough, parsed in `features/tasks` by `parseTasksView` (never throws, keeps unknown keys), written by whole-slice assignment. Tests as Issue 123 lists, minus sources. Blocked by: S7, Issue 030. Gated by owner question Q5. If the owner declines the split, Issue 123 stays as is.

### Remaining chain (existing, unchanged except as noted)

- **S10 = Issue 113** keyboard and a11y. Amend: keep the roving "current row" key (`filePath:lineNumber`) in `tasksStore`, not the component, for the same remount reason (validated-06 net 5). Blocked by: S7.
- **Issue 120** task tag filter (blocked by S6). **Issue 129** Todoist row state stays `needs-triage` (pending definition and "Open in Todoist" link conflict, validated-06 net 8).
- **074 (Rust) -> 115 -> 116 -> 117 -> 118/119; 121**: sourcing and heading/type/property grouping. 116 retires the textbox in the filter row.
- **123 (remainder) -> 124 -> 125, 126**: sources persistence, saved views and the B1 default flip, smart lists, modified marker.
- **122** row edits: needs-triage (locator decision).

### Blocking graph

```
P1 -> S0 -> S1(108) -+-> S2 (new)
                     +-> S3(109, amended) --+
                     +-> S4 (new) ----------+-> S5(110) -> S6(111, amended) -+-> S7(112, amended) -+-> S9 (new, + 030, owner)
                                                                              |                     +-> S10(113, amended)
                                                                              +-> S8 (new, owner)
                                                                              +-> 120
074 (Rust) ------------------------------------------------- (+111) -> 115 -> 116 -> 117 -> 118 / 119 ; 115 -> 121
S7 + 116 + 030 -> 123 (remainder) -> 124 -> 125 / 126
```

S2, S3 and S4 have no data dependency on each other but share `TasksView.svelte`, so they run in series in any order. 074 is Rust only and can run in parallel with the frontend chain (memory: one cargo build at a time).

## 7. Design questions only the owner can answer

1. **Default grouping.** Note grouping stays the default (B5). Confirm, or should a vault with many dated tasks default to Due? (A per-vault switch belongs to saved views, Issue 124.)
2. **Due summary (S8).** Show "N overdue . N due today" on the rule line when non-zero? It surfaces dates without a date-first layout.
3. **Ticked rows.** Under the default Open filter, should a just-ticked task stay visible and dimmed until the next filter or list change, or disappear at once as today?
4. **Group header content (S4).** Folder path as subtitle and mtime only in a tooltip? Use the file icon resolver's `titleColor` on the title, or keep titles neutral?
5. **Persistence timing (S9).** Persist quick filters and grouping before Sources exist (split Issue 123), accepting a `tasksView` shape that grows later? Persist collapsed groups across restarts too (needs rename-following and pruning), or keep collapse session-only?
6. **Closed tasks presentation.** Is the Status menu (Open / Closed / All) enough, or do you want each note group to end with a collapsed "N closed" tail?
7. **Sort control.** Is the fixed order (due, priority, path) enough, or do you need a Sort menu (for example priority first)?
8. **Count wording.** Toolbar "38 open" and headers "2 of 5 open": right words?
9. **Narrow thresholds.** 560 px (filters fold, chips wrap) and 720 px (list column folds) from the PRD: keep?
10. **Overdue color.** Overdue in the destructive tone on the icon only (contrast-safe), or also on the date text, accepting about 3.4:1 on the default card (validated-03 "Missed" 10)?

## 8. What this proposal did not check

Nothing was rendered, so widths, the filter row's fit and all colors are code-derived; contrast figures come from validated-09's hand calculations. I did not open Issues 117-119, 121, 129 beyond their ledger rows and headers, nor verify that bits-ui `DropdownMenu` checkbox items behave inside a filter row at narrow widths. Restoring scroll through `viewportRef` before the first rows render may need a frame delay; that is a build-time detail to verify in S2.
