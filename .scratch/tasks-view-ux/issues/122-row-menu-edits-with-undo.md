# 122: A guarded Rust command rewrites a task line's text

**Origin:** `tasks-view` Issue 09, moved here on 2026-11-08. Its PRD, raw evidence and closed siblings stay in `.scratch/archived/tasks-view/`. On 2026-11-12 the status part moved to Issue 241 (owner decision), and the Issue numbers here were translated to open-itens numbers. The same day the deep dive (`.scratch/tasks-view-ux/research/deep-dive/SUMMARY.md` 122, `dossier-122.md`, `cross-rust-ipc.md` F1, F7-F10) corrected the locator description and split the Issue: this file is 122a (Rust command, shared token patchers, contract, e2e mock); Issue 246 (122b) adds Due and Priority to the row menu on top of it. Issue numbers in this text keep the open-itens numbering: the Tasks view Issues live in `.scratch/tasks-view-ux/issues/`, the others (030, 085, 151, 198, 204, 205 and the rest) in `.scratch/open-itens/issues/`.

**What to build:** Issue 246 sets a task's due date and priority from the Tasks row menu (PRD assumption A7). That needs a write that rewrites one task line's text, on any task line, anchored or not. This Issue adds that write, the pure token patchers it is fed with, and the plumbing around them. It changes no UI.

Why `write_task_lines` (`todoist-bisync` Issue 03, `src-tauri/src/vault/task_lines.rs`) does not serve: it locates a line by its Todoist anchor (the id signifier U+1F194 followed by `td-...`) and the exact whole line. Its `lineNumber` mode only stamps a first anchor onto an unanchored line, and the new line must carry it (`task_lines.rs` `validate`, `locate_unanchored`). A row can supply neither the anchor nor the whole line: `TaskItem` keeps the indent as a count, drops the list marker and folds `x` and `X` into one status (`parsing.rs` `calculate_indent`, `map_checkbox_char`). Most of the owner's tasks carry no anchor.

**Rust** (the locator is the guarded line-number command, decided by the owner on 2026-11-12, see Notes; names below are fixed here and used by Issue 246)
- A command `write_task_text { vaultRoot, relPath, lineNumber, expectedText, expectedStatus, newText }` in `src-tauri/src/commands/vault.rs`, next to `write_task_lines`, with a `write_task_text_inner(idx, ...)` the tests call, registered in `src-tauri/src/lib.rs` `generate_handler!`.
  - Confinement as `write_task_lines_inner` does it: `validate_vault_path`, refuse a root other than `VaultIndex::vault_root()`, resolve with `confined_note_path` (so a `..` or absolute `relPath` is an `Err`).
  - Guard as `toggle_task_status_inner` does it: `parse_task_line(line, lineNumber)` on that line; the write proceeds only when it is a task and `task.text == expectedText` and `task.status == expectedStatus`. Otherwise nothing is written and `stale` is true (line 0, past the end, not a task, text or status differs).
  - `newText` holding `\n` or `\r`, or blank after trimming (it would turn the line into a non-task), is an `Err`, checked before reading the file.
  - `newText == expectedText`: no write, `updateResult.changed` false, `stale` false.
  - The new line is the original line up to the start of `TASK_RE` / `ORDERED_TASK_RE` group 3, kept byte for byte (indent characters, `-`/`*`/`+` or `3.` marker, the box character including `X`), followed by `newText`. Add `pub fn set_task_text_in_content(content: &str, line_number: usize, new_text: &str) -> String` beside `set_task_status_in_content` in `parsing.rs`, built the same way.
  - Write with `write_atomic`, update the index with `update_note_in_index_inner`, and emit `vault-index-updated` after the lock is dropped, only when the content changed (copy `toggle_task_status`).
- It returns a new DTO, because Issue 244's overlay stores only text and status while the due and priority chips read `metadata`, which only Rust parses:

  ```rust
  #[ts(export)]
  pub struct TaskTextWriteResult {
  	pub updated_content: String,
  	pub update_result: UpdateResult,
  	pub stale: bool,
  	/// `parse_task_line` of the written line; `None` when nothing was written.
  	pub task: Option<Task>,
  }
  ```

  `cargo test` regenerates `src/lib/contracts/generated/`: commit the new binding (CLAUDE.md rule 6, IPC DTO change).
- CRLF notes: `Task.text` keeps a trailing `\r` there, and a `newText` holding `\r` is refused, so a due or priority edit on a CRLF note fails with an error. That limit is accepted; do not add CRLF handling.

**Contract and e2e mock**
- `src/lib/contracts/commands.ts`: a `CommandMap` entry with a doc comment and the `COMMAND_ARGS` entry (camelCase; `ipc-parity.test.ts` compares names and type text against the Rust signature).
- `e2e/mocks/vault-index.ts`: a `writeTaskText` method mirroring `toggleTaskStatus` (replace `TASK_LINE_RE` group 3 on the line, write `virtualFS`, `this.update(...)`), and its handler plus table entry in `e2e/mocks/tauri-core.ts` (the `HANDLERS` map is exhaustive over `CommandMap`, so `pnpm check` fails without it). `handleWriteTaskLines` keeps throwing: no spec drives the Todoist sync.

**Shared token patchers** (one home, no third mirror of the Rust token rules)
- Move the text-level cores of `setDueDate` and `setPriority` out of `src/lib/features/todoist-sync/task-line.logic.ts` into a new pure `src/lib/utils/task-tokens.ts` (a `utils` file: no state, no store, no service, no Tauri; `pure-logic.test.ts` checks it), together with `PRIORITY_EMOJIS`, the due and priority regexes and `insertToken`:

  ```ts
  export function setDueToken(text: string, date: string | null): string;
  export function setPriorityToken(text: string, emoji: PriorityEmoji | null): string;
  ```

  The Todoist functions stay as thin `patchText` wrappers over them, so `todoist-sync`'s API and its `task-line.logic.test.ts` stay unchanged and green.
- Semantics (Todoist's today): an existing due is replaced in place and `null` removes every due; the first priority signifier is replaced in place and every other one is dropped, `null` removes all; a missing token is inserted before the Todoist anchor, else at the end before trailing whitespace.
- One change: when the text has no anchor but ends in a block id (`trailingBlockId`), insert before the block id, not after it, so `^abc` stays last and keeps working. This also changes where a Todoist pull inserts a token on such a line. If an existing Todoist test pins the old placement, stop and report instead of editing it.
- `features/tasks` imports this file, not `todoist-sync` (no new feature pair).

**Docs that name the task-write commands:** add `write_task_text` to `docs/agents/indexing-watcher-rules.md` rules 2 and 6 (the emitters and the `task` source), and to the comment lists in `src/lib/core/filesystem/task-write.service.ts` and `src/lib/core/filesystem/note-change.service.ts`. Rule 9 says every IPC path is absolute: add one line naming `write_task_lines` and `write_task_text` as the confined, vault-relative exceptions.

**Blocked by:** 244

**Blocked by (origin):** added from the Issue text: audit-2026-11-05 134 (the open-root check, already in `write_task_lines`). 114 dropped (resolved 2026-11-09); 112 replaced by 241. 085 dropped on 2026-11-12: it hardens `read_files_batch`, which this Issue never calls. 241 is reached through 244.

**Status:** resolved

**Answered:** owner, 2026-11-12: split approved, 122 = 122a (this Rust Issue, gate Both), 246 = 122b (frontend Due and Priority in the row menu, blocked by 122 and 241). Run order: 122 runs after 244, with 121 and 129 also blocked by 244 (SUMMARY X7). Status changes moved to Issue 241 (synthesis Q7 (a)). Still open: the locator (deep-dive Q5), proposal in Notes; it stays `needs-triage` until the owner decides. Owner, 2026-11-12 (Q5): the row edit finds its line with a new guarded command by line number, expected text and expected status, as `toggle_task_status` does, and returns the re-parsed task; it never stamps a Todoist anchor.

**Gate:** both: `cargo test --manifest-path src-tauri/Cargo.toml`, then `cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets --locked -- -D warnings` (the CI command; relay-lite does not run it, so the build step runs it before its last commit), from the checkout or worktree root, + `pnpm check` + `pnpm vitest run`. No e2e: no spec calls the new command until Issue 246, and the mock is covered by the vitest test below.

- [x] Failing tests first. `src/tests/fixtures/task-line-edits.fixture.json`, shape `{ "cases": [ { "name", "text", "op": { "kind": "due", "date": "YYYY-MM-DD" | null } | { "kind": "priority", "priority": "highest" | "high" | "medium" | "low" | "lowest" | null }, "expected" } ] }`, drives `src/tests/lib/utils/task-tokens.test.ts` (`setDueToken` / `setPriorityToken` of `text` equals `expected`). Cases: no due yet; replace a due; a due with no space after the signifier; clear a due, and clear when none (expected equals text); a due with a variation selector U+FE0F; set a priority on text with none; replace one; two priority signifiers present; priority `null`; text ending in a block id; text ending in a Todoist anchor and a block id; text with a recurrence; a wikilink holding `#`; scheduled, start and created dates and tags untouched; trailing whitespace; text that is only a tag.
- [x] Rust parity, `src-tauri/tests/vault_task_line_edits_parity_test.rs`, loading the fixture with `include_str!` as `vault_natural_sort_parity_test.rs` does: for each case, `parse_task_metadata(expected)` gives the op's due date or priority (`None` for `null`), and every other field (scheduled, start, created, recurrence, id, depends on, on completion, tags, description) equals `parse_task_metadata(text)`'s. This test checks hand-written strings, so it is red only against a wrong `expected`: write one deliberately wrong case first, see it fail, then correct it, and say so in the review.
- [x] Rust, `write_task_text_inner` with a tempdir vault (copy the `vault(files)` helper of `src-tauri/tests/vault_task_lines_test.rs` so `vault_root()` is set): writes `newText` on an unanchored `- [ ] call Ana` line (file bytes and the indexed task's due date change, `stale` false, `task` is the re-parsed task); keeps a tab indent, `*` and `+` markers, an ordered `3. [ ]` and an `[X]` box byte for byte; expected text differs, expected status differs, line 0, line past the end and a non-task line each give `stale` true and unchanged bytes; `newText` with `\n`, with `\r`, or blank gives `Err`; a root other than the open vault and a `..` or absolute `relPath` give `Err` with bytes unchanged; `newText == expectedText` writes nothing (`changed` false, `stale` false). Red first: the function does not exist.
- [x] Rust: all-or-nothing staleness, the open-vault refusal and the line-break refusal of `write_task_lines` are covered by `src-tauri/tests/vault_task_lines_test.rs` (todoist-bisync Issue 03). They do not cover the new command; the criterion above does.
- [x] `pnpm check` and `src/tests/lib/contracts/ipc-parity.test.ts` pass with the new `CommandMap` and `COMMAND_ARGS` entries; the regenerated `TaskTextWriteResult.ts` is committed.
- [x] `src/tests/e2e/vault-index-task-text.test.ts` (vitest, imports the mock as `src/tests/e2e/tauri-fs.test.ts` does): the mock's `writeTaskText` rewrites the line's text in `virtualFS`, keeps the prefix, and reports stale for a differing expected text.
- [x] `src/tests/lib/features/todoist-sync/task-line.logic.test.ts` passes with no test changed.
- [x] Targeted checks also include `src/tests/lib/architecture/{pure-logic,layer-rules,feature-cycle}.test.ts` (a new `utils` file and new imports from `todoist-sync`); `feature-cycle-baseline.json` gains no pair.

## Notes

- **Size:** M (Rust command and DTO, fixture and parity test, the patcher move with the Todoist tests as its safety net, contract, mock).
- **Locator, decided by the owner on 2026-11-12 (deep-dive Q5): option (a) below, the guarded command; no anchor is stamped.** (a) this command, guarded like `toggle_task_status` (line number, expected text, expected status), which rebuilds the line from its own prefix and works for every task line. The alternative, (b), stamps a `td-` anchor through `write_task_lines`' `lineNumber` mode first; it marks the line as Todoist-linked, collides with the Obsidian Tasks dependency id and ADR-0037 (a copied anchor freezes a link), and still needs the whole expected line, which the row cannot rebuild. The deep dive and the UX research (`synthesis.md` Q8) recommend (a), plus the shared patcher home in `utils` (Q8 (c)) over importing from `todoist-sync` (Q8 (d)). If the owner picks (b), this Issue shrinks to the patcher move and fixture, and Issue 246 changes with it.
- Issue 246 calls `write_task_text`, reads `TaskTextWriteResult.task` to overlay the row's `metadata` in Issue 244's overlay, and feeds it text built with `setDueToken` / `setPriorityToken`.
- The recurrence regex in Rust swallows a following block id into the recurrence text (`RECURRENCE_RE`); inserting before the block id keeps that behavior as it is. Do not change it here. A token inserted between a `🔁` and that block id would leave its removed gap inside the parsed recurrence (`every week  ^abc`), so on a text with a block id and a `🔁`, `insertToken` puts the token before the `🔁` instead (review finding 1, fixture cases "... with a recurrence ending in a block id").
- `feature/ios-poc` does not dispatch this command; nothing to tell that branch.

## Comments

- 2026-11-12: deep dive applied and split (SUMMARY 122, `dossier-122.md`, `cross-rust-ipc.md` F1, F7-F10). The locator gap is described as the code has it (`lineNumber` only stamps an anchor; the row cannot rebuild the whole line), "needs no new Rust command" is gone, and the proposal is a new guarded `write_task_text`. Because 244's overlay lands first, the command returns the re-parsed task in a new `TaskTextWriteResult` DTO. The patchers move to `src/lib/utils/task-tokens.ts` with the block-id rule; `setPriority` replaces in place (no append). Indexing rules 2, 6 and 9 get the new command. Blocked by 244 instead of 241 and 085. Clippy joins the gate. The service, menu items, Undo, date dialog, e2e and help text moved to Issue 246 (122b).

- 2026-11-12: owner answered Q5 (guarded line-number command, no anchor); Status ready-for-agent.

- 2026-11-12: delivered from `issue/122-row-menu-edits-with-undo`. Guarded `write_task_text` Rust command with `TaskTextWriteResult` DTO, token patchers moved to `src/lib/utils/task-tokens.ts`, shared fixture with TS and Rust parity tests, IPC contract and e2e mock. Review round 1 APPROVED, review round 2 APPROVED (fix round ran between them). Full suite at 220f170fc: `pnpm vitest run` exit 0 (629 files, 16242 passed, 54 skipped, 1 todo), `cargo test` exit 0 (1466 passed).
