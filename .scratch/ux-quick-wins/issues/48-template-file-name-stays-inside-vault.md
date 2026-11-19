# 48: New File from Template keeps a typed name inside the vault

**Origin:** review of Issue 29 (`.scratch/ux-quick-wins/work/29/review.md`, finding 3), 2026-11-18.

**What to build:** A name typed in the template picker's naming step never resolves to a file outside the open vault. Today `createFileFromTemplate` (`src/lib/plugins/templates/templates.service.ts:55-69`) builds `${vaultPath}/${fullFileName}` from the raw name, so `../Outside` targets `<vault parent>/Outside.md`, and the picker hint (`src/lib/plugins/templates/TemplatePicker.svelte`, the "Creates ... in the vault" line) claims the file goes in the vault.

Direction (owner decision, 2026-11-18): both layers, one rule.

1. **Service guard.** `createFileFromTemplate` builds the path with the existing `resolveFilePath(vaultPath, fullFileName)` (`src/lib/utils/path.ts`, which normalizes `.` and `..` and throws when the result leaves the vault) in place of the hand-built `${vaultPath}/${fullFileName}`. This is the real boundary: any caller is covered. The thrown error propagates (CLAUDE.md Error Handling); the picker shows it as a toast.
2. **Picker hint.** A pure check in `src/lib/plugins/templates/templates.logic.ts` (for example `nameLeavesVault(name)`, true for a `..` segment that climbs above the vault root) drives the naming hint: such a name shows "Must stay inside the vault" in place of "Creates ... in the vault", and Enter does nothing. The hint never claims a path the service would refuse. A leading `/` is treated as vault-relative, as `resolveFilePath` does, so it is not refused.

Not in this ticket: refusing a taken name (open-itens 059); the iOS host's containment work (open-itens 175, `feature/ios-poc` only).

**Size:** S.

**Blocked by:** none

**Status:** resolved

**Gate:** `pnpm check` + `pnpm vitest run`

- [x] Failing test first (`templates.service` test, real `resolveFilePath`): `createFileFromTemplate(template, '../Outside')` rejects and `openOrCreateNote` is not called; `Folder/../Name` still creates `<vault>/Name.md`.
- [x] Failing test first (`TemplatePicker.test.ts`): typing `../Outside` shows "Must stay inside the vault", not "Creates ../Outside.md in the vault", and Enter does not call `createFileFromTemplate`. The pure check has its own tests in `templates.logic.test.ts` (plain, `Folder/Name`, `../x`, `a/../../x`, `a/../x`).
- [x] Plain names and `Folder/Name` still create inside the vault (existing TemplatePicker and templates.service tests stay green).
- [x] Frontend gate: `pnpm check` and `pnpm vitest run` pass.

## Evidence

- `templates.service.ts:55-69`: `filePath = \`${vaultPath}/${fullFileName}\`` with no check of the name's segments; `openOrCreateNote` then creates the parent folder and the file (`src/lib/core/note-creator/note-creator.service.ts:87-127`).
- The behavior predates Issue 29; Issue 29 only made the hint visible.

## Comments

- 2026-11-18: opened from Issue 29's review (finding 3). Needs a ledger row and triage from the main session.
- 2026-11-18, triage: ready-for-agent. Decided by the owner: guard in the service with `resolveFilePath` and the same rule in the picker hint (see What to build).
- 2026-11-18, delivered (branch issue/48-template-file-name-stays-inside-vault): `createFileFromTemplate` resolves the typed name with `resolveFilePath` and rejects names outside the vault; the TemplatePicker hint shows "Must stay inside the vault" and Enter does nothing for such names. Review round 1 APPROVED (two nits; JSDoc nit fixed), round 2 APPROVED with no findings. Tests: `pnpm check` 0 errors; full suite at 175ae76bf exit 0 (662 files, 17830 passed, 56 skipped, 1 todo).
