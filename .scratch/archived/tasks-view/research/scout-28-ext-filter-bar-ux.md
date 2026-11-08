# Scout 28: ext-filter-bar-ux

Recovered from the workflow journal: the agent's Write was refused, so this is its returned text.

Summary (120 words max): Linear, GitHub Projects and Asana were verified against their own docs. Height could not be verified: its official pages were not reached, and its review page returned 403. I did not write the .md file, because the subagent rules bar report files, so the full findings are below. Main lessons for the Tasks view: keep "filter" and "display" (group, sub-group, sort) as separate controls; use `field:value` tokens with `-` negation and comma-OR, shown as chips; save views as tabs with an unsaved-changes dot. Linear's docs contradict themselves on sub-grouping, and GitHub's docs don't say which layouts take which options.

## Facts

**Linear: display options** (https://linear.app/docs/display-options)
- Layout toggle list/board, shortcut `Cmd/Ctrl B`.
- Grouping options: status, assignee, project, priority, cycle, label, parent issue, team, customer, release, SLA status, no grouping, and Focus. Focus applies only to My Issues.
- "Sub-grouping is available in lists and boards (as rows)." The same page also says "Parent issue grouping and sub-grouping are available only in board layout." These two statements conflict.
- "Show empty groups" toggle exists.
- Ordering: Status, Manual, Priority, Last created, Last updated, Due date, Link count. Reverse is allowed except when sorting manually.
- Triage and Inbox allow ordering only, not grouping.
- Project views: group by lead, member, status, health, start date, target date, and initiative.
- The page never mentions hiding columns.

**Linear: filters** (https://linear.app/docs/filters)
- Stacked filters narrow results (AND, implied).
- Multiple values in one filter switch the operator to "is either of", which is OR.
- "Advanced filter" groups conditions "with AND/OR logic (including nested filter groups)".
- Negation: "is not", "neither", "none", "does not include".
- "the filter type cannot be changed" once set.
- Only "main filters" go into the URL. View options and quick filters are excluded.
- Keyboard shortcut `F` opens the filter menu.
- Natural-language AI filtering exists.
- "Filters refine existing views and create custom views."

**Linear: sub-grouping example** (from a search snippet, not fetched): grouping by assignee, sub-grouped by status, in the current cycle (https://linear.app/changelog/page/6).

**GitHub Projects: filtering** (https://docs.github.com/en/issues/planning-and-tracking-with-projects/customizing-views-in-your-project/filtering-projects)
- Multiple fields combine with AND: "Your view will show items that match all filters."
- Comma-separated values are OR: `label:bug,support`.
- Repeating a qualifier is AND: `assignee:octocat assignee:stevecat`.
- Negation by hyphen prefix: `-status:done`, `-priority:1,2`, `-no:assignee`.
- Docs: "Projects does not currently support logical OR filters across multiple fields." A community discussion (https://github.com/orgs/community/discussions/16044) says AND/OR were added in 2026. Not verified.

**GitHub Projects: table layout** (https://docs.github.com/en/issues/planning-and-tracking-with-projects/customizing-views-in-your-project/customizing-the-table-layout)
- "You cannot group by title, labels, reviewers, or linked pull requests."
- Secondary sort: click another field. Clicking a field again flips its direction.
- In table and roadmap layouts, group headers show field sums.

**GitHub Projects: views** (https://docs.github.com/en/issues/planning-and-tracking-with-projects/customizing-views-in-your-project/managing-your-views)
- New views save automatically.
- Edits need View menu, then "Save changes".
- A dot next to the view name marks unsaved changes.
- Duplicate view is available. Tabs can be dragged to reorder.
- The docs do not state a view limit or which layouts support which options.

**GitHub REST views** (https://docs.github.com/en/rest/projects/views, from search snippet): fields `layout`, `filter` (query string), `sort_by` (list of [field, asc|desc]), `group_by` (single field), `vertical_group_by`.

**Asana: Advanced Search** (https://asana.com/resources/asana-tips-advanced-search-reporting)
- Filters are added through an "Add filter" menu, grouped under People, More, and Add Custom Field.
- A search can be saved as a report in the left nav, which auto-refreshes.
- The article never describes AND/OR combination.
- Forum threads claim no OR support (https://forum.asana.com/t/or-in-advanced-search/58912). These are old and unverified.
- Asana rules were not researched. The search returned nothing on rule conditions.

**Height** (unverified; search snippets only)
- Snippets say Height supports AND, OR, NOT and parentheses in filters, "Smart Lists" for saved queries, and "section by" on any attribute, custom attributes included.
- Sources: https://freshvanroot.com/blog/height-app-review/ (403, not fetched), https://height.app/product/features (fetch failed).
- A snippet also suggests Height may be shutting down. Not checked.

## Problems and gaps

- Linear's sub-grouping rule contradicts itself on the same page. Do not copy it as a spec without checking the app.
- GitHub's docs do not say which layouts support which options. GitHub's OR status is contradictory across its docs and community posts.
- Grouping by fields such as title or labels is blocked in GitHub. Expect the same limits in a Tasks view.
- Asana's old OR limits come from forum threads of several years ago. Treat them as stale until checked.
- For this review, what the Tasks view needs is not in these sources: a "rules for which notes/tasks are sourced" language, and Todoist send state as a filter field.

## Ideas worth keeping

- Split controls into two popovers, as Linear and GitHub do: Filter (what appears) and Display (group, sub-group, sort, reverse, show empty groups). Keep the current filter bar's date chips inside Filter.
- Give each filter a text form: `field:value`, comma for OR, `-field:value` for NOT, `no:field` for missing. Render it as removable chips too. This keeps a narrow pane usable from the keyboard.
- Use Linear's shortcut `F` to open the filter menu.
- Saved views as tabs, with an unsaved-changes dot, a Save changes action, Duplicate view, and drag-to-reorder. Store the view definition as a query string in the `.view` file, the way GitHub's REST API does.
- Sub-grouping with sticky group headers, as in Linear's list and board views.
- Reserve nested AND/OR groups for an advanced mode, after the flat chip form.

## Open questions

- Does the owner need OR across different fields, or only OR within one field? The second is the simpler case.
- Are NOT filters needed, for example "exclude tasks already sent to Todoist"?
- Should views show empty groups?
- Should Todoist sync state be a filter field, and sync scope a per-view setting?
- In a narrow pane, do chips wrap or collapse into a single "Filters (3)" button?
- Confirm whether Height is still operating before using it as a reference.
