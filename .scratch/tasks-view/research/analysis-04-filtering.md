# Analysis 04: filtering

Recovered from the workflow journal: the analyst's Write was refused, so only its structured return survives.

## Headline

The .view expression engine can filter tasks with no engine change, because dotted names like task.due fall through to record.properties (evaluator.ts:174-181, methods.logic.ts:276-285), so I recommend reusing it with the existing visual builder (Option A). The harness refused to write the analysis file, so it does not exist at the path above and the full analysis is in the text response.

## Candidate issues

- Export findFilterError and evaluateFilterCached from collection.logic.ts (no behavior change)
- Task record projection and pure filterTaskGroups in features/tasks (task.* keys, note join via collectionStore.propertyIndex, ancestor-context rule)
- Replace dateFilter/hideCompleted with a CollectionFilter rule in tasksStore, plus a TasksView component test
- Quick filter bar: presets (Open, Overdue, Today, Next 7 days, No date, High priority, Todoist state), active-rule summary, N of M count, honest empty states
- Builder reuse: propertyMeta (type, enum options, date input, groups) on FilterRow/FilterPanel, mounted in a Tasks popover, .view output unchanged
- Exact list-membership operator for list-typed filter rows (task.tags and .view tags), keeping old contains() text parseable
- Validate file.* and method names in validateExpression so typos surface instead of matching nothing
- Add a section (ancestor heading text) field to Rust Task so the heading rule becomes an in-memory filter and the per-version disk rescan goes away (Both gate)
- Todoist state fields (todoist.sent, todoist.completed) in the projection with two presets

## Owner questions

- Should in-progress and cancelled tasks show by default? Recommended: hide only done and cancelled; keeping today's behavior is a one-line preset change.
- Should a non-matching parent task stay visible as dimmed context when a child matches? Recommended: yes, with matches counted separately.
- Is #to-list an intended default source rule? Recommended: start with an empty section tag and show an explicit source control; the sourcing analyst owns the final answer.
- Approve moving the section rule in-memory via a Rust Task.section field (Both-gate change)? Recommended: yes, after the store-rule issue ships.
- Switch list-typed filter rows to exact membership, which changes what newly edited .view tag rows write? Recommended: yes; old saved text keeps working.
- Relative dates in the builder: presets plus raw expressions only, or new operators? Recommended: presets and raw first.
- Should the same filters apply to the event calendar? Recommended: no for now; keep the predicate pure so the calendar can opt in later.
- Where should the current rule persist (per-vault file, settings, or .view-style file)? Recommended: leave to the view-model/persistence theme; this theme needs only a serialisable CollectionFilter.
- Want a text-query box (Todoist-style) on top of the builder? Recommended: no; the raw expression row is the text mode.

## Agent note on file

.scratch/tasks-view/research/analysis-04-filtering.md
