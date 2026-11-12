# 242: The Tasks section filter takes several tags

**Origin:** owner request, 2026-11-12, during the Tasks view UX review: keep the `#to-list` filter, and allow more tags instead of listing every task. Issue numbers in this text are open-itens numbers.

**What to build:** The section tag textbox accepts several tags, for example `#to-list #work`. A task is listed when it sits under a heading containing any of them. The default stays `#to-list`.

- **Input.** The textbox keeps one string in `tasksStore.sectionTag`. A pure `parseSectionTags(text)` in `tasks.logic.ts` splits it on whitespace and commas, adds a leading `#` to a token that lacks one, drops empty tokens, and removes duplicates (first spelling wins), keeping the typed order. An empty result means no section filter: every task is listed through `get_all_tasks_v2`, as an empty box does today.
- **Rust.** `get_tasks_in_section_v2` takes `sectionTags: Vec<String>` instead of `sectionTag: String`. One pass over the candidate notes reads each note from disk once, and keeps a task when its heading section matches any of the tags. Each tag matches with today's rule, unchanged: the `#` added when missing, and a substring of the heading (`tasks_in_section`, `extract_tasks_from_section` in `src-tauri/src`). Groups keep their current shape and order. Update the typed command map (`src/lib/contracts/commands.ts`, the args type and the argument-name list) and the e2e mock (`e2e/mocks/tauri-core.ts`, `e2e/mocks/vault-index.ts`).
- **Service.** `buildTaskIndex` calls `get_tasks_in_section_v2` with `parseSectionTags(tasksStore.sectionTag)` when the list is not empty, else `get_all_tasks_v2`.
- **Rule sentence and empty state** (Issue 108). With several tags, `describeTaskRule` says ` under headings containing #to-list or #work`, and `explainEmptyTasks`'s first stage says "No task sits under a heading containing #to-list or #work". One tag reads as today.
- The textbox placeholder becomes `#tag #tag`. Its accessible name stays "Section tag".
- `help/documentation/10-tasks-and-todoist.md` says the field takes several tags, separated by spaces or commas, and lists a task when its heading contains any of them.

**Blocked by:** 108

**Status:** ready-for-agent

**Answered:** owner, 2026-11-12: several tags match as OR (any tag), entered in the existing textbox; the list is saved per vault (Issue 243).

**Gate:** both: `cargo test --manifest-path src-tauri/Cargo.toml` + `pnpm check` + `pnpm vitest run`, plus `bash scripts/e2e.sh` because the e2e mock changes. Run cargo from the checkout or worktree root.

- [ ] Failing test first, Rust (next to the existing `tasks_in_section` test in `src-tauri/tests/commands/vault_test.rs`): a vault with `## A #to-list`, `## B #work` and `## C` sections; the tags `["#to-list", "#work"]` return the A and B tasks and not the C ones; each note is read once. Fails today (the command takes one tag).
- [ ] Rust: one tag behaves exactly as today (the existing section tests pass unchanged), and a tag without `#` still matches.
- [ ] `tasks.logic.test.ts`: `parseSectionTags` for `#to-list #work`, `#to-list,work`, extra spaces, a duplicate, and an empty or whitespace-only string.
- [ ] `tasks.service.test.ts` with the real store, mocking only `invoke`: `#to-list work` sends `sectionTags: ['#to-list', '#work']`; an empty box calls `get_all_tasks_v2`.
- [ ] `tasks.logic.test.ts`: the sentence and the empty-state message with two tags.
- [ ] The e2e spec passes, with one test that types two tags and sees tasks from both sections (add a second tagged heading to the fixture vault if none exists).

## Notes

- **Size:** S to M.
- Run in series with the other Tasks view Issues (see 108).
- Issue 115 later moves the heading rule to TS over the entries snapshot; it keeps the any-of-several-tags rule. Issue 116 later turns each saved tag into a heading source card.
- Section matching stays case-sensitive substring, as today. Issue 115 changes that rule for all tags at once.
