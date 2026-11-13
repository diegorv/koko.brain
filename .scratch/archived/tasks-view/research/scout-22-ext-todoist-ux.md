# Scout 22: Todoist UX for filtering and organizing tasks

Scope: external research only. No repo files were read. Repo claims are out of scope for this scout. Facts are from Todoist help center pages fetched on 2026-11-05 unless marked "from memory" or "search snippet".

## Facts

### Filter query language (TFQL)

Primary: https://www.todoist.com/help/articles/introduction-to-filters-V98wIH (fetched)

- Boolean operators: `|` OR (`today | overdue`), `&` AND (`today & p1`), `!` NOT (`!subtask`), `()` grouping evaluated first (`(today | overdue) & #Work`), `,` makes each query its own list (`date: yesterday, today`).
- Symbols: `%` label (`today & %email`), `#` project, `##` project plus sub-projects or folder (`##Design team`), `/` section (`/Meetings`), `\` escapes special chars and spaces (`#Shopping\ list`, `#One \& Two`), `*` wildcard (`%home*`).
- `@` label prefix still works but the page says it is "planned to be retired by the end of 2026". Use `%`.
- Keywords: `search:`, `subtask`, `date:` / `date before:` / `date after:`, `deadline:` (same forms), `due:` (checks date and deadline; the date wins when both are set), `no date` / `no due date`, `no time`, `overdue` / `over due` / `od`, `no deadline`, `recurring`, `p1`-`p4`, `No priority`, `no labels`, `workspace:`, `created:` / `created before:` / `created after:`, `assigned to:`, `assigned by:`, `assigned`, `shared`, `added by:`, `view all`, `uncompletable`, `All`.
- Relative dates: `today`, `tomorrow`, `3 days`, `next N days`, `-3 days`, `+4 hours`, `next week`, `first day`, `in 7 days`, `today at 2pm`, `1 week after next week`.
- People: email, full name, `me`, `others`.
- Not supported: `assigned to: nobody` (use `!assigned`), comments, completed tasks, parent tasks shown together with sub-tasks.
- Sub-task behavior: in list layout and on mobile a filter shows parent or sub-task, never both. On web and desktop, use board layout and expand the task.
- Results are computed when the filter is opened. Relative-date filters do not update live.
- Renamed projects break filters that reference the old name until edited.
- Multi-word search requires all words to match, in any order.
- Today, Upcoming and Priority are built-in views and cannot be edited with queries.
- Filter count limits: the page does not mention any.
- Filter examples from the page: `%work | %office`, `7 days & %waiting`, `(assigned to: Denise | assigned to: Carol) & (due after: sunday & due before: 8 days after sunday) & %Todoist`.
- The Todoist API accepts the same filter syntax, except comma-separated multiple filters (search snippet, API docs at https://developer.todoist.com/api/v1/; not verified by fetch).

### Filter Assist (AI filter generation)

Primary: https://www.doist.dev/filter-assist/ (fetched)

- Input: plain-English request, e.g. "show me all of my overdue tasks". Output: filter query, a suggested name, and a response ID.
- Example mapping: overdue or today's tasks in "Work" becomes `(today | overdue) & #Work`.
- GPT-4 with few-shot prompting, temperature 0.0 for stable output. Eval: GPT-4 26/27 vs GPT-3.5-turbo 19/27.
- Validation: a rules file of allowed keywords and symbols, training examples that map to `NOT SUPPORTED`, and validation through Doist's Filterist library before returning anything.
- Queries over 1024 characters are rejected outright, not truncated.
- UI: a preview is shown before saving. Users can mark a result useful or not useful, or retry with new wording. The preview was also added to the manual flow.
- The team kept the existing filter modal and added an AI option next to manual creation. An earlier design with buttons and chips was dropped as too complex.
- Availability: Todoist Pro. English and Spanish only (from the filter help page's Filter Assist note).

### Quick Add (natural language task entry)

Primary: https://www.todoist.com/help/articles/use-task-quick-add-in-todoist-va4Lhpzz (fetched)

- Date and time: plain words, e.g. `tomorrow at 4 PM`, `every other Tuesday starting March 3`. No symbol.
- Deadline: `{march 30}` (curly braces).
- Label: `%email`. `@` still works but "planned to be retired by the end of 2026".
- Priority: `p1`, `p2`, `p3` in the help article. Blog and search snippets add `p4`. The article does not say whether p1 is highest. From the search snippets, the in-app convention is p1 highest, p4 none (not verified on the page).
- Reminder: `!14:00`, `!30 min before`.
- Assignee: `+Name`, only in shared projects, so put `#Project` first.
- Project: `#Work`. Section: `#Work /Admin`.
- Description: no token. Use the + icon, or press down arrow on web or desktop.
- Language limits: dates are not supported in Czech or Turkish.
- Smart date recognition can misread words like "monthly". Click the word to turn it back into text, or disable recognition.
- Labels cannot contain spaces (third-party guide, from memory of the search snippet; use `_`).
- Quick Add shortcut: `Q` on desktop, "+ Add task" on the dashboard (search snippet).
- Quick Add has no `No priority` token. Use `p4` in Quick Add. `No priority` works only in filters.

Dates help: https://www.todoist.com/help/articles/introduction-to-dates-and-time-q7VobO (search snippet only, not fetched). Shortcuts: `today` (`tod`), `tomorrow` (`tom`), `jan 27` (`27 jan`, `27/1`). Repeat rules can carry an end date, e.g. "every 3rd Tuesday starting Aug 29 ending in 6 months".

### Views, layouts, grouping and sorting

Primary: https://www.todoist.com/help/articles/customize-views-in-todoist-AoHhBxFdZ (fetched)

- Six layouts: List, Board, Table, Day calendar, Week calendar (3 days on mobile, 7 on desktop), Month calendar (next 30 days).
- Customizable in: projects, labels, filters, Inbox, Today, Upcoming (Upcoming not listed for grouping and filtering). Open "Display" (top right on web and desktop).
- Calendar coloring: by priority by default. "Coloring" can switch to label or project.
- Grouping options: "Date", "Date added", "Deadline", "Priority", "Label" (https://www.todoist.com/help/todoist/features/sort-or-group-tasks-in-todoist-WFWD0hrb, fetched). Other sections mention grouping by project, assignee and workspace, which the official list does not include.
- Sorting options: "Manual", "Name", "Date", "Date added", "Deadline", "Priority". The customize page lists "alphabetically or by assignee, date, deadline, creation date, priority, or project". The two pages differ. Treat the sort-or-group page as the newer source (from memory on which is newer; not verified).
- Calendar layout: no sort or group. Pro and Business users must switch to board or list to sort or group.
- Manual sort: only in projects, Today and Upcoming. Filter and label views always use default order and cannot be reordered manually.
- Any view with grouping applied: no manual drag reordering.
- Sorting happens within each group or section, not across the whole project. Sub-tasks go into the group matching their own date or priority, not their parent's.
- Sorting by Name ignores special characters and logographs (Kanji).
- Sort and group settings are per user, not shared with project members. "Save for everyone" (in Display) makes the current grouping, sorting and filtering the project default. An orange dot marks a view that differs from the default. "Reset all" clears it.
- Filter axes in Display: Assignee, Date, Deadline, Priority, Label, Workspace. The page does not say whether several can combine.
- Table layout: Pro and Business (not Pro Legacy). Web and desktop only. On mobile a table project shows as a list. Today and Upcoming have no Date filter in table layout (sort-or-group page).
- Board: sorting and grouping supported. Group columns can be dates, deadlines, priorities or labels. Upcoming board shows one column per day (sort-or-group page and search snippet). Boards are not available in Upcoming on iOS or Android (search snippet, not verified by fetch).
- Sub-tasks in board: in Today, Upcoming, labels and filters, a sub-task that matches appears both in its parent card and as its own card (search snippet).
- Mobile: Android can add a task under a group only in board layout. iOS hides the add icon for groups by assignee, workspace, date added, the Overdue heading, and empty headings.

### Today and Upcoming

- Smart sort default in Today and Upcoming: date and time (or deadline if no date), then priority, then deadline, then manual order, then creation date (search snippet from the sort-or-group help article; the snippet was not fetched directly, so treat as moderately confident).
- Only tasks with a date appear in Today or Upcoming. A task with no date does not appear in either (search snippet).
- Overdue tasks cannot be manually sorted.
- Dragging a task to the bottom of Today in list layout pushes it to tomorrow, when sort and group are off (search snippet).
- Calendar and Today/Upcoming are a plan-gated mix: calendar layout is Pro and Business only (customize page and filter page).

### Labels

- `%` in Quick Add and filters (above). Labels can be combined with `&`, `|`, `!`, and wildcards (`%home*`).

## Problems and gaps

These are gaps in the Todoist model that the owner's task-view complaint may map onto. They are not repo facts. Repo claims are not verified in this scout.

1. Filter-only expressiveness has to be typed. Todoist's answer was an AI generator (Filter Assist) plus a live preview, not a visual builder. Filter Assist's 1024-character reject is a hard boundary.
2. Relative-date filters are snapshot-computed on open. They do not re-evaluate live. Users who leave a filter open can see stale results.
3. Multi-criteria display controls (assignee, date, deadline, priority, label, workspace) do not state whether they combine. This is a documented ambiguity in the Display settings help page.
4. Sort and group are per-user and do not persist for others. "Save for everyone" is a manual step per view.
5. The grouping option list is inconsistent across help pages (project, assignee, workspace appear in some sections only). Documentation drift.
6. Sub-task double-listing in board for Today, Upcoming, labels and filters. Parent and sub-task display rules differ by layout and platform.
7. Calendar layout is locked out of sort and group. Users must switch layouts to group.
8. Syntax is split: `@` vs `%` for labels, `p1`-`p3` in the article vs `p4` elsewhere, `No priority` only in filters. Quick Add and filter grammars differ.
9. Filter Assist is English and Spanish only, Pro only, and rejects rather than truncates oversize output.
10. Quick Add smart-date recognition misfires on words like "monthly". Recovery is click-to-undo or a settings toggle.
11. Table layout is web and desktop only. Mobile shows a plain list, which loses the data view.
12. Board on mobile: several add-task and grouping gaps listed above.

## Ideas worth keeping

- Filter Assist pattern: natural-language input, returns a query plus a suggested name, shows a preview, offers "useful / not useful" feedback, and rejects unsupported output instead of guessing. Keep a rules file of allowed keywords and a validator, and treat the validator as the source of truth. Source: https://www.doist.dev/filter-assist/
- Query grammar with explicit escaping (`\`) and grouping `()` plus `,` for side-by-side lists. A small, documented grammar is easier to validate than a free-form query.
- Parent/sub-task display rule stated per layout (one or the other in list; both in board). Make the rule explicit in the UI, not implicit.
- Per-view "Save for everyone" with a visible "differs from default" dot. Good pattern for shared configs.
- Preview before save for filters, then a named filter. Source: Filter Assist page above.
- Quick Add token design: plain-language dates, sigils for entities (`#` project, `%` label, `+` person, `/` section, `!` reminder, `{}` deadline). Each sigil is one token class. Useful as a reference grammar for a task-capture box. Source: https://www.todoist.com/help/articles/use-task-quick-add-in-todoist-va4Lhpzz
- Group columns in board by date, deadline, priority or label. Same grouping vocabulary across list and board. Source: https://www.todoist.com/help/todoist/features/sort-or-group-tasks-in-todoist-WFWD0hrb
- Built-in fixed views (Today, Upcoming, Priority) that cannot be edited by query, plus user filters that can. Clear separation between system and user rules.
- Calendar week/month views for dated tasks, with coloring by priority, label or project. Source: customize-views page.

## Open questions

1. Whether Todoist's priority numbering is p1 highest in Quick Add. The article does not say. Verify in the app or in the API docs before copying it.
2. Whether Display filters (assignee, date, priority, label, workspace) combine with AND. The page does not say.
3. The Todoist sort options differ between the customize page and the sort-or-group page. Which is current? Verify in the app.
4. Exact Filter Assist availability: the page says Pro, the help center lists Pro. Verify current plan gating before relying on it.
5. Dates help page and Smart Sort details were from search snippets, not fetched pages. Fetch https://www.todoist.com/help/articles/introduction-to-dates-and-time-q7VobO and the Today-view help page before citing them in the PRD.
6. Whether the Todoist API filter field supports multiple filters (the snippet says no, comma-separated are app-only). Verify at https://developer.todoist.com/api/v1/ before any integration design.

## Sources (fetched)

- https://www.todoist.com/help/articles/introduction-to-filters-V98wIH
- https://www.todoist.com/help/articles/use-task-quick-add-in-todoist-va4Lhpzz
- https://www.todoist.com/help/todoist/features/sort-or-group-tasks-in-todoist-WFWD0hrb
- https://www.todoist.com/help/articles/customize-views-in-todoist-AoHhBxFdZ
- https://www.doist.dev/filter-assist/

Search-only (snippets, not fetched): https://www.todoist.com/help/articles/introduction-to-dates-and-time-q7VobO, https://www.todoist.com/help/todoist/features/default-sorting-order-in-todoist-mqmgerY7, https://www.todoist.com/help/articles/use-the-board-layout-in-todoist-AiAVsyEI, https://www.todoist.com/help/todoist/get-started/plan-your-day-with-the-today-view-UVUXaiSs, https://developer.todoist.com/api/v1/
