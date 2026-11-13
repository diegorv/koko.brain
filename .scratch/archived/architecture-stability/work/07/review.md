VERDICT: APPROVED

## Acceptance criteria

- [met] Tests come first, in src/tests/scripts/fix-feat-ratio.test.ts, on fixture commit records (never real git history: the CI vitest job uses a shallow clone): — the test file exists and only feeds literal records and strings to the exported helpers. It never calls git or the CLI. `pnpm vitest run src/tests/scripts/fix-feat-ratio.test.ts` exit 0, 14 passed. Test and script land in the same commit (05cb57be), so git cannot show the test-first order; that part rests on the build report. Sub-bullets: `parseSubject` covers `fix(calendar)!:`, `feat:` and non-conventional subjects (test lines 5-23). `areaOf` covers src/lib layers, src/tests/lib, live-preview (both src and test), src-tauri/src, src-tauri/tests, and returns null for `help/index.md` (lines 25-65).
- [met] `aggregate` counts a two-area commit once in each area and once in TOTAL — the test at line 85 uses a commit touching two event-calendar files, core/vault and help/. It asserts event-calendar 1:0, core/vault 1:0 and TOTAL 2:1, so two files in one area count once and the help/ file does not add "(no product code)". The code is at scripts/fix-feat-ratio.mjs:130-136 (a Set of areas; TOTAL bumped once per commit).
- [met] Manual check, recorded in the commit message: `--since 2026-05-01 --until 2026-10-31T23:59:59` prints TOTAL 433:261 — I re-ran it in the worktree and it printed `TOTAL  145:171  60:12  6:0  41:6  12:7  169:65  433:261  1.66`. An independent `git log --no-merges ... --format=%s | grep -cE` count also gives 433 fix and 261 feat. The value appears in the 05cb57be commit body under "Behavior".
- [met] `docs/HOTSPOTS.md` lists the triggers with globs and thresholds, and sets the first review date 8 weeks after issues 14 and 16 merge — docs/HOTSPOTS.md:34-39 has every module with its glob, an 8-week threshold (3+/4+/3+) and the action from the Issue table. Line 47 sets 2026-12-27. Issue 14 (104d7471) and Issue 16 (8f8523a7) both merged on main on 2026-11-01, and 2026-11-01 + 8 weeks = 2026-12-27. The contract-test paths it cites exist.
- [met] No writes to the repo; output goes to stdout only — the script only uses `execFileSync('git', ['log', ...])` and `console.log`. Errors go to stderr with exit 2. `git status --short` was empty after the table run, four `--paths` runs, a `--top 3` run and the bad-argument runs.

## Checks run

- `pnpm check`: exit 0, 0 errors, 0 warnings.
- `pnpm vitest run src/tests/scripts/fix-feat-ratio.test.ts`: exit 0, 14/14. My test verdict rests on this file only. The branch changes no other source with tests. The full suite and `pnpm build` are for deliver to run.
- Probes:
  - `--paths` with each HOTSPOTS glob: event-calendar 34, live-preview core 8, widgets/*.ts 6, type-definitions 9, all over the last 8 weeks.
  - `--paths` with a directory and with `<dir>/**`: both give 75.
  - `--top 0` and `--bogus`: both exit 2 with a message.
  - Indentation: tabs only.
- Scope: the branch has 4 files (script, test, doc, discovery). No baseline, BASELINE_SIZE or composition-root change. No src-tauri change.

## Findings

1. minor — scripts/fix-feat-ratio.mjs:71-78 (`rustTestAreaOf`). Fix: map a test stem to the module it imports, or list the known exceptions. The stem's first word does not always name a `src-tauri/src` module, which breaks the Issue's rule that tests map to their source area. The probe gives:
   - `fts_repo_test.rs` (tests `db::fts_repo`) gives `rust/fts`. It already shows as a phantom `rust/fts 1:0` row in the May-Oct table.
   - `history_test.rs` (tests `commands::history`) gives `rust/history`.
   - `ipc_contracts_test.rs` gives `rust/ipc`.
   - `core_tauri_free_test.rs` gives `rust/core`.

   None of these modules exist under src-tauri/src. Only the Rust rows suffer; TOTAL and the HOTSPOTS globs are not affected.
2. minor — docs/HOTSPOTS.md:38. Fix: say that callout-field.ts and the two block widgets are left out on purpose, or add them. The widgets row lists `live-preview/widgets.ts` and `live-preview/widgets/*.ts` as "each widget file". It leaves out `live-preview/plugins/callout-field.ts`, which also defines a `WidgetType`. It also leaves out the block widgets CLAUDE.md lists with the live-preview widgets: `plugins/queryjs/queryjs-block-widget.ts` and `features/collection/collection-block-widget.ts`. The Issue's "each widget file" is ambiguous, and the doc chooses without saying so.
3. nit — docs/HOTSPOTS.md:25-26. Fix: say it touches the two non-live-preview modules plus live-preview outside the trigger globs, or drop "all three". The doc says 2430a64f "touches all three modules below", but its only live-preview file is `live-preview/wikilink-navigation.ts`, which neither live-preview glob in the table matches. The Issue also says it would fire only the event-calendar and type-definitions rows.

## Resolution

1. Fixed. `scripts/fix-feat-ratio.mjs` now has an explicit `RUST_TEST_AREA_EXCEPTIONS` map: `fts_repo` to `rust/db`, `history` to `rust/commands`, `ipc_contracts` to `contracts` (it pins the generated TS bindings), and `core_tauri_free` to null (an architecture ratchet, like `src/tests/lib/architecture/`). A new test in `src/tests/scripts/fix-feat-ratio.test.ts` failed first, then passed (15/15). The May-Oct table no longer shows a `rust/fts` row, and TOTAL is still 433:261.
2. Fixed. `docs/HOTSPOTS.md` now says the widgets row leaves out `callout-field.ts` and the queryjs and collection block widgets on purpose.
3. Fixed. The 2430a64f sentence now says it touches the calendar and type-definitions files and a live-preview file outside both live-preview globs.
