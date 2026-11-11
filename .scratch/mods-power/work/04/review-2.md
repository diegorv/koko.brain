VERDICT: APPROVED

## Previous findings

| # | Finding | Status | Evidence |
|---|---------|--------|----------|
| 1 | minor: `createModQuery` JSDoc said `matches` and `notes` agree; `matches` applies no row rule | resolved | Commit `7606f3574`. `mod-query.service.ts:16-18` now says they agree "on evaluation errors" and that `matches` answers for archived, system-folder, type-definition and `.view` notes that `notes` leaves out. That matches the code: `matches` (`:41-47`) calls `executeQuery` with no row filter on a one-record map, while `notes` (`:49-57`) passes `port.blockRows`. `10-querying-the-index.md:15` has the new bullet. The tests already pin both sides (`Board.view` resolves `true` in `matches`, `:120`; `notes` leaves out `.view`, `_system/`, type and archived notes, `:125`). Doc and comment only, no behavior change, so no new test is needed. |

## Acceptance criteria re-checked

- [met] Docs above updated. — The fix adds one accurate bullet to `help/documentation/mods/10-querying-the-index.md` and touches no other doc; the file has no mirrored copy in the repo (`git ls-files`), and `src/tests/help/mods-types.test.ts`, `mods-example.test.ts`, `mods-examples.test.ts` and `src/tests/scripts/sync-wiki-docs.test.ts` pass.
- [not met] Gate above passes, including `pnpm build` and the mods workspace's `pnpm check:package` and `pnpm verify`. — `pnpm check` passes (0 errors) and the targeted tests pass; round 1 ran `pnpm build` (exit 0) and the fix changes only a comment and a Markdown file. The full suite is deliver's to run. The mods workspace's `pnpm check:package` and `KOKOBRAIN_HOST_ROOT=<checkout> pnpm verify` were still not run against this checkout, so this stays open for deliver.

## Checks run by the reviewer

- `pnpm check`: exit 0, 0 errors, 0 warnings.
- `pnpm vitest run src/tests/lib/plugins/mods/mod-query.service.test.ts src/tests/help/mods-types.test.ts src/tests/help/mods-example.test.ts src/tests/help/mods-examples.test.ts src/tests/scripts/sync-wiki-docs.test.ts`: exit 0, 5 files, 125 tests.
- Scope: the fix diff (`854e30a35..HEAD`) touches only `mod-query.service.ts` (JSDoc), `10-querying-the-index.md` and `review.md`. No test is weakened or deleted, and `layer-baseline.json` and `BASELINE_SIZE` are unchanged.

## Findings

None open or new.
