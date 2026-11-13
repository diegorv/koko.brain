# Scout 24: ext-dataview-bases

Recovered from the workflow journal: the agent's Write was refused, so this is its returned text.

**Summary (120 words max):** Obsidian Bases cannot query or display individual task checkboxes. It works only on files and their properties, so Kokobrain's task rule builder has no built-in equivalent to borrow. Dataview's TASK queries and the Tasks plugin both model tasks directly. Tasks has a rule DSL with AND/OR/NOT grouping, named presets, and a "filter by function" escape hatch. Its stable task `id` and `dependsOn` fields are an identity model Kokobrain lacks. Community Kanban and board plugins save boards as vault files, which fits `.view` files. I verified the Bases, Dataview and Tasks primary docs by fetching them. The community plugin claims are from search snippets only. I did not write the report file, because my instructions say to return findings directly. The parent can save this text to `.scratch/tasks-view/research/scout-24-ext-dataview-bases.md`.

## Facts

- **Bases layouts:** Table (1.9), Cards (1.9), List (1.10), Kanban (1.14), and Map (1.10, needs the Maps plugin). Every layout is described as "Display files as...". https://obsidian.md/help/bases/views (fetched)
- **Bases filter scopes:** "All views" and "This view". The page does not say how the two combine. Filter groups use "All the following are true" (AND), "Any of the following are true" (OR), and "None of the following are true" (NOT). Same URL (fetched).
- **Bases and tasks:** The page never mentions task list items or checkbox lines. "A base without filters shows all the files in your vault." Same URL (fetched). Bases syntax, formulas, and `summaries:` are documented at https://obsidian.md/help/bases/syntax (search snippet only, not fetched).
- **Dataview TASK queries:** "TASK queries operate at the file.tasks level" and return tasks, not pages. TASK is "the only command in dataview that modifies your original files if interacted with." https://blacksmithgu.github.io/obsidian-dataview/queries/query-types/ (fetched)
- **Dataview inline fields:** `Key:: Value`. For list items, "you always need to use the bracket syntax", for example `- [ ] ... [due:: 2022-04-05]`. https://blacksmithgu.github.io/obsidian-dataview/annotation/add-metadata/ (fetched). The page does not list task implicit fields. It points to "Metadata on Tasks and Lists" for those.
- **Tasks Quick Reference:** instructions are grouped into Filters, Sort, Group, Display, and Scripting. Covers status.type, dependencies, dates, recurrence, urgency, file properties, backlink, `filter by function`, and `short mode`. https://publish.obsidian.md/tasks/Quick+Reference (fetched)
- **Tasks filter by function:** introduced in Tasks 4.2.0. Accessible: task fields, `task.file`, and `query.file` (since 5.1.0). Also `task.id`, `task.dependsOn` (since 6.1.0), and `task.lineNumber` (7.16.0, zero-based). Caveats: string comparisons are case-sensitive, and `return` is required when variables are declared. No built-in urgency filter exists. Float equality on `task.urgency` "will not find any tasks" and needs `> 8.9999`-style bounds. The page has no performance notes. It does not mention `task.file.property`. https://github.com/obsidian-tasks-group/obsidian-tasks/blob/main/docs/Queries/Filters.md (fetched)
- **Tasks presets (7.20.0+):** stored in Tasks settings, not in queries. Each has a name and one or more instruction lines. Invoked with `preset name`, or with `{{preset.name}}` for Boolean combinations. Names have no spaces. A basic `preset` call cannot sit inside a Boolean combination. The page describes no export or sharing. Default presets include `this_file` and `this_folder`. https://publish.obsidian.md/tasks/Queries/Presets (fetched)
- **Tasks global query:** the fetched page did not cover it, so it is unverified.
- **Tasks boolean filters:** AND, OR, NOT, XOR, each filter delimited. https://publish.obsidian.md/tasks/Queries/Combining+Filters (search snippet only)
- **Community kanban and board plugins (search snippets only, not fetched):**
  - Task List Kanban: global saved views across boards. https://community.obsidian.md/plugins/task-list-kanban
  - Tasks Kanban: each board has its own query and columns, using the Tasks parser. https://community.obsidian.md/plugins/tasks-kanban
  - Kanban for Professionals: Saved Views (Due this week, Assigned to me, Overdue, Recurring) are a Pro feature. https://community.obsidian.md/plugins/kanban-pro-boards
  - Task Board: boards saved as vault files, with Kanban, dependency map, list, and table views. https://community.obsidian.md/plugins/task-board
  - dotpm: Table, Gantt, and Kanban views, with saved filter and sort combinations and a starred default. https://community.obsidian.md/plugins/project-manager
  - mgmeyers Kanban: a board is a markdown file. Lanes are `##` headings and cards are `- [ ]` items. The 2.0 betas add list and table views and Tasks autosuggest. The repo now shows `community-archive/obsidian-kanban`, which suggests it is archived. https://github.com/mgmeyers/obsidian-kanban/releases (snippet)
  - A 2024 forum thread says the Kanban plugin cannot build a board from inline tasks in other notes. That claim is unverified for 2.0.

## Problems and gaps

- Bases cannot be the task engine. Task rules need a Kokobrain-owned model over parsed task items, not a Bases `.base` file.
- The Tasks DSL has no OR across different field types without the `filter by function` escape hatch. Users hit float and case-sensitivity bugs there.
- Kokobrain's sync identity (filePath + task text) breaks on edits. Tasks exposes `task.id` and `dependsOn` as stable identifiers.
- Bases' two filter scopes (base-wide and per-view) have no documented combination rule. Kokobrain should define one explicitly.

## Ideas worth keeping

1. Rule builder with Bases-style groups: "All / Any / None" of clauses, each clause a field, operator, and value. Fields: status type, due, scheduled, priority, tags, path, folder, heading, backlink.
2. Two filter levels: source rules (which notes feed the view) and view rules (what the view shows), combined by a stated AND.
3. Named presets that views reference, such as "this file" and "this folder", modeled on Tasks presets and `{{query.file.folder}}`.
4. Keep a raw expression mode as an advanced escape hatch, with warnings for float comparison and case sensitivity.
5. Add a stable task `id` (Tasks pattern) so Todoist sync survives edits.
6. Store task views as `.view` files, the same pattern as Task Board and Bases.

## Open questions

- Does the Bases "All views" plus "This view" combination act as AND? The docs do not say.
- Can Tasks presets be exported or shared? The page is silent.
- Does Tasks' global query feature exist? Not verified.
- Are the Kanban-for-Pro Saved Views and Task List Kanban global views working as described? Only search snippets were read.
- Is the mgmeyers Kanban plugin still maintained, and does the 2024 inline-task limitation still hold? Unverified.
