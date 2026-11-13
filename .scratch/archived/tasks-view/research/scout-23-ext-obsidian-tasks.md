# Scout 23: ext-obsidian-tasks

Recovered from the workflow journal: the agent's Write was refused, so this is its returned text.

I did not write the file. The agent instructions say not to write report .md files and to return findings in the final message, so the findings are below. Facts come from WebFetch summaries of the pages, not verbatim quotes. Some URLs under publish.obsidian.md/tasks/Reference and Getting Started returned 404, so I could not verify those pages directly. Nothing was read in the repo or run.

## Facts

**Query model**
- Queries are written in a `tasks` code block, one instruction per line; lines are implicitly ANDed. An empty block returns every task, and the page warns this is "probably not what you want." Default sort is status, due, then path. https://publish.obsidian.md/tasks/Queries/About+Queries
- Assembly order: Global Query, then Query File Defaults, then the block's own source. `ignore global query` drops the global query. Later layout instructions override earlier ones. Same URL.
- Case-insensitive since 5.2.0, except boolean operators, regex and code. Debug with `explain`. Same URL.

**Filters** (https://raw.githubusercontent.com/obsidian-tasks-group/obsidian-tasks/main/docs/Queries/Filters.md, fetched via a small-model summary)
- Boolean: `AND`, `OR`, `NOT`, `AND NOT`, `OR NOT`, `XOR`. Each sub-filter is wrapped in one delimiter type per line: `()`, `[]`, `{}` or `""`. Precedence is NOT, XOR, AND, OR. Long expressions use a trailing `\`. Source: https://publish.obsidian.md/tasks/Queries/Combining+Filters
- Pitfalls: chained `XOR` with 3 or more terms does not mean "exactly one." Mixing delimiters errors ("All filters in a Boolean instruction must be inside one of these pairs…"). `malformed boolean query -- Invalid token` happens when a value ends with the closing delimiter, e.g. `(description includes (maybe))`.
- Path, root, folder, filename, heading (includes or regex). Tags (`tags include`, regex). Description. Status: `done`, `status.name includes`, `status.type is TODO|DONE|IN_PROGRESS|ON_HOLD|CANCELLED|NON_TASK`. Dependencies: `is blocking`, `is blocked`, `has id`, `has depends on`.
- Dates (due, done, scheduled, start, created, cancelled, happens): `has/no X date`, `X on|before|after <date>`, date ranges, `date is invalid`.
- Priority: `priority is above|below|not <level>`. Also `is recurring`, `recurrence includes`, `exclude sub-items`, `filter by function`. Source: same Filters URL.

**Sorting** (https://publish.obsidian.md/tasks/Queries/Sorting)
- Built-in keys: status, status.name, status.type, id, done, due, scheduled, start, created, cancelled, happens, description, priority, urgency, recurring, tag N, random, path, filename, heading. Any key takes `reverse`. `sort by function <expr>` is supported.
- Five default sorts are always appended after the user's sorts: status.type, urgency, due, priority, path. They can't be disabled, but user sorts take precedence.

**Grouping** (https://publish.obsidian.md/tasks/Queries/Grouping)
- Built-in: status, status.name, status.type, id, due, done, scheduled, start, created, cancelled, happens, priority, urgency, recurring, recurrence, tags, path, root, folder, filename, backlink, heading. `reverse` works per key.
- `group by function`: many variants, including a date-category function (Overdue, Today, Future, Undated). Nested groups: each extra line is a level. Headings: h4, h5, then h6.
- `show group count` / `hide group count` (8.4.0+). Grouping does not change which tasks appear. Order is filter, sort, limit, group, `limit groups`. A task with several tags appears under each tag.

**Layout** (https://publish.obsidian.md/tasks/Queries/Layout)
- `hide` / `show` for id, depends on, priority, the date fields, recurrence rule, on completion, tags, toolbar, tree (default hidden), edit button, postpone button, backlink, nested backlink, urgency (default hidden), task count, group count (default hidden).
- `full mode` (default) and `short mode` (emoji only, dates on hover). No `responsive` instruction.
- `show tree` shows children whether or not they match the query.
- Task count placement is a global setting (Top or Bottom), not a query line.

**Presets and file defaults**
- Presets (7.20.0): named instruction bundles in settings. Called as `preset NAME` (whole lines only) or `{{preset.NAME}}` (usable inside boolean expressions and partial lines). Presets can nest. Built-ins include `this_file`, `this_folder`, `this_root`, `hide_date_fields`, `hide_everything`. Source: https://publish.obsidian.md/tasks/Queries/Presets
- Query File Defaults (7.15.0): frontmatter `TQ_*` keys. `TQ_extra_instructions` is a single string (use `|-`). Checkbox keys such as `TQ_short_mode` and `TQ_show_tree` map to show/hide lines. They apply to every tasks block in the note. Not supported on Canvas cards. Source: https://publish.obsidian.md/tasks/Queries/Query+File+Defaults

**Custom statuses**
- Each status has a symbol, name, next-status symbol (exactly one character), type, and an availableAsCommand flag. Core `[ ]` and `[x]` can't be removed or renamed by symbol. Adding `[/]` and `[-]` needs a theme or snippet that styles them. A "add all unknown statuses" button exists. Tasks 1.23.0 introduced custom statuses. Duplicate symbols are allowed. Sources: https://publish.obsidian.md/tasks/How+To/Set+up+custom+statuses, https://github.com/obsidian-tasks-group/obsidian-tasks/discussions/1530
- Status types: the status.type filter lists six values, including ON_HOLD. The Discussion #1530 build notes list five (TODO, IN_PROGRESS, DONE, CANCELLED, NON_TASK). These don't agree, so treat the type list as unverified. Discussion #1530 also says changing status through the edit modal does not set the done date or spawn the next recurrence. It also says that "done" and "not done" were redefined around status types.
- Scripting properties: `task.status.name`, `.type`, `.symbol`, `.nextSymbol`, `.typeGroupText`, and `task.isDone`.

**Task formats**
- Emoji format is the default. Dataview format uses inline `[key:: value]` fields. Only one format is read at a time. Switching formats drops the other format's signifiers. Issue #1891 tracks this. Obsidian Tasks has no conversion command. Sources: https://publish.obsidian.md/tasks/Reference/Task+Formats/About+Task+Formats (listed in search, not fetched), https://github.com/obsidian-tasks-group/obsidian-tasks/issues/1890

**GitHub issues**
- #3434 (open, priority high, scope: filters, enhancement): unbounded queries freeze Obsidian on vaults with many thousands of tasks. Proposed a default limit of about 300. `_limit` in Query.ts defaults to undefined. https://github.com/obsidian-tasks-group/obsidian-tasks/issues/3434
- #3293 (closed, not planned): querying by custom status name already works via `status.name includes`. Maintainer pointed to Boolean combinations. https://github.com/obsidian-tasks-group/obsidian-tasks/issues/3293
- #3846 (open): running Tasks queries from the Obsidian CLI. https://github.com/obsidian-tasks-group/obsidian-tasks/issues/3846
- #4102 (open, Oct 2026): hide tasks by due time. https://github.com/obsidian-tasks-group/obsidian-tasks/issues/4102
- #2922-era dependency requests #3212, #2727, #2921 are not planned (drag-and-drop dependencies, sort by dependency, click-to-navigate). #2692 is open (popup on ID). https://github.com/obsidian-tasks-group/obsidian-tasks/issues/3212 and related URLs in the search results.

## Problems and gaps (recurring, as far as found)
- Unbounded queries freeze large vaults (#3434). No default cap today.
- Filter syntax is error-prone: delimiter collisions, XOR misuse, and `malformed boolean query` errors with cryptic messages.
- Dataview and emoji formats are mutually exclusive. Users with Dataview workflows lose emoji fields.
- Dependencies are display-only: no navigation, no sort, no diagram, no drag-to-link.
- Forum complaints about the learning curve are indirect. A 2026 comparison guide lists "requires learning custom query syntax" as a downside. https://taskforge.md/blog/obsidian-task-plugins-guide/ I found no direct complaint thread.

## Ideas worth keeping
- Named presets for reuse, plus per-note defaults via frontmatter. Maps to this app's view/collection work.
- Explicit query pipeline (filter, sort, limit, group, limit groups) with an `explain` mode. A "why is this task here" view would help.
- Built-in default sort chain and a stated order of operations.
- Status types separate from status names, so "done" means a type, not a symbol. Useful for the app's Todoist mapping.
- Global query applied everywhere with a per-query opt-out.
- Keep the emoji format but make it swappable; avoid mutually exclusive formats.

## Open questions
- Exact status type list (five or six, whether ON_HOLD is current). Check the Tasks source or Settings > Statuses.
- Whether the built-in "add all unknown statuses" button still exists in current releases.
- Live results of the task-format and custom-status pages (the publish.obsidian.md/tasks/Reference and Getting Started paths returned 404 through the fetch tool).
- Whether #3434's default cap has shipped (issue is still open per the fetch).
