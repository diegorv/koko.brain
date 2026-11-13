VERDICT: APPROVED

Re-review, round 2, of the fixes after `c0bbbc2bf` (the commit that added `review.md`): `a01373a29`, which touches `ModsStatusList.svelte`, `mods.logic.ts`, `ModsStatusList.test.ts` and appends the Resolution to `review.md`.

## Previous findings

| # | Finding | Status | Evidence |
|---|---------|--------|----------|
| 1 | nit: a reload's read can overwrite a newer optimistic value (`ModsStatusList.svelte:57-59`) | resolved | `commits` map counts edits per folder; `commitSetting` bumps it before the optimistic write (`:80`), and the read callback returns when the count differs from the one captured at start (`:59-62`). The first read cannot be dropped, since `commitSetting` needs `read?.ok`. A dropped read is always followed by the newer commit's own reload, which reads again with the new count. Test `drops a read that started before a newer edit` holds the stale read, commits `Work`, resolves `Home`, and asserts the field shows `Work` and that setting `Home` again is saved (3 calls). By trace it fails without the guard: `readFor` still matches the new entry, so `Home` would be applied and the third commit skipped. |
| 2 | nit: inner `fields` shadows the raw manifest `fields` in `parseModManifest` | resolved | Renamed to `parsedFields` at `mods.logic.ts:243,259,261`; no behavior change, `mods.logic.test.ts` passes. |
| 3 | nit: drain awaits only instances the current pass unloads | rejection stands | The review asked for no change; `mods-host.service.ts` is untouched by the fix commit. Remains a delivery note. |

## Acceptance criteria re-checked

- [met] `src/tests/lib/plugins/mods/ModsStatusList.test.ts` (mock `readModSettings` and `saveModSetting` in the existing `mods-host.service.js` mock, `:9-12`): fields only on loaded rows with `settings`; stored values shown, defaults for absent or wrongly typed keys; a switch click calls `saveModSetting` at once; a text field calls it on `change` and not on `input`; a refused read shows the line and no fields. — The fix only adds a case; no existing case was changed or removed (diff is additions only). File passes.
- [met] `src/tests/lib/plugins/mods/mods.logic.test.ts` (next to `ruleActions`, `:295`): valid list kept; `[]`; not an array; item not an object; bad key incl. `__proto__` and `1x`; duplicate key; unknown type; empty label; wrong-type default; unknown field keys dropped; first failure wins after the existing checks. `mergeModSettings`: `null` gives the patch; an object keeps unknown keys; an array, a string and a number refuse. — Rename only; the file passes unchanged.
- [met] Frontend gate: `pnpm check` and `pnpm vitest run` pass. — `pnpm check` exit 0 (230 files, 0 errors, 0 warnings); targeted tests below pass. The full suite is deliver's to run.

## Findings

None open or new.

## Checks run by this re-review

- `pnpm check`: exit 0.
- `pnpm vitest run src/tests/lib/plugins/mods/ModsStatusList.test.ts src/tests/lib/plugins/mods/mods.logic.test.ts src/tests/lib/plugins/mods/mods.store.test.ts src/tests/lib/plugins/mods/mods-host.service.test.ts`: exit 0, 4 files, 357 tests.
- Scope: the fix commit changes only the two named source lines of concern and adds one test; no baseline, contract or doc change.
- Not checked: the real app UI, E2E, `pnpm build`, the full suite (deliver).
