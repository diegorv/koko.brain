VERDICT: APPROVED

## Acceptance criteria

- [met] Failing test first, in `auto-organize.logic.test.ts`: `createTargetProblem('./_system/x.md', '/vault', ['_system'], [])` returns `inside _system/`. It returns null today. — `auto-organize.logic.test.ts:1352` asserts `inside _system/`. Probe: with `createTargetProblem`/`countNotesToCreate` restored to main (helper stubbed in so the file imports), the logic file fails 2 tests (the gates test and the `./` count test), so the test fails on the old code. Restored afterwards; worktree clean.
- [met] `_system//x.md`, `a/./../x.md` and `./Excluded/x.md` (with `Excluded` excluded) are refused. — `auto-organize.logic.test.ts:1353-1355`: `inside _system/`, `leaves the vault`, `inside an excluded folder`. Implementation `auto-organize.logic.ts:379-387` runs every gate on the normalized path.
- [met] `notes/./x.md` is accepted and normalized to `notes/x.md`. — `auto-organize.logic.test.ts:1360` (`createTargetProblem` returns null) and `:1366` (`normalizeVaultRelativePath('notes/./x.md')` is `notes/x.md`).
- [met] A service test: a create rule whose target is `./notes/x.md` creates `/vault/notes/x.md`. A second rule with `notes/x.md` in the same run does not create a second note. — `auto-organize.service.test.ts:1477-1483`: one `createFile('/vault/notes', 'x.md', '')` and only `/vault/notes/x.md` on the in-memory disk. Probe: with `auto-organize.service.ts` restored to main the test fails (1 failed / 129), so it discriminates.
- [met] Frontend gate: `pnpm check` and `pnpm vitest run` pass. — `pnpm check`: exit 0, 0 errors, 0 warnings. `pnpm vitest run src/tests/lib/features/auto-organize` (7 files, includes both changed test files): exit 0, 461/461. The full suite is deliver's to run.

## Behaviors checked

- Behavior 1: `normalizeVaultRelativePath` (`auto-organize.logic.ts:360-364`) splits on `/`, drops empty and `.` segments, returns null on `..`, joins with `/`. Pure, in the `.logic.ts` file, JSDoc present.
- Behavior 2: null maps to `leaves the vault`; file-name, protected and excluded checks use `normalized` (`auto-organize.logic.ts:379-387`). An all-`.` target normalizes to `''` and is refused as `has no file name` (test `:1356`).
- Behavior 3: `createRuleNotes` builds `targetPath` from the normalized target (`auto-organize.service.ts:472`), so `creatingPaths`, `exists`, the parent for folder creation, `createFile`, `withRuleProperties` and the self-match check in `createRuleNote` all get the same path. `countNotesToCreate` (`auto-organize.logic.ts:430`) uses the same form, so the Settings count agrees with a run; this follows from Behavior 3 ("a target and its `./` twin are the same target") and is not scope creep.
- Behavior 4: verified `renameTarget` (`auto-organize.logic.ts:635-665`) passes every name through `toFileName` (`:611-617`), which replaces `/` and `\` with `-` and strips leading dots, so a rename yields a single file name and cannot build `.`, `..` or doubled-slash paths. No change needed.
- Behavior 5: `resolveDestination` untouched.
- PRD Decision 10 (never write into `_system` or the templates folder): the `./` bypass is closed; the service gates row `./_system/{basename}.md` (`auto-organize.service.test.ts:1488`) confirms nothing is created.
- Layer baseline / `BASELINE_SIZE` untouched. No `src-tauri/` change.

## Tests the verdict rests on

- `src/tests/lib/features/auto-organize/auto-organize.logic.test.ts`
- `src/tests/lib/features/auto-organize/auto-organize.service.test.ts`
- the other 5 files under `src/tests/lib/features/auto-organize/` (same run, all pass)
- the two revert probes above

## Findings

1. nit, `src/lib/features/auto-organize/auto-organize.service.ts:472` (and `auto-organize.logic.ts:430`): the second `normalizeVaultRelativePath(target)` call relies on `createTargetProblem` having already refused a null result; if that coupling ever breaks, the template literal silently yields `/vault/null` (TypeScript accepts `null` in a template). Fix (optional): normalize once at the call site and pass the normalized path to `createTargetProblem`, or add a non-null guard. Not reachable today.
2. nit, `src/lib/features/auto-organize/auto-organize.logic.ts:402-403`: the `countNotesToCreate` JSDoc edit leaves a short broken line ("case-insensitively). A source"). Fix: reflow the paragraph.

## Resolution

1. Rejected. The null result is refused by `createTargetProblem` one line above at both call sites, and `normalizeVaultRelativePath` is pure, so the second call cannot return null; the reviewer confirms it is not reachable. A guard would be code for an impossible case (CLAUDE.md, Simplicity First), and threading the normalized path through `createTargetProblem` would change its signature and every caller for no behavior change.
2. Fixed: the `countNotesToCreate` JSDoc paragraph in `auto-organize.logic.ts` is reflowed. Comment only.
