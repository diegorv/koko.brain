# Scout 27: external PKM query and filter builders

Scope: visual rule building for Logseq, Tana, Notion, Capacities, Anytype. No repo files read. Claims marked "from memory" were not verified in this session.

## Facts

**Logseq (simple queries, advanced queries)**
- Simple queries are `{{query ...}}` text; `/query` inserts one. Combinators `and`, `or`, `not` nest freely: `(and (task now later) (sort-by created-at desc))`, `(and [[tag2]] (not [[tag1]]))`. Filters: `between` (journal-only, relative dates like `-7d +7d`), `page`, `property`, `task` (several markers), `priority` (several levels), `page-property`, `page-tags`, `all-page-tags`, `sort-by` (`created-at`/`updated-at`, default desc). Whether several top-level filters AND or OR when unwrapped is not stated. https://discuss.logseq.com/t/simple-queries-filters/8697
- Advanced queries are Datalog (`:find`/`:in`/`:where`), with `:rules`; most simple operators exist as rules such as `(task ?b #{"TODO"})`, `(between ?b ?start ?today)`, `(page-ref ?b ?tag)`. A simple query can be passed as `:query` unchanged. https://github.com/logseq/docs/blob/master/pages/Advanced%20Queries.md
- The docs page has a stray `]}` in example 13 and a `:today-end` value that conflicts with the `-end` rule (23:59:59.000 vs .999). Same source.
- DB Query Builder (community, Feb 2026): visual menus that emit advanced-query code to paste. It needs the desktop API enabled (Settings > Features > API) and an API key. Nested groups, live results, and the full filter list are not described. An empty-value filter was added after user request. Output is code, not live. https://discuss.logseq.com/t/introducing-the-logseq-db-query-builder/34794
- Third-party builders: kerim/logseq-db-query-builder (nested filter groups, boolean logic, pastes advanced query) https://github.com/kerim/logseq-db-query-builder ; hdansou/logseq-query-builder (tags and typed property filters, live results, inserts a live query node) https://github.com/hdansou/logseq-query-builder

**Tana (search nodes)**
- Search node = live query; results appear as references. Created by `?` > "Create search node" or the command line "Find nodes". Source: https://outliner.tana.inc/learn/features/search-nodes (redirected from tana.inc/docs/search-nodes)
- The whole query is an implicit AND. Condition types: supertag (`Tag:name`), field conditions (defined, value in list, Set / Not Set / Defined / Not Defined, LT/GT on numbers and dates), structural operators (OR, NOT, LINKS TO, CHILD OF, OWNED BY), and typed keywords (HAS TAG, IS TAG, TODO, DONE, CREATED/EDITED LAST N DAYS, HAS MEDIA, PARENTS DESCENDANTS). Same source.
- PARENT / GRANDPARENT pull in the node one or two levels up. Dot notation reads a field (`PARENT.Description`). Date arithmetic (`PARENT-7`). Inside a supertag template the search adapts per instance. Same source.
- The query builder has a linter that shows the query as plain code, and was "formerly 'search expression'". Same source.
- Searches run only when the node is expanded. Results cap at 2500 nodes; above that the search will not run and asks you to narrow it. Regex is slow, pair it with a narrowing clause. Not Set and Not Defined "will find many nodes". Same source.
- The Filter tab that narrows results (described in Dee Todd's Substack series) is not in the current doc; the series is 2-3 years old, so treat it as unverified for the current version. https://deetodd.substack.com/p/5-tana-live-search-series-working

**Notion (database views)**
- Filter, sort and group live in View settings. Simple filters are one property plus a condition; the official page lists no operators per property type. https://www.notion.com/help/views-filters-and-sorts
- Advanced filters: Filter > Add advanced filter; AND/OR logic in groups; groups nest "up to three layers deep". Convert a simple filter via ••• > Add to advanced filter. Same source.
- Sorts: multiple sorts, order by dragging; select options have a user-defined order. Groups: one property, plus a sub-group layer, Hide empty groups, Remove grouping. Same source.
- "Save for everyone" applies a filter or sort to all users of that view; otherwise it is personal. The page does not say who may use it. Same source.
- Each view keeps its own settings and does not propagate to other views. Same source.
- Third-party notes (MakeUseOf, about 5 years old) say nested filters are limited to three layers; this matches the official page. https://www.makeuseof.com/advanced-database-features-notion-to-use/

**Capacities (queries)**
- Query = "all notes in your space" plus one rule per Filter click; rules narrow results (AND). Categories: object types, collections, tags/backlinks (Any of / All of), search (title, exact term, or meaning; multiple search terms are OR'd), properties (blocks content empty, linked-object and backlink counts, date with end). https://docs.capacities.io/reference/queries
- Inside a properties filter, rows are joined by "and" or "or". No nested bracket groups described. Exclude options exist for object types and tags/backlinks.
- Sort (default none, created-at or property), group by property, limit (optional random subset), show objects / blocks / both. Variables "This object" work only in embedded queries. Same source.
- Saving and reusing named queries is Pro. Filter and sort on dashboards is on every plan. AI can draft a query from a plain-language description, then you edit it by hand. Same source.

**Anytype (Queries, formerly Sets; Advanced Filters)**
- Basic filters: AND for all conditions. Advanced filters add "Add advanced filter" in the filter menu of Grid, List, Gallery, Board. A separate bar shows the logic. https://doc.anytype.io/anytype/features/advanced-filters
- Condition = property + operator + value; operators depend on property format. AND/OR toggle by clicking the label between conditions. Precedence: AND binds tighter than OR, so `A OR B AND C` is `A OR (B AND C)`. Same source.
- Groups: "Turn into group" from the three-dot menu, each group has its own AND/OR, nested groups allowed. The docs give no depth limit. Same source.
- Dynamic values: Current User, This Object (in inline queries), Today (dates). Docs advise putting OR inside groups, and saving complex filters as separate Views. Same source.
- Inline queries can carry view-level filters that change the inline display only and do not alter the source query. https://doc.anytype.io/anytype/features/inline-queries (from search snippet; not fetched)

## Problems and gaps

- Logseq simple queries: unwrapped filter combination is undocumented; the docs teach by example only. The DB builder hides the query language behind code export, so users cannot edit visually after pasting.
- Tana: the query builder is powerful but exposes keywords and structure (implicit AND, PARENT, dot notation) that have to be learned. Results only refresh on expand, and a 2500-node cap blocks broad searches.
- Notion: operators per property type are not on the help page; there is no visible "is this rule shared" model beyond the "Save for everyone" toggle.
- Notion nesting is capped at three layers; any builder for the Tasks view should decide an explicit depth limit up front.
- Capacities: no nested bracket groups in the filter editor (per docs); OR is only available inside property rows.
- Anytype: the three-dot "Turn into group" path is discoverable only by trial; the logic bar is the only overview of the full expression.
- Across all five: filters are tied to a view or query object, so a rule is not portable to a second view without recreation (Notion explicitly; Anytype recommends saving as Views).

## Ideas worth keeping

- Show the logic as a readable bar or plain-text line (Anytype logic bar; Tana linter "as plain code"). This answers "what is this rule actually doing" without a DSL.
- Each filter row = property + operator + value, with operators chosen by property type (Anytype, Notion sorts by type). Keeps the UI honest about what is possible per field.
- Explicit AND/OR toggle between rows, and "Turn into group" to nest (Anytype). Simpler than a full expression editor.
- Convert simple to advanced without losing the rule (Notion: "Add to advanced filter"). Lets users start simple and graduate.
- Sub-grouping as a second layer (Notion) fits "categorize" for tasks (for example, group by source note, then by priority).
- Dynamic variables (Capacities "This object", Anytype "Current User", "This Object"). Maps to "tasks in this project" or "tasks from this note" in a Tasks view.
- Source/scope as a first-class rule: Tana's PARENT and CHILD OF, Logseq's `page` and `page-tags`. Tasks view needs "which notes feed this view" as a filter, which these tools express as a scope condition.
- Save as named view or query; reuse across pages (Capacities Pro, Anytype Views). Saving rules as named presets matches "create specific rules".
- Dual mode: Logseq's pattern of a visual builder that emits query text (kerim, hdansou, DB builder) and the Tana linter showing the query as code. Visual by default, with the expression visible and editable as text.
- Live result count while building (from memory: not confirmed in the pages read; Notion and Capacities show the view updating as filters change).
- Limit and random subset (Capacities): useful for resurfacing tasks without listing everything.

## Open questions

- Logseq simple queries: do multiple top-level filters AND or OR when not wrapped? Needs a test in the app or a source read (not done here).
- Tana Filter tab: does the current version have a post-search Filter tab? The fetched doc did not mention one.
- Notion "Save for everyone": who may use it, and is it limited by permission level? Not stated on the help page.
- Capacities: does the filter editor now support nested groups? The fetched docs describe only flat rows plus property-row and/or.
- Anytype inline query view-level filters: confirm from the fetched page, since only the search snippet was seen.
- For the Tasks view, which rules are needed by the owner (scope by note, by tag, by date, by status, by Todoist state)? This research cannot answer it; the owner's workflows decide.
