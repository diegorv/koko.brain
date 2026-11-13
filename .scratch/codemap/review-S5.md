# Review S5: render.mjs, codemap.mjs, tests 32 to 47

Scope: the uncommitted diff on `feat/codemap` (`scripts/codemap/render.mjs`, `scripts/codemap/model.mjs` reverse hook, new `scripts/codemap.mjs`, `src/tests/lib/architecture/codemap.test.ts` additions, `src/tests/lib/architecture/codemap-golden/`).

What I ran:
- `pnpm vitest run src/tests/lib/architecture/codemap.test.ts`: 148 passed.
- `pnpm check`: 0 errors, 0 warnings.
- `node scripts/codemap.mjs --out /tmp/codemap-out-S5`: exit 0, 723 files (644 cards, 4 `.calls.md` splits), 1.9 s. `--stale --out /tmp/codemap-out-S5` exits 0.
- Probes under `/tmp/codemap-review-S5/`: `caps.mjs` (budgets, tabs, trailing spaces, empty lines, `sections:` rule, tag census), `det.mjs` (normal vs reversed `buildModel` on the real repo: 0 diffs over 723 files), `pointers.mjs` (1324 locations that test 40 does not check: card `reg`, `store`, `ipc-call` both ends, `ev` both ends, `ipc/*` rust/reg/keys/callers, DTO rust/e2e, event const/ts, wiring sink/read-by/registered-at, `effects/*`; only 2 hits, both `tauriFetch` aliases, so fine), `by.mjs` (by lines path-ordered, one per user file, none from the own file), `kinds.mjs` (mixed-kind call pairs), `enc.mjs`, `unres.mjs`. `fx` lines on cards and in `effects/*` match one to one (531 each), and `effects/*` are sorted by (sink, file, line).
- I did not run the in-place build on this branch: the fixture test 47 covers the refusal, and running it here would write `codemap/` into the repo if the refusal were broken.

Every file is within the caps today. INDEX is 88 lines and 6.4 KB. The INDEX text matches the section 10 template line for line (diffed against spec lines 540 to 590).

## Findings

1. **major: `stores.md` lists a test-fixture store, and its card path points at a card that does not exist.**
   Evidence: `/tmp/codemap-out-S5/stores.md:46` `store src/tests/fixtures/derived-sync.svelte.ts:19 derivedSyncStore get 3 set 0 do 2 readers 0 writers 0 card codemap/files/src/tests/fixtures/derived-sync.svelte.ts.md`. No `files/src/tests/` exists. INDEX says `stores 44`, but there are 43 production store files. `renderStores` (`scripts/codemap/render.mjs:879`) and the INDEX count (`render.mjs:957`) use `model.stores` unfiltered. Test 41 only checks store file → store, not the reverse. Test 33 skips `codemap/...` path tokens, so the dangling card path passes.
   Fix: drop test files from stores in `renderStores` and from the INDEX `stores` count (`!model.isTest(st.file)`), or in `collectStores`. Add a store under `src/tests/` to the golden fixture. Extend test 33 so every `codemap/files/<f>.md` token printed in output (`stores.md` `card`, `more calls`) names a file in the rendered map.

2. **major: two outputs are close to a hard cap, so ordinary code growth will fail the build on main.**
   Evidence: `wiring.md` is 47,992 of 49,152 bytes (97.6 %, spec estimate 14 KB). One registry, `profiling.ts:configureProfiling`, takes 4.7 KB with 20 `fired-by` lines plus a `more`. `ipc/commands.md` has a 965-char line (`ipc:get_all_vault_entries_v2`, 8 callers + `more` + doc). `ipc/dto.md` and `ipc/events.md` have 910-char lines. With 8 caller sites of about 90 chars, a `more` line with 8 groups and a 160-char doc, an `ipc` line can pass 1000 chars, so the caps do not bound it under 1000. `checkBudgets` throws (`render.mjs:971`), and `codemap.yml` would then fail on every push until someone edits a constant. A few more observer registrations or one more caller is enough.
   Fix: lower `WIRING_CAP` (`render.mjs:269`) to about 10, and cap `read-by`. For `ipc/*`, lower the in-line caller/emit cap to 5 or 6, or cap the doc field shorter. Add a real-repo test that every file stays at or below about 85 % of each cap, so the PR that eats the headroom fails, not the main-branch CI job.

3. **minor: component `by` lines never use the `mount` kind; they point at the import line.**
   Evidence: all 170 component `by` lines on the real repo are `import` (143) or `ref` (27). Golden `files__src__lib__features__tags__TagsView.svelte.md` has `by src/lib/features/tags/TagsView.svelte:default <- src/routes/+page.svelte:2 in (script) import`, while the same file mounts it at `src/routes/+page.svelte:6` (its `mounted-at` line). Section 6 lists `mount` as a `by` kind, and test 10 says the location is the first use site. The cause is upstream: `usersBySymbol` does not take F17 mounts. The golden file now locks the wrong text in.
   Fix: feed mounts into the users map as kind `mount`, enclosing `(markup)`, at the `<X` line, then regenerate the golden file.

4. **minor: signatures are not copied verbatim; ` | ` becomes ` / ` in 476 `sym`/`local` lines.**
   Evidence: `files/src/lib/features/tags/tags.service.ts.md` `fn updateTagSort(mode: 'name' / 'count'): void`, `theme-editor.logic.ts:246 ... ): string / null`, `theme.logic.ts:78 ... Partial<T> / undefined`. `excerpt` (`render.mjs:301`) applies `field` everywhere. Section 13.6 says code excerpts stay verbatim. Section 6 limits the ` | ` → ` / ` rewrite to docs in the three `ipc/*` files. `/` is a TS operator, so the rewritten type reads as wrong code. Test 32's rule ("no `|` outside the `| doc` suffix") forces the rewrite, so the spec contradicts itself here.
   Fix (owner/spec call): keep signatures verbatim. The doc suffix is still unambiguous as the first ` | ` after ` L<span>[ dto:X]`, so test 32 can split there. Rewrite ` | ` only inside docs.

5. **minor: the module-card `card ~<k>k` loop can oscillate and leave the card disagreeing with `modules.md`.**
   Evidence: `renderModuleCard` (`render.mjs:791-799`) re-renders until k is stable, at most 4 times. `"0.9"` is 2 chars longer than `"1"`. A card whose bytes without the number are 2847 or 2848 alternates 0.9 → 1 → 0.9 → 1. After the 4th pass the card text was rendered with `0.9`, while the returned `line` (and so `modules.md`) says `~1k`. The same happens at every `N.9`/`N+1` boundary. Today all 60 cards agree (checked), but this depends on the data. It also contradicts section 5's "one pass, no re-render".
   Fix: render once with a fixed-width k field, or define k as the estimate of the card without its own `module` line and render that line last.

6. **minor: some `more` hints name `q` commands that cannot answer them.**
   Evidence: DTO `returned-by`/`arg-of` overflow prints `q ipc dto:<Name>` (`render.mjs:154-155`), but `q ipc` takes a command (section 9). The card `out2` overflow prints `q deps <file>`, which lists direct deps, not two hops (`render.mjs:658`). The module `in2` overflow prints `q impact <module> --depth 2`, but `impact` takes a file or symbol (`render.mjs:766`).
   Fix: point each hint at a section 9 command whose argument kind fits (for example `q importers dto:X`, `q impact <file> --depth 2`), or drop the hint. When query.mjs lands, add a test that every `q <cmd> <arg>` printed in the map parses.

7. **minor: `--stale` labels only untracked files as "changed inputs" when no commit touched INDEX.**
   Evidence: `node scripts/codemap.mjs --stale` in this worktree prints `changed inputs: scripts/codemap.mjs`, but `scripts/codemap/model.mjs`, `scripts/codemap/render.mjs` and `codemap.test.ts` are modified too. `changedInputs` (`scripts/codemap.mjs:117`) returns only the `ls-files --others` list when `git log -- codemap/INDEX.md` is empty.
   Fix: with no INDEX commit, say so ("no committed codemap/INDEX.md") and list `git diff --name-only HEAD` plus untracked, or list nothing.

8. **minor: the in-place refusal compares `resolve()` strings, so a case-variant or symlinked `--out` writes in place off main.**
   Evidence: `scripts/codemap.mjs:172-175` refuses only when `outAbs === resolve(root, 'codemap')`. On case-insensitive APFS, `--out CODEMAP` (or a symlink to `<repo>/codemap`) gets past the branch check.
   Fix: compare `realpathSync` of the target, or of its nearest existing ancestor joined with the rest, case-folded on darwin. Or compare `dev`/`ino` when the folder exists.

9. **minor: the Rust card `ipc-in` section is ordered by command name, and an overflow `more` line lands inside its group.**
   Evidence: golden `files__src-tauri__src__commands__notes.rs.md` `## ipc-in` lists `notes.service.ts:19` before `:15`. `cappedXlang` (`render.mjs:563-576`) groups by command name and gives the `more` line `line: list[0].line`, so after the line sort of `effects` it lands right after the group's first `ev` line. Section 13 orders card facts by line.
   Fix: sort `ipc-in` by (line, text) after capping, and give the `more` line the group's last shown line, so it follows the group.

10. **minor: format leftovers.**
    - `imp` names are capped at 8 with `,+<n>` (`render.mjs:316`; 3 real lines, e.g. `src/lib/types/vault-v2.types.ts:18 -> src/lib/contracts/index.ts type:JsonValue,...,+9`). This is not the section 5 `more` form, and a grep for a dropped name on the importer card misses it. Fix: print every name (the line cap still bounds it) or end with a proper `more` hint.
    - `sections: none` on `wiring.md`, `effects/disk-read.md`, `effects/reactive.md` (`render.mjs:341`) carries no information. Fix: omit the line when the file has no `##` headings, or have the spec allow it.
    - The module card `## effects` uses `fx-count` and an invented `ipc-count` tag, one fact per line. The spec example uses one `·` line with `ipc-call`. This is arguably better, but the spec and the INDEX tag list need syncing (the spec tag table lacks `fx-count`, `ipc-count`, `layer`, `rule` and `debt`).

11. **minor: tests that would pass on broken behavior.**
    - Test 33 does not check `codemap/...` paths in output, so finding 1 passes.
    - Test 40 `imp` only requires the line to contain `import`/`export` (`codemap.test.ts:3587`), not that it lies inside the statement's range. The listen check accepts any `on(` substring (`:3597`), which matches `function(`. Test 40 does not check `reg` card lines, `store` lines, ipc keys/callers, DTO e2e or wiring locations at all. My `pointers.mjs` found them correct today, so add those checks to the test.
    - Test 37's reverse hook (`model.mjs:211-213`) only reverses file order; per-file lists stay in order. `callLines` takes `kind` from the first row of an (enclosing, target) pair (`render.mjs:531`). 10 real pairs mix kinds (e.g. `vault-entries.logic.ts` `patchEntriesSnapshot -> byPath` ref@17, call@22; `event-calendar.service.ts` `acquireCalendarClock -> tick` call@312, ref@313). Any reordering of `uses` would change output, and the hook cannot detect it. Fix: pick the kind of the minimum-line row explicitly, and reverse per-file use lists in the hook too.

12. **minor: test git fixtures inherit `GIT_DIR`/`GIT_WORK_TREE`/`GIT_INDEX_FILE`.**
    Evidence: the `git()` helper (`codemap.test.ts:2675`) and `gitOut` pass the parent environment. Under a git hook or `git rebase --exec`, `git init`/`commit --allow-empty`/`checkout -b main` in tests 39 and 47 would act on the real repository (an extra commit, a branch switch). No installed hook runs vitest today (checked `.git/hooks/pre-commit`).
    Fix: run the helper with `env` minus every `GIT_*` variable (and the same for the locale `spawnSync`).

13. **minor (upstream, visible in S5 output): Rust `cmd` items have no `by` lines from their `generate_handler!` paths.**
    Evidence: `files/src-tauri/src/commands/vault.rs.md:30` `imp src-tauri/src/lib.rs:351 -> src-tauri/src/commands/vault.rs get_all_tags_v2`, but the `sym ...:638 cmd get_all_tags_v2` line has no `by`. F16 says item importers get `by` lines, and the edge already names the item. Same in golden `notes.rs` (`get_tags`, `save_note`).
    Fix: in `analyzeRust` users, record the lib.rs bare-path leaves that name an F12 item, as the `use` leaves already are. Then regenerate the golden file.

Counts: 0 blockers, 2 majors, 11 minors.

## Resolution

1. fixed: `renderStores` and the INDEX `stores` count take production stores only (`productionStores`); the golden fixture gains `src/tests/fixtures/fixture.svelte.ts` with a store, a golden test asserts `stores.md` lists only `notesStore`, and test 33 now checks that every printed `codemap/<path>` names a rendered file.
2. fixed in part: in-line lists (`ipc/*` callers, keys, emits, listens, DTO lists, `entry` importers) cap at 5 with a `more` hint naming at most 3 groups, `WIRING_CAP` is 10 and also caps `read-by`; longest line now 808 chars. A new real-repo test asserts 15 % headroom under every cap. `wiring.md` stays at 45.9 KB (93 %): its size comes from the number of registries, not from a list (caps 10/6/4 give 45.9/44.2/41.8 KB), so the test holds it to 95 % and the layout (for example `wiring/<layer>.md` shards) is left to the owner.
3. fixed: `usersBySymbol` takes the F17 mounts as rows of kind `mount`, enclosing `(markup)`, at the `<X` line; golden `TagsView.svelte` now shows `+page.svelte:6 in (markup) mount`, with a golden test for it and for `TagRow`.
4. rejected for now (owner/spec call): section 13.6 (excerpts verbatim) and test 32 ("no `|` outside separators and the `| doc` suffix") conflict; keeping ` / ` keeps one parse rule for every line until the spec picks one.
5. fixed: the module card renders once without its number to measure `~<k>k`, then once with it; card and `modules.md` always agree. New test with a fixture that reproduced the mismatch (`~0.9k` on the card, `~1k` in `modules.md`).
6. fixed: DTO `returned-by`/`arg-of` hints say `q importers dto:<Name>`; card `out2` and module `in2`/`out2` overflow print `+<r> modules` with no `q` hint (no section 9 command answers them); card `in2` keeps `q impact <file> --depth 2`. Tests for both.
7. fixed: with no commit of the INDEX, `--stale` prints `no commit holds codemap/INDEX.md; changed inputs since HEAD:` and lists `git diff --name-only HEAD` plus untracked inputs. New fixture-repo test.
8. fixed: the in-place check also compares the real path of each folder's nearest existing ancestor, lowercased, so `--out CODEMAP` and a symlink to `<repo>/codemap` are refused off main. New test.
9. fixed: `ipc-in` is sorted by (line, text) after capping, and a capped group's `more` line takes its last shown line, so it follows the group. New test (commands declared out of name order, 13 emits of one event).
10. `imp` names: fixed, every name is printed (spec section 6 has no cap for them); new test. `sections: none`: rejected, section 6 requires line 3 on every file over 100 lines. Module-card `fx-count`/`ipc-count` lines: rejected, one fact per line follows section 6; the spec's tag table and example need the sync, left for the spec update.
11. fixed: test 33 as in 1; test 40 now requires a TS `imp` line to start an import/export statement or hold `import(`, matches listen sites on `on(`/`listen(` as a call, and checks card `reg`, `store`, `stores.md`, ipc keys and callers, event const and ts, DTO rust and e2e, wiring sink/read-by/registered-at and `effects/*` locations. `callLines` takes the kind of the earliest site explicitly. The hook does not reverse per-file use lists: `extractUses` sorts its rows by a full key before returning, so its input order cannot reach the output.
12. fixed: the test `git()` helper and the locale `spawnSync` drop every `GIT_*` variable, and so does `gitOut` in `scripts/codemap.mjs`.
13. fixed: a `generate_handler!` entry in `lib.rs` is an `import` user of its command (enclosing `run`), still not a call, so no `run -> cmd` edge comes back (review S3 item 2); the S3 test now asserts that user. Golden `notes.rs` regenerated.
