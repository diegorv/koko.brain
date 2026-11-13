VERDICT: APPROVED

## Previous findings

| # | Severity | Status | Evidence |
|---|----------|--------|----------|
| 1 | minor | rejection stands | The finding asked for no change. The Resolution records the blast radius (lifecycle, file-icons, bookmark migration now get `missing` for a note that vanished mid-write). `frontmatter-write.service.ts` was not changed again in a108794e. |
| 2 | minor | resolved | `event-calendar.service.ts:620-623` adds the outside-rename variant to "Known limitations": the moved `create` at `to` carries the refused write's state until its version clock prunes it. This matches `remapPath` behavior as round 1 described it. The change is comment only. |
| 3 | minor | resolved | `event-calendar.service.test.ts:2445-2457` holds the write, runs `moveEvent`, then `deleteItem`, releases, and asserts `rejects.toMatchObject({ reason: 'missing' })`, `disk.has` false, `eventByPath` undefined and an empty undo history. The fixture honors `create: false` (`calendar-vault.fixture.ts:93-99`), so the test exercises the real writer path. Probe: I made a temporary worktree at HEAD with only `frontmatter-write.service.ts` reverted to main. The new test failed there ("promise resolved "undefined" instead of rejecting"), so it catches the bug. |
| 4 | nit | rejection stands | On a refused write nothing reaches the disk, so `missing` is accurate. The calendar drops stale results through `isCurrent`, so the order has no visible effect. |

## Acceptance criteria

- [met] A field write landing after an outside delete is refused: the note is not recreated on disk, the store does not show it, and no op is recorded — the new service test asserts all three plus the `missing` rejection, and it fails against main's writer (probe above). The model named sequence from round 1 still passes.
- [met] After the fix the store and the disk agree after one bump — `event-calendar.model.test.ts` passes (named sequence plus seed 127 with one end bump), and the fixes did not touch it.

## Checks run by this review

- `pnpm check`: exit 0, 0 errors, 0 warnings.
- `pnpm vitest run` on `event-calendar.service.test.ts`, `event-calendar.model.test.ts` and `frontmatter-write.service.test.ts`: exit 0, 3 files, 271 tests passed.
- Fix diff (`ff637cbf..HEAD`): one JSDoc paragraph, one added test, and the review Resolution. No test was weakened or deleted, nothing is out of scope, and the layer baseline, `BASELINE_SIZE` and the composition roots are unchanged.
- Not run: the full suite and `pnpm build` (deliver runs them), and cargo (nothing under src-tauri changed).

## Findings

None open or new.
