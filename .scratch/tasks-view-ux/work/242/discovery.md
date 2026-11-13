# Issue 242 discovery: several section tags

## Files that change
- `src-tauri/src/vault/parsing.rs:1717-1770` `extract_tasks_from_section` becomes a wrapper over a new `extract_tasks_from_sections(content, &[String])`; inline tests at `:3048-3091` gain the union/blank/empty cases.
- `src-tauri/src/commands/vault.rs:6-8` import swap (grep: `tasks_in_section` is the only caller); `:690-758` `tasks_in_section(…, section_tags: &[String], …)`, `get_tasks_in_section_v2(section_tags: Vec<String>)`, doc comments.
- `src-tauri/tests/commands/vault_test.rs:1066-1137` call sites to one-element slices; new multi-tag + nested test.
- `src/lib/contracts/commands.ts:105-106,269` `{ sectionTags: string[] }`, `['sectionTags']`.
- `src/lib/features/tasks/tasks.logic.ts:125-133,144-190` add `parseSectionTags`; `displaySectionTag` is replaced by a join of parsed tags with ` or `.
- `src/lib/features/tasks/tasks.service.ts:57-80,94-103` send `sectionTags`; comments.
- `src/lib/features/tasks/tasks.store.svelte.ts:7` doc comment.
- `src/lib/features/tasks/TasksView.svelte:166-175,207` placeholder `#tag #tag`, `w-40`, Clear tag gated on `parseSectionTags(...).length`.
- `e2e/mocks/tauri-core.ts:162-164`, `e2e/mocks/vault-index.ts:489-495` heading-rule port.
- `src/tests/lib/contracts/ipc.test.ts:91` comment; `help/documentation/10-tasks-and-todoist.md:105` row.

## Plan
1. Rust scan: per-tag `(tag, active, level)` states in one line loop, one push per task line when any state is active. Fence logic copied from `extract_tasks_from_section`. Blank-after-trim tags dropped; none left -> `extract_tasks`. Single-tag fn calls the plural with `&[section_tag.to_string()]` (keeps untrimmed `starts_with('#')`).
2. Command + Rust tests (failing first: compile failure).
3. TS: `parseSectionTags` + rule/empty-state + service + view, test-first in `tasks.logic.test.ts`, `tasks.service.test.ts`, `TasksView.test.ts`.
4. Mock port + `src/tests/e2e/vault-index-tasks.test.ts` (pattern: `src/tests/e2e/tauri-fs.test.ts`) + one e2e spec test.
5. Help doc row.

## Prior art
- Rust: `tasks_in_section_reads_only_notes_with_tasks` (reads counter), `extract_tasks_from_section_*` inline tests.
- TS: Issue 108 work folder `.scratch/tasks-view-ux/work/108/` (rule sentence, empty state, Clear tag); same tests, add cases only.
- E2E: the wikilinks test in `e2e/specs/tasks-view.spec.ts` (write note in-test, emit `vault-index-updated`).

## Risks
- Shared per-tag state would drop t2 in the nested example; the test pins it.
- `{#each}` keyed on `lineNumber`: single push per line keeps keys unique.
- clippy `needless_range_loop`: iterate `states.iter_mut()`.
- `feature/ios-poc` still sends `sectionTag`; delivery comment must name it (not edited here).

## Defaults taken
- Mock fence detection mirrors the mock's `parseTasks` (``` toggles), not Rust's fence-char matching; `~~~` ignored, as the Issue allows.
- Rule sentence for parsed tags uses the parsed form (deduped, `#` added), so `#a #a` reads `#a`.
