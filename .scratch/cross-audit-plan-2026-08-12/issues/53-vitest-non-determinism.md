# Issue 53: Vitest non-determinism in three suites

Status: ready-for-agent
Phase: unplanned
Source: test-health sweep 2026-08-19. Symptoms reported at `ed1a7b38`; all evidence below gathered
on worktree `.claude/worktrees/issue-53-test-health` at `5e0b8bd3`, tree clean before and after
(`git status --porcelain` empty), nothing edited.

Blocked by: none

Note on line numbers: anchor by symbol. The numbers quoted here are as of `5e0b8bd3`.

## What

Three separate flake reports. Two of them share one root cause; the third is unrelated.

### Part 1 (primary): `table.test.ts > findAllTables > finds multiple tables`

Reported returning 1 table instead of 2 on an untouched tree.

**Did not reproduce naturally: 0 failures in 114 runs.**

- Isolated `pnpm vitest run <file>` x20: 20/20 pass (20 tests, ~119 ms each).
- `--sequence.shuffle` over the file, seeds 1, 2, 42, 1337, 20260819, 999983, 7, 88888: 8/8 pass.
- `--sequence.shuffle` over the whole `live-preview/parsers/` directory (31 files, 523 tests), seeds
  1, 42, 1337, 20260819, 555, 90210: 6/6 pass.
- Full suite x12 at normal load: every run `292 passed (292)` / `6476 passed | 1 todo`.
- Sibling pairing in both orders against 6 neighbours (`table-widget`, `combined-table-meta-bind`,
  `combined-block-structures`, `inline/pipeline-dom`, `frontmatter`, `inline-markdown`): 12/12 pass,
  identical both ways.
- 25 isolated runs under 24 CPU burners (load avg 38.9): 0 failures. 31 isolated runs under 64
  burners (load avg ~155): 0 failures.

**Root cause found and reproduced deterministically.** It is not test pollution, and it cannot be:
vitest 4.1.10 runs the default `forks` pool with `isolate: true` (`vitest.config.ts` overrides only
`plugins`, `resolve.alias`, `resolve.conditions` and `test.include`), so every one of the 292 files
gets a fresh module registry. Cross-file module state is structurally impossible here. The parsers
themselves are pure and `SEPARATOR_CELL_RE` in `live-preview/parsers/table.ts` carries no `g`/`y`
flag, so no `lastIndex` carry-over exists either.

The defect is a wall-clock parse budget inside CodeMirror, read from
`node_modules/@codemirror/language/dist/index.js` (v6.12.4):

- `LanguageState.init(state)` gives the initial parse a **20 ms** budget (`Work.Apply`) and, on
  timeout, calls `parseState.takeTree()`, which commits a **truncated** tree.
- `LanguageState`'s constructor does `this.tree = context.tree` - a one-shot **snapshot**.
- `ParseContext.work(until, upto)` sets `endTime = Date.now() + until` and checks the clock after
  **every** `advance()`. `@lezer/markdown` advances one block per call, so a multi-block document
  has one checkpoint per block boundary.
- `syntaxTree(state)` returns `field.tree`, the snapshot.
- `ensureSyntaxTree(state, upto, timeout)` advances `field.context` and **returns** the fresh tree,
  but never writes it back to `field.tree`.

Consequence at `src/tests/lib/core/markdown-editor/test-helpers.ts::createMarkdownState`: it calls
`ensureSyntaxTree(state, state.doc.length, 5000)` and **discards the return value**. Its comment
"Force synchronous tree parse for test reliability" is wrong - the call is a no-op for every
consumer that reads `syntaxTree(state)`, which is exactly what `findAllTables` does. The 5000 ms
timeout repairs an object nobody reads.

Deterministic repro (scratchpad probes only, no repo file touched): monkeypatch `Date.now` to
advance a fixed step per call, then build the exact 68-char two-table fixture from the test.

| `Date.now` step | `syntaxTree(state).length` | tables found |
|---|---|---|
| 0 / 1 / 2 / 3 / 4 / 5 / 7 / 10 / 15 / 18 / 19 / 20 ms | 68 | 2 (pass) |
| 21 / 22 / 25 / 30 / 50 / 100 ms | 34 | **1 (the reported failure)** |

Truncation lands at position 34, exactly the end of the first table plus its newline. In the same
probe the value **returned** by `ensureSyntaxTree` has 2 tables at every step while
`syntaxTree(state)` still yields 1: the write-back gap, isolated.

Why only this one case out of 20 in the file: the fixture is 2 blocks, so `until()` is reached at
exactly ONE checkpoint. A single-table fixture (`'| a | b |\n| --- | --- |\n| 1 | 2 |'`) yields 1
table at step 0, 21 and 100 ms alike, because `advance()` reports done before `until()` is ever
called. Single-block fixtures are provably immune.

Blast radius: `createMarkdownState` is imported by **37 test files** (all of
`live-preview/parsers/*.test.ts`, `live-preview/inline/handlers/*.test.ts`,
`live-preview/plugins/*.test.ts`, `click-handler.test.ts`, `inline-formatting-plugin.test.ts`).
Four more local helpers have the identical shape (`ensureSyntaxTree` return value discarded):
`live-preview/plugins/table-field.test.ts::createState`, `code-block-field.test.ts::createState`,
`callout-field.test.ts::createState`, `block-math-field.test.ts::createState`. Every multi-block
fixture in that set is latently exposed.

The repo already knows this pattern: `live-preview/widgets/math-widget.test.ts:185` uses
`forceParsing(view, state.doc.length, 5000)` with a comment at :173 noting the StateField "may
decorate 0 blocks" without it. `forceParsing` internally dispatches an empty transaction precisely
to re-snapshot `field.tree`. The fix was applied there and only there.

### Part 2: `TypeNoteList.perf.test.ts` hard 1500 ms wall-clock ceiling

`src/tests/lib/features/type-definitions/TypeNoteList.perf.test.ts`, single test
"virtualizes 300 notes with type-inherited icons without scanning entries per note",
`CEILING_MS = 1500` at :91, asserted at :193 as `expect(elapsed).toBeLessThan(CEILING_MS)`.

**Reproduced. Two independent failures under contention:**

- `AssertionError: expected 1794.4439999999995 to be less than 1500` (TypeNoteList.perf.test.ts:193).
  Every other assertion in that run passed; only the wall-clock one broke.
- `AssertionError: expected 1690.137125000001 to be less than 1500`, in the 8th iteration of a
  background full-suite loop (its other 7 iterations were green at 6476 passed).

Measured per-test durations (vitest `--reporter=json`; a superset of the asserted window, since it
also covers `mount` + the first `flushSync`, but it tracks the same load):

| Condition | min | median | max | failures |
|---|---|---|---|---|
| Idle, 10 runs | 126.42 ms | 146.37 ms | 187.30 ms | 0 |
| One concurrent `pnpm vitest run`, 10 runs | 165.33 ms | 241.38 ms | 481.65 ms | 0 |
| That plus 32 CPU burners on 10 cores, 10 runs | 790.88 ms | 1030.94 ms | 2497.13 ms | 1 |

So the ceiling is ~10x the idle median but only ~1.5x the median under contention, and it fails at
roughly 12x idle - a level ordinary CI or a parallel build reaches routinely. Genuine wall-clock
flake, not a code defect. (Run 25 reported 1631.81 ms and still passed, confirming the reported
duration is a superset of the measured window.)

What the number actually guards: commit `2a6045bc`
("perf(type-definitions): resolve note icons via O(1) lookups instead of entries scans"). Before it,
every rendered row's `resolveNoteIcon` ran **three** linear scans of `typeDefinitionsStore.entries`
per note, inside tracked render effects, so roughly 3M proxied reads also registered as reactive
dependencies. That measured 5867 ms regressed vs ~200 ms fixed. `1500` is a hand-picked midpoint
between those two numbers. It measures nothing on its own; it is a proxy for "no O(rows x entries)
scan happened". Today `resolveNoteIcon` (`TypeNoteList.svelte:336-347`) uses
`typeDefinitionsStore.getTypeDefinitionPath()`, a Map lookup.

The rest of the test is already deterministic: `textContent` contains `note-0` and `300`,
`rows.length >= 1`, `rows.length < TYPED / 2`, one `svg` per `[data-note-row]`. Only line 193 is
load-dependent.

### Part 3: `live-preview/inline/pipeline-dom.test.ts`

**Reproduced, and it is the same root cause as Part 1 with a materially wider window.**

- Isolated x20: 20/20 pass (7 tests, ~1.28 s each). Green in all 12 clean full-suite runs. Paired
  with `table.test.ts` in both orders: 27 passed both ways.
- Under 64 CPU burners it failed naturally at run 14 of an interleaved loop:
  `x emits cm-lp-blockquote / -2 / -3 by depth 234ms`,
  `AssertionError: expected false to be true // Object.is equality`, `Tests 1 failed | 6 passed (7)`.

That failure was **predicted before it was run**, from the same `Date.now`-stepping probe applied to
this file's three literal fixtures:

| fixture | step 0 ms | step 21 / 100 ms |
|---|---|---|
| `HEADINGS` (45 chars, 6 blocks) | treeLen 45, `ATXHeading1..6` present | treeLen 5, **only `ATXHeading1`** |
| `BLOCKQUOTES` (18 chars) | treeLen 18, full structure | treeLen 9, **first blockquote only** |
| `SAMPLE` (42 chars, one paragraph) | treeLen 42 | treeLen 42 (immune) |

`BLOCKQUOTES` truncating to the first blockquote is exactly `cm-lp-blockquote-2` / `-3` missing,
which is exactly the observed assertion. `HEADINGS` has FIVE checkpoints, five times the exposure of
the table fixture. `SAMPLE` is a single block, which is why the three `SAMPLE`-based tests have never
been reported flaky.

Here `mountView` (`pipeline-dom.test.ts:20-31`) builds the state inline with `EditorState.create` and
does not even call `ensureSyntaxTree`, so there is nothing papering over it. The `cm-lp-*` classes
come from `HighlightStyle` tag styling driven by that syntax tree, so a truncated tree silently drops
classes for every block past the truncation point. No error, just missing decorations.

One other piece of genuine shared state was examined in this file and is NOT needed to explain the
failure, and did not reproduce: the nested `describe('disabledDecorators wiring through the real
settings store')` mutates the real module-global `settingsStore` via `toggleDecorator(...)` and
relies on its own `afterEach` to toggle both back. Sequential ordering plus that `afterEach` make it
safe today; under `--sequence.concurrent`, or if a test in that block threw before its `afterEach`,
the leaked flag would produce the same "expected false to be true" shape.

### No third root cause

No other flaky suite surfaced across roughly 100 targeted runs plus 12 clean full-suite runs plus 6
shuffled directory runs. Under the heaviest artificial load the only natural failures were the two
already described.

## How

Three commit-steps, in this order. Steps 1 and 3 share a root cause but are separate commits because
they touch disjoint files and have separate red evidence.

### Step 1 - Part 1: make `createMarkdownState` actually deliver the parsed tree

**Red evidence.** A conventional regression test cannot go red here: on an unloaded machine the parse
finishes inside the 20 ms budget, so both the buggy and fixed helper return a complete tree. The red
test must remove the wall clock from the equation and assert the invariant the flake violates
("the tree `syntaxTree(state)` serves covers the whole document, regardless of process stalls"):

- In `table.test.ts` (or alongside `createMarkdownState`), install a **stepping** `Date.now` spy
  (`vi.spyOn(Date, 'now')` returning a counter that advances 25 ms per call) around the
  `createMarkdownState` call for the two-table fixture, then assert `findAllTables` returns 2.
- Run it against the current helper and confirm it fails with `expected length 2, received 1`. That
  is the exact reported symptom, made deterministic. The probe above proves the step threshold: any
  value >= 21 ms reproduces, any value <= 20 ms does not.
- **Do not use `vi.useFakeTimers()`.** A frozen `Date.now` gives the parse an infinite budget, so the
  test would pass against the broken helper. Only a stepping clock is valid red evidence.
- 25 ms leaves ~200 `until()` calls of headroom inside `ensureSyntaxTree`'s own 5000 ms budget, so
  the test is green after the fix rather than merely differently red.

**Fix** in `test-helpers.ts::createMarkdownState`: keep the `ensureSyntaxTree` call, then apply an
empty transaction so the state's Language field re-snapshots the finished tree.

```ts
	ensureSyntaxTree(initial, initial.doc.length, 5000);
	// ensureSyntaxTree finishes the parse on the mutable ParseContext but never
	// refreshes the Language state field's tree snapshot, and syntaxTree() reads
	// that snapshot. An empty transaction re-snapshots the finished tree.
	return initial.update({}).state;
```

Traced, not assumed: `LanguageState.apply` sees `this.tree !== this.context.tree` so it does not
early-return; `context.changes` with an empty `ChangeSet` carries the complete tree and `treeLen`
forward; `upto` is `undefined` because `treeLen === doc.length`, so the re-entered `work(20, ...)`
hits the `isDone` fast path and returns immediately. Cost is one no-op transaction, no reparse.

Propagate the same one-line `update({})` to the four local helpers with the identical shape:
`table-field.test.ts::createState`, `code-block-field.test.ts::createState`,
`callout-field.test.ts::createState`, `block-math-field.test.ts::createState`. `update({})` preserves
the `EditorSelection.single` cursor those helpers set, so their cursor-dependent cases are
unaffected. No new tests for those four: the mechanism is identical and the gate proves no
regression. Do NOT collapse them into `createMarkdownState` - they intentionally use different
extension sets and a cursor.

**Explicitly NOT justified here:**
- Raising `ensureSyntaxTree`'s 5000 ms timeout. That was never the constraint; the failing budget is
  the hardcoded 20 ms `Work.Apply` inside `LanguageState.init`, which no public API exposes.
- Changing `findAllTables` to take a `Tree` instead of an `EditorState`. Reshapes a production
  signature to work around a test-helper bug, and every parser in `live-preview/parsers/` would need
  the same churn.
- `fileParallelism: false`, `maxForks`, `pool: 'threads'`, or `retry: 2` in `vitest.config.ts`. Each
  lowers the miss rate, leaves the defect in place, and slows the whole 292-file suite.
- A `throw` guard inside the helper asserting `syntaxTree(state).length >= doc.length`. The stepping
  clock test already fails if the `update({})` is ever removed; a second belt is redundant. (If it is
  ever added, it must assert on `Tree.length`, never `syntaxTreeAvailable`, which reads
  `field.context.isDone` and is `true` in exactly the buggy case.)

### Step 2 - Part 2: replace the wall-clock ceiling with a load-independent counter

**Red evidence.** The flake itself is already reproduced (the two failures quoted above), so the
red-first here is for the *replacement* assertion, and it is a mutation test: the new counter must be
shown to go red when the scan it guards is put back.

- Add the counter assertion, run it, confirm it passes on current `main`.
- Temporarily revert `resolveNoteIcon` (`TypeNoteList.svelte:336-347`) to the pre-`2a6045bc` shape -
  scan `typeDefinitionsStore.entries` for the note's `isA`, then again for the Type definition -
  and confirm the counter assertion fails by orders of magnitude.
- Revert the mutation, record both numbers in `## Comments`, and verify `git status` is clean before
  committing. Without that recorded delta the new assertion is unproven.

**Fix.** Delete line 193 (`expect(elapsed).toBeLessThan(CEILING_MS)`), the `CEILING_MS` constant and
the now-unused `t0` / `elapsed`, and assert on entries reads instead:

- Wrap the array handed to `typeDefinitionsStore.setEntries(buildEntries())` in a counting `Proxy`
  that increments on integer-index `get`. This instruments the **data**, not the store, so the
  "never mock stores" rule holds. `setEntries` assigns `value` by reference into `$state`
  (`type-definitions.store.svelte.ts:52-66`), so reads through `typeDefinitionsStore.entries[i]`
  still pass through the counting proxy.
- Snapshot the counter immediately before `setSelection` and assert the delta across the click is a
  small multiple of `TOTAL`, not a multiple of `rows x TOTAL`. Measure the real baseline in the
  passing run and set the bound with headroom (the effect at `TypeNoteList.svelte:154-160` makes a
  handful of full passes per run: `excludeSystemFolder`, filter, sort). A bound of `10 * TOTAL`
  (~78k) sits ~1e2 above the fixed path and ~1e2 below the regressed ~7M. Do not hardcode a number
  you did not observe.
- Note the constant floor: `setEntries` itself iterates `value` once to build `entriesByPath` /
  `typeDefinitionPaths` (`type-definitions.store.svelte.ts:57-63`), which is `TOTAL` reads before the
  snapshot is taken. Take the snapshot after `setEntries`, in `beforeEach`, or subtract it.

Leave every other assertion in the test untouched; the virtualization half is already deterministic.
Rename the test only if the new assertion makes the old name wrong (it does not: "without scanning
entries per note" is precisely what the counter now measures directly).

**Explicitly NOT justified here:** raising `CEILING_MS`, adding `retry`, or deleting the test. A
higher ceiling is the same flake at a higher load, and deleting it drops the only guard against the
`2a6045bc` regression.

### Step 3 - Part 3: give `pipeline-dom.test.ts::mountView` a complete tree

**Red evidence.** Same technique as step 1, and the prediction has already been validated against a
natural failure. Wrap `mountView(BLOCKQUOTES)` in the stepping `Date.now` spy (25 ms per call) and
assert `cm-lp-blockquote-2` and `cm-lp-blockquote-3` are present. Against the current `mountView`
that fails with `expected false to be true`, byte-identical to the failure observed under 64 CPU
burners. Add the same for `mountView(HEADINGS)` asserting `cm-lp-h2..h6` if it costs nothing; the
probe shows `HEADINGS` truncates to `ATXHeading1` alone.

**Fix.** Reuse the pattern already proven in this repo at `math-widget.test.ts:185`: call
`forceParsing(view, state.doc.length, 5000)` inside `mountView` after `new EditorView(...)` and
before returning. `forceParsing` runs `ensureSyntaxTree` and then dispatches an empty transaction
when the result differs from `syntaxTree(view.state)`, which both re-snapshots the field tree and
re-runs the decoration pass. Import it from `@codemirror/language` alongside the existing
`syntaxHighlighting` import at :4.

Do not touch the `disabledDecorators` nested describe in this step. Its `afterEach` restore is
correct today and no failure was attributed to it; changing it here would be an unrelated edit.

## Gate

- Frontend surface for all three steps: `pnpm check` + `pnpm vitest run` + `pnpm build`. Baseline on
  an untouched tree at `5e0b8bd3`, for comparison: `check` exit 0 (191 files, 0 errors, 0 warnings);
  `vitest run` exit 0 (292 files, 6476 passed | 1 todo, 15.40 s); `build` exit 0 (vite 5.33 s).
- Stage only each step's files (`git add <specific files>`), verify with `git diff --cached --stat`.
- Three commits, one per step, full commit format (Context, Problem, Solution, Behavior, Files with
  line ranges).
- Reproduction note for whoever picks this up: the shell here is zsh, which does NOT word-split
  unquoted parameters. `pnpm vitest run $TWO_PATHS` is passed as ONE argument and exits 1 with
  "No test files found" while looking like a silent pass inside a loop. Use `${=VAR}` or an array.

## Comments

### Step 2 mutation results (2026-08-19)

Required by Step 2 ("record both numbers in `## Comments` ... without that recorded delta the new
assertion is unproven"). All readings taken in worktree `.claude/worktrees/issue-53-test-health` at
`c1dfa9f6`, `src/lib` clean before and after every mutation (`git diff HEAD -- src/lib` empty),
isolated `pnpm vitest run src/tests/lib/features/type-definitions/TypeNoteList.perf.test.ts`.
The counter is deterministic, so these numbers do not move with machine load. The partial-revert
rows and the margin caveat below were re-measured after the review fixes landed and reproduce
unchanged.

| Variant | test 1 rows / reads | ratio | test 2 rows | test 2 delta |
|---|---|---|---|---|
| O(1) path (as shipped) | 14 / 48295 | 6.16x TOTAL | 14 -> 104 | +135 |
| Full revert of `2a6045bc` (both `icon-resolver.ts` scans plus the `TypeNoteList.svelte` `.find`) | 14 / 185711 | 23.67x | 14 -> 104 | +1212819 |
| Partial revert (`resolveTypeIconForPath` scan only, `resolveIconForType` left on the Map) | 14 / 66410 | 8.46x | 14 -> 104 | +365154 |

Bound chosen from those readings: ceiling `8 * TOTAL` (62768), which the 8.46x partial regression
exceeds while leaving 30% of headroom over the 6.16x baseline. `10 * TOTAL` was tried first and
LOWERED to 8x, because at 10x the 8.46x partial regression passes.

Margin caveat, recorded because the 30% figure above is headroom over the BASELINE and not margin
over the regression: the partial regression costs `(66410 - 48295) / 14` = ~1294 reads per mounted
row, so the ceiling only trips at 12 or more mounted rows. jsdom mounts 14 here, and that number is
virtua's (viewport height / row height plus its own overscan), not this repo's. At
`VIEWPORT_HEIGHT = 420` the same partial regression measures 11 rows / 62058 reads = 7.91x and test
1 stays GREEN. Test 2 catches it regardless (205590 against its own `TOTAL` bound), so the row
scaling assertion, not the ceiling, is the load-bearing guard against a per-row scan.

Two deviations from the Step 2 text, both deliberate:

1. **The prescribed counting `Proxy` on integer-index `get` was NOT used.** Svelte's `$state` proxy
   memoises each index read into a signal after the first pass
   (`svelte/src/internal/client/proxy.js`, `get` trap), so an outer index-Proxy sees each index once
   per snapshot and saturates: it discriminates the O(1) path from the regressed one by nothing.
   The implementation instruments the entry OBJECTS instead, redefining `path` / `isA` / `title` as
   accessors in `countReads`. The same `get` trap creates a memoising source only when
   `get_descriptor(target, prop)?.writable` is truthy, so accessor properties fall through to
   `Reflect.get` and keep reaching the counter on every pass. Do not "restore" the index-Proxy the
   plan describes; it would silently turn the guard into a no-op.
2. **An instrumentation self-check was added to `beforeEach`**, not just the ceiling. An upper bound
   alone is satisfied by `reads = 0`, so any future change that stops the accessors from firing
   (a svelte proxy change, a `setEntries` that clones or `$state.snapshot`s the array, deviation 1
   being undone) would leave the suite green with the guard dead. The check reads one property
   through the store's own `$state` proxy and asserts the counter moved by exactly 1. Verified by
   stubbing `countReads` to return the entry untouched: `expected +0 to be 1`, BOTH tests red.

   A read floor (`expect(reads).toBeGreaterThan(TOTAL)`) was tried for this job first and dropped.
   It only covered test 1, leaving test 2 tautologically satisfiable (`0 - 0 < 7846` passes), and it
   demanded that production perform at least one full pass over `entries` - so a legitimate future
   optimisation (a by-type index in `typeDefinitionsStore`, exactly the pattern `2a6045bc`
   established) would have gone red on an improvement. The `beforeEach` check tests the
   instrumentation itself, covers both tests, and stays green however fast production gets.

Scope of the counter, recorded so it is not mistaken for a full stand-in for the wall clock:
`COUNTED_KEYS` is `path` / `isA` / `title` only. A regression that scans `entries` reading some other
field is invisible to both tests. Widening to the remaining scalars was rejected: `snippet`,
`wordCount` and `modifiedAt` are read by the row markup once per mounted row, so counting them would
make test 2's delta scale with row count and blunt the guard it exists to be.

The Step 2 wall-clock removal itself is unchanged: `CEILING_MS`, `t0` and `elapsed` are gone and no
assertion in the file reads a clock.
