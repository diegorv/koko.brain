# Scout 08: the section tag filter in the Tasks view

Read-only research. Facts are verified by reading code at the current `main`; opinions are marked as such.

## Summary

The "section tag" box is not a tag filter. It is a case-sensitive substring match against the text of Markdown headings, evaluated in Rust by re-reading every note that has tasks from disk. A task is kept when it sits under a heading (until the next heading of equal or higher level) whose text contains the typed string, with `#` prefixed if missing. The default `#to-list` is a personal convention that hides every task outside such headings, so a new user, or the owner's own fixture vault, sees "No tasks found" with no hint why. The field is not persisted, never validated, gives no feedback on typos or on zero matches, and every call (typing, mount, vault index bump, task toggle) pays a full disk re-read plus a full-list "Indexing tasks..." flash.

A picker of real vault tags (features/tags) is a poor fit as-is: the index tags are note-level, not heading-level, and use first-occurrence casing while the Rust match is case-sensitive. An existing, unimplemented plan in `.scratch/open-itens/` (Issues 108, 115, 116, 121, 123, 124) already replaces this box. The new tickets should reuse or supersede those, not duplicate them.

## Facts (verified in code)

### UI and state

- Default value is `'#to-list'`, in the store and again in `reset()`: `src/lib/features/tasks/tasks.store.svelte.ts:8`, `:30`. Doc comment says "Empty string means all tasks" (`:7`).
- The value lives only in the in-memory store. No settings or vault persistence, so every app start (and every `reset`, which runs on vault change, `tasks.service.ts:227-231`) returns to `#to-list`. Confirmed by Issue 227 in `.scratch/open-itens/issues/227-tasks-help-says-default-view-lists-only.md:5`.
- Toolbar input: `src/lib/features/tasks/TasksView.svelte:124-133`. Plain `<input type="text">`, `placeholder="section tag"`, 28 (`w-28`) wide, a decorative `Hash` icon (`:125`). No label, no `aria-label` (the e2e spec finds it through the placeholder name), no clear button, no suggestions, no helper text, no tooltip.
- Local mirror `sectionTagInput` initialised from the store (`TasksView.svelte:31`), debounced 400 ms (`:32-40`). `onDestroy` clears the timer (`:42-44`), so text typed less than 400 ms before the tab closes is dropped and the store keeps the old tag.
- The rest of the toolbar (date pills, eye toggle) are client-side filters over the already-fetched groups (`TasksView.svelte:46-52`); only the section tag triggers a different IPC.
- The list is replaced by "Indexing tasks..." whenever `isLoading` is true (`TasksView.svelte:139-140`), and `buildTaskIndex` sets loading on every call (`tasks.service.ts:67`). Typing a tag, a vault index bump (`TasksView.svelte:73-78`) and a toggle (`tasks.service.ts:162,178`) all unmount the list, losing scroll position.
- The empty state is one string, "No tasks found" (`TasksView.svelte:141-142`), identical for: no tasks in the vault, tag matches no heading, all tasks completed with hide-completed on, date filter too narrow.

### Service and IPC

- `buildTaskIndex` trims the tag; non-empty calls `get_tasks_in_section_v2`, empty calls `get_all_tasks_v2`: `tasks.service.ts:70-73`.
- `updateSectionTagFilter(tag)` = `setSectionTag` then `buildTaskIndex`: `tasks.service.ts:96-99`. Its doc comment notes the default is non-empty, so mount, version bump and each toggle all pay the section scan.
- Latest-request-wins guard: `tasks.service.ts:55`, `:66`, `:74`, `:82`, `:84`. Rapid typing is safe against stale results.
- Contract: `get_tasks_in_section_v2: { args: { sectionTag: string }; result: FileTaskGroup[] }` at `src/lib/contracts/commands.ts:105-106`.
- Event calendar deliberately uses `get_all_tasks_v2` "without its section-tag filter": `src/lib/features/event-calendar/event-calendar.service.ts:105-119`. Its task set therefore differs from the Tasks view by design.

### Rust matching

- Command: `src-tauri/src/commands/vault.rs:741-758`. Takes candidate notes (those with at least one task in the index, `:677-688`) under a short read lock, then `spawn_blocking` reads each file from disk (`:694-730`). The `VaultIndex` stores no headings, so a disk read is unavoidable today (`:732-736`). A vanished file is logged and skipped (`:705-717`). Output is sorted by `modified_at` descending (`:728`).
- Matcher: `src-tauri/src/vault/parsing.rs:1721-1768`.
  - Empty or whitespace tag falls through to all tasks (`:1722-1724`).
  - Tag gets `#` prefixed if it does not start with one (`:1725-1729`), so `to-list` and `#to-list` are equivalent (test at `:3076`).
  - Heading regex `^(#{1,6})\s+(.*)$` (`parsing.rs:1441-1442`). Match is `heading_text.contains(&tag)` (`:1755`): a raw, case-sensitive substring.
  - A section runs from the matching heading to the next heading with level less than or equal to it (`:1752-1754`). Deeper sub-headings stay in the section (test at `:3067`).
  - Fenced code blocks are skipped for headings and tasks (`:1736-1748`, test `:3085`).
  - Only headings are examined. A `#to-list` tag on a task line or in the note's frontmatter does not match.
- Consequences of the substring rule (derived from the code, not yet run):
  - `#to-list` also matches headings containing `#to-listing`, `#to-list-old`.
  - `#to` matches `#today`, `#todo`. Typing `#` alone (a natural intermediate keystroke, fires after the 400 ms debounce) matches every heading that contains a `#` character anywhere in its text, e.g. `## Notes #foo` or `## C# tips`.
  - `#To-List` does not match `#to-list`, although tags are case-insensitive everywhere else in the app (`src-tauri/src/vault/index.rs:1039-1062` dedupes tag aggregates on lowercase).
  - A multi-tag entry such as `#a #b` is one literal substring, not an OR or AND.
  - A plain word with no `#` ("inbox") is turned into `#inbox`, so it can never match a heading titled "Inbox" without a tag. The box cannot express "section named X".
  - Nested edge: under `## A #to-list` / `### B #to-list` / `### C`, the inner tagged heading resets `section_level` to 3, so `### C` ends the section while still inside `## A`. Already recorded in `.scratch/open-itens/issues/115-fetch-from-entries-snapshot.md:31`.

### Tags feature (for a picker)

- `get_all_tags_v2` returns `TagAggregate { name, count, filePaths }`, one per distinct tag, case-insensitive, name in first-occurrence casing, sorted alphabetically (`src-tauri/src/vault/index.rs:1039-1062`; used by `src/lib/features/tags/tags.service.ts:25-45`, which builds a tree into `tagsStore`).
- Tags come from `extract_tags_strict` = frontmatter tags plus inline `#tags` anywhere in the body (code, HTML comments stripped), per note (`parsing.rs:440-515`). The index does not record which heading, if any, a tag appeared under. So the tag list cannot tell which tags are usable as section tags.
- No heading data in the entries snapshot today (`grep headings` over `vault-entries.service.ts` and `index.rs` finds none). Issue 115 plans to add them.
- UI primitives available for a picker: `command`, `popover`, `select`, `dropdown-menu`, `input`, `switch` in `src/lib/components/ui/`.

### Tests and docs touching this

- Store default is asserted: `src/tests/lib/features/tasks/tasks.store.test.ts:12`, `:54`. Service fan-out: `tasks.service.test.ts:103-110`. `ipc.test.ts:91-92` type-checks the arg. `TasksView.test.ts` has no section-tag test.
- E2E depends on the box by its accessible name `/section tag/i` and clears it with `fill('')` in four tests: `e2e/specs/tasks-view.spec.ts:17-44`. The comment at `:17-19` records that no fixture task is under `#to-list`.
- Help doc 10 says tasks are picked up from "every .md file" and "automatically" (`help/documentation/10-tasks-and-todoist.md:13`, `:29`), and mentions the default only in one table cell (`:101`). This is Issue 227's finding.

### Existing plan already covering this (.scratch/open-itens, all `todo`)

- 108 (`ledger.md:145`): rule sentence "Open tasks under headings containing #to-list" plus a Clear button and an empty state naming the cause (`issues/108-mounted-list-and-rule-sentence.md:8-21`); list stays mounted.
- 115 (`:152`): move to the entries snapshot; heading rule runs in TS as `matchesHeading(headings, tag, 'tag' | 'substring')`, case-insensitive, whole-token match, so `#to-listing` stops matching (`issues/115-fetch-from-entries-snapshot.md:12,31`).
- 116 (`:153`): Sources panel replaces the textbox and removes `tasksStore.sectionTag`; heading becomes one clause kind among folder, type, note tag; default excludes for templates, system folder, archived, type definitions (`issues/116-sources-panel-and-excludes.md:14`).
- 121: remove `get_tasks_in_section_v2`. 123: persist view state. 124: "To list" saved view migration; owner decision B1 (a): open on "All open", seeded "To list" view when the vault has a `#to-list` heading (`.scratch/archived/tasks-view/PRD.md:58`, `issues/124-saved-views-and-to-list-migration.md:18`).
- 119 plans "value pickers" for clauses. 120 is a separate task-tag quick filter.

## Problems and opportunities

Problems (facts with my reading):

1. Hidden default. The first-run view filters by a convention a new vault does not have; the UI never says so. Zero tasks looks like a broken feature.
2. Misleading name and affordance. "section tag" with a `#` icon reads as a tag filter, but it matches heading text only, and "inbox" cannot express a plain heading name.
3. No feedback. Typo, unused tag, and "nothing in the vault" all show "No tasks found". No count of matching headings, no "N tasks hidden by this filter".
4. Not persisted, and a pending debounce is lost on tab close.
5. Cost. Each non-empty-tag call re-reads every note with tasks from disk and the whole list flashes to "Indexing tasks...". With the non-empty default, that is the normal path, including every toggle.
6. Semantic edges (substring, case-sensitive, `#` alone, nested sections) produce surprising matches and misses.
7. Calendar and Tasks views disagree on the task set because only one applies the filter.
8. Silent all-tasks mode: clearing the box lists templates, system folder, archived notes and type definitions (Issue 116 states no excludes exist).

Opportunities (opinion):

- Make the rule visible as a sentence plus one removable chip, instead of an unlabelled box.
- A picker is valuable only if it lists heading tags, not note tags. Without heading data in the index, a note-tag picker would offer options that match nothing, repeating the "silent empty" failure.

## Recommendations for the redesign (opinion)

1. Retire the free-text toolbar box. Show the active rule as a chip or sentence ("Under headings tagged #to-list", with an x to clear), in line with Issue 108's sentence and Issue 116's sources model. Do not ship a restyled textbox.
2. Change the default to "all open tasks" with excludes (templates, system, archived, type definitions), and seed a "To list" view only when a `#to-list` heading exists. This is the owner's recorded decision B1 (a); verify it still stands (see open questions).
3. If a picker is built, source its options from headings, not `get_all_tags_v2`: for each note collect tags that occur in heading text, with counts of tasks affected. That needs heading data in the entries snapshot (Issue 115). Use a `popover` + `command` combobox with search, counts ("#to-list, 14 tasks in 5 notes"), keyboard support, and a "Any heading" reset.
4. Fix the match semantics together with the move to TS: case-insensitive, whole-token tag match, no `#`-alone matching, optional "heading text contains" mode for plain names. This is what Issue 115 specifies; reuse it.
5. Distinct empty states per cause: tag matches no heading (with a "Clear" action and "did you mean" from the heading-tag list), vault has no tasks, all done, date filter too narrow. Issue 108 covers the first two.
6. Do not flash the list on refetch: keep the list mounted and show a thin loading indicator (Issue 108). Required before any filter change feels responsive.
7. Persist the rule per vault, and flush a pending change on unmount (or drop the debounce when selection is a click, not typing). Issue 123.
8. Decide the calendar's relationship to the rule explicitly (all tasks vs the view's rule) so the two views stop disagreeing silently.
9. Rust cleanup (`get_tasks_in_section_v2` removal, Issue 121) is a follow-up slice after the TS rule ships; the command is exercised by a Rust test block (`parsing.rs:3048-3090`) and `ipc.test.ts`, which must change in the same commit. Keep tests real-store per `CLAUDE.md`; the e2e spec (`e2e/specs/tasks-view.spec.ts:17-44`) must be rewritten, not skipped.

Suggested vertical slices that this scout supports (opinion): (a) rule sentence + clear + cause-naming empty states with the box still present; (b) stop the list flash and persist the tag; (c) TS heading matcher with correct semantics over entries with headings; (d) heading-tag picker replacing the box, default flip with "To list" seed; (e) remove the Rust command and rewrite e2e.

## Open questions for the owner

1. Is `#to-list` how you actually work, or a leftover? The plan assumed B1 (a): default "All open", seeded "To list" view. Still correct?
2. Do you want to filter by a heading's tag only, or also by heading name ("Inbox") and by a tag on the task line itself? The current box can only do the first.
3. If a picker exists, should it list only tags that appear in headings (needs heading data) or all vault tags (simple, but many choices match nothing)?
4. Should deeper sub-headings without the tag stay inside a matching section (today yes)? Should `#to-listing` stop matching (Issue 115 says yes)?
5. Should the Calendar use the same rule as the Tasks view, or always show all dated tasks as now?
6. Should the rule persist per vault or globally, and should a second named rule ("saved view") exist in this redesign or wait for Issues 123-124?
7. Which empty-vault exclusions matter to you (templates, `_system`, archived, type definitions) when the tag filter is off?

## Not checked

- Did not run the app, tests or any build; the substring and nested-section behaviors above are read from `parsing.rs`, not executed.
- Did not inspect the archived `tasks-view` PRD beyond the B1 lines, nor Issues 12, 17, 04, 28; their numbering in the open-itens text refers to the archived feature's numbering.
