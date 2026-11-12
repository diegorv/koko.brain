# Proposal A: polish first

The question here: what is the smallest set of changes that makes the current Tasks view look and feel first-class, while it keeps the same information model? That model is one list grouped by file, the same three filters (date range, hide completed, section tag), the same toggle and the same text click.

Sources: `validated-01` to `validated-10` (cited as V1 to V10 with a section name) and the open Issues in `.scratch/open-itens/issues/`. I re-read the current `src/lib/features/tasks/TasksView.svelte` (223 lines) and `tasks.store.svelte.ts` (34 lines) at HEAD `23f6c1f91`. Nothing was run or rendered. Every visual claim comes from reading the code.

Notation: **Fact** means verified in code or in a validated report, with path:line. **Opinion** means a design judgement.

## 1. Why the view reads as "simple and ugly"

Ranked by how much each one hurts the feel, not by how hard it is to fix.

1. **The list blinks and resets on every refetch.** Fact: `buildTaskIndex` sets `isLoading` on every call (`tasks.service.ts:67`). The template then swaps the whole list for "Indexing tasks..." (`TasksView.svelte:139-140`). One toggle refetches right away (`tasks.service.ts:176-179`) and again on the throttled `vaultIndexVersion` bump, 2 s to 10 s later (`TasksView.svelte:73-78`; V1 "Missed" 2; V7 Scout 14 corrected 2). Each switch back to the tab remounts the view and pays the same cost (`EditorView.svelte:72-73`; V4 "Missed" 1). Scroll and focus are lost every time.
2. **The clicked file jumps to the top.** Fact: a toggle rewrites the file and re-indexes it with the new mtime (`src-tauri/src/commands/vault.rs:802-804`). Groups sort by mtime, newest first (`src-tauri/src/vault/index.rs:1082`; `commands/vault.rs:728`). V1 "Missed" 1, V10 "Missed" 1.
3. **Rows contradict themselves.** Fact: strike-through and hiding key off `task.checked` (`TasksView.svelte:191`; `tasks.logic.ts:40`), which is true for every status other than todo (`parsing.rs:1649`). The circle follows `toggleTarget` (`TasksView.svelte:171`). So a `[/]` or `[!]` task is hidden by default. When shown, it has an open circle next to struck-through text (V1 "Refuted" 5; V9 "Missed" 1).
4. **No visual hierarchy.** Fact:
   - The toolbar has no title and no count. Its three groups are packed to the left (`TasksView.svelte:92-134`; V1 "Confirmed").
   - The only type sizes are `text-xs` and `text-sm` (9 sites). The chrome roles `text-label/meta/row/title` go unused (`src/app.css:76-99`).
   - The file name is raw `text-purple-400` (`TasksView.svelte:154`). That class is about 2.3:1 on the shipped light theme's card (V9 "Refuted" Scout 18 item 5).
   - The date and the count sit in parentheses as plain text (`:159-164`).
   - The year always shows, and the locale is fixed to `en-US` (`:80-87`).
5. **Raw signifiers in the text.** Fact: the row renders `task.text` with its emoji tokens, `#tags` and Todoist `🆔 td-` anchors inline (`TasksView.svelte:194`; V6 Scout 11 "Confirmed").
6. **The controls look like a debug panel.** Fact:
   - The date pills have no `aria-pressed` and no focus style (`:95-103`).
   - The eye toggle is icon only, with `title` and no `aria-label` (`:108-121`).
   - The tag input reads "# #to-list" (a `Hash` icon in front of a value that already holds `#`, `:125`; V10 "Missed" 4). It uses one-off chrome (`h-6 w-28 bg-background/50`, `:131`) and has no label (`:126-132`).
7. **One empty message for every cause.** "No tasks found" (`:141-142`) shows even when the default `#to-list` section filter silently hides everything (`tasks.store.svelte.ts:8`; V4 Scout 08). A failed fetch shows nothing (`tasks.service.ts:81-83`).
8. **A different surface.** Fact: the root paints `bg-card` (`:90`) inside a `bg-editor-bg` host (`EditorView.svelte:70-71`). The two differ in Lavender Haze and in builder themes (V4 "Refuted" Scout 07 item 7; V9 "Refuted" Scout 18 item 4).

Opinion: items 1 to 3 do more harm to the feel than any color or spacing. A polish pass that skips them stays "ugly" the first time the owner ticks a task. So this proposal counts them as polish. They change no information model: 108 and the open rule are already decided (PRD B2 (a), A3).

## 2. What already exists (reconcile, do not duplicate)

Fact (V3, V5, V6, V7, V8 "Missed"): an owner-answered PRD (`.scratch/archived/tasks-view/PRD.md`, answers 2026-11-06, PRD:54-69) and its Issues already cover most of this ground:

| Issue | Status | What it covers | Use in this proposal |
|---|---|---|---|
| 108 | ready-for-agent, no blockers | List stays mounted, toolbar spinner, rule sentence, cause-naming empty state, `aria-label="Section tag"` | Taken as is (slice P1), line refs refreshed |
| 109 | ready-for-agent, blocked by 021 (resolved), 108 | Status glyph table, `taskDisplayText`, chips, `@container` | Split in two (P6a, P6b) |
| 110 | ready-for-agent, blocked by 109 | `isTaskOpen`: done and cancelled are closed | Taken as is (P5). Blocker re-pointed, see §7 |
| 111, 112, 113 | ready-for-agent, chained | Quick filters, grouping/sort/collapse, keyboard | Out of scope here (they change the model). 112 reuses P4 |
| 198 | ready-for-agent, blocked by 151 (Kanban) | Raw palette classes become tokens, plus a guard test | Hand its TasksView site to P2. 198 keeps the rest |
| 204 | ready-for-agent | `EmptyState`, `InlineAlert`, `Badge` primitives | Use if landed. Do not block on it |
| 227 | ready-for-agent | Help text about the `#to-list` default | Unchanged |

Fact: the line references in 108, 109, 110 and 198 are stale. The file shrank from 305 to 223 lines in `5417b0501` (V10 "Confirmed" Scout 20; V4 "Missed" 4). Relay can auto-launch `ready-for-agent` Issues (memory `relay-auto-launch-ready-issues`; V10 "Missed" 8). So refresh those references before any run.

The new work in this proposal fills gaps that no Issue covers: P0 (test hooks), P2 (surface, type and header), P3 (toolbar layout) and P4 (stable order, pulled forward from 112).

## 3. Target: ASCII mockup of the main view

The view after P0 to P6b, default dark theme, editor pane about 900 px wide.

```
+----------------------------------------------------------------------------------------+
| Tasks  12 open in 4 notes        [All time][7 days][30 days]  [o Hide completed]  [#  to-list   x] (.) |
+----------------------------------------------------------------------------------------+
|                                                                                        |
|  Open tasks under headings containing #to-list.  Clear                                 |
|                                                                                        |
|  ACME                                                    Projects/Clients  Nov 3    3   |
|  ------------------------------------------------------------------------------------  |
|   ( )  Send invoice to ACME                           [Nov 3]  [high]  [#work]          |
|   (o)  Draft Q4 plan                                                                    |
|        ( )  Collect last quarter numbers              [Nov 12]                          |
|   (!)  Call the accountant                                                              |
|                                                                                        |
|  Weekly review                                           Reviews           Nov 10   1   |
|  ------------------------------------------------------------------------------------  |
|   ( )  Review [[Inbox]] and file it                   [every week]                      |
|                                                                                        |
+----------------------------------------------------------------------------------------+

Legend
  ( ) todo  (o) in progress  (!) important  (?) question  (>) forwarded  (v) done  (-) cancelled
  [Nov 3]  due chip; overdue in text-destructive, other chips text-muted-foreground
  (.)      refresh spinner, shown only while a refetch runs and the list is already on screen (108)
  [x]      clear button inside the section tag box
  header   name text-foreground font-medium (left), folder + date text-meta muted, count right-aligned
```

Empty state, same frame (108 copy, styled per P2):

```
|                                                                                        |
|  Open tasks under headings containing #to-list.  Clear                                 |
|                                                                                        |
|                              [list-checks icon, muted]                                 |
|                    No task sits under a heading containing #to-list                    |
|                                     [ Clear ]                                          |
```

Below 560 px container width, the chips wrap onto a meta line under the text (109's `@container` rule). The toolbar count hides first (P3).

## 4. Design decisions per area

### 4.1 Surface and tokens (P2)

| Element | Today (fact) | Proposed | Evidence for the token |
|---|---|---|---|
| Root background | `bg-card` (`TasksView.svelte:90`) | No background class. The view inherits `bg-editor-bg` from the host, like TagsView (`TagsView.svelte:49`) | V4 rec 4; V9 rec 5 |
| File name | `text-sm font-medium text-purple-400` (`:154`) | `text-row font-medium text-foreground`, `truncate`, hover underline | V3 rec 3; V9 rec 5. `text-primary` is held to 4.5:1 only on editorBg (V9 "Confirmed" Scout 18) |
| Header secondary | `(date)` and `(count)` in `text-xs` (`:159-164`) | Folder path, then date, both `text-meta text-muted-foreground`. Count `ml-auto text-meta tabular-nums`. No parentheses | `app.css:89-99`; Calendar subtitle `EventCalendarHeader.svelte:38-39` |
| Header date | `en-US`, always with the year (`:80-87`) | `formatDate(ts, 'MMM D')` from `#lib/utils/date.js:42`, plus `, YYYY` only when the year is not the current one. This is the same rule 109 uses for chips | V10 "Missed" 9; 109 "Chips" |
| Row text | `text-sm` (`:191`) | `text-row` | `app.css:89-99` |
| Stats line | `text-xs` in the body (`:144-146`) | Moves to the toolbar (P3) as `text-meta text-muted-foreground` | TagsView count in its toolbar (`TagsView.svelte:52-54`) |
| Empty and loading copy | `text-sm` (`:140`, `:142`) | `text-meta text-muted-foreground`. Use 204's `EmptyState` if it has landed | `app.css` comment: "meta: ... empty and status messages" |
| Group divider | none, `space-y-6` (`:148`) | A `border-b border-divider` under each header, `space-y-5` between groups | Opinion. `border-divider` is the pane-toolbar divider token (`app.css:148-150`) |

No new theme key and no new `ThemeColors` entry. Fact: a new key would need user-theme migration (V9 "Refuted" Scout 18 item 7). No raw palette class is added, because 198's future guard test would fail on one (V3 "Refuted" 3).

Optional, owner question Q4: a file icon from `resolveIconForPath` (`features/file-icons/icon-resolver.ts:64`) in front of the name, to match tabs and the note list. Fact: this adds a `tasks -> file-icons` feature pair. The pair is allowed while acyclic, but `feature-cycle-baseline.json` changes and must be committed (V1 "Missed" 6; V3 "Missed" 6).

### 4.2 Toolbar (P3)

Constraint (fact): `TasksView.svelte` keeps exactly one literal `class="pane-toolbar"`. That class may not carry `h-*`, `p*-*`, `gap-*`, non-bottom `border-*` or `flex-wrap` (`src/tests/lib/pane-toolbar.test.ts:30,46-50`; V4 rec 2). Layout goes on the children. jsdom cannot check widths. Narrow-width checks are e2e only (V4 "Refuted" Scout 07 item 8).

Layout, left to right:
- **Title block:** `<h2 class="text-title">Tasks</h2>`, then the count `12 open in 4 notes`, in `text-meta text-muted-foreground`, inside `min-w-0 flex-1 truncate`. This is the Calendar header pattern (`EventCalendarHeader.svelte:36-39`). The count is a `role="status"` span (V6 rec 7). Opinion: `text-title` rather than TagsView's `text-sm text-primary`, which bypasses the type roles (V4 "Refuted" Scout 07 item 1).
- **Date range:** three `Button size="sm"` from `#lib/components/ui/button`. The active one is `variant="secondary"`, the others `variant="ghost"`, each with `aria-pressed`. This copies `TodoistSyncLogDialog.svelte:36-43`. Not `role="tablist"`, because tabs imply tab panels (V3 "Refuted" 10). Labels "All time / 7 days / 30 days". The values stay mtime-based, because changing what the filter means is 111's job.
- **Hide completed:** a labeled ghost `Button size="sm"` with an Eye/EyeOff icon plus the text "Hide completed", and `aria-pressed={hideCompleted}`. The `title` keeps the word "completed", so the e2e selector `button[title*="completed"]` still matches (`e2e/specs/tasks-view.spec.ts:47`). 110 then renames it to "closed" and updates the spec, as it already plans.
- **Section tag:** the decorative `Hash` icon goes (the duplicate `#`). The input chrome follows the one in-repo toolbar precedent, `h-7 rounded-xs border border-border bg-background px-2 text-meta` (`GraphControls.svelte:81`; V1 "Refuted" 2). A small clear (x) button shows when the tag is not empty. `aria-label="Section tag"` comes from 108.
- **Spinner:** 108's `role="status"` loader sits at the far right, before the tag box as 108 specifies.

Behavior fixes that ride on P3 because they touch the same input (facts, V2 corrections 6-7, V8 rec 5):
- `onDestroy` flushes a pending debounce instead of dropping it (`TasksView.svelte:42-44`). The view unmounts on every tab switch, so today a tag typed less than 400 ms before a switch is lost.
- The input stays in sync with `tasksStore.sectionTag` (seed it again when the store changes from outside, such as 108's Clear), so the box never shows a tag the list is not using.

Hints stay as `title=`. Fact: a bits-ui Tooltip throws without a `Tooltip.Provider` ancestor, and `title=` is the dominant convention (V3 "Refuted" 1).

Width budget (opinion): title, count, 3 buttons, toggle, a 7 rem input and the spinner fit in about 640 px. Below that, the root's `@container` (added in P3, reused by 109) hides the count (`@max-[640px]:hidden`) and drops the toggle's text label (icon only, with its `aria-label`). The title truncates last. An e2e viewport test at 560 px checks that nothing overflows.

### 4.3 Rows and checkbox consistency (P2, P5, P6a)

- **Hit target and focus:** the toggle button becomes `size-6 grid place-items-center rounded-sm`, holding the `size-4` glyph. It gets `focus-visible:ring-2 focus-visible:ring-ring/50`, the NoteRow ring (`NoteRow.svelte:70`; V6 rec 7). Today it is a bare button with no ring (`TasksView.svelte:177-187`).
- **Shape:** keep circles. Fact: Issue 109's glyph table and the calendar chip use lucide circles (V5 rec 5). The editor checkbox is an 18 px rounded square (`live-preview/styles.ts:231-260`), so 2 of 4 task surfaces use circles (V3 "Refuted" 4). Opinion: circles carry 7 statuses with distinct glyphs, and a square checkbox has no room for that. Whether to unify with the editor is owner question Q2. The editor cannot render the extended statuses at all today (V9 "Refuted" Scout 17 item 2), so it is the outlier for status, though not for shape.
- **Colors:** glyph tone on the icon only, from 109's table (`text-muted-foreground`, `text-primary`, `text-success`, `text-warning`, `text-destructive`). Those meet the 3:1 non-text guideline. Fact: `warning` and `destructive` are not guaranteed text pairs on card or editor (V9 "Refuted" Scout 18 item 1, rec 4), so chip text stays `text-muted-foreground`, except the overdue due chip that 109 already sets to `text-destructive`. Do not use `--lp-task-border` for the idle ring: it is about 1.6:1 in Lavender Haze (V9 "Missed" 6).
- **Closed styling (P5 = 110):** strike-through and muting follow `!isTaskOpen(status)`, not `checked`.
- **Clean text (P6b = 109):** use `taskDisplayText`, never `metadata.description` directly. The Rust tag strip breaks `[[Note#Heading]]` and URL fragments (V1 "Refuted" 8; V3 "Refuted" 2). Proposed amendment to 109: also drop a trailing `^blockid` (V6 "Missed" 5) and never show the `🆔 td-` anchor (V1 "Missed" 9). The toggle keeps sending raw `task.text` (V9 "Missed" 3).
- **Indent:** keep the inline `padding-left` (`:175`), with the multiplier unchanged. Opinion: indentation is information, not polish.

### 4.4 Counts

- Toolbar: `N open in M notes` after P5. Before P5, `N tasks in M notes`, the same words as today with "files" renamed "notes". When hide-completed is off: `N open, K done in M notes`. Fact: `computeTaskStats` already returns `completed` and `pending` (`tasks.logic.ts:91-113`) and the view shows neither (`TasksView.svelte:144-146`).
- Group header: the visible row count, right-aligned. With hide-completed off and after P5, it shows `open/total` (for example `2/5`).

### 4.5 Empty, loading and error states

- Loading: 108's rule ("Indexing tasks..." only while the store has no groups yet).
- Empty: 108's `explainEmptyTasks` copy and actions, rendered as a centered muted `ListChecks` icon, the message in `text-meta`, and an outline `Button size="sm"`. Use `EmptyState` if 204 has landed (108 Notes).
- Error: a fetch failure shows nothing today (`tasks.service.ts:81-83`), against CLAUDE.md § Error Handling / Components. No Issue covers this. See owner question Q7 on whether it belongs in polish. A minimal version adds `loadError` to the store and an inline `role="alert"` block in the CollectionView recipe (`CollectionView.svelte:687-693`), or 204's `InlineAlert`. It needs a store getter test.

### 4.6 Stable order (P4)

Fact: PRD A3 (not vetoed) says "files sort by path, not mtime, so groups stop moving after each save" (PRD:123). Today that sits inside 112's grouping work. Polish-first pulls only the sort forward:
- a pure `sortGroupsByPath(groups, vaultPath)` in `tasks.logic.ts`, ordering by `vaultRelativeKey(vaultPath, filePath) ?? filePath` (`#lib/utils/path.js:120`);
- the view's `filteredGroups` derived calls it.

No Rust change: both IPCs keep their mtime sort, and the client re-sorts (V2 "Missed": "any other sort is a client-side choice"). The header date stays as information. 112 later replaces this with `groupTaskRows`'s note grouping, which uses the same rule.

## 5. Rust/IPC vs frontend

| Slice | Rust | IPC/DTO | Frontend |
|---|---|---|---|
| P0 to P6b | none | none | all |

Facts behind "none": metadata already reaches the store (`tasks.service.ts:20-48`). Status semantics live in TS (`task-status.logic.ts`). Sorting is client-side. The toggle IPC is unchanged. Every slice therefore runs the frontend gate (`pnpm check` + `pnpm vitest run`), plus `bash scripts/e2e.sh` where the toolbar or row markup the spec reads changes (P3, P5, P6a, P6b). No `package.json` change, so no `pnpm build` unless 198's own gate applies. No shadcn primitive is generated: Button, Input-style classes and ScrollArea exist (V3 rec 7), which keeps ADR-0002 intact with no CLI supply-chain step (V3 "Missed" 8).

Rule compliance:
- Layers: no `features -> plugins` import, so Kanban's `getDateProximity` is not reused (V3 "Refuted" 3; V9 "Missed" 5). No `tasks -> event-calendar` import, which would form a cycle with 110's `event-calendar -> tasks` edge (V5 "Refuted" 2).
- ADR-0033: no rail item. Tasks stays a singleton editor tab (V4 rec 1).
- Store and getter pattern: no slice adds a computed getter, except the optional error slice (`loadError`, a plain getter with a store test). P4's sort lives in a `.logic.ts` and is called from the view's `$derived`.
- Indexing rule 2: the `$effect` + `untrack(buildTaskIndex)` on `vaultIndexVersion` stays (`TasksView.svelte:73-78`). The immediate refetch in `afterTaskWrite` stays, because it is pinned by `tasks.service.test.ts:277` (V7 "Refuted" Scout 14 item 4).

## 6. Vertical slices

Each slice is one Issue and one delivery, testable on its own. TasksView Issues run in series because they share one file (`priority-2026-11-08.md:60`).

### P0 (prefactor): stable test hooks for the Tasks view
- **What:** add `data-task-toggle` on the circle button and `data-task-text` on the text span. Rewrite the positional selectors in `TasksView.test.ts`: the first `[data-task-row] span` at `:96`, the first button at `:133`, and the `svg circle` presence check at `:145,157`, which becomes a `data-status` attribute on the toggle. Add a shared task fixture builder under `src/tests/fixtures/` that replaces the duplicated `group()` in `TasksView.test.ts:34-48` and `tasks.service.test.ts:45-59`, with metadata and all 7 statuses.
- **Demo:** none visible. Every later row change can then add elements without silently retargeting tests (V1 "Missed" 5; V7 rec 3-4; V9 "Missed" 8).
- **Tests:** existing assertions keep their meaning. No assertion is weakened (CLAUDE.md never-weaken rule).
- **Blocked by:** none.

### P1 = Issue 108 (as written, line refs refreshed)
- **Demo:** tick a task. The list stays and a spinner shows. The rule sentence explains `#to-list`. The empty state names its cause, with Clear.
- **Blocked by:** none (P0 recommended first, not required).

### P2 (new): surface, type roles and group header
- **What:** everything in §4.1 and the row hit target and focus ring from §4.3. Also:
  - the TasksView `text-purple-400` swap, carved out of 198;
  - the folder path subtitle;
  - the locale-free `MMM D` date via `#lib/utils/date.js`;
  - the right-aligned count;
  - the group divider.
- **Demo:** the view matches the editor surface in Lavender Haze. Headers read name, folder, date and count. Rows use the chrome type roles.
- **Tests (failing first), `TasksView.test.ts` with real stores and the clock faked:**
  - a note at `Projects/Clients/ACME.md` renders the name `ACME`, the folder `Projects/Clients` and the count `2`;
  - a header date in the current year has no year, and one from last year shows it;
  - the toggle button exposes a focusable control with an accessible name (already true; kept).
  - Pure class swaps such as the background and the type roles are covered by the commit body's by-eye check in both themes. Per CLAUDE.md rule 11, only a CSS-only fix may take `Test-Exempt`, and this slice has testable behavior (subtitle, date rule), so it ships with tests.
- **Also:** amend 198 to drop the TasksView site from its list (its future guard test still covers the file).
- **Blocked by:** P0, P1 (P1 for file serialization and because P1 rewrites the body's empty and loading block that P2 restyles).

### P3 (new): toolbar with title, count and accessible controls
- **What:** §4.2: title and count, `aria-pressed` Button group, labeled hide toggle, tag box without the duplicate `#` and with a clear button, `@container` root with the narrow rules, debounce flushed on destroy, input synced from the store.
- **Demo:** the toolbar reads as a header. Keyboard focus is visible on every control. Typing a tag and switching tabs at once keeps it.
- **Tests:**
  - `TasksView.test.ts`: pressing "7 days" sets `aria-pressed="true"` on it and `false` on the others, and `tasksStore.dateFilter` is `last7days`;
  - the hide toggle's `aria-pressed` follows the store;
  - with fake timers, type a tag, unmount before 400 ms, and assert `get_tasks_in_section_v2` was invoked with the new tag;
  - after 108's Clear, the textbox value is `''`;
  - the count reads `N tasks in M notes`.
  - E2E: the existing spec passes unchanged (textbox name and `title*="completed"` kept), and one new narrow-viewport test at 560 px asserts that the toolbar does not overflow (`scrollWidth <= clientWidth` on the toolbar).
- **Docs:** `help/documentation/10-tasks-and-todoist.md:97-103` (the Filters table labels).
- **Blocked by:** P1 (spinner placement and Clear handler). Serialize after P2.

### P4 (new, pulled from 112): groups stop moving
- **What:** §4.6.
- **Demo:** tick a task in the fifth note. Its group stays where it was.
- **Tests:**
  - `tasks.logic.test.ts`: `sortGroupsByPath` orders by relative path whatever the `modifiedAt`, and handles a file outside the vault path (falls back to `filePath`) and an empty list;
  - `TasksView.test.ts`: after a toggle, the refetch returns the toggled note first by mtime, and it still renders in its path position.
- **Docs:** the help guide's sentence on file grouping order (PRD A12; V10 "Refuted" 2 confirms it is mtime today).
- **Also:** amend 112 so that `groupTaskRows`'s Note grouping replaces `sortGroupsByPath`, deleting it once nothing calls it.
- **Blocked by:** none logically. Serialize after P3.

### P5 = Issue 110 (open/closed rule), plus counts
- **What:** as written. Add §4.4's `open` wording in the toolbar count and the `open/total` header count when hide-completed is off.
- **Demo:** `[/]` and `[!]` tasks are listed by default, not struck through. Counts say "open".
- **Blocked by:** P4 (re-pointed from 109, see §7).

### P6a (split from 109): status glyphs
- **What:** `statusGlyph` and the 7-icon map, tone classes, labels `Mark task as done (<word>)`, all on the P2 hit target.
- **Demo:** each status has its own glyph. Done is `text-success`, important `text-destructive`.
- **Tests:** 109's `statusGlyph` table and label cases. P0's `data-status` hook replaces the `svg circle` check. E2E runs because the toggle name changes (substring match still holds, V6 "Refuted" Scout 12 item 4).
- **Blocked by:** P5, P0.

### P6b (split from 109): clean text and chips
- **What:** `taskDisplayText` (with §4.3's block-id and anchor amendment) and `taskChips`, at `text-label` size in NoteRow pill shape (copy the shape, not `text-[11px]`, V9 "Refuted" Scout 18 item 8).
- **Demo:** "Send invoice [Nov 3] [high] [#work]" instead of the emoji line.
- **Tests:** 109's checklist, plus `taskDisplayText` drops a trailing `^abc` and a `🆔 td-x` token on the raw-text fallback path.
- **Blocked by:** P6a.

### Optional P7: inline fetch error
§4.5. Store `loadError` with getter and store test. View shows an alert with Retry. Gated on Q7.

### Optional P8: scroll survives tab switches
`tasksStore` keeps `scrollTop` (store state, because the view remounts, V4 rec 8). It is restored after the first render. Gated on Q8.

### Blocking graph

```
P0 ----+------------------------+
       |                        |
P1 ----+--> P2 --> P3 --> P4 --> P5 (=110) --> P6a --> P6b
                                               ^
P0 --------------------------------------------+
P7, P8: after P1, any time, serialized with the TasksView group
198 (minus the TasksView site): still blocked by 151, independent
111 -> 112 -> 113: after P6b, unchanged except 112 reuses P4's rule
```

## 7. Changes this proposal asks for in existing Issues

1. **108:** refresh line refs only.
2. **109:** split into P6a and P6b. Re-point the blocker from 108 to P5 (110) so tones land on a correct open rule. Add the block-id and anchor strip.
3. **110:** today it is blocked by 109. Re-point it to P4. Opinion: correctness of the closed style should precede the glyph colors, and 110's `toggleTarget` rewrite does not depend on 109's table. Whether the original order had a reason not written in the Issue is triage question Q9.
4. **112:** reuse P4's path sort.
5. **198:** drop the TasksView site.
6. **227, 111, 113:** no change. Their help-text and selector notes stay valid.

## 8. Questions only the owner can answer

1. **Q1. Scope of "polish".** Does polish include the three feel fixes (mounted list 108, stable order P4, open rule 110), or only visuals? This proposal assumes yes, because a pretty list that blinks and jumps still feels broken.
2. **Q2. Checkbox shape.** Keep circles per status (109, calendar), or move to the editor's rounded square? Squares would need a different way to show 7 statuses.
3. **Q3. Group order.** Path order (PRD A3, not vetoed) loses "recently edited first". Keep A3, or keep mtime order but freeze it during a session?
4. **Q4. File icon in group headers.** Yes, through the file-icons resolver (adds a `tasks -> file-icons` feature pair), or name only?
5. **Q5. A just-ticked task.** With hide-completed on, it vanishes at the next refetch (`tasks.service.ts:178`; V10 "Missed" 2). Should it stay dimmed until the next manual refresh? This is a behavior change.
6. **Q6. Toolbar density.** Is a labeled "Hide completed" button acceptable, or should it stay icon only? A label costs about 110 px of a row that cannot wrap.
7. **Q7. Fetch errors.** Ship the inline error (P7) as part of polish? CLAUDE.md asks for user-visible errors, but it adds store state.
8. **Q8. Scroll position.** Should it survive a tab switch (P8)?
9. **Q9. Order of 109 and 110.** May 110 run before 109's glyph table (§7 item 3)?
10. **Q10. `#to-list` default.** Still decided as B1 (a) "All open plus a seeded To list view" (Issue 124). Polish keeps today's default and makes it visible (108's sentence), not changed. Confirm nothing more is wanted before 124.

## 9. Not checked

Nothing was rendered, so the toolbar width budget (about 640 px), whether `position: sticky` works inside the bits-ui ScrollArea viewport (not proposed for that reason), and real contrast all come from code reading and the V9 hand calculations. I read the archived PRD only at the sections cited and did not open `mockup.html`. Issues 111 to 113 were read only for their interfaces with these slices.
