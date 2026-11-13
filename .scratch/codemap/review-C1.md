# Review C1: q model cache

Scope: the uncommitted diff on `feat/codemap` (`scripts/codemap.mjs`, `scripts/codemap/model.mjs`, `scripts/codemap/query.mjs`, `src/tests/lib/architecture/codemap-query.test.ts`, spec sections 9, 14, 15, 17).

Counts: 0 blocker, 1 major, 4 minor.

## What was checked and held

- Tests: `codemap-query.test.ts` 40/40 pass, `codemap.test.ts` 195/195 pass, `pnpm check` 0 errors.
- Byte identity on the real repo: probe `/tmp/codemap-review-C1/compare.mjs` ran 13,249 queries (every command; `file`, `importers --tests`, `deps`, `calls`, `tests` for every one of the 1630 files; `impact` on every 7th file and every 5th used symbol; every module, layer, IPC command, event, registry, store member, effect class; 50+ `flow` pairs; `sym --match` with limit 2000) through `runQuery` on a fresh `buildModel` and on the model `cachedModel` loaded from `model.bin`: 0 differences.
- Payload: `modelData` holds only plain Object/Array/Map/Set values (no class instances, so no ts AST nodes leak in); largest fields `uses` 18.7 MB, `ts` 6.5 MB, `rust` 5.6 MB, `symbolEdges` 5.3 MB.
- Generator output unchanged: the map rendered with HEAD's scripts and with the diff's scripts (root = this worktree, `--out /tmp/codemap-out-C1head` and `/tmp/codemap-out-C1new`) differs only in INDEX line 2's inputs hash, as expected from the changed generator files. `build` and `--stale` never call `cachedModel`.
- The model depends only on the inputs map, the generator files and TypeScript: `buildModel` and `import-graph.mjs resolveSpecifier` read nothing from disk, so the full-content key cannot miss a change.
- Concurrency on the real repo: 6 simultaneous misses plus 8 staggered readers during the writes all exited 0 with output equal to `--no-cache`; one `model.bin` left.
- Measured (Node 26.12.1, this worktree): cold miss with write 2.39 s, `--no-cache` 2.05 s, warm hit 0.21 to 0.28 s (`importers` 0.21, `flow` 0.28, `impact --depth 6 --tests` 0.26, `file` 0.26); `model.bin` 45,240,534 bytes. Target warm under 0.5 s is met.
- Mutation runs in a copy (`/tmp/codemap-review-C1/mut`, test 54 only): dropping the payload checksum check fails the corrupt-file test; writing the cache on `--no-cache` fails the bypass test. Two mutations survive (findings 1 and 2).

## Findings

1. **major: the `--no-cache` test cannot fail when the bypass still reads a valid cache.**
   Evidence: `codemap-query.test.ts` test `--no-cache neither reads nor writes the cache` only plants the garbage string `not a cache\n`, which a reading implementation also rejects. Mutation M2 (in `cachedModel`, move `if (!cache) return { model: buildModel(inputs), hit: false };` after the `readCache` hit branch, so `--no-cache` loads a valid file but never writes) leaves all 6 test-54 tests green. The bypass exists to debug cache bugs (requirement 6), and the test title claims "neither reads" without checking it.
   Fix: plant a structurally valid file with the current key and a payload that answers differently. Write tree A (TREE with the `loadTags` doc changed), run `cachedModel(rootA)`, take its `model.bin`, replace its `key <hex>` line with `inputsDigest(readInputs(rootB))` for the unmodified tree B (the checksum covers the payload only, so the file stays valid for B), write it into B. Assert plain `run(rootB, 'sym', 'loadTags')` prints A's doc (proves the planted file is read), `run(rootB, 'sym', 'loadTags', '--no-cache')` prints B's doc, and the file bytes are unchanged afterwards.

2. **minor: the concurrency test cannot fail on a non-atomic write.**
   Evidence: mutation M1 (`renameSync(tmp, file)` replaced by writing the bytes into `model.bin` in place) passes `survives concurrent q processes and leaves one valid cache file`. The fixture model is small, all four children write identical bytes, and any torn read is rejected by the checksum and rebuilt, so the output and the final file are correct either way. Requirement 2 asks for temp file plus rename and the spec states it; nothing checks it.
   Fix: a deterministic check of the rename: after a first query, `linkSync(model.bin, model.bin.link)`; edit an input; query again; assert `model.bin.link` still holds the old bytes (an in-place write changes both names of the inode) and `statSync(model.bin).ino` differs from the link's, and no `*.tmp` remains.

3. **minor: a killed `q` leaves its temp file forever.**
   Evidence: probe killed a cold `q sym loadTags` with SIGKILL while `model.bin.<pid>.<random>.tmp` existed; the next `q` succeeded and the folder then held both `model.bin` and `model.bin.60854.9b0816bb23e9.tmp` (removed by hand after the probe). `writeCache` (`scripts/codemap.mjs`, the `catch` around `renameSync`) cleans up only on a thrown error; nothing sweeps orphans. A kill mid-write is ordinary for agents (Bash tool timeouts, Esc), and each orphan can be up to 45 MB in `node_modules/.cache/codemap/`.
   Fix: before writing, remove every `model.bin.*.tmp` in the folder except the one about to be created (a concurrent writer whose temp file is removed gets a failed `rename`, which the existing `catch` already treats as "no cache written", so answers stay correct); or remove only those whose `<pid>` is not alive (`process.kill(pid, 0)` throws `ESRCH`). Add the case to test 54 (plant `model.bin.1.dead.tmp`, run a miss, assert only `model.bin` remains) and one line to spec section 9.

4. **minor: spec section 18 still says the query time is an estimate.**
   Evidence: `.scratch/codemap/spec.md:803` "CLI time per query is estimated (1.5 to 2.5 s)" now contradicts the measurements added to section 9 (`spec.md:520`). Section 9's "`flow` about 420 ms" is also above what this probe measured (0.28 s for the same `flow` query), harmless but worth re-measuring when the line is touched.
   Fix: replace the line 803 entry with "q timing measured in section 9 on Apple silicon; the cache on CI's Node 22.17 is not timed", and add to Risks: each checkout keeps a 45 MB `node_modules/.cache/codemap/model.bin`, and every first query after an edit pays a full build plus a 45 MB write.

5. **minor: the `q help` usage line omits `--no-cache`.**
   Evidence: `scripts/codemap/query.mjs:74` `'usage: node scripts/codemap.mjs q <command> <arg> [options]'`, while the entry's `USAGE` in `scripts/codemap.mjs` and spec section 9 show `[--no-cache]`. The option is documented only on the separate `cache:` line, so an agent reading the usage line or the `options:` line does not see it.
   Fix: add `[--no-cache]` to the help usage line (or list it on the `options:` line).

## Resolution

1. Fixed. The `--no-cache` test now plants a valid file under the current key whose model answers differently ("into the storm."), asserts a plain `q` prints the planted answer, `--no-cache` prints the real one, and the file bytes are unchanged. The test passed immediately because the implementation was already correct; it closes the mutation hole rather than catching a bug.
2. Fixed. New test hard-links `model.bin`, edits an input, queries again, and asserts the link keeps the old bytes, the inode of `model.bin` differs, and no `*.tmp` remains. It fails for an in-place write.
3. Fixed. Test first (plants `model.bin.2147483000.deadbeef.tmp`, saw it fail), then `writeCache` sweeps temp files whose pid is not alive (`process.kill(pid, 0)`, `EPERM` counts as alive) before writing. Spec section 9 states it.
4. Fixed. Spec section 18 now points at the section 9 measurements and lists the 45 MB cache file and the first-query-after-edit cost under Risks. Section 9's `flow` figure was re-measured (0.27 to 0.34 s warm) and corrected.
5. Fixed. Test first (saw it fail), then the `q help` usage line shows `[--no-cache]`.
