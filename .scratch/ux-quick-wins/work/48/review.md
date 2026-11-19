VERDICT: APPROVED

## Acceptance criteria

- [met] Failing test first (`templates.service` test, real `resolveFilePath`): `createFileFromTemplate(template, '../Outside')` rejects and `openOrCreateNote` is not called; `Folder/../Name` still creates `<vault>/Name.md`. — `src/tests/lib/plugins/templates/templates.service.test.ts:151-168`; the file mocks only `@tauri-apps/plugin-fs`, `@tauri-apps/api/core` and `note-creator.service` (lines 15-26), so `resolveFilePath` is real. `'../Outside'` rejects with `/outside the vault/` and `openOrCreateNote` is not called; `'Folder/../Name'` calls it with `filePath: '/vault/Name.md'`, title `Name`. Against main's `${vaultPath}/${fullFileName}` the first test would fail (no throw, mock called) and the second would get `/vault/Folder/../Name.md`, so both are real red-first tests. Commit 7e0b183fe puts the tests and the fix together (`templates.service.ts:63`).
- [met] Failing test first (`TemplatePicker.test.ts`): typing `../Outside` shows "Must stay inside the vault", not "Creates ../Outside.md in the vault", and Enter does not call `createFileFromTemplate`. The pure check has its own tests in `templates.logic.test.ts` (plain, `Folder/Name`, `../x`, `a/../../x`, `a/../x`). — `TemplatePicker.test.ts:141-152` asserts both strings, presses Enter, and checks that `createFileFromTemplate` is not called and the dialog stays open. The handler runs `confirmCreate` synchronously, so the not-called check is meaningful. `templates.logic.test.ts:110-142` covers all five named cases plus a leading `/`, `..` and an empty name. The picker change is at `TemplatePicker.svelte:32,68,114-115`.
- [met] Plain names and `Folder/Name` still create inside the vault (existing TemplatePicker and templates.service tests stay green). — I ran `pnpm vitest run src/tests/lib/plugins/templates/ src/tests/lib/utils/path.test.ts`: exit 0, 5 files, 118 tests passed. The diff leaves the existing plain and folder tests unchanged.
- [met] Frontend gate: `pnpm check` and `pnpm vitest run` pass. — I ran `pnpm check`: exit 0, 0 errors, 0 warnings. The targeted tests above pass. The full `pnpm vitest run` belongs to deliver.

## Verification

- My test verdict rests on these files, run in the worktree: `src/tests/lib/plugins/templates/TemplatePicker.test.ts`, `templates.logic.test.ts`, `templates.service.test.ts`, `templates.store.test.ts` and `src/tests/lib/utils/path.test.ts` (the real `resolveFilePath` the service now calls). Exit 0.
- Does the picker rule match the service rule? `resolveFilePath` normalizes `<vault>/<name>.md` and throws when the result leaves `base + '/'`. `nameLeavesVault` goes below depth 0 exactly when a `..` would pop a vault-root segment. So the picker never allows a name the service refuses. The reverse does not hold in one case: `../<vault folder name>/x` is refused by the picker but accepted by the service. That is the Issue's stated rule ("a `..` segment that climbs above the vault root"), so it is not a finding. Leading `/` is vault-relative in both, as the Issue requires. The trailing `.md` means the normalized path can never equal the bare vault root.
- `createFileFromTemplate` has one caller, `TemplatePicker.svelte:60`, and its catch already shows a toast when the service throws, as the Issue's direction asks.
- Scope: the diff touches only the three template source files, their three test files and the workflow's discovery record. No layer-baseline change and no `src-tauri/` change.

## Findings

1. nit — `src/lib/plugins/templates/TemplatePicker.svelte:36-38,119` — For a `..` that stays inside the vault, the hint shows the raw name, and `targetExists` compares against the raw name too. Take `Folder/../Name` when `/vault/Name.md` exists: the hint says "Creates Folder/../Name.md in the vault", but the service resolves the name to `/vault/Name.md` and `openOrCreateNote` opens the existing note. The Issue does not ask for this, and the build report and discovery already note it. Fix (optional, follow-up): normalize the name before both the hint and `noteExistsInTree`, or leave it, since this kind of name is rare.
2. nit — `src/lib/plugins/templates/templates.service.ts:54` — The JSDoc gained a `@throws`, but the line above it still says the file is written "to the vault root". That has been wrong since folder names were supported, and the diff did not cause it. Fix (optional): say "at the vault-relative name" next time this docstring is touched.

## Resolution

1. Rejected for this Issue. The finding is correct, but the Issue asks only that a name leaving the vault is refused; normalizing an in-vault `..` name for the hint and `targetExists` is new picker behavior outside its scope, and such names are rare. Left as a possible follow-up.
2. Fixed. The `createFileFromTemplate` JSDoc in `src/lib/plugins/templates/templates.service.ts` now says the file is written "at the vault-relative name" instead of "to the vault root".
