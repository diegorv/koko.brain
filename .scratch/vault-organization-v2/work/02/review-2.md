VERDICT: APPROVED

Re-review, round 2, of the fixes after `4190566a` (the commit that added `review.md`): `6588b4c4` plus the `## Resolution` section in `review.md`.

## Previous findings

| # | Severity | Finding | Status | Evidence |
|---|----------|---------|--------|----------|
| 1 | minor | New 1:1 writes `kind: one-on-one` (`one-on-one.service.ts:98`) | rejection stands | Round 1 accepted it and asked for no fix. Without it, a note created from a template that has neither the kind nor the tag would never count. Switching to the tag is the owner's choice. |
| 2 | minor | Older 1:1 notes without the kind or the tag stop counting (`one-on-one.logic.ts:216`) | rejection stands | The Issue sets this rule ("Count only notes with `kind: one-on-one` (or the 1:1 template's tag)"). This needs a vault check, not a code change. |
| 3 | nit | `ONE_ON_ONE_KIND` / `ONE_ON_ONE_TAG` exported but unused outside the file | resolved | `one-on-one.logic.ts:157,160` are now plain `const`. A grep of `src` finds no other reference, and `pnpm check` exits 0. |
| 4 | nit | A quoted `kind` key gets a duplicate `kind` line | resolved | `one-on-one.logic.ts:183` now uses `/^["']?kind["']?\s*:/`. New asserts at `one-on-one.logic.test.ts:508-509` cover `"kind":` and `'kind':`. Probe: with the old regex restored, `pnpm vitest run src/tests/lib/plugins/one-on-one/one-on-one.logic.test.ts -t withOneOnOneKind` exited 1. The file was restored with `git checkout` and the worktree was clean afterwards. The regex still rejects `kinds:` and nested `  kind:` lines, so the existing "nested or in the body" case still passes. |

## Acceptance criteria

- [met] Failing test first, reproducing the problem; it passes after the change. — Round 1 checked this with a probe. The fix commit also adds a failing-first case (the probe above). `one-on-one.logic.test.ts` passes.
- [met] A group meeting `_related_to` a direct report does not reset their counter; a 1:1 does. — The fix commit does not touch `isOneOnOneNote` or `buildMyPeople`. Making the constants private changes no values. The test "does not reset the counter for a group meeting related to the person; a 1:1 does" passes.
- [met] Frontend gate: `pnpm check` and `pnpm vitest run` pass. — `pnpm check` exit 0 (232 files, 0 errors, 0 warnings). `pnpm vitest run src/tests/lib/plugins/one-on-one/` passes: 6 files, 118 tests, exit 0. Deliver runs the full suite.

## Findings

No open or new findings. The fix diff touches only `one-on-one.logic.ts`, its test and `review.md`. It weakens or deletes no test and adds no scope. It adds no layer-baseline entry, does not change `BASELINE_SIZE`, adds no composition root and does not touch `src-tauri/`.

## Checks run

- `pnpm check`: exit 0.
- `pnpm vitest run src/tests/lib/plugins/one-on-one/`: exit 0.
- Probe of nit 4's test against the old regex: exit 1, as expected, then restored.
