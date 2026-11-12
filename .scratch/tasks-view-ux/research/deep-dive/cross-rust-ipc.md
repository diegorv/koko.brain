# Cross-cutting validation: Rust and IPC side of the Tasks view chain

Scope: tickets 242, 115, 121 and 122, plus everything in the chain that touches `src-tauri/`, `src/lib/contracts/` or `e2e/mocks/` (074 as 115's blocker, 241's use of `toggle_task_status`, 129's Todoist reads). Inputs: `dossier-*.md`, `refute-*.md` in this folder. Code cited at HEAD `d2304ac9e`. (F) = verified in code; (I) = inference. Nothing was run.

## What holds (F), so the next agents need not re-check it

- The command, helpers and registration are where the dossiers say: `get_tasks_in_section_v2` `src-tauri/src/commands/vault.rs:732-758` (arg `section_tag: String` at `:743`), `tasks_in_section` `:689-730`, `section_task_candidates` / `SectionTaskCandidate` `:662-687`, `extract_tasks_from_section` `src-tauri/src/vault/parsing.rs:1717-1766`, registration `src-tauri/src/lib.rs:353`.
- The shared-state trap in 242 is real: a heading that contains the tag re-anchors `section_level` (`parsing.rs:1752-1758`), so one `(in_matching_section, section_level)` state shared across tags ends an outer tag's section early. refute-242 M1 (per-tag state, union of single-tag results, one push per line) is correct.
- The e2e mock does not model headings: `e2e/mocks/vault-index.ts:489-495` compares the lowercased tag, `#` kept, with note tags. refute-242 M2/M3 stand.
- The IPC safety nets work for a rename or removal. `ipc-parity.test.ts` parses `generate_handler!` and compares arg names (`snakeToCamel`) and type text (`rustToTs`, `Vec<T>` to `T[]`, `:132-141`). `MIN_COMMANDS = 57` (`:24`) is a floor and 73 commands are registered, so removing one needs no edit. `e2e/mocks/tauri-core.ts:462` types `HANDLERS` as an exhaustive map over `CommandMap`, so a stale or missing handler fails `pnpm check`, which type-checks `e2e` (`tsconfig.json:22`).
- 242 changes no `#[ts(export)]` type: command args are not exported, and `FileTaskGroup` keeps its shape. No regenerated bindings.
- `toggle_task_status` emits `vault-index-updated` before it returns (`vault.rs:853-864`), with the lock dropped first. `bumpVaultIndexVersion` assigns the Rust version (`vault.store.svelte.ts:108-111`). Both claims 115 builds on hold. The e2e mock emits synchronously inside the handler (`tauri-core.ts:59-61, 166-177`).
- The e2e status maps cover all seven statuses both ways (`vault-index.ts:48-67`), and Rust `set_task_status_in_content` writes any status (`parsing.rs:1887-1915`). So 241's `target: 'in-progress'` and its Undo need no Rust or mock change.
- 129 reads `todoist_read_links` / `todoist_read_log`, which the e2e mock answers with `[]` (`tauri-core.ts:406-408, 530-534`), so the Tasks spec does not break on them.

## Findings

### F1. medium. 242, 121, 122, 074: no gate runs clippy, and CI fails on its warnings after the merge

- What is wrong: each ticket's Rust gate is `cargo test` only. Relay-lite runs `pnpm check`, vitest and, under one rule, `cargo test` (`.agent-relay-lite/config.json` `checks` and `rules[0]`). CI runs `cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets --locked -- -D warnings` (`.github/workflows/ci.yml:116,151`). Removal tickets leave exactly the warnings clippy rejects. In 121: `display_name` in `use crate::vault::task::{display_name, ...}` (`vault.rs:9`) has one user, inside `tasks_in_section` (`:721`). In `vault_test.rs`, `FileTaskGroup` (`:8`) is used only by the oracle test (`:1118-1123`), and the `index_note` helper (`:1059`) only by the four section tests. `cargo test` passes and the push to main turns CI red. 242 can trip lints too (a per-tag index loop invites `needless_range_loop`).
- Evidence: `ci.yml:116,151`; `config.json` checks list; `vault.rs:9,721`; `vault_test.rs:8,1059-1123`. The owner's memory note says clippy is gated on main.
- Ticket edit (242, 121, 122, 074; each Gate line): append "and `cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets --locked -- -D warnings` (the CI command), run from the checkout or worktree root after `cargo test`."

### F2. medium. 121: the ticket removes one Rust test and one import; four tests, a helper and three imports must go

- What is wrong: the ticket names `vault_test.rs:1058` (`tasks_in_section_reads_only_notes_with_tasks`) and "its import at `:7`". The block holds the helper `index_note` (`:1058-1064`) and four tests that all call the removed helpers: `:1067`, `:1087`, `:1100`, `:1107`. The imports are `:4` (`section_task_candidates, tasks_in_section`), `:7` (`extract_tasks_from_section`) and `FileTaskGroup` in `:8` (`TaskStatus` there stays). The criterion "no other test changed" contradicts this. dossier-121 section 0.1 found it too; the ticket was never corrected.
- Evidence: `vault_test.rs:4,7,8,1058-1141`.
- Ticket edit: replace "`src-tauri/tests/commands/vault_test.rs:1058` (`tasks_in_section_reads_only_notes_with_tasks`) and its import at `:7`" with "in `src-tauri/tests/commands/vault_test.rs`, the `index_note` helper and every test that calls `tasks_in_section`, `section_task_candidates` or `extract_tasks_from_section(s)` (four at HEAD, plus the ones Issue 242 added), and the imports only they use (`section_task_candidates`, `tasks_in_section`, `extract_tasks_from_section(s)`, `FileTaskGroup`)". Change the criterion to "`cargo test` and clippy pass; the only tests removed are the ones that call the removed functions."

### F3. medium. 121: written before 242, so it misses everything 242 adds

- What is wrong: 121 lists `extract_tasks_from_section` and its five inline tests (`parsing.rs:3040-3082`). 242 adds a plural scanner (per dossier-242 1.1, `extract_tasks_from_sections(content, &[String])`, with the singular form kept as a wrapper), plural inline tests, multi-tag tests in `vault_test.rs`, and a heading-rule port in the mock (`getTasksInSection(sectionTags: string[])` with its own helpers over `virtualFS`). The ticket's grep (`get_tasks_in_section`) matches none of these names.
- Evidence: `121:9-11`; dossier-242 1.1 and step 2; refute-242 M2.
- Ticket edit: add to the Rust bullet "and everything Issue 242 added for this command: the plural section scanner and its tests in `parsing.rs` and `vault_test.rs`, and the heading-rule port behind `getTasksInSection` in `e2e/mocks/vault-index.ts`. Find them by `git show` of the 242 squash commit." Keep 242's two-tag e2e test: it tests the view, and after 115 it runs on the TS heading rule.

### F4. medium. 121: emptying the ipc-mirrors ALLOWLIST breaks a test the ticket does not mention

- What is wrong: `ipc-mirrors.test.ts:99-105` (`honours the allowlist by file and name`) checks that the module-level `ALLOWLIST` exempts `tasks.types.ts -> FileTaskGroup`. With the entry removed it fails. `const ALLOWLIST = []` also leaves an implicitly-`any` evolving array, which `strict` rejects at `ALLOWLIST.includes(...)` (`:67`). An agent following "never weaken tests" stalls here.
- Evidence: `src/tests/lib/architecture/ipc-mirrors.test.ts:24-27,67,99-105,128-138`; `tsconfig.json` `"strict": true`.
- Ticket edit: replace "Removing the hand-written `FileTaskGroup` also removes its entry from the `ALLOWLIST`" with "Removing the hand-written `FileTaskGroup` empties `ALLOWLIST`: declare it `const ALLOWLIST: string[] = []`, let `findMirrors` take the allowlist as a parameter defaulting to it, and rewrite `honours the allowlist by file and name` to pass a synthetic allowlist with a neutral path, so the mechanism stays tested (dossier-121 3.7)."

### F5. medium. 121: the acceptance grep matches sites the ticket does not list and misses the helpers

- What is wrong: `grep -rn get_tasks_in_section src src-tauri/src e2e docs/agents` also matches `src/tests/lib/contracts/ipc.test.ts:92` and the comment at `parsing.rs:1406`, and neither is listed. The `ipc.test.ts` line is worse than stale. It is `// @ts-expect-error sectionTag is required` over `call('get_tasks_in_section_v2', {})`. Once the command is gone the line still errors (unknown command), so `pnpm check` stays green while the "required arg" check silently stops testing anything. The grep also misses `tasks_in_section`, `section_task_candidates`, `SectionTaskCandidate`, `extract_tasks_from_section(s)`, `getTasksInSection`, and the comments at `parsing.rs:1439` (HEADING_RE doc) and `src-tauri/tests/vault_task_test.rs:3`.
- Evidence: `ipc.test.ts:91-92`; `parsing.rs:1406,1439`; `vault_task_test.rs:3`.
- Ticket edit: add the bullet "Replace the `ipc.test.ts` compile-time case with another command that has a required arg (for example `call('toggle_task_status', {})`, comment `required args are missing`), so it keeps testing a missing arg." Widen the criterion grep to `grep -rnE "get_tasks_in_section|tasks_in_section|section_task_candidates|SectionTaskCandidate|extract_tasks_from_section|getTasksInSection" src src-tauri/src src-tauri/tests e2e docs/agents`, and add the two comment sites to the list.

### F6. medium. 242 and 121: the iOS PoC branch dispatches this command by its old argument name

- What is wrong: `feature/ios-poc` (not merged into main) routes `get_tasks_in_section_v2` with `arg::<String>(args, "sectionTag")` to a `tasks_in_section_inner` (`.claude/worktrees/ios-poc/src-tauri/src/remote/dispatch.rs:345-348`). It whitelists the command as `Class::Read` (`remote/policy.rs:55`), tests it with `{"sectionTag": "#to-list"}` (`src-tauri/tests/remote_ws_test.rs:407,410`), and fakes it in `src/tests/lib/app/remote/fake-host.ts:154`. 242 renames the arg and 121 deletes the command, so rebasing that branch onto main will not compile or will dispatch a dead command. No main-side edit can avoid this. The owner should know before delivery.
- Evidence: the four ios-poc paths above; `git merge-base --is-ancestor feature/ios-poc main` is false.
- Ticket edit (242 and 121 Notes): "`feature/ios-poc` dispatches `get_tasks_in_section_v2` with `sectionTag` (`remote/dispatch.rs`, `remote/policy.rs`, `tests/remote_ws_test.rs`, `fake-host.ts`). Name it in the delivery comment: that branch must follow the rename (242) and the removal (121) when it rebases. Do not edit it from main."

### F7. medium. 122: the locator gap is misdescribed, and the triage decision depends on it

- What is wrong: the ticket says `write_task_lines` locates a line "by its `🆔 td-…` anchor plus the expected whole line, never by line number". `TaskLineReplace` has an optional `line_number` (`src-tauri/src/vault/task_lines.rs:23-28`), but only to stamp a first anchor. The new line must carry the anchor (`validate`, `:276-280`), and no line may carry it yet (`locate_unanchored`, `:320-329`). So option (a), "the menu gives such a line an anchor first", needs no new command: one `write_task_lines` call can stamp and edit together. The anchor is a Todoist `td-` id, though, so a stamped line looks Todoist-linked. Option (b) in the ticket, a line-number locator with the `toggle_task_status` guard, does not exist. Both options also need the whole expected line, which a row cannot rebuild: `indent` is a count, the marker is lost, and `x`/`X` collapse (`parsing.rs:1591-1601,1620`). dossier-122 5.1-5.2 has the same facts; the ticket text predates them.
- Evidence: `task_lines.rs:1-4,11-28,259-329`; `parsing.rs:1591-1620`.
- Ticket edit: replace the "Gap to settle at triage" bullet with "`write_task_lines` locates a line by its `🆔 td-…` anchor and the exact whole line. Its `lineNumber` mode only stamps a first anchor onto an unanchored line, and the new line must carry it (`task_lines.rs` `validate`, `locate_unanchored`). A row can supply neither the anchor nor the whole line (`TaskItem` drops the marker, the indent characters and the `x`/`X` case). Options: (a) stamp a `td-` anchor through `lineNumber`, which marks the line as Todoist-linked; (b) a new command guarded like `toggle_task_status` (line, expected text, expected status), which rebuilds the line from its own prefix." Also drop "As built it needs no new Rust command".

### F8. medium. 122 after 115: the overlay cannot show a due or priority edit without a DTO change

- What is wrong: 115's overlay stores `text`, `status` and `version` per row (`115:18`), but the chips read `metadata`, which only Rust parses. Showing a due or priority edit at once after 115 means the write returns the re-parsed task. That is a new or changed `#[ts(export)]` result type. `cargo test` then regenerates `src/lib/contracts/generated/`, and the regenerated files must be committed (CLAUDE.md rule 6; relay rule on bindings). Without it the chip lags 2 to 10 s after the user's own edit, the lag 115 exists to remove.
- Evidence: `115:18-19`; `ToggleTaskResult` / `TaskLinesWriteResult` carry no task (`src/lib/contracts/generated/ToggleTaskResult.ts`, `TaskLinesWriteResult.ts`); `.cargo/config.toml:28` (`TS_RS_EXPORT_DIR`).
- Ticket edit (122, add to Rust): "If Issue 115 has landed, the write returns the re-parsed `Task` of the written line, and `afterTaskWrite` overlays its `metadata` along with `text` and `status`. That changes or adds a `#[ts(export)]` type: commit the regenerated `src/lib/contracts/generated/` files." Add a criterion: "after 115, the due chip shows the new date with `get_all_vault_entries_v2` still returning the pre-edit snapshot."

### F9. low. 122: a new write command has to join the indexing rules, and rule 9 conflicts with `vaultRoot` + `relPath`

- What is wrong: rules 2 and 6 name the task-write commands (`toggle_task_status`, `write_task_lines`) as emitters and as the `task` source that skips the IPC. A new command missing from that list makes the next reader treat it as an unknown write path. Rule 9 says every `*_v2` IPC param is absolute and never vault-relative, but `write_task_lines` already takes `vaultRoot` + `relPath`. dossier-122 A6 proposes the same for the new command, which rule 9 does not allow for.
- Evidence: `docs/agents/indexing-watcher-rules.md` rules 2, 6 (the SOURCE_POLICY `task` row) and 9; `vault.rs:956-962`.
- Ticket edit: "A new task-write command is added to `indexing-watcher-rules.md` rules 2 and 6 and to the comment lists in `core/filesystem/task-write.service.ts` and `note-change.service.ts`. If it takes `vaultRoot` + `relPath` as `write_task_lines` does, add one line to rule 9 naming both commands as confined, vault-relative exceptions."

### F10. low. 122: blocker 085 looks stale, and two citations are off

- What is wrong: 085 hardens `read_files_batch` (`085:13`), which 122 never calls. 122's own "Waits on" says the open-root check is already in `write_task_lines` (`vault.rs:903`; `VaultIndex::vault_root` at `src-tauri/src/vault/index.rs:349`). `parse_task_metadata` is at `parsing.rs:1776`, not `:1760`; `PRIORITY_EMOJIS` is at `:1475`.
- Ticket edit: "Blocked by: 241" (drop 085, or say what 122 needs from it). Fix the two citations.

### F11. low. 115: the prompt-refresh flag leaks when the toggle writes nothing

- What is wrong: Rust emits only when `update_result.changed` (`vault.rs:854`, `write_task_lines` `:970`). A flag set before a call that comes back `stale`, no-op or throwing is never consumed by its own event. The next unrelated event (an editor save, the watcher) takes it and skips the throttle once. 115 rejects setting the flag in `afterTaskWrite` for this very reason (`115:18`), and the "before the call" placement leaks the same way on these paths. Cost: one extra immediate refresh, no wrong data.
- Evidence: `vault.rs:785-799,854`; `tauri-listeners.service.ts:298-303`; `vault.store.svelte.ts:114-123`.
- Ticket edit (115 Freshness, after the placement sentence): "When the call throws, or returns `stale` or `updateResult.changed: false`, no event follows: clear the flag with `vaultStore.takePromptIndexRefresh()`." Add the case to the prompt-placement test.

### F12. low. 121: the Rust `FileTaskGroup` doc names the deleted TS type, and fixing it regenerates a binding

- What is wrong: `src-tauri/src/vault/task.rs:150` says "Mirrors `tasks.types.ts::FileTaskGroup`", and ts-rs copies it to `src/lib/contracts/generated/FileTaskGroup.ts:6`. The module doc `task.rs:3-4` says the types mirror `tasks.types.ts` "exactly". 121 deletes the TS type. Fixing the doc is a doc-comment change on a `#[ts(export)]` DTO, so `cargo test` rewrites the binding, and CI fails while it is uncommitted (CLAUDE.md rule 6).
- Ticket edit: "Reword the `FileTaskGroup` doc at `task.rs` ('One file's worth of tasks, as returned by `VaultIndex::lookup_all_tasks`.') and the module doc's 'mirrors ... exactly' line, then commit the regenerated `src/lib/contracts/generated/FileTaskGroup.ts`."

### F13. low. 121: name the right `fromV2` and the remaining `FileTaskGroup` users

- What is wrong: `fromV2` also exists in `src/lib/features/collection/collection.service.ts:44,98,124`, unrelated. The hand-written `FileTaskGroup` is used at HEAD by `tasks.logic.ts:2,59-91` (`filterCompleted`, `filterByDate`, `computeTaskStats`) and `tasks.store.svelte.ts:1,4,15,21,28`. 111 and 238 are expected to delete those (I). The generated `FileTaskGroup` / `FileTaskGroupV2` stays, because `get_all_tasks_v2` still serves the event calendar and Todoist (`todoist-sync/vault-scan.service.ts:57`, `event-calendar-tasks.logic.ts:49`).
- Ticket edit: write "`tasks.service.ts::fromV2` (not `collection.service.ts::fromV2`)" and add "The generated `FileTaskGroup` and `get_all_tasks_v2` stay (event calendar, Todoist scan). If `tasks.logic.ts` still types anything with the hand-written `FileTaskGroup`, stop and trace it."

### F14. low. 242: line cites, the exact TS type text, and the targeted e2e

- What is wrong: (a) `ipc-parity.test.ts` compares the args type text after removing whitespace (`normalize`, `:155,173-178`). Rust `Vec<String>` must appear as `string[]`; `Array<string>` fails the parity test. (b) The comment at `ipc.test.ts:91` says `sectionTag is required`. (c) The gate runs the full `bash scripts/e2e.sh`, which forwards its args to Playwright (`scripts/e2e.sh:116`), so a targeted run is possible.
- Ticket edit: in the Rust bullet, "args `{ sectionTags: string[] }` (write `string[]`: the parity test compares the type text)". Add `ipc.test.ts:91` to the comments to update. Gate: "targeted `bash scripts/e2e.sh e2e/specs/tasks-view.spec.ts`; delivery runs what relay-lite runs." CI runs the full e2e on push to main (`.github/workflows/main-checks.yml:37-39`).

### F15. low. 074 and 242/121: do not run them at the same time

- What is wrong: 074 (115's blocker, no blocker itself) edits `parsing.rs` around `extract_tasks` (`:1692`) and the heading code. It also edits the e2e mock parser (`vault-index.ts:150-193`), bumps `INDEX_SCHEMA_VERSION` (`index_cache.rs:18`), and regenerates `Task.ts` and `NoteEntry.ts`. 242 edits `parsing.rs:1717-1766` and `vault-index.ts:489-495`, and 121 deletes the same regions. Relay-lite can run up to three workflows at once, and these conflict textually. If 074 makes `Task.heading` required, every hand-built `Task` in mocks and tests changes too.
- Ticket edit (074 Notes): "Do not run beside 242 or 121: all three edit `parsing.rs` near `extract_tasks` and `e2e/mocks/vault-index.ts`." Its own cites have drifted: the cache test is at `vault_test.rs:982-994`, not `:972-990`.

## Dossier checks

- dossier-121 is accurate and goes beyond the ticket: four tests and the helper, the `ipc.test.ts:92` trap, the ALLOWLIST self-test, the `display_name` import, the clippy command, the `task.rs` doc, the ios-poc consumer. Errors: it says 72 registered commands (73 `::` entries in `generate_handler!`; nothing depends on it). It says `const ALLOWLIST = []` "would infer `never[]`". Under `strict` it is an implicitly-`any` evolving array, and the outcome (a `pnpm check` error) is the same. It does not list 242's additions (F3), because 242 had not been written into the chain when it was drafted.
- dossier-122 is accurate on the Rust facts I checked (`task_lines.rs:11-29,259-329`, `vault.rs:770-868,898-982`, `parse_task_line` `pub(crate)` at `parsing.rs:1635`, `parse_task_metadata` pub at `:1776`, `set_task_status_in_content` at `:1887`). Its A5 (overlay needs metadata, so a DTO change) is the strongest point and should go into the ticket (F8). Its proposed split 122a/122b is sound for the gates: only 122a needs cargo.
- dossier-242 and refute-242 hold on the Rust and mock side. One addition: the mock heading port 242 builds lives only until 121 (F3), so keep it minimal. The per-tag state and the negative assertion matter. Fence variants (`~~~`) and frontmatter do not.

## Confidence changes (Rust/IPC angle only)

- **121: lower, from the ticket's S to medium-low until edited.** Its test list is wrong (F2), it ignores 242's additions (F3), the ALLOWLIST self-test breaks (F4), the grep misses sites (F5) and clippy is ungated (F1). Each failure is loud (compile, check or CI), so nothing breaks silently, but an agent that follows the text as written stops or lands a red main. With F1 to F5 applied, high.
- **122: keep low.** Still `needs-triage`. The ticket misdescribes the locator it asks the owner to decide (F7), misses the DTO change 115 forces (F8), and waits on an unrelated blocker (F10). Raise only after the triage note records the locator and the result shape.
- **242: low as written, medium-high with refute-242 M1 to M6 plus F1, F6, F14.** The Rust change is small and the parity test guards the rename. The risk is the semantics (union) and the mock, both already flagged.
- **115: no change from this angle.** It touches no Rust and no contract. Its Rust claims (emit before return, version assignment) hold (F). F11 is a small leak. Its gaps are TS-side (refute-115).
- **074: slightly lower (not in the chain, but 115's blocker).** Its gate lacks clippy (F1), its cites have drifted, and it conflicts with 242 and 121 if run beside them (F15).
- **241, 129: raise slightly.** The mocks already cover every status write and the Todoist reads, so they need no e2e mock or IPC work.

Not verified: nothing was executed; the predecessors' post-merge code (111, 238, 241, 242) does not exist yet, so statements about what they leave behind are inference from their tickets.
