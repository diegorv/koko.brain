# Review S6: query CLI (tests 48 to 53), removals, codemap.yml, pointer rows

Scope: the uncommitted diff in `.claude/worktrees/architecture-deterministic` (`scripts/codemap/query.mjs`, `scripts/codemap.mjs` `q` dispatch, `scripts/codemap/render.mjs` exports and `fileCalls`, `src/tests/lib/architecture/codemap-query.test.ts`, `codemap-fixture.ts`, the section 12 removals and edits, `.github/workflows/codemap.yml`, `CLAUDE.md`, `AGENTS.md`).

Checks run:
- `pnpm vitest run src/tests/lib/architecture/codemap-query.test.ts`: 21 passed.
- `pnpm check`: 0 errors. `pnpm vitest run` (whole suite): 634 files, 16734 passed, 54 skipped.
- `actionlint .github/workflows/codemap.yml`: clean. `bash -n scripts/release.sh`: ok. The filter line on a sample `git log --oneline` drops `abc1234 chore(codemap): ...`, keeps `chore(codemap-ish)`, and gives an empty string for an all-bot range, so the empty-check still aborts.
- Probes in `/tmp/codemap-review-S6/` against the real repo: `cards.mjs` (`q file` against `renderMap` for all 644 cards: 0 mismatches; the 4 split cards return every `call` line with `--section calls`; no `--section` output is over 30,000 chars), `edges.mjs` (0 symbol-graph edges touch test files), `enclosing.mjs`, `typeimpact.mjs`, `objsym.mjs`. Running four queries under `LC_ALL=tr_TR.UTF-8 TZ=Pacific/Kiritimati` gave the same bytes. Query wall time is about 2 s.
- Removals: `docs/architecture/` (70 files), `scripts/architecture-map.mjs`, both graphify files, `architecture.yml`, `.graphifyignore` and `architecture-map.test.ts` are gone. `git grep` finds no `graphify`, `architecture-map` or `docs/architecture` in tracked files outside `.scratch/` and ADR-0003. The `discoverModules`, `moduleOf`, `fileRole` and `.git` safety tests survive in `codemap.test.ts`, and `handlerEntries` replaces `handlerCommands`. The `.gitignore`, `.gitattributes`, `docs/README.md` and `CLAUDE.md` row match section 12 and section 3 byte for byte.
- No `localeCompare`, `Date` or `os.` in `query.mjs`. Indentation is tabs, and every new export has JSDoc.

## Findings

1. **major: 173 enclosing names that the map prints as `in <name>` cannot be queried.** Section 4 says that `in <name>` means `<that file>:<name>` and that "the CLI accepts both forms". Test 51 requires every symbol in CLI output to exist. `Query.symbolId` (`scripts/codemap/query.mjs:362-370`) accepts only IDs in `ix` (symbols, F2 locals, object and store members, Rust items) or a scope name. F4e rule 7 enclosings (top-level `const X = …` that is not an arrow), class methods and similar names are rejected.
   Evidence: `enclosing.mjs` finds 2917 production enclosing IDs on `call`/`by`/`fx` rows, and `q calls` rejects 173 of them. Among them: `src/lib/core/editor/editor.service.ts:debouncedSave` (the `fx … timer-wrap.debounce … in debouncedSave` of known fact 43), `tags.service.ts:debouncedTrigger`, `tauri-listeners.service.ts:scheduleRefresh`, `callout-field.ts:CalloutFoldWidget.toDOM` and `live-preview.ts:BLOCK_EXTENSIONS`. `node scripts/codemap.mjs q calls src/lib/features/tags/tags.service.ts:debouncedTrigger` exits 1 with `no match … did you mean: …buildTagIndex`. Test 51 passes only because its fixture runs print no such name.
   Fix: in `symbolId`, also accept `<file>:<name>` when `name` is the enclosing of any production use, effect, Rust call, registry site or IPC caller in that file. Build that set once next to `ix`, and add the names to the bare-name index. Add a fixture `const t = debounce(() => g(), 300)` and assert that `q calls <file>:t` and `q sink timer --up 1` resolve it. Extend test 51 to resolve every `in <name>` token it sees.

2. **major: `EVENT_NAMES.KEY` and `*_EVENT` names are not accepted as ID arguments outside `q event`.** Section 9 says: "ID arguments accept every form in section 4; … `ipc:`, `event:` and `dto:` IDs; `EVENT_NAMES.KEY` and `*_EVENT` names". `resolve()` (`query.mjs:379-412`) handles only the `event:` prefix. As a result, `q callers EVENT_NAMES.VAULT_INDEX_UPDATED` exits 1 with `no match`. Worse, `q callers VAULT_INDEX_UPDATED_EVENT` resolves to the Rust const item `src-tauri/src/events.rs:VAULT_INDEX_UPDATED_EVENT` and prints `total 0 … none (no static reference found…)`, although the event has 9 emits and 1 listener. `flow` is affected the same way.
   Fix: when `kinds` includes `event`, map `EVENT_NAMES.<KEY>` and a `*_EVENT` const name to `event:<wire name>` before the symbol lookup, as `COMMANDS.event` does at `query.mjs:856-857`. Add fixture asserts for `q callers EVENT_NAMES.INDEX_UPDATED` and `q callers INDEX_UPDATED_EVENT`, each equal to `q callers event:index-updated`.

3. **major: `q impact` and `q callers` print "none (no static reference found)" for 357 non-ui exported symbols that have production importers.** This mostly hits types and interfaces. `impactPreds`/`callersOf` (`query.mjs:550-570`) follow only `model.uses`. Type-only importers appear in `model.users` (`by … import`) but not in `uses`, so the blast radius of a type change is reported as empty.
   Evidence: `typeimpact.mjs` finds 2004 non-ui symbols with production `by` users, and `impact --depth 1` says `none` for 357 of them. One example is `q importers src/lib/core/editor/editor.types.ts:EditorTab`, which lists 6 production importers, while `q impact` on the same ID prints `none`. Others are `contracts/commands.ts:CommandMap`, `CommandArgs`, `CommandResult` and `contracts/events.ts:EventMap`. Evaluation question "what is affected if `fs.logic.ts` changes an export" depends on this.
   Fix: in `impactPreds` for a symbol, add each `model.users` row of kind `import` that has no use row from the same file. Emit it as a `by` line with via `via-import`, and continue from that importer file (file node, so the next hop is its importers). Add a fixture interface imported by two files and assert depth 1 and depth 2.

4. **minor: scope IDs that do not exist are accepted.** `symbolId` returns any `<file>:<scope>` whose name matches the scope regex (`query.mjs:368`). `q impact 'src/lib/app/AppShell.svelte:$effect@999'` exits 0 and lists the `mount src/routes/(app)/+layout.svelte:185 AppShell` as if the scope were real. Section 9 says an unknown argument exits 1.
   Fix: accept a scope only when it appears as an enclosing in that file (the same set as finding 1), or `(module)`/`(script)`/`(markup)` when the file has that region.

5. **minor: `q sym <obj.method>` rejects a name and suggests the same name.** Object methods have `text: null` in `ix` (`query.mjs:329`), so `sym` filters them out, but `byName` still holds them. `q sym appEditorHost.resolveLink` gives `no match for 'appEditorHost.resolveLink'; did you mean:\nappEditorHost.resolveLink` with exit 1.
   Fix: give object methods a printable line (for example the enclosing object's `sym` line, or a `mem`-like line with the method's location), or drop text-less names from the `sym` suggestion pool.

6. **minor: `q impact --depth` above 6 is clamped silently.** `parseArgs` lets `depth` go to Infinity (`query.mjs:205-209`), and `impact` applies `Math.min(…, 6)` (`:725`), so `--depth 9` prints depth-6 output with nothing to say so. `--up` above 3 is a usage error, which is inconsistent.
   Fix: validate `--depth` per command (1 to 6 for `impact`), the same way `--up` is validated.

7. **minor: overlapping arguments give wrong empty answers.** `bfs` returns `[]` when a start node already passes the goal. `flow` then prints `no flow within depth 12` (`query.mjs:827-828`), for example `q flow src/lib/features/tags src/lib/features/tags/tags.service.ts`. `path A A` prints `none (no static reference found…)`.
   Fix: when the start already meets the goal, print a single `same node` row (or exit 0 with `total 0` and a clear `A is B` line). Add one assert.

8. **minor: test 53 and the known-fact asserts are looser than the spec, so they would pass after a regression.** Spec test 53 names `editor.service.ts:9`, `app-lifecycle.service.ts:7`, `tags.service.ts:3` and `TypesNavigator.svelte:25`. The test matches `\d+` (`codemap-query.test.ts:562-568`). The `updateLayout` assert (`:592-594`) accepts any AppShell writer line, so `:93` alone passes it even if the markup writer at `:220` were lost. Line `:589` drops `:192`. The four known-fact queries are not timed ("each query's wall time logged and asserted < 10 s").
   Fix: assert the exact lines the spec gives, the `(markup)` writer at `AppShell.svelte:220` with kind `markup`, and time each query in that block.

9. **minor: no test covers the >28 KB `q file` hint or `q file --section calls` on a split card.** The fixture has no card over 40 KB, so `calls.md` reading (`query.mjs:630`) and the stderr hint (`:626-627`) are untested. The `cards.mjs` probe shows both work on the real repo today.
   Fix: build one fixture card large enough to split (the cap test 35 fixture), then assert that the hint is on stderr and that the `--section calls` line count equals the `.calls.md` call lines.

10. **minor: `q tests` adds a `test <file> inline <file>` row with an invented relation and counts it as production.** The card grammar has `imports|mocks|e2e` and puts `t:inline` on the `file` line. `query.mjs:924` sets `file: <the source file>`, so the header says `(prod 1, tests 10)` for `src-tauri/src/vault/index.rs`, and the fixture test locks this (`codemap-query.test.ts:388`).
    Fix: print `t:inline <file>` (the card token), and count it under tests.

11. **minor: `wiring.md` caps `registered-at` and `fired-by` at 10, against spec section 5's 20.** `WIRING_CAP = 10` (`scripts/codemap/render.mjs:289`) predates this stage, but this diff writes the JSDoc that makes it official: "10 in `wiring.md`" at `render.mjs` `wiringLines`.
    Fix: use 20 for `registered-at`/`fired-by` (8 for the other relations, the "any other in-line list" cap), or record the deviation in the spec.

12. **minor: the unquoted `in <name>` form is a usage error.** Agents copy `in foo` from a line. `q callers in foo --file F` gives the positionals `['in', 'foo']` and exits 2 with "callers takes 1 argument". Only the quoted single argument `'in foo'` works (`query.mjs:381`).
    Fix: in `parseArgs`, merge a leading positional `in` with the next one.

## Resolution

1. fixed: `Query.ix` indexes every production enclosing of uses, effects, Rust calls, registry sites, IPC callers and event sites (and the `(module)`/`(script)`/`(markup)` scopes each file has) as IDs, with non-scope names in the bare-name index. Fixture `tick.ts` (`const t = debounce(() => g(), 300)`) asserts `q calls <file>:t` and `q calls t`; a new test 51 case resolves every `in <name>` of seven runs, including `sink timer --up 1`. The `enclosing.mjs` probe now reports 0 of 2917 unresolvable.
2. fixed: `resolve` maps `EVENT_NAMES.<KEY>` and a `*_EVENT` const name to `event:<name>` whenever `event` is an accepted kind (`callers`, `flow`), ahead of the Rust const item. Asserts: both forms equal `q callers event:index-updated`, and `flow … INDEX_UPDATED_EVENT` equals `flow … event:index-updated`.
3. fixed: `impactPreds` adds each `users`/`rustUsers` row of kind `import` (a file that only imports the symbol) as a `by` line with via `via-import`, continuing from that file. Fixture interface `CalDay` with two type-only importers asserts depth 1 and depth 2; the `write_atomic` impact now also lists `src-tauri/src/lib.rs` (the `generate_handler!` registration of `save_note`). The `typeimpact.mjs` probe now reports 0 of 2004 empty.
4. fixed: scopes resolve only through the index of finding 1, so `AppShell.svelte:$effect@999` and `tags.service.ts:(markup)` exit 1; real scopes still exit 0 (test 50).
5. fixed: an object method's `sym` answer is the line of its object (`sym api.run` prints `sym …tick.ts:9 const api …`), and the `sym` suggestion pool holds only names with a line.
6. fixed: `--depth` above 6 on `impact` is a usage error (exit 2); the silent clamp is gone.
7. fixed: `path` and `flow` print `same node: A is B` or `same node: A and B overlap at <node>` with `total 0` when a start already meets the goal. One assert each.
8. fixed: test 53 asserts the exact lines `editor.service.ts:9`, `app-lifecycle.service.ts:7`, `tags.service.ts:3`, `TypesNavigator.svelte:25`; the known-fact block asserts `AppShell.svelte:192`, the `(markup)` writer at `AppShell.svelte:220` with kind `mcall … write`, `vault.rs:343`, and times every query (< 10 s each).
9. fixed: two test 52 cases: a 180-local card over 28 KB prints the stderr hint (and a small card none); a 300-local split card's `--section calls` equals the `.calls.md` call lines (300).
10. fixed: `q tests` prints the card token `t:inline <file>` and counts it under tests (`prod 0, tests 2` for the fixture Rust card).
11. rejected: the cap of 10 was lowered on purpose in the stage that wrote `wiring.md`, to keep that file under the 48 KB budget; section 5 names lowering a cap constant as the fix for a budget breach, and `q reg` prints every line uncapped.
12. fixed: `parseArgs` joins a positional `in` with the next positional, so `q callers in foo --file F` equals `q callers 'in foo' --file F` (test 51).
