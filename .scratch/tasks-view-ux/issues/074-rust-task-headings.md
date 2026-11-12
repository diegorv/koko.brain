# 074: Rust records task headings

**Origin:** `tasks-view` Issue 11, moved here on 2026-11-08. Its PRD, raw evidence and closed siblings stay in `.scratch/archived/tasks-view/`. Bare Issue numbers in the text below use that feature's numbering; `priority-2026-11-08.md` in this folder maps them to the numbers here.

**What to build:** Heading rules and heading grouping need to know which headings sit above each task. Today only `get_tasks_in_section_v2` knows, by re-reading every task note from disk on each refetch (`src-tauri/src/commands/vault.rs:736-753`, `parsing.rs:1700-1750`). Record headings at index time instead, without copying a heading chain into every task (PRD "Task model", decision B6):

- `TaskHeading { level: u8, text: String, line: u32 }` in `src-tauri/src/vault/task.rs`, `#[ts(export)]`.
- `NoteEntry.task_headings: Vec<TaskHeading>` (`src-tauri/src/vault/entry.rs:187` area): the note's headings in order, empty when the note has no tasks.
- `Task.heading: Option<u32>`: index into `task_headings` of the nearest heading above the task, `None` before the first heading.
- Collected in the same pass as `extract_tasks` (`parsing.rs:1676`). The frontmatter block is skipped: `entry.rs:249` passes the full content, and `HEADING_RE` (`parsing.rs:1440-1441`) would otherwise read a YAML comment `# note` as a heading. Skip the frontmatter by counting its lines, not with `strip_frontmatter` (`parsing.rs:76`), so `TaskHeading.line` stays a 1-based line of the whole file like `Task.line_number`. Code fences are skipped as `parsing.rs:1715-1732` does. Heading text is stored trimmed, without the `#` run.
- `pnpm check` type-checks `src` and `e2e` (`tsconfig.json:23`), so every `NoteEntry` and `Task` object literal in tests and mocks needs the new fields (about 11 files hold `NoteEntry` literals, `grep -rl 'wordCount:' src/tests e2e`, and 8 hold `Task` literals, `grep -rl 'checked: true,' src/tests e2e`), unless the fields are made optional on the wire with `#[serde(default)]` plus `#[ts(optional)]` as `TaskMetadata` does (`task.rs:86-88`). Pick one and say which in the commit.
- No file in `src/lib` outside `contracts/generated/` may declare a type named `TaskHeading` or `TaskHeadingV2` (`src/tests/lib/architecture/ipc-mirrors.test.ts`).
- `INDEX_SCHEMA_VERSION` goes one above its value on main at merge time (re-check after any rebase, even a clean one) (`src-tauri/src/vault/index_cache.rs:18`; 5 to 6 today, 6 to 7 if Issue 26 bumped it first): one full index rebuild per vault on first launch. Tell the owner in the delivery comment. If 11 and 26 ship in the same release, the owner sees one rebuild.
- `FileTaskGroup` and `get_all_tasks_v2` carry `Task.heading` too; the calendar ignores it.
- The e2e mock parser (`e2e/mocks/vault-index.ts:150-182`) produces the same fields.
- `NoteEntryV2` reaches QueryJS only through `buildKBPage`, which maps fields by hand (`queryjs.logic.ts:125-130`), so `KBPageV1` and the firewall snapshot do not change.

**Blocked by:** 242

**Status:** ready-for-agent

**Answered:** PRD B6 (a): Rust records headings; the one-time index rebuild is accepted (owner, 2026-11-06).

**Gate:** both: `cargo test --manifest-path src-tauri/Cargo.toml`, then `cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets --locked -- -D warnings` (the CI command; relay-lite does not run it), + `pnpm check` + `pnpm vitest run`, plus `bash scripts/e2e.sh` because the e2e mock changes. Run cargo from the checkout or worktree root.

- [ ] Failing Rust test first: a note with frontmatter holding `# comment`, `## A #to-list`, a task, `### B`, a task, a fenced block holding `# not a heading` and `- [ ] fenced`, then `## C` and a task. `task_headings` lists A, B, C with levels and lines; the tasks point at A, B and C; the frontmatter and fence lines produce nothing.
- [ ] A note without tasks has empty `task_headings`. A task before the first heading has `heading: None`.
- [ ] A cache written at schema 5 is rejected and rebuilt, following `cached_inner_discards_a_schema_3_snapshot_and_reparses` in `src-tauri/tests/commands/vault_test.rs:972-990` (`index_cache.rs` itself only tests that a mismatched snapshot still deserializes, `:165-177`; the caller check is `commands/vault.rs:1350`). That test's `assert_eq!(INDEX_SCHEMA_VERSION, 5)` (`:974`) and `assert_eq!(snap.schema_version, 5)` (`:985`) change on purpose to the new value.
- [ ] Parity: a fixture `src/tests/fixtures/task-headings-parity.fixture.json` (note text plus expected JSON, the convention of `natural-sort-parity.fixture.json`, loaded in Rust with `include_str!` as `src-tauri/tests/vault_natural_sort_parity_test.rs:11` does) is read by the Rust test and by a new `src/tests/e2e/task-headings-parity.test.ts` that runs the e2e mock parser over it, so the e2e mock cannot drift. `parseTasks` is module-private in `e2e/mocks/vault-index.ts:150`; export it, or drive it through the exported `vaultIndex.update` (`:566`). `src/tests/e2e/tauri-fs.test.ts` already imports `e2e/mocks` under vitest; import the mock the same way (Issues 242 and 122 put their mock tests in the same folder).
- [ ] The regenerated bindings under `src/lib/contracts/generated/` are committed, and `kbapi-firewall.test.ts` passes unchanged.

## Notes

- **Size:** M.
- Deep dive, 2026-11-12 (`.scratch/tasks-view-ux/research/deep-dive/SUMMARY.md` 074 list; `cross-tests-relay.md` H3; `cross-rust-ipc.md` F1, F15):
  - Make the new fields optional on the wire: `#[serde(default)]` plus `#[ts(optional)]` on `NoteEntry.task_headings` and `Task.heading`, as `TaskMetadata` does in `task.rs`. This settles the "Pick one" bullet above. The Tasks view Issues keep adding `Task` and `NoteEntry` literals (the shared fixture `src/tests/fixtures/tasks.fixture.ts` from Issue 110, `entryV2` in `src/tests/fixtures/vault-entries.fixture.ts`) while this Issue may be in flight, and a chain branch that rebases cleanly over required fields would merge without a type check. Issue 115 reads both fields as optional.
  - Never run beside Issue 242 or 121: all three edit `parsing.rs` near `extract_tasks` and the section scan, and `e2e/mocks/vault-index.ts`. Launch it between two chain Issues, after 242 has landed.
  - Add clippy to the Rust gate: after `cargo test`, run `cargo clippy --manifest-path src-tauri/Cargo.toml --all-targets --locked -- -D warnings` (the CI command) from the checkout or worktree root.

## Comments

- 2026-11-12: the deep dive added three Notes: the new wire fields are optional (`#[serde(default)]` plus `#[ts(optional)]`), the Issue never runs beside 242 or 121, and clippy joins the Rust gate. Issue 115 (the TS heading rule) is now blocked by this Issue alone.
- 2026-11-12: consistency review: Blocked by 242 (was none), so the "never beside 242" rule holds when Issues launch in parallel (121 already waits on this Issue through 115 and 244); clippy moved into the Gate line; the parity test lives in `src/tests/e2e/` next to `tauri-fs.test.ts`, which already imports `e2e/mocks`.
