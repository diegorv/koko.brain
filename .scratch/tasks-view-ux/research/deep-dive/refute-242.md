# Refutation: Issue 242, the Tasks section filter takes several tags

Ticket: `.scratch/open-itens/issues/242-tasks-several-section-tags.md` (cited as `242:N`). Dossier: `dossier-242.md`. Code cited at HEAD `d2304ac9e`. (F) = verified in code; (I) = inference.

## Verdict

**Confidence: low** that a fresh agent implements it right from the ticket text alone.

The file locations, command names, the arg-name list and the help row are right (F: `commands.ts:105-106`, `:269`; `vault.rs:694-730`, `:742-758`; `parsing.rs:1721-1766`; `tauri-core.ts:162-164`; `help/documentation/10-tasks-and-todoist.md:103`). Five gaps remain:

1. The plainest reading of "One pass ... keeps a task when its heading section matches any of the tags" (`242:8`) is one shared `(in_matching_section, section_level)` state that checks "contains any tag". That is not the union of the single-tag results, so it drops tasks today's `#to-list` filter lists. The ticket's only Rust test uses flat sibling sections (`242:22`), so it passes with the bug in place. A second plausible build (per-tag `extract_tasks_from_section` calls joined together) duplicates tasks, and duplicate `lineNumber` keys break the keyed `{#each group.tasks as task (task.lineNumber)}` (`TasksView.svelte:169`). The flat test passes that build too.
2. The e2e mock matches note tags, not headings (F: `e2e/mocks/vault-index.ts:489-495`), and note tags are stored without `#` (F: `src/lib/utils/tag-extraction.ts:61,67,76,110-127`). If an agent only renames the arg, the new e2e test fails. A lazy fix (strip `#`, match note tags) makes it pass while ignoring headings, because a tag inside a heading is also an inline note tag.
3. "first spelling wins" (`242:7`) means nothing for an exact-string dedupe. It suggests a case-insensitive dedupe, which would change results under the case-sensitive match (`parsing.rs:1756`).
4. "the existing section tests pass unchanged" (`242:23`) cannot be true literally. Four call sites pass `&str` (`vault_test.rs:1075,1094,1102,1133`).
5. "add a second tagged heading to the fixture vault if none exists" (`242:27`) assumes a first tagged heading that does not exist. Editing the shared fixture would also break an assumption Issue 110 relies on.

## Must-fix edits

### M1. State the union semantics and test the nested case (Rust)

- Change `242:8`, the sentence "One pass over the candidate notes reads each note from disk once, and keeps a task when its heading section matches any of the tags." to:
  > One pass over the candidate notes reads each note from disk once. A task is kept when at least one tag, applied alone with today's rule, keeps it: the result per note is the union of the single-tag results, each task at most once, in line order. Do not share one `in_matching_section` / `section_level` state across tags: today a heading that contains the tag re-anchors the section level, so a shared state ends the outer tag's section early. Keep one state per tag in a single line loop, or run the single-tag scan per tag over the content already read and merge by `line_number`. `tasks_in_section` takes `section_tags: &[String]` in place of `section_tag: &str`. `extract_tasks_from_section(content, &str)` stays, as the one-tag case of the new scan, so its inline tests and the oracle test keep their meaning.
- Add to `242:22`, after "each note is read once.":
  > Add a nested case to the same test or a sibling one: `# A #to-list` / `## B #work` / `- [ ] t1` / `## C` / `- [ ] t2` with `["#to-list", "#work"]` returns exactly `[t1, t2]` (`#to-list` alone keeps both, since `## C` does not close a level-1 section; a shared state drops t2). A heading containing both tags lists its task once. Assert the exact task list, not a count or `contains`.
- Evidence: `parsing.rs:1749-1759` (reset at `level <= section_level`, then re-anchor when the heading contains the tag). By hand: shared state at `## B #work` sets level 2, then `## C` (2 <= 2) closes it, so t2 is lost; `#to-list` alone keeps level 1 and lists t2. Duplicate keys: `TasksView.svelte:169`.

### M2. The e2e mock must implement the heading rule

- Replace in `242:8` "and the e2e mock (`e2e/mocks/tauri-core.ts`, `e2e/mocks/vault-index.ts`)." with:
  > and the e2e mock: `tauri-core.ts` passes `args.sectionTags`; `vault-index.ts` `getTasksInSection(sectionTags: string[])` is rewritten to apply the heading rule. Today it matches the note's tags (lowercased, stored without `#`), so every `#`-prefixed tag returns nothing and headings are ignored. For each group from `getAllTasks()`, read the file with `virtualFS.readFileSafe`, keep the tasks whose `lineNumber` falls inside a section matching any tag (per-tag state as in Rust, case-sensitive substring, `#` added when missing, fenced lines skipped as `parseTasks` does), and drop empty groups.
- Evidence: `e2e/mocks/vault-index.ts:489-495` (`entry.tags.some((t) => t.toLowerCase() === target)`, where `target` keeps the `#`); `src/lib/utils/tag-extraction.ts:61,67,76` (frontmatter tags drop `#`) and `:110-127` (`InlineTagMatch.tag` is "without `#`"); `vault-index.ts:289` (entry tags come from `extractAllTags`); `tauri-core.ts:162-164`.

### M3. The e2e test: use a test-local note, with a negative assertion

- Replace `242:27` with:
  > The e2e spec passes, with one new test that writes a note inside the test (`window.__e2e.fs.writeFile` plus `events.emit('vault-index-updated', vaultIndex.update(p, c))`, as the wikilinks test in the same spec does) holding a `#to-list` heading, a `#work` heading and an untagged heading, each with one open task. It types `#to-list #work` into the section textbox and sees both tagged tasks, and the untagged heading's task stays absent (`toHaveCount(0)`). Do not edit `e2e/fixtures/test-vault.ts`: no fixture heading carries a tag, and other specs and Issue 110 rely on the fixture tasks sitting under no `#to-list` heading.
- Evidence: there are no tagged headings in the fixtures (F: `e2e/fixtures/test-vault.ts`; the only tags are a bare `#intro` and `#plan` on their own lines, and the only task heading is `## Tasks`). The in-test pattern is at `e2e/specs/tasks-view.spec.ts:87-96`. Issue 110 depends on this at `.scratch/open-itens/issues/110-open-closed-rule.md:38` ("the fixture tasks sit under no `#to-list` heading"). The spec comment at `tasks-view.spec.ts:17-19` makes the same assumption. Without the negative assertion, the note-tag mock from M2 passes, because `## Misc`'s task sits in a note that has the tags.

### M4. Dedupe is exact, not "first spelling"

- Change in `242:7` "and removes duplicates (first spelling wins), keeping the typed order." to:
  > and removes exact duplicates after the `#` is added (`work` and `#work` are one tag; `#Work` and `#work` stay two, because the match is case-sensitive), keeping the first-typed order.
- Evidence: the match is `heading_text.contains(&tag)` (`parsing.rs:1756`), which is case-sensitive; ticket note `242:34`. Folding `#Work` into `#work` would stop matching headings that contain `#Work`.

### M5. "Existing tests pass unchanged" cannot hold literally

- Change `242:23` to:
  > Rust: one tag behaves exactly as today. The existing `tasks_in_section_*` tests keep their assertions; only their call sites change from `"#to-list"` / `tag` to a one-element slice (`vault_test.rs:1075, 1094, 1102, 1133`). The inline `extract_tasks_from_section_*` tests (`parsing.rs:3050-3091`) and the oracle test's comparison against `extract_tasks_from_section` stay unchanged. A tag without `#` still matches.
- Evidence: the `&str` call sites are at `vault_test.rs:1075,1094,1102,1133`. A `&[String]` parameter accepts none of them. The Rust red test fails at compile time, not at an assertion (still a valid "fails today").

### M6. One parse decides "a tag is set" everywhere (sentence, empty state, Clear tag)

- Replace `242:10` with:
  > **Rule sentence and empty state** (Issue 108). `describeTaskRule` and `explainEmptyTasks` keep their `sectionTag: string` parameter (Issues 111 and 243 build on it) and run `parseSectionTags` on it internally. With zero parsed tags (for example `''` or `' , '`) they behave as Issue 108's no-tag case ("from every note", "No tasks in this vault yet", no Clear tag button), matching the service, which then calls `get_all_tasks_v2`. One tag reads as today. Several tags join with ` or `: ` under headings containing #to-list or #work`, and stage 1 says "No task sits under a heading containing #to-list or #work". The view shows the Clear tag button only when the parsed list is not empty.
- Evidence: Issue 108 defines "set" as "the trimmed `sectionTag` is not empty" (`108:13`, `108:16`). With 242, `','` is non-empty after trimming, yet the service sends no section filter (`242:7`). The 108-only reading would then show "under headings containing #," above a list of every task. Downstream, `111-quick-filters.md:20` keeps `{ sectionTag, ... }` as a string and joins with `' or '` "(Issue 242's several tags)", and `116-sources-panel-and-excludes.md:14` names `parseSectionTags` as the parser of the saved text.

## Should-fix edits

- S1. Rust handling of blank tags and an empty list. Add to `242:8`: "Rust drops tags that are blank after trimming. An empty or all-blank list returns every task (`extract_tasks`), as an empty `section_tag` does today. The TS side never sends one." Evidence: `parsing.rs:1722-1724`. Without this rule, a per-tag loop that reuses the single-tag fall-through turns one blank tag into "every task".
- S2. A bare `#` token. `242:7` says "drops empty tokens". `#` is not empty, so it stays and matches every heading containing `#`. Mid-typing (`#to-list #`), the 400 ms debounce (`TasksView.svelte:37-39`) can fire a broad disk scan. Say which: either "a token that is only `#` is dropped" or "kept, as today's single tag `#` is". The owner should pick; the agent should not guess.
- S3. List the TS assertions that change on purpose. Add to `242:25`: "Update the two existing assertions `{ sectionTag: '#to-list' }` (`tasks.service.test.ts:109`) and `{ sectionTag: '#work' }` (`:202`) to `sectionTags`. Add a `' , '` case that calls `get_all_tasks_v2`." Without it, an agent following "never weaken tests" may stall. The empty-box case already exists (`:205-211`) and passes today, so it is not a red test.
- S4. A component test for the textbox. CLAUDE.md rule 11 requires a test for each changed `.svelte` file. Add: "`TasksView.test.ts`: the textbox named 'Section tag' has placeholder `#tag #tag`." Before changing the placeholder, confirm Issue 108's `aria-label="Section tag"` is in the view. Today the accessible name comes only from the placeholder (`TasksView.svelte:130`; no `aria-label` at HEAD), and every e2e locator uses `/section tag/i` (`tasks-view.spec.ts:20,31,42,69,95`).
- S5. The placeholder against the icon. A decorative `Hash` icon sits inside the input (`TasksView.svelte:125`), so `#tag #tag` displays as "# #tag #tag". The input is `w-28` with `pl-5 pr-2` (`:131`), about 84 px of text area, so `#to-list #work` barely fits at `text-xs` (I). Decide the width and the icon, or state "keep `w-28` and the icon".
- S6. Comments that go stale (CLAUDE.md section 8). Name them: `commands.ts:105` ("the sections tagged `sectionTag`"), `ipc.test.ts:91` (`@ts-expect-error sectionTag is required`), `vault.rs:689-693` and `:732-735`, `parsing.rs:1717-1720`, `tasks.store.svelte.ts:7`, `tasks.service.ts:57-64` and `:88-95`.
- S7. `242:8` points to "`tasks_in_section`, `extract_tasks_from_section` in `src-tauri/src`". Give the files: `src-tauri/src/commands/vault.rs:694` and `src-tauri/src/vault/parsing.rs:1721`.
- S8. The gate says `bash scripts/e2e.sh`. Inside relay-lite the role prompt decides test scope (CLAUDE.md "Inside a relay-lite run"). Add "targeted: `bash scripts/e2e.sh e2e/specs/tasks-view.spec.ts`", so the build step does not run the full e2e suite on a shared machine.

## Dossier errors

- Mostly accurate. Findings 1 to 5 hold in code: per-tag state, the mock's note-tag match, the four call sites at `vault_test.rs:1075,1094,1102,1133`, compile-red, and the placeholder as today's only accessible name.
- R4 overstates the fixture risk. No spec asserts on the fixture tags `#plan` / `#intro` (grep of `e2e/specs`). The concrete reason not to edit fixtures is the "no `#to-list` heading" assumption at `tasks-view.spec.ts:17-19` and `110-open-closed-rule.md:38`. The dossier misses both.
- Section 1.4 cites the in-test write pattern at "spec:84-100". The write is at `:87-96`, inside the test that starts at `:87`. Minor.
- R10 says "Everything else in the ticket matched the code". It misses the "first spelling wins" dedupe ambiguity (M4) and the false premise of a "second" tagged heading (M3).
- Section 1.1 lists `vault_task_test.rs` nowhere. It mentions `extract_tasks_from_section` only in its module doc (`vault_task_test.rs:3`) and never calls it, so no edit is needed. Not an error, but the dossier's claimed full caller list should include it.
- A4 calls a lone `#` "the Rust side already behaves that way for a lone `#` today". True (`parsing.rs:1725-1729` keeps `#`, and `contains("#")` matches any tagged heading). It should be raised as an owner choice (S2), not settled by "follow literally".
