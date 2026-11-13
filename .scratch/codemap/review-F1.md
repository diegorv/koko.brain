# Review F1: audit bugs B1, B2, B3, B9

Scope: the uncommitted diff on `feat/codemap` (`.github/workflows/codemap.yml`, `.scratch/codemap/spec.md`, `scripts/codemap/{model,render,rust}.mjs`, `src/tests/lib/architecture/codemap.test.ts`). Probes are in `/tmp/codemap-review-F1/`.

Verdict: no blocker, no major. The four fixes do what the audit and its Decisions section ask. Every cited real case is fixed in `/tmp/codemap-out-F1`. Six minor findings follow.

## What was checked

- **Tests fail on the old code.** I copied the HEAD generator scripts to `/tmp/codemap-review-F1/head/scripts/` and ran the new test file against them. All 9 new or changed fixture tests fail on HEAD: the B1 edges/calls and `by`, the B2 ref (both tests), the B3 main/examples (both), the B9 file chains, the B9 pair counts, and the F1 inputs with examples. The only new test that passes on HEAD is the negative test ("keeps `import` … skips field access …"), as expected. In the worktree, `pnpm vitest run src/tests/lib/architecture` passes (292 tests) and `pnpm check` reports 0 errors.
- **B1.** `q callers src-tauri/src/db/semantic_repo.rs:insert_chunk` now has 2 callers (HEAD: 0). Probe `b1.mjs` matched every `db::<x>_repo::<fn>` site in `src-tauri/src` against the call rows. Only 6 of 52 sites are missing a row, and none of them are calls: 2 are `pub use` lines and 4 are `#[cfg(test)]` code in `commands/semantic.rs:1677-1720`. `history_repo`, `fts_repo` and `semantic_repo` symbols now have `by` lines, and the module card `pub` count for `db` went from 23/59 to 57/59.
- **B2.** These now return `ref` rows at the cited lines: `read_kv`, `read_links`, `read_sections` (todoist.rs:29/35/41), `extract_title` (search_index.rs:287), `get_entry_mtimes` (:71), `HEADING_RE` (task_lines.rs:390), `ID_RE` (:300), `SYNC_LOG_LIMIT` (todoist.rs:74), `COMPOSER_WINDOW_LABEL` (lib.rs:138), `LastCaptureSignature` (lib.rs:62), `NoteRecord` (vault.rs:1000/1058/1080), `TaskLineEdits`/`TaskLinesWriteResult` (vault.rs:804-864) and `VAULT_INDEX_UPDATED_EVENT` (9 prod callers). Probe `imports.mjs`: the only Rust `by … import` users left are the 72 `generate_handler!` entries in lib.rs, which is the intended handler rule. Probes `refs.mjs` and `fp.mjs`: all 442 `ref` rows were checked, and none sits on a field label, a lifetime or a shadowed generic. Probe `dups.mjs`: no row is repeated beyond its textual occurrences on the line.
- **B3.** `q callers src-tauri/src/lib.rs:run` gives `main.rs:5 in main lexical`. The main.rs card has `imp main.rs:5 -> lib.rs run` and out2 23 files. eval_metrics.rs shows `in0 t0` with `test src-tauri/examples/retrieval_eval.rs example …`. Inputs went from 1622 to 1623, the only new input is `src-tauri/examples/retrieval_eval.rs`, and its `.json` neighbour is not read. No `fx`, `ev` or `ipc-call` line changed.
- **B9.** The phantom lines are gone: db in2, quick_capture in2/out2, vault in2 and commands in2/out2 are all `-`. Probe `b9.mjs` recomputed `moduleIn2Pairs`/`moduleOut2Pairs` for all 60 modules with a separate brute-force file-chain computation and found 0 differences. Probe `subset.mjs` showed that the new module reach is a strict subset of HEAD's: 0 entries appear only in the new output and 368 phantom entries were removed, most of them in TS modules (`src/lib/components` in2 went from 10 modules to 0).
- **Determinism.** Two renders to separate folders are byte-identical. The added lines use no `localeCompare`, `Date`, `os.` or `Math.random`. Added lines are indented with tabs, and the new exported or helper functions have JSDoc.
- **Budgets.** `files/src-tauri/src/commands/semantic.rs.md` is 40,510 bytes, 450 bytes under the 40 KB calls-split threshold. That is by design: the split rule moves `calls` out when it is crossed, so it is not a failure.

## Findings

1. **minor: the `ref` scan has false positives that the spec does not list as accepted.** Spec F16 (spec.md:455) accepts only a shadowing `let`. Probe `probe.mjs` (fixture "strings/comments/generics/struct fields/shadow") with `use crate::a::{f, K, T};` gives:
   - a generic parameter, `pub fn s2<T>(x: T) -> T`: 3 rows `b.rs:4 in s2 -> a.rs:T ref`, and `by a.rs:T <- b.rs:4 in s2 ref +2`.
   - a lifetime, `fn s3<'f>(x: &'f str)`: 2 rows `-> a.rs:f ref`.
   - a struct field declaration, `pub struct S { pub f: u8 }`: `b.rs:5 in (module) -> a.rs:f ref`.
   - a field-init key, `S { f: 1 }`: `b.rs:9 in s6 -> a.rs:f ref`.

   None of these occurs in the real repo today (`fp.mjs`: 0 suspects). The cause is the regex at `scripts/codemap/rust.mjs:872`, which has no `'` lookbehind and no field-label guard. Fix: add `(?<!')` to the lookbehinds and `(?!\s*:(?!:))` as a lookahead, so an identifier followed by a single `:` (a field name or binding label) is not a value use. Add the lifetime and field cases to the "skips field access, other paths and longer words" test. Either add generic parameters to the spec's accepted false positives next to `let`, or skip names declared in the enclosing fn's `<…>`.

2. **minor: no test covers the shape of the real B1/B2 cases, a value use through a submodule alias path.** Every cited real case is written `db::with_db(db::semantic_repo::clear_all_chunks)` or `db::fts_repo::get_entry_mtimes` passed as a value: a `ref` that goes through a submodule and adds an edge at its line (`rust.mjs:848-849`, `callShaped` false with `hit.file !== aliasFile`). The tests cover a call through a submodule (`db::repo::insert()`) and a value through a direct alias (`a::K`), but not both together. A renamed module alias (`use crate::db as store; store::repo::insert()`) is also untested. Probe `probe.mjs` ("alias edge cases") shows both work today: `b.rs:3 -> db/repo.rs read`, `call b.rs:3 in r1 -> db/repo.rs:read ref`, and `b.rs:4 -> db/repo.rs insert lexical`. Fix: add `'pub fn r() { db::with_db(db::repo::insert); }'` and a `use crate::db as store;` line to the "a module alias path into a submodule" fixture (`codemap.test.ts:1590`). Expect the edge at that line and a `ref` row.

3. **minor: the `rowed` set duplicates `seen`.** At `rust.mjs:811-827`, `row()` already drops a second row at the same `(offset, target)`. The ref pass (`rust.mjs:871-874`) can only collide with an earlier row of the same local name at the same offset. That is the same target, so `seen` already drops it. Alias-scan rows sit after `::`, and the ref regex excludes that with `(?<!::\s*)`. Fix: remove `rowed` and its `rowed.add(offset)` and call `row(m.index, id, 'ref')` directly. The tests stay green because `seen` does the work.

4. **minor: the INDEX blind-spot line is stale for crate examples.** `render.mjs:318` still says `'Test and e2e files: graph nodes for test lines and q --tests answers, no cards.'`, but spec F1 (spec.md:304) now says "Test files, e2e files and crate examples are graph nodes … with no card". `/tmp/codemap-out-F1/INDEX.md` is what an agent reads. Fix: change it to `Test, e2e and crate example (src-tauri/examples) files: …`.

5. **minor: `q --tests` headers count an example as a test, but the card does not.** `node scripts/codemap.mjs q importers src-tauri/src/search/eval_metrics.rs --tests` prints `total 1 (prod 0, tests 1)`, while the card says `in0 t0`. `q callers --tests` (`query.mjs:715-719`) also lists example call rows under tests, because `model.isTest` includes examples. The Decision forbids counting examples only in `in<n>`/`t<n>`, so this is not a violation. It is still an unstated inconsistency in the section 9 `q` table. Fix: document in the spec `q` table that `--tests` includes `src-tauri/examples`, or report examples separately in the header (`tests 0, examples 1`).

6. **minor: `moduleIn2`/`moduleOut2` are now kept only for the tests.** `model.mjs:427-428` exposes both `moduleIn2(m)` and `moduleIn2Pairs(m)`, and likewise for `out2`. The renderer uses only the `Pairs` form (`render.mjs:825-826`), and the `moduleIn2` callers are the tests (`codemap.test.ts:2619-2622`). Two APIs now do one thing. Fix: drop `moduleIn2`/`moduleOut2` and have the tests assert `[...m.moduleIn2Pairs(x).keys()]`, or keep them and say in the JSDoc that they exist for the tests.

## Not checked

- I did not run cargo or E2E, as the stage requires.
- I did not re-check bugs outside F1. B4 (`by` drops further sites in other enclosings) still shapes the `+<n>` counts on the new `ref`/`lexical` rows.
- main.rs is the binary crate, so in it `crate::` and bare top-module paths do not name the library. The resolver still maps them to the library. That was true before this diff and is not touched by it.

## Resolution

1. Fixed. The `ref` regex now excludes a preceding `'` (lifetime) and a following single `:` (struct field name, field-init key). A new test covers a lifetime, a field declaration and a field-init key next to a real `ref`. Generic parameters named like an imported item stay a known false positive, now listed next to `let` in spec F16.
2. Fixed (test only, behavior already correct). The submodule alias fixture gains `use crate::db as store; store::with_db(store::repo::insert)` and expects the edge, the `ref` call row and the `by ... ref` line.
3. Fixed. `rowed` removed; `row()` dedupes on `(offset, target)` and the ref pass calls it directly. The existing tests stay green.
4. Fixed. The INDEX blind-spot line names crate examples; a test asserts it and the golden `INDEX.md` is updated.
5. Fixed by documenting. The spec `q importers` row now states that `--tests` counts `src-tauri/examples` files while the card's `t<n>` does not.
6. Fixed. `moduleIn2` / `moduleOut2` removed from the model and its JSDoc; the test asserts through `moduleIn2Pairs` / `moduleOut2Pairs`.
