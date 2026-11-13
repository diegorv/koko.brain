# Scout 01: current UI audit of TasksView

Scope: `src/lib/features/tasks/TasksView.svelte` (223 lines) and what it reads. Read-only audit, nothing was run. Facts are verified in code; opinions are marked as such.

## Summary

The view is a single flat list of per-file groups with a three-part toolbar. It ignores most of the data the Rust index already returns (due/scheduled dates, priority, tags, 7 statuses), uses raw Tailwind sizes and one hardcoded color instead of the app's chrome type scale and tokens, and shows the same empty message for "no tasks in the vault" and "filters hid everything". The biggest functional ugliness is that every refetch swaps the whole list for "Indexing tasks..." (flicker and lost scroll after each toggle or save). The cheapest wins are token cleanup, a real toolbar layout, an honest empty state, and not unmounting the list while refetching; the larger wins need new slices (metadata chips, grouping, status glyphs).

## Facts (verified in code)

### Layout and structure
- Root is `flex h-full flex-col bg-card` (TasksView.svelte:90). Mounted inside a `bg-editor-bg` wrapper (src/lib/app/EditorView.svelte:70-73). `--card` and `--editor-bg` are equal in both light (src/app.css:155, 187) and dark (216, 251) today, so no visible seam, but the two tokens are independent. CollectionView also uses `bg-card` (CollectionView.svelte:501).
- Toolbar uses the shared `pane-toolbar` utility: `flex h-10 shrink-0 items-center gap-1 px-3 border-b border-divider` (src/app.css:148-150). Its contract says a site adds no height, padding, gap or border of its own; TasksView complies.
- Inside the toolbar are three sibling `div.flex.gap-1` groups (TasksView.svelte:93, 107, 124): date pills, eye toggle, section-tag input. No `ml-auto`, no spacer, no divider: everything is left-packed with only `gap-1` (4px) between groups, so the eye toggle sits glued to the "Last 30 days" pill and the tag input glued to the eye.
- Content is `ScrollArea` > `div.p-4` (137-138), full width, no max-width. On a wide pane the task text and the file header stretch to the far edge while the count/date metadata sits next to the file name on the left; long lines of text have no measure limit.
- Groups: `space-y-6` between files (148), `space-y-1` between rows (168). No card, no divider, no sticky header, no collapse.

### Typography
- The app defines a chrome type scale: `text-label` 11px, `text-meta` 12px, `text-rail` 13px, `text-row` 14px, `text-title` 15px semibold, and a `section-label` utility (src/app.css:76-106, 135-138). The comment says to use these instead of raw sizes.
- TasksView uses only `text-xs` (pills 96-99, input 131, stats 144, date and count 159-163) and `text-sm` (empty/loading 140/142, file name 154, task text 191). CollectionView and Kanban also use `text-xs`/`text-sm` in places, so this is common debt, but TasksView uses no scale token at all. Equivalent roles: stats/date/count = `text-meta`, task text = `text-row`, file header = `text-title` or `text-rail`.
- File name is `text-sm font-medium` (154) and task text is `text-sm` (191): same size, differing only by weight and color, so hierarchy rests on weight and the purple color alone.

### Color
- Hardcoded: `text-purple-400` on the file-name button (154). It is the only raw palette color in this file. It is a fixed Tailwind shade, not a token, so it does not follow theme presets (`--primary` is `oklch(0.734 0.16 300)` in light, src/app.css:158, a similar purple, so it is near-duplicate of `text-primary`). Elsewhere the app resolves per-file title colors via `resolveIconForPath(path)?.titleColor` (EditorView.svelte:67), which this view does not use.
- Tokens used: `bg-primary/20 text-primary` for active pills and eye toggle (97-98, 110-111), `text-muted-foreground`, `hover:bg-accent`, `hover:bg-accent/50`, `bg-background/50`, `border-border/50`, `text-primary/60`, `text-primary/80`. Status tokens `--success` and `--warning` exist (src/app.css:72-73, 200-201, 274-275) and `--type-red/orange/yellow/green/...` exist (63-71) but are unused here.
- Wikilink and URL links use `text-primary` (199, 208), the same color family as the active pill and the checked circle, so "link", "selected" and "done" all read as one purple.

### Controls
- Date pills: `px-2 py-0.5 text-xs rounded-md` (96); active `bg-primary/20 text-primary`. No border, no `aria-pressed`, no focus-visible style. Labels "All time / Last 7 days / Last 30 days" (25-29).
- The date filter applies to the file's `modifiedAt`, not to any task date (tasks.logic.ts `filterByDate`, lines 90-103; fromV2 multiplies seconds by 1000 at tasks.service.ts:19-23).
- Hide-completed is an icon-only `Eye`/`EyeOff` button (108-121) with a native `title` tooltip (114). The icon shows the next action's opposite in some readings: `EyeOff` is shown when completed are already hidden (116-120), which is state-not-action and ambiguous. `Tooltip` exists in `components/ui` but is not used.
- Section tag: `<input>` `h-6 w-28 ... bg-background/50 border-border/50 text-xs` with a `Hash` icon overlay (124-133), debounced 400 ms (34-40). Other toolbar inputs use `h-7 rounded-xs border-border bg-background` (GraphControls.svelte:81, Kanban 489/501): differing height, radius and border opacity. `w-28` (112px) truncates anything longer than ~14 chars. Placeholder is "section tag" with no label or explanation of what a section tag is.
- Default state is silently filtered: `sectionTag = '#to-list'` and `hideCompleted = true` (tasks.store.svelte.ts:9, 11, 29-31). A user who opens the view for the first time is looking at only unchecked tasks under headings containing `#to-list`, with no indicator other than the input value.

### Rows
- Row: `flex items-start gap-2 w-full group rounded-md px-1 py-0.5 hover:bg-accent/50` with inline `style="padding-left: {indent*1.25+0.25}rem"` (172-176). The inline style also overrides `px-1`'s left padding. Indentation is whitespace only; no guide line or parent/child connector.
- Toggle: a bare `<button class="shrink-0 mt-0.5 cursor-pointer">` wrapping a 16px icon (177-187). The hit target is 16x16px. `Circle` vs `CircleCheckBig` selected by `toggleTarget(task.status) === 'done'` (171, 182-186). Done icon is `text-primary/60`, open is `text-muted-foreground`, hover `text-primary/80`. No focus ring.
- There are 7 task statuses: todo, done, cancelled, in-progress, question, forwarded, important (src/lib/contracts/generated/TaskStatus.ts:7). The view renders only two glyphs; `in-progress`, `question`, `forwarded`, `important`, `cancelled` all fall into "checked" or "unchecked" via `task.checked` and are indistinguishable from `todo`/`done` (the comment at 170 acknowledges the toggle semantics but there is no status glyph). `line-through` plus muted color for `checked` (191).
- Text span is `flex-1 min-w-0 break-words text-sm cursor-pointer` (191); a click opens the note at the line (64-69). It has `svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions` (189): not keyboard-reachable, no role.
- Task text is the raw line text: Rust sets `text: raw_text.to_string()` (src-tauri/src/vault/parsing.rs:1648, 1665) and metadata is parsed separately by `parse_task_metadata` (parsing.rs:1776). The view renders `task.text` only (194) and never reads `task.metadata`. So any emoji signifiers (due, scheduled, priority, recurrence) and `#tags` in the line show as inline text, and the structured values are thrown away. A grep of TasksView for `metadata`, `priority`, `dueDate` finds nothing.
- Segments loop `{#each parseTaskTextSegments(task.text) as seg}` has no key (194); minor.

### File group header
- `div.flex.items-baseline.gap-2.mb-2` with a button (file name), `({formatDate(modifiedAt)})`, `({count})` (152-165). Date uses `toLocaleDateString('en-US', {year, month:'short', day:'numeric'})` (80-87): hardcoded en-US and always shows the year. Both parenthesised, both `text-xs text-muted-foreground`: two gray parenthesised values side by side are hard to tell apart (is "(3)" a day, a count?).
- Only `fileName` (no folder, no path) is shown (157). Two notes with the same name in different folders are indistinguishable; no title attribute with the path. No `truncate`, so a long name wraps.
- Groups are ordered by `modifiedAt` descending from Rust (src-tauri/src/commands/vault.rs:648-649, 735+), not by task due date or priority. The view applies no sort of its own.
- No collapse, no per-file progress (done/total), no sticky header while scrolling a long group.

### States
- Loading: `tasksStore.isLoading` replaces the entire content with centered "Indexing tasks..." (139-140). `buildTaskIndex` sets `setLoading(true)` at the start of every call (tasks.service.ts:67) and false when the latest call settles (84). It is called on mount, on every `vaultIndexVersion` bump (TasksView.svelte:73-78), on every section-tag change, and after every toggle (`afterTaskWrite` at tasks.service.ts:162, 176-179). So after each click the list unmounts, the scroll position resets (the `ScrollArea` content is rebuilt), and "Indexing tasks..." flashes. Whether it is visible depends on IPC speed; with a non-empty section tag the Rust path re-reads every note with tasks from disk (tasks.service.ts:88-96 comment), which is slower.
- Empty: a single `No tasks found` line (141-142), `text-sm text-muted-foreground text-center py-8`, no icon, no explanation, no action. The same text appears for (a) vault with no tasks, (b) everything done and `hideCompleted` on, (c) section tag matching nothing, (d) date filter excluding everything. With the defaults in the Store (a hidden tag filter plus hide-completed) this is the likely first-run experience.
- Error: `buildTaskIndex` catches errors and only calls `error('TASKS', ...)` (tasks.service.ts:81-83), which logs to console/Sentry/file; the view shows no error state, so a failed IPC looks like "No tasks found" or a stale list. (Project rule: user-facing errors should be toast or inline.)
- Stats line: `{n} tasks in {m} files` (144-146), `text-xs mb-4`. Computed over the filtered groups, includes done tasks when `hideCompleted` is off but never shows done/total or a progress measure even though `computeTaskStats` returns `completed` and `pending` (tasks.logic.ts:106-124). Unused data.

### Interaction and accessibility
- No keyboard navigation of rows (only the toggle button is focusable; the text span is not), no focus-visible styles on any control, no `aria-pressed` on the pill/eye toggles, eye button has `title` but no `aria-label` (108-115).
- Window selection handling in `handleTextClick` (64-69) is good and covered by tests (src/tests/lib/features/tasks/TasksView.test.ts: row-click tests at 101-190).
- Toggle gives no optimistic feedback; the refetch (which flashes the loading text) is what updates the circle.
- No way to add a task, edit text, set a due date, or change status from the view; click goes to the editor.

### Tests that will constrain a redesign
- TasksView.test.ts queries `data-task-row`, the toggle buttons by aria-label ("Mark task as done" / "Mark task as not done") and the text click behaviour (lines 54-190), plus a Todoist-absence test (191-240). A redesign must keep or consciously update those contracts.

## Problems and opportunities (ranked, opinion unless stated)

1. List unmounts on every refetch (fact, 139 + service:67). Fix first: only show the loading state when there is no data yet; keep stale groups while refreshing.
2. Metadata is thrown away (fact). Due date, scheduled, priority, recurrence, tags are parsed in Rust and never shown; the raw emoji text is shown instead. This is the largest cause of "simple".
3. Silent default filters and one empty message (fact). Users cannot tell why the list is short or empty.
4. Toolbar is a left-packed row of unlike controls (fact), with a cryptic "section tag" input, no labels, no counts on the pills, and an icon-only eye toggle.
5. Hierarchy is weak (opinion on facts): same font size for header and task, purple fixed color, parenthesised gray metadata, no per-file progress, no visual grouping beyond 24px of whitespace.
6. Hardcoded `text-purple-400` and raw `text-xs/text-sm` ignore the token system (fact); inconsistent input chrome versus other views (fact).
7. Status model flattened to two icons (fact); 16px hit target; no focus ring.
8. Density: rows are `py-0.5` with `space-y-1` and `text-sm` (about 28px per row), which is fine for a plain list but leaves no room for a secondary line or chips; a richer row needs a deliberate density decision.
9. File-only grouping is ordered by file mtime, which is not a task-relevant order (fact). Users usually want "overdue / today / upcoming / no date" or by priority (opinion).
10. No error state, no keyboard support, `en-US`-only dates (fact).

## Recommendations for the redesign (opinion)

Slices that are independent and shippable alone, in suggested order:

1. Stop flashing: keep existing groups visible while `isLoading` and show a subtle inline indicator; show the full-page loading text only when `fileTaskGroups` is empty and nothing has loaded yet. Test: toggle keeps the list mounted.
2. Token cleanup and header polish: replace `text-purple-400` with a token (`text-primary` or the file's `titleColor`), swap `text-xs/text-sm` for `text-meta/text-row`, show file progress `done/total` instead of two parenthesised values, show the folder path as a muted subtitle or `title`, add `truncate`, relative dates ("2d ago") with the absolute date in `title`.
3. Toolbar rework: a segmented control for the date filter with counts, a labelled "Show completed" toggle (switch component exists in `components/ui`), the section filter as a clear chip/popover ("Section: #to-list" with a clear button) and `ml-auto` for secondary controls; use the same `h-7 rounded-xs border-border bg-background` input chrome as other views; add `aria-pressed`, focus-visible rings.
4. Honest empty and error states: separate copy for "no tasks in vault", "all done", "filters hide N tasks (reset)", and a visible error state for a failed fetch.
5. Rich rows: render `metadata` as chips (due date with overdue/today/upcoming tint using `--warning`/`--destructive`/`--success` tokens, priority marker, recurrence icon, tags) and strip the signifiers from the displayed text. Needs a decision on how to strip raw emoji text (Rust gives `text` raw plus `metadata.description`; check whether `description` is already the cleaned text before building).
6. Status glyphs for all 7 statuses (in-progress, question, forwarded, important, cancelled) with a 20-24px hit target.
7. Grouping and ordering options: group by file (today), by due bucket, or by priority; sorting is a frontend sort or a Rust change (Rust currently sorts by mtime).
8. Keyboard: arrow-key row navigation, Enter opens the note, Space toggles.
9. Stats header: use `computeTaskStats` completed/pending to show `x open, y done` and a thin progress bar.

Constraints to carry into tickets: keep `data-task-row`, the toggle aria-labels and the Todoist-absence assertions (or update the tests in the same slice); follow project rules for tests-first, tabs, `text-*` role tokens, and no store mocking.

## Open questions for the owner

1. Is the `#to-list` default section filter wanted on by default, or should the view start unfiltered with the tag filter as an opt-in chip?
2. Should `hideCompleted` default to true? (Today it hides done tasks, so a fresh view cannot show progress.)
3. Which grouping do you actually want: by file, by due date bucket, by priority, or user-selectable?
4. Do you use the emoji metadata (due, scheduled, priority, recurrence) in your real notes? This decides whether rich chips (item 5) are worth a slice.
5. Should the view allow inline actions (set due date, change priority, add task) or remain read-and-toggle with click-through to the editor?
6. Should the date filter stay on file `modifiedAt` (as is), or change to task due dates? The current semantics are surprising ("Last 7 days" means "notes edited in the last 7 days").
7. Density preference: keep the compact one-line row, or allow a two-line row (text plus metadata chips)?

## Not checked

No rendering, screenshots or contrast measurement were done (read-only, app not run), so visual claims about spacing and glue are inferred from classes, not seen. I did not read `docs/PATTERNS.md`, `docs/TESTING.md` or the indexing-watcher rules; none of these changes touch indexing, but any change to refetch behaviour (recommendation 1) touches `buildTaskIndex` and should be checked against `docs/agents/indexing-watcher-rules.md`.
