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

2026-08-19 - implemented. Fixed with the comma-free ID atom that `## How` specifies; no
deviation from the issue's scope contract.

**Red-green evidence.** New unit test `parse_task_metadata_depends_on_csv_with_spaces` in
`parsing.rs`'s test module, sitting next to the two pre-existing depends_on tests, input
`task ⛔ id1, id2, id3 📅 2026-01-01`. Red against the unmodified `\S+` atom
(`cargo test --manifest-path src-tauri/Cargo.toml --lib depends_on`):

```
running 3 tests
test vault::parsing::tests::parse_task_metadata_depends_on_single_id ... ok
test vault::parsing::tests::parse_task_metadata_depends_on_csv_no_spaces ... ok
test vault::parsing::tests::parse_task_metadata_depends_on_csv_with_spaces ... FAILED

---- vault::parsing::tests::parse_task_metadata_depends_on_csv_with_spaces stdout ----
thread 'vault::parsing::tests::parse_task_metadata_depends_on_csv_with_spaces' panicked at
src/vault/parsing.rs:2931:9:
assertion `left == right` failed
  left: Some(["id1"])
 right: Some(["id1", "id2", "id3"])

test result: FAILED. 2 passed; 1 failed; 0 ignored; 0 measured; 569 filtered out
```

`left: Some(["id1"])` is the reported bug verbatim: the greedy `\S+` captured `id1,`, the
optional repeat group had no comma left to anchor on, and `id2` / `id3` were dropped without a
diagnostic. Green after the fix: same three tests, `3 passed; 0 failed`. Full Rust gate green
too - `cargo test --manifest-path src-tauri/Cargo.toml`, every target `0 failed`, the lib suite
that owns `parsing.rs` at 572 passed.

The red run was produced by reverting ONLY the atom (`[^,\s]+` back to `\S+`) on the otherwise
final tree, so the test is anchored on the regex change itself and cannot be satisfied through a
side channel. The file was then restored from a byte-identical copy (`diff` clean) and the green
run re-executed on the restored bytes.

One honest gap in the printed evidence: the red run panics on the FIRST assertion, so the
`assert_eq!(m.description, "task")` line never got to print its own failure. That second symptom
is still covered by the test (it is red-relevant, since with the old atom `text.replacen(&w, "",
1)` removes only `⛔ id1,` and leaves ` id2, id3` in `text`, which `parsing.rs:1594` then assigns
to `metadata.description`), it just is not separately visible in the captured output.

**What discovery re-derived.** Every claim in `## What` was re-checked against the current tree
by symbol, since the issue's own line numbers are stale:

- `DEPENDS_ON_RE` is the single definition of the pattern and has exactly one consumer, the
  `// DependsOn` block in `parse_task_metadata`. That consumer still splits on `,`, trims and
  filters empties, which is why the old capture `id1,` collapsed to `["id1"]` instead of
  surfacing an empty element.
- Extraction order inside `parse_task_metadata` is Dates -> Priority -> Recurrence -> ID ->
  DependsOn -> OnCompletion -> Tags, then `metadata.description = text.trim()`. This matters for
  the review findings below: only OnCompletion and Tags run after DependsOn and can therefore be
  affected by what the depends-on match consumes.
- The impact path the issue cites is intact: `TaskMetadata.depends_on` ->
  `src/lib/features/tasks/tasks.service.ts:40` -> `TaskItem.metadata.dependsOn`
  (`src/lib/types/vault-v2.types.ts:274`). `metadata.description` additionally feeds
  `src/lib/features/tasks/todoist-bridge.logic.ts:43` as the Todoist task content, so symptom 2
  leaks the dependency IDs into synced Todoist titles, not just the local task list.
- The TS mirror `task-metadata.logic.ts` the issue mentions is already gone (issue 40 landed).
  Rust is the only live parser, so no second fix site.
- The `## How` fix table was re-verified end to end: the two broken rows now produce the expected
  IDs, and the three already-working rows (`id1,id2,id3`, `id1 , id2`, single `abc123`) are
  unchanged - the two pre-existing tests cover the latter and were kept, not replaced.

**Adversarial review verdict: findings (2, both minor, both accepted as-is).** The reviewer could
not refute the fix on the issue's 5-row contract; both findings are about malformed input outside
that contract, where the new regex differs from the old one.

1. *Malformed comma placement regresses versus the old regex.* `task ⛔ id1,` now yields deps
   `["id1"]` with description `task ,` (the stray comma reaches `metadata.description` and, via
   `todoist-bridge.logic.ts`, Todoist titles); the old regex produced description `task`.
   `task ⛔ ,id1` now fails to match at all, so deps is `None` and the whole `⛔ ,id1` stays in
   the description; the old regex returned `["id1"]`. Both confirmed empirically in the
   reviewer's probe. Trailing-comma is the stronger of the two because the old behaviour there
   was fully correct.
2. *A dangling comma makes the repeat group absorb the following token.* `task ⛔ id1, id2, 🏁
   delete` captures the flag emoji as a third dependency ID and loses `on_completion`. The
   reviewer surfaced an undisclosed same-mechanism variant that is a more plausible human typo:
   `task ⛔ id1, #work` now yields deps `["id1", "#work"]` and tags `[]`, where the old regex gave
   deps `["id1"]` and tags `["work"]` - a tag silently dropped from the tag index plus a bogus
   dependency injected. Only OnCompletion and Tags are exposed (see the extraction order above);
   dates, priority, recurrence and id all extract before DependsOn and are unaffected.

No code change was made for either. Both are garbage-in shapes, neither was covered by a test
before or is named by this issue, and the reviewer's own recommendation is that guarding them
belongs in a separate issue with its own red tests.

**Out of scope, worth its own issue if anyone wants it.** A follow-up guarding malformed
comma placement would need to decide three things together, which is exactly why it is not a
rider on this commit: (a) an optional non-captured trailing separator cleans the trailing-comma
leak without touching the capture, but does nothing for the leading-comma or absorption cases;
(b) excluding `#` and the signifier emoji codepoints from the repeat atom's first character
fixes the absorption cases, but IDs may legitimately contain `#`, so that is a deliberate format
decision, not a regex tweak; (c) any of it needs its own red tests, since no existing test
exercises malformed depends-on input at all.
