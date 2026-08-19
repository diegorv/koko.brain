# Issue 51: `⛔ id1, id2` silently drops every dependency after the first

Status: ready-for-agent
Phase: unplanned
Source: issue 40 (2026-08-19) - re-filed before deleting `task-metadata.logic.ts`, whose test file was
this bug's only tracked anchor

Blocked by: none

Note on the re-file instruction: issue 40 and `plan-2026-08-12.md:153` both say to file this bug
against `src-tauri/src/vault/parsing.rs:1310-1316`. That range is `map_checkbox_char` and has
nothing to do with depends-on. The real anchors are the ones cited below.

Note on line numbers: every `parsing.rs` cite below is as of `4c697f99`, before issue 40's comment
rewrites land. Issue 40 shifts them by +3 (`DEPENDS_ON_RE`) to +5 (the consumer, the description
line, and the two unit tests), so anchor by symbol rather than by number.

## What

`DEPENDS_ON_RE` (`src-tauri/src/vault/parsing.rs:1281-1287`) is built as:

```rust
r"{}\s*(\S+(?:\s*,\s*\S+)*)"   // emoji_pattern(DEPENDS_ON_EMOJI) + this
```

The leading `\S+` is greedy over non-whitespace, so on the natural writing style
`⛔ id1, id2` it swallows the trailing comma and captures `id1,`. The optional
`(?:\s*,\s*\S+)*` group then has no comma left to anchor on and matches zero times, so the
overall match succeeds at `⛔ id1,` and everything after the comma is never seen.

The consumer at `src-tauri/src/vault/parsing.rs:1542-1556` splits the capture on `,`, trims,
and filters empties:

```rust
let ids: Vec<String> = v.split(',').map(|s| s.trim().to_string()).filter(|s| !s.is_empty()).collect();
```

so `["id1", ""]` collapses to `["id1"]`. **`id2` is dropped silently** - no error, no warning.

Two observable symptoms, not one:

1. `TaskMetadata.depends_on` loses every ID after the first.
2. The removed span (`caps.get(0)`, `⛔ id1,`) is shorter than what the user wrote, so the
   leftover ` id2` stays in `text` and ends up in `metadata.description`
   (`parsing.rs:1582`) - the dependency IDs leak into the task title.

Impact path: `parse_task_metadata` -> `TaskMetadata.depends_on` -> serialized to TS at
`src/lib/features/tasks/tasks.service.ts:40` -> `TaskItem.metadata.dependsOn`
(`src/lib/types/vault-v2.types.ts:274`).

### Verified empirically

Offline scratch crate, `regex = "1"` (the version `src-tauri/Cargo.toml:37` pins, resolved to
1.13.1 in `Cargo.lock`), same `emoji_pattern` helper, same pattern, same consumer logic:

| input | current capture | current ids | ids with the suggested fix |
|---|---|---|---|
| `task ⛔ id1, id2` | `id1,` | `["id1"]` | `["id1", "id2"]` |
| `task ⛔ id1, id2, id3 📅 2026-01-01` | `id1,` | `["id1"]` | `["id1", "id2", "id3"]` |
| `task ⛔ id1,id2,id3` | `id1,id2,id3` | `["id1","id2","id3"]` | unchanged |
| `task ⛔ id1 , id2` | `id1 , id2` | `["id1","id2"]` | unchanged |
| `blocked ⛔ abc123` | `abc123` | `["abc123"]` | unchanged |

So only the comma+space form is broken; no-space and space-before-comma both work. The scratch
crate was deleted after the run.

The TS mirror at `src/lib/features/tasks/task-metadata.logic.ts:59-61` had the identical pattern
and additionally leaked an empty-string dependency (`["id1", ""]`) because it has no
`.filter(|s| !s.is_empty())`. That file is deleted by issue 40; Rust is the only live parser.

### Why existing coverage misses it

The only two `depends_on` unit tests are
`parse_task_metadata_depends_on_csv_no_spaces` (`src-tauri/src/vault/parsing.rs:2897-2908`, input
`id1,id2,id3`) and `parse_task_metadata_depends_on_single_id` (`parsing.rs:2910-2914`). Neither
uses a comma followed by a space.

## How

- Regression test FIRST (red): a `parse_task_metadata` unit test in `parsing.rs`'s test module with
  input `task ⛔ id1, id2, id3 📅 2026-01-01`, asserting `depends_on == Some(["id1","id2","id3"])`
  **and** that `description` no longer contains any of the IDs. Confirm it fails on the current
  regex before touching it.
- Suggested fix: make the ID atom comma-free so the greedy run cannot eat the separator:

  ```rust
  r"{}\s*([^,\s]+(?:\s*,\s*[^,\s]+)*)"
  ```

  Verified against all five rows above: fixes the two broken cases, leaves the three working ones
  byte-identical.
- Keep the three passing shapes covered - add the comma+space case, do not replace the existing
  no-space test.

## Gate

- Rust surface: `cargo test --manifest-path src-tauri/Cargo.toml`.
- Stage only the files related to this issue, verify with `git diff --cached --stat`.
- One commit, full commit format (Context, Problem, Solution, Behavior, Files with line ranges).

## Comments
