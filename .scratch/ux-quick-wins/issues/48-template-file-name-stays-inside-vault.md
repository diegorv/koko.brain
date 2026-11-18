# 48: New File from Template keeps a typed name inside the vault

**Origin:** review of Issue 29 (`.scratch/ux-quick-wins/work/29/review.md`, finding 3), 2026-11-18.

**What to build:** A name typed in the template picker's naming step never resolves to a file outside the open vault. Today `createFileFromTemplate` (`src/lib/plugins/templates/templates.service.ts:55-69`) builds `${vaultPath}/${fullFileName}` from the raw name, so `../Outside` targets `<vault parent>/Outside.md`, and the picker hint (`src/lib/plugins/templates/TemplatePicker.svelte`, the "Creates ... in the vault" line) claims the file goes in the vault. Direction (owner to choose): refuse a name with a `..` segment or a leading `/` in the picker with an inline message, or reject it in the service with an error the picker shows as a toast.

Not in this ticket: refusing a taken name (open-itens 059); the iOS host's containment work (open-itens 175, `feature/ios-poc` only).

**Size:** S.

**Blocked by:** none

**Status:** needs-triage

**Gate:** `pnpm check` + `pnpm vitest run`

- [ ] Failing test first: typing `../Outside` in the naming step does not show "Creates ../Outside.md in the vault", and Enter does not call `createFileFromTemplate` with a path outside the vault (or the service rejects it, per the chosen direction).
- [ ] Plain names and `Folder/Name` still create inside the vault (existing TemplatePicker and templates.service tests stay green).
- [ ] Frontend gate: `pnpm check` and `pnpm vitest run` pass.

## Evidence

- `templates.service.ts:55-69`: `filePath = \`${vaultPath}/${fullFileName}\`` with no check of the name's segments; `openOrCreateNote` then creates the parent folder and the file (`src/lib/core/note-creator/note-creator.service.ts:87-127`).
- The behavior predates Issue 29; Issue 29 only made the hint visible.

## Comments

- 2026-11-18: opened from Issue 29's review (finding 3). Needs a ledger row and triage from the main session.
