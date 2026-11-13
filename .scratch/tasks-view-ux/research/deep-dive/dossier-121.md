# Dossier: Issue 121, remove `get_tasks_in_section_v2` and its disk re-read

Ticket: `.scratch/open-itens/issues/121-remove-tasks-in-section-command.md`. HEAD at time of writing: `d2304ac9e`.
All `path:line` below are at HEAD, i.e. BEFORE the 14-ticket chain lands. Where a predecessor changes the spot, that is stated. Line numbers in the ticket are stale (examples: command is `vault.rs:732-758` not `736-753`; `lib.rs:353` not `:347`; `commands.ts:106,269` not `:82,:227`; lifecycle comment `app-lifecycle.service.ts:408-409` not `:398`). Use symbols, not numbers, when implementing.

Convention: "V" = verified in code at HEAD. "I" = inference about what a predecessor will leave behind.

---

## 0. Summary of findings that change the ticket

1. The ticket names ONE Rust test to remove (`tasks_in_section_reads_only_notes_with_tasks`). V: the block `vault_test.rs:1058-1136` holds the `index_note` helper plus FOUR `tasks_in_section_*` tests (`:1066`, `:1086`, `:1099`, `:1106`), all calling `section_task_candidates` / `tasks_in_section`. They all must go or the integration test crate does not compile. Their imports (`:4` `section_task_candidates, tasks_in_section`; `:7` `extract_tasks_from_section`; `:8` `FileTaskGroup`) go with them. `TaskStatus` in `:8` stays (used at `:718`).
2. Ticket step "remove its entry from the `ALLOWLIST` in `ipc-mirrors.test.ts`" is incomplete. V: `ipc-mirrors.test.ts:99-105` (test `honours the allowlist by file and name`) asserts that exact entry works (`findMirrors('src/lib/features/tasks/tasks.types.ts', ...)` must be `[]`). With an empty ALLOWLIST that test fails. Also `const ALLOWLIST = []` would infer `never[]` and `ALLOWLIST.includes(string)` (`:67`) would fail `pnpm check`. The test must be rewritten on purpose (see 3.7).
3. Ticket acceptance grep (`grep -rn get_tasks_in_section src src-tauri/src e2e docs/agents`) also matches two non-obvious sites: `src/tests/lib/contracts/ipc.test.ts:92` and the comment `src-tauri/src/vault/parsing.rs:1406`. Neither is listed in the ticket. And the grep does NOT catch the helper names (`tasks_in_section`, `section_task_candidates`, `extract_tasks_from_section`), because those lack the `get_` prefix. Use the wider grep in 3.9.
4. `fromV2` trap. V: `src/lib/features/collection/collection.service.ts:44,98,124` has an unrelated `fromV2` (NoteRecord mapper), and `kbapi-firewall.test.ts:357` names it in a comment. Only `tasks.service.ts:20` goes. A repo-wide `grep fromV2` will mislead.
5. `FileTaskGroup` trap. V: the GENERATED `FileTaskGroup` (`src/lib/contracts/generated/FileTaskGroup.ts`, alias `FileTaskGroupV2` in `src/lib/types/vault-v2.types.ts:32`) stays: `get_all_tasks_v2` (kept, used by the event calendar) returns it, and `commands.ts:12,104`, `e2e/mocks/tauri-core.ts:23,158`, `e2e/mocks/vault-index.ts:29,475`, `src/tests/fixtures/todoist-vault.fake.ts:22`, event-calendar code and tests use it. Only the hand-written `tasks.types.ts:20` interface goes. The Rust `FileTaskGroup` (`task.rs:152`) stays.
6. Contradiction between tickets: 115 says it "stops using" the hand-written `FileTaskGroup` AND `TaskItem` and that 121 deletes them; 121 says `TaskItem` stays (111's `TaskRow extends TaskItem`). 121 is later and explicit, and generated `Task.ts:8` docs say it mirrors `TaskItem`. Resolution: keep `TaskItem`. Delete `FileTaskGroup` only.
7. Dangling doc: `src-tauri/src/vault/task.rs:151` says "Mirrors `tasks.types.ts::FileTaskGroup`" and ts-rs copies it into `src/lib/contracts/generated/FileTaskGroup.ts:6`. After the type is deleted the reference dangles. Fixing it is a doc-comment change on a `#[ts(export)]` DTO, so `cargo test` regenerates the binding and CI's stale-bindings check requires the regenerated file be committed (CLAUDE.md rule 6). Recommended (it is this change's own orphan), but it is a judgment call, see section 4 A5.
8. Out-of-tree consumer: branch `feature/ios-poc` (worktree `.claude/worktrees/ios-poc`) has the command in `src-tauri/src/remote/policy.rs:55` (`Class::Read`), `remote/dispatch.rs:345` (calls `tasks_in_section_inner`), `src-tauri/tests/remote_ws_test.rs:407,410`, `src/tests/lib/app/remote/fake-host.ts:154`. Not on main, so 121 cannot touch it, but merging that branch into main after 121 will conflict or fail to compile. Tell the owner in the delivery comment (memory: iOS PoC lives on its own branch).

---

## 1. Code map

### 1.1 Rust (main crate, `src-tauri/`)

| Site (HEAD) | What | Action |
|---|---|---|
| `src/commands/vault.rs:732-758` | `#[tauri::command] pub async fn get_tasks_in_section_v2(section_tag: String, state)` plus its doc comment (`:732-741`). After 242: arg becomes `section_tags: Vec<String>` (I). | Delete whole item. |
| `src/commands/vault.rs:662-670` | `pub struct SectionTaskCandidate { path, modified_at }`. V: only used by the two helpers below (grep: `:665,679,683,695`, no other file). | Delete. |
| `src/commands/vault.rs:672-688` | `pub fn section_task_candidates`. V: callers are the command (`:751`) and `vault_test.rs:1074,1094,1102,1133`. | Delete. |
| `src/commands/vault.rs:690-730` | `pub fn tasks_in_section(candidates, section_tag, read)`. V: callers are the command (`:754`) and `vault_test.rs`. After 242: takes `&[String]` (I). | Delete. |
| `src/commands/vault.rs:7` | `use crate::vault::parsing::{extract_tasks_from_section, parse_task_line, ...}` | Drop `extract_tasks_from_section` only. `parse_task_line` stays (used `:783`). |
| `src/commands/vault.rs:9` | `use crate::vault::task::{display_name, FileTaskGroup, ...}` | Drop `display_name` (V: only use `:721`, inside `tasks_in_section`). `FileTaskGroup` stays (used by `get_all_tasks_v2`, `:654`). Else `clippy -D warnings` fails on unused import. |
| `src/commands/vault.rs:4,18-20 area` | `NoteEntry`, `debug_log`, `tokio::task::spawn_blocking`, `fs` imports | All have other users (V: `:223,232,570,1763`; `debug_log` 39 uses; `spawn_blocking` `:121,618,1434`). Keep. |
| `src/lib.rs:353` | `commands::vault::get_tasks_in_section_v2,` in `generate_handler!` | Delete line. `ipc-parity.test.ts` then forces the TS side to match. |
| `src/vault/parsing.rs:1717-1768` | `pub fn extract_tasks_from_section` + doc (`:1717-1720`) | Delete. V: only callers are `vault.rs` `tasks_in_section` and tests. Shared helpers `detect_code_fence` (`:1688`), `HEADING_RE` (`:1441`), `parse_task_line`, `extract_tasks` stay: V: `task_lines.rs:7,379,390` uses `detect_code_fence` and `HEADING_RE`; `extract_tasks` (`:1692`) is used by `NoteEntry`. |
| `src/vault/parsing.rs:3048-3090` | 5 unit tests `extract_tasks_from_section_*` under the `// --- extract_tasks_from_section ---` banner (`:3048`) | Delete with banner. |
| `src/vault/parsing.rs:1406` | Comment: "task-specific commands are `get_all_tasks_v2` / `get_tasks_in_section_v2` / `toggle_task_status`" | Drop the middle name (also matched by the acceptance grep). |
| `src/vault/parsing.rs:1437-1441` | Doc of `HEADING_RE`: "Used by `extract_tasks_from_section` ... and by `task_lines`" | Reword to "used by `task_lines`" (plus whatever 074 added, I). |
| `src/vault/task.rs:151` | Doc "Mirrors `tasks.types.ts::FileTaskGroup`" | See A5. |
| `tests/commands/vault_test.rs:1058-1136` | `index_note` helper + 4 `tasks_in_section_*` tests | Delete all. V: `index_note` has no other caller (grep: only `:1059-1115`). After 242, extra tests sit beside them (I): delete those that call the removed helpers too. |
| `tests/commands/vault_test.rs:4,7,8` | imports | Remove `section_task_candidates, tasks_in_section`; whole `use ...parsing::extract_tasks_from_section;`; `FileTaskGroup` from `:8`. Check `VaultIndex`/`NoteEntry`/`TempDir` imports still used (V: yes, `:533..`, `:739`, many `TempDir::new`). |
| `tests/vault_task_test.rs:3` | module doc names `extract_tasks_from_section` | Reword (comment only). |

Predecessor effects on Rust (I): 242 rewrites the command and helper signatures to `Vec<String>`/`&[String]`, maybe `extract_tasks_from_section` too, and adds tests in `vault_test.rs`. 074 adds `TaskHeading`, `NoteEntry.task_headings`, `Task.heading`, a schema bump, and a heading pass "in the same pass as `extract_tasks`". It may reuse or refactor the fence/heading logic next to `extract_tasks_from_section`. So the implementer must re-trace callers at the branch point, not trust this table's line numbers. In particular check that 074 did not make `extract_tasks_from_section` a thin wrapper that other new code calls.

Rust DTO check: no `#[ts(export)]` type is removed or changed (the removed command takes `String`/`Vec<String>` and returns existing `FileTaskGroup`). So no regenerated binding unless A5 is done. `ipc-parity.test.ts` `MIN_COMMANDS = 57` (`:24`) vs 72 registered (V: `generate_handler!` has 72 lines): no change needed.

### 1.2 TS contract and mocks

| Site (HEAD) | Action |
|---|---|
| `src/lib/contracts/commands.ts:105-106` | Delete the entry and its doc line `/** Tasks under the sections tagged ... */` (`:105`). Args type becomes `{ sectionTags: string[] }` after 242 (I). |
| `src/lib/contracts/commands.ts:269` | Delete `get_tasks_in_section_v2: ['sectionTag'],` (becomes `['sectionTags']`, I). `COMMAND_ARGS` keys must equal the registered commands (`ipc-parity.test.ts:209`). |
| `src/lib/contracts/commands.ts:12,104` | `FileTaskGroup` import stays (`get_all_tasks_v2`). |
| `e2e/mocks/tauri-core.ts:162-164` | Delete `handleGetTasksInSectionV2`. |
| `e2e/mocks/tauri-core.ts:483` | Delete the table entry. V: `Handlers = { [K in keyof CommandMap]: ... }` (`:460`), so a stale key is an excess-property error in `pnpm check`. |
| `e2e/mocks/tauri-core.ts:23,158` | `FileTaskGroup` import stays (`handleGetAllTasksV2`). |
| `e2e/mocks/vault-index.ts:489-495` | Delete `getTasksInSection`. V: only caller was `tauri-core.ts:163`. Note its semantics were NOT the heading rule: it matched NOTE-level tags (`entry.tags`), so it never modelled the Rust command. After 115 nothing calls it. |
| `e2e/mocks/vault-index.ts:475-487` | `getAllTasks` stays (`handleGetAllTasksV2`, event-calendar e2e). |
| `src/tests/lib/contracts/ipc.test.ts:91-92` | `// @ts-expect-error sectionTag is required` / `void call('get_tasks_in_section_v2', {})`. With the command gone the line still errors ("unknown command"), so `@ts-expect-error` would still be satisfied and `pnpm check` would stay green, but it would name a dead command and the comment would lie. Replace with another command that has required args, e.g. `toggle_task_status` with `{}`, keeping the comment truthful. Not in the ticket. |

### 1.3 TS Tasks feature

State to assume after the chain (I, from the tickets): 108 adds `hasLoaded`; 242 adds `parseSectionTags`; 110 adds `isTaskOpen`, `statusGlyph`; 234 adds sort-by-path in `buildTaskIndex`, scroll/error fields; 111 adds `TaskRow`, `rows`, `quick`, `visibleRows`, `buildTaskRows(groups, vaultPath)`, deletes `filterCompleted*`, `hasUncheckedDescendants`, `computeTaskStats`, moves `describeTaskRule`/`explainEmptyTasks` to `task-query.logic.ts` over `rows`; 238 deletes `dateFilter`, `TaskDateFilter`, `filterByDate`; 115 rewrites `buildTaskIndex` onto `getVaultEntries()`, `buildTaskRows(entries, vaultPath, overlay)`, and "stops using" `fromV2`, `FileTaskGroup`, `fileTaskGroups`.

| Site (HEAD) | What it is | Action in 121 |
|---|---|---|
| `src/lib/features/tasks/tasks.service.ts:13-48` | `fromV2` (doc `:13-19`, fn `:20-48`) | Delete. After 115 it should be unreferenced; 238 also edits its doc comment (names `filterByDate`), moot once deleted. |
| `tasks.service.ts:9-10` | imports `FileTaskGroup, TaskItem` and `FileTaskGroupV2` | Drop `FileTaskGroup` and `FileTaskGroupV2`. `TaskItem` stays only if `toggleTask`/`setTaskStatus` still type with it (I: yes or `TaskRow`). `pnpm check` decides. |
| `tasks.service.ts:57-86, 88-99` | docs/body of `buildTaskIndex`/`updateSectionTagFilter` that name `get_tasks_in_section_v2` (`:59,72,90`) | 115 rewrites these (acceptance box: "No `src/lib` code calls it any more"). Verify the docs no longer name the command; fix any leftover mention. |
| `src/lib/features/tasks/tasks.store.svelte.ts:1,4,15,21,28` | `fileTaskGroups` state, getter, `setFileTaskGroups`, reset line, `FileTaskGroup` import | Delete state, getter, setter, `reset()` line, and `FileTaskGroup` from the import (the import of `TaskDateFilter` is already gone via 238). |
| `src/lib/features/tasks/tasks.types.ts:19-28` | hand-written `FileTaskGroup` | Delete interface. `TaskItem` (`:4-17`) stays. `TaskDateFilter` (`:31`) already gone via 238 (I); if still there, it is not 121's to remove. |
| `src/lib/features/tasks/tasks.logic.ts:2` | `import type { TaskItem, FileTaskGroup, TaskDateFilter }` | At HEAD `FileTaskGroup` is used by `filterCompleted`, `filterByDate`, `computeTaskStats` (`:59-91`). 111 and 238 delete all three (I). If any survives on the branch, 121 must NOT silently delete it: stop and trace (see A2). |
| `src/lib/features/tasks/TasksView.svelte:47` | only production reader of `tasksStore.fileTaskGroups` (inside `filterByDate(...)`) | 111 replaces with `visibleRows` (I). Expect zero readers at 121 time; verify. |
| `src/lib/app/lifecycle/app-lifecycle.service.ts:408-409` | comment: "...the default section tag makes `get_tasks_in_section_v2` read every note with tasks from disk." | Rewrite so it stays true and names nothing removed. After 115 the real reason the task index is not built at init is that `TasksView` mounts with the tab and fetches on mount; the disk-read clause is simply wrong. Suggested text: "The task index is not built here: its only reader is `TasksView`, which mounts with the Tasks tab and fetches on mount." |
| `src/tests/lib/architecture/ipc-mirrors.test.ts:24-27,99-105` | ALLOWLIST entry + test using it | See 3.7. |
| `docs/agents/indexing-watcher-rules.md:3` | rule 1 list of `*_v2` commands | Remove `get_tasks_in_section_v2` from the list (and its preceding comma). Nothing else in the file names it (V: grep). Rule 2 still lists `TasksView` as a `vaultIndexVersion` consumer: still true after 115. |

Store consumers of `fileTaskGroups` (V, whole `src`): `TasksView.svelte:47`, `tasks.service.ts:76`, tests only otherwise. No `core/` or other feature reads it (grep over `src/lib`).

### 1.4 Test files touched

| File | HEAD references | Expected state after chain | 121 action |
|---|---|---|---|
| `src/tests/lib/features/tasks/tasks.store.test.ts` | `fileTaskGroups` `:10,20,44,52`; `setFileTaskGroups` `:17-21,44` | 111/238/108 rewrite the file (hideCompleted, dateFilter, hasLoaded...) | Delete the `setFileTaskGroups updates groups` test, the `fileTaskGroups` assertions in `starts with default state` and `reset restores defaults`, and the `setFileTaskGroups([{}])` setup line. |
| `src/tests/lib/features/tasks/tasks.service.test.ts` | `fileTaskGroups` at `:69,79-88,100,133,149,153,166,185,291-292,313-314,332,526,530`; `get_tasks_in_section_v2` at `:103-109,202`; `FileTaskGroupV2` type use | 115 rewrites on purpose (acceptance box) | Expect none left. If any remain, they are 115 leftovers; port to `tasksStore.rows`, do not delete coverage. |
| `src/tests/lib/features/tasks/task-toggle-dirty-buffer.test.ts` | `:29` mock returns `[]` for the command, `:144` asserts a refetch happened via either command | 115 rewrites the refetch check | Remove the leftover `|| cmd === 'get_tasks_in_section_v2'` if present. |
| `src/tests/lib/features/tasks/tasks.logic.test.ts` | `FileTaskGroup` import `:9`, builders `:90,109,135,148,170,195` | 111/238 delete the cases with their functions | Expect none; drop the import if only the type remains. |
| `src/tests/lib/features/tasks/TasksView.test.ts` | uses generated `FileTaskGroupV2` builder `:29-34` | 110 replaces the builder with a shared fixture | No hand-written `FileTaskGroup` involved; nothing to do. |
| `src/tests/lib/contracts/ipc.test.ts:92` | see 1.2 | | edit |
| `src/tests/lib/architecture/ipc-mirrors.test.ts` | see 3.7 | | edit |
| Rust: `parsing.rs` inline tests, `tests/commands/vault_test.rs`, `tests/vault_task_test.rs:3` | see 1.1 | | delete / reword |

Tests that must NOT change: `ipc-parity.test.ts` (set equality both sides, floor 57 < 72), event-calendar tests using `FileTaskGroupV2`, `kbapi-firewall.test.ts`, `layer-rules.test.ts`, `feature-cycle.test.ts` (removing symbols adds no import edges), `pure-logic.test.ts`.

---

## 2. Acceptance criteria -> tests

| Criterion | Implemented by | Fails before the change? |
|---|---|---|
| 1. Failing check first: grep lists the sites before, nothing after | A shell check, no test file. Use the widened grep in 3.9. | Yes by construction: it lists the sites before. Record the "before" output in the commit body. |
| 2. `cargo test` passes with removed tests gone, no other test changed | `cargo test --manifest-path src-tauri/Cargo.toml` from the checkout root. | N/A (deletion). Honest limit: this is not red-first. The behaviour being removed has no remaining user, so no failing test is meaningful. The nearest real safety net is `ipc-parity.test.ts` (see below). "No other test changed" is too strict: `vault_test.rs` loses 4 tests (not 1), and the import edits are required. The doc-comment edits in `vault_task_test.rs`/`parsing.rs` are not tests. |
| 3. `ipc-mirrors.test.ts` and the typed command map pass `pnpm check` | `pnpm check` + `ipc-mirrors.test.ts` + `ipc-parity.test.ts` + `ipc.test.ts` | Order experiment that proves the net works: if the TS contract entry is deleted first (before `lib.rs`), `ipc-parity.test.ts` cases `COMMAND_ARGS keys equal the registered commands` and `CommandMap arg and result types match` go red. Use that as the failing-first step: delete `commands.ts` entries first, run `pnpm vitest run src/tests/lib/contracts/ipc-parity.test.ts`, see it fail, then delete the Rust registration and watch it pass. |
| 4. e2e Tasks spec still passes | `bash scripts/e2e.sh` (never run Playwright by hand). | Not red-first. The spec only fills `/section tag/i` with `''` and clears it (V: `tasks-view.spec.ts:17-21,29-32,42-43,69-70,99`), so it does not exercise the removed mock after 115. The mock's `getTasksInSection` also never modelled headings, so removing it cannot change results. |
| (implicit) frontend cleanup has no readers | `pnpm check` (type errors on any remaining `fileTaskGroups` / `FileTaskGroup` / `setFileTaskGroups` / `fromV2` use) and `pnpm vitest run` | Deleting the type first makes `pnpm check` red on every remaining user: that is the failing-first for the TS half. |

No new test is warranted: nothing is added. CLAUDE.md "test-first" does not apply to pure deletion; say so in the commit and rely on the compiler plus parity tests.

---

## 3. Implementation plan (one context window)

Preconditions: worktree off main with 115 merged (so 242, 074, 111, 238 are in). `pnpm install --frozen-lockfile --offline` in the worktree. One heavy command at a time (memory: serial checks; cargo throttled). The diff changes app code (not only tests, docs or copy), so the main session's post-delivery review in CLAUDE.md applies after the relay-lite delivery.

3.0 Re-trace at the branch point (CLAUDE.md "Removing or Refactoring Code"). Run and save output:
`grep -rnE "get_tasks_in_section|tasks_in_section|section_task_candidates|SectionTaskCandidate|extract_tasks_from_section|getTasksInSection" src src-tauri/src src-tauri/tests e2e docs/agents`
`grep -rnE "FileTaskGroup\b|fileTaskGroups|setFileTaskGroups" src/lib/features src/tests/lib/features/tasks src/tests/lib/architecture`
`grep -rn "fromV2" src/lib/features/tasks`
Confirm: no `src/lib` caller of the command (ticket's own first bullet), no reader of `fileTaskGroups` outside tests. If 115 left a reader, STOP and fix 115 rather than deleting under it.

3.1 TS contract first (red step): delete `commands.ts` map entry and `COMMAND_ARGS` entry. Run `pnpm vitest run src/tests/lib/contracts/ipc-parity.test.ts`: expect failure (Rust still registers it). Record.

3.2 Rust: delete in `vault.rs` the block `SectionTaskCandidate` through `get_tasks_in_section_v2` (`:662-758`); fix imports (`:7`, `:9`). Delete `lib.rs:353`. Delete `extract_tasks_from_section` (`parsing.rs:1717-1768`) and its 5 tests plus banner. Fix comments at `parsing.rs:1406`, `:1437-1441`, `tests/vault_task_test.rs:3`. Delete `vault_test.rs:1058-1136` and the three import edits.

3.3 Rust gate: `cargo test --manifest-path src-tauri/Cargo.toml` (throttled, alone). Also `cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets --locked -- -D warnings` (the CI command, `.github/workflows/ci.yml:116`); it will catch the unused imports. If A5 is done, `cargo test` regenerates `src/lib/contracts/generated/FileTaskGroup.ts`; `git status` should show exactly that file changed in `generated/`.

3.4 TS contract/mocks: delete e2e mock handler + table entry + `getTasksInSection`; edit `ipc.test.ts:91-92`.

3.5 Frontend cleanup: delete `fromV2`; `fileTaskGroups` state/getter/setter/reset; hand-written `FileTaskGroup`; fix imports; drop the store tests listed in 1.4. Then `pnpm check` and fix every remaining error by deleting stale references (not by loosening types).

3.6 Comments/docs: lifecycle comment; `docs/agents/indexing-watcher-rules.md` rule 1.

3.7 `ipc-mirrors.test.ts`: the allowlist mechanism is still worth testing, so keep it generic. Smallest change: `const ALLOWLIST: string[] = [];` with the comment "TS-domain types that share a generated name but are not wire mirrors, as `file -> name`. Empty today." and change `findMirrors` to take the allowlist as a parameter defaulting to `ALLOWLIST`; the test `honours the allowlist by file and name` passes its own `['src/lib/features/tasks/tasks.types.ts -> FileTaskGroup']`-style synthetic list (use a neutral fake path, e.g. `src/lib/features/example/example.types.ts -> FileTaskGroup`, so no dead path is named). Alternative (A3): delete the test and the mechanism. Prefer keeping it: one future TS-domain type will need it.

3.8 Gate: `pnpm check` + `pnpm vitest run` (full), then `bash scripts/e2e.sh`.

3.9 Closing greps (all must print nothing):
`grep -rn get_tasks_in_section src src-tauri/src src-tauri/tests e2e docs/agents` (the ticket's, widened to `src-tauri/tests`)
`grep -rnE "tasks_in_section|section_task_candidates|SectionTaskCandidate|extract_tasks_from_section|getTasksInSection|fileTaskGroups|setFileTaskGroups" src src-tauri/src src-tauri/tests e2e docs` (explicit dirs only; do not pass `src-tauri` whole, it holds `target` and `node_modules`)
`grep -rn "tasks.types.ts::FileTaskGroup" src src-tauri/src` (nothing, once A5 is done)
`fromV2` must still match only `collection.service.ts` and `kbapi-firewall.test.ts`.

3.10 Commit(s). CLAUDE.md says one commit per completed task, full-format message (Context, Problem, Solution, Behavior, Files). This is one task, but touching Rust + TS: one commit is fine. It is a `refactor:`/`chore:` type, not `fix:`, so the "fix needs a test" hook is not triggered; still, add a line in the body "removal only, covered by ipc-parity". Stage by path, check `git diff --cached --stat`. Bookkeeping: per memory the closing commit deletes the Issue file; relay-lite handles `.scratch` ledger.

Delivery note to the owner: iOS PoC branch still dispatches the removed command (point 8).

---

## 4. Ambiguities and the most likely reading

A1. "Remove `fromV2`, ... and `tasksStore.fileTaskGroups` with its setter and tests. Trace every caller first." Reading: delete all three; at HEAD `fileTaskGroups` is still the only data path, so this is valid ONLY once 111+115 landed. Do not run 121 early.

A2. Whether `tasks.logic.ts` still imports `FileTaskGroup`. 111 says delete the group-based filters "once nothing calls them" and "check again on the branch". Reading: they are gone. If a leftover exists, port or delete with its test and say so; do not leave a type alive just to avoid the edit.

A3. ALLOWLIST: ticket says "removes its entry". Reading: remove the entry, keep the mechanism, rewrite the self-test with a synthetic allowlist (3.7). Alternative of deleting the mechanism is simpler but loses the guard.

A4. "`cargo test` ... no other test changed." Reading: no test other than the removed ones was edited for behavior; the four helper tests, five `extract_tasks_from_section_*` tests, and import lines go. Stating "1058" as the single test was a miscount.

A5. Fixing the `task.rs:151` doc ("Mirrors `tasks.types.ts::FileTaskGroup`"). Not in the ticket. Reading: do it. It is the orphan this change creates, and the gate is already "both". Cost: the regenerated `generated/FileTaskGroup.ts` JSDoc line changes and must be committed (CI Rust job fails on stale bindings). New text, e.g. "One file's worth of tasks, as returned by `VaultIndex::lookup_all_tasks`." If the owner prefers a pure removal diff, skip it and leave the stale sentence; flag as known debt.

A6. Which Todoist/other code still calls `get_all_tasks_v2`? Not an ambiguity for 121 (it stays), but a reader may think "tasks" commands all go. They do not. V: event-calendar (`event-calendar.service.ts` tests mock it), e2e `handleGetAllTasksV2`.

A7. `TaskItem` ownership: 115 says 121 deletes it; 121 says it stays. Reading: stays (see 0.6).

A8. The ticket's "Failing check first" is a grep, which satisfies CLAUDE.md only loosely. Reading: acceptable for deletion; the parity red step in 3.1 is the real one.

---

## 5. Risks

R1. Early execution: if 115 left any `fileTaskGroups` reader (TasksView explain/empty state in 108 uses `groups = fileTaskGroups` until 111 moves it), the view breaks silently at runtime only if types are loose. `pnpm check` should catch it. Mitigation: 3.0.
R2. Wrong deletion by name: `fromV2` (collection) and generated `FileTaskGroup`/`FileTaskGroupV2` (event calendar, mocks, fixtures, `get_all_tasks_v2`). A search-and-delete would break the calendar. Delete symbol-by-symbol from the files listed.
R3. Shared Rust helpers: `HEADING_RE`, `detect_code_fence`, `parse_task_line`, `extract_tasks` are used by `task_lines.rs` and indexing. 074 may add more users. Delete only the functions in 1.1.
R4. Clippy: unused imports (`extract_tasks_from_section`, `display_name`, `FileTaskGroup` in `vault_test.rs`) fail `-D warnings` in CI even if `cargo test` passes. Run clippy locally.
R5. `ipc-parity.test.ts` / `ipc.test.ts` / `ipc-mirrors.test.ts` coupling (sections 1.2, 3.7). Typed `Handlers` map in e2e mocks: stale key is a `pnpm check` error (V `tauri-core.ts:460`).
R6. ADR-0034 getters: removing `fileTaskGroups` removes no derived getter. But 111's `visibleRows` `$derived` reads `rows`, not `fileTaskGroups` (I); verify no `$derived` in the store still reads the deleted state (module-level derived would throw at compile or read undefined).
R7. e2e selectors: none involved; the removal is mock-only. The e2e mock `getTasksInSection` was never a faithful heading rule (note-level tags only), so any e2e that passed through it relied on a distinct behavior; V: no spec reaches it after 115.
R8. Layer/feature-cycle/pure-logic tests: removing types and functions cannot add edges. Low risk. `layer-baseline.json` untouched.
R9. IPC contract: removing a command is a breaking change for any other client of the Tauri backend. V on main: only `src/lib` (via `call`) and the e2e mock. Out of tree: `feature/ios-poc` (0.8). Also `.claude/worktrees/update-tauri-to-v3` contains copies but is a worktree of main-line work: a rebase there will conflict on `lib.rs`, `vault.rs`, `parsing.rs`, `tauri-core.ts` (low importance).
R10. Doc rot: `docs/agents/indexing-watcher-rules.md` rule 1 (to edit). Other docs/help do not name the command (V). `.scratch` tickets 074 and 108 mention it; those are history/bookkeeping, not edited here (108's component test in its acceptance mentions `get_tasks_in_section_v2` returning `[]`; the 115 rewrite replaces it).
R11. Claims in the ticket the code contradicts: (a) one Rust test to remove (it is four plus a helper); (b) line numbers (all stale); (c) "commands.ts entries (`:82`, `:227`)" are at `:106`, `:269`; (d) "ALLOWLIST entry removal" alone is not enough; (e) acceptance grep would miss helper names; (f) lifecycle comment's claim ("the default section tag makes the command read every note") becomes false after 115, not just stale in naming.
R12. Search/index rules (`indexing-watcher-rules.md`): nothing in rules 9-12 constrains deleting a read command. Rule 1's list is the only edit. The removed command was the only disk re-read in the Tasks path; after 115 the view depends on the 2 s throttled snapshot (115's overlay handles it); not a 121 risk.

---

## 6. Size

S, as the ticket says. About 14 files edited, almost all deletions (~230 Rust lines, ~60 TS lines), plus one small test rewrite (ipc-mirrors) and one doc line. Fits one context window comfortably. Longest wall-time items: `cargo test` + `clippy` (throttled to one cargo build at a time) and `bash scripts/e2e.sh`. Risk is dominated by being run before 111/115 land, not by the edit itself.

What was not checked: nothing was executed (no cargo, vitest, check, e2e). Predecessor state is inferred from ticket text only; line numbers will shift. The `feature/ios-poc` impact was read from its worktree files, not built.
