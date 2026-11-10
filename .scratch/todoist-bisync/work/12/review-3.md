VERDICT: APPROVED

## Previous findings

| # | Severity | Status | Evidence |
|---|----------|--------|----------|
| 1 | minor | resolved | `planSections` (`sections.logic.ts:242-251`) now puts the `section-renamed` row on the add itself (`PlannedSectionAdd.renamed`, `sections.logic.ts:132-137`), and `SectionPlan.log` is gone (no other reader: grep finds none, and `pnpm check` is clean). `pushSections` (`sync-now.service.ts:767-769`) pushes `add.renamed` only in the `status === 'ok' && id !== undefined` branch, so a refused add writes no rename row on any cycle. The `cycle` log list (`sync-now.service.ts:452-458`) no longer adds the plan's rows. The new sync-now test "logs a brain-renamed heading only once Todoist creates its section, so refused retries write no rename rows" runs 1 manual and 2 automatic cycles against a refused add and asserts 3 `section_add` sends and only one `command-error` row. The existing test "creates a renamed heading as a new section, keeps the old link (logged), ..." (`sync-now.service.test.ts:2477-2492`) still asserts the rename row on success. The lost-response case (the next cycle pairs by name, so the rename is never logged) is disclosed in the Resolution. The row is informational only, so I accept that. |

## Acceptance criteria

- [met] Failing tests first (fake `/sync`, real stores). — The fix adds a sync-now test against the fake `/sync` with real stores, and the fix step says it failed first with three rename rows. I did not re-run it against the pre-fix code. The changed unit tests in `sections.logic.test.ts` check `renamed` on the add.
- [met] Push: a brain `##` heading with at least one task line and no link -> `section_add`; a line moved under another heading or into another project note -> `item_move` (one of section_id / project_id per command). A brain heading rename counts as a new section in this basic form (old link kept, logged). — A rename is still logged when its section is created (`sync-now.service.test.ts:2488`). A refused retry no longer floods the log. `section_add` planning is unchanged apart from the extra field.
- [met] Gate: Both (schema change). — The fix touches only `src/`, so the Rust side has not changed since round 2, where the cargo tests and bindings were checked. `pnpm check`: 0 errors, 0 warnings. `pnpm vitest run` on `sections.logic.test.ts` and `sync-now.service.test.ts`: 2 files, 188 tests passed. Deliver runs the full vitest and cargo suites.

## Findings

None.

## Other checks

- Test changes: in `sections.logic.test.ts`, the old `plan.log` assertions were replaced by equivalent assertions on `adds[].renamed` (the `renamed: null` case, and the rename row's content). No test was weakened, and one sync-now test was added.
- No scope creep: the diff `cc4323f33..HEAD` touches `sections.logic.ts`, `sync-now.service.ts`, their two test files and review-2.md.
- Layer baseline, `BASELINE_SIZE` and composition roots: untouched.
